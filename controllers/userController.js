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
// let Queue = require('bull');
// const deleteUserDataQueue =  new Queue('userQueue');
const db = require('../models/index');
let sendEmail = require("../utils/sendgrid.util").sendEmail;
let sendSms = require('../utils/twilio.util');
const Practitioner = require("../class/practitioner");
const PractitionerRole = require("../class/practitionerRole");
let bundleOp = require("../services/bundleOperation");
const { v4: uuidv4 } = require('uuid');
const { createBundle } = require("./manageBundle");
const { addUserLastActiveDetails } = require("./authcontroller");
const {fn, Op, col} = require("sequelize")
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
            console.info(result)
            data.userId = result[0].practitionerId,
            data.userName = result[0].firstName + " " + (result[0].middleName? result[0].middleName + " " : "") + (result[0]?.lastName || '');
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
        await addUserLastActiveDetails(req.token.userId, req.token.orgId)
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
        let mobile = null;
        let email = null;
        let errorMessage = '';
        temptoken = temptoken?.split(" ")[1] || null;
        if (temptoken) {
            jwt.verify(temptoken, secretKey,function (err, decoded) {
                if (err) {
                    if(err.name == 'TokenExpiredError'){ errorMessage = 'Session expired.' }
                    else{ errorMessage = 'Unauthorized' }
                } 
                else {
                    type = decoded?.type;
                    userId =  decoded?.userId;
                    mobile = decoded?.mobile;
                    email = decoded?.email;
                }
            });
        } else { errorMessage = 'No token provided'}

        if(errorMessage){
            return res.status(422).json({ status: 0, message: errorMessage });
        }
        else if((type != "delete") || (req.decoded.userId != userId)){
            return res.status(422).json({ status: 0, message: "Invalid token" });
        }
        
        await axios.put(config.baseUrl+'Practitioner/'+userId, {
            "resourceType": "Practitioner",
            "id": userId,
            "active": false,
            "name": [{"family": '', "given": [mobile || email]} ],
            "telecom": [
              {
                "system": "phone",
                "value": mobile,
                "rank": 1
              },
              {
                "system": "email",
                "value": email
              }
            ]
        });
        // deleteUserDataQueue.add({ userId: req.decoded.userId, orgId: req.decoded.orgId, mobile, email }).then(() => {
        //     return res.json({ status : 1, message: "Your account will be delete within 48 hours, you will get confirmation SMS or email"});
        // });
        if (email) {
            let mailData = {
                to: [{ email: email }],
                    subject: 'Agni : Account Deleted',
                    content: 'Your account has been successfully deleted.'
            }
            await sendEmail(mailData);
        }
            
        if(mobile) {
            let text = `Your Agni account has been successfully deleted.`
            await sendSms(mobile, text);
        }
        return res.json({ status : 1, message: "Your account will be delete within 48 hours, you will get confirmation SMS or email"});
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

