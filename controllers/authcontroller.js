let response = require("../utils/responseStatus");
const db = require('../models/index');
let sendSms = require('../utils/twilio.util');
let emailContent = require("../utils/emailContent");
let util = require('util');
const authentication_detail = require("../models/authentication_detail");
let sendEmail = require("../utils/sendgrid.util").sendEmail
let jwt = require("jsonwebtoken");
const config = require("../config/nodeConfig");

// login by using email or mobile number to send OTP
let login = async function (req, res, next) {
    try {
        let isEmail = checkIsEmail(req.body.userContact);
        let contact = isEmail ? 'user_email' : 'mobile_number';
        let userDetail = await getUserDetail(req, contact);
        let loginAttempts = 0;
        if (userDetail == null || !userDetail.dataValues.is_active)
            return res.status(404).json({ status: 0, message: "Unauthorized user" })
        let currentTime = new Date();
        let messageDetail;
        let authentication_detail = userDetail.dataValues.authentication_detail;
        let diffMinutes = authentication_detail != null ? await checkAuthAttempts(authentication_detail.dataValues.lockTime, currentTime) : 0;       
        let otp = generateOTP();
        let expireTime = new Date(currentTime);
        expireTime = expireTime.setMinutes(expireTime.getMinutes() + 2);
        console.log("check exp time and current time again", currentTime, expireTime, diffMinutes);

        // total freeze time is 5 min.
        if (authentication_detail != null && authentication_detail.dataValues.login_attempts >= 5 && diffMinutes > 0) {
            let e = { status: 0, message: "You have 0 attempts left. Please try after 5 mins"}
            return res.status(401).json(e)
        }
        else if (authentication_detail != null && authentication_detail.dataValues.login_attempts < 5) {
            loginAttempts = authentication_detail.dataValues.login_attempts;
        }        
        messageDetail = await sendOTP(isEmail, userDetail, otp); 
        let lockTime = authentication_detail == null ? null : authentication_detail.dataValues.lockTime; 
         let upsertResult = await upsertOTP(otp, userDetail.dataValues, currentTime, expireTime, loginAttempts, lockTime);
        res.status(200).json({ status: 1, "message": "Authorized user" });
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

// authenticate OTP
let OTPAuthentication = async function (req, res, next) {
    try {
        let isEmail = checkIsEmail(req.body.userContact);
        let contact = isEmail ? 'user_email' : 'mobile_number';
        let userDetail = await getUserDetail(req, contact);
        if(userDetail == null) 
            return res.status(404).json({ status: 0, message: "Unauthorized user" })
        let currentTime = new Date();
        let loginAttempts = 0;
        let attemptsLeft = 0;          
        let is5MinTimer = false;          
        let e = {};
        let authentication_detail = userDetail.dataValues.authentication_detail;
        // check freeze time of 5 min
        let diffMinutes = authentication_detail.dataValues.lockTime == null ? 0 : await checkAuthAttempts(authentication_detail.dataValues.lockTime, currentTime);
        if(userDetail != null && userDetail.dataValues.authentication_detail.dataValues.otp == null) {
            return res.status(401).json({ status: 0, message: "OTP expired" });
        }
        else if (userDetail == null || !userDetail.dataValues.is_active)
            return res.status(401).json({ status: 0, message: "Unauthorized user" });
            // if no of attempts is > 5 and 5 min freeze time has not elapsed
        else if (authentication_detail.dataValues.login_attempts >= 5 && diffMinutes > 0) {
            loginAttempts = 5;
            attemptsLeft = 5 - loginAttempts;
            e = { status: 0, message: "You have 0 attempts left. Please try after 5 mins"};
            return res.status(401).json(e)
        }
        else if (req.body.otp != authentication_detail.dataValues.otp) {
            if (authentication_detail.dataValues.login_attempts >= 5 && diffMinutes <= 0) {
                loginAttempts = 1;
                attemptsLeft = 5 - loginAttempts;
                e = { status: 0, message: `Invalid OTP, you have ${attemptsLeft} attempts left.`, "code": "ERR"}
            }
            else {
                let lockTime = new Date(currentTime);
                authentication_detail.dataValues.lockTime = authentication_detail.dataValues.login_attempts == 4? lockTime.setMinutes(lockTime.getMinutes() + 5) : null;
                loginAttempts = authentication_detail.dataValues.login_attempts + 1;
                attemptsLeft = 5 - loginAttempts;
                console.log("Check if it's in this section: ", is5MinTimer)
                let errMessage = loginAttempts >= 5 ? "You have 0 attempts left. Please try after 5 mins" : `Invalid OTP, you have ${attemptsLeft} attempts left.`;
                e = { status: 0, message: errMessage }
            }
            let upsertResult = await upsertOTP(authentication_detail.dataValues.otp, userDetail.dataValues, currentTime, authentication_detail.dataValues.expire_time, loginAttempts, authentication_detail.dataValues.lockTime);
            console.log("============>", loginAttempts, attemptsLeft)
            return res.status(401).json(e)
        }
        else {            
            let expireTimeOTP = await checkAuthAttempts(authentication_detail.dataValues.expire_time, currentTime); 
            console.log("expire time OTP", expireTimeOTP);  
            if (expireTimeOTP <= 0) {
                let e = { status: 0, message: `OTP expired` }
                return res.status(401).json(e);
            }
            is5MinTimer = true;
            let userProfile = {
                "userId": userDetail.dataValues.user_id,
                "userName": userDetail.dataValues.user_name
            }
            let token = jwt.sign(userProfile, config.jwtSecretKey, { expiresIn: '5d' })
            let userUpdateResult = upsertOTP(null, userDetail.dataValues, currentTime, null, 0, null)
            res.status(200).json({ status: 1, message: "Logged in successfully", data: { "token": `Bearer ${token}` } });
        }
    } catch (e) {
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

async function sendOTP(isEmail, userDetail, otp) {
    let messageDetail;
    if (isEmail) {
        let mailData = {
            to: [{ email: userDetail.dataValues.user_email }],
            subject: util.format(`${(emailContent.find(e => e.notification_type_id == 1).subject)}`,),
            content: util.format(`${(emailContent.find(e => e.notification_type_id == 1).content)}`, userDetail.dataValues.user_name, otp.toString())
        }
        messageDetail = await sendEmail(mailData);
    }
    else {
        let text = `Hello ${userDetail.dataValues.user_name}, Please use OTP ${otp} to login to agni App`;
        messageDetail = await sendSms(userDetail.dataValues.mobile_number, text);
    }
}
// get user and his/her OTP details using sequelize
async function getUserDetail(req, contact) {
    try {
        let userDetail = await db.user_master.findOne({
            include: [{ model: db.authentication_detail, attributes: ['auth_id', 'user_id', 'otp', 'expire_time', 'createdOn', 'lockTime', 'login_attempts'], required: false }],
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
async function upsertOTP(otp, userDetail, currentTime, expireTime, loginAttempts, lockTime) {
    try {
        let upsertJson = { "user_id": userDetail.user_id, "otp": otp, "expire_time": expireTime, "login_attempts": loginAttempts, createdOn: currentTime, lockTime: lockTime };
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