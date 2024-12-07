let bundleOp = require("./bundleOperation");
let config = require("../config/nodeConfig");
const DocumentManifest = require("../class/DocumentManifest");
const DocumentReference = require("../class/DocumentReference");
const Encounter = require("../class/encounter");
let bundleFun = require("./bundleOperation");
const { v4: uuidv4 } = require('uuid');

const setMedicalRecordData = async (resType, reqInput, FHIRData, reqMethod, reqQuery, token) => {
    try{
        let resourceResult = [], errData = [];
        if (["post", "POST", "PUT", "put"].includes(reqMethod)) {
            console.log("create medical record section");
            for(let medicalRecord of reqInput){ 
                let encounterData = await bundleOp.searchData(config.baseUrl + "Encounter", { "appointment": medicalRecord.appointmentId, _count: 5000 , "_include": "Encounter:appointment" }, token);

                medicalRecord.encounterId = encounterData.data.entry[0].resource.id;
                let documents = [];
                for(let file of medicalRecord.files) {
                    let document = new DocumentReference({
                        uuid: file.medicalDocumentUuid,
                        filename: file.filename, 
                        note: file.note
                    }, {}).getJSONtoFhir();
                    documents.push(document);
                    document = await bundleFun.setBundlePost(document, document.identifier, document.id, "POST", "identifier");
                    resourceResult.push(document);
                }
                medicalRecord.documents = documents;
                medicalRecord.practitionerId = token.userId;
                medicalRecord.practitionerName = token.userName;
                let report = new DocumentManifest(medicalRecord, {}).getUserInputToFhir(); 
                report = await bundleFun.setBundlePost(report, null, medicalRecord.medicalReportUuid, "POST", "identifier");
                resourceResult.push(report);
            }
        }
        else if (["delete", "DELETE"].includes(reqMethod)){
            let documentManifestIds = reqInput.join(',');
            let documentManifestData = await bundleOp.searchData(config.baseUrl + "DocumentManifest", { _id: documentManifestIds, _count: 5000}, token);
            documentManifestData = documentManifestData?.data?.entry?.map((e) => e?.resource) || [];
            let documentReferenceIds = [];
            documentManifestData.forEach((report) => {
                let documents = report?.content || [];
                documents.forEach((doc) => {
                    let docId = doc.reference.split('/')[1];
                    documentReferenceIds.push(docId);
                });
            });
            documentReferenceIds = documentReferenceIds.join(',');
            let documentReferenceData = await bundleOp.searchData(config.baseUrl + "DocumentReference", { _id: documentReferenceIds, _count: 5000}, token);
            documentReferenceData = documentReferenceData?.data?.entry?.map((e) => e?.resource) || [];
            
            for(let report of documentManifestData){
                let reportData = new DocumentManifest({}, report).deleteDocumentManifest();
                let reportDeleteBundle = await bundleFun.setBundlePut(reportData, reportData.identifier, reportData.id, 'PUT'); 
                resourceResult.push(reportDeleteBundle);
                let documents = reportData?.content || [];
                for(let doc of documents){
                    let docId = doc?.reference?.split('/')[1];
                    let docResource = documentReferenceData.find((d) => d.id == docId);
                    let docData = new DocumentReference({}, docResource).deleteDocument();
                    let documentReferenceDeleteBundle = await bundleFun.setBundlePut(docData, docData.identifier, docData.id, 'PUT'); 
                    resourceResult.push(documentReferenceDeleteBundle);
                }
            } 
        }
        else {
            console.log(FHIRData);
            console.log("Fetch medical record section");
            let encounterList = FHIRData.filter(e => e.resource.resourceType == "Encounter").map(e => e.resource);
            for(let encounter of encounterList){
                let report = new Encounter({}, encounter);
                report.getFhirToJson();
                let reportData = report.getEncounterResource();
                delete reportData.prescriptionId;
            
                let reportList = FHIRData.filter(e => e.resource.resourceType == "DocumentManifest" && e.resource?.related?.[0]?.ref?.reference == "Encounter/"+encounter.id).map(e => e.resource);
                reportData.medicalRecord = [];
                for(let medicalRecord of reportList){
                    let data = new DocumentManifest(reportData ,medicalRecord).getFHIRToUserData();
                    console.log("documentIds", data.documentIds);
                    if(data.documentIds.length > 0){
                        let documentReferenceResponse = await bundleOp.searchData(config.baseUrl + "DocumentReference", { "_id": data.documentIds.join(','), _count: 5000 }, token);
                        let documentReferenceData = documentReferenceResponse.data.entry;
                        data.documents = fetchDocumentData(documentReferenceData);
                        delete data.documentIds;
                        reportData.medicalRecord.push(data);
                    }
                    else {
                        delete data.documentIds;
                        data.documents = [];
                        reportData.medicalRecord.push(data);
                    }
                }
                delete reportData.labReport;
                if(reportData.medicalRecord.length > 0){
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
        let documentData = new DocumentReference({}, document.resource).getFHIRToJSONForMedicalRecord();
        result.push(documentData)
    }
    return result;
}

module.exports = { setMedicalRecordData };