require("dotenv").config();
const { GetCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require("docx");
const PDFDocument = require("pdfkit");
const { dynamo } = require("../lib/aws");

const TABLE = process.env.METADATA_TABLE;

/**
 * Reconstruct the full text of a source shown in a query's `sources` list,
 * whether it's a case document or a global KB judgment.
 *
 * `docId` here is whatever came back in `sources[i].docId` — for a case
 * document that's a CHUNK id (<parentId>_chunk_<i>), since that's what
 * query.js actually ranks. We resolve it back to the parent and stitch
 * every chunk together in order, so the lawyer downloads the whole
 * document, not the one passage that happened to match their question.
 */
async function getSourceText(caseId, docId, isGlobal) {
  if (isGlobal) {
    const res = await dynamo.send(new GetCommand({ TableName: TABLE, Key: { caseId: "GLOBAL", docId } }));
    if (!res.Item) return null;
    return { title: res.Item.docName, text: res.Item.extractedText || "" };
  }

  const chunkRes = await dynamo.send(new GetCommand({ TableName: TABLE, Key: { caseId, docId } }));
  const chunkItem = chunkRes.Item;
  if (!chunkItem) return null;

  // Pre-chunking legacy documents have no parentDocId — the item IS the full text.
  if (!chunkItem.parentDocId) {
    return { title: chunkItem.docName, text: chunkItem.extractedText || "" };
  }

  const chunksRes = await dynamo.send(new QueryCommand({
    TableName:              TABLE,
    IndexName:              "caseId-index",
    KeyConditionExpression: "caseId = :cid",
    FilterExpression:       "parentDocId = :pid",
    ExpressionAttributeValues: { ":cid": caseId, ":pid": chunkItem.parentDocId },
  }));
  const chunks = (chunksRes.Items || []).sort((a, b) => a.chunkIndex - b.chunkIndex);
  const text = chunks.map(c => c.extractedText).join("\n\n");
  return { title: chunkItem.docName, text };
}

function toTxtBuffer(text) {
  return Buffer.from(text, "utf-8");
}

async function toDocxBuffer(title, text) {
  const paragraphs = [
    new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
    ...text.split(/\n{2,}/).map(p => new Paragraph({ children: [new TextRun(p)] })),
  ];
  const doc = new Document({ sections: [{ children: paragraphs }] });
  return Packer.toBuffer(doc);
}

function toPdfBuffer(title, text) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).text(title, { underline: true });
    doc.moveDown();
    doc.fontSize(11).text(text, { align: "left" });
    doc.end();
  });
}

module.exports = { getSourceText, toTxtBuffer, toDocxBuffer, toPdfBuffer };
