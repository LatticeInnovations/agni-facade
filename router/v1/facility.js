let express = require("express");
let router = express.Router();
let { check } = require("express-validator");
let facilityController = require("../../controllers/manageFacility");

router.post("/", [
    check("name").notEmpty().withMessage("Name is required"),
    check("district_id").notEmpty().withMessage("District is required"),
    check("location_type").isIn(["google_maps_url", "manual"]).withMessage("Location type must be 'google_maps_url' or 'manual'"),
    check("google_maps_url").if(check("location_type").equals("google_maps_url")).notEmpty().withMessage("Google Maps URL is required when location type is google_maps_url"),
    check("latitude").if(check("location_type").equals("manual")).notEmpty().isFloat().withMessage("Latitude is required and must be a number"),
    check("longitude").if(check("location_type").equals("manual")).notEmpty().isFloat().withMessage("Longitude is required and must be a number"),
    check("block").optional(),
    check("block_code").optional(),
    check("state_code").optional()
], facilityController.createFacility);

router.get("/", facilityController.listFacilities);

module.exports = router;
