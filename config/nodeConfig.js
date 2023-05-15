require('dotenv').config()
let config = function () {
             return {
            port: '3000',
            timeout: 120000,
            version: process.env.version,
            baseUrl: process.env.FHIRServerBaseURL,
            twilioNumber: process.env.twilioNumber,
            sendgridKey: process.env.sendgridKey,
            mailFrom: "dev@thelattice.in",
            jwtSecretKey: process.env.jwtSecretKey
        };
};
module.exports = new config();