let express = require("express");
let router = express.Router();
let resourceController = require("../../controllers/manageResource");
let { check, oneOf, checkIf, body } = require('express-validator');


module.exports = router