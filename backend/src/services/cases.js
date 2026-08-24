require("dotenv").config();
const { v4: uuid }       = require("uuid");
const { PutCommand, QueryCommand, GetCommand, DeleteCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { dynamo, s3 }     = require("../lib/aws");

const TABLE  = process.env.METADATA_TABLE;
const BUCKET = process.env.DOCUMENTS_BUCKET;

/** Create a new case (just a metadata record with docId = "CASE_META") */
async function createCase(caseName, clientName, lawyerId) {
  const caseId = uuid();
  await dynamo.send(new PutCommand({
    TableName: TABLE,
    Item: {
      caseId,
      docId:      "CASE_META",
      lawyerId,
      caseName,
      clientName,
      createdAt:  new Date().toISOString(),
      status:     "active",
    },
  }));
  console.log(`[cases] Created case: ${caseId} — ${caseName}`);
  return { caseId, caseName, clientName };
}

/** List all cases (metadata only) belonging to a lawyer */
async function listCasesForLawyer(lawyerId) {
  const res = await dynamo.send(new QueryCommand({
    TableName:              TABLE,
    IndexName:              "lawyerId-index",
    KeyConditionExpression: "lawyerId = :lid",
    ExpressionAttributeValues: { ":lid": lawyerId },
  }));
  return res.Items || [];
}

/** List all documents uploaded to a case (excludes case metadata, chat messages, and chunk items) */
async function listCaseDocuments(caseId) {
  const res = await dynamo.send(new QueryCommand({
    TableName:              TABLE,
    IndexName:              "caseId-index",
    KeyConditionExpression: "caseId = :cid",
    FilterExpression:       "docId <> :meta AND attribute_not_exists(isMessage) AND attribute_not_exists(parentDocId)",
    ExpressionAttributeValues: { ":cid": caseId, ":meta": "CASE_META" },
    ProjectionExpression:   "docId, docName, uploadedAt, s3Key",
  }));
  return res.Items || [];
}

/** Get case metadata */
async function getCase(caseId) {
  const res = await dynamo.send(new GetCommand({
    TableName: TABLE,
    Key: { caseId, docId: "CASE_META" },
  }));
  return res.Item || null;
}

/** Rename a case and/or update its client name */
async function updateCase(caseId, { caseName, clientName }) {
  const sets = [];
  const values = {};
  if (caseName)   { sets.push("caseName = :cn");   values[":cn"] = caseName; }
  if (clientName) { sets.push("clientName = :cl"); values[":cl"] = clientName; }
  if (sets.length === 0) return getCase(caseId);

  await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key: { caseId, docId: "CASE_META" },
    UpdateExpression: "SET " + sets.join(", "),
    ExpressionAttributeValues: values,
  }));
  console.log(`[cases] Updated case: ${caseId}`);
  return getCase(caseId);
}

/**
 * Delete a case and everything under it: every document's S3 file, and
 * every DynamoDB item (documents, chat messages, and the CASE_META record
 * itself) sharing that caseId.
 */
async function deleteCase(caseId) {
  const res = await dynamo.send(new QueryCommand({
    TableName:              TABLE,
    IndexName:              "caseId-index",
    KeyConditionExpression: "caseId = :cid",
    ExpressionAttributeValues: { ":cid": caseId },
  }));
  const items = res.Items || [];

  for (const item of items) {
    if (item.s3Key) {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: item.s3Key }));
    }
    await dynamo.send(new DeleteCommand({
      TableName: TABLE,
      Key: { caseId, docId: item.docId },
    }));
  }
  console.log(`[cases] Deleted case: ${caseId} (${items.length} item(s))`);
}

/**
 * Delete a document: removes the S3 file, the document record, and every
 * chunk item that was embedded from it (docId: <docId>_chunk_<i>).
 */
async function deleteDocument(caseId, docId) {
  const res = await dynamo.send(new GetCommand({
    TableName: TABLE,
    Key: { caseId, docId },
  }));
  const doc = res.Item;
  if (!doc) return null;

  const chunksRes = await dynamo.send(new QueryCommand({
    TableName:              TABLE,
    IndexName:              "caseId-index",
    KeyConditionExpression: "caseId = :cid",
    FilterExpression:       "parentDocId = :pid",
    ExpressionAttributeValues: { ":cid": caseId, ":pid": docId },
  }));
  for (const chunk of chunksRes.Items || []) {
    await dynamo.send(new DeleteCommand({ TableName: TABLE, Key: { caseId, docId: chunk.docId } }));
  }

  if (doc.s3Key) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: doc.s3Key }));
  }
  await dynamo.send(new DeleteCommand({
    TableName: TABLE,
    Key: { caseId, docId },
  }));
  console.log(`[cases] Deleted document: caseId=${caseId} docId=${docId} (+ ${chunksRes.Items?.length || 0} chunk(s))`);
  return doc;
}

module.exports = { createCase, listCasesForLawyer, listCaseDocuments, getCase, updateCase, deleteCase, deleteDocument };
