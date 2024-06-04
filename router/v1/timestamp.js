let express = require("express");
let router = express.Router();
let userController = require("../../controllers/userController");
let { check, oneOf, checkIf, body } = require('express-validator');


/**
 * Get Patients timestamps
 * @route GET /v1/timestamp
 * @security JWT
 * @returns {object} 200 - User data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */

router.get("/", userController.getTimestamp);

router.post("/", userController.updateTimestamp);

module.exports = router