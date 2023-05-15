require('dotenv').config();
const accountid = process.env.accountSid;
const authToken = process.env.authToken;
const config = require('../config/nodeConfig')
const client = require('twilio')(accountid, authToken);
let sendSms = async function (phoneNumber, text) {
  try {
    const message = await client.messages.create({
        body: text,
        from: config.twilioNumber,
        to: "+91" + phoneNumber
      })
      return message;
  }
  catch (error) {
    console.error(error);
    return Promise.reject(error)
  }
}

module.exports = sendSms;