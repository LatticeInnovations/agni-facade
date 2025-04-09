let express = require("express");
let router = express.Router();
let immunizationRecController = require("../../controllers/immunizationRecommendationController")


// router.post("/",  immunizationRecController.saveCVDData);

router.get("/", immunizationRecController.getCVDData); 

// router.patch("/", immunizationRecController.updateCVDData); 

module.exports = router