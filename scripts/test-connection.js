require("dotenv").config({ path: "../backend/.env" });
const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");

async function testConnection() {
  console.log("Testing AWS connection...");
  console.log("Region:", process.env.AWS_REGION);

  const client = new S3Client({ region: process.env.AWS_REGION });

  try {
    const response = await client.send(new ListBucketsCommand({}));
    console.log("Connected to AWS successfully.");
    console.log("Existing buckets:", response.Buckets.map(b => b.Name).join(", ") || "none");
  } catch (err) {
    console.error("Connection failed:", err.message);
    console.error("Check your AWS credentials in backend/.env");
  }
}

testConnection();
