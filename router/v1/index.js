let router = require('express').Router();
let auth = require("../../middleware/checkAuth");

router.use("/sync", auth, require("./patientBundle"));
router.use("/auth", require("./authentication"));
router.use("/user", auth, require("./user"));
router.use("/", auth, require("./resource"));


module.exports = router;