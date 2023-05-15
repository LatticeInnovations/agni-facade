let express = require("express");
let router = express.Router();
let authController = require("../../controllers/authcontroller")
/**
 * @typedef login
 * @property {string} userContact.required User mobile number or email address - eg: tulika@thelattice.in
 */

/**
 * Login 
 * @route POST /v1/auth/login
 * @group Authentication
 * @param {login.model} login.body.required
 * @returns {object} 201 - User data created successfully.
 * @returns {object} 200 - User data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */

router.post("/login", authController.login);

/**
* @typedef OTPAuth
* @property {string} userContact.required User mobile number or email address - eg: tulika@thelattice.in
* @property {number} otp.required 6 digits OTP received via sms or email - eg; 000000
*/

/**
* Login 
* @route POST /v1/auth/otp
* @group Authentication
* @param {OTPAuth.model} OTPAuth.body.required
* @returns {object} 201 - User data created successfully.
* @returns {object} 200 - User data not found.
* @returns {Error} 401 - You are unauthorized to perform this operation.
* @returns {Error} 500 - Unable to process
* @returns {Error} 504 - Database connection error
*/

router.post("/otp", authController.OTPAuthentication);







module.exports = router