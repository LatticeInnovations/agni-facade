let express = require("express");
let router = express.Router();
let medicationController = require("../../controllers/medicationController")


 
router.get("/", medicationController.getMedicationList); 


module.exports = router