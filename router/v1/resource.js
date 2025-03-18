let express = require("express");
let router = express.Router();
let resourceController = require("../../controllers/manageResource");




/**
 * Get resource list
 * @route GET /v1/{resourceType}
 * @group resource
 * @security JWT
 * @param {object} params.query - resource Id to get data
 * @param {string} resourceType.path.required
 * @param {string} id.path
 * @returns {object} 200 - resource data fetched successfully.
 * @returns {object} 200 - resource data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */

router.get("/old/:resourceType", resourceController.searchResourceData); 





module.exports = router