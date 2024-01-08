let Practitioner = require("../class/practitioner");
let bundleFun = require("./bundleOperation");
let config = require("../config/nodeConfig");
const { v4: uuidv4 } = require('uuid');
let bundleOp = require("./bundleOperation");
const PractitionerRole = require("../class/practitionerRole");

let setPractitionerData = async function (token, resType, reqInput, FHIRData, reqMethod) {
    try {
        let resourceResult = [], errData = [];
        if (["post", "POST", "PUT", "put"].includes(reqMethod)) {
           resourceResult =  await createPractitioner(token, resType, reqInput, FHIRData);
        }
        else if (["patch", "PATCH"].includes(reqMethod)) {
            for (let inputData of reqInput) {
                let practitioner = new Practitioner(inputData, []);
                let link = config.baseUrl + resType;
                let resourceSavedData = await bundleFun.searchData(token, link, { "_id": inputData.id });
                if (resourceSavedData.data.total != 1) {
                    let e = { status: 0, code: "ERR", message: "Practitioner Id " + inputData.id + " does not exist.", statusCode: 500}
                   return Promise.reject(e);
                }
                practitioner.patchUserInputToFHIR(resourceSavedData.data.entry[0].resource);
                let resourceData = [...practitioner.getFHIRResource()];
                const patchUrl = resType + "/" + inputData.id;
                let patchResource = await bundleFun.setBundlePatch(resourceData, patchUrl);
                resourceResult.push(patchResource);
            }
        }
        else {
            let practitioner = new Practitioner(reqInput, FHIRData);
            practitioner.getFHIRToUserInput();
            resourceResult.push(practitioner.getPersonResource())
        }
        return {resourceResult, errData};
    }
    catch (e) {
        return Promise.reject(e);
    }

}

async function createPractitioner(token, resType, reqInput, FHIRData) {
    let resourceResult = [];
    for (let practitionerData of reqInput) {
        let queryParam ={"_total": "accurate"};
        // if(practitionerData.email) {
        //    practitionerData.email = practitionerData.email.toLowerCase();
        //    queryParam.email = practitionerData.email;
        // }
        if(practitionerData.mobileNumber) 
           queryParam.phone = practitionerData.mobileNumber;
        let existingPractioner = await bundleOp.searchData(token, config.baseUrl + "Practitioner", queryParam);
        if (+existingPractioner.data.total != 0) {
            let e = { status: 0, code: "ERR", message: "Duplicate mobile number." , statusCode: 400}
            return Promise.reject(e);
        }
        else {
           let practitioner = new Practitioner(practitionerData, FHIRData);
           practitioner.getJsonToFhirTranslator();
           let practitionerResource = {};
           practitionerResource = {...practitioner.getFHIRResource()};
           practitionerResource.resourceType = resType;
           practitionerResource.id = uuidv4();
           let practitionerRoles = practitionerData.role;
           let practitionerBundle = await bundleFun.setBundlePost(practitionerResource, null, practitionerResource.id, "POST", "identifier");  
           resourceResult.push(practitionerBundle);  
           for(let role of practitionerRoles) {
               role.practitionerUUid =  practitionerResource.id;
               let practitionerRole = new PractitionerRole(role, {});
               practitionerRole.getUserInputToFhir();
               let roleResource = practitionerRole.getFHIRResource();
                roleResource.id = uuidv4();
                roleResource.resourceType = "PractitionerRole";
               let roleBundle = await bundleFun.setBundlePost(roleResource, null, roleResource.id, "POST", "identifier");
               resourceResult.push(roleBundle);
           }
         
        }
   }
   return resourceResult;
}

module.exports = { setPractitionerData }