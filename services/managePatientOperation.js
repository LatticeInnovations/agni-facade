let Person = require("../class/person");
let bundleFun = require("./bundleOperation");
let config = require("../config/config");
const { v4: uuidv4 } = require('uuid');

let setPatientData = async function (resType, reqInput, FHIRData, reqMethod) {
    try {
        let resource_result = [];
        if (["post", "POST", "PUT", "put"].includes(reqMethod)) {
            for (let patientData of reqInput) {
                let patient = new Person(patientData, FHIRData);
                patient.getJsonToFhirTranslator();
                let patientResource = {};
                patientResource = {...patient.getFHIRResource()};
                patientResource.resourceType = resType;
                let personInput = { patientId: patientData.id };
                let person1 = new Person(personInput, {});
                person1.setBasicStructure();
                person1.setLink(patientData.id);
                let personResource = {...person1.getFHIRResource()};
                personResource.identifier = patientResource.identifier;
                personResource.resourceType = "Person";
                personResource.id = uuidv4();
                let patientBundle = await bundleFun.setBundlePost(patientResource, patientResource.identifier, patientData.id, "POST");   
                let personBundle = await bundleFun.setBundlePost(personResource, patientResource.identifier, personResource.id, "POST");  
                resource_result.push(patientBundle, personBundle);  
            }
        }
        else if (["patch", "PATCH"].includes(reqMethod)) {
            for (let inputData of reqInput) {
                let patient = new Person(inputData, []);
                let link = config.baseUrl + resType;
                let resourceSavedData = await bundleFun.searchData(link, { "_id": inputData.id });
                patient.patchUserInputToFHIR(resourceSavedData.data.entry[0].resource);
                let resourceData = [...patient.getFHIRResource()];
                const patchUrl = resType + "/" + inputData.id;
                let patchResource = await bundleFun.setBundlePatch(resourceData, patchUrl);
                resource_result.push(patchResource);
            }
        }
        else {
            let patient = new Person(reqInput, FHIRData);
            patient.getFHIRToUserInput();
            resource_result.push(patient.getPersonResource())
        }
        return resource_result;
    }
    catch (e) {
        e = { status: 0, code: "ERR", e: e }
        return Promise.reject(e);
    }

}

module.exports = { setPatientData }