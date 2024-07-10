let manageResource = require("./manageResource");
let bundleFun = require("../services/bundleOperation");
let resourceFunc = require("../services/resourceOperation");
let model = require('../models/index');
let { validationResult } = require('express-validator');
let response = require("../utils/responseStatus");
let resourceValid = require("../utils/Validator/validateRsource").validTimestamp;
const axios = require('axios');
const config = require("../config/nodeConfig");
let jwt = require("jsonwebtoken");
let secretKey = require('../config/nodeConfig').jwtSecretKey;
let Queue = require('bull');
const deleteUserDataQueue =  new Queue('userQueue');
// { redis: {port: '6379', host: 'localhost'}}
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
        let token = req.token;
        let timestamp = await model.userTimeMap.findAll({ attributes: ['uuid', 'timestamp'], where : { orgId : token.orgId }});
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
        let token = req.token;
        let data = req.body;
        let response = resourceValid(data);
        if (response.error) {
            console.error(response.error.details)
            let errData = { status: 0, response: { data: response.error.details }, message: "Invalid input" }
            return res.status(422).json(errData);
        }
        data = data.map((d) => {
            d.orgId = token.orgId;
            return d;
        });      
        await model.userTimeMap.bulkCreate(data, { updateOnDuplicate: [ 'timestamp', 'orgId' ] });
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

const deleteUserData = async (req, res, next) => {
    try{
        let {temptoken} = req.headers;
        let type = null;
        let userId = null;
        let errorMessage = '';
        if (temptoken) {
            jwt.verify(temptoken, secretKey,function (err, decoded) {
                if (err) {
                    if(err.name == 'TokenExpiredError'){ errorMessage = 'Session expired.' }
                    else{ errorMessage = 'Unauthorized' }
                } 
                else {
                    type = decoded?.type;
                    userId =  decoded?.userId;
                }
            });
        } else { errorMessage = 'No token provided'}

        if(errorMessage){
            return res.status(422).json({ status: 0, message: errorMessage });
        }
        else if((type != "delete") || (req.decoded.userId != userId)){
            return res.status(422).json({ status: 0, message: "Invalid token" });
        }
        
        deleteUserDataQueue.add({ userId: req.decoded.userId, orgId: req.decoded.orgId }).then(() => {
            return res.json({ status : 1, message: "Your account will be delete within 48 hours, you will get confirmation SMS or email"});
        });
    }
    catch(e){
        console.info(e)
        return res.status(500).json({
            status: 0,
            message: "Unable to process. Please try again.",
            error: e
        });
    }
}

const createUser = async (req, res, next) => {
    try{
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return response.sendInvalidDataError(res, errors);
        }
        let { firstName, lastName, mobile, email, clinicName } = req.body;
        let { type } = req.token;
        if(type != "register"){
            return res.status(401).json({ status: 0, message: "Invalid Token" });
        }
        const organization = {
            "resourceType": "Organization",
            "active": true,
            "type": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/organization-type","code": "prov","display": "Private Hospital"}]}],
            "name": clinicName,
            "telecom": [{"system": "phone","value": mobile},{"system": "email","value": email}],
        }
        let practitioner = {
            "resourceType": "Practitioner",
            "identifier": [{"system": "https://www.passportindia.gov.in", "value": mobile + firstName}],
            "active": true,
            "name": [{"family": lastName || '', "given": [firstName]} ],
            "telecom": [{"system": "phone","value": mobile,"rank": 1},{"system": "email","value": email || ''}]
        }
        let response = await axios.post(config.baseUrl+'Organization', organization);
        let orgId = null;
        let userId = null;
        if(response.status == 201){
            orgId = response.data.id;
        }
        response = await axios.post(config.baseUrl+'Practitioner', practitioner);
        if(response.status == 201){
            userId = response.data.id;
        }

        let practitionerRole = {
            "resourceType": "PractitionerRole",
            "practitioner": { "reference": `Practitioner/${userId}`},
            "organization": { "reference": `Organization/${orgId}`},
            "code": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/practitioner-role","code": "doctor"}]}]
        }
        let location = { "resourceType": "Location", "status": "active", "name": clinicName,
            "position": { "longitude": 28.537, "latitude": 77.383 },
            "managingOrganization": { "reference": `Organization/${orgId}`}
        }
        response = await axios.post(config.baseUrl+'PractitionerRole', practitionerRole);
        response = await axios.post(config.baseUrl+'Location', location);
        let userProfile = {
            "userId": userId, "userName": firstName + ' ' + lastName,
            "orgId": orgId
        }
        let token = jwt.sign(userProfile, config.jwtSecretKey, { expiresIn: '5d' });
        res.json({ status : 1, message : "Registration successfull", data: { token : 'Bearer ' + token } });
    }
    catch(e){
        console.info(e)
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
    updateTimestamp,
    deleteUserData,
    createUser
}