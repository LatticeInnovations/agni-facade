let express = require("express");
let router = express.Router();
let organizationController = require("../../controllers/organizationController")


 
router.get("/", organizationController.getOrganizationData); 




module.exports = router