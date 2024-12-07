let bundleFun = require("./bundleOperation");
const MedicationRequest = require("../class/MedicationRequest");
const Encounter = require("../class/encounter")
const { v4: uuidv4 } = require('uuid');
let config = require("../config/nodeConfig");
let bundleOp = require("./bundleOperation");
const DocumentReference = require("../class/DocumentReference");
let axios = require('axios');

const setPrescriptionDocument = async (resType, reqInput, FHIRData, reqMethod, reqQuery, token) => {
    try {
        let resourceResult = [], errData = [];
        if (["post", "POST", "PUT", "put"].includes(reqMethod)) {
            for (let patPres of reqInput) {
                let encounterData = await bundleOp.searchData(config.baseUrl + "Encounter", { "appointment": patPres.appointmentId, _count: 5000 , "_include": "Encounter:appointment" }, token);
                let encounterUuid = uuidv4();
                let encounter = new Encounter({ 
                    id: encounterUuid,
                    encounterId: encounterData.data.entry[0].resource.id,
                    patientId: patPres.patientId,
                    prescriptionId: patPres.prescriptionId,
                    practitionerId: token.userId,
                    createdOn: patPres.generatedOn
                }, {}).getUserInputToFhirForPrescriptionDocument();
            
                let dateToday = (new Date(patPres.generatedOn)).getTime().toString();
                let lastDigits = dateToday.slice(9, -1);
                let grpIdentify =  lastDigits + patPres.patientId;

                let prescription = {
                    identifier: [{
                        "system": config.medReqUuidUrl,
                        "value": uuidv4()
                    }],
                    grpIdentify: grpIdentify,
                    patientId: patPres.patientId,
                    encounterId: encounterUuid,
                    prescriptionFiles: patPres.prescriptionFiles
                }
                let medRequestData = new MedicationRequest(prescription, {}).getJSONtoFhirForPrescriptionDocument();
                let encounterBundle = await bundleFun.setBundlePost(encounter, null, encounter.id, "POST", "identifier");
                let medicationResourceBundle= await bundleFun.setBundlePost(medRequestData, prescription.identifier, prescription.identifier[0].value, "POST", "identifier");
               
                resourceResult.push(encounterBundle, medicationResourceBundle);

                for(let document of patPres.prescriptionFiles) {
                    let documentRefData = new DocumentReference({
                        filename: document.filename, 
                        note: document.note, 
                        uuid: document.documentUuid
                    }, {}).getJSONtoFhir();
                    let documentResource = await bundleFun.setBundlePost(documentRefData, documentRefData.identifier, documentRefData.id, "POST", "identifier");
                    resourceResult.push(documentResource); 
                }
            }
        }
        else if (["delete", "DELETE"].includes(reqMethod)){
            let encounterIds = reqInput.join(',');
            let encounterData = await bundleOp.searchData(config.baseUrl + "Encounter", { _id: encounterIds, _count: 5000}, token);
            encounterData = encounterData?.data?.entry?.map((e) => e?.resource) || [];
            for(let encounter of encounterData){
                let enc = new Encounter({}, encounter).deletePrescriptionDocument();
                let encounterDeleteBundle = await bundleFun.setBundlePut(enc, enc.identifier, enc.id, 'PUT'); 
                resourceResult.push(encounterDeleteBundle);
            }
            
            let medicationRequestData = await bundleOp.searchData(config.baseUrl + "MedicationRequest", { encounter: encounterIds, _count: 5000}, token);
            medicationRequestData = medicationRequestData?.data?.entry?.map((e) => e?.resource) || [];
            let documentReferenceIds = []; 
            medicationRequestData.map((e) => {
                let supportingInformation = e?.supportingInformation || [];
                supportingInformation.forEach((d) => {
                    let docId = d?.reference?.split('/')[1] || null;
                    if(docId){
                        documentReferenceIds.push(docId);
                    }
                });
            });
            documentReferenceIds = documentReferenceIds.join(',');
            let documentReferenceData = await bundleOp.searchData(config.baseUrl + "DocumentReference", { _id: documentReferenceIds, _count: 5000}, token);
            documentReferenceData = documentReferenceData?.data?.entry?.map((e) => e?.resource) || [];
            for(let med of medicationRequestData){
                let medData = new MedicationRequest({}, med).deletePrescriptionDocument();
                let medRequestDeleteBundle = await bundleFun.setBundlePut(medData, medData.identifier, medData.id, 'PUT'); 
                resourceResult.push(medRequestDeleteBundle);
                let documents = med?.supportingInformation || []; 
                for(let doc of documents){
                    let docId = doc?.reference.split('/')[1];
                    let docResource = documentReferenceData.find((d) => d.id == docId);
                    let docData = new DocumentReference({}, docResource).deleteDocument();
                    let documentReferenceDeleteBundle = await bundleFun.setBundlePut(docData, docData.identifier, docData.id, 'PUT'); 
                    resourceResult.push(documentReferenceDeleteBundle);
                }
            }  
        }
        else {
            const prescriptionDocumentEncounter = FHIRData.filter(e => e.resource.resourceType == "Encounter").map(e => e.resource);
            let appointmentEncounterIds = [... new Set(prescriptionDocumentEncounter.map(e =>  parseInt(e.partOf.reference.split("/")[1])))];
            let appointmentEncounters = await bundleOp.searchData(config.baseUrl + "Encounter", { "_id": appointmentEncounterIds.join(","), _count: 5000}, token);
            appointmentEncounters = appointmentEncounters.data.entry.map(e=> e.resource);
            for(let encData of prescriptionDocumentEncounter) {
                console.info("encounter data", encData);
                let apptEncounter = appointmentEncounters.filter( e=> e.id == encData.partOf.reference.split("/")[1])
                apptEncounter = new Encounter({}, apptEncounter[0]);
                apptEncounter = apptEncounter.getFhirToJson();
                let medReqList = FHIRData.filter(e => e.resource.resourceType == "MedicationRequest" && e.resource.encounter.reference == "Encounter/"+encData.id).map(e => e.resource);
                let documents = medReqList[0].supportingInformation;
                let documentIds = documents.map((document) => document.reference.split('/')[1]);
                let documentRefs = await bundleOp.searchData(config.baseUrl + "DocumentReference", { "_id": documentIds.join(","), _count: 5000}, token);
                documentRefs = documentRefs?.data?.entry?.map(e=> e.resource) || [];
                apptEncounter.prescriptionFiles = [];
                apptEncounter.prescriptionDocumentFhirId = encData.id;
                apptEncounter.status = medReqList?.[0]?.status == "entered-in-error" ? "deleted" : "saved";
                apptEncounter.prescriptionId = encData?.identifier?.[0]?.value || null;
                apptEncounter.generatedOn = encData?.period?.start || null;
                for(let document of documentRefs){
                    let documentObj = new DocumentReference({}, document).getFHIRToJSON();
                    apptEncounter.prescriptionFiles.push(documentObj);
                }
                resourceResult.push(apptEncounter);
            }
        }
        return {resourceResult, errData};
    }
    catch (e) {
        return Promise.reject(e);
    }
}

module.exports = { setPrescriptionDocument }