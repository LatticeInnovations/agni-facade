let express = require("express");
let router = express.Router();
let resourceController = require("../../controllers/manageResource");

/**
 * @typedef resource
 * @property {Array} identfier - resource Identifier
 * @property {boolean} active  - resource is active or not
 */

/**
 * Create a resource
 * @route POST /v1/{resourceType}
 * @group resource
 * @param {resource.model} resource.body.required
 * @param {string} resourceType.path.required
 * @returns {object} 201 - User data created successfully.
 * @returns {object} 200 - User data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */

router.post("/:resourceType", resourceController.createResource);   


/**
 * Delete a resource
 * @route DELETE /v1/{resourceType}/{id}
 * @group resource
 * @param {string} id.path.required - resource Id to be deleted
 * @param {string} resourceType.path.required
 * @returns {object} 200 - User data deleted successfully.
 * @returns {object} 200 - User data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */

router.delete("/:resourceType/:id", resourceController.deleteResource);  


/**
 * Update a resource
 * @route PUT /v1/{resourceType}/{id}
 * @group resource
 * @param {resource.model} resource.body.required
 * @param {string} id.path.required - resource Id to be updated
 * @param {string} resourceType.path.required
 * @returns {object} 201 - User data created successfully.
 * @returns {object} 200 - User data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */

router.put("/:resourceType/:id", resourceController.updateResource);   

/**
 * Patch a resource values
 * @route PATCH /v1/{resourceType}/{id}
 * @group resource
 * @param {resource.model} resource.body.required
 * @param {string} id.path.required - resource Id to be updated
 * @param {string} resourceType.path.required
 * @returns {object} 201 - User data created successfully.
 * @returns {object} 200 - User data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */

router.patch("/:resourceType/:id", resourceController.patchResource);  


/**
 * Get resource list
 * @route GET /v1/{resourceType}
 * @group resource
 * @param {object} params.query - resource Id to get data
 * @param {string} resourceType.path.required
 * @param {string} id.path
 * @returns {object} 200 - resource data fetched successfully.
 * @returns {object} 200 - resource data not found.
 * @returns {Error} 401 - You are unauthorized to perform this operation.
 * @returns {Error} 500 - Unable to process
 * @returns {Error} 504 - Database connection error
 */

router.get("/:resourceType", resourceController.searchResourceData); 



module.exports = router