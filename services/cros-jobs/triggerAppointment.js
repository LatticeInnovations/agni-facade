let bundleOp = require("../bundleOperation");
let config = require("../../config/nodeConfig");
let sendSms = require('../../utils/twilio.util');
let emailContent = require("../../utils/emailContent");
let sendEmail = require("../../utils/sendgrid.util").sendEmail;
let util = require('util');

const cron = require('node-cron')
async function appointmentList() {
        cron.schedule("0 0 30 * * *", triggerAppointment);
}

// trigger a cron job for sending message to user having appointment after 1 day or 3 days
// get org name, patient name, time of appointment
async function triggerAppointment() {
    try {
        let todayDate = new Date();
        let nextDate = new Date().setDate(todayDate.getDate()+1);
        let nextDateFormat = formatDate(nextDate);
        let thirdDate = new Date().setDate(todayDate.getDate()+3);
        let thirdDateFormat = formatDate(thirdDate)
       // let orgResource = await bundleOp.searchData(config.baseUrl + `Appointment?_include=Appointment:patient:Patient&_include=Appointment:slot:Slot&status=proposed&_include=Appointment:location:Location&_count=200`);
        let orgResource = await bundleOp.searchData(config.baseUrl + `Appointment?_include=Appointment:patient:Patient&_include=Appointment:slot:Slot&slot.start=${nextDateFormat},${thirdDateFormat}&status=proposed&_include=Appointment:location:Location&_count=200`);
       console.info("cron job for checking total data", orgResource.data.entry.length)
        if(orgResource.data.entry.length > 0) {
            let appointmentList = orgResource.data.entry.filter(e => e.resource.resourceType == "Appointment");
                for(let appointment of appointmentList) {
                    let patientId = appointment.resource.participant[0].actor.reference.split("/")[1];
                    let patient = orgResource.data.entry.find(e => e.resource.id == patientId);
                    let slotId = appointment.resource.slot[0].reference.split("/")[1];
                    let slot = orgResource.data.entry.find(e => e.resource.id == slotId);
                    let locationId = appointment.resource.participant[1].actor.reference.split("/")[1];
                    let location = orgResource.data.entry.find(e => e.resource.id == locationId);
                    let name = patient.resource.name[0].given[0] + " " + patient.resource.name[0].family;
                    let message = `Dear ${name},\nYou have an appointment in ${location.resource.name} on ${formatDate(new Date(slot.resource.start))} at ${new Date(slot.resource.start).toLocaleTimeString()}.`;
                    let phoneNumber = patient.resource.telecom.find(e => e.system == "phone");
                    let email = patient.resource.telecom.find(e => e.system == "email");
                    console.info(phoneNumber)
                    if(phoneNumber)
                         await sendSms(phoneNumber.value, message);
                    else {
                        let mailData = {
                            to: [{ email: email.value }],
                            subject: util.format(`${(emailContent.find(e => e.notification_type_id == 2).subject)}`,),
                            content: util.format(`${(emailContent.find(e => e.notification_type_id == 2).content)}`, name, location.resource.name, formatDate(new Date(slot.resource.start)), new Date(slot.resource.start).toLocaleTimeString())
                        }
                        console.info("check mail data")
                        let messageDetail = await sendEmail(mailData);
                        console.info(messageDetail)
                    }
                }
        }
    }
    catch(e) {
        console.error(e)
    }
}

function formatDate(date) {
    var d = new Date(date),
    month = '' + (d.getMonth() + 1),
    day = '' + d.getDate(),
    year = d.getFullYear();

if (month.length < 2) 
    month = '0' + month;
if (day.length < 2) 
    day = '0' + day;

return [year, month, day].join('-');
}

module.exports = { appointmentList }