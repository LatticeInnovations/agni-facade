let express = require("express");
let router = express.Router();
let sctController = require("../../controllers/snomedCTController");


/**
 * Get resource list
 * @route GET /v1/sct/medTime
 * @group SNOMEDCT
 * @security JWT
 * @returns {object} 200 - data fetched successfully.
 * @returns {object} 200 - data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */

router.get("/medTime", sctController.getMedTiming); 


/**
 * Get manufacturer list
 * @route GET /v1/sct/manufacturer
 * @group SNOMEDCT
 * @security JWT
 * @returns {object} 200 - data fetched successfully.
 * @returns {object} 200 - data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */

module.exports = router