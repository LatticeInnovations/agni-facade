let express = require("express");
let router = express.Router();
let immunizationRecController = require("../../controllers/immunizationRecommendationController")


// router.post("/",  immunizationRecController.saveCVDData);

router.get("/", immunizationRecController.setImmunizationRecommendationData); 

// router.patch("/", immunizationRecController.updateCVDData); 

module.exports = router