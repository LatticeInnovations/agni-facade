let express = require("express");
let router = express.Router();
let organizationController = require("../../controllers/organizationController")


 
/**
 * Get organization and it's list
 * @route GET /v1/Organization
 * @group resource
 * @security JWT
 * @param {object} params.query - resource Id to get data
 * @param {string} _id.path
 * @returns {object} 200 - resource data fetched successfully.
 * @returns {object} 200 - resource data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */

router.get("/", organizationController.getOrganizationData); 




module.exports = router