let express = require("express");
let router = express.Router();
let addressController = require("../../controllers/addressController");

/**
 * @typedef Province
 * @property {Array} province 
 */

/**
 * getting all the province list
 * @route GET /v1/address/province
 * @group Address
 * @security JWT
 * @returns {object} 200 - Data fetched.
 * @returns {Error} 401 -Unauthorized
 * @returns {Error} 500 - Unable to process
 */

router.get("/province",  addressController.getProvince);


/**
 * @typedef AreaCouncil
 * @property {Array} areaCouncil
 */

/**
 * getting all the area council list
 * @route GET /v1/address/areaCouncil
 * @group Address
 * @security JWT
 * @returns {object} 200 - Data fetched.
 * @returns {Error} 401 -Unauthorized
 * @returns {Error} 500 - Unable to process
 */

router.get("/areaCouncil",  addressController.getAreaCouncil);

/**
 * @typedef Island
 * @property {Array} island
 */

/**
 * getting all islands list
 * @route GET /v1/address/island
 * @group Address
 * @security JWT
 * @returns {object} 200 - Data fetched.
 * @returns {Error} 401 -Unauthorized
 * @returns {Error} 500 - Unable to process
 */

router.get("/island",  addressController.getIsland);


/**
 * @typedef AddressMap
 * @property {Array} addressMap
 */

/**
 * getting all islands list
 * @route GET /v1/address/map
 * @group Address
 * @security JWT
 * @returns {object} 200 - Data fetched.
 * @returns {Error} 401 -Unauthorized
 * @returns {Error} 500 - Unable to process
 */

router.get("/map",  addressController.getAddressMapper);


module.exports = router