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
                let encounterUuid = uuidv4();
                let encounter = new Encounter({ 
                    id: encounterUuid,
                    encounterId: encounterData.data.entry[0].resource.id,
                    patientId: labReport.patientId,
                    practitionerId: token.userId,
                    createdOn: labReport.createdOn,
                    orgId: token.orgId
                }, {}).getUserInputToFhirForLabReport();
                let encounterBundle = await bundleFun.setBundlePost(encounter, encounter.identifier, encounter.id, "POST", "identifier");
                resourceResult.push(encounterBundle);
                labReport.encounterId = encounter.id;
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
        else if (["delete", "DELETE"].includes(reqMethod)){
            let diagReportIds = reqInput.join(',');
            let diagReportData = await bundleOp.searchData(config.baseUrl + "DiagnosticReport", { _id: diagReportIds, _count: 5000}, token);
            diagReportData = diagReportData?.data?.entry?.map((e) => e?.resource) || [];
            let encounterIds = diagReportData.map((e) => e.encounter.reference.split('/')[1]);
            encounterIds = encounterIds.join(',');
            let encounterData = await bundleOp.searchData(config.baseUrl + "Encounter", { _id: encounterIds, _count: 5000}, token);
            encounterData = encounterData?.data?.entry?.map((e) => e?.resource) || [];
            for(let enc of encounterData){
                let encounter = new Encounter({}, enc).deleteEncounter();
                let encounterDeleteBundle = await bundleFun.setBundlePut(encounter, encounter.identifier, encounter.id, 'PUT'); 
                resourceResult.push(encounterDeleteBundle);
            }
            let documentReferenceIds = [];
            diagReportData.forEach((diag) => {
                let documents = diag?.extension || [];
                documents.forEach((doc) => {
                    let docId = doc.valueReference.reference.split('/')[1];
                    documentReferenceIds.push(docId);
                });
            });
            documentReferenceIds = documentReferenceIds.join(',');
            let documentReferenceData = await bundleOp.searchData(config.baseUrl + "DocumentReference", { _id: documentReferenceIds, _count: 5000}, token);
            documentReferenceData = documentReferenceData?.data?.entry?.map((e) => e?.resource) || [];
            for(let diag of diagReportData){
                let diagData = new DiagnosticReport({}, diag).deleteDiagnosticReport();
                let diagReportDeleteBundle = await bundleFun.setBundlePut(diagData, diagData.identifier, diagData.id, 'PUT'); 
                resourceResult.push(diagReportDeleteBundle);
                let documents = diagData?.extension || [];
                for(let doc of documents){
                    let docId = doc?.valueReference?.reference?.split('/')[1];
                    let docResource = documentReferenceData.find((d) => d.id == docId);
                    let docData = new DocumentReference({}, docResource).deleteDocument();
                    let documentReferenceDeleteBundle = await bundleFun.setBundlePut(docData, docData.identifier, docData.id, 'PUT'); 
                    resourceResult.push(documentReferenceDeleteBundle);
                }
            }  
        }
        else {
            console.info("Fetch lab report section");
            let encounterList = FHIRData.filter(e => e.resource.resourceType == "Encounter").map(e => e.resource);
            let mainEncounterIds = new Set(encounterList.map((e) => e.partOf.reference.split('/')[1]));
            mainEncounterIds = [...mainEncounterIds.values()].join(',');
            let mainEncounterList = await bundleOp.searchData(config.baseUrl + "Encounter", { _id: mainEncounterIds, _count: 5000}, token);
            mainEncounterList = mainEncounterList?.data?.entry?.map((e) => e?.resource) || [];
            for(let encounter of encounterList){
                let mainEncounter = mainEncounterList.find((e) => e.id == encounter.partOf.reference.split('/')[1]);
                let report = new Encounter({}, mainEncounter);
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