let bundleFun = require("./bundleOperation");
const MedicationRequest = require("../class/MedicationRequest");
const Encounter = require("../class/GroupEncounter")
let config = require("../config/nodeConfig");
let bundleOp = require("./bundleOperation");


let setMedicationRequestData = async function (resType, reqInput, FHIRData, reqMethod, token) {
    try {
        let resourceResult = [], errData = [];
        if (["post", "POST", "PUT", "put"].includes(reqMethod)) {
            for (let patPres of reqInput) {
                let appointmentEncounter = await bundleOp.searchData(config.baseUrl + "Encounter", { "appointment": patPres.appointmentId, _count: 5000 , "_include": "Encounter:appointment"}, token);
                let apptData = appointmentEncounter.data.entry[0].resource
                patPres.uuid = patPres.prescriptionId;
                patPres.code = "prescription-encounter-form";
                patPres.display  = "Prescription managemment";
                patPres.appointmentId = apptData.id;
                let encounter = new Encounter(patPres, {})
                const encounterData = encounter.getUserInputToFhir()
                let encounterBundle = await bundleFun.setBundlePost(encounterData, encounterData.identifier, patPres.uuid, "POST", "identifier"); 
                resourceResult.push(encounterBundle)
                patPres.id = patPres.prescriptionId;
                let medList = patPres.prescription;
                let dateToday = (new Date(patPres.generatedOn)).getTime().toString();
                let lastDigits = dateToday.slice(9, -1);
                let grpIdentify =  lastDigits + patPres.patientId;
               
                for(let prescription of medList) {
                    prescription.patientId = patPres.patientId;
                    prescription.generatedOn = patPres.generatedOn;
                    prescription.prescriptionId = patPres.prescriptionId;
                    prescription.encounterId = patPres.uuid
                    prescription.grpIdentify = grpIdentify;
                    prescription.identifier = [{
                        "system": config.medReqUuidUrl,
                        "value": prescription.medReqUuid
                    }]
                    let medRequest = new MedicationRequest(prescription, {});
                    medRequest.getJSONtoFhir();
                    let medReqData = {...medRequest.getFhirResource()};
                    medReqData.resourceType = "MedicationRequest";
                    medReqData.id = prescription.medReqUuid;
                    let medReqResource = await bundleFun.setBundlePost(medReqData, prescription.identifier, medReqData.id, "POST", "identifier");
                    resourceResult.push(medReqResource); 
                }
            }
        }
        else {
            let encounterList = FHIRData.filter(e => e.resource.resourceType == "Encounter" && (e.resource.status == "in-progress" || e.resource.status == "finished")).map(e => e.resource);
            console.info("check encounter length: ", encounterList.length)
            for(let encData of encounterList) {
                let encounter = new Encounter({}, encData);
                encounter.getFhirToJson();
                let encounterData = encounter.getUserResponseFormat();
            let medReqList = FHIRData.filter(e => e.resource.resourceType == "MedicationRequest" && e.resource.encounter.reference == "Encounter/"+encData.id).map(e => e.resource);         
             encounterData.prescription = [];
            //  let insert = false;
                    for(let medReq of medReqList) {                     
                            let medReqData = new MedicationRequest({}, medReq);
                            medReqData.getFhirToJson();
                            let medData = medReqData.getMedReqResource();
                            medData.qtyPrescribed = medData.qtyPerDose * medData.frequency * medData.duration;
                            encounterData.prescription.push(medData);
                    }
                if(encounterData.prescription.length > 0)
                    resourceResult.push(encounterData)
            }

        }
        console.info("resourceResult", resourceResult)
        return {resourceResult, errData};
    }
    catch (e) {
        return Promise.reject(e);
    }

}

module.exports = { setMedicationRequestData }