require("dotenv").config();
const { PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { dynamo }     = require("../lib/aws");
const { embed }      = require("../lib/embeddings");

const TABLE = process.env.METADATA_TABLE;

const HF_DATASET = "SnehaDeshmukh/IndianBailJudgments-1200";
const HF_CONFIG  = "indian_bail_judgments.csv";
const HF_SPLIT   = "train";
const HF_PAGE_SIZE = 100;

const EMBED_DELAY_MS   = 250; // stay under Bedrock Titan per-second throttling limits
const MAX_RETRIES      = 5;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** Fetch one page of rows from the Hugging Face datasets-server REST API. */
async function fetchPage(offset, length) {
  const url = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(HF_DATASET)}` +
    `&config=${encodeURIComponent(HF_CONFIG)}&split=${HF_SPLIT}&offset=${offset}&length=${length}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HF datasets-server request failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/** Pull every row of the dataset via paginated requests. */
async function fetchAllRows(limit) {
  const first = await fetchPage(0, 1);
  const total = limit ? Math.min(limit, first.num_rows_total) : first.num_rows_total;
  console.log(`[load_bail_dataset] Dataset has ${first.num_rows_total} rows; fetching ${total}.`);

  const rows = [];
  for (let offset = 0; offset < total; offset += HF_PAGE_SIZE) {
    const length = Math.min(HF_PAGE_SIZE, total - offset);
    const page = await fetchPage(offset, length);
    rows.push(...page.rows.map(r => r.row));
    console.log(`[load_bail_dataset] Fetched rows ${offset}-${offset + length - 1} of ${total}`);
  }
  return rows;
}

/** Turn a dataset row into a single text block suitable for embedding. */
function rowToText(row) {
  return [
    `Case: ${row.case_title} (Case ID ${row.case_id})`,
    `Court: ${row.court} | Date: ${row.date} | Judge: ${row.judge}`,
    `Region: ${row.region}`,
    `IPC Sections: ${row.ipc_sections} | Special Laws: ${row.special_laws || "None"}`,
    `Bail Type: ${row.bail_type} | Landmark Case: ${row.landmark_case} | Bail Cancellation Case: ${row.bail_cancellation_case}`,
    `Accused: ${row.accused_name} (${row.accused_gender}) | Prior Cases: ${row.prior_cases}`,
    `Crime Type: ${row.crime_type}`,
    ``,
    `Facts:`,
    row.facts,
    ``,
    `Legal Issues:`,
    row.legal_issues,
    ``,
    `Judgment Reasoning:`,
    row.judgment_reason,
    ``,
    `Outcome: ${row.bail_outcome} — ${row.bail_outcome_label_detailed}`,
    ``,
    `Summary:`,
    row.summary,
    ``,
    `Legal Principles Discussed:`,
    row.legal_principles_discussed,
  ].join("\n");
}

async function embedWithRetry(text) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await embed(text);
    } catch (err) {
      const throttled = err.name === "ThrottlingException" || err.$metadata?.httpStatusCode === 429;
      if (!throttled || attempt === MAX_RETRIES) throw err;
      const backoff = EMBED_DELAY_MS * 2 ** attempt;
      console.warn(`[load_bail_dataset] Throttled, retrying in ${backoff}ms (attempt ${attempt}/${MAX_RETRIES})`);
      await sleep(backoff);
    }
  }
}

/**
 * Load the IndianBailJudgments-1200 dataset from Hugging Face into the
 * shared global knowledge base (caseId="GLOBAL"), same DynamoDB table and
 * shape used by load_global_kb.js, so query.js's global-KB lookup covers
 * both the hand-written KB docs and this dataset without any extra code.
 *
 * Re-running is safe: each row's docId is deterministic ("bail-<case_id>"),
 * and existing docIds are skipped (no re-embedding, no duplicate items)
 * unless `force` is true.
 */
async function loadBailDataset({ limit, force } = {}) {
  const rows = await fetchAllRows(limit);

  let loaded = 0, skipped = 0;
  for (const row of rows) {
    const docId = `bail-${row.case_id}`;

    if (!force) {
      const existing = await dynamo.send(new GetCommand({ TableName: TABLE, Key: { caseId: "GLOBAL", docId } }));
      if (existing.Item) {
        skipped++;
        continue;
      }
    }

    const text = rowToText(row);
    const embedding = await embedWithRetry(text);

    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        caseId: "GLOBAL",
        docId,
        isGlobal: true,
        docType: "JUDGMENT",
        docName: row.case_title,
        court: row.court,
        date: row.date,
        region: row.region,
        ipcSections: row.ipc_sections,
        bailOutcome: row.bail_outcome,
        landmarkCase: !!row.landmark_case,
        sourceDataset: HF_DATASET,
        extractedText: text.slice(0, 50000), // DynamoDB 400KB item limit
        embedding,
        uploadedAt: new Date().toISOString(),
      },
    }));

    loaded++;
    if (loaded % 100 === 0) console.log(`[load_bail_dataset] Loaded ${loaded}/${rows.length}...`);
    await sleep(EMBED_DELAY_MS);
  }

  console.log(`[load_bail_dataset] Done. Loaded ${loaded}, skipped ${skipped} (already present) of ${rows.length}.`);
  return { loaded, skipped, total: rows.length };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : undefined;
  const force = args.includes("--force");

  loadBailDataset({ limit, force })
    .then(() => process.exit(0))
    .catch(err => {
      console.error("[load_bail_dataset] Failed:", err);
      process.exit(1);
    });
}

module.exports = { loadBailDataset, rowToText };
