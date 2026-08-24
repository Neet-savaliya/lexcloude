const casesService = require("../services/cases");

async function listCases(req, res) {
  try {
    const cases = await casesService.listCasesForLawyer(req.lawyerId);
    res.json({ cases });
  } catch (err) {
    console.error("[GET /cases]", err.message);
    res.status(500).json({ error: err.message });
  }
}

async function createCase(req, res) {
  try {
    const { caseName, clientName } = req.body;
    if (!caseName || !clientName)
      return res.status(400).json({ error: "caseName and clientName are required" });
    const result = await casesService.createCase(caseName, clientName, req.lawyerId);
    res.status(201).json(result);
  } catch (err) {
    console.error("[POST /cases]", err.message);
    res.status(500).json({ error: err.message });
  }
}

async function getCase(req, res) {
  try {
    const caseData = await casesService.getCase(req.params.caseId);
    if (!caseData) return res.status(404).json({ error: "Case not found" });
    if (caseData.lawyerId !== req.lawyerId)
      return res.status(403).json({ error: "Forbidden" });
    res.json(caseData);
  } catch (err) {
    console.error("[GET /cases/:id]", err.message);
    res.status(500).json({ error: err.message });
  }
}

async function updateCase(req, res) {
  try {
    const { caseName, clientName } = req.body;
    if (!caseName && !clientName)
      return res.status(400).json({ error: "caseName or clientName is required" });
    const caseData = await casesService.getCase(req.params.caseId);
    if (!caseData) return res.status(404).json({ error: "Case not found" });
    if (caseData.lawyerId !== req.lawyerId)
      return res.status(403).json({ error: "Forbidden" });
    const updated = await casesService.updateCase(req.params.caseId, {
      caseName: caseName?.trim(),
      clientName: clientName?.trim(),
    });
    res.json(updated);
  } catch (err) {
    console.error("[PATCH /cases/:id]", err.message);
    res.status(500).json({ error: err.message });
  }
}

async function deleteCase(req, res) {
  try {
    const caseData = await casesService.getCase(req.params.caseId);
    if (!caseData) return res.status(404).json({ error: "Case not found" });
    if (caseData.lawyerId !== req.lawyerId)
      return res.status(403).json({ error: "Forbidden" });
    await casesService.deleteCase(req.params.caseId);
    res.json({ status: "ok", caseId: req.params.caseId });
  } catch (err) {
    console.error("[DELETE /cases/:id]", err.message);
    res.status(500).json({ error: err.message });
  }
}

async function listDocuments(req, res) {
  try {
    const caseData = await casesService.getCase(req.params.caseId);
    if (!caseData) return res.status(404).json({ error: "Case not found" });
    if (caseData.lawyerId !== req.lawyerId)
      return res.status(403).json({ error: "Forbidden" });
    const docs = await casesService.listCaseDocuments(req.params.caseId);
    res.json({ documents: docs });
  } catch (err) {
    console.error("[GET /cases/:id/documents]", err.message);
    res.status(500).json({ error: err.message });
  }
}

async function deleteDocument(req, res) {
  try {
    const { caseId, docId } = req.params;
    if (docId === "CASE_META")
      return res.status(400).json({ error: "Cannot delete case metadata" });
    const caseData = await casesService.getCase(caseId);
    if (!caseData) return res.status(404).json({ error: "Case not found" });
    if (caseData.lawyerId !== req.lawyerId)
      return res.status(403).json({ error: "Forbidden" });
    const deleted = await casesService.deleteDocument(caseId, docId);
    if (!deleted) return res.status(404).json({ error: "Document not found" });
    res.json({ status: "ok", docId });
  } catch (err) {
    console.error("[DELETE /cases/:caseId/documents/:docId]", err.message);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listCases, createCase, getCase, updateCase, deleteCase, listDocuments, deleteDocument };
