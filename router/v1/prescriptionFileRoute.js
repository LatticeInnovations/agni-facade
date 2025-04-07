let express = require("express");
let router = express.Router();
let prescriptionFileController = require("../../controllers/prescriptionFileController")


router.post("/",  prescriptionFileController.savePrescriptionFile);

router.get("/", prescriptionFileController.getPrescriptionFile); 

router.delete("/", prescriptionFileController.deletePrescriptionFile); 

module.exports = router