const express = require("express");
const { DescribeTableCommand } = require("@aws-sdk/client-dynamodb");
const { dynamoRaw } = require("../lib/aws");
const router = express.Router();

/**
 * GET /health
 * Returns the status of each critical dependency so a load balancer or
 * uptime monitor can verify the system is actually working, not just running.
 */
router.get("/", async (_req, res) => {
  const start = Date.now();
  const checks = {};

  // DynamoDB — lightweight DescribeTable call (read metadata, no data scan)
  try {
    await dynamoRaw.send(new DescribeTableCommand({ TableName: process.env.METADATA_TABLE }));
    checks.dynamodb = "ok";
  } catch (err) {
    checks.dynamodb = `error: ${err.message}`;
  }

  const allOk = Object.values(checks).every(v => v === "ok");

  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ok" : "degraded",
    region: process.env.AWS_REGION,
    uptimeSeconds: Math.floor(process.uptime()),
    latencyMs: Date.now() - start,
    checks,
  });
});

module.exports = router;
