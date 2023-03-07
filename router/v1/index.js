let router = require('express').Router();

router.use("/sync", require("./patientBundle"));
router.use("/", require("./resource"));


module.exports = router;