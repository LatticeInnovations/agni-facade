let express = require("express");
let router = express.Router();
let practitionerController = require("../../controllers/practitionerController");
let { check } = require('express-validator');

/**
 * @typedef Address
 * @property {string} addressLine1.required User Address - eg: Civil lines
 * @property {string} district district - eg: South west delhi
 * @property {string} city.required city - eg: New Delhi
 * @property {string} state.required state - eg: Delhi
 * @property {string} country.required country - eg: India
 */

/**
 * @typedef Identifier
 * @property {string} identifierType.required Type of identifier as uri - eg: https://www.passportindia.gov.in
 * @property {string} identifierNumber.required Identifier number - eg: 8484790987890
 */

/**
 * @typedef Role
 * @property {string} orgId.required Organization Id - eg: 22344
 * @property {string} roleId.required Role id - eg: doctor
 */
/**
 * @typedef Practitioner
 * @property {string} firstName.required User first name - eg: Anita
 * @property {string} lastName.required User last name - eg: Shukla
 * @property {Array.<Identifier>} identifier.required 
 * @property {string} gender.required Gender - eg: male
 * @property {string} birthDate.required Gender - eg: 1997-12-11
 * @property {Address.model} address.required
 * @property {string} email.required Email - eg: tulika@thelattice.in
 * @property {string} mobileNumber Mobile number - eg: 9898778998
 * @property {Array.<Role>} role.required
 */




/**
 * Practitioner 
 * @route POST /v1/Practitioner
 * @group Practitioner
 * @param {Practitioner.model} practitioner.body.required
 * @returns {object} 201 - User data created .
 * @returns {object} 200 - User data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 * @security JWT
 */

router.post("/", 
[
    check('firstName').notEmpty().isAlpha().isLength({min: 3, max: 30}), 
    check('lastName').notEmpty().isAlpha().isLength({min: 3, max: 30}),
    check('identifier').isArray().notEmpty(), 
        check("identifier.*.identifierType").notEmpty(),  
        check("identifier.*.identifierNumber").notEmpty(),
    check("gender").notEmpty().isIn('male', 'female', 'other', 'unknown'), 
    check('birthDate').notEmpty().isDate(),
    check("address").isObject().notEmpty(), 
        check("address.addressLine1").notEmpty().isLength({min: 3, max: 100}), 
        check("address.city").notEmpty().isLength({min: 2, max: 50}), 
        check("address.district").isLength({min: 2, max: 50}), 
        check("address.state").isLength({min: 2, max: 50}), 
        check("address.country").isAlpha().isLength({min: 2, max: 50}),
    check("email").isEmail().notEmpty(), check("mobileNumber").isNumeric().notEmpty().isLength({min: 10, max: 10}),
    check("role").isArray().notEmpty(), 
        check("role.*.roleId").notEmpty().isIn("doctor", "nurse", "ict", "397897005"), 
        check("role.*.orgId").notEmpty().isNumeric()
],  
practitionerController.createPractitioner);


/**
 * Get Practitioner detail
 * @route GET /v1/Practitioner/{id}
 * @group Practitioner
 * @security JWT
 * @returns {object} 200 - resource data fetched successfully.
 * @returns {object} 200 - resource data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */

router.get("/:id", practitionerController.getUserProfile); 

module.exports = router