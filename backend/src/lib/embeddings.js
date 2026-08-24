const { InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const { bedrock } = require("./aws");

const MODEL = process.env.BEDROCK_EMBEDDING_MODEL; // amazon.titan-embed-text-v1

/**
 * Convert a text string to a vector embedding via Amazon Titan.
 * Returns a float array (1536 dimensions).
 */
async function embed(text) {
  const truncated = text.slice(0, 8000); // Titan max input
  const res = await bedrock.send(new InvokeModelCommand({
    modelId: MODEL,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify({ inputText: truncated }),
  }));
  const body = JSON.parse(Buffer.from(res.body).toString("utf-8"));
  return body.embedding; // float[]
}

/**
 * Cosine similarity between two equal-length vectors.
 */
function cosineSim(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = { embed, cosineSim };
