let response = require("../utils/responseStatus");
const db = require('../models/index');
let sendSms = require('../utils/twilio.util');
let emailContent = require("../utils/emailContent");
let util = require('util');
let sendEmail = require("../utils/sendgrid.util").sendEmail
let jwt = require("jsonwebtoken");
const config = require("../config/nodeConfig");
let { validationResult } = require('express-validator');

// login by using email or mobile number to send OTP
let login = async function (req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return response.sendInvalidDataError(res, errors);
        }
        let isEmail = checkIsEmail(req.body.userContact);
        let contact = isEmail ? 'user_email' : 'mobile_number';
        let userDetail = await getUserDetail(req, contact);
        let loginAttempts = 0, otp = 0;;
        let OTPGenerateAttempt = 1;
        if (userDetail == null || !userDetail.dataValues.is_active)
            return res.status(401).json({ status: 0, message: "Unauthorized user" });
        let authentication_detail = userDetail.dataValues.authentication_detail;
        let timeData = await calculateTime(authentication_detail);
        // if user comes back after >= 5 mins reset every value 
        if (timeData.lastAttemptTimeDiff > config.lockTimeInMin) {
            loginAttempts = 0;
            OTPGenerateAttempt = 1;
        }
        // if otp validation falied attempt (login attempts) >= 5 and <= 5min or otp generations >= 5 and time elapsed <= 5 mins give error
        else if (authentication_detail != null && timeData.lastAttemptTimeDiff <= config.lockTimeInMin && (authentication_detail.dataValues.login_attempts >= config.totalLoginAttempts || authentication_detail.dataValues.otp_generate_attempt >= config.OTPGenAttempt)) {
            let e = { status: 0, message: "Too many attempts. Please try after 5 mins" }
            return res.status(401).json(e)
        }
        // else increment otp generation counter ans set lock time if it is last attempt
        else if (authentication_detail != null) {
            loginAttempts = authentication_detail.dataValues.login_attempts;
            OTPGenerateAttempt = authentication_detail.dataValues.otp_generate_attempt + 1;
        }

       if(req.body.userContact == 1111111111 || req.body.userContact == "devtest@gmail.com") {            otp = 111111;
        }else if(req.body.userContact == 9876543210 || req.body.userContact == "dev2@gmail.com") {
            otp = 222222;
            OTPGenerateAttempt = 1;
            loginAttempts = 0;
        }
        else {
             otp =  generateOTP();
             console.log("check if otp is generated before sending")
             try {
                  await sendOTP(isEmail, userDetail, otp);
             }
             catch(e) {
                    return res.status(500).json({status: 0, message: "Unable to process. Please try again."})
             }
        }            

        await upsertOTP(otp, userDetail.dataValues, timeData.currentTime, timeData.expireTime, loginAttempts, OTPGenerateAttempt);
        res.status(200).json({ status: 1, "message": "Authorized user" });
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

// authenticate OTP
let OTPAuthentication = async function (req, res, next) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return response.sendInvalidDataError(res, errors);
        }
        let isEmail = checkIsEmail(req.body.userContact);
        let contact = isEmail ? 'user_email' : 'mobile_number';
        let userDetail = await getUserDetail(req, contact);
        if (userDetail == null || !userDetail.dataValues.is_active)
            return res.status(401).json({ status: 0, message: "Unauthorized user" });
        let loginAttempts = 0, apiStatus = 200;
        let resMessage = {};
        let authentication_detail = userDetail.dataValues.authentication_detail;
        let timeData = await calculateTime(authentication_detail);
        console.log(timeData)
        if (userDetail != null && userDetail.dataValues.authentication_detail.dataValues.otp == null) {
            console.log("check here")
            return res.status(401).json({ status: 0, message: "OTP expired" });
        }
        else if (timeData.lastAttemptTimeDiff <= config.lockTimeInMin && (authentication_detail.dataValues.login_attempts >= config.totalLoginAttempts || authentication_detail.dataValues.otp_generate_attempt >= config.OTPGenAttempt)) {
            return res.status(401).json({ status: 0, message: "Too many attempts. Please try after 5 mins" })
        }
        // if user comes back after >= 5 mins reset values
        if (timeData.lastAttemptTimeDiff > config.lockTimeInMin) {
            loginAttempts = authentication_detail.dataValues.login_attempts = 0;
            authentication_detail.dataValues.otp_generate_attempt = 0;
        }
       
        // bypass for testing purpose
        if((req.body.userContact == 9876543210 || req.body.userContact == "dev2@gmail.com") && req.body.otp != 222222) {
            loginAttempts = 1;
            resMessage = { status: 0, message: "Invalid OTP" };
        }
         // if otp is invalid
        else if (req.body.otp != authentication_detail.dataValues.otp) {
            apiStatus = 401; 
            loginAttempts = authentication_detail.dataValues.login_attempts + 1;
            let e = loginAttempts >= config.totalLoginAttempts ? "Too many attempts. Please try after 5 mins" : `Invalid OTP`;
            resMessage = { status: 0, message: e };
            await upsertOTP(authentication_detail.dataValues.otp, userDetail.dataValues, timeData.currentTime, authentication_detail.dataValues.expire_time, loginAttempts, authentication_detail.dataValues.otp_generate_attempt);
        }
        else {
            // if otp is valid check espire time of otp  
            if (timeData.expireTimeDiffOTP <= 0) {
                return res.status(401).json({ status: 0, message: `OTP expired` });
            }
            let userProfile = {
                "userId": userDetail.dataValues.user_id, "userName": userDetail.dataValues.user_name
            }
            let token = jwt.sign(userProfile, config.jwtSecretKey, { expiresIn: '5d' });
            upsertOTP(null, userDetail.dataValues, timeData.currentTime, null, 0, authentication_detail.dataValues.otp_generate_attempt);
            resMessage = { status: 1, message: "Logged in successfully", data: { "token": `Bearer ${token}` } }
        }
        return res.status(apiStatus).json(resMessage);
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            status: 0,
            message: "Unable to process. Please try again.",
            error: e
        })
    }
}

async function calculateTime(authentication_detail) {
    let currentTime = new Date();
    let expireTime = new Date(currentTime);
    expireTime = expireTime.setMinutes(expireTime.getMinutes() + config.OTPExpireMin);
    let expireTimeDiffOTP = authentication_detail != null ? await checkAuthAttempts(authentication_detail.dataValues.expire_time, currentTime) : 0;
     let lastAttemptTimeDiff = authentication_detail != null ? await checkAuthAttempts(currentTime, authentication_detail.dataValues.createdOn) : 0;
    let data = { currentTime, expireTime, expireTimeDiffOTP, lastAttemptTimeDiff };
    return data;
}

async function sendOTP(isEmail, userDetail, otp) {
    try {
        let messageDetail;
        if (isEmail) {
            let mailData = {
                to: [{ email: userDetail.dataValues.user_email }],
                subject: util.format(`${(emailContent.find(e => e.notification_type_id == 1).subject)}`,),
                content: util.format(`${(emailContent.find(e => e.notification_type_id == 1).content)}`, userDetail.dataValues.user_name, otp.toString())
            }
            console.info("check mail data")
            messageDetail = await sendEmail(mailData);
        }
        else {
            let text = `<#> Use OTP ${otp} to login to agni App\n` + config.OTPHash;
            console.log("check text message", text);
            messageDetail = await sendSms(userDetail.dataValues.mobile_number, text);
            console.log(messageDetail, messageDetail.code)
        }
    }
    catch(e) {
        console.error(" check if message is sent1111", e);
        return Promise.reject(e);
    }

}
// get user and his/her OTP details using sequelize
async function getUserDetail(req, contact) {
    try {
        let userDetail = await db.user_master.findOne({
            include: [{ model: db.authentication_detail, attributes: ['auth_id', 'user_id', 'otp', 'expire_time', 'createdOn', 'login_attempts', 'otp_generate_attempt'], required: false }],
            attributes: ['user_id', 'user_name', 'role_id', contact, 'is_active'],
            where: { [contact]: req.body.userContact }
        });
        return userDetail;
    }
    catch (e) {
        return Promise.reject(e);
    }
}

/// check if provided contact is an email or not
function checkIsEmail(userContact) {
    const regexExp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/gi;
    let isEmail = regexExp.test(userContact);
    return isEmail;
}

// generate 6 digits OTP
function generateOTP() {
    var minm = 100000;
    var maxm = 999999;
    return Math.floor(Math.random() * (maxm - minm + 1)) + minm;
}

// insert if not present or update generated OTP for the user id
async function upsertOTP(otp, userDetail, currentTime, expireTime, loginAttempts, OTPGenerateAttempt) {
    try {
        let upsertJson = { "user_id": userDetail.user_id, "otp": otp, "expire_time": expireTime, "login_attempts": loginAttempts, "createdOn": currentTime, "otp_generate_attempt": OTPGenerateAttempt};
        console.log(upsertJson)
        let upsertDetail = await db.authentication_detail.upsert(upsertJson, { conflictFields: ["user_id"] });
        return upsertDetail;
    }
    catch (e) {
        return Promise.reject(e);
    }


}

// check if the number of attempts is 5 and 5 mins have not lapsed, then give an error
async function checkAuthAttempts(expire_time, currentTime) {
    let exp_date = new Date(expire_time);
    let diff = (exp_date - currentTime);
    let diffMinutes = Math.round((diff / 1000) / 60);
    return diffMinutes;
}

module.exports = {
    login, OTPAuthentication
}