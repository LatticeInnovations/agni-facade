let bundleFun = require("./bundleOperation");
const MedicationRquest = require("../class/MedicationRequest");
const Encounter = require("../class/encounter")
const { v4: uuidv4 } = require('uuid');
let config = require("../config/nodeConfig");
let bundleOp = require("./bundleOperation");
const DocumentReference = require("../class/DocumentReference");
let axios = require('axios');

const createDocument = async (data) => {
    let response = await axios.post(config.baseUrl+'DocumentReference', data);
    if(response.status == 201){
        return response.data.id;
    }
}

const fetchDocument = async (docId) => {
    let response = await axios.get(config.baseUrl+`DocumentReference?_id=${docId}`);
    if(response.status == 200){
        if(response?.data?.entry?.[0]?.resource?.content[0]?.attachment){
            return { 
                filename: response?.data?.entry?.[0]?.resource?.content[0]?.attachment?.title,
                note: response?.data?.entry?.[0]?.resource?.description || ""
            }
        } 
        else{
            return null;
        }
    }
}

let setMedicationRequestData = async function (resType, reqInput, FHIRData, reqMethod) {
    try {
        let resourceResult = [], errData = [];
        if (["post", "POST", "PUT", "put"].includes(reqMethod)) {
            for (let patPres of reqInput) {
                let encounterData = await bundleOp.searchData(config.baseUrl + "Encounter", { "appointment": patPres.appointmentId, _count: 5000 , "_include": "Encounter:appointment"});
                let apptData = encounterData.data.entry[1].resource
                patPres.encounterId = encounterData.data.entry[0].resource.id;
                let todayDate = new Date();
                console.info(new Date(patPres.generatedOn).toLocaleDateString('en-US'), new Date(todayDate).toLocaleDateString('en-US'), encounterData.data.entry[0].resource.status)
                if((new Date(patPres.generatedOn).toLocaleDateString('en-US') >= new Date().toLocaleDateString('en-US')) && encounterData.data.entry[0].resource.status != "finished")
                    encounterData.data.entry[0].resource.status = "in-progress";
                else 
                    encounterData.data.entry[0].resource.status = "finished";
                encounterData.data.entry[0].resource.period = {
                        "start": patPres.generatedOn,
                        "end": patPres.generatedOn
                    }
                    encounterData.data.entry[0].resource.identifier.push(
                    {   "system": config.snUrl,
                        "value": patPres.prescriptionId
                })
                patPres.id = patPres.prescriptionId;
                let encounterBundle = await bundleFun.setBundlePost(encounterData.data.entry[0].resource, encounterData.data.entry[0].resource.identifier, encounterData.data.entry[0].resource.id, "PUT", "identifier"); 
                apptData.end = new Date().toISOString();
                let apptBundle = await bundleFun.setBundlePost(apptData, apptData.identifier, apptData.id, "PUT", "identifier"); 
                resourceResult.push(encounterBundle, apptBundle);
                let medList = patPres.prescription;
                let dateToday = (new Date(patPres.generatedOn)).getTime().toString();
                let lastDigits = dateToday.slice(9, -1);
                let grpIdentify =  lastDigits + patPres.patientId;
                let medicationRequestData = {
                    patientId: patPres.patientId,
                    generatedOn: patPres.generatedOn,
                    prescriptionId: patPres.prescriptionId,
                    encounterId: encounterData.data.entry[0].resource.id,
                    grpIdentify: grpIdentify,
                    identifier: [... encounterData.data.entry[0].resource.identifier],
                }
                let medRequest = new MedicationRquest(medicationRequestData, {});
                medRequest.getJSONtoFhir();
                for(let prescription of medList) {
                    let document = new DocumentReference(prescription.filename, prescription.note, {});
                    document.getJSONtoFhir();
                    let docData = {...document.getFhirResource()};
                    let docId = await createDocument(docData);
                    medRequest.setDocument(docId);
                    // prescription.patientId = patPres.patientId;
                    // prescription.generatedOn = patPres.generatedOn;
                    // prescription.prescriptionId = patPres.prescriptionId;
                    // prescription.encounterId = encounterData.data.entry[0].resource.id
                    // prescription.grpIdentify = grpIdentify;
                    // prescription.identifier = [... encounterData.data.entry[0].resource.identifier];
                    // prescription.docId = docId;
                    // let medRequest = new MedicationRquest(prescription, {});
                                      
                }
                let medReqData = {...medRequest.getFhirResource()}; 
                medReqData.resourceType = "MedicationRequest";
                medReqData.id = uuidv4();
                let medReqResource = await bundleFun.setBundlePost(medReqData, medicationRequestData.identifier, medReqData.id, "POST", "identifier");
                resourceResult.push(medReqResource); 
            }
        }
        else {
            let encounterList = FHIRData.filter(e => e.resource.resourceType == "Encounter" && (e.resource.status == "in-progress" || e.resource.status == "finished")).map(e => e.resource);
            console.info("check encounter length: ", encounterList.length)
            for(let encData of encounterList) {
                let encounter = new Encounter({}, encData);
                encounter.getFhirToJson();
                let encounterData = encounter.getEncounterResource();
            let medReqList = FHIRData.filter(e => e.resource.resourceType == "MedicationRequest" && e.resource.encounter.reference == "Encounter/"+encData.id).map(e => e.resource);          
             encounterData.prescription = [];
                    for(let medReq of medReqList) {                     
                            let medReqData = new MedicationRquest({}, medReq);
                            medReqData.getFhirToJson();
                            let medData = medReqData.getMedReqResource();
                            let files = [];
                            medData.filename = null;
                            let supportingInformation = medReq?.supportingInformation || [];
                            for(let doc of supportingInformation){
                                let documentId = doc.reference.split('/')[1];
                                let document = await fetchDocument(documentId);
                                medData.filename = document?.filename;
                                if(medData.filename){
                                    files.push({
                                        filename: document?.filename,
                                        note: document?.note
                                    });
                                }
                            }
                            if(files.length > 0){
                                encounterData.prescription.push(...files)
                            }
                    }
                if(encounterData.prescription.length > 0)
                    resourceResult.push(encounterData)
            }

        }
        return {resourceResult, errData};
    }
    catch (e) {
        return Promise.reject(e);
    }

}

module.exports = { setMedicationRequestData }