const getUsersList = async (req, res, next) => {
    try{
        let resourceResult = []
        const queryData = {
            _revinclude: "PractitionerRole:practitioner",
             "_include:iterate": "PractitionerRole:organization",
            _offset: req?.query?._offset|| 0,
            _count: req?.query?._count| 10,
            _total: "accurate"
        }
        if(req.query._id) {
            queryData._id = req.query._id
        }
        let practitionerBundle = await bundleOp.searchData(config.baseUrl + "Practitioner", queryData);
        console.log(practitionerBundle)
        const entries = practitionerBundle.data.entry || [];
        const total = practitionerBundle.data.total || 0;

        const practitionerEntries = entries.filter(
            (e) => e.resource?.resourceType === "Practitioner"
        );
        const roleEntries = entries.filter(
            (e) => e.resource?.resourceType === "PractitionerRole"
        );

        const orgEntries = entries.filter(
            (e) => e.resource?.resourceType === "Organization"
        );

        // Map orgId -> org name for quick lookup
        const orgNameById = {};
        for (const orgEntry of orgEntries) {
            orgNameById[orgEntry.resource.id] = orgEntry.resource.name;
        }

        const rolesByPractitionerId = {};
        for (const roleEntry of roleEntries) {
            const practitionerRef = roleEntry.resource.practitioner?.reference || "";
            const practitionerId = practitionerRef.split("/")[1];
            if (!practitionerId) continue;

            const orgRef = roleEntry?.resource?.organization?.reference || null;
            const orgId = orgRef?.split("/")[1] || null;

            if (!rolesByPractitionerId[practitionerId]) {
                rolesByPractitionerId[practitionerId] = [];
            }
            rolesByPractitionerId[practitionerId] = { 
                role: roleEntry.resource,
                orgId,
                orgName: orgNameById[orgId] || null
            };
        }

        console.log(rolesByPractitionerId)
        const practitionerIds = practitionerEntries.map((entry) => entry.resource.id);
        const lastActivities = await db.UserLoginActivity.findAll({
            attributes: [
                'userId',
                [fn('MAX', col('createdAt')), 'lastActiveAt']
            ],
            where: {
                userId: { [Op.in]: practitionerIds }
            },
            group: ['userId'],
            raw: true
        });

        const lastActiveByUserId = {};
        for (const activity of lastActivities) {
            lastActiveByUserId[activity.userId] = activity.lastActiveAt;
        }
        const users = practitionerEntries.map((entry) => {
            const practitionerResource = entry.resource;
            const role = rolesByPractitionerId[practitionerResource.id].role || {};
            const email = practitionerResource.telecom.filter(e => e.system == "email")
            const phone = practitionerResource.telecom.filter(e => e.system == "phone")
            return {
                userId: practitionerResource.id,
                firstName: practitionerResource.name?.[0]?.given?.[0] || null,
                middleName: practitionerResource.name?.[0]?.given?.[1] || null,
                lastName: practitionerResource.name?.[0]?.family || null,
                lastActiveAt: lastActiveByUserId[practitionerResource.id] || null,
                roleId: role?.code?.[0]?.coding?.[0]?.code || null,
                roleName: role?.code?.[0]?.text,
                email: email?.[0]?.value || null,  
                mobile: phone?.[0]?.value || null,
                clinicId: rolesByPractitionerId[practitionerResource.id].orgId,
                clinicName: rolesByPractitionerId[practitionerResource.id].orgName
            };
        });
        return res.status(200).json({status: 1,  message: "Users data fetched", data: {total: practitionerBundle.data.total, users}})
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
        let resourceResult = []
        let { firstName, middleName, lastName, mobile, email, role, clinicId } = req.body;
        const [emailCheck, phoneCheck] = await Promise.all([
            email ? bundleOp.searchData(config.baseUrl + "Practitioner", {email: email.toLowerCase(), _total: "accurate"}) : null,
            mobile ? bundleOp.searchData(config.baseUrl + "Practitioner", {phone: mobile, _total: "accurate"}) : null
        ]);

        if (email && emailCheck.data.entry?.length > 0) {
            return res.status(400).json({ status: 0, message: "Email already exists." });
        }
        if (mobile && phoneCheck.data.entry?.length > 0) {
            return res.status(400).json({ status: 0, message: "Phone number already exists." });
        }            
         
        let practitioner = new Practitioner({...req.body, orgId: req.body.clinicId, mobileNumber: mobile, email, active: true}, {});
        practitioner.getJsonToFhirTranslator();
        let practitionerResource = practitioner.getFHIRResource();
        practitionerResource.resourceType = "Practitioner"
        practitionerResource.id = uuidv4();
        console.log("practitionerResource: ", practitionerResource)
        const practitionerBundle = await bundleFun.setBundlePost(practitionerResource, null, practitionerResource.id, "POST", "identifier");  


        const roleData = new PractitionerRole({userUUid: practitionerResource.id, roleId: role, orgId: clinicId }, {});
        roleData.getUserInputToFhir();
        let practitionerRoleResource = roleData.getFHIRResource();
        practitionerRoleResource.id = uuidv4()
        const practitionerRoleBundle = await bundleFun.setBundlePost(practitionerRoleResource, null, practitionerRoleResource.id, "POST", "identifier");  
        resourceResult.push(practitionerBundle, practitionerRoleBundle); 
        let bundle = {
                "resourceType": "Bundle",
                "type": "transaction",
                "entry": resourceResult
        };

        let result = await axios.post(config.baseUrl, bundle);
        console.log("result:", result)
        await addUserLastActiveDetails(req.token.userId, req.token.orgId)
        if (result.status == 200) {   
            console.log(result.data.entry)           
            const practitionerEntry = result.data.entry.find(entry => entry.response.location.startsWith("Practitioner/"));
            const practitionerId = practitionerEntry.response.location.split("/")[1];               
            return res.status(201).json({ status: 1, message: "Data saved successfully.", data: {userId: practitionerId} })
        }
        else {
           return res.status(500).json({
                status: 0,
                message: "Unable to process. Please try again."
            }); 
        }
        
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


const updateUser = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return response.sendInvalidDataError(res, errors);
        }
        let resourceResult = []
        let { firstName, middleName, lastName, mobile, email, role, clinicId } = req.body;
        const userId = req.params.id;      
            
        let existingPractitionerById = await bundleOp.searchData(config.baseUrl + "Practitioner",{ _id: userId });

        if (!existingPractitionerById.data.entry || existingPractitionerById.data.entry.length === 0) {
            return res.status(400).json({ status: 0, message: "User does not exist." });
        }

        const [emailCheck, phoneCheck] = await Promise.all([
            email ? bundleOp.searchData(config.baseUrl + "Practitioner", { email: email.toLowerCase(),_total: "accurate"}) : null,
            mobile ? bundleOp.searchData(config.baseUrl + "Practitioner", { phone: mobile, _total: "accurate" }) : null
        ]);

        if (email) {
            const emailConflict = emailCheck.data.entry?.some((entry) => entry.resource.id !== userId);
            if (emailConflict) {
                return res.status(400).json({ status: 0, message: "Email already exists." });
            }
        }
        if (mobile) {
            const phoneConflict = phoneCheck.data.entry?.some((entry) => entry.resource.id !== userId);
            if (phoneConflict) {
                return res.status(400).json({ status: 0, message: "Mobile number already exists." });
            }
        }

        let existingPractitionerRole = await bundleOp.searchData(config.baseUrl + "PractitionerRole",{ practitioner: userId, _total: "accurate" });
        if (!existingPractitionerRole.data.entry || existingPractitionerRole.data.entry.length === 0) {
            return res.status(400).json({ status: 0, message: "User role does not exist." });
        }


        let practitioner = new Practitioner({...req.body, orgId: req.body.clinicId, mobileNumber: mobile, email, active: true}, {});
        practitioner.getJsonToFhirTranslator();
        let practitionerResource = practitioner.getFHIRResource();
        practitionerResource.resourceType = "Practitioner"
        practitionerResource.id =userId
        console.log("practitionerResource: ", practitionerResource)
        const practitionerBundle = await bundleFun.setBundlePut(practitionerResource, null, userId, "PUT");  


        const roleData = new PractitionerRole({userUUid: practitionerResource.id, roleId: role, orgId: clinicId }, {});
        roleData.getUserInputToFhir();
        let practitionerRoleResource = roleData.getFHIRResource();
        practitionerRoleResource.id = existingPractitionerRole.data.entry[0].resource.id
        practitionerRoleResource.practitioner.reference = "Practitioner/" + userId;
        const practitionerRoleBundle = await bundleFun.setBundlePut(practitionerRoleResource, null, existingPractitionerRole.data.entry[0].resource.id, "PUT");  
        resourceResult.push(practitionerBundle, practitionerRoleBundle); 
        let bundle = {
                "resourceType": "Bundle",
                "type": "transaction",
                "entry": resourceResult
        };

        let result = await axios.post(config.baseUrl, bundle);
        console.log("result:", result)
        await addUserLastActiveDetails(req.token.userId, req.token.orgId)
        if (result.status == 200) {   
            console.log(result.data.entry)           
            const practitionerEntry = result.data.entry.find(entry => entry.response.location.startsWith("Practitioner/"));
            const practitionerId = practitionerEntry.response.location.split("/")[1];               
            return res.status(201).json({ status: 1, message: "Data updated successfully.", data: {userId: practitionerId} })
        }
        else {
           return res.status(500).json({
                status: 0,
                message: "Unable to process. Please try again."
            }); 
        } 
    }
    catch(error) {
        console.info(error)
        return res.status(500).json({
            status: 0,
            message: "Unable to process. Please try again.",
            error: error.message
        });
    }
}


module.exports = {
    getUserProfile,
    getTimestamp,
    updateTimestamp,
    deleteUserData,
    createUser,
    updateUser,
    getUsersList
}