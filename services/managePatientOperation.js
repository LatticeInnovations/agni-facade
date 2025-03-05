let Person = require("../class/person");
let bundleFun = require("./bundleOperation");
let config = require("../config/nodeConfig");
const { v4: uuidv4 } = require('uuid');
let ImmunizationRecommendation = require('../class/ImmunizationRecommendation');
const vaccines = require('../utils/vaccines.json');

let setPatientData = async function (resType, reqInput, FHIRData, reqMethod, token) {
    try {
        let resourceResult = [], errData = [];
        if (["post", "POST", "PUT", "put"].includes(reqMethod)) {
            for (let patientData of reqInput) {
                let patient = new Person(patientData, FHIRData, token);
                patient.getJsonToFhirTranslator();
                let patientResource = {};
                patientResource = { ...patient.getFHIRResource() };
                patientResource.resourceType = resType;
                let personInput = { patientId: patientData.id };
                let person1 = new Person(personInput, {});
                person1.setBasicStructure();
                person1.setLink(patientData.id);
                let personResource = { ...person1.getFHIRResource() };
                personResource.identifier = patientResource.identifier;
                personResource.resourceType = "Person";
                personResource.id = uuidv4();
                const vaccineCodes = Object.keys(vaccines);
                let patientBundle = await bundleFun.setBundlePost(patientResource, patientResource.identifier, patientData.id, "POST", "identifier");
                let personBundle = await bundleFun.setBundlePost(personResource, patientResource.identifier, personResource.id, "POST", "identifier");
                for (let code of vaccineCodes) {
                    let ImmunizationRecommendationResource = new ImmunizationRecommendation({
                        patientId: patientData.id,
                        orgId: token.orgId,
                        code: code,
                        birthDate: patientData.birthDate
                    }, {});
                    ImmunizationRecommendationResource = ImmunizationRecommendationResource.getJsonToFhirTranslator();
                    let ImmunizationRecommendationBundle = await bundleFun.setBundlePost(ImmunizationRecommendationResource, null, ImmunizationRecommendationResource.id, "POST", "identifier");
                    resourceResult.push(ImmunizationRecommendationBundle);
                }
                resourceResult.push(patientBundle, personBundle);
            }
        }
        else if (["patch", "PATCH"].includes(reqMethod)) {
            for (let inputData of reqInput) {
                let patient = new Person(inputData, []);
                let link = config.baseUrl + resType;
                let resourceSavedData = await bundleFun.searchData(link, { "_id": inputData.id });
                if (resourceSavedData.data.total != 1) {
                    let e = { status: 0, code: "ERR", message: "Patient Id " + inputData.id + " does not exist.", statusCode: 500 }
                    return Promise.reject(e);
                }
                patient.patchUserInputToFHIR(resourceSavedData.data.entry[0].resource);
                let resourceData = [...patient.getFHIRResource()];
                const patchUrl = resType + "/" + inputData.id;
                let patchResource = await bundleFun.setBundlePatch(resourceData, patchUrl);
                resourceResult.push(patchResource);
                if(inputData?.birthDate){
                    let immunizationRecommendationData = await bundleFun.searchData(config.baseUrl + "ImmunizationRecommendation", { "patient": inputData.id });
                    immunizationRecommendationData = immunizationRecommendationData?.data?.entry?.map(e => e.resource) || [];
                    for(let fhirData of immunizationRecommendationData){
                        let patchImmunizationRecommendation = new ImmunizationRecommendation({ birthDate : inputData?.birthDate.value }, fhirData).patchImmunizationRecommendation();
                        patchImmunizationRecommendation = await bundleFun.setBundlePatch(patchImmunizationRecommendation, "ImmunizationRecommendation/" + fhirData.id);
                        resourceResult.push(patchImmunizationRecommendation);
                    }
                }
            }
        }
        else {
            let patient = new Person(reqInput, FHIRData, token);
            patient.getFHIRToUserInput();
            resourceResult.push(patient.getPersonResource())
        }
        return { resourceResult, errData };
    }
    catch (e) {
        return Promise.reject(e);
    }

}

module.exports = { setPatientData }