let patient = require("./managePatientOperation");
let relatedPerson = require("./manageRelatedPersonOperation");
let medication = require("./manageMedication");
let medRequest = require("./manageMedicationRequestOperation");
let organization = require("./manageOrganization");
let practitioner = require("./managePractitioner");
let practitionerRole = require("./managePractitionerRole");
let schedule= require("./manageSchedule")
let appointment = require("./manageAppointment");
let getResource = async function (resType, inputData, FHIRData, reqMethod, reqQuery, token) {
    try {
        let bundleData = [];
        switch (resType) {
            case "Patient":
                bundleData = await patient.setPatientData(resType, inputData, FHIRData, reqMethod, token);
                break;
            case "RelatedPerson":
                bundleData = await relatedPerson.setRelatedPersonData(inputData, FHIRData, reqMethod);
                break;
            case "Medication":  bundleData =await medication.setMedicationData(resType, inputData, FHIRData, reqMethod);
            break;
            case "MedicationRequest": bundleData = await medRequest.setMedicationRequestData(resType, inputData, FHIRData, reqMethod);
            break;
            case "Organization": bundleData = await organization.setOrganizationData(resType, inputData, FHIRData, reqMethod);  
            break;
            case "Practitioner" : bundleData = await practitioner.setPractitionerData(resType, inputData, FHIRData, reqMethod);  
            break;
            case "PractitionerRole": bundleData = await practitionerRole.setPractitionerRoleData(resType, inputData, FHIRData, reqMethod); 
            break; 
            case "Schedule" : bundleData = await schedule.setScheduleData(resType, inputData, FHIRData, reqMethod);
            break;
            case "Appointment" : bundleData = await appointment.setApptData(resType, inputData, FHIRData, reqMethod, reqQuery);
             break;
        }

        return bundleData;
    }
    catch (e) {
        return Promise.reject(e);
    }
}

let getBundleResponse = async function (bundleResponse, reqData, reqMethod, resType) {
    try {
        let response = [], filtereredData = [];
        let mergedArray = bundleResponse.map((data, i) => Object.assign({}, data, reqData[i]));
        console.info(mergedArray[0].fullUrl.split("/")[0], reqMethod, resType)
        if (["post", "POST", "put", "PUT"].includes(reqMethod) && (resType == "Patient"|| resType == "Appointment"))
            filtereredData = mergedArray.filter(e => e.resource.resourceType == resType);
        else if(["post", "POST", "put", "PUT"].includes(reqMethod) && resType == "MedicationRequest") {
            filtereredData = mergedArray.filter(e => e.resource.resourceType != resType && e.resource.resourceType != "Appointment");
        }
        else if(["patch", "PATCH"].includes(reqMethod) && resType == "Appointment")
            filtereredData = mergedArray.filter(e => e.fullUrl.split("/")[0] == resType);
        else
            filtereredData = mergedArray;
            console.info("filetered Data")
        filtereredData.forEach(element => {
            let fullUrl = element.fullUrl.substring(element.fullUrl.indexOf("/") + 1, element.fullUrl.length);
            let id = (fullUrl.includes("uuid:")) ? fullUrl.split("uuid:")[1] : fullUrl;
            if(resType == "MedicationRequest") {
                console.info(element.resource.identifier);
                id = element?.resource?.identifier?.[1]?.value;
            }
            // need to see the or statment to be removed
            
            let data = {
                status: element.response.status,
                id: ["patch", "PATCH"].includes(reqMethod) ? null : id,
            }
            if(element.response.status == "200 OK" && resType == "Schedule") {
                data.err = "Schedule already exists"
            }
            else if(element.response.status == "200 OK" || element.response.status == "201 Created" ) {
                data.err = null
            }
            else {
                data.err = element.response.outcome
            }
            let fhirid = element.response.status == "200 OK" || element.response.status == "201 Created" ? element.response.location.substring(element.response.location.indexOf("/") + 1, element.response.location.indexOf("/_history")) : (reqMethod == "PATCH" ? fullUrl : null)
                data.fhirId = fhirid
            response.push(data);
        });

        return response;
    } catch (e) {
        return Promise.reject(e);
    }
}




module.exports = { getResource, getBundleResponse }