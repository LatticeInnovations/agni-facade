let router = require('express').Router();
let auth = require("../../middleware/checkAuth");
router.use("/auth", require("./authentication"));
router.use("/user", auth, require("./user"));
router.use("/sct", auth, require("./snomedCT"));
router.use("/timestamp", auth, require('./timestamp'));
router.use('/upload', auth, require('./fileUpload'));
router.use("/vaccine", auth, require("./vaccine"))
router.use("/Patient", auth, require("./patientRoute"))
router.use("/Schedule", auth, require("./scheduleRoute"))
module.exports = router;