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
        }
        return bundleData;
    }
    catch (e) {
        return Promise.reject(e);
    }
}

let getBundleResponse = async function (bundleResponse, reqData, reqMethod, resType, reqInput) {
    try {
        let response = [], filtereredData = [];
        let mergedArray = bundleResponse.map((data, i) => Object.assign({}, data, reqData[i]));
        console.info(mergedArray?.[0]?.fullUrl?.split?.("/")?.[0], reqMethod, resType);
        if (["post", "POST", "put", "PUT"].includes(reqMethod) && (resType == "Patient"|| resType == "Appointment"))
            filtereredData = mergedArray.filter(e => e.resource.resourceType == resType);
        else if(["post", "POST", "put", "PUT"].includes(reqMethod) && resType == "MedicationRequest") {
            filtereredData = mergedArray.filter(e => e.resource.resourceType != resType && e.resource.resourceType == "Encounter");            
            filtereredData = filtereredData.map(e =>{              
                let medReqData = mergedArray
                .filter(medReq => medReq.resource.resourceType == "MedicationRequest" && medReq.resource.identifier[1].value == e.resource.identifier[0].value)
                console.info("medReqData", medReqData)
                medReqData = medReqData.map(element => {
                    return {
                        medReqUuid :element.resource.identifier[0].value, 
                        medReqFhirId : element.response.location.substring(element.response.location.indexOf("/") + 1, element.response.location.indexOf("/_history"))
                    }
                })
                e.prescription = medReqData
                return e
            })    
        }
        else if(["patch", "PATCH"].includes(reqMethod) && resType == "Appointment")
            filtereredData = mergedArray.filter(e => e.fullUrl.split("/")[0] == resType);
        else if(["post", "POST"].includes(reqMethod) && resType == "CVD"){
            filtereredData = mergedArray.filter(e => e.resource.resourceType == "Encounter" && e.resource?.type?.[0]?.coding?.[0]?.code == "cvd-encounter");
        }
        else if(["patch", "PATCH"].includes(reqMethod) && resType == "CVD"){
            filtereredData = mergedArray.filter(e => e.fullUrl.split("/")[0] == "Observation");
        }
        else if(["post", "POST"].includes(reqMethod) && resType == "Observation"){
            filtereredData = mergedArray.filter(e => e.resource.resourceType == "Encounter" && e.resource?.type?.[0]?.coding?.[0]?.code == "vital-encounter");
        }
        else if(["patch", "PATCH"].includes(reqMethod) && resType == "Observation"){
            filtereredData = mergedArray.filter(e => e.fullUrl.split("/")[0] == "Observation");
        }
        else if(["post", "POST"].includes(reqMethod) && resType == "PrescriptionFile"){
            filtereredData = mergedArray.filter(e => e.resource.resourceType == "Encounter");
            let medicationRequest = mergedArray.filter(e => e.resource.resourceType == "MedicationRequest");
            let documentRefs = mergedArray.filter(e => e.resource.resourceType == "DocumentReference");
            filtereredData = filtereredData.map((e) => {
                e.documents = [];
                let med = medicationRequest.find((m) => {return m.resource.encounter.reference.split(':')[2] == e.resource.id });
                
                med.resource.supportingInformation.forEach((m) => {
                    let doc = documentRefs.find((d) => { return d.resource.id == m.reference.split(':')[2] });
                    e.documents.push({
                        documentfhirId: doc.response.location.split('/')[1],
                        documentUuid: doc.resource.id,
                    });
                });
                return e;
            });
        }
        else if(["delete", "DELETE"].includes(reqMethod) && resType == "PrescriptionFile"){
            filtereredData = mergedArray.filter(e => e.request.url.split('/')[0] == "Encounter");
        }
        else if(["post", "POST", "put", "PUT"].includes(reqMethod) && resType == "MedicationDispense") {
            // console.log("mergedArray: ", mergedArray, "--------------------------------------------------")
            filtereredData = mergedArray.filter(e => e.resource.resourceType == "Encounter" && e.resource.type && e.resource.type[0].coding[0].code == "dispensing-encounter")
            let medDispenseData = mergedArray.filter(e => e.resource.resourceType == "MedicationDispense").map(e => 
               { return {"medDispenseUuid" : e.resource.identifier[0].value, 
                    "medDispenseFhirId": e.response.location.substring(e.response.location.indexOf("/") + 1, e.response.location.indexOf("/_history"))
                }});
            //  filtered data contains sub encounters for the date nad time capture
                filtereredData = filtereredData.map(subEnc => {
                let dispenseData = reqInput.filter(inp => inp.dispenseId == subEnc.resource.identifier[0].value)
                console.log("dispenseData: ", dispenseData)
                let medicineDispensedList = dispenseData[0].medicineDispensedList.map((medDisp) => {
                    const medDispenseIndex = medDispenseData.findIndex(output => medDisp.medDispenseUuid == output. medDispenseUuid)
                    if(medDispenseIndex != -1)
                        return medDispenseData[medDispenseIndex]
                });
                console.log("medicineDispensedList: ", medicineDispensedList)
                subEnc.medicineDispensedList = medicineDispensedList
                return subEnc
            })
            console.log("medDispenseData filtereredData: ", filtereredData)
        }
        else if(["post", "POST"].includes(reqMethod) && (resType == "DiagnosticReport")){
            filtereredData = mergedArray.filter(e => e.resource.resourceType == resType);
            let documentRefs = mergedArray.filter(e => e.resource.resourceType == "DocumentReference");
            filtereredData = filtereredData.map((e) => {
                e.documents = [];
                e?.resource?.extension?.forEach((m) => {
                    let doc = documentRefs.find((d) => { return d.resource.id == m.valueReference.reference.split('/')[1].split(':')[2] });
                    e.documents.push({
                        labDocumentfhirId: doc.response.location.split('/')[1],
                        labDocumentUuid: doc.resource.id,
                    });
                });
                return e;
            });
        }
        else if(["post", "POST"].includes(reqMethod) && (resType == "DocumentManifest")){
            filtereredData = mergedArray.filter(e => e.resource.resourceType == resType);
            let documentRefs = mergedArray.filter(e => e.resource.resourceType == "DocumentReference");
            filtereredData = filtereredData.map((e) => {
                e.documents = [];
                e?.resource?.content?.forEach((m) => {
                    let doc = documentRefs.find((d) => { return d.resource.id == m.reference.split('/')[1].split(':')[2] });
                    e.documents.push({
                        "medicalDocumentfhirId": doc.response.location.split('/')[1],
                        "medicalDocumentUuid": doc.resource.id,
                    });
                });
                return e;
            });
        }
        else
            filtereredData = mergedArray;
            console.info("filetered Data", JSON.stringify(filtereredData))
        filtereredData.forEach(element => {
            let fullUrl = element.fullUrl.substring(element.fullUrl.indexOf("/") + 1, element.fullUrl.length);
            let id = (fullUrl.includes("uuid:")) ? fullUrl.split("uuid:")[1] : fullUrl;
            if(resType == "MedicationRequest") {
                id = element?.resource?.identifier?.[0]?.value;
            }
            else if(resType == "CVD" && ["post", "POST"].includes(reqMethod)){
                id = element?.resource?.identifier?.[element?.resource?.identifier?.length - 1]?.value || null
            }
            else if((resType == "CVD" || resType == "Observation") && ["patch", "PATCH"].includes(reqMethod)){
                let decode = Buffer.from(element.resource.data, 'base64').toString('utf-8');
                decode = JSON.parse(decode);
                id = decode[0].encounterId;
            }
            else if(resType == "Observation" && ["post", "POST"].includes(reqMethod)){
                id = element?.resource?.identifier?.[element?.resource?.identifier?.length - 1]?.value || null
            }
            else if(resType == "PrescriptionFile" && element.resource.resourceType == "Encounter"){
                id = element?.resource?.identifier?.[element?.resource?.identifier?.length - 1]?.value || null
            }
            // need to see the or statment to be removed
            
            let data = {
                status: element.response.status,
                id: ["patch", "PATCH"].includes(reqMethod) ? null : id,
            }
            if(resType == "MedicationRequest") {
                data.prescription = element?.prescription || []
            }
            if(resType == "MedicationDispense") {
                data.medicineDispensedList = element?.medicineDispensedList || []
            }
            if(resType == "PrescriptionFile"){
                data.prescriptionFiles = element.documents;
            }
            if(resType == "DiagnosticReport" || resType == "DocumentManifest"){
                data.files = element.documents;
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
            
            if((resType == "CVD" || resType == "Observation") && reqMethod == "PATCH"){
                data.fhirId = id;
            }
            response.push(data);
        });

        return response;
    } catch (e) {
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
            case "default": filtereredData = mergedArray; 
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