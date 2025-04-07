let express = require("express");
let router = express.Router();
let medDispenseController = require("../../controllers/medicationDispenseController")


router.post("/",  medDispenseController.saveMedicationDispense);

router.get("/", medDispenseController.getMedicationDispense); 

module.exports = router