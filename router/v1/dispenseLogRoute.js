let express = require("express");
let router = express.Router();
let dispenseLogController = require("../../controllers/dispenseLogController")



router.get("/", dispenseLogController.getDispenseLog); 

module.exports = router