const express = require("express");
const router = express.Router();

const requireAuth = require("../middleware/auth");
const adminController = require("../controllers/admin.controller");

router.post("/global-kb/load", requireAuth, adminController.loadKb);

module.exports = router;
