const path = require("path");
const fs   = require("fs");
const casesService  = require("../services/cases");
const uploadService = require("../services/upload");

async function uploadDocument(req, res) {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const tmpPath = req.file.path;
  const originalName = req.file.originalname;
  const ext = path.extname(originalName).toLowerCase();

  // Rename tmp file to preserve extension (Textract needs it for PDFs)
  const renamedPath = tmpPath + ext;
  fs.renameSync(tmpPath, renamedPath);

  try {
    const caseData = await casesService.getCase(req.params.caseId);
    if (!caseData) return res.status(404).json({ error: "Case not found" });
    if (caseData.lawyerId !== req.lawyerId)
      return res.status(403).json({ error: "Forbidden" });

    const result = await uploadService.uploadDocument(renamedPath, req.params.caseId, originalName);
    res.status(201).json(result);
  } catch (err) {
    console.error("[POST /upload]", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    // Clean up temp file
    if (fs.existsSync(renamedPath)) fs.unlinkSync(renamedPath);
  }
}

module.exports = { uploadDocument };
