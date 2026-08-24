require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const { v4: uuid } = require("uuid");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const {
    StartDocumentTextDetectionCommand,
    GetDocumentTextDetectionCommand,
} = require("@aws-sdk/client-textract");
const { PutCommand } = require("@aws-sdk/lib-dynamodb");
const { s3, textract, dynamo } = require("../lib/aws");
const { embed } = require("../lib/embeddings");
const { withRetry } = require("../lib/retry");
const logger = require("../lib/logger");

const BUCKET = process.env.DOCUMENTS_BUCKET;
const TABLE = process.env.METADATA_TABLE;

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 60; // ~2 minutes before giving up

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const CHUNK_SIZE_WORDS = 500;
const CHUNK_OVERLAP_WORDS = 100;

/**
 * Split text into overlapping ~500-word chunks so a specific fact anywhere
 * in a long document gets its own precise vector at query time, instead of
 * being diluted into (or cut off from) one whole-document vector.
 */
function chunkText(text, chunkSize = CHUNK_SIZE_WORDS, overlap = CHUNK_OVERLAP_WORDS) {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [text];

    const chunks = [];
    const step = chunkSize - overlap;
    for (let i = 0; i < words.length; i += step) {
        chunks.push(words.slice(i, i + chunkSize).join(" "));
        if (i + chunkSize >= words.length) break;
    }
    return chunks;
}

/**
 * Runs Textract's async job API so multi-page PDFs are fully extracted
 * (the sync DetectDocumentText API only supports single-page PDFs).
 */
async function extractPdfText(s3Key) {
    const { JobId } = await textract.send(
        new StartDocumentTextDetectionCommand({
            DocumentLocation: { S3Object: { Bucket: BUCKET, Name: s3Key } },
        }),
    );

    let job;
    for (let i = 0; i < MAX_POLLS; i++) {
        job = await textract.send(
            new GetDocumentTextDetectionCommand({ JobId }),
        );
        if (job.JobStatus === "SUCCEEDED" || job.JobStatus === "FAILED") break;
        await sleep(POLL_INTERVAL_MS);
    }

    if (!job || job.JobStatus !== "SUCCEEDED") {
        throw new Error(
            `Textract job ${JobId} did not succeed (status: ${job?.JobStatus || "TIMED_OUT"})`,
        );
    }

    const lines = job.Blocks.filter((b) => b.BlockType === "LINE").map(
        (b) => b.Text,
    );

    let nextToken = job.NextToken;
    while (nextToken) {
        const page = await textract.send(
            new GetDocumentTextDetectionCommand({
                JobId,
                NextToken: nextToken,
            }),
        );
        lines.push(
            ...page.Blocks.filter((b) => b.BlockType === "LINE").map(
                (b) => b.Text,
            ),
        );
        nextToken = page.NextToken;
    }

    return lines.join("\n");
}

/**
 * Upload a PDF/DOCX file, extract text via Textract, embed it, store in DynamoDB.
 *
 * @param {string} filePath  - Local path to the file
 * @param {string} caseId    - Case this document belongs to
 * @param {string} docName   - Human-readable document name
 */
async function uploadDocument(filePath, caseId, docName) {
    const docId = uuid();
    const ext = path.extname(filePath).toLowerCase();
    const s3Key = `cases/${caseId}/${docId}${ext}`;
    const fileBody = fs.readFileSync(filePath);

    const CONTENT_TYPES = {
        ".pdf":  "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".txt":  "text/plain",
    };

    // 1. Upload raw file to S3
    await withRetry(() => s3.send(
        new PutObjectCommand({
            Bucket: BUCKET,
            Key: s3Key,
            Body: fileBody,
            ContentType: CONTENT_TYPES[ext] || "application/octet-stream",
        }),
    ));
    logger.info(`[upload] Stored in S3: ${s3Key}`);

    // 2. Extract text — Textract for PDFs, mammoth for DOCX, direct read for txt
    let extractedText;
    if (ext === ".pdf") {
        extractedText = await extractPdfText(s3Key);
    } else if (ext === ".docx") {
        const { value } = await mammoth.extractRawText({ buffer: fileBody });
        extractedText = value;
    } else {
        // .txt and other plain text formats
        extractedText = fileBody.toString("utf-8");
    }
    logger.info(`[upload] Extracted ${extractedText.length} chars`);

    // 3. Split into overlapping chunks and embed each one separately
    const chunks = chunkText(extractedText);
    logger.info(`[upload] Split into ${chunks.length} chunk(s)`);

    for (let i = 0; i < chunks.length; i++) {
        const embedding = await embed(chunks[i]);
        await withRetry(() => dynamo.send(
            new PutCommand({
                TableName: TABLE,
                Item: {
                    caseId,
                    docId: `${docId}_chunk_${i}`,
                    parentDocId: docId, // links this chunk back to the document record below
                    chunkIndex: i,
                    totalChunks: chunks.length,
                    docName,
                    extractedText: chunks[i],
                    embedding,
                    uploadedAt: new Date().toISOString(),
                },
            }),
        ));
    }
    logger.info(`[upload] Embedded and saved ${chunks.length} chunk(s)`);

    // 4. Store one lightweight parent record for the document itself (no
    // embedding) — this is what the Documents panel lists and what
    // deleteDocument() operates on; the chunk items above are what
    // query.js actually searches against.
    await withRetry(() => dynamo.send(
        new PutCommand({
            TableName: TABLE,
            Item: {
                caseId,
                docId,
                docName,
                s3Key,
                chunkCount: chunks.length,
                uploadedAt: new Date().toISOString(),
            },
        }),
    ));
    logger.info(`[upload] Saved document record: caseId=${caseId} docId=${docId}`);

    return { caseId, docId, docName, s3Key };
}

module.exports = { uploadDocument };
