const filterByResourceType = (responseData, resType) => {
    return responseData.filter(e => e.resource.resourceType == resType);
}

const setPatientResponse  = (resType, reqMethod, responseData) => {
    let filteredData = [];
    let response = [];
    if (["post", "POST", "put", "PUT"].includes(reqMethod)){
        filteredData = filterByResourceType(responseData, resType);
    }
    response = setDefaultResponse(resType, reqMethod, filteredData);
    return response;
}

const setAppointmentResponse = (resType, reqMethod, responseData) => {
    let filteredData = [];
    let response = [];
    if (["post", "POST", "put", "PUT"].includes(reqMethod)){
        filteredData = filterByResourceType(responseData, resType);
    }
    else if(["patch", "PATCH"].includes(reqMethod)){
        filteredData = responseData.filter(e => e.fullUrl.split("/")[0] == resType)
    }

    response = setDefaultResponse(resType, reqMethod, filteredData);
    return response;
}

const setMedicationRequestResponse = (resType, reqMethod, responseData) => {
    let filteredData = [];
    let response = [];
    if(["post", "POST", "put", "PUT"].includes(reqMethod) && resType == "MedicationRequest") {
        filteredData = responseData.filter(e => e.resource.resourceType != resType && e.resource.resourceType == "Encounter");            
        filteredData = filteredData.map(e => {              
            let medReqData = responseData.filter(medReq => medReq.resource.resourceType == "MedicationRequest" && medReq.resource.identifier[1].value == e.resource.identifier[0].value)
            console.info("medReqData", medReqData)
            medReqData = medReqData.map(element => {
                return {
                    medReqUuid :element.resource.identifier[0].value, 
                    medReqFhirId : element.response.location.substring(element.response.location.indexOf("/") + 1, element.response.location.indexOf("/_history"))
                }
            })
            e.prescription = medReqData
            return e
        });    
    }

    filteredData.forEach(element => {
        let data = getResponseData(element, reqMethod);
        data.fhirId = getFhirId(element, reqMethod);
        data.err = getDataError(element, resType);
        data.id = element?.resource?.identifier?.[0]?.value;
        data.prescription = element?.prescription || [];
        response.push(data);
    });
    return response;

}



const setCVDResponse = (resType, reqMethod, responseData) => {
    let filteredData = [];
    let response = [];
    if(["post", "POST"].includes(reqMethod)){
        filteredData = responseData.filter(e => e.resource.resourceType == "Encounter" && e.resource?.type?.[0]?.coding?.[0]?.code == "cvd-encounter");
    }
    else if(["patch", "PATCH"].includes(reqMethod)) {
        filteredData = responseData.filter(e => e.fullUrl.split("/")[0] == "Observation");
    }

    filteredData.forEach(element => {
        let data = getResponseData(element, reqMethod);
        data.fhirId = getFhirId(element, reqMethod);
        data.err = getDataError(element, resType);
        if(["patch", "PATCH"].includes(reqMethod)){
            let decode = Buffer.from(element.resource.data, 'base64').toString('utf-8');
            decode = JSON.parse(decode);
            let id = decode[0].encounterId;
            data.id = id;
            data.fhirId = id;
        }
        else if(["post", "POST"].includes(reqMethod)){
            data.id = element?.resource?.identifier?.[element?.resource?.identifier?.length - 1]?.value || null;
        }
        response.push(data);
    });
    return response;
}

const setObservationResponse = (resType, reqMethod, responseData) => {
    let filteredData = [];
    let response = [];
    if(["post", "POST"].includes(reqMethod)){
        filteredData = responseData.filter(e => e.resource.resourceType == "Encounter" && e.resource?.type?.[0]?.coding?.[0]?.code == "vital-encounter");
    }
    else if(["patch", "PATCH"].includes(reqMethod)){
        filteredData = responseData.filter(e => e.fullUrl.split("/")[0] == "Observation");
    }

    filteredData.forEach(element => {
        let data = getResponseData(element, reqMethod);
        data.err = getDataError(element, resType);
        data.fhirId = getFhirId(element, reqMethod);
        if(["patch", "PATCH"].includes(reqMethod)){
            let decode = Buffer.from(element.resource.data, 'base64').toString('utf-8');
            decode = JSON.parse(decode);
            let id = decode[0].encounterId;
            data.id = id;
            data.fhirId = id;
        }
        else if(["post", "POST"].includes(reqMethod)){
            data.id = element?.resource?.identifier?.[element?.resource?.identifier?.length - 1]?.value || null;
        }
    
        response.push(data);
    });
    return response;
}

const setPrescriptionFileResponse = (resType, reqMethod, responseData) => {
    let filteredData = [];
    let response = [];
    if(["post", "POST"].includes(reqMethod)){
        filteredData = responseData.filter(e => e.resource.resourceType == "Encounter");
        let medicationRequest = responseData.filter(e => e.resource.resourceType == "MedicationRequest");
        let documentRefs = responseData.filter(e => e.resource.resourceType == "DocumentReference");
        filteredData = filteredData.map((e) => {
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
    else if(["delete", "DELETE"].includes(reqMethod)){
        filteredData = responseData.filter(e => e.request.url.split('/')[0] == "Encounter");
        filteredData.forEach((element) => {
            response.push({
                status: element.response.status,
                id: null,
                err: null,
                fhirId: element.response.location.split('/')[1]
            });
        });
        return response;
    }

    filteredData.forEach(element => {
        let data = getResponseData(element, reqMethod);
        if(element.resource.resourceType == "Encounter"){
            data.id = element?.resource?.identifier?.[element?.resource?.identifier?.length - 1]?.value || null;
        }
        data.prescriptionFiles = element.documents;
        data.err = getDataError(element, resType);
        data.fhirId = getFhirId(element, reqMethod);
        response.push(data);
    });
    return response;
}

const setMedicationDispenseResponse = (resType, reqMethod, responseData, reqInput) => {
    let filteredData = [];
    let response = [];
    if(["post", "POST", "put", "PUT"].includes(reqMethod)) {
        // console.log("responseData: ", responseData, "--------------------------------------------------")
        filteredData = responseData.filter(e => e.resource.resourceType == "Encounter" && e.resource.type && e.resource.type[0].coding[0].code == "dispensing-encounter");
        let medDispenseData = responseData.filter(e => e.resource.resourceType == "MedicationDispense").map(e => { 
            return {
                "medDispenseUuid" : e.resource.identifier[0].value, 
                "medDispenseFhirId": e.response.location.substring(e.response.location.indexOf("/") + 1, e.response.location.indexOf("/_history"))
            }
        });
        //  filtered data contains sub encounters for the date nad time capture
        filteredData = filteredData.map(subEnc => {
            let dispenseData = reqInput.filter(inp => inp.dispenseId == subEnc.resource.identifier[0].value);
            console.log("dispenseData: ", dispenseData)
            let medicineDispensedList = dispenseData[0].medicineDispensedList.map((medDisp) => {
                const medDispenseIndex = medDispenseData.findIndex(output => medDisp.medDispenseUuid == output. medDispenseUuid);
                if(medDispenseIndex != -1){
                    return medDispenseData[medDispenseIndex]
                }    
            });
            console.log("medicineDispensedList: ", medicineDispensedList)
            subEnc.medicineDispensedList = medicineDispensedList;
            return subEnc;
        })
        console.log("medDispenseData filteredData: ", filteredData)
    }

    filteredData.forEach(element => {
        let data = getResponseData(element, reqMethod);
        data.medicineDispensedList = element?.medicineDispensedList || [];
        data.err = getDataError(element, resType);
        data.fhirId = getFhirId(element, reqMethod);
        response.push(data);
    });

    return response;
}

const setDiagnosticReportResponse = (resType, reqMethod, responseData) => {
    let filteredData = [];
    let response = [];
    if(["post", "POST"].includes(reqMethod)) {
        filteredData = responseData.filter(e => e.resource.resourceType == resType);
        let documentRefs = responseData.filter(e => e.resource.resourceType == "DocumentReference");
        filteredData = filteredData.map((e) => {
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

    filteredData.forEach(element => {
        let data = getResponseData(element, reqMethod);
        data.files = element.documents;
        data.err = getDataError(element, resType);
        data.fhirId = getFhirId(element, reqMethod);
        response.push(data);
    });
    return response;
}

const setDocumentManifestResponse = (resType, reqMethod, responseData) => {
    let filteredData = [];
    let response = [];
    if(["post", "POST"].includes(reqMethod)){
        filteredData = responseData.filter(e => e.resource.resourceType == resType);
        let documentRefs = responseData.filter(e => e.resource.resourceType == "DocumentReference");
        filteredData = filteredData.map((e) => {
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

    filteredData.forEach(element => {
        let data = getResponseData(element, reqMethod);
        data.files = element.documents;
        data.err = getDataError(element, resType);
        data.fhirId = getFhirId(element, reqMethod);
        response.push(data);
    });
    return response;
}

const setConditionResponse = (resType, reqMethod, responseData) => {
    let filteredData = [];
    let response = [];
    if(["post", "POST"].includes(reqMethod)) {
        filteredData = responseData.filter(e => e.resource.resourceType == "Encounter" && e.resource?.type?.[0]?.coding?.[0]?.code == "symptom-diagnosis-encounter");
    }
    else if(["patch", "PATCH"].includes(reqMethod)) {
        console.log("check --> ", responseData)
        filteredData = responseData.filter(e => e.resource && e.resource.resourceType == "Encounter");
    }

    response = setDefaultResponse(resType, reqMethod, filteredData);
    return response;
}

const setDefaultResponse = (resType, reqMethod, responseData) => {
    console.info("response data",responseData)
    let response = [];
    let filteredData = responseData;
    filteredData.forEach(element => {
        let data = getResponseData(element, reqMethod);
        data.err = getDataError(element, resType);
        data.fhirId = getFhirId(element, reqMethod);
        response.push(data);
    });
    console.info("response",response);
    return response;
}

const getResponseData = (element, reqMethod) => {
    let data = {};
    let fullUrl = element.fullUrl.substring(element.fullUrl.indexOf("/") + 1, element.fullUrl.length);
    let id = (fullUrl.includes("uuid:")) ? fullUrl.split("uuid:")[1] : fullUrl;
    data.status = element.response.status;
    data.id = ["patch", "PATCH"].includes(reqMethod) ? null : id;
    return data;
}

const getDataError = (element, resType) => {
    let error;
    switch(element.response.status){
        case "201 Created":
            error = null;
            break;
        case "200 OK":
            if(resType == "Schedule") {
                error = "Schedule already exists"
            }
            else {
                error = null;
            }
            break;
        default:
            error = element.response.outcome;
            break;
    }
    return error;
}

const getFhirId = (element, reqMethod) => {
    let fhirId;
    switch(element.response.status){
        case "200 OK":
        case "201 Created":
            fhirId = element.response.location.substring(element.response.location.indexOf("/") + 1, element.response.location.indexOf("/_history"));
            break;
        default:
            if(["PATCH", "patch"].includes(reqMethod)) {
                fhirId = element.fullUrl.substring(element.fullUrl.indexOf("/") + 1, element.fullUrl.length);;
            }
            else {
                fhirId = null;
            }
            break;
    }
    return fhirId;
}

module.exports = { setPatientResponse, setAppointmentResponse, setMedicationRequestResponse, setCVDResponse, setObservationResponse, setPrescriptionFileResponse, setMedicationDispenseResponse, setDiagnosticReportResponse, setDocumentManifestResponse, setConditionResponse, setDefaultResponse }