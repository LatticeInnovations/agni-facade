let express = require("express");
let router = express.Router();
let userController = require("../../controllers/userController");
const { check, oneOf } = require("express-validator");

router.post("/", [
    check("firstName").notEmpty(),
    check("lastName").optional(),
    [oneOf([
        check("email").notEmpty().isEmail().isLength({max: 70}), 
        check("mobile").notEmpty().isNumeric().isLength({min: 10, max: 10})
    ])],
    check("clinicName").notEmpty(),
], userController.createUser); 


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

/**
 * Delete user details
 * @route DELETE /v1/user
 * @group User
 * @security JWT
 * @returns {object} 200 - resource data fetched successfully.
 * @returns {object} 200 - resource data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */


router.delete("/", userController.deleteUserData);


/**
 * Create user details
 * @route POST /v1/user
 * @group User
 * @security JWT
 * @returns {object} 200 - resource data fetched successfully.
 * @returns {object} 200 - resource data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */

module.exports = router