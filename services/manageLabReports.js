let bundleOp = require("./bundleOperation");
let config = require("../config/nodeConfig");
const DiagnosticReport = require("../class/DiagnosticReport");
const DocumentReference = require("../class/DocumentReference");
const Encounter = require("../class/encounter");
let bundleFun = require("./bundleOperation");
const { v4: uuidv4 } = require('uuid');

const setLabReportData = async (resType, reqInput, FHIRData, reqMethod, reqQuery, token) => {
    try{
        let resourceResult = [], errData = [];
        if (["post", "POST", "PUT", "put"].includes(reqMethod)) {
            console.log("create lab report section");
            for(let labReport of reqInput){ 
                let encounterData = await bundleOp.searchData(config.baseUrl + "Encounter", { "appointment": labReport.appointmentId, _count: 5000 , "_include": "Encounter:appointment" }, token);
                
                labReport.encounterId = encounterData.data.entry[0].resource.id;
                let documents = [];
                for(let file of labReport.files) {
                    let document = new DocumentReference({
                        uuid: file.labDocumentUuid,
                        filename: file.filename, 
                        note: file.note
                    }, {}).getJSONtoFhir();
                    documents.push(document);
                    document = await bundleFun.setBundlePost(document, document.identifier, document.id, "POST", "identifier");
                    resourceResult.push(document);
                }
                labReport.documents = documents;
                let report = new DiagnosticReport(labReport, {}).getUserInputToFhir(); 
                report = await bundleFun.setBundlePost(report, null, labReport.diagnosticUuid, "POST", "identifier");
                resourceResult.push(report);
            }
        }
        else {
            console.log("Fetch lab report section");
            let encounterList = FHIRData.filter(e => e.resource.resourceType == "Encounter").map(e => e.resource);
            for(let encounter of encounterList){
                let report = new Encounter({}, encounter);
                report.getFhirToJson();
                let reportData = report.getEncounterResource();
                delete reportData.prescriptionId;
            
                let reportList = FHIRData.filter(e => e.resource.resourceType == "DiagnosticReport" && e.resource.encounter.reference == "Encounter/"+encounter.id).map(e => e.resource);
                reportData.diagnosticReport = [];
                for(let diagnosticReport of reportList){
                    let data = new DiagnosticReport(reportData ,diagnosticReport).getFHIRToUserData();
                    console.log("documentIds", data.documentIds);
                    if(data.documentIds.length > 0){
                        let documentReferenceResponse = await bundleOp.searchData(config.baseUrl + "DocumentReference", { "_id": data.documentIds.join(','), _count: 5000 }, token);
                        let documentReferenceData = documentReferenceResponse.data.entry;
                        data.documents = fetchDocumentData(documentReferenceData);
                        delete data.documentIds;
                        reportData.diagnosticReport.push(data);
                    }
                    else {
                        delete data.documentIds;
                        data.documents = [];
                        reportData.diagnosticReport.push(data);
                    }
                }
                delete reportData.labReport;
                if(reportData.diagnosticReport.length > 0){
                    resourceResult.push(reportData);
                }
            }
        }
        return { resourceResult, errData };
    }
    catch(e){
        return Promise.reject(e);
    }
}

const fetchDocumentData = (documents) => {
    let result = [];
    for(let document of documents){
        console.info(document.resource)
        let documentData = new DocumentReference({}, document.resource).getFHIRToJSONForLabReport();
        result.push(documentData)
    }
    return result;
}

module.exports = { setLabReportData };