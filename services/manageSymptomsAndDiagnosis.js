let ValueSet = require("../class/ValueSet");
let Condition = require('../class/Condition');
let Encounter = require('../class/encounter');
let Observation = require("../class/symtomObservation")
let bundleOp = require("./bundleOperation");
let config = require("../config/nodeConfig");
let bundleFun = require("./bundleOperation");
const { v4: uuidv4 } = require('uuid');
const diagnosisList = require("../utils/diagnosisList.json").compose.include[0].concept;
const symptomList = require("../utils/symptomsList.json").compose.include[0].concept;

global.diagnosisMap = new Map();
global.symptomsMap = new Map();

const populateSymptomMap = (symptomList) => {
    console.info("symptoms map populated");
    symptomList.forEach((e) => {
        if(!symptomsMap.has(e.code)){
            symptomsMap.set(e.code, e.display);
        }
    });
}

const populateDiagnosisMap = (diagnosisList) => {
    console.info("Diagnosis map populated");
    diagnosisList.forEach((e) => {
        if(!diagnosisMap.has(e.code)){
            diagnosisMap.set(e.code, e.display);
        }
    });
}

populateSymptomMap(symptomList);
populateDiagnosisMap(diagnosisList);


let manageValueSetData= async function (resType, reqInput, FHIRData, reqMethod, reqQuery, token) {
    try {
            let resourceResult = [], errData = [];
            const type = reqQuery.name == "symptomsList" ? "symptoms" : "diagnosis"
            console.log("==========>", resType, reqInput, FHIRData, reqMethod, reqQuery, token)
            let list = FHIRData.compose.include[0].concept;
            if(type == "symptoms" && list.length != symptomsMap.size){
                populateSymptomMap(list);
            }
            else if(type == "diagnosis" && list.length != diagnosisMap.size){
                populateDiagnosisMap(diagnosisList);
            }
            let valueSet = new ValueSet(reqInput, FHIRData, type);            
            resourceResult = valueSet.getFHIRToJSONOutput();
            return {resourceResult, errData};
    }
    catch (e) {
        return Promise.reject(e);
    }

}

const setConditionData = async (resType, reqInput, FHIRData, reqMethod, reqQuery, token) => {
    try {
        let resourceResult = [], errData = [];
        if (["post", "POST", "PUT", "put"].includes(reqMethod)) {
            resourceResult = await saveSymptomDiagnosisData(resType, reqInput, FHIRData, reqMethod, reqQuery, token);
            }
        
        else if (["PATCH", "patch"].includes(reqMethod)) {
            console.log("Symptom and Diagnosis Patch");
            const allSymptomEncounterIds = reqInput.map(e=> e.symDiagFhirId).join(",")
            let allResources = await bundleOp.searchData(config.baseUrl + "Encounter", {"_revinclude:0": "Condition:encounter", "_revinclude:1": "Observation:encounter", "_id": allSymptomEncounterIds, _count: 2000}, token)
            const subEncounterResources = allResources.data.entry.filter(e => e.resource.resourceType == "Encounter").map(e => e.resource)
            allResources = allResources.data.entry
            for(let symDiagData of reqInput) {                
                const subEncounter = subEncounterResources.filter(e => e.id == symDiagData.symDiagFhirId)[0];
                let subEncounterData = new Encounter({}, subEncounter).patchSystemDiagnosisSubEncounter();
                const subEncounterPatch = await bundleFun.setBundlePut(subEncounterData, subEncounterData.indentifier, subEncounter.id, "PUT");  
                resourceResult.push(subEncounterPatch)
                const patientId = subEncounter.subject.reference.split("/")[1]
                const observationResource = allResources.filter(e => e.resource.resourceType == "Observation" && e.resource.encounter.reference.split("/")[1] == symDiagData.symDiagFhirId)
                 
                symDiagData.patientId = patientId
                symDiagData.encounterId = symDiagData.symDiagFhirId
                symDiagData.practitionerId = token.userId
                symDiagData.newEnc = false;
                symDiagData.onsetDateTime = symDiagData.createdOn;
                // observation patch logic
                const symptomBundle = await observationResourcePatch(observationResource, symDiagData);
                if(Object.keys(symptomBundle).length > 0)
                    resourceResult.push(symptomBundle)
                //  diagnosis resources logic
                const conditionResources = allResources.filter(e => e.resource.resourceType == "Condition" && e.resource.encounter.reference.split("/")[1] == symDiagData.symDiagFhirId).map(e => e.resource)
                const conditionBundle = await conditionResourcePatch(conditionResources, symDiagData, token);
                if(conditionBundle.length > 0) {
                    resourceResult = [...resourceResult, ...conditionBundle]
                }                    
            }
        }
        else {
            resourceResult = await getSymptomDiagnosisData(resType, reqInput, FHIRData, reqMethod, reqQuery, token)
        }
        console.log( "==============> " ,resourceResult)
        // resourceResult = []
        return { resourceResult, errData };
    }
    catch(e) {
        return Promise.reject(e);
    }
}

const observationResourcePatch = async function(observationResource, symDiagData, token) {
    try {
        //  If symptoms do not exist create resource from symptoms list
    let symptomBundle = {}
    const observationId =  uuidv4()
    symDiagData.uuid = observationId
    if(observationResource.length == 0 && symDiagData.symptoms.length > 0) {
        let symptomResource = new Observation(symDiagData, {}).setJsonTOFhir();
        symptomBundle = await bundleFun.setBundlePost(symptomResource, symptomResource.identifier, observationId, "POST", "identifier", token);                
    }
    //  If symptoms resource exist but symptoms list is empty
    else if(observationResource.length > 0 && symDiagData.symptoms.length  == 0){
       symptomBundle = await bundleOp.setBundleDelete("Observation", observationResource[0].resource.id);       
    }
    // update existing symptom resource
    else if(symDiagData.symptoms.length > 0 ){
        let symptomResource = new Observation(symDiagData, {}).setJsonTOFhir();
        console.log(symptomResource, observationResource)
        observationResource[0].resource.component = symptomResource.component
        symptomBundle = await bundleFun.setBundlePost(observationResource[0].resource, null, observationResource[0].resource.id, "PUT", null);  
        
    }
    return symptomBundle
    }catch(e) {
        return Promise.reject(e)
    }
    
}

const conditionResourcePatch = async function(conditionResources, symDiagData, token) {
    try {
        let conditionResourcesList = [], newConditions = [], deleteConditions = [];
        const existingCodes = conditionResources.map(item => item.code.coding[0].code)
        console.log("existingCodes: ", existingCodes)
        //  find resources not having new code and create resource
        newConditions = symDiagData.diagnosis.filter(item => !existingCodes.includes(item))
        console.log("newConditions: ", newConditions)
        // find resources that existed but now needs to be deleted
        deleteConditions = conditionResources.filter(item => !symDiagData.diagnosis.includes(item.code.coding[0].code)).map(e => ({id: e.id, code: e.code.coding[0].code}))
        console.log("deleteConditions: ", deleteConditions)
        // check if conditionResources list is empty
        if(newConditions.length > 0 ) {
             // create condition resource
             newConditions.forEach(async (element)=> {
                symDiagData.uuid = uuidv4();
                symDiagData.encounterId = symDiagData.symDiagFhirId;
                symDiagData.practitionerId = token.userId;
                symDiagData.onsetDateTime = symDiagData.createdOn;
                symDiagData.diagnosis = element;
                const conditionResource = new Condition(symDiagData, {}).getJsonToFhirTranslator();
                const conditionResourcePost = await bundleFun.setBundlePost(conditionResource, null, symDiagData.uuid, "POST", "identifier");
                conditionResourcesList.push(conditionResourcePost)
            }) 
        }
        if(deleteConditions.length > 0) {
            deleteConditions.forEach(async (element) => {
                let deleteCondition = await bundleOp.setBundleDelete("Condition", element.id);
                conditionResourcesList.push(deleteCondition)
            })                
        }
        console.log(conditionResourcesList)
        return conditionResourcesList;
    }
    catch(e) {
        return Promise.reject(e);
    }
}

const saveSymptomDiagnosisData = async function(resType, reqInput, FHIRData, reqMethod, reqQuery, token) {
    let resourceResult = []
    try{
        const appointmentIds = reqInput.map(e=> e.appointmentId).join(",");
        // fetch main encounter using appointment id
            const getMainEncounters = await bundleOp.searchData(config.baseUrl + "Encounter", { "appointment": appointmentIds, _count: 5000 , "_include": "Encounter:appointment" }, token);
            if(getMainEncounters.data.entry.length == 0) {
                return []
            }
            const mainEncounters = getMainEncounters.data.entry.map(e => e.resource)
            
            for(let symDiagData of reqInput) {
                let mainEncounter = mainEncounters.filter(e => e.resourceType == "Encounter" && e.appointment[0]?.reference?.split('/')[1] == symDiagData.appointmentId)
                console.log("Symptom and Diagnosis POST");
                mainEncounter = mainEncounter[0]
                const patientId = mainEncounter.subject.reference.split("/")[1];
                //  create sub encounter
                let subEncounter = new Encounter({ 
                    id: symDiagData.symDiagUuid,  encounterId: mainEncounter.id, patientId: patientId,
                    vitalUuid: symDiagData.symDiagUuid, practitionerId: token.userId, createdOn: symDiagData.createdOn,
                    orgId: token.orgId
                }, {}).getUserInputToFhirForVitals();
                subEncounter.identifier[0].system = "http://hl7.org/fhir/sid/sn/diagnosis"
                subEncounter.type =  [
                    {
                        "coding": [
                            {
                                "system": "http://your-custom-coding-system",
                                "code": "symptom-diagnosis-encounter",
                                "display": "Symptom Diagnosis encounter"
                            }
                        ]
                    }
                ]
               
                let subEncounterBundle = await bundleFun.setBundlePost(subEncounter, null, subEncounter.id, "POST", "identifier");
                resourceResult.push(subEncounterBundle)
                // create symptom Observation  
                if(symDiagData.symptoms.length > 0) {
                    let observationId =  uuidv4()             
                let symptomResource = new Observation({patientId: patientId, encounterId: symDiagData.symDiagUuid,
                    practitionerId: token.userId, symptoms: symDiagData.symptoms, uuid: observationId, newEnc: true
                }, {}).setJsonTOFhir()
                let symptomBundle = await bundleFun.setBundlePost(symptomResource, null, observationId, "POST", "identifier");                
                resourceResult.push(symptomBundle)
                }               

                // create condition resources
                symDiagData.diagnosis.forEach(async (element)=> {
                    symDiagData.uuid = uuidv4();
                    symDiagData.encounterId = symDiagData.symDiagUuid;
                    symDiagData.patientId =patientId;
                    symDiagData.practitionerId = token.userId;
                    symDiagData.onsetDateTime = symDiagData.createdOn;
                    symDiagData.diagnosis = element;
                    const conditionResource = new Condition(symDiagData, {}).getJsonToFhirTranslator();
                    const conditionResourcePost = await bundleFun.setBundlePost(conditionResource, null, symDiagData.uuid, "POST", "identifier");
                    resourceResult.push(conditionResourcePost)
                })                 
        }
        return resourceResult;
    }
    catch(e) {return Promise.reject(e)}
    
}

const getSymptomDiagnosisData = async function(resType, reqInput, FHIRData, reqMethod, reqQuery, token){
    let resourceResult = []
    try {
        console.info("Symptom and Diagnosis GET", FHIRData);       
        let mainEncounterList = FHIRData.filter(e => e.resource.resourceType == "Encounter" && e.resource.appointment).map(e => e.resource);
        let subEncounterList = FHIRData.filter(e => e.resource.resourceType == "Encounter" && e.resource.type && e.resource.type[0].coding[0].code == "symptom-diagnosis-encounter").map(e => e.resource);
        const practitonerIdList = subEncounterList.map(e=> e.participant[0].individual.reference.split("/")[1]).join(",")
        let practitionerData = await bundleOp.searchData(config.baseUrl + "Practitioner", { _id: practitonerIdList, _count: 100000 }, token);
        practitionerData = practitionerData.data.entry;
        for(let encounter of subEncounterList){
                let diagnosisList = [];
                const mainEncounter = mainEncounterList.filter(e => e.id = encounter.partOf.reference.split("/")[1])[0]
                const symptomObservation = FHIRData.filter(e => e.resource.resourceType == "Observation" && e.resource.encounter.reference.split("/")[1] == encounter.id)
                const diagnosisResources = FHIRData.filter(e => e.resource.resourceType == "Condition" && e.resource.encounter.reference.split("/")[1] == encounter.id).map(e => e.resource)
                if(diagnosisResources.length > 0)
                    diagnosisList = diagnosisResources.map(element => {
                    const data = new Condition({}, element).getFHIRToUserResponse()                    
                    return data
                })
                let symptomResource = []
                if(symptomObservation.length > 0) {
                    symptomResource = new Observation({}, symptomObservation[0].resource).getFhirToJson()
                }                     
                let practitioner = practitionerData.filter((e) => e?.resource?.id == encounter?.participant[0].individual.reference.split("/")[1]);
                let practitionerName = practitioner.length > 0 ? (practitioner?.[0]?.resource?.name?.[0]?.given?.join(' ') || '') + ' ' + (practitioner?.[0]?.resource?.name?.[0]?.family || "") : "";
                 let subEncounter = {
                    patientId: encounter?.subject?.reference?.split('/')?.[1] || null,
                    symDiagFhirId: encounter.id,
                    symDiagUuid: encounter.identifier[0].value,
                    appointmentId: mainEncounter.appointment[0].reference.split("/")[1]  ,
                    appointmentUuid: mainEncounter.identifier[0].value,
                    symptoms: symptomResource?.symptoms || [],
                    createdOn: encounter.period.start,
                    diagnosis: diagnosisList,
                    practitionerName: practitionerName.trim()
                }
                console.log(subEncounter)
                resourceResult.push(subEncounter)
        }
        return resourceResult
    }
    catch (e) {
        return Promise.reject(e)
    }
}

module.exports = { manageValueSetData, setConditionData }