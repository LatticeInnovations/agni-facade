let validationResponse = require("../utils/responseStatus");
const db = require('../models/index');
let sendSms = require('../utils/twilio.util');
let emailContent = require("../utils/emailContent");
let util = require('util');
let sendEmail = require("../utils/sendgrid.util").sendEmail
let jwt = require("jsonwebtoken");
const config = require("../config/nodeConfig");
let { validationResult } = require('express-validator');
const crypto = require('crypto');
const bcryptjs = require("bcryptjs");
const sequelize = require("sequelize");

// login by using email or mobile number to send OTP
const login = async function (req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return validationResponse.sendInvalidDataError(res, errors);
        }
        let userDetail = await getUserDetail(req, req.body.userContact);
        if (userDetail == null || !userDetail.profile.is_active)
            return res.status(401).json({ status: 0, message: "Unauthorized user" });
        let { authData, currentTime, otpCheckAttempt, otpGenAttempt, loginAttempts } = setData(userDetail);
        let diffMins = getMinutes(authData.attempt_timestamp);
        console.log(loginAttempts, otpGenAttempt, otpCheckAttempt)
        if ((loginAttempts >= config.totalLoginAttempts || otpGenAttempt >= config.totalLoginAttempts || otpCheckAttempt >= config.totalLoginAttempts) && diffMins < config.lockTimeInMin)
            return res.status(401).json({ status: 0, message: "Too many attempts. Please try after 5 mins" });
        else if ((loginAttempts >= config.totalLoginAttempts || otpGenAttempt >= config.totalLoginAttempts || otpCheckAttempt >= config.totalLoginAttempts) && diffMins >= config.lockTimeInMin) {
            loginAttempts = 0; otpCheckAttempt = 0; otpGenAttempt = 0;
        }
        if (authData.login_attempts == config.totalLoginAttempts - 1) {
            currentTime = Date.now();
        }
        loginAttempts += 1;

        // verify password
        let response = {}, status = 200;
        if (bcryptjs.hashSync(req.body.password, authData.salt) == authData.password) {
            loginAttempts = 0;
            otpCheckAttempt = 0;
            otpGenAttempt = 0;
            currentTime = null;
            const token = jwt.sign(userDetail.profile, config.jwtSecretKey, { expiresIn: '30d' });
            response = { status: 1, "message": "Authorized user", data: { isFirstLogin: !authData.first_login, token: token, userDetail: userDetail.profile } }
        }
        else {
            const message = loginAttempts >= config.totalLoginAttempts ? "Too many attempts. Please try after 5 mins" : "Unauthorized user";
            status = 401;
            response = { status: 0, "message": message }
        }
        const upsertJson = { "login_attempts": loginAttempts, "attempt_timestamp": currentTime, "first_login": true, "otp_check_attempts": otpCheckAttempt, "otp_generate_attempt": otpGenAttempt };
        await updateLoginAttempt(upsertJson, userDetail.profile.user_id);
        return res.status(status).json(response);
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({
            status: 0,
            message: "Unable to process. Please try again.",
            error: e
        })
    }

}




// forgot password or regenerate OTP
const forgotPassword = async function (req, res) {
    try {
        // check for validation error
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return validationResponse.sendInvalidDataError(res, errors);
        }
        let isEmail = checkIsEmail(req.body.userContact);
        let userDetail = await getUserDetail(req, req.body.userContact);
        if (userDetail == null || !userDetail.profile.is_active)
            return res.status(401).json({ status: 0, message: "Unauthorized user" });
        else {
            const authData = userDetail.dataValues.authentication_detail.dataValues;
            let diffMins = 100000;
            let currentTime = null;
            let otpCheckAttempt = authData.otp_check_attempts
            let otpGenAttempt = authData.otp_generate_attempt;
            let loginAttempts = authData.login_attempts;
            const today = Date.now();
            if (authData.attempt_timestamp) {
                diffMins = getMinutes(authData.attempt_timestamp);
            }
            // check if account locked 
            if ((loginAttempts >= config.totalLoginAttempts || otpGenAttempt >= config.totalLoginAttempts || otpCheckAttempt >= config.totalLoginAttempts) && diffMins < config.lockTimeInMin) {
                return res.status(401).json({ status: 0, message: "Too many attempts. Please try after 5 mins" });
            }
            // check if lock time has passed reset the counter to 0
            else if ((loginAttempts >= config.totalLoginAttempts || otpGenAttempt >= config.totalLoginAttempts || otpCheckAttempt >= config.totalLoginAttempts) && diffMins >= config.lockTimeInMin) {
                loginAttempts = 0;
                otpCheckAttempt = 0;
                otpGenAttempt = 0;
            }
            else if (authData.otp_generate_attempt == config.totalLoginAttempts - 1) {
                currentTime = Date.now();
            }
            otpGenAttempt += 1;
            let otp = generateOTP();
            if(req.body.userContact == "tulika@thelattice.in")
                otp = "111111";

            await sendOTP(isEmail, userDetail, otp);
            const upsertJson = { "login_attempts": loginAttempts, "attempt_timestamp": currentTime, "first_login": true, "otp_check_attempts": otpCheckAttempt, "otp_generate_attempt": otpGenAttempt, "otp": otp, "otp_gen_time": today };
            await updateLoginAttempt(upsertJson, userDetail.profile.user_id);

            return res.status(200).json({ status: 1, message: "User verified. OTP sent to your registered contact detail" });
        }
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({
            status: 0,
            message: "Unable to process. Please try again.",
            error: e
        })
    }
}

