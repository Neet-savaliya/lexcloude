const multer = require("multer");
const os = require("os");

module.exports = multer({ dest: os.tmpdir() });
