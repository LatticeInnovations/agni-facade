const axios = require('axios');
const config = require("../config/nodeConfig");
let sendSms = require('../utils/twilio.util');
let sendEmail = require("../utils/sendgrid.util").sendEmail

const parseData = (resource) => {
    let resourceData = resource?.data?.entry || [];
    return resourceData.map((data) => data?.resource?.id);
}

const getAllDocuments = (resource) => {
    let resourceData = resource?.data?.entry || [];
    let docIds = [];
    resourceData.forEach((data) => {
        data?.resource?.supportingInformation?.map((doc) => {
            docIds.push(doc.reference.split('/')[1])
        })
    })
    return docIds;
}

const deleteData = async (data) => {
    let practitionerRoleIds = [];
    let locationIds = [];
    let patientIds = [];
    let relatedPersonIds = [];
    let personIds = [];
    let appointmentIds = [];
    let encounterIds = [];
    let scheduleIds = [];
    let slotIds = [];
    let medicationReqIds = [];
    let documentRefIds = [];
    try{
        let userId = data.userId;
        let orgId = data.orgId;
        let email = data.email;
        let mobile = data.mobile;
        let practitionerRole = await axios.get(config.baseUrl+`PractitionerRole?practitioner=Practitioner/${userId}`);
        practitionerRoleIds = parseData(practitionerRole);
        
        let location = await axios.get(config.baseUrl+`Location?organization=Organization/${orgId}`);
        locationIds = parseData(location);
        let patients = await axios.get(config.baseUrl+`Patient?general-practitioner=Practitioner/${userId}&_count=100000`);
        patientIds = parseData(patients);
        if(patientIds.length > 0){
            let relatedPerson = await axios.get(config.baseUrl+`RelatedPerson?patient=${patientIds.join(',')}&_count=10000`);
            relatedPersonIds = parseData(relatedPerson);
            let person = await axios.get(config.baseUrl+`Person?link=${patientIds.map((id) => 'Patient/'+id).join(',')}&_count=100000`);
            personIds = parseData(person);

            let medicationReq = await axios.get(config.baseUrl+`MedicationRequest?subject=${patientIds.join(',')}&_count=100000`);
            medicationReqIds = parseData(medicationReq)
            documentRefIds = getAllDocuments(medicationReq)
        }

        if(locationIds.length > 0){
            let appointment = await axios.get(config.baseUrl+`Appointment?actor=${locationIds.map((id) => 'Location/'+id).join(',')}&_count=100000`);
            appointmentIds = parseData(appointment)

             let schedule = await axios.get(config.baseUrl+`Schedule?actor=${locationIds.map((id) => 'Location/'+id).join(',')}&_count=100000`);
            scheduleIds = parseData(schedule)
        }
        
        if(scheduleIds.length > 0){
            let slot = await axios.get(config.baseUrl+`Slot?schedule=${scheduleIds.map((id) => 'Schedule/'+id).join(',')}&_count=100000`);
            slotIds = parseData(slot)
        }
        
        if(appointmentIds.length > 0){
            let encounter = await axios.get(config.baseUrl+`Encounter?appointment=${appointmentIds.map((id) => 'Appointment/'+id).join(',')}&_count=100000`);
            encounterIds = parseData(encounter)
        }
       
        console.info("practitionerRole",practitionerRoleIds)
        console.info("location",locationIds)
        console.info("patients", patientIds)
        console.info("related person", relatedPersonIds)
        console.info("person", personIds)
        console.info("appointments", appointmentIds)
        console.info("encounter",encounterIds)
        console.info("schedules", scheduleIds)
        console.info("slots", slotIds)
        console.info("medicationreqs", medicationReqIds)
        console.info("documentrefs", documentRefIds)

        let request = {
            resourceType: "Bundle",
            type: "transaction",
            entry: []
        }

        request.entry.push({
            "request": {
                  "method": "DELETE",
                  "url": "Practitioner/"+userId
                }
            },
            {
            "request": {
                  "method": "DELETE",
                  "url": "Organization/"+orgId
                }
            }
        )

        practitionerRoleIds.forEach((id) => {
            request.entry.push({
                "request": {
                  "method": "DELETE",
                  "url": "PractitionerRole/"+id
                }
              })
        })

        locationIds.forEach((id) => {
            request.entry.push({
                "request": {
                  "method": "DELETE",
                  "url": "Location/"+id
                }
              })
        })

        patientIds.forEach((id) => {
            request.entry.push({
                "request": {
                  "method": "DELETE",
                  "url": "Patient/"+id
                }
              })
        })

        relatedPersonIds.forEach((id) => {
            request.entry.push({
                "request": {
                  "method": "DELETE",
                  "url": "RelatedPerson/"+id
                }
              })
        })

        personIds.forEach((id) => {
            request.entry.push({
                "request": {
                  "method": "DELETE",
                  "url": "Person/"+id
                }
              })
        })

        appointmentIds.forEach((id) => {
            request.entry.push({
                "request": {
                  "method": "DELETE",
                  "url": "Appointment/"+id
                }
              })
        })

        encounterIds.forEach((id) => {
            request.entry.push({
                "request": {
                  "method": "DELETE",
                  "url": "Encounter/"+id
                }
              })
        })

        scheduleIds.forEach((id) => {
            request.entry.push({
                "request": {
                  "method": "DELETE",
                  "url": "Schedule/"+id
                }
              })
        })

        slotIds.forEach((id) => {
            request.entry.push({
                "request": {
                  "method": "DELETE",
                  "url": "Slot/"+id
                }
              })
        })

        medicationReqIds.forEach((id) => {
            request.entry.push({
                "request": {
                  "method": "DELETE",
                  "url": "MedicationRequest/"+id
                }
              })
        })

        documentRefIds.forEach((id) => {
            request.entry.push({
                "request": {
                  "method": "DELETE",
                  "url": "DocumentReference/"+id
                }
              })
        })

        if(request.entry.length > 0){
            await axios.post(config.baseUrl, request);
            if (email) {
                let mailData = {
                    to: [{ email: email }],
                    subject: 'Agni : Account Deleted',
                    content: 'Your account has been successfully deleted.'
                }
                await sendEmail(mailData);
            }
            
            if(mobile) {
                let text = `Your Agni account has been successfully deleted.`
                await sendSms(mobile, text);
            }
        }
    }
    catch(e){
        console.error(e)      
    }
}

module.exports = deleteData;