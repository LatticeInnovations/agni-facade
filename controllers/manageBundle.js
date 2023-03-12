let response = require("../utils/responseStatus");
let axios = require("axios");
let Person = require("../services/person");
let resourceOp = require("../services/resourceOperation");
let config = require("../config/config")
let createBundle = async function (req, res, next) {
    try {
        resourceType = req.params.resourceType;
        let bundle = {
            "resourceType": "Bundle",
            "type": "transaction",
            "entry": []
        }
        let reqInput = req.body;
        for (let element of reqInput) {
            let resourceData = await resourceOp.getResource(req.params.resourceType, element, {}, "POST", null, 1);
            bundle.entry = bundle.entry.concat(resourceData)
        };
        // res.status(201).json({ status: 1, message: "Data updated successfully.", data: bundle })
        let response = await axios.post(config.baseUrl, bundle);
        if (response.status == 200) {
            let responseData = await resourceOp.getBundleResponse(response.data.entry, bundle.entry, "POST", req.params.resourceType);
            res.status(201).json({ status: 1, message: "Data saved successfully.", data: responseData })
        }
        else {
            return Promise.reject({ status: 0, code: "ERR", e: response })
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
        resourceType = req.params.resourceType;
        let reqInput = req.body;
        let bundle = {
            "resourceType": "Bundle",
            "type": "batch",
            "entry": []
        }
        for (let element of reqInput) {
            resourceType = req.params.resourceType;
            let link = config.baseUrl + resourceType;
            let resourceSavedData = await resourceOp.searchData(link, { "_id": element.id });
            let resourceData = await resourceOp.getResource(req.params.resourceType, element, [], req.method, resourceSavedData.data.entry[0].resource);
            let bundlePatchJSON = await resourceOp.setBundlePatch(resourceData, req.params.resourceType, element.id)
            bundle.entry = bundle.entry.concat(bundlePatchJSON);
        };
       console.log("check where it starts from: ", bundle)
       let response = await axios.post(config.baseUrl, bundle);
        if (response.status == 200 || response.status == 201) {
            
            let responseData = await resourceOp.getBundleResponse(response.data.entry, bundle.entry,"PATCH", req.params.resourceType)
            res.status(201).json({ status: 1, message: "Data updated successfully.", data: responseData })
        }
        else {
            return Promise.reject({ status: 0, code: "ERR", data: response })
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