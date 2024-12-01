let bundleOp = require("./bundleOperation");
let config = require("../config/nodeConfig");
const Observation = require("../class/Observation");
const Encounter = require("../class/encounter");
let bundleFun = require("./bundleOperation");
const { v4: uuidv4 } = require('uuid');

const setVitalsData = async (resType, reqInput, FHIRData, reqMethod, reqQuery, token) => {
    try {
        let resourceResult = [], errData = [];
        if (["post", "POST", "PUT", "put"].includes(reqMethod)) {
            for(let vital of reqInput){ 
                let encounterData = await bundleOp.searchData(config.baseUrl + "Encounter", { "appointment": vital.appointmentId, _count: 5000 , "_include": "Encounter:appointment" }, token);
                let encounterUuid = uuidv4();
                let encounter = new Encounter({ 
                    id: encounterUuid,
                    encounterId: encounterData.data.entry[0].resource.id,
                    patientId: vital.patientId,
                    vitalUuid: vital.vitalUuid,
                    practitionerId: token.userId,
                    createdOn: vital.createdOn
                }, {}).getUserInputToFhirForVitals();
                vital.encounterId = encounterUuid;
                vital.practitionerId = token.userId;
                let heightObservation = new Observation(vital, {}).getUserInputToFhirHeight();
                let weightObservation = new Observation(vital, {}).getUserInputToFhirWeight();
                let heartRateObservation = new Observation(vital, {}).getUserInputToFhirHeartRate();
                let respRateObservation = new Observation(vital, {}).getUserInputToFhirRespRate();
                let spo2Observation = new Observation(vital, {}).getUserInputToFhirSpo2();
                let temperatureObservation = new Observation(vital, {}).getUserInputToFhirTemp();
                let bpObservation = new Observation(vital, {}).getUserInputToFhirBloodPressure();
                let bloodGlucoseObservation = new Observation(vital, {}).getUserInputToFhirBloodGlucose();
                let eyeTestObservation = new Observation(vital, {}).getUserInputToFhirEyeTest();
                heightObservation.id = uuidv4();
                weightObservation.id = uuidv4();
                heartRateObservation.id = uuidv4();
                respRateObservation.id = uuidv4();
                spo2Observation.id = uuidv4();
                temperatureObservation.id = uuidv4();
                bpObservation.id = uuidv4();
                bloodGlucoseObservation.id = uuidv4();
                eyeTestObservation.id = uuidv4();
                
                let encounterBundle = await bundleFun.setBundlePost(encounter, null, encounter.id, "POST", "identifier");
                heightObservation = await bundleFun.setBundlePost(heightObservation, null, heightObservation.id, "POST", "identifier");
                weightObservation = await bundleFun.setBundlePost(weightObservation, null, weightObservation.id, "POST", "identifier");
                heartRateObservation = await bundleFun.setBundlePost(heartRateObservation, null, heartRateObservation.id, "POST", "identifier");
                respRateObservation = await bundleFun.setBundlePost(respRateObservation, null, respRateObservation.id, "POST", "identifier");
                spo2Observation = await bundleFun.setBundlePost(spo2Observation, null, spo2Observation.id, "POST", "identifier");
                temperatureObservation = await bundleFun.setBundlePost(temperatureObservation, null, temperatureObservation.id, "POST", "identifier");
                bpObservation = await bundleFun.setBundlePost(bpObservation, null, bpObservation.id, "POST", "identifier");
                bloodGlucoseObservation = await bundleFun.setBundlePost(bloodGlucoseObservation, null, bloodGlucoseObservation.id, "POST", "identifier");
                eyeTestObservation = await bundleFun.setBundlePost(eyeTestObservation, null, eyeTestObservation.id, "POST", "identifier");
                resourceResult.push(encounterBundle, heightObservation, weightObservation, heartRateObservation, respRateObservation, spo2Observation, temperatureObservation, bpObservation, bloodGlucoseObservation, eyeTestObservation);
            }
        }
        else if (["PATCH", "patch"].includes(reqMethod)) {
            console.log("vitals patch section");
            for(let vital of reqInput){
                let observations = await bundleOp.searchData(config.baseUrl + "Observation", { "encounter": vital.vitalFhirId, "code:text": vital.key }, token);
                observations = observations.data.entry;
                let observation = getPatchComponent(vital.key, vital.component, observations);
                const patchUrl = resType + "/" + observations[0].resource.id;
                let patchData = await bundleFun.setBundlePatch([{
                    "encounterId": vital.vitalFhirId,
                    "op": vital.component.operation,
                    path: "/component", 
                    value : observation.component
                }], patchUrl);

                let encounterPatchExist = resourceResult.find(e => e.fullUrl == "Encounter"+ "/"+ vital.vitalFhirId);
                if(!encounterPatchExist){
                    let patchPractitionerRefInEncounter = await bundleFun.setBundlePatch([{
                        "op": "replace",
                        path: "/participant/0/individual/reference",
                        value : "Practitioner/" + token.userId,
                    },
                    {
                        "op": "replace",
                        path: "/length",
                        value : {
                            "value": new Date().valueOf(),
                            "unit": "millisecond",
                            "system": "http://unitsofmeasure.org",
                            "code": "ms"
                        },
                    }], "Encounter"+ "/"+ vital.vitalFhirId);
                    resourceResult.push(patchPractitionerRefInEncounter);
                }
                resourceResult.push(patchData);
            }
        }
        else {
            console.log("Vitals Get API");
            let practitionerData = await bundleOp.searchData(config.baseUrl + "Practitioner", { _count: 10000 }, token);
            practitionerData = practitionerData.data.entry;
            // Fetch main Encounters list
            let mainEncounterList = FHIRData.filter(e => e.resource.resourceType == "Encounter" && e.resource.type[0].coding[0].code == "vital-encounter").map(e => e.resource.partOf.reference.split('/')[1]);
            let mainEncounterIds = mainEncounterList.join(','); 
            
            mainEncounterList = await bundleOp.searchData(config.baseUrl + "Encounter", { _id: mainEncounterIds, _count: 10000 }, token);
            mainEncounterList = mainEncounterList.data.entry.map(e => e.resource);
            // Fetch sub encounter of vitals i.e Encounter --> Observation
            let vitalEncounterList = FHIRData.filter(e => e.resource.type && e.resource.type[0].coding[0].code == "vital-encounter").map(e => e.resource);
            let vitalEncounterIds = vitalEncounterList.map(e => e.id).join(',');
            let allObservations = await bundleOp.searchData(config.baseUrl + "Observation", { encounter: vitalEncounterIds, _count: 100000 }, token);
            allObservations = allObservations.data.entry.map(e => e.resource);
            for(let encounter of vitalEncounterList){
                    let observationEncounter = new Encounter({}, encounter);
                    observationEncounter.getFhirToJsonForVitals();
                    let observationData = observationEncounter.getEncounterResource();
                    let practitioner = practitionerData.filter((e) => e?.resource?.id === observationData?.practitionerId);
                    let practitionerName = practitioner.length > 0 ? (practitioner?.[0]?.resource?.name?.[0]?.given?.join(' ') || '') + ' ' + (practitioner?.[0]?.resource?.name?.[0]?.family || "") : "";
                    observationData.practitionerName = practitionerName.trim();
                    // Date of vital creation
                    observationData.createdOn = encounter.period.start;
                    //  sub encounter FHIR id as vitalFhirId
                    observationData.vitalFhirId = observationData.prescriptionFhirId;
                    delete observationData.prescriptionFhirId;
                    delete observationData.prescriptionId;
                    let primaryEncounter = mainEncounterList.filter(e => e.id === observationData.primaryEncounterId);
                    // console.log("primary encounter --->", primaryEncounter)
                    console.log("primary encounter ids---->", observationData.primaryEncounterId)
                    if(primaryEncounter.length > 0){
                        // fetch appointment id from main encounter
                        observationData.appointmentId = primaryEncounter?.[0].appointment?.[0]?.reference?.split("/")[1] || null;
                    }
                    delete observationData.primaryEncounterId;
                    delete observationData.practitionerId;
                    // let observationList = FHIRData.filter(e => e.resource.resourceType == "Observation" && e.resource.encounter.reference == "Encounter/"+encounter.id).map(e => e.resource);
                    let observationList = allObservations.filter(e => e.encounter.reference == "Encounter/"+encounter.id); 
                    // console.log(observationList.filter(data => data.subject.reference === 'Patient/3741'));
                    for(let observation of observationList){
                        let data = getObservationData(observation, observationData);
                        observationData = { ...observationData, ...data}
                    }
                    resourceResult.push(observationData);
                
                
            }  
        }
        return { resourceResult, errData };
    }
    catch(e) {
        return Promise.reject(e);
    }
}


const getObservationData = (FHIRData, observation) => {
    switch(FHIRData.code.text){
        case 'Height': return new Observation(observation, FHIRData).getHeightData();
        case 'Weight': return new Observation(observation, FHIRData).getWeightData();
        case 'Heart Rate': return new Observation(observation, FHIRData).getHeartRate();
        case 'Respiratory rate': return new Observation(observation, FHIRData).getRespRate();
        case 'spO2': return new Observation(observation, FHIRData).getSpo2();
        case 'Body temperature': return new Observation(observation, FHIRData).getTemperature();
        case 'Blood Pressure': return new Observation(observation, FHIRData).getBloodPressure();
        case 'Blood Glucose': return new Observation(observation, FHIRData).getBloodGlucose();
        case 'Eye Test': return new Observation(observation, FHIRData).getEyeTest();
    }
}

const getPatchComponent = (key, input, FHIRData) => {
    switch(key){
        case 'Height': return new Observation(input, FHIRData).patchUserInputToFhirHeight();
        case 'Weight': return new Observation(input, FHIRData).patchUserInputToFhirWeight();
        case 'Heart Rate': return new Observation(input, FHIRData).patchUserInputToFhirHeartRate();
        case 'Respiratory rate': return new Observation(input, FHIRData).patchUserInputToFhirRespRate();
        case 'spO2': return new Observation(input, FHIRData).patchUserInputToFhirSpo2();
        case 'Body temperature': return new Observation(input, FHIRData).patchUserInputToFhirTemp();
        case 'Blood Pressure': return new Observation(input, FHIRData).patchUserInputToFhirBloodPressure();
        case 'Blood Glucose': return new Observation(input, FHIRData).patchUserInputToFhirBloodGlucose();
        case 'Eye Test': return new Observation(input, FHIRData).patchUserInputToFhirEyeTest();
    }
}

module.exports = { setVitalsData };