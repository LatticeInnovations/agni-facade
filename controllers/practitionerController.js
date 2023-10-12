let axios = require("axios");
let resourceFun = require("../services/resourceOperation");
let config = require("../config/nodeConfig");
let bundleController = require("./manageBundle");
const db = require('../models/index');
let emailContent = require("../utils/emailContent");
let util = require('util');
let sendEmail = require("../utils/sendgrid.util").sendEmail;
let bcryptjs = require("bcryptjs");
let { validationResult } = require('express-validator');
let response = require("../utils/responseStatus");
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
                const password = generate_random_password();
                const result = await insertAuthData(responseData[0].fhirId, password);
                if (result.length > 0) {
                    await sendNotification(reqInput[0].email, password);
                    return res.status(201).json({ status: 1, message: "Data saved successfully.", data: responseData })
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
        console.error("the error is here:", e);
        return res.status(500).json({
            status: 0,
            message: "Unable to process. Please try again.",
            error: e.response != null ? e.response.data : null
        })
    }

}

async function sendNotification(email, password) {
    try {
        let mailData = {
            to: [{ email: "tulika@thelattice.in" }],
            subject: util.format(`${(emailContent.find(e => e.notification_type_id == 3).subject)}`,),
            content: util.format(`${(emailContent.find(e => e.notification_type_id == 3).content)}`, email, password)
        }
        await sendEmail(mailData);
    }
    catch (e) {
        console.error(" check if message is sent1111", e);
        return Promise.reject(e);
    }

}

// insert if not present or update generated OTP for the user id
async function insertAuthData(user_id, password) {
    try {
        const salt = bcryptjs.genSaltSync(10);
        const hashedPassword = bcryptjs.hashSync(password, salt);
        let upsertJson = { "user_id": user_id, "password": hashedPassword, "salt": salt };
        console.log(upsertJson)
        let upsertDetail = await db.authentication_detail.upsert(upsertJson, { conflictFields: ["user_id"] });
        return upsertDetail;
    }
    catch (e) {
        return Promise.reject(e);
    }
}

// generate random password having 2 uppercase, 4 random digits, 4 lowercase chanracters and 1 special character
function generate_random_password() {
    let specials = '@$!%*?&#_/';
    let uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let lowercase = 'abcdefghijklmnopqrstuvwxyz';
    let numbers = new Date().getTime().toString();
    let password = '';
    password += generateRandomCharacters(uppercase, 2);
    password += numbers.substr(4, 2)
    password += generateRandomCharacters(lowercase, 4);
    password += generateRandomCharacters(specials, 1);
    return password;
}

function generateRandomCharacters(characters, total) {
    let result = '';
    for (let i = 0; i < total; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}


module.exports = { createPractitioner };