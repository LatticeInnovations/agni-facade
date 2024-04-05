const express = require('express')
const router = express.Router();
const auth = require("../../middleware/checkAuth");
router.use("/auth", require("./authentication"));
router.use("/sct", auth, require("./snomedCT"));
router.use("/Practitioner", auth,  require("./practitrioner"));
router.use("/address", auth,  require("./address"));
router.use('/', auth, require('./fileUpload'));


module.exports = router;