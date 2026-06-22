let express = require("express");
let router = express.Router();
let userController = require("../../controllers/userController");
const { check, oneOf } = require("express-validator");


/**
 * Get Users list
 * @route GET /v1/user
 * @group User
 * @security JWT
 * @returns {object} 200 - resource data fetched successfully.
 * @returns {object} 200 - resource data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */

router.get("/", userController.getUsersList); 

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


router.post("/", [
    check("firstName").notEmpty(),
    check("middleName").optional(),
    check("role").notEmpty().isIn(["224608005", "analyst", "23278007"]),
    check("lastName").optional(),
    [oneOf([
        check("email").notEmpty().isEmail().isLength({max: 70}), 
        check("mobile").notEmpty().isNumeric().isLength({min: 10, max: 10})
    ])],
   check("clinicId")
  .if((value, { req }) => req.body.role === "23278007")
  .notEmpty().withMessage("clinicId is required for Community health workers")
  .bail(),
  check("clinicId")
    .if((value, { req }) => req.body.role !== "23278007")
    .optional({ nullable: true }),
], userController.createUser); 


router.put("/:id", [
    check("firstName").notEmpty(),
    check("middleName").optional(),
    check("lastName").optional(),
    check("role").notEmpty().isIn(["224608005", "analyst", "23278007"]),
    [oneOf([
        check("email").notEmpty().isEmail().isLength({max: 70}), 
        check("mobile").notEmpty().isNumeric().isLength({min: 10, max: 10})
    ])],
   check("clinicId")
  .if((value, { req }) => req.body.role === "23278007")
  .notEmpty().withMessage("clinicId is required for Community health workers")
  .bail(),
  check("clinicId")
    .if((value, { req }) => req.body.role !== "23278007")
    .optional({ nullable: true }),
], userController.updateUser); 


module.exports = router;