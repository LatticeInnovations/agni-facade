let bundleFun = require("./bundleOperation");
const MedicationRequest = require("../class/MedicationRequest");
const Encounter = require("../class/GroupEncounter")
const AppointmentEncounter = require("../class/encounter")
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
                patPres.appointmentEncounterId = apptData.id;
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
                    }, ... encounterData.identifier]
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
            // Fetch the encounter that links to appointment resource to get appointment id and uuid
            const prescriptionFormEncounter = FHIRData.filter(e => e.resource.resourceType == "Encounter").map(e => e.resource)
            let appointmentEncounterIds = [... new Set(prescriptionFormEncounter.map(e =>  parseInt(e.partOf.reference.split("/")[1])))]
            let appointmentEncounters = await bundleOp.searchData(config.baseUrl + "Encounter", { "_id": appointmentEncounterIds.join(","), _count: 5000}, token);
            appointmentEncounters = appointmentEncounters.data.entry.map(e=> e.resource)
            
            for(let encData of prescriptionFormEncounter) {
                // map the encounter from the list to sub encounter of prescription
                let apptEncounter = appointmentEncounters.filter( e=> e.id == encData.partOf.reference.split("/")[1])
                apptEncounter = new AppointmentEncounter({}, apptEncounter[0]);
                apptEncounter = apptEncounter.getFhirToJson();
                console.info("apptEncounter: ", apptEncounter)
                let medReqList = FHIRData.filter(e => e.resource.resourceType == "MedicationRequest" && e.resource.encounter.reference == "Encounter/"+encData.id).map(e => e.resource);    
                let prescriptionData = {
                    "prescriptionId": encData.identifier[0].value,
                    "prescriptionFhirId": encData.id,
                    "generatedOn": encData.period.start
                }   
                prescriptionData = {...apptEncounter, ...prescriptionData}
                prescriptionData.prescription = [];
            //  let insert = false;
                    for(let medReq of medReqList) {   
                            medReq.prescriptionId = encData.prescriptionId                  
                            let medReqData = new MedicationRequest({}, medReq);
                            medReqData.getFhirToJson();
                            let medData = medReqData.getMedReqResource();
                            medData.qtyPrescribed = medData.qtyPerDose * medData.frequency * medData.duration;
                            prescriptionData.prescription.push(medData);
                    }
                if(prescriptionData.prescription.length > 0)
                    resourceResult.push(prescriptionData)
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