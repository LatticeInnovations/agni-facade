let bundleFun = require("./bundleOperation");
const MedicationRquest = require("../class/MedicationRequest");
const Encounter = require("../class/encounter")
const { v4: uuidv4 } = require('uuid');

let setMedicationRequestData = async function (resType, reqInput, FHIRData, reqMethod) {
    try {
        let resource_result = [];
        if (["post", "POST", "PUT", "put"].includes(reqMethod)) {
            for (let patPres of reqInput) {
                
                let encounter = new Encounter(patPres, {});
                encounter.getUserInputToFhir();
                let encounterResource = {...encounter.getFHIRResource()};
                encounterResource.resourceType = "Encounter";
                encounterResource.id = patPres.prescriptionId;
                let encounterBundle = await bundleFun.setBundlePost(encounterResource, encounterResource.identifier, encounterResource.id, "POST");
                resource_result.push(encounterBundle);
                console.log("encounter data");
                let medList = patPres.prescription;
                let dateToday = (new Date(patPres.generatedOn)).getTime().toString();
                let lastDigits = dateToday.slice(9, -1);
                let grpIdentify =  lastDigits + patPres.patientId;
                for(let prescription of medList) {
                    prescription.patientId = patPres.patientId;
                    prescription.generatedOn = patPres.generatedOn;
                    prescription.prescriptionId = patPres.prescriptionId;
                    prescription.grpIdentify = grpIdentify;
                    prescription.identifier = [...encounterResource.identifier];
                    prescription.identifier.push({
                        "system":"http://snomed.info/sct",
                        "value": prescription.medFhirId
                    })

                    let medRequest = new MedicationRquest(prescription, {});
                    medRequest.getJSONtoFhir();
                    medReqData = {...medRequest.getFhirResource()};
                    medReqData.resourceType = "MedicationRequest";
                    medReqData.id = uuidv4();
                    let medReqResource = await bundleFun.setBundlePost(medReqData, prescription.identifier, medReqData.id, "POST");
                    resource_result.push(medReqResource);                    
                }
            }
        }
        else {
            let encounterList = FHIRData.filter(e => e.resource.resourceType == "Encounter").map(e => e.resource);
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
                            medData.qtyPrescribed = medData.qtyPerDose * medData.frequency * medData.duration;
                            encounterData.prescription.push(medData)
                    }
                resource_result.push(encounterData)
            }

        }
        return resource_result;
    }
    catch (e) {
        return Promise.reject(e);
    }

}

module.exports = { setMedicationRequestData }