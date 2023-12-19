let express = require("express");
const router = express.Router();
const { query } = require('express-validator');
const { uploadFiles, downloadFile } = require("../../controllers/fileUpload");
const auth = require("../../middleware/checkAuth");
const uploadMiddleware = require('../../middleware/uploadMiddleware');

router.post('/file', uploadMiddleware, uploadFiles);

router.get('/file', [query('name').notEmpty() ], downloadFile);

module.exports = router;