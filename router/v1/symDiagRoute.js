let express = require("express");
let router = express.Router();
let symDiagController = require("../../controllers/symDiagController")


router.post("/",  symDiagController.saveSymptomDiagnosisData);

router.get("/", symDiagController.getSymptomDiagnosisData); 

router.patch("/", symDiagController.patchSymptomDiagnosisData);

router.get("/list", symDiagController.getSymptomsDiagnosisList);

module.exports = router