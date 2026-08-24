require("dotenv").config();
const { S3Client, CreateBucketCommand, PutBucketVersioningCommand,
        PutPublicAccessBlockCommand, HeadBucketCommand } = require("@aws-sdk/client-s3");
const { DynamoDBClient, CreateTableCommand, DescribeTableCommand,
        UpdateTableCommand } = require("@aws-sdk/client-dynamodb");

const REGION        = process.env.AWS_REGION;
const BUCKET        = process.env.DOCUMENTS_BUCKET;
const TABLE         = process.env.METADATA_TABLE;
const LAWYERS_TABLE = process.env.LAWYERS_TABLE;

const s3  = new S3Client({ region: REGION });
const ddb = new DynamoDBClient({ region: REGION });

// ── S3 Bucket ────────────────────────────────────────────────
async function createBucket() {
  // Check if already exists
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    console.log(`[S3]  Bucket already exists: ${BUCKET}`);
    return;
  } catch (e) {
    if (e.name !== "NotFound" && e.$metadata?.httpStatusCode !== 404) throw e;
  }

  await s3.send(new CreateBucketCommand({
    Bucket: BUCKET,
    CreateBucketConfiguration: { LocationConstraint: REGION },
  }));
  console.log(`[S3]  Created bucket: ${BUCKET}`);

  // Block all public access
  await s3.send(new PutPublicAccessBlockCommand({
    Bucket: BUCKET,
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      IgnorePublicAcls: true,
      BlockPublicPolicy: true,
      RestrictPublicBuckets: true,
    },
  }));
  console.log(`[S3]  Public access blocked`);

  // Enable versioning
  await s3.send(new PutBucketVersioningCommand({
    Bucket: BUCKET,
    VersioningConfiguration: { Status: "Enabled" },
  }));
  console.log(`[S3]  Versioning enabled`);
}

// ── DynamoDB Table ───────────────────────────────────────────
async function createTable() {
  // Check if already exists
  try {
    const res = await ddb.send(new DescribeTableCommand({ TableName: TABLE }));
    console.log(`[DDB] Table already exists: ${TABLE} (${res.Table.TableStatus})`);

    // Table pre-dates the lawyerId-index GSI — add it if missing.
    const hasLawyerIndex = (res.Table.GlobalSecondaryIndexes || [])
      .some(gsi => gsi.IndexName === "lawyerId-index");
    if (!hasLawyerIndex) {
      console.log(`[DDB] Adding missing lawyerId-index to ${TABLE} (may take a few minutes to become ACTIVE)...`);
      await ddb.send(new UpdateTableCommand({
        TableName: TABLE,
        AttributeDefinitions: [
          { AttributeName: "lawyerId", AttributeType: "S" },
        ],
        GlobalSecondaryIndexUpdates: [{
          Create: {
            IndexName: "lawyerId-index",
            KeySchema: [{ AttributeName: "lawyerId", KeyType: "HASH" }],
            Projection: { ProjectionType: "ALL" },
          },
        }],
      }));
      console.log(`[DDB] lawyerId-index creation started on ${TABLE}`);
    }
    return;
  } catch (e) {
    if (e.name !== "ResourceNotFoundException") throw e;
  }

  await ddb.send(new CreateTableCommand({
    TableName: TABLE,
    BillingMode: "PAY_PER_REQUEST",   // on-demand — no provisioned cost
    AttributeDefinitions: [
      { AttributeName: "caseId",   AttributeType: "S" },
      { AttributeName: "docId",    AttributeType: "S" },
      { AttributeName: "lawyerId", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "caseId",   KeyType: "HASH"  },
      { AttributeName: "docId",    KeyType: "RANGE" },
    ],
    GlobalSecondaryIndexes: [
      // Query all docs in a case
      {
        IndexName: "caseId-index",
        KeySchema: [{ AttributeName: "caseId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
      // Query all cases belonging to a lawyer (sparse — only CASE_META items carry lawyerId)
      {
        IndexName: "lawyerId-index",
        KeySchema: [{ AttributeName: "lawyerId", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ],
  }));
  console.log(`[DDB] Created table: ${TABLE}`);
}

// ── DynamoDB Lawyers Table ───────────────────────────────────
async function createLawyersTable() {
  try {
    const res = await ddb.send(new DescribeTableCommand({ TableName: LAWYERS_TABLE }));
    console.log(`[DDB] Table already exists: ${LAWYERS_TABLE} (${res.Table.TableStatus})`);
    return;
  } catch (e) {
    if (e.name !== "ResourceNotFoundException") throw e;
  }

  await ddb.send(new CreateTableCommand({
    TableName: LAWYERS_TABLE,
    BillingMode: "PAY_PER_REQUEST",
    AttributeDefinitions: [
      { AttributeName: "email", AttributeType: "S" },
    ],
    KeySchema: [
      { AttributeName: "email", KeyType: "HASH" },
    ],
  }));
  console.log(`[DDB] Created table: ${LAWYERS_TABLE}`);
}

// ── Run ───────────────────────────────────────────────────────
(async () => {
  console.log(`\nSetting up LexCloud infrastructure in ${REGION}...\n`);
  try {
    await createBucket();
    await createTable();
    await createLawyersTable();
    console.log("\nDone. Infrastructure ready.\n");
  } catch (err) {
    console.error("\nError:", err.message);
    process.exit(1);
  }
})();
