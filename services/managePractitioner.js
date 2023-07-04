let Practitioner = require("../class/practitioner");
let bundleFun = require("./bundleOperation");
let config = require("../config/nodeConfig");
const { v4: uuidv4 } = require('uuid');
let bundleOp = require("./bundleOperation");

let setPractitionerData = async function (resType, reqInput, FHIRData, reqMethod) {
    try {
        let resource_result = [];
        if (["post", "POST", "PUT", "put"].includes(reqMethod)) {
            for (let practitionerData of reqInput) {
                 // Check if practitioner    
                 let queryParam ={"_total": "accurate"};
                 if(practitionerData.email) {
                    practitionerData.email = practitionerData.email.toLowerCase();
                    queryParam.email = practitionerData.email;
                 }
                 if(practitionerData.mobileNumber) 
                    queryParam.phone = practitionerData.mobileNumber;
                 let existingPractioner = await bundleOp.searchData(config.baseUrl + "Practitioner", queryParam);
                 if (+existingPractioner.data.total != 0) {
                     let e = { status: 0, code: "ERR", response: "Practitioner data already exists." }
                     return Promise.reject(e)
                 }
                 else {
                    let practitioner = new Practitioner(practitionerData, FHIRData);
                    practitioner.getJsonToFhirTranslator();
                    let practitionerResource = {};
                    practitionerResource = {...practitioner.getFHIRResource()};
                    practitionerResource.resourceType = resType;
                    practitionerResource.id = uuidv4();
                    let practitionerBundle = await bundleFun.setBundlePost(practitionerResource, practitionerResource.telecom, practitionerResource.id, "POST", "telecom");  
                    resource_result.push(practitionerBundle);  
                 }
            }
        }
        else if (["patch", "PATCH"].includes(reqMethod)) {
            for (let inputData of reqInput) {
                let practitioner = new Practitioner(inputData, []);
                let link = config.baseUrl + resType;
                let resourceSavedData = await bundleFun.searchData(link, { "_id": inputData.id });
                if (resourceSavedData.data.total != 1) {
                    let e = { status: 0, code: "ERR", response: "Practitioner Id " + inputData.id + " does not exist."}
                   return Promise.reject(e);
                }
                practitioner.patchUserInputToFHIR(resourceSavedData.data.entry[0].resource);
                let resourceData = [...practitioner.getFHIRResource()];
                const patchUrl = resType + "/" + inputData.id;
                let patchResource = await bundleFun.setBundlePatch(resourceData, patchUrl);
                resource_result.push(patchResource);
            }
        }
        else {
            let practitioner = new Practitioner(reqInput, FHIRData);
            practitioner.getFHIRToUserInput();
            resource_result.push(practitioner.getPersonResource())
        }
        return resource_result;
    }
    catch (e) {
        return Promise.reject(e);
    }

}

module.exports = { setPractitionerData }