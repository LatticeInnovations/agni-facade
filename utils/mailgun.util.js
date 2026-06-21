let config = require('../config/nodeConfig');
let formData = require('form-data');
let Mailgun = require('mailgun.js');

let mailgun = new Mailgun(formData);
let mg = mailgun.client({
    username: 'api',
    key: config.mailgunApiKey,
    url: 'https://api.eu.mailgun.net',
    timeout: 30000
});

function normalizeRecipients(to) {
    if (Array.isArray(to)) {
        return to.map((entry) => (typeof entry === 'string' ? entry : entry.email));
    }
    return typeof to === 'string' ? to : to.email;
}


module.exports.sendEmail = async function (data) {
    let msg = {
        to: normalizeRecipients(data.to),
        from: `support@${config.mailgunDomain}`, // Use the email address or domain you verified above
        subject: data.subject,
        html: data.content,
        attachment: data.attachments
    };
    console.log("check message data: ", msg)
    try {
        console.info("reached here email");
        await mg.messages.create(config.mailgunDomain, msg);
    }
    catch (err) {
        console.error("err ======>", err);
        return Promise.reject(err);
    }
};