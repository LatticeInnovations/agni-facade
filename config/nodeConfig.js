require('dotenv').config();
let config = function () {
             return {
            port: '3000',
            timeout: 120000,
            version: process.env.version,
            baseUrl: process.env.FHIRServerBaseURL,
            twilioAccountSid: process.env.twilioAccountSid,
            twilioAuthToken: process.env.twilioAuthToken,
            twilioNumber: process.env.twilioNumber,
            sendgridKey: process.env.sendgridKey,
            mailFrom: "dev@thelattice.in",
            jwtSecretKey: process.env.jwtSecretKey,
            totalLoginAttempts: 5,
            lockTimeInMin: 0,
            OTPExpireMin: 2,
            OTPGenAttempt: 5,
            OTPHash: process.env.OTPHash,
            schemaList: process.env.schemaList,
            domainsList: process.env.domainsList,
            whitelist: process.env.whitelist,
            sctCodeUrl: process.env.sctCodeUrl,
            prescriptionUrl: process.env.prescriptionUrl,
            measureUrl: process.env.measureUrl,
            snUrl : process.env.snUrl,
            orgType : process.env.orgType,
            fhirCodeUrl : process.env.fhirCodeUrl,
            roleCodeUrl : process.env.roleCodeUrl,
            authToken: process.env.authToken
        };
};
module.exports = new config();