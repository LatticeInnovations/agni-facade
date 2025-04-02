let express = require("express");
let router = express.Router();
let prescriptionController = require("../../controllers/prescriptionController")


router.post("/",  prescriptionController.savePrescriptionData);

router.get("/", prescriptionController.getPrescriptionData); 

module.exports = router