const express = require("express");
const router = express.Router();

router.use("/health", require("./health.routes"));
router.use("/auth",   require("./auth.routes"));
router.use("/cases",  require("./cases.routes"));
router.use("/admin",  require("./admin.routes"));

module.exports = router;
