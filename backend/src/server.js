require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const rateLimit = require("express-rate-limit");
const routes  = require("./routes");
const logger  = require("./lib/logger");

const app = express();

// ── CORS: only allow the known frontend origin ────────────────────────────────
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map(o => o.trim());

app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server calls (no Origin header) and the known frontend
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ── Rate limiting: 100 requests per minute per IP ────────────────────────────
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests — please wait before retrying." },
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));

// ── Per-request timeout (90 s) ────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setTimeout(90_000, () => {
    logger.warn(`[timeout] ${req.method} ${req.path} exceeded 90s`);
    if (!res.headersSent) res.status(503).json({ error: "Request timed out" });
  });
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/", routes);

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  logger.error(`[error] ${req.method} ${req.path}`, err);
  if (!res.headersSent) {
    res.status(err.status || 500).json({ error: err.message || "Internal server error" });
  }
});

// ── Crash safety ───────────────────────────────────────────────────────────────
process.on("unhandledRejection", (reason) => {
  logger.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  logger.error("[uncaughtException]", err);
  // Give logger a moment to flush, then exit so the process manager can restart
  setTimeout(() => process.exit(1), 500);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  logger.info(`LexCloud API running on http://localhost:${PORT}`);
  logger.info(`Region: ${process.env.AWS_REGION}`);
  logger.info(`Bucket: ${process.env.DOCUMENTS_BUCKET}`);
  logger.info(`Table:  ${process.env.METADATA_TABLE}`);
});
