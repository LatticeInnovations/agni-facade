let axios = require("axios");
let resourceFun = require("../services/resourceOperation");
let config = require("../config/config")
let validate = require("../services/validateRsource").validate;
const { validationResult } = require('express-validator');

let createBundle = async function (req, res, next) {
    try {
        // let data = await validate(req);
        // const errors = validationResult(req);
        // console.log("error is", errors, data)
        // if (!errors.isEmpty()) {
        //     return res.status(422).json({ errors: errors.array() });
            
        // }
        const resourceType = req.params.resourceType;
        const reqInput = req.body;
        let bundle;
        let fhirResource = {};
        bundle = await getBundleJSON(reqInput, resourceType, fhirResource, "POST");
        console.log("bundle", bundle)
       // res.status(201).json({ status: 1, message: "Data updated successfully.", data: bundle })
       let response = await axios.post(config.baseUrl, bundle);
        if (bundle.entry.length > 0) {
            if (response.status == 200) {
                let responseData = await resourceFun.getBundleResponse(response.data.entry, bundle.entry, "POST", req.params.resourceType);
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
        console.log("the error is here:", e)
        if (e.code && e.code == "ERR") {
            return res.status(500).json({
                status: 0,
                message: "Unable to process. Please try again.",
                error: e.response.data != null ? e.response.data : e.response
            })
        }
        else {
            return res.status(500).json({
                status: 0,
                message: "Unable to process. Please try again.",
                error: e.response != null ? e.response.data : null
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
        let bundlePatchJSON = await getBundleJSON(reqInput, resourceType, fhirResource, "PATCH");
        bundle = bundlePatchJSON;
        //res.status(201).json({ status: 1, message: "Data updated successfully.", data: bundle })
        let response = await axios.post(config.baseUrl, bundle);
        if (response.status == 200 || response.status == 201) {
            // let responseData = await resourceFun.getBundleResponse(response.data.entry, bundle.entry, "PATCH", req.params.resourceType)
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
                message: "Unable to process. Please try again.",
                error: e.response.data != null ? e.response.data : e.response
            })
        }
        else {
            return res.status(500).json({
                status: 0,
                message: "Unable to process. Please try again.",
                error: e.response != null ? e.response.data : null
            })
        }

    }

}

let getBundleJSON = async function (reqInput, resourceType, fhirResource, reqMethod) {
    let bundle = {
        "resourceType": "Bundle",
        "type": "transaction",
        "entry": []
    };
    let resourceData = await resourceFun.getResource(resourceType, reqInput, fhirResource, reqMethod, null);
    bundle.entry = resourceData;
    return bundle;
}


module.exports = { createBundle, patchBundle }