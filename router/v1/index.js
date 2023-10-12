let router = require('express').Router();
let auth = require("../../middleware/checkAuth");
router.use("/auth", require("./authentication"));
//router.use("/sync", auth, require("./patientBundle"));
//router.use("/user", auth, require("./user"));
router.use("/sct", auth, require("./snomedCT"));
//router.use("/", auth, require("./resource"));
router.use("/Practitioner", auth,  require("./practitrioner"));


module.exports = router;