let router = require('express').Router();
let auth = require("../../middleware/checkAuth");
console.log("yaaaaaa")
router.use("/auth", require("./authentication"));
router.use("/sync", auth, require("./patientBundle"));
router.use("/user", auth, require("./user"));
router.use("/sct", auth, require("./snomedCT"));
router.use("/timestamp", auth, require('./timestamp'));
router.use('/upload', auth, require('./fileUpload'));
router.use("/", auth, require("./resource"));
router.use("/vaccine", auth, require("./vaccine"))
router.use("/Patient", auth, require("./patientRoute"))

module.exports = router;