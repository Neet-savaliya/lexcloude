require("dotenv").config();
const { QueryCommand }          = require("@aws-sdk/lib-dynamodb");
const { InvokeModelCommand }    = require("@aws-sdk/client-bedrock-runtime");
const { dynamo, bedrock }       = require("../lib/aws");
const { embed, cosineSim }      = require("../lib/embeddings");
const { withRetry }             = require("../lib/retry");
const { enqueue }               = require("../lib/bedrockQueue");
const logger                    = require("../lib/logger");

const TABLE      = process.env.METADATA_TABLE;
const CHAT_MODEL = process.env.BEDROCK_CHAT_MODEL; // anthropic.claude-haiku

// ─────────────────────────────────────────────────────────────────────────
// OLD VERSION (kept for reference) — also searched the shared global KB
// (caseId="GLOBAL": constitution, statutes, past judgments) alongside the
// case's own documents. Disabled below in favor of case-only retrieval.
// ─────────────────────────────────────────────────────────────────────────
/**
 * Query documents in a case using natural language.
 * Returns an AI-generated answer with source citations.
 *
 * @param {string} caseId   - Which case to search
 * @param {string} question - Natural language question
 * @param {number} topK     - Number of passages to retrieve (default 3)
 */
// async function queryCase(caseId, question, topK = 3) {
//   // 1. Embed the question
//   const queryVec = await embed(question);
//
//   // 2. Fetch documents for this case, plus the shared global KB (constitution,
//   // statutes, past judgments) so lawyers get relevant precedent automatically.
//   const [caseResult, globalResult] = await Promise.all([
//     dynamo.send(new QueryCommand({
//       TableName:              TABLE,
//       IndexName:              "caseId-index",
//       KeyConditionExpression: "caseId = :cid",
//       ExpressionAttributeValues: { ":cid": caseId },
//     })),
//     dynamo.send(new QueryCommand({
//       TableName:              TABLE,
//       IndexName:              "caseId-index",
//       KeyConditionExpression: "caseId = :gid",
//       ExpressionAttributeValues: { ":gid": "GLOBAL" },
//     })),
//   ]);
//   const docs = [...(caseResult.Items || []), ...(globalResult.Items || [])];
//
//   if (docs.length === 0) {
//     return { answer: "No documents found for this case.", sources: [] };
//   }
//
//   // 3. Rank by cosine similarity — skip metadata records (no embedding)
//   const ranked = docs
//     .filter(doc => Array.isArray(doc.embedding))
//     .map(doc => ({
//       docName: doc.docName,
//       docId:   doc.docId,
//       isGlobal: !!doc.isGlobal,
//       text:    doc.extractedText || "",
//       score:   cosineSim(queryVec, doc.embedding),
//     }))
//     .sort((a, b) => b.score - a.score)
//     .slice(0, topK);
//
//   // 4. Build context from top passages
//   const context = ranked
//     .map((d, i) => `[Source ${i + 1}: ${d.docName}]\n${d.text.slice(0, 2000)}`)
//     .join("\n\n---\n\n");
//
//   // 5. Call Claude Haiku via Bedrock
//   const prompt = `You are a legal assistant for an Indian law firm.
// Using ONLY the following document excerpts, answer the question accurately and concisely.
// Always cite your sources using [Source N] notation.
// If the answer cannot be found in the documents, say so clearly.
//
// DOCUMENTS:
// ${context}
//
// QUESTION: ${question}
//
// ANSWER:`;
//
//   const bedrockRes = await bedrock.send(new InvokeModelCommand({
//     modelId:     CHAT_MODEL,
//     contentType: "application/json",
//     accept:      "application/json",
//     body: JSON.stringify({
//       anthropic_version: "bedrock-2023-05-31",
//       max_tokens: 1024,
//       messages: [{ role: "user", content: prompt }],
//     }),
//   }));
//
//   const responseBody = JSON.parse(Buffer.from(bedrockRes.body).toString("utf-8"));
//   const answer = responseBody.content[0].text;
//
//   return {
//     answer,
//     sources: ranked.map(d => ({ docName: d.docName, docId: d.docId, isGlobal: d.isGlobal, score: d.score.toFixed(4) })),
//   };
// }

// ─────────────────────────────────────────────────────────────────────────
// CURRENT VERSION — two-pool retrieval. The case-only version that lived
// here before is gone (git history has it, and the merged-pool version
// above still shows the earlier approach). This version searches the
// case's own documents and the shared global KB (caseId="GLOBAL") as two
// SEPARATE pools, each ranked on its own, instead of one merged ranking.
//
// Why: with one merged pool, the case's own document had to outscore
// all ~1200 global judgments to be included at all — it regularly lost
// even when it was clearly the right source, just because it was
// outnumbered. Ranking each pool separately guarantees the case's own
// top matches are always included, while still surfacing relevant
// precedent from the global KB as clearly separate supporting context.
// ─────────────────────────────────────────────────────────────────────────

const CASE_TOP_K   = 2; // top matches always pulled from the case's own documents
const GLOBAL_TOP_K = 2; // top matches pulled from the shared global KB

/**
 * Rewrite a natural-language question into concrete search terms before
 * embedding it. A vague question like "how many days has he been in
 * custody?" embeds poorly against specific document text (dates, section
 * numbers, party names); asking Haiku for the terms that would actually
 * appear in the document first gives the embedding step something sharper
 * to match against. Falls back to the original question if the rewrite
 * call fails for any reason — search should never break because of this.
 */
async function rewriteQuery(question) {
  try {
    const res = await enqueue(() => withRetry(() => bedrock.send(new InvokeModelCommand({
      modelId:     CHAT_MODEL,
      contentType: "application/json",
      accept:      "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 150,
        messages: [{
          role: "user",
          content: `Rewrite this question into 3-6 concrete search terms or phrases ` +
            `that would literally appear in an Indian legal case document or bail ` +
            `judgment (facts, dates, section numbers, legal terms). Return ONLY the ` +
            `comma-separated terms, nothing else.\n\nQuestion: "${question}"`,
        }],
      }),
    }))));
    const body = JSON.parse(Buffer.from(res.body).toString("utf-8"));
    const rewritten = body.content[0].text.trim();
    return rewritten || question;
  } catch (err) {
    logger.warn("[query] rewriteQuery failed, falling back to original question:", err.message);
    return question;
  }
}

/**
 * Fetch ALL items for a given caseId from DynamoDB, paginating through
 * results automatically. DynamoDB returns at most 1 MB per call — without
 * pagination any case with many chunks would silently return only the first
 * page, causing retrieval to miss most of the uploaded content.
 */
async function queryAllItems(id) {
  const items = [];
  let lastKey;
  do {
    const params = {
      TableName:              TABLE,
      IndexName:              "caseId-index",
      KeyConditionExpression: "caseId = :id",
      ExpressionAttributeValues: { ":id": id },
    };
    if (lastKey) params.ExclusiveStartKey = lastKey;
    const res = await withRetry(() => dynamo.send(new QueryCommand(params)));
    items.push(...(res.Items || []));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

// The global KB is ~1200 items, each carrying a full 1024-float embedding —
// paginating through all of it is ~75s (17 DynamoDB pages at ~1MB each,
// since embeddings are the bulk of every item's size). That cost is fine
// to pay once, but not on every single query: the global KB only changes
// when an admin re-runs load_bail_dataset.js / load_global_kb.js, which
// happens rarely, so it's cached in memory and refreshed on a timer
// instead of re-fetched per question.
const GLOBAL_POOL_CACHE_MS = 30 * 60 * 1000; // 30 minutes
let globalPoolCache = null;
let globalPoolCachedAt = 0;
// Single-flight guard: while a refresh is in progress, every concurrent
// caller awaits THIS SAME promise instead of starting its own ~75s
// queryAllItems("GLOBAL") pagination. Without this, N concurrent requests
// hitting a cold/expired cache trigger N redundant full-table scans at
// once (reproduced directly with a 6-request concurrency test — see the
// "Cache Stampede" write-up). Cleared in .finally() so a failed refresh
// doesn't permanently wedge the cache.
let globalPoolRefreshInFlight = null;

async function getGlobalPool() {
  const isFresh = globalPoolCache && (Date.now() - globalPoolCachedAt < GLOBAL_POOL_CACHE_MS);
  if (isFresh) return globalPoolCache;

  if (globalPoolRefreshInFlight) return globalPoolRefreshInFlight;

  globalPoolRefreshInFlight = queryAllItems("GLOBAL").finally(() => {
    globalPoolRefreshInFlight = null;
  });

  const items = await globalPoolRefreshInFlight;
  globalPoolCache = items;
  globalPoolCachedAt = Date.now();
  logger.info(`[query] Refreshed global KB cache: ${items.length} items`);
  return items;
}

/** Rank one pool of DynamoDB items against a query vector, keep the top N. */
function rankPool(items, queryVec, topN) {
  return items
    .filter(doc => Array.isArray(doc.embedding)) // skip CASE_META / chat messages (no embedding)
    .map(doc => ({
      // Chunked documents (see upload.js) store chunkIndex/totalChunks on
      // every chunk item — label which passage this is so two chunks of
      // the same document showing up as separate sources isn't confusing.
      docName:  doc.totalChunks > 1 ? `${doc.docName} (part ${doc.chunkIndex + 1}/${doc.totalChunks})` : doc.docName,
      docId:    doc.docId,
      isGlobal: !!doc.isGlobal,
      text:     doc.extractedText || "",
      score:    cosineSim(queryVec, doc.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

/**
 * Query documents in a case using natural language.
 * Returns an AI-generated answer with source citations.
 *
 * @param {string} caseId   - Which case to search
 * @param {string} question - Natural language question
 */
async function queryCase(caseId, question) {
  // 1. Rewrite the question into concrete search terms, and fetch the
  // case's own documents + the global KB, in parallel — the DynamoDB
  // fetches don't depend on the rewrite, only the embedding step does.
  const [searchQuery, [caseItems, globalItems]] = await Promise.all([
    rewriteQuery(question),
    Promise.all([
      queryAllItems(caseId),
      getGlobalPool(),
    ]),
  ]);
  logger.info(`[query] "${question}" → search terms: "${searchQuery}"`);

  // 2. Embed the rewritten search terms (not the raw question) — the
  // original question is still what gets sent to Claude in step 5.
  const queryVec = await embed(searchQuery);

  // 3. Rank each pool separately — the case's own top matches can never
  // be squeezed out by the (much larger) global KB pool.
  const caseMatches   = rankPool(caseItems,   queryVec, CASE_TOP_K);
  const globalMatches = rankPool(globalItems, queryVec, GLOBAL_TOP_K);

  if (caseMatches.length === 0 && globalMatches.length === 0) {
    return { answer: "No documents found for this case.", sources: [] };
  }

  // 4. Build two clearly separate context sections instead of one blended list.
  // 3500 chars comfortably covers a full ~500-word chunk (see upload.js) — before
  // chunking existed this used to be 2000, which silently clipped whole documents.
  const ranked = [...caseMatches, ...globalMatches];
  const toSection = (matches, startIndex) => matches
    .map((d, i) => `[Source ${startIndex + i + 1}: ${d.docName}]\n${d.text.slice(0, 3500)}`)
    .join("\n\n---\n\n");

  const caseContext   = caseMatches.length   ? toSection(caseMatches, 0) : "(No documents uploaded for this case yet.)";
  const globalContext = globalMatches.length ? toSection(globalMatches, caseMatches.length) : "(No relevant precedent found.)";

  // 5. Call Claude Haiku via Bedrock
  const prompt = `You are a legal assistant for an Indian law firm.
Answer the question using the client's case documents as the primary source of facts.
Use the relevant precedent only as supporting legal context, not as a replacement for the case facts.
Always cite your sources using [Source N] notation.
If the answer cannot be found in the documents, say so clearly.

CLIENT'S CASE DOCUMENTS:
${caseContext}

RELEVANT PRECEDENT:
${globalContext}

QUESTION: ${question}

ANSWER:`;

  const bedrockRes = await enqueue(() => withRetry(() => bedrock.send(new InvokeModelCommand({
    modelId:     CHAT_MODEL,
    contentType: "application/json",
    accept:      "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  }))));

  const responseBody = JSON.parse(Buffer.from(bedrockRes.body).toString("utf-8"));
  const answer = responseBody.content[0].text;

  return {
    answer,
    sources: ranked.map(d => ({ docName: d.docName, docId: d.docId, isGlobal: d.isGlobal, score: d.score.toFixed(4) })),
  };
}

/** Force the next query to re-fetch the global KB instead of using the cached copy. */
function clearGlobalPoolCache() {
  globalPoolCache = null;
  globalPoolCachedAt = 0;
}

module.exports = { queryCase, clearGlobalPoolCache };
