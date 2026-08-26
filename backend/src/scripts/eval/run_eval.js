/**
 * Real evaluation harness for LexCloud's RAG pipeline.
 *
 * Uploads each case in testset.js, runs its ground-truth questions through
 * the actual queryCase() pipeline (same code path the app uses — no
 * shortcuts), and scores the results automatically against `mustContain`
 * facts. Produces real numbers instead of hand-picked transcripts.
 *
 * Metrics (defined here, not assumed — write these definitions into the
 * dissertation alongside the numbers):
 *
 *   - Answer Correctness: for each question, the fraction of `mustContain`
 *     facts that literally appear in the generated answer text. Averaged
 *     across all questions.
 *
 *   - Retrieval Hit Rate: for each question, 1 if at least one of the
 *     returned CASE-document sources (isGlobal:false), when its full text
 *     is fetched, contains ALL of that question's `mustContain` facts;
 *     else 0. This measures whether retrieval actually surfaced the right
 *     passage, independent of what Claude did with it.
 *
 *   - Attribution Accuracy: for each question, 1 if at least one returned
 *     source is the case document itself (isGlobal:false) rather than the
 *     answer being grounded only in precedent or nothing; else 0.
 *
 *   - Latency: wall-clock time for the POST-equivalent queryCase() call,
 *     per question. Reported as median and p90.
 *
 * Usage: node src/scripts/eval/run_eval.js
 */

require("dotenv").config();
const fs = require("fs");
const os = require("os");
const path = require("path");
const { v4: uuid } = require("uuid");

const casesService     = require("../../services/cases");
const uploadService     = require("../../services/upload");
const queryService      = require("../../services/query");
const downloadService   = require("../../services/download");

const { cases } = require("./testset");

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Pause between questions so this batch job doesn't outrun Bedrock's
// per-second throttle limits — a single interactive user never fires
// requests this fast, but a tight evaluation loop does.
const PACING_MS = 4000;

/** Retry a whole question (not just one AWS call) with longer backoff —
 * the inner withRetry() in query.js is tuned for normal request latency,
 * not for surviving a batch job that briefly outruns the rate limit. */
async function runOneQuestionWithRetry(caseId, q, maxAttempts = 4) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await runOneQuestion(caseId, q);
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      const delay = 5000 * attempt;
      console.warn(`  (throttled, retrying question in ${delay}ms — attempt ${attempt}/${maxAttempts})`);
      await sleep(delay);
    }
  }
}

async function runOneQuestion(caseId, q) {
  const start = Date.now();
  const result = await queryService.queryCase(caseId, q.question);
  const latencyMs = Date.now() - start;

  const answerLower = (result.answer || "").toLowerCase();
  const matched = q.mustContain.filter((phrase) => answerLower.includes(phrase.toLowerCase()));
  const answerScore = matched.length / q.mustContain.length;

  const caseSources = (result.sources || []).filter((s) => !s.isGlobal);
  let retrievalHit = 0;
  for (const src of caseSources) {
    const source = await downloadService.getSourceText(caseId, src.docId, false);
    if (!source) continue;
    const textLower = source.text.toLowerCase();
    if (q.mustContain.every((phrase) => textLower.includes(phrase.toLowerCase()))) {
      retrievalHit = 1;
      break;
    }
  }

  const attributionHit = caseSources.length > 0 ? 1 : 0;

  return {
    question: q.question,
    mustContain: q.mustContain,
    matched,
    answerScore,
    retrievalHit,
    attributionHit,
    latencyMs,
    answer: result.answer,
    sources: result.sources,
  };
}

module.exports = { runOneQuestion, percentile };

if (require.main === module) {
  (async () => {
    const allResults = [];
    const perCaseSummaries = [];
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lexcloud-eval-"));

    for (const testCase of cases) {
      console.log(`\n=== ${testCase.caseName} ===`);

      const created = await casesService.createCase(testCase.caseName, testCase.clientName, `eval-${uuid()}`);
      const caseId = created.caseId;

      const tmpFile = path.join(tmpDir, testCase.docName);
      fs.writeFileSync(tmpFile, testCase.text, "utf-8");
      await uploadService.uploadDocument(tmpFile, caseId, testCase.docName);
      console.log(`Uploaded ${testCase.docName}`);

      const caseResults = [];
      for (const q of testCase.questions) {
        await sleep(PACING_MS);
        try {
          const r = await runOneQuestionWithRetry(caseId, q);
          caseResults.push(r);
          allResults.push({ case: testCase.caseName, ...r });
          console.log(
            `  Q: ${q.question}\n` +
            `     answerScore=${(r.answerScore * 100).toFixed(0)}% retrievalHit=${r.retrievalHit} ` +
            `attributionHit=${r.attributionHit} latency=${r.latencyMs}ms`
          );
        } catch (err) {
          console.error(`  Q: ${q.question} -> FAILED: ${err.message}`);
          allResults.push({
            case: testCase.caseName, question: q.question, mustContain: q.mustContain,
            matched: [], answerScore: 0, retrievalHit: 0, attributionHit: 0,
            latencyMs: null, answer: `ERROR: ${err.message}`, sources: [],
          });
        }
      }

      perCaseSummaries.push({
        case: testCase.caseName,
        avgAnswerScore: caseResults.reduce((s, r) => s + r.answerScore, 0) / (caseResults.length || 1),
        retrievalHitRate: caseResults.reduce((s, r) => s + r.retrievalHit, 0) / (caseResults.length || 1),
        attributionAccuracy: caseResults.reduce((s, r) => s + r.attributionHit, 0) / (caseResults.length || 1),
      });

      // Clean up test data — don't leave 5 fake cases sitting in production DynamoDB.
      await casesService.deleteCase(caseId);
      console.log(`Cleaned up case ${caseId}`);
    }

    fs.rmSync(tmpDir, { recursive: true, force: true });

    const n = allResults.length;
    const avgAnswerScore = allResults.reduce((s, r) => s + r.answerScore, 0) / n;
    const retrievalHitRate = allResults.reduce((s, r) => s + r.retrievalHit, 0) / n;
    const attributionAccuracy = allResults.reduce((s, r) => s + r.attributionHit, 0) / n;
    const latencies = allResults.map((r) => r.latencyMs).filter((x) => x != null).sort((a, b) => a - b);
    const medianLatency = percentile(latencies, 50);
    const p90Latency = percentile(latencies, 90);

    console.log("\n" + "=".repeat(60));
    console.log("OVERALL RESULTS");
    console.log("=".repeat(60));
    console.log(`Questions run:            ${n}`);
    console.log(`Answer Correctness:       ${(avgAnswerScore * 100).toFixed(1)}%`);
    console.log(`Retrieval Hit Rate:       ${(retrievalHitRate * 100).toFixed(1)}%`);
    console.log(`Attribution Accuracy:     ${(attributionAccuracy * 100).toFixed(1)}%`);
    console.log(`Median Latency:           ${medianLatency} ms`);
    console.log(`P90 Latency:              ${p90Latency} ms`);

    const report = {
      generatedAt: new Date().toISOString(),
      questionsRun: n,
      answerCorrectness: avgAnswerScore,
      retrievalHitRate,
      attributionAccuracy,
      medianLatencyMs: medianLatency,
      p90LatencyMs: p90Latency,
      perCase: perCaseSummaries,
      results: allResults,
    };

    const outDir = path.join(__dirname, "results");
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, `eval_${Date.now()}.json`);
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
    console.log(`\nFull report written to ${outFile}`);

    process.exit(0);
  })().catch((err) => {
    console.error("Eval run failed:", err);
    process.exit(1);
  });
}
