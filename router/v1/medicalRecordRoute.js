let express = require("express");
let router = express.Router();
let medicalRecordController = require("../../controllers/medicalRecordController");


router.post("/",  medicalRecordController.saveMedicalRecord);

router.get("/", medicalRecordController.getMedicalRecord); 

router.delete("/", medicalRecordController.deleteMedicalRecord); 

module.exports = router