require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { createCase, listCaseDocuments } = require("./services/cases");
const { uploadDocument }                = require("./services/upload");
const { queryCase }                     = require("./services/query");

// Create a small sample legal text file for testing
const SAMPLE_FILE = path.join(__dirname, "sample-legal-doc.txt");
fs.writeFileSync(SAMPLE_FILE,
`IN THE HIGH COURT OF JUDICATURE AT BOMBAY
CRIMINAL APPLICATION NO. 1234 OF 2024

APPLICANT: Ramesh Kumar Sharma
RESPONDENT: State of Maharashtra

BAIL APPLICATION

The applicant has been in custody since 15th January 2024 under FIR No. 456/2024
registered at Andheri Police Station for offences under Sections 420 and 406 of the
Indian Penal Code, 1860.

GROUNDS FOR BAIL:
1. The applicant has deep roots in society and is unlikely to flee.
2. The applicant has a family including a wife and two minor children dependent on him.
3. The investigation is complete and the chargesheet has been filed.
4. The applicant has no prior criminal record.
5. The alleged offence is one of cheating involving a dispute of commercial nature.

The applicant undertakes to abide by all conditions imposed by this Hon'ble Court
and shall not tamper with evidence or witnesses.

PRAYER: The applicant respectfully prays that this Hon'ble Court be pleased to
release him on bail on such terms and conditions as this Court deems fit.

Dated this 20th day of June 2024.
`);

async function main() {
  console.log("\n══════════════════════════════════════");
  console.log(" LexCloud Pipeline Test");
  console.log("══════════════════════════════════════\n");

  // Step 1: Create a case
  console.log("Step 1: Creating case...");
  const caseInfo = await createCase("Sharma Bail Matter 2024", "Ramesh Kumar Sharma");
  console.log(`  Case ID: ${caseInfo.caseId}\n`);

  // Step 2: Upload document
  console.log("Step 2: Uploading document (S3 + Textract + Embed)...");
  const docInfo = await uploadDocument(SAMPLE_FILE, caseInfo.caseId, "Bail Application - Sharma");
  console.log(`  Doc ID: ${docInfo.docId}\n`);

  // Step 3: List documents in case
  console.log("Step 3: Listing documents in case...");
  const docs = await listCaseDocuments(caseInfo.caseId);
  console.log(`  Found ${docs.length} document(s): ${docs.map(d => d.docName).join(", ")}\n`);

  // Step 4: Query with natural language
  console.log("Step 4: Querying — 'What are the grounds for bail?'");
  const result = await queryCase(caseInfo.caseId, "What are the grounds for bail?");
  console.log("\n─── AI Answer ───────────────────────────────────");
  console.log(result.answer);
  console.log("\n─── Sources Used ────────────────────────────────");
  result.sources.forEach(s => console.log(`  • ${s.docName} (similarity: ${s.score})`));

  // Step 5: Second query
  console.log("\nStep 5: Querying — 'What is the applicant's family situation?'");
  const result2 = await queryCase(caseInfo.caseId, "What is the applicant's family situation?");
  console.log("\n─── AI Answer ───────────────────────────────────");
  console.log(result2.answer);

  console.log("\n══════════════════════════════════════");
  console.log(" Pipeline test complete!");
  console.log("══════════════════════════════════════\n");

  // Clean up sample file
  fs.unlinkSync(SAMPLE_FILE);
}

main().catch(err => {
  console.error("\nPipeline test FAILED:", err.message);
  process.exit(1);
});
