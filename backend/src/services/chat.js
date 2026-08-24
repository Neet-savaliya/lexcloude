require("dotenv").config();
const { v4: uuid } = require("uuid");
const { PutCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { dynamo } = require("../lib/aws");

const TABLE = process.env.METADATA_TABLE;
const MSG_PREFIX = "MSG#";

// docId = MSG#<ISO timestamp>#<short id> so a plain sort-key query on the
// base table (caseId HASH, docId RANGE) returns messages in chronological
// order for free — no separate index or client-side sort needed.
function messageDocId(createdAt) {
  return `${MSG_PREFIX}${createdAt}#${uuid().slice(0, 8)}`;
}

/** Persist one chat message (question or answer) for a case. */
async function saveMessage(caseId, role, content, sources) {
  const createdAt = new Date().toISOString();
  const docId = messageDocId(createdAt);

  const item = { caseId, docId, isMessage: true, role, content, createdAt };
  if (sources) item.sources = sources;

  await dynamo.send(new PutCommand({ TableName: TABLE, Item: item }));
  return { docId, role, content, sources: sources || [], createdAt };
}

/** List all chat messages for a case, oldest first. */
async function listMessages(caseId) {
  const res = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "caseId = :cid AND begins_with(docId, :prefix)",
    ExpressionAttributeValues: { ":cid": caseId, ":prefix": MSG_PREFIX },
  }));
  return (res.Items || []).map(({ docId, role, content, sources, createdAt }) =>
    ({ docId, role, content, sources: sources || [], createdAt }));
}

module.exports = { saveMessage, listMessages, MSG_PREFIX };
