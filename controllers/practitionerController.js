let axios = require("axios");
let resourceFun = require("../services/resourceOperation");
let config = require("../config/nodeConfig");
let bundleController = require("./manageBundle");
const db = require('../models/index');
let { validationResult } = require('express-validator');
let response = require("../utils/responseStatus");
let manageResource = require("./manageResource");
let bundleFun = require("../services/bundleOperation");

let createPractitioner = async function (req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return response.sendInvalidDataError(res, errors);
        }
        req.params.resourceType = "Practitioner";
        let bundle;
        const resourceType = req.params.resourceType;
        const reqInput = [req.body];
        let fhirResource = {};
        let resourceData = await bundleController.getBundleJSON(req.token, reqInput, resourceType, fhirResource, "POST");
        bundle = resourceData.bundle;
        console.log(bundle);
        if (bundle.entry.length > 0) {
            let response = await axios.post(config.baseUrl, bundle, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `${req.token}`
                }
            });
            if (response.status == 200) {
                let responseData = await resourceFun.getBundleResponse(response.data.entry, bundle.entry, "POST", resourceType);
                responseData = [...responseData, ...resourceData.errData];
                const result = await insertAuthData(responseData[0].fhirId);
                if (result.length > 0) {
                    return res.status(201).json({ status: 1, message: "Data saved.", data: responseData })
                }
            }
            else {
                return res.status(500).json({
                    status: 0, message: "Unable to process. Please try again.", error: response, data: bundle
                })
            }
        }
        else if (resourceData.errData.length > 0) {
            return res.status(201).json({ status: 1, message: "Data saved.", data: resourceData.errData })
        }
        else {
            return res.status(409).json({ status: 0, message: "Data already exists." })
        }
    }
    catch (e) {        

        if(e.response && e.response.statusText) {
            e.statusCode = e.response.status
            e.message = e.response.statusText
            e.code = "ERR"
        }
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



// insert if not present or update generated OTP for the user id
async function insertAuthData(user_id) {
    try {
        let upsertJson = { "user_id": user_id };
        let upsertDetail = await db.authentication_detail.upsert(upsertJson, { conflictFields: ["user_id"] });
        return upsertDetail;
    }
    catch (e) {
        return Promise.reject(e);
    }
}




// Get user profile
let getUserProfile = async function (req, res) {
    try {
        let resourceType = "PractitionerRole";
        req.params.resourceType = resourceType;
        req.query = {practitionerId: req.params.id};
        let resourceUrl = await manageResource.getResourceUrl(resourceType, req.query);
        let responseData = await bundleFun.searchData(req.token,resourceUrl.link, resourceUrl.reqQuery);
        let result = [];
        let data = {};
        if( !responseData.data.entry || responseData.data.total == 0) {
            return res.status(200).json({ status: 1, message: "Profile detail fetched", total: 0, data: data})
        }
        else {
            let res_data = await resourceFun.getResource(req.token ,resourceType, {}, responseData.data.entry, req.method, null, 0);
            result = result.concat(res_data);
            result = result[0].resourceResult;
            data.userId = result[0].practitionerId,
            data.userName = result[0].firstName + " " + (result[0].middleName? result[0].middleName + " " : "") + result[0].lastName;
            data.mobileNumber = result[0].mobileNumber;
            data.userEmail = result[0].email;
            data.address = result[0].address;
            data.role = result[0].role;
            console.info(data)
            res.status(200).json({ status: 1, message: "Profile detail fetched", total: 1, data: data  })
        }
    }
    catch (e) {
        console.error(e);
        if (e.code && e.code == "ERR") {
            let statusCode = e.statusCode ? e.statusCode : 500;
            return res.status(statusCode).json({
                status: 0,
                message: e.message
            })
        }
        return res.status(500).json({
            status: 0,
            message: "Unable to process. Please try again.",
            error: e
        })
    }

}



module.exports = { createPractitioner , getUserProfile};