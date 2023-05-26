let router = require('express').Router();
let auth = require("../../middleware/checkAuth");
console.log("yaaaaaa")
router.use("/auth", require("./authentication"));
router.use("/sync", auth, require("./patientBundle"));
router.use("/user", auth, require("./user"));
router.use("/sct", auth, require("./snomedCT"));
router.use("/", auth, require("./resource"));


module.exports = router;