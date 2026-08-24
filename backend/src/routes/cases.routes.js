const express = require("express");
const router = express.Router();

const requireAuth   = require("../middleware/auth");
const upload         = require("../middleware/upload");
const casesController  = require("../controllers/cases.controller");
const uploadController = require("../controllers/upload.controller");
const queryController  = require("../controllers/query.controller");

// All /cases routes require a logged-in lawyer
router.use(requireAuth);

router.get("/",  casesController.listCases);
router.post("/", casesController.createCase);

router.get("/:caseId", casesController.getCase);
router.patch("/:caseId", casesController.updateCase);
router.delete("/:caseId", casesController.deleteCase);
router.get("/:caseId/documents", casesController.listDocuments);
router.delete("/:caseId/documents/:docId", casesController.deleteDocument);

router.post("/:caseId/upload", upload.single("file"), uploadController.uploadDocument);
router.post("/:caseId/query", queryController.queryCase);
router.get("/:caseId/messages", queryController.listMessages);
router.get("/:caseId/sources/:docId/download", queryController.downloadSource);

module.exports = router;
