let response = require("../utils/responseStatus");
let axios = require("axios");
let Person = require("../services/person");
let resourceOp = require("../services/resourceOperation");
let config = require("../config/config")
let createBundle = async function (req, res, next) {
    try {
        const resourceType = req.params.resourceType;
        const reqInput = req.body;
        let bundle;
        let fhirResource = {};
        bundle = await resourceOp.getBundleJSON(reqInput, resourceType, fhirResource, "POST");
        // res.status(201).json({ status: 1, message: "Data updated successfully.", data: bundle })
        let response = await axios.post(config.baseUrl, bundle);
        if (bundle.entry.length > 0) {
            if (response.status == 200) {
                let responseData = await resourceOp.getBundleResponse(response.data.entry, bundle.entry, "POST", req.params.resourceType);
                res.status(201).json({ status: 1, message: "Data saved successfully.", data: responseData })
            }
            else {
                return res.status(500).json({
                    status: 0, message: "Unable to process. Please try again.", error: response
                })
            }
        }
        else {
            return res.status(409).json({ status: 0, message: "Data already exists." })
        }

    }
    catch (e) {
        console.log("is the error here:", e)
        if (e.code && e.code == "ERR") {
            return res.status(500).json({
                status: 0,
                message: e.message,
                error: e.response.data
            })
        }
        else {
            return res.status(500).json({
                status: 0,
                message: "Unable to process. Please try again.",
                error: e.response.data
            })
        }

    }

}


let patchBundle = async function (req, res, next) {
    try {
        const resourceType = req.params.resourceType;
        const reqInput = req.body;
        let bundle;
        let fhirResource = [];
        let bundlePatchJSON = await resourceOp.getBundleJSON(reqInput, resourceType, fhirResource, "PATCH");
        bundle = bundlePatchJSON;
        //res.status(201).json({ status: 1, message: "Data updated successfully.", data: bundle })
        let response = await axios.post(config.baseUrl, bundle);
        if (response.status == 200 || response.status == 201) {
            // let responseData = await resourceOp.getBundleResponse(response.data.entry, bundle.entry, "PATCH", req.params.resourceType)
            res.status(201).json({ status: 1, message: "Data updated successfully.", data: null })
        }
        else {
            return res.status(500).json({
                status: 0, message: "Unable to process. Please try again.", error: response
            })
        }

    }
    catch (e) {
        console.log(e)
        if (e.code && e.code == "ERR") {
            return res.status(500).json({
                status: 0,
                message: e.message,
                error: e.response.data
            })
        }
        else {
            console.log(e.response)
            return res.status(500).json({
                status: 0,
                message: "Unable to process. Please try again.",
                error: e.response.data
            })
        }

    }

}


module.exports = { createBundle, patchBundle }