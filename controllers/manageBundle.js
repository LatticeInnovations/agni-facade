let axios = require("axios");
let resourceFun = require("../services/resourceOperation");
let config = require("../config/nodeConfig");
let resourceValid = require("../utils/Validator/validateRsource").resourceValidation;
let createBundle = async function (req, res) {
    try {
        let token = req.token;
        let response = resourceValid(req.params);
        if (response.error) {
            console.error(response.error.details)
            let errData = { status: 0, response: { data: response.error.details }, message: "Invalid input" }
            return res.status(422).json(errData);
        }
        const resourceType = req.params.resourceType;
        const reqInput = req.body;
        let bundle;
        let fhirResource = {};

        let resourceData = await getBundleJSON(reqInput, resourceType, fhirResource, "POST", token);
            bundle = resourceData.bundle;
      //return res.status(201).json({ status: 1, message: "Data updated", data: resourceData })     
        if (bundle.entry.length > 0) {
            let response = await axios.post(config.baseUrl, bundle);
            if (response.status == 200) {
                let responseData = await resourceFun.getBundleResponse(response.data.entry, bundle.entry, "POST", req.params.resourceType);
                responseData = [...responseData, ...resourceData.errData];
                res.status(201).json({ status: 1, message: "Data saved successfully.", data: responseData })
            }
            else {
                return res.status(500).json({
                    status: 0, message: "Unable to process. Please try again.", error: response
                })
            }
        }
        else if(resourceData.errData.length > 0) {
            return res.status(201).json({ status: 1, message: "Data saved successfully.", data: resourceData.errData })
        }
        else {
            return res.status(409).json({ status: 0, message: "Data already exists." })
        }

    }
    catch (e) {
        console.error("the error is here:", e);
        if (e.code && e.code == "ERR") {
            return res.status(e.statusCode).json({
                status: 0,
                message: e.message == null ? "Unable to process. Please try again." : e.message,
                error: e.response != null ? e.response.data : null
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


let patchBundle = async function (req, res) {
    try {
        let token = req.token;
        let response = resourceValid(req.params);
        if (response.error) {
            console.error(response.error.details)
            let errData = { status: 0, response: { data: response.error.details }, message: "Invalid input" }
            return res.status(422).json(errData);
        }
        const resourceType = req.params.resourceType;
        const reqInput = req.body;
        let bundle;
        let fhirResource = [];
        let bundlePatchJSON = await getBundleJSON(reqInput, resourceType, fhirResource, "PATCH", token);
        bundle = bundlePatchJSON.bundle;
        //res.status(201).json({ status: 1, message: "Data updated successfully.", data: bundle })
        if (bundle.entry.length > 0) {
        let response = await axios.post(config.baseUrl, bundle);
            if (response.status == 200 || response.status == 201) {            
                let responseData = await resourceFun.getBundleResponse(response.data.entry, bundle.entry, "PATCH", req.params.resourceType);
                responseData = [...responseData, ...bundlePatchJSON.errData]
                return res.status(201).json({ status: 1, message: "Data updated successfully.", data: responseData })
            }
            else {
                return res.status(500).json({
                    status: 0, message: "Unable to process. Please try again.", error: response
                })
            }
        }
        else if(bundlePatchJSON.errData.length > 0) {
            res.status(201).json({ status: 1, message: "Data updated successfully.", data: bundlePatchJSON.errData })
        }
        else {
            return res.status(500).json({
                status: 0, message: "Unable to process. Please try again.", error: {response: {data: bundlePatchJSON.errData}}
            })
        }

    }
    catch (e) {
        console.error(e)
        if (e.code && e.code == "ERR") {
            return res.status(500).json({
                status: 0,
                message: e.message == null ? "Unable to process. Please try again." : e.message,
                error: e.response != null ? e.response.data : null
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

let getBundleJSON = async function (reqInput, resourceType, fhirResource, reqMethod, token) {
    let bundle = {
        "resourceType": "Bundle",
        "type": "transaction",
        "entry": []
    };
    let errData = [] ;
    let resourceData = await resourceFun.getResource(resourceType, reqInput, fhirResource, reqMethod, null, token);
    console.info(resourceData)
        bundle.entry = resourceData.resourceResult
        errData = resourceData.errData
    return {bundle, errData};
}


module.exports = { createBundle, patchBundle }