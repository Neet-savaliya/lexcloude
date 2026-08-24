/**
 * Exponential backoff retry wrapper for AWS SDK calls.
 * Retries on throttling (TooManyRequestsException, ProvisionedThroughputExceededException)
 * and transient network errors. Fails fast on permanent errors (auth, validation, not-found).
 */

const RETRYABLE = new Set([
  "TooManyRequestsException",
  "ThrottlingException",
  "ProvisionedThroughputExceededException",
  "RequestLimitExceeded",
  "ServiceUnavailableException",
  "InternalServerError",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
]);

function isRetryable(err) {
  if (!err) return false;
  if (RETRYABLE.has(err.name)) return true;
  if (RETRYABLE.has(err.code)) return true;
  const status = err.$metadata?.httpStatusCode;
  return status === 429 || status === 503 || status === 502;
}

/**
 * @param {() => Promise<T>} fn     - The async AWS call to attempt
 * @param {number}           maxTries - Maximum attempts (default 3)
 * @returns {Promise<T>}
 */
async function withRetry(fn, maxTries = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= maxTries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === maxTries) throw err;
      const delay = Math.min(200 * 2 ** (attempt - 1), 3000); // 200ms, 400ms, 800ms …
      const jitter = Math.random() * 100;
      console.warn(`[retry] attempt ${attempt} failed (${err.name || err.code}), retrying in ${Math.round(delay + jitter)}ms`);
      await new Promise(r => setTimeout(r, delay + jitter));
    }
  }
  throw lastErr;
}

module.exports = { withRetry };
