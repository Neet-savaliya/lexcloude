const path = require("path");
const { loadGlobalKb } = require("../scripts/load_global_kb");
const { clearGlobalPoolCache } = require("../services/query");

// The folder is set via GLOBAL_KB_DIR, not client input — there is no admin
// role yet to distinguish lawyers, so this must not accept an arbitrary
// filesystem path from the request body (that would let any logged-in
// lawyer make the server read and embed arbitrary local files).
async function loadKb(req, res) {
  try {
    if (!process.env.GLOBAL_KB_DIR)
      return res.status(500).json({ error: "GLOBAL_KB_DIR is not configured" });
    await loadGlobalKb(path.resolve(process.env.GLOBAL_KB_DIR));
    clearGlobalPoolCache(); // so the next query sees the freshly loaded docs immediately
    res.json({ status: "ok" });
  } catch (err) {
    console.error("[POST /admin/global-kb/load]", err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { loadKb };
