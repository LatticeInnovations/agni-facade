let patient = require("./managePatientOperation");
let relatedPerson = require("./manageRelatedPersonOperation");
let medication = require("./manageMedication");
let medRequest = require("./manageMedicationRequestOperation");
let organization = require("./manageOrganization");
let practitioner = require("./managePractitioner");
let practitionerRole = require("./managePractitionerRole");
let schedule= require("./manageSchedule")
let appointment = require("./manageAppointment");
let cvd = require('./manageCVD');
let vitals = require("./manageVitals");
let medDispense = require("./manageMedicineDispense");
let prescriptionFile = require("./managePrescriptionDocument"); 
let documentReference = require("./manageDocuments");
let labReports = require('./manageLabReports');
let medicalRecord = require('./manageMedicalRecord');
let symDiag = require("./manageSymptomsAndDiagnosis");
let ImmunizationRecommendation = require('./manageImmunizationRecommendation');
let immunization = require("./manageImmunization")
let { setPatientResponse, setAppointmentResponse, setMedicationRequestResponse, setCVDResponse, setObservationResponse, setPrescriptionFileResponse, setMedicationDispenseResponse, setDiagnosticReportResponse, setDocumentManifestResponse, setConditionResponse, setDefaultResponse } = require('./manageResponses');
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
            case "CVD": bundleData = await cvd.setCVDData(resType, inputData, FHIRData, reqMethod, reqQuery, token);
            break;
            case "Observation" : bundleData = await vitals.setVitalsData(resType, inputData, FHIRData, reqMethod, reqQuery, token);
            break;
            case "MedicationDispense" :
            case "DispenseLog":  bundleData = await medDispense.setMedicationDispenseData(resType, inputData, FHIRData, reqMethod, reqQuery, token);
            break;
            case "PrescriptionFile" : bundleData = await prescriptionFile.setPrescriptionDocument(resType, inputData, FHIRData, reqMethod, reqQuery, token);
            break;
            case "DocumentReference" : bundleData = await documentReference.setDocumentReference(resType, inputData, FHIRData, reqMethod, reqQuery, token);
            break;
            case "DiagnosticReport": bundleData = await labReports.setLabReportData(resType, inputData, FHIRData, reqMethod, reqQuery, token);
            break;
            case "DocumentManifest": bundleData = await medicalRecord.setMedicalRecordData(resType, inputData, FHIRData, reqMethod, reqQuery, token);
            break;
            case "ValueSet" : bundleData = await symDiag.manageValueSetData(resType, inputData, FHIRData, reqMethod, reqQuery, token);
            break;
            case "Condition": bundleData = await symDiag.setConditionData(resType, inputData, FHIRData, reqMethod, reqQuery, token);
            break;
            case "ImmunizationRecommendation": bundleData = await ImmunizationRecommendation.setImmunizationRecommendationData(resType, inputData, FHIRData, reqMethod, reqQuery, token);
            break;
            case "Immunization": bundleData = await immunization.manageImmunizationDetail(resType, inputData, FHIRData,reqMethod,reqQuery,token);
            break;
        }
        return bundleData;
    }
    catch (e) {
        return Promise.reject(e);
    }
}

const getBundleResponse = async (bundleResponse, reqData, reqMethod, resType, reqInput) => {
    try{
        let response = [];
        let responseData = bundleResponse.map((data, i) => Object.assign({}, data, reqData[i]));
        switch(resType) {
            case "Patient":
                response = setPatientResponse(resType, reqMethod, responseData);
                break;
            case "Appointment" : 
                response = setAppointmentResponse(resType, reqMethod, responseData);
                break;
            case "MedicationRequest":
                response = setMedicationRequestResponse(resType, reqMethod, responseData);
                break;
            case "CVD":
                response = setCVDResponse(resType, reqMethod, responseData);
                break;
            case "Observation":
                response = setObservationResponse(resType, reqMethod, responseData);
                break;
            case "PrescriptionFile":
                response = setPrescriptionFileResponse(resType, reqMethod, responseData);
                break;
            case "MedicationDispense":
                response = setMedicationDispenseResponse(resType, reqMethod, responseData, reqInput);
                break;
            case "DiagnosticReport":
                response = setDiagnosticReportResponse(resType, reqMethod, responseData);
                break;
            case "DocumentManifest":
                response = setDocumentManifestResponse(resType, reqMethod, responseData);
                break;
            case "Condition":
                response = setConditionResponse(resType, reqMethod, responseData);
                break;
            default:
                response = setDefaultResponse(resType, reqMethod, responseData);
                break;
        } 
        return response;
    }  
    catch(e){
        return Promise.reject(e);
    }
}

let getDeleteBundleResponse = async (bundleResponse, reqData, reqMethod, resType, reqInput) => {
    try{
        let response = [], filtereredData = [];
        let mergedArray = bundleResponse.map((data, i) => Object.assign({}, data, reqData[i]));
        console.info("mergedarray", JSON.stringify(mergedArray));
        switch(resType){
            case "PrescriptionFile": filtereredData = mergedArray.filter(e => e.request.url.split('/')[0] == "Encounter");
                console.info("filteredArray", JSON.stringify(filtereredData));
                filtereredData.forEach((element) => {
                    response.push({
                        status: element.response.status,
                        id: null,
                        err: null,
                        fhirId: element.response.location.split('/')[1]
                    });
                });
                break;
            case "DocumentManifest": filtereredData = mergedArray.filter(e => e.request.url.split('/')[0] == "DocumentManifest");
                console.info("filteredArray", JSON.stringify(filtereredData));
                filtereredData.forEach((element) => {
                    response.push({
                        status: element.response.status,
                        id: null,
                        err: null,
                        fhirId: element.response.location.split('/')[1]
                    });
                });
                break;
            case "DiagnosticReport": filtereredData = mergedArray.filter(e => e.request.url.split('/')[0] == "DiagnosticReport");
                console.info("filteredArray", JSON.stringify(filtereredData));
                filtereredData.forEach((element) => {
                    response.push({
                        status: element.response.status,
                        id: null,
                        err: null,
                        fhirId: element.response.location.split('/')[1]
                    });
                });
                break;
            default: filtereredData = mergedArray; 
                break;
        }
        console.info("filetered Data", JSON.stringify(filtereredData));
        return response;
    }
    catch(e){
        return Promise.reject(e);
    }
}




module.exports = { getResource, getBundleResponse, getDeleteBundleResponse }