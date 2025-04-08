let express = require("express");
let router = express.Router();
let labReportController = require("../../controllers/labReportController");


router.post("/",  labReportController.saveLabReport);

router.get("/", labReportController.getLabReport); 

router.delete("/", labReportController.deleteLabReport); 

module.exports = router