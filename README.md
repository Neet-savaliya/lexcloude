# LexCloud — AI-Powered Legal Document Intelligence

**Dissertation Project | Final Year | AWS Mumbai Region**

A data-sovereign, serverless platform that lets Indian law firms upload case documents and query them using AI — all data stays within India (AWS ap-south-1).

## Project Structure

```
lexcloud/
├── backend/          # Lambda functions + API logic
│   └── src/
│       ├── handlers/ # Lambda handlers (upload, query, cases)
│       └── utils/    # Shared utilities (bedrock, textract, db)
├── frontend/         # React web app
├── infra/            # AWS infrastructure scripts
├── scripts/          # Setup and deployment scripts
└── dataset/          # Test dataset (IndianBailJudgments)
```

## AWS Services Used
- S3 — document storage
- AWS Textract — OCR / text extraction
- AWS Bedrock (Titan Embeddings + Claude Haiku) — AI
- Lambda — serverless compute
- API Gateway — REST API
- DynamoDB — metadata storage
- Cognito — user authentication

## AWS Region
ap-south-1 (Mumbai) — data never leaves India

## Estimated Cost
~$15–20 over 100 days on $100 AWS credit
