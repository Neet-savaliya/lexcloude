require("dotenv").config();
const fs   = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");
const { PutCommand } = require("@aws-sdk/lib-dynamodb");
const { dynamo }     = require("../lib/aws");
const { embed }      = require("../lib/embeddings");

const TABLE = process.env.METADATA_TABLE;

// Filename prefixes map to a docType so the global KB can be filtered by
// category later (e.g. citing constitutional articles vs. past judgments).
function docTypeFor(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.includes("constitution")) return "CONSTITUTION";
  if (lower.includes("crpc"))         return "STATUTE";
  return "JUDGMENT";
}

/**
 * Load every .txt file in a folder into the global knowledge base:
 * embed each document and store it with caseId="GLOBAL" so the existing
 * caseId-index can be queried for global docs the same way as case docs.
 *
 * @param {string} folderPath - Local folder containing .txt knowledge files
 */
async function loadGlobalKb(folderPath) {
  // "sample_new_case" files are lawyer-uploaded test cases, not KB content — skip them.
  const files = fs.readdirSync(folderPath)
    .filter(f => f.toLowerCase().endsWith(".txt") && !f.toLowerCase().includes("sample"));

  if (files.length === 0) {
    console.log(`[load_global_kb] No .txt files found in ${folderPath}`);
    return;
  }

  for (const fileName of files) {
    const filePath = path.join(folderPath, fileName);
    const text = fs.readFileSync(filePath, "utf-8");
    const docId = uuid();
    const docType = docTypeFor(fileName);

    console.log(`[load_global_kb] Embedding ${fileName} (${text.length} chars)...`);
    const embedding = await embed(text);

    await dynamo.send(new PutCommand({
      TableName: TABLE,
      Item: {
        caseId: "GLOBAL",
        docId,
        isGlobal: true,
        docType,
        docName: fileName,
        extractedText: text.slice(0, 50000), // DynamoDB 400KB item limit
        embedding,
        uploadedAt: new Date().toISOString(),
      },
    }));
    console.log(`[load_global_kb] Saved: docId=${docId} docType=${docType}`);
  }

  console.log(`[load_global_kb] Done. Loaded ${files.length} document(s) into the global KB.`);
}

if (require.main === module) {
  const folderArg = process.argv[2];
  if (!folderArg) {
    console.error("Usage: node load_global_kb.js <path/to/bail_kb>");
    process.exit(1);
  }
  const folderPath = path.resolve(folderArg);
  loadGlobalKb(folderPath)
    .then(() => process.exit(0))
    .catch(err => {
      console.error("[load_global_kb] Failed:", err);
      process.exit(1);
    });
}

module.exports = { loadGlobalKb };
