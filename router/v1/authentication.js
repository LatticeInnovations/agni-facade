let express = require("express");
const router = express.Router();
const authController = require("../../controllers/authcontroller");
const { check, oneOf } = require('express-validator');
const auth = require("../../middleware/checkAuth");

/**
 * @typedef passwordLogin
 * @property {string} userContact.required User mobile number or email address - eg: tulika@thelattice.in
 * @property {string} password.required password - eg: Lattice@123
 */

/**
 * Login 
 * @route POST /v1/auth/login
 * @group Authentication
 * @param {passwordLogin.model} login.body.required
 * @returns {object} 201 - User data created successfully.
 * @returns {object} 200 - User data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */

router.post("/login", [oneOf([
    check("userContact").notEmpty().isEmail().isLength({max: 70}), check("userContact").notEmpty().isNumeric().isLength({min: 10, max: 10})
]), check("password").notEmpty().isLength({min: 8, max: 16})], authController.login);

/**
 * @typedef forgotPassword
 * @property {string} userContact.required User mobile number or email address - eg: tulika@thelattice.in
 */

/**
 * Forgot password 
 * @route POST /v1/auth/forgot
 * @group Authentication
 * @param {forgotPassword.model} forgotPassword.body.required
 * @returns {object} 201 - User data created successfully.
 * @returns {object} 200 - User data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */

router.post("/forgot", [oneOf([
    check("userContact").notEmpty().isEmail().isLength({max: 70}), check("userContact").notEmpty().isNumeric().isLength({min: 10, max: 10})
])], authController.forgotPassword);


/**
* @typedef SetPassword
* @property {string} userContact.required User mobile number or email address - eg: tulika@thelattice.in
* @property {string} newPassword password for web otherwise this will be left blank - eg: Lattice@123
* @property {string} otp.required 6 digits OTP received via sms or email - eg: 111111
*/

/**
 * ResetPassword 
 * @route POST /v1/auth/setPassword
 * @group Authentication
 * @param {SetPassword.model} setPassword.body.required
 * @returns {object} 201 - User data created successfully.
 * @returns {object} 200 - User data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */

router.post("/setPassword", [oneOf([
    check("userContact").notEmpty().isEmail().isLength({max: 70}), check("userContact").notEmpty().isNumeric().isLength({min: 10, max: 10})
]), check("newPassword").notEmpty().isLength({min: 8, max: 16}), check("otp").notEmpty().isLength({min: 6, max: 6})], authController.setPassword);


/**
* @typedef SetOTP
* @property {string} userContact.required User mobile number or email address - eg: tulika@thelattice.in
* @property {string} otp.required 6 digits OTP received via sms or email - eg: 111111
*/

/**
 * verifyOTP  for APP
 * @route POST /v1/auth/otp
 * @group Authentication
 * @param {SetOTP.model} setOTP.body.required
 * @returns {object} 201 - User data created successfully.
 * @returns {object} 200 - User data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */


router.post("/otp", [oneOf([
    check("userContact").notEmpty().isEmail().isLength({max: 70}), check("userContact").notEmpty().isNumeric().isLength({min: 10, max: 10})
]), check("otp").notEmpty().isLength({min: 6, max: 6})], authController.setPassword);


/**
* @typedef ChangePassword
* @property {string} newPassword.required 6 digits OTP received via sms or email - eg; 000000
*/

/**
* ChangePassword 
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