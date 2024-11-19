let bundleOp = require("./bundleOperation");
let config = require("../config/nodeConfig");
const Observation = require("../class/Observation");
const Encounter = require("../class/encounter");
let bundleFun = require("./bundleOperation");
const { v4: uuidv4 } = require('uuid');

const setCVDData = async (resType, reqInput, FHIRData, reqMethod, reqQuery, token) => {
    try {
        let resourceResult = [], errData = [];
        if (["post", "POST", "PUT", "put"].includes(reqMethod)) {
            for(let cvd of reqInput){ 
                let encounterData = await bundleOp.searchData(config.baseUrl + "Encounter", { "appointment": cvd.appointmentId, _count: 5000 , "_include": "Encounter:appointment" }, token);
                let encounterUuid = uuidv4();
                let encounter = new Encounter({ 
                    id: encounterUuid,
                    encounterId: encounterData.data.entry[0].resource.id,
                    patientId: cvd.patientId,
                    cvdUuid: cvd.cvdUuid,
                    practitionerId: token.userId,
                    createdOn: cvd.createdOn
                }, {}).getUserInputToFhirForCVD();
                cvd.encounterId = encounterUuid;
                cvd.practitionerId = token.userId;
                cvd.categoryCode = "CVD";
                cvd.categoryDisplay = "CVD risk assessment";
                let heightObservation = new Observation(cvd, {}).getUserInputToFhirHeight();
                let weightObservation = new Observation(cvd, {}).getUserInputToFhirWeight();
                let diabeticObservation = new Observation(cvd, {}).getUserInputToFhirDiabetic();
                let smokingObservation = new Observation(cvd, {}).getUserInputToFhirSmoker(); 
                let bpObservation = new Observation(cvd, {}).getUserInputToFhirBloodPressure();
                let cholesterolObservation = new Observation(cvd, {}).getUserInputToFhirCholesterol();
                let bmiObservation = new Observation(cvd, {}).getUserInputToFhirBMI();
                let cvdValueObservation = new Observation(cvd, {}).getUserInputToFhirRisk();

                heightObservation.id = uuidv4();
                weightObservation.id = uuidv4();
                diabeticObservation.id = uuidv4();
                smokingObservation.id = uuidv4();
                bpObservation.id = uuidv4();
                cholesterolObservation.id = uuidv4();
                bmiObservation.id = uuidv4();
                cvdValueObservation.id = uuidv4();
            
                let encounterBundle = await bundleFun.setBundlePost(encounter, null, encounter.id, "POST", "identifier");
                heightObservation = await bundleFun.setBundlePost(heightObservation, null, heightObservation.id, "POST", "identifier");
                weightObservation = await bundleFun.setBundlePost(weightObservation, null, weightObservation.id, "POST", "identifier");
                diabeticObservation = await bundleFun.setBundlePost(diabeticObservation, null, diabeticObservation.id, "POST", "identifier");
                smokingObservation = await bundleFun.setBundlePost(smokingObservation, null, smokingObservation.id, "POST", "identifier");
                bpObservation = await bundleFun.setBundlePost(bpObservation, null, bpObservation.id, "POST", "identifier");
                cholesterolObservation = await bundleFun.setBundlePost(cholesterolObservation, null, cholesterolObservation.id, "POST", "identifier");
                bmiObservation = await bundleFun.setBundlePost(bmiObservation, null, bmiObservation.id, "POST", "identifier");
                cvdValueObservation = await bundleFun.setBundlePost(cvdValueObservation, null, cvdValueObservation.id, "POST", "identifier"); 
                resourceResult.push(encounterBundle, heightObservation, weightObservation, diabeticObservation, smokingObservation, bpObservation, cholesterolObservation, bmiObservation, cvdValueObservation);
            }
        }
        else if (["PATCH", "patch"].includes(reqMethod)) {
            console.log("CVD patch section");
            for(let cvd of reqInput){
                let observations = await bundleOp.searchData(config.baseUrl + "Observation", { "encounter": cvd.cvdFhirId, "code:text": cvd.key }, token);
                observations = observations.data.entry;
                let observation = getPatchComponent(cvd.key, cvd.component, observations);
                const patchUrl = "Observation" + "/" + observations[0].resource.id;
                let patchData = await bundleFun.setBundlePatch([{
                    "encounterId": cvd.cvdFhirId,
                    "op": cvd.component.operation,
                    path: "/component", 
                    value : observation.component
                }], patchUrl);

                let encounterPatchExist = resourceResult.find(e => e.fullUrl == "Encounter"+ "/"+ cvd.cvdFhirId);
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
                    }], "Encounter"+ "/"+ cvd.cvdFhirId);
                    resourceResult.push(patchPractitionerRefInEncounter);
                }
                resourceResult.push(patchData);
            }
        }
        else {
            console.log("CVD Get API");
            let practitionerData = await bundleOp.searchData(config.baseUrl + "Practitioner", { _count: 10000 }, token);
            practitionerData = practitionerData.data.entry;
            // Fetch main Encounters list
            let mainEncounterList = FHIRData.filter(e => e.resource.resourceType == "Encounter" && e.resource.type[0].coding[0].code == "cvd-encounter").map(e => e.resource.partOf.reference.split('/')[1]);
            let mainEncounterIds = mainEncounterList.join(','); 

            mainEncounterList = await bundleOp.searchData(config.baseUrl + "Encounter", { _id: mainEncounterIds, _count: 100000 }, token);
            mainEncounterList = mainEncounterList.data.entry.map(e => e.resource);
            // Fetch sub encounter of vitals i.e Encounter --> Observation
            let cvdEncounterList = FHIRData.filter(e => e.resource.type && e.resource.type[0].coding[0].code == "cvd-encounter").map(e => e.resource);
            let cvdEncounterIds = cvdEncounterList.map(e => e.id).join(',');
            
            let allObservations = await bundleOp.searchData(config.baseUrl + "Observation", { encounter: cvdEncounterIds, _count: 100000 }, token);
            allObservations = allObservations.data.entry.map(e => e.resource);
            for(let encounter of cvdEncounterList){
                    let observationEncounter = new Encounter({}, encounter);
                    observationEncounter.getFhirToJsonForCVD();
                    let observationData = observationEncounter.getEncounterResource();
                    let practitioner = practitionerData.filter((e) => e?.resource?.id === observationData?.practitionerId);
                    let practitionerName = practitioner.length > 0 ? (practitioner?.[0]?.resource?.name?.[0]?.given?.join(' ') || '') + ' ' + (practitioner?.[0]?.resource?.name?.[0]?.family || "") : "";
                    observationData.practitionerName = practitionerName.trim();
                    // Date of vital creation
                    observationData.createdOn = encounter.period.start;
                    //  sub encounter FHIR id as cvdFhirId
                    observationData.cvdFhirId = observationData.prescriptionFhirId;
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
        case 'Diabetic status': return new Observation(observation, FHIRData).getDiabeticData();
        case 'Smoking Status' : return new Observation(observation, FHIRData).getSmokerData();
        case 'Cholesterol': return new Observation(observation, FHIRData).getCholesterolData();
        case 'BMI': return new Observation(observation, FHIRData).getBMIData();
        case 'CVD Risk Percentage': return new Observation(observation, FHIRData).getRiskData();
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
        case 'Diabetic status': return new Observation(input, FHIRData).patchUserInputToFhirDiabetic();
        case 'Smoking Status' : return new Observation(input, FHIRData).patchUserInputToFhirSmoker();
        case 'Cholesterol': return new Observation(input, FHIRData).patchUserInputToFhirCholesterol();
        case 'BMI': return new Observation(input, FHIRData).patchUserInputToFhirBMI();
        case 'CVD Risk Percentage': return new Observation(input, FHIRData).patchUserInputToFhirRisk();
    }
}

module.exports = { setCVDData };