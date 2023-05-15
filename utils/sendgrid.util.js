const { response } = require('express');
let config = require('../config/nodeConfig');
let sg = require('@sendgrid/mail');
module.exports.sendEmail = async function(data, res){
    try {
        sg.setApiKey(config.sendgridKey);
        let msg = {
          to: data.to,
          from: config.mailFrom, // Use the email address or domain you verified above
          subject: data.subject,
          html: data.content,
          attachments: data.attachments
        };
        let emailMessage = await sg.send(msg);
        return emailMessage;
    }
    catch(err) {
        console.error(err, err.response.body)
        return Promise.reject(err);
    }

    sg.send(msg).then((response) => {
          console.log('email sent successfully');  })
  .catch((err) => {
    res.status(500).send(err);

    console.log(err)
  });
}