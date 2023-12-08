let express = require("express");
const router = express.Router();
const authController = require("../../controllers/authController");
const { check } = require('express-validator');
const auth = require("../../middleware/checkAuth");

/**
 * @typedef passwordLogin
 * @property {string} mobileNumber.required User mobile number or email address - eg: 8709135849
 * @property {string} isdCode.required Mobile number international code - eg: +91
 * @property {string} password.required password - eg: Lattice@123
 * @property {boolean} isMobile.required If the user is logging in using mobile - eg: true
 */

/**
 * Web Login with password
 * @route POST /v1/auth/login
 * @group Authentication
 * @param {passwordLogin.model} login.body.required
 * @returns {object} 201 - User data created successfully.
 * @returns {object} 200 - User data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */


router.post("/login", [check("mobileNumber").notEmpty().isNumeric().isLength({min: 5, max: 10}), check("password").notEmpty().isLength({min: 8, max: 16}), check("isdCode").notEmpty().isLength({min: 3, max: 4}), check('isMobile').notEmpty().isBoolean()], authController.login);

/**
 * @typedef ContactVerification
 * @property {string} mobileNumber.required User mobile number - eg: 8709135849
 * @property {string} isdCode.required Mobile number international code - eg: +91
 * @property {boolean} isMobile.required If the user is logging in using mobile - eg: true
 */

/**
 * Verify contact number of user and generate OTP for mobile. Generate OTP on web only when the user needs OTP verification, else user will get only verification success message 
 * @route POST /v1/auth/verifyUser
 * @group Authentication
 * @param {ContactVerification.model} contactVerify.body.required
 * @returns {object} 201 - User data created successfully.
 * @returns {object} 200 - User data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */

router.post("/verifyUser", [check("mobileNumber").notEmpty().isNumeric().isLength({min: 5, max: 10}).trim(), check("isdCode").notEmpty().isLength({min: 3, max: 4}).trim(), check('isMobile').notEmpty().isBoolean()
], authController.verifyContactAndGenOTP);


/**
* @typedef SetPassword
* @property {string} isdCode.required Mobile number international code - eg: +648
* @property {string} mobileNumber.required User mobile number - eg: 8709135849
* @property {string} newPassword password for web otherwise this will be left blank - eg: Lattice@123
*/

/**
 * Set password of the user for the web. This api can be used for both setting password for the first time and reset password after login as well 
 * @route POST /v1/auth/setPassword
 * @group Authentication
 * @param {SetPassword.model} setPassword.body.required
 * @returns {object} 201 - User data created successfully.
 * @returns {object} 200 - User data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */

router.post("/setPassword", [check("mobileNumber").notEmpty().isNumeric().isLength({min: 10, max: 10}).trim(), check("newPassword").notEmpty().isLength({min: 8, max: 16}), check("isdCode").notEmpty().isLength({min: 3, max: 4}).trim()
], authController.setPassword);


/**
* @typedef verifyOTP
* @property {string} isdCode.required Mobile number international code - eg: +648
* @property {string} mobileNumber.required User mobile number - eg: 8709135849
* @property {string} otp.required 6 digits OTP received via sms or email - eg: 111111
* @property {boolean} isMobile.required If the user is verifying using mobile or app - eg: true
*/

/**
 * verify OTP for APP and web. User will receive token here only for mobile.
 * @route POST /v1/auth/otp
 * @group Authentication
 * @param {verifyOTP.model} verifyOTP.body.required
 * @returns {object} 201 - User data created successfully.
 * @returns {object} 200 - User data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */


router.post("/otp", [check("mobileNumber").notEmpty().isNumeric().isLength({min: 10, max: 10}),  check("isdCode").notEmpty().isLength({min: 3, max: 4}).trim(), check("isMobile").notEmpty().isBoolean() ,check("otp").notEmpty().isLength({min: 6, max: 6})], authController.verifyOTP);


/**
* @typedef ChangePassword
* @property {string} oldPassword.required 6 digits OTP received via sms or email - eg; 000000
* @property {string} newPassword.required 6 digits OTP received via sms or email - eg; 000000
*/

/**
* Password change after login
* @route POST /v1/auth/changePassword
* @group Authentication
* @param {ChangePassword.model} changePassword.body.required
* @s
* @returns {object} 201 - User data created successfully.
* @returns {object} 200 - User data not found.
* @returns {Error} 401 - You are unauthorized to perform this operation.
* @returns {Error} 500 - Unable to process
* @returns {Error} 504 - Database connection error
* @security JWT
*/

router.post("/changePassword", auth, [check("newPassword").notEmpty().isLength({min: 8, max: 16})], authController.changePassword);

module.exports = router