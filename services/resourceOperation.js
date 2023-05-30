let patient = require("./managePatientOperation");
let relatedPerson = require("./manageRelatedPersonOperation");
let medication = require("./manageMedication");
let medRequest = require("./manageMedicationRequestOperation");
let getResource = async function (resType, inputData, FHIRData, reqMethod, fetchedResourceData) {
    try {
        console.log("FHIR data in get resource", resType)
        let bundleData = [];
        switch (resType) {
            case "Patient":
                bundleData = await patient.setPatientData(resType, inputData, FHIRData, reqMethod);
                break;
            case "RelatedPerson":
                bundleData = await relatedPerson.setRelatedPersonData(inputData, FHIRData, reqMethod, fetchedResourceData)
                break;
            case "Medication":  bundleData =await medication.setMedicationData(resType, inputData, FHIRData, reqMethod)
            break;
            case "MedicationRequest": bundleData = await medRequest.setMedicationRequestData(resType, inputData, FHIRData, reqMethod);
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
        if (["post", "POST", "put", "PUT"].includes(reqMethod) && (resType == "Patient"))
            filtereredData = mergedArray.filter(e => e.resource.resourceType == resType);
        else if(["post", "POST", "put", "PUT"].includes(reqMethod) && resType == "MedicationRequest") {
            filtereredData = mergedArray.filter(e => e.resource.resourceType != "MedicationRequest");
        }
        else
            filtereredData = mergedArray;
        filtereredData.forEach(element => {
            let fullUrl = element.fullUrl.substring(element.fullUrl.indexOf("/") + 1, element.fullUrl.length)
            let id = resType == "Patient" ? fullUrl.split("uuid:")[1] : fullUrl;
            let data = {
                status: element.response.status,
                id: ["patch", "PATCH"].includes(reqMethod) ? null : id,
                err: element.response.status == "200 OK" || element.response.status == "201 Created" ? null : element.response.outcome
            }
            let fhirid = element.response.status == "200 OK" || element.response.status == "201 Created" ? element.response.location.substring(element.response.location.indexOf("/") + 1, element.response.location.indexOf("/_history")) : (reqMethod == "PATCH" ? fullUrl : null)
            if(resType == "MedicationRequest")
                data.prescriptionFhirId = fhirid
            else 
                data.fhirId = fhirid
            response.push(data);
        });

        return response;
    } catch (e) {
        return Promise.reject(e);
    }
}




module.exports = { getResource, getBundleResponse }