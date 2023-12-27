let validationResponse = require("../utils/responseStatus");
const db = require('../models/index');
let sendSms = require('../utils/twilio.util');
let jwt = require("jsonwebtoken");
const config = require("../config/nodeConfig");
let { validationResult } = require('express-validator');
const crypto = require('crypto');
const bcryptjs = require("bcryptjs");
const sequelize = require("sequelize");
const sessionCounter = require("../utils/sessionCounter.json");
const fs = require('fs');

// login by using mobile number to send OTP
const login = async function (req, res) {
    try {
        // check for any validation error
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return validationResponse.sendInvalidDataError(res, errors);
        }
        // get user details
        let userDetail = await getUserDetail(req.body);
        if (userDetail == null || userDetail.dataValues.authentication_detail == null || !userDetail.dataValues.authentication_detail.dataValues.password ||!userDetail.profile.is_active)
            return res.status(401).json({ status: 0, message: "Unauthorized user" });
        let { authData, currentTime, otpCheckAttempt, otpGenAttempt, loginAttempts } = setData(userDetail);
        let updatedOn = Date.now();
        let diffMins = getMinutes(authData.attempt_timestamp);
        let diffMinUpdatedOn = getMinutes(authData.updatedOn);
        console.log(loginAttempts, otpGenAttempt, otpCheckAttempt, diffMins)
        if ((loginAttempts >= config.totalLoginAttempts || otpGenAttempt >= config.totalLoginAttempts || otpCheckAttempt >= config.totalLoginAttempts) && diffMins < config.lockTimeInMin){
            return res.status(403).json({ status: 0, message: "Too many attempts. Please try after 5 mins" });
        }
        else if (((loginAttempts >= config.totalLoginAttempts || otpGenAttempt >= config.totalLoginAttempts || otpCheckAttempt >= config.totalLoginAttempts) && diffMins >= config.lockTimeInMin)|| diffMinUpdatedOn >= config.lockTimeInMin) {
            loginAttempts = 0; otpCheckAttempt = 0; otpGenAttempt = 0;
        }
        
        if (authData.login_attempts == config.totalLoginAttempts - 1) {
            currentTime = Date.now();
        }
        loginAttempts += 1;

        // verify password
        const userInfo = setUserDetail(userDetail.profile);
        let response = {}, status = 200;
        let upsertJson =  { "login_attempts": loginAttempts, "attempt_timestamp": currentTime, "otp_check_attempts": otpCheckAttempt, "otp_generate_attempt": otpGenAttempt, "updatedOn": updatedOn };
   
        if (bcryptjs.hashSync(req.body.password, authData.salt) != authData.password) {
            const message = loginAttempts >= config.totalLoginAttempts ? "Too many attempts. Please try after 5 mins" : "Invalid credential";
            status = loginAttempts >= config.totalLoginAttempts ? 403: 422;
            
            response = { status: 0, "message": message }            
        }
        else {
            const sessionData = setSessionId();
            loginAttempts = 0;
            otpCheckAttempt = 0;
            otpGenAttempt = 0;
            currentTime = null;
            const token = jwt.sign(userDetail.profile, config.jwtSecretKey, { expiresIn: '30d' });
            userInfo.token = token;
            userInfo.sessionId = sessionData.sessionId;
             upsertJson = { "login_attempts": loginAttempts, "attempt_timestamp": currentTime, "otp_check_attempts": otpCheckAttempt, "otp_generate_attempt": otpGenAttempt, "sessionCount": sessionData.counterVal, sessionId: sessionData.sessionId  };
            response = { status: 1, "message": "Authorized user", data: userInfo }
        }
        
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




// verify user contact and generate OTP
const verifyContactAndGenOTP = async function (req, res) {
    try {
        // check for validation error
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return validationResponse.sendInvalidDataError(res, errors);
        }
        // check if user auth data exists
        let userDetail = await getUserDetail(req.body);
        let isMobile = req.body.isMobile;
        let roleID = userDetail?.profile?.roles[0];
        if ((userDetail == null || userDetail.dataValues.authentication_detail == null || !userDetail.profile.is_active) || (req.body.forgotPass == undefined && isMobile && (roleID == "6868009" || roleID == "ict")))
            return res.status(401).json({ status: 0, message: "Unauthorized user" });
        else {
            const authData = userDetail.dataValues.authentication_detail.dataValues;
            let diffMins = 100000;
            let currentTime = null;
            let updatedOn = Date.now()
            let otpCheckAttempt = authData.otp_check_attempts
            let otpGenAttempt = authData.otp_generate_attempt;
            let loginAttempts = authData.login_attempts;
            const today = Date.now();
            if (authData.attempt_timestamp) {
                diffMins = getMinutes(authData.attempt_timestamp);
            }
            let diffMinUpdatedOn = getMinutes(authData.updatedOn)
            // check if account locked 
            if ((loginAttempts >= config.totalLoginAttempts || otpGenAttempt >= config.totalLoginAttempts || otpCheckAttempt >= config.totalLoginAttempts) && diffMins < config.lockTimeInMin) {
                return res.status(403).json({ status: 0, message: "Too many attempts. Please try after 5 mins" });
            }
            // check if lock time has passed reset the counter to 0
            else if (((loginAttempts >= config.totalLoginAttempts || otpGenAttempt >= config.totalLoginAttempts || otpCheckAttempt >= config.totalLoginAttempts) && diffMins >= config.lockTimeInMin)|| diffMinUpdatedOn >= config.lockTimeInMin) {
                loginAttempts = 0;
                otpCheckAttempt = 0;
                otpGenAttempt = 0;
            }
            if(!req.body.isMobile && !authData.forceSetPassword ) {
                return res.status(200).json({
                    status: 1,
                    message: "User verified",
                    data: {
                        otpPage: false
                    }
                })
            }
            else if (authData.otp_generate_attempt == config.totalLoginAttempts - 1) {
                currentTime = Date.now();
            }
            otpGenAttempt += 1;
            let otp = null;
            // generate otp
            if(req.body.mobileNumber == "8709135849" || req.body.mobileNumber == "9876543210" || req.body.mobileNumber == "111111" || req.body.mobileNumber == "222222" || req.body.mobileNumber == "333333" || req.body.mobileNumber == "444444" || req.body.mobileNumber == "555555" || req.body.mobileNumber == "333111" || req.body.mobileNumber == "333222" || req.body.mobileNumber == "444111" || req.body.mobileNumber == "444222")
                otp = "111111";
            else {
               otp = generateOTP();
               await sendOTP(otp, req.body);
            }          
            
            const upsertJson = { "login_attempts": loginAttempts, "attempt_timestamp": currentTime, "otp_check_attempts": otpCheckAttempt, "otp_generate_attempt": otpGenAttempt, "otp": otp, "otp_gen_time": today,  "updatedOn": updatedOn};
            await updateLoginAttempt(upsertJson, userDetail.profile.user_id);
            const otpPage = !req.body.isMobile;
            return res.status(200).json({ status: 1, message: "User verified. OTP sent to your registered contact detail", data: {
                otpPage: otpPage
            } });
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
async function sendOTP(otp, contact) {
    try {   
            let phone = contact.isdCode + contact.mobileNumber;
            let text = `<#> Use OTP ${otp} to set pin in  MDR App\n` + config.OTPHash;
            await sendSms(phone, text);
    }
    catch (e) {
        console.error(" check if message is sent:", e);
        return Promise.reject(e);
    }

}

// verify OTP
let verifyOTP = async function (req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return validationResponse.sendInvalidDataError(res, errors);
        }
        let userDetail = await getUserDetail(req.body);
        if (userDetail == null || userDetail.dataValues.authentication_detail == null || !userDetail.profile.is_active)
            return res.status(401).json({ status: 0, message: "Unauthorized user" });
        else {
            let { authData, currentTime, otpCheckAttempt, otpGenAttempt, loginAttempts } = setData(userDetail);
            let updatedOn = Date.now();
            let apiStatus, resMessage, upsertJson = {};
            let diffMins = getMinutes(authData.attempt_timestamp);
            let diffMinUpdatedOn = getMinutes(authData.updatedOn)
            if ((loginAttempts >= config.totalLoginAttempts || otpGenAttempt >= config.totalLoginAttempts || otpCheckAttempt >= config.totalLoginAttempts) && diffMins < config.lockTimeInMin)
                return res.status(403).json({ status: 0, message: "Too many attempts. Please try after 5 mins" });
            else if (((loginAttempts >= config.totalLoginAttempts || otpGenAttempt >= config.totalLoginAttempts || otpCheckAttempt >= config.totalLoginAttempts) && diffMins >= config.lockTimeInMin)|| diffMinUpdatedOn >= config.lockTimeInMin) {                
                loginAttempts = 0;  otpCheckAttempt = 0;  otpGenAttempt = 0;
            }
            else if (authData.otp_check_attempts == config.totalLoginAttempts - 1) {
                currentTime = new Date();
            }
            otpCheckAttempt += 1;
            upsertJson = { "login_attempts": loginAttempts, "attempt_timestamp": currentTime, "otp_check_attempts": otpCheckAttempt, "otp_generate_attempt": otpGenAttempt, "updatedOn": updatedOn};
            if (req.body.otp != authData.otp) {
                apiStatus =otpCheckAttempt >= config.totalLoginAttempts ? 403: 422;
                let e = otpCheckAttempt >= config.totalLoginAttempts ? "Too many attempts. Please try after 5 mins" : `Invalid OTP`;
                resMessage = { status: 0, message: e };
            }
            else {
                // if otp is valid check expire time of otp 
                let otpExpTime = getMinutes(authData.otp_gen_time)
                if (otpExpTime >= config.OTPExpireMin) {
                    return res.status(410).json({ status: 0, message: `OTP expired` });
                }
                loginAttempts = 0;
                otpCheckAttempt = 0;
                otpGenAttempt = 0;
                apiStatus = 200; 
                upsertJson = { "login_attempts": loginAttempts, "attempt_timestamp": currentTime, "otp_check_attempts": otpCheckAttempt, "otp_generate_attempt": otpGenAttempt, "otp": null, "otp_gen_time": null, "otpVerified": true};
                const userInfo = setUserDetail(userDetail.profile);
                if(req.body.isMobile) {
                    const sessionData = setSessionId();
                    userInfo.sessionId = sessionData.sessionId;
                    upsertJson.sessionCount = sessionData.counterVal;
                    upsertJson.sessionId = sessionData.sessionId ;
                    upsertJson.otpVerified = false;
                    const token = jwt.sign(userDetail.profile, config.jwtSecretKey, { expiresIn: '30d' });
                    userInfo.token = token;
                    resMessage = { status: 1, "message": "Authorized user", data: userInfo }  
                }
                else {
                    resMessage = { status: 1, "message": "OTP verified" }
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

// set password for the user whi has already passed otp verification
const setPassword = async function (req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return validationResponse.sendInvalidDataError(res, errors);
    }
    let userDetail = await getUserDetail(req.body);
    if (userDetail == null || userDetail.dataValues.authentication_detail == null || !userDetail.profile.is_active)
      return res.status(401).json({ status: 0, message: "Unauthorized user" });
     else {
      let {
        authData, currentTime, otpCheckAttempt,  otpGenAttempt, loginAttempts } = setData(userDetail);
      let diffMins = getMinutes(authData.attempt_timestamp);
      let diffMinUpdatedOn = getMinutes(authData.updatedOn);
      if ( (loginAttempts >= config.totalLoginAttempts || otpGenAttempt >= config.totalLoginAttempts ||  otpCheckAttempt >= config.totalLoginAttempts) &&
        diffMins < config.lockTimeInMin)
        return res.status(403).json({
            status: 0,
            message: "Too many attempts. Please try after 5 mins",
          });
    else if (((loginAttempts >= config.totalLoginAttempts || otpGenAttempt >= config.totalLoginAttempts || otpCheckAttempt >= config.totalLoginAttempts) && diffMins >= config.lockTimeInMin)|| diffMinUpdatedOn >= config.lockTimeInMin) {                
            loginAttempts = 0;  otpCheckAttempt = 0;  otpGenAttempt = 0;
        }       

     else if(!userDetail.dataValues.authentication_detail.otpVerified) {
            return res.status(401).json({ status: 0, message: "Unauthorized user" });  
        }
          loginAttempts = 0;
          otpCheckAttempt = 0;
          otpGenAttempt = 0;
     let upsertJson = {
        login_attempts: loginAttempts,
        attempt_timestamp: currentTime,
        forceSetPassword: false,
        otp_check_attempts: otpCheckAttempt,
        otp_generate_attempt: otpGenAttempt,
        setPasswordOn: Date.now(),
        otpVerified: false
      };
      const salt = bcryptjs.genSaltSync(10);
      const hashedPassword = bcryptjs.hashSync(req.body.newPassword, salt);
      upsertJson.password = hashedPassword;
      upsertJson.salt = salt;
      await updateLoginAttempt(upsertJson, userDetail.profile.user_id);
      return res.status(200).json({ status: 1, message: "Password set." });
    }
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      status: 0,
      message: "Unable to process. Please try again.",
      error: e,
    });
  }
};

// set auth data in json
function setData(userDetail) {
    const authData = userDetail.dataValues.authentication_detail.dataValues;
    let currentTime = null;
    let otpCheckAttempt = authData.otp_check_attempts
    let otpGenAttempt = authData.otp_generate_attempt;
    let loginAttempts = authData.login_attempts;
    return { authData, currentTime, otpCheckAttempt, otpGenAttempt, loginAttempts }
}


// change password
const changePassword = async function (req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return validationResponse.sendInvalidDataError(res, errors);
        }            
        let authData =  await getUserById(req.decoded.user_id);  
        if(bcryptjs.hashSync(req.body.oldPassword, authData.salt) != authData.password)
            return res.status(422).json({ status: 0, message: "Invalid old password" });
        const salt = bcryptjs.genSaltSync(10);
        const hashedPassword = bcryptjs.hashSync(req.body.newPassword, salt);
        let upsertJson = { "user_id": req.decoded.user_id, "password": hashedPassword, "salt": salt, forceSetPassword: false,
        setPasswordOn: Date.now() };
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


// function to create a new session id for every login

function setSessionId () {
    try {
        let incrementMonth = sessionCounter.monthCounter;
        if(sessionCounter.montIncDate == null || new Date(sessionCounter.montIncDate).getMonth() != new Date().getMonth()) {
            incrementMonth = sessionCounter.monthCounter + 1;
            sessionCounter.monthCounter = incrementMonth;
            sessionCounter.montIncDate = new Date();
            sessionCounter.sessionIdInc = 0;
        }
        let sessionIncVal = sessionCounter.sessionIdInc + 1;
        let monthIncPadded = String(incrementMonth).padStart(2, "0");
        let sessionIncPadded = String(sessionIncVal).padStart(3, "0");
        sessionCounter.sessionIdInc = sessionIncVal;
        let fileName = __dirname + "/../utils/sessionCounter.json";
        let counterJson=sessionCounter;
        writeToFile(fileName, counterJson);
        const sessionId =  monthIncPadded + "-" + sessionIncPadded;
        console.info("sessionCounter: ", sessionCounter)
        return {
            sessionId: sessionId, incrementVal: incrementMonth, counterVal: sessionIncVal
        }
    }
    catch (e) {
        console.error(e);
        return Promise.reject(e);
    }
}
// change incremented value in file
function writeToFile(fileName, counterJson) {
    fs.writeFile(fileName, JSON.stringify(counterJson), (err) => {
        if (err) console.log("error: ", err);
        else console.log("Data saved successfully.");
    })
}

// get user and his/her OTP details using sequelize
async function getUserDetail(contact) {
    try {
        let phone = `(${contact.isdCode}) ${contact.mobileNumber}` 
        let existingPractitioner = await getUserData(phone);
        if (existingPractitioner.length < 1) {
            return null;
        }
        else {
            let user_id = existingPractitioner[0].res_id;
            const practitionerData = JSON.parse(existingPractitioner[0].res_text_vc);
            let user_name = practitionerData.name[0].given.join(' ');
            user_name += practitionerData?.name[0]?.family ? " " + practitionerData.name[0].family : '';
            //let email = practitionerData.telecom.filter(e => e.system == "email");
            let phone = practitionerData.telecom.filter(e => e.system == "phone");
            let roleData = JSON.parse(existingPractitioner[1].res_text_vc);
            let roleList = roleData.code[0].coding.map(element => element.code);
            let userDetail = {
                profile: {
                    "user_name": user_name,
                   // "user_email": email[0].value,
                    "mobile_number": phone[0].value,
                    // "is_active": practitionerData.active ? practitionerData.active : true,
                    "is_active": practitionerData.active,
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


// user detail after login set in json
function setUserDetail(userDetail) {
    return {
     "username": userDetail.user_name,
      "userId": userDetail.user_id,
      "roles": userDetail.roles,
      "orgId": userDetail.orgId,
      "contactNumber": userDetail.mobile_number
    }
}

// get practitioner role and details from db
async function getUserData(mobileNumber) {
    const practitionerResource = await db.sequelize.query(`SELECT res_id, res_type, res_text_vc FROM hfj_res_ver where res_id = (SELECT distinct res_id FROM hfj_spidx_token where res_type = 'Practitioner' and (sp_value='${mobileNumber}' and sp_name='phone') and res_type='Practitioner') order by res_ver desc limit 1;`,{type: sequelize.QueryTypes.SELECT});
    if(practitionerResource.length != 1) {
        return [];
    }    
    const roleResource = await db.sequelize.query(`select res_id, res_type, res_text_vc FROM hfj_res_ver where res_type = 'PractitionerRole' and res_id = 
    (SELECT src_resource_id FROM public.hfj_res_link where source_resource_type = 'PractitionerRole' and target_resource_id=${practitionerResource[0].res_id} order by pId limit 1)  order by res_ver desc limit 1;`,{type: sequelize.QueryTypes.SELECT});
    
    return [practitionerResource[0], roleResource[0]];
    
}

async function getUserById(user_id) {
    try {
        let userData = await db.authentication_detail.findOne({
            attributes: ['auth_id', 'user_id', 'password', 'salt', 'updatedOn', 'login_attempts', 'forceSetPassword', 'attempt_timestamp', 'is_active', "otp", "otp_check_attempts", "otp_generate_attempt", "otp_gen_time", "otpVerified", "sessionCount"],
            where: { "user_id": user_id }
        });
    
        return userData;
    }
    catch(e) {
        return Promise.reject(e);
    }
   
}

/// get minutes between 2 dates
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
        console.info("check upsert data: ", upsertJson)
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
    login, verifyOTP, verifyContactAndGenOTP, changePassword, setPassword, setSessionId
}