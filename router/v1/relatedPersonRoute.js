let express = require("express");
let router = express.Router();
let rpController = require("../../controllers/relatedPersonController")


router.post("/",  rpController.saveRelatedPersonData);

router.patch("/",  rpController.patchRelatedPersonData);

router.get("/", rpController.getRelatedPersonData); 

module.exports = router