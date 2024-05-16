let manageResource = require("./manageResource");
let bundleFun = require("../services/bundleOperation");
let resourceFunc = require("../services/resourceOperation");
let model = require('../models/index');
let { validationResult } = require('express-validator');
let response = require("../utils/responseStatus");
let resourceValid = require("../utils/Validator/validateRsource").validTimestamp;
// Get user profile
let getUserProfile = async function (req, res, next) {
    try {
        let resourceType = "PractitionerRole";
        req.params.resourceType = resourceType;
        req.query = {practitionerId: req.decoded.userId};
        let resouceUrl = await manageResource.getResourceUrl(resourceType, req.query);
        let responseData = await bundleFun.searchData(resouceUrl.link, resouceUrl.reqQuery);
        let result = [];
        let data = {};
        if( !responseData.data.entry || responseData.data.total == 0) {
            return res.status(200).json({ status: 1, message: "Profile detail fetched", total: 0, data: data})
        }
        else {
            let res_data = await resourceFunc.getResource(resourceType, {}, responseData.data.entry, req.method, null, 0);
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

const getTimestamp = async (req, res, next) => {
    try{
        let timestamp = await model.userTimeMap.findAll({ attributes: ['uuid', 'timestamp']});
        res.json({ status: 1, message: "timestamp fetched", data : timestamp });
    }
    catch(e){
        return res.status(500).json({
            status: 0,
            message: "Unable to process. Please try again.",
            error: e
        });
    }
} 

const updateTimestamp = async (req, res, next) => {
    try{
        let data = req.body;
        let response = resourceValid(data);
        if (response.error) {
            console.error(response.error.details)
            let errData = { status: 0, response: { data: response.error.details }, message: "Invalid input" }
            return res.status(422).json(errData);
        }      
        await model.userTimeMap.bulkCreate(data, { updateOnDuplicate: [ 'timestamp' ] });
        res.json({ status: 1, message: "timestamp updated", data });
    }
    catch(e){
        return res.status(500).json({
            status: 0,
            message: "Unable to process. Please try again.",
            error: e
        });
    }
}


module.exports = {
    getUserProfile,
    getTimestamp,
    updateTimestamp
}