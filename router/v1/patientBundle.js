let express = require("express");
let router = express.Router();
let bundleController = require("../../controllers/manageBundle")
/**
 * @typedef resource
 * @property {Array} identfier - resource Identifier
 * @property {boolean} active  - resource is active or not
 */

/**
 * Patient multiple resources
 * @route POST /v1/sync/{resourceType}
 * @group Bundle
 * @security JWT
 * @param {Array.<resource>} resourceList.body.required
 * @param {string} resourceType.path.required
 * @returns {object} 201 - User data created successfully.
 * @returns {object} 200 - User data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */

router.post("/:resourceType",  bundleController.createBundle);


/**
 * Patch a resource values
 * @route PATCH /v1/sync/{resourceType}
 * @group Bundle
 * @security JWT
 * @param {Array.<resource>} resource.body.required
 * @param {string} id.path.required - resource Id to be updated
 * @param {string} resourceType.path.required
 * @returns {object} 201 - User data created successfully.
 * @returns {object} 200 - User data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */

router.patch("/:resourceType", bundleController.patchBundle);


// /**
//  * Delete a resource
//  * @route DELETE /v1/{resourceType}/{id}
//  * @group resource
//  * @security JWT
//  * @param {string} id.path.required - resource Id to be deleted
//  * @param {string} resourceType.path.required
//  * @returns {object} 200 - User data deleted successfully.
//  * @returns {object} 200 - User data not found.
//  * @returns {Error} 401 - You are unauthorized to perform this operation.
//  * @returns {Error} 500 - Unable to process
//  * @returns {Error} 504 - Database connection error
//  */

router.delete("/:resourceType", bundleController.deleteBundle);  



module.exports = router