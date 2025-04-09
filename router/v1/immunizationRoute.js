let express = require("express");
let router = express.Router();
let immunizationController = require("../../controllers/immunizationController")


router.post("/",  immunizationController.saveImmunizationData);

router.get("/", immunizationController.getImmunizationDetails); 

// router.patch("/", immunizationController.updateCVDData); 

module.exports = router