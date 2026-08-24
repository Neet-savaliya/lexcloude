const casesService    = require("../services/cases");
const queryService    = require("../services/query");
const chatService     = require("../services/chat");
const downloadService = require("../services/download");

async function queryCase(req, res) {
  try {
    const { question } = req.body;
    if (!question)
      return res.status(400).json({ error: "question is required" });
    const caseData = await casesService.getCase(req.params.caseId);
    if (!caseData) return res.status(404).json({ error: "Case not found" });
    if (caseData.lawyerId !== req.lawyerId)
      return res.status(403).json({ error: "Forbidden" });

    await chatService.saveMessage(req.params.caseId, "user", question);
    const result = await queryService.queryCase(req.params.caseId, question);
    await chatService.saveMessage(req.params.caseId, "assistant", result.answer, result.sources);

    res.json(result);
  } catch (err) {
    console.error("[POST /query]", err.message);
    res.status(500).json({ error: err.message });
  }
}

async function listMessages(req, res) {
  try {
    const caseData = await casesService.getCase(req.params.caseId);
    if (!caseData) return res.status(404).json({ error: "Case not found" });
    if (caseData.lawyerId !== req.lawyerId)
      return res.status(403).json({ error: "Forbidden" });
    const messages = await chatService.listMessages(req.params.caseId);
    res.json({ messages });
  } catch (err) {
    console.error("[GET /messages]", err.message);
    res.status(500).json({ error: err.message });
  }
}

const CONTENT_TYPES = {
  txt:  "text/plain; charset=utf-8",
  pdf:  "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

async function downloadSource(req, res) {
  try {
    const { caseId, docId } = req.params;
    const format = (req.query.format || "txt").toLowerCase();
    const isGlobal = req.query.global === "true";

    if (!CONTENT_TYPES[format])
      return res.status(400).json({ error: "format must be one of: txt, pdf, docx" });

    // Global judgments are shared precedent, not case-specific, but the route
    // is still nested under a case the lawyer must own — same ownership gate
    // as every other /cases/:caseId/* endpoint.
    const caseData = await casesService.getCase(caseId);
    if (!caseData) return res.status(404).json({ error: "Case not found" });
    if (caseData.lawyerId !== req.lawyerId)
      return res.status(403).json({ error: "Forbidden" });

    const source = await downloadService.getSourceText(isGlobal ? "GLOBAL" : caseId, docId, isGlobal);
    if (!source) return res.status(404).json({ error: "Source not found" });

    const safeName = source.title.replace(/[^a-z0-9]+/gi, "_").slice(0, 60) || "document";
    let buffer;
    if (format === "pdf")       buffer = await downloadService.toPdfBuffer(source.title, source.text);
    else if (format === "docx") buffer = await downloadService.toDocxBuffer(source.title, source.text);
    else                        buffer = downloadService.toTxtBuffer(source.text);

    res.set({
      "Content-Type": CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${safeName}.${format}"`,
    });
    res.send(buffer);
  } catch (err) {
    console.error("[GET /sources/download]", err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { queryCase, listMessages, downloadSource };
