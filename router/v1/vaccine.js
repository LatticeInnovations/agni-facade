let express = require("express");
let router = express.Router();
let vaccineController = require("../../controllers/vaccineController");

/**
 * Get vaccine list
 * @route GET /v1/vaccine/manufacturer
 * @group Vaccine
 * @security JWT
 * @returns {object} 200 - data fetched.
 * @returns {object} 200 - data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */

router.get("/manufacturer", vaccineController.getManufacturer); 

module.exports = router
