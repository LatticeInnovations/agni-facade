const config = require("../config/nodeConfig")
const accountid = config.twilioAccountSid;
const authToken = config.twilioAuthToken;
const client = require('twilio')(accountid, authToken);
let sendSms = async function (phoneNumber, text) {
  try {
    console.info("sms tak aaya")
    const message = await client.messages.create({
        body: text,
        from: config.twilioNumber,
        to: phoneNumber
      })
      console.info("sms response", message);
      return message;
  }
  catch (error) {
      console.error("error is: ", error)
        return Promise.reject(error)
  }
}

module.exports = sendSms;