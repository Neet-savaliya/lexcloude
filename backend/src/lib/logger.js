/**
 * Minimal structured logger — consistent timestamps and log levels
 * so CloudWatch log insights can filter on level= easily.
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;

function log(level, ...args) {
  if (LEVELS[level] < MIN_LEVEL) return;
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  if (level === "error") {
    console.error(prefix, ...args);
  } else if (level === "warn") {
    console.warn(prefix, ...args);
  } else {
    console.log(prefix, ...args);
  }
}

module.exports = {
  debug: (...a) => log("debug", ...a),
  info:  (...a) => log("info",  ...a),
  warn:  (...a) => log("warn",  ...a),
  error: (...a) => log("error", ...a),
};
