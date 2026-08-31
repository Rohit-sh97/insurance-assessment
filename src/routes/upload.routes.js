const express = require("express");
const upload = require("../middleware/upload.middleware");
const uploadController = require("../controllers/upload.controller");

const router = express.Router();

router.post("/", upload.single("file"), uploadController.uploadFile);

module.exports = router;
