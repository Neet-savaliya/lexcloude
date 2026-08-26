/**
 * Global rate limiter for Bedrock calls.
 *
 * The account's on-demand throughput quota for Claude 3 Haiku in ap-south-1
 * is low and NOT self-service adjustable (confirmed via the Service Quotas
 * console — "Not adjustable"). Every queryCase() call already makes 2-3
 * sequential Bedrock calls (rewrite -> embed -> answer); with more than a
 * handful of users querying at once, their calls race each other and AWS
 * throws ThrottlingException — this was reproduced directly by the
 * evaluation harness (scripts/eval/run_eval.js) even from a single process.
 *
 * Rather than let every user's request fail independently, every Bedrock
 * call in the app (embed, query rewrite, answer generation) is routed
 * through this one process-wide queue. Calls are released one at a time at
 * a safe pace instead of firing simultaneously — under load, requests wait
 * a little longer instead of erroring out.
 *
 * Tune via env vars if AWS ever grants a higher quota:
 *   BEDROCK_MAX_CONCURRENT (default 1) — how many Bedrock calls may be
 *     in flight at once.
 *   BEDROCK_MIN_INTERVAL_MS (default 600) — minimum gap between the START
 *     of one call and the next.
 */

const MAX_CONCURRENT   = parseInt(process.env.BEDROCK_MAX_CONCURRENT || "1", 10);
const MIN_INTERVAL_MS  = parseInt(process.env.BEDROCK_MIN_INTERVAL_MS || "600", 10);

let active = 0;
let lastStart = 0;
const queue = [];
let timer = null;

function pump() {
  if (timer) return; // a release is already scheduled — it will call pump() again
  if (active >= MAX_CONCURRENT || queue.length === 0) return;

  const wait = Math.max(0, lastStart + MIN_INTERVAL_MS - Date.now());
  timer = setTimeout(() => {
    timer = null;
    if (active >= MAX_CONCURRENT || queue.length === 0) return;

    const job = queue.shift();
    active++;
    lastStart = Date.now();
    job.fn().then(job.resolve, job.reject).finally(() => {
      active--;
      pump();
    });
    pump(); // let another slot start immediately if MAX_CONCURRENT allows it
  }, wait);
}

/** Queue an async Bedrock call to run at a globally safe, paced rate. */
function enqueue(fn) {
  return new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    pump();
  });
}

module.exports = { enqueue };