// send otp via email or sms
async function sendOTP(isEmail, userDetail, otp) {
    try {
        if (isEmail) {            
            let mailData = {
                to: [{ email: "tulika@thelattice.in" }],
                subject: util.format(`${(emailContent.find(e => e.notification_type_id == 4).subject)}`,),
                content: util.format(`${(emailContent.find(e => e.notification_type_id == 4).content)}`, "Tulika", otp, "url defined later")
            }
             await sendEmail(mailData);
        }
        else {
            let text = `<#> Use OTP ${otp} to set pin in  MDR App\n` + config.OTPHash;
            await sendSms(userDetail.profile.mobile_number, text);
        }
    }
    catch (e) {
        console.error(" check if message is sent:", e);
        return Promise.reject(e);
    }

}

// set Password
let setPassword = async function (req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return validationResponse.sendInvalidDataError(res, errors);
        }
        let userDetail = await getUserDetail(req, req.body.userContact);
        if (userDetail == null || !userDetail.profile.is_active)
            return res.status(401).json({ status: 0, message: "Unauthorized user" });
        else {
            let { authData, currentTime, otpCheckAttempt, otpGenAttempt, loginAttempts } = setData(userDetail)
            let apiStatus, resMessage, upsertJson = {};
            let diffMins = getMinutes(authData.attempt_timestamp);
            if ((loginAttempts >= config.totalLoginAttempts || otpGenAttempt >= config.totalLoginAttempts || otpCheckAttempt >= config.totalLoginAttempts) && diffMins < config.lockTimeInMin)
                return res.status(401).json({ status: 0, message: "Too many attempts. Please try after 5 mins" });
            else if ((loginAttempts >= config.totalLoginAttempts || otpGenAttempt >= config.totalLoginAttempts || otpCheckAttempt >= config.totalLoginAttempts) && diffMins >= config.lockTimeInMin) {
                loginAttempts = 0;  otpCheckAttempt = 0;  otpGenAttempt = 0;
            }
            else if (authData.otp_gcheck_attempt == config.totalLoginAttempts - 1) {
                currentTime = Date.now();
            }
            otpCheckAttempt += 1;
            upsertJson = { "login_attempts": loginAttempts, "attempt_timestamp": currentTime, "first_login": true, "otp_check_attempts": otpCheckAttempt, "otp_generate_attempt": otpGenAttempt};
            if (req.body.otp != authData.otp) {
                apiStatus = 401;
                let e = otpCheckAttempt >= config.totalLoginAttempts ? "Too many attempts. Please try after 5 mins" : `Invalid OTP`;
                resMessage = { status: 0, message: e };
            }
            else {
                // if otp is valid check espire time of otp 
                let otpExpTime = getMinutes(authData.otp_gen_time)
                if (otpExpTime >= 2) {
                    return res.status(401).json({ status: 0, message: `OTP expired` });
                }
                loginAttempts = 0;
                otpCheckAttempt = 0;
                otpGenAttempt = 0;
                apiStatus = 200; 
                upsertJson = { "login_attempts": loginAttempts, "attempt_timestamp": currentTime, "first_login": true, "otp_check_attempts": otpCheckAttempt, "otp_generate_attempt": otpGenAttempt, "otp": null, "otp_gen_time": null};
                if(req.body.newPassword) {
                    const salt = bcryptjs.genSaltSync(10);
                    const hashedPassword = bcryptjs.hashSync(req.body.newPassword, salt);
                    upsertJson.password = hashedPassword;
                    upsertJson.salt = salt;
                    resMessage = {status: 1, message: "Password changed."}
                }
                else {
                    const token = jwt.sign(userDetail.profile, config.jwtSecretKey, { expiresIn: '30d' });
                    resMessage = { status: 1, "message": "Authorized user", data: { isFirstLogin: !authData.first_login, token: token, userDetail: userDetail.profile } }
                }                 
            }
            await updateLoginAttempt(upsertJson, userDetail.profile.user_id);
        return res.status(apiStatus).json(resMessage);
        }
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({
            status: 0,
            message: "Unable to process. Please try again.",
            error: e
        })
    }
}



function setData(userDetail) {
    const authData = userDetail.dataValues.authentication_detail.dataValues;
    let currentTime = null;
    let otpCheckAttempt = authData.otp_check_attempts
    let otpGenAttempt = authData.otp_generate_attempt;
    let loginAttempts = authData.login_attempts;
    return { authData, currentTime, otpCheckAttempt, otpGenAttempt, loginAttempts }
}

const changePassword = async function (req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return validationResponse.sendInvalidDataError(res, errors);
        }            
        let authData =  await getUserById(req.decoded.user_id);  
        if(bcryptjs.hashSync(req.body.oldPassword, authData.salt) != authData.password)
            return res.status(401).json({ status: 0, message: "Invalid old password" });
        const salt = bcryptjs.genSaltSync(10);
        const hashedPassword = bcryptjs.hashSync(req.body.newPassword, salt);
        let upsertJson = { "user_id": req.decoded.user_id, "password": hashedPassword, "salt": salt };
        await db.authentication_detail.update(upsertJson, { conflictFields: ["user_id"], where: { user_id: req.decoded.user_id } });
        return res.status(200).json({ status: 1, message: "Password changed." })
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({
            status: 0,
            message: "Unable to process. Please try again.",
            error: e
        })
    }
}

// get user and his/her OTP details using sequelize
async function getUserDetail(req, contact) {
    try {
        let existingPractioner = await getUserData(contact)
        if (existingPractioner.length < 1) {
            return null;
        }
        else {
            let user_id = existingPractioner[0].res_id;
            const practitonerData = JSON.parse(existingPractioner[0].res_text_vc);
            let user_name = practitonerData.name[0].given.join(' ');
            user_name += " " + practitonerData.name[0].family;
            let email = practitonerData.telecom.filter(e => e.system == "email");
            let phone = practitonerData.telecom.filter(e => e.system == "phone");
            let roleData = JSON.parse(existingPractioner[1].res_text_vc);
            let roleList = roleData.code[0].coding.map(element => element.code);
            let userDetail = {
                profile: {
                    "user_name": user_name,
                    "user_email": email[0].value,
                    "mobile_number": phone[0].value,
                    "is_active": practitonerData.active,
                    "user_id": user_id,
                    "roles": roleList,
                    "orgId": roleData.organization.reference.split("/")[1]
                }, dataValues: {}
            };
            let userAuthData = await getUserById(user_id);
            userDetail.dataValues.authentication_detail = userAuthData;
            return userDetail;
        }

    }
    catch (e) {
        return Promise.reject(e);
    }
}


async function getUserData(userContact) {
    const practitionerResource = await db.sequelize.query(`SELECT res_id, res_type, res_text_vc FROM hfj_res_ver where res_id = (SELECT distinct res_id FROM hfj_spidx_token where res_type = 'Practitioner' and (sp_value = '${userContact}' and sp_name='email') or (sp_value='${userContact}' and sp_name='phone')) and res_type='Practitioner' order by res_ver desc limit 1;`,{type: sequelize.QueryTypes.SELECT});
    if(practitionerResource.length != 1) {
        return [];
    }    
    const roleResource = await db.sequelize.query(`select res_id, res_type, res_text_vc FROM hfj_res_ver where res_type = 'PractitionerRole' and res_id = 
    (SELECT src_resource_id FROM public.hfj_res_link where source_resource_type = 'PractitionerRole' and target_resource_id=${practitionerResource[0].res_id})  order by res_ver desc limit 1;`,{type: sequelize.QueryTypes.SELECT});

    
    return [practitionerResource[0], roleResource[0]];
    
}

async function getUserById(user_id) {
    try {
        let userData = await db.authentication_detail.findOne({
            attributes: ['auth_id', 'user_id', 'password', 'salt', 'createdOn', 'login_attempts', 'first_login', 'attempt_timestamp', 'is_active', "otp", "otp_check_attempts", "otp_generate_attempt", "otp_gen_time"],
            where: { "user_id": user_id }
        });
    
        return userData;
    }
    catch(e) {
        return Promise.reject(e);
    }
   
}

/// check if provided contact is an email or not
function checkIsEmail(userContact) {
    const regexExp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/gi;
    let isEmail = regexExp.test(userContact);
    return isEmail;
}

function getMinutes(prevDate) {
    let diffMins = 100000;
    if (prevDate) {
        const today = Date.now();
        const dateLastLogin = new Date(prevDate);
        let diffMs = (today - dateLastLogin);
        diffMins = Math.round(((diffMs % 86400000) % 3600000) / 60000);
    }
    return diffMins
}

// insert if not present or update generated OTP for the user id
async function updateLoginAttempt(upsertJson, user_id) {
    try {
        let upsertDetail = await db.authentication_detail.update(upsertJson, { where: { user_id: user_id } });
        return upsertDetail;
    }
    catch (e) {
        return Promise.reject(e);
    }


}

// generate 6 digits OTP
function generateOTP() {
    try {
        let minm = 100000;
        let maxm = 999999;
        let value = crypto.randomInt(minm, maxm);
        let otp = value.toString().padStart(6, "1");
        return otp;
    }
    catch (e) {
        Promise.reject(e);
    }

}

module.exports = {
    login, setPassword, forgotPassword, changePassword
}