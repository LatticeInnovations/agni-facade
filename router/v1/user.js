let express = require("express");
let router = express.Router();
let userController = require("../../controllers/userController");


/**
 * Get User detail
 * @route GET /v1/user
 * @group User
 * @security JWT
 * @returns {object} 200 - resource data fetched successfully.
 * @returns {object} 200 - resource data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */

router.get("/", userController.getUserProfile); 

module.exports = router