let PractitionerRole = require("../class/practitionerRole");
let Organization = require("../class/organization");
let Practitioner = require("../class/practitioner");
let config = require("../config/nodeConfig");
let bundleOp = require("./bundleOperation");
const { v4: uuidv4 } = require('uuid');
let setPractitionerRoleData = async function (resourceType, reqInput, FHIRData, reqMethod, token) {
    try {
        let resourceResult = [], errData = [];
        if (["post", "POST", "put", "PUT"].includes(reqMethod)) {
            console.log(reqInput)
            // Fetch practitioner data if it already exists throw error
            let practitionerRoleData = await bundleOp.searchData(config.baseUrl + "PractitionerRole", { practitioner: reqInput.practitionerId}, token);
            console.log("exisiting practitioner role: ", practitionerRoleData)
            if(practitionerRoleData.data.total > 0)
               return  Promise.reject({statusCode: 404, code: "ERR", message: "Practitioner role already exists"})
            let practitionerRole = new PractitionerRole(reqInput,{})
            let practitionerResource = practitionerRole.setUserInputToFhir()
            practitionerResource.resourceType = resourceType;
            practitionerResource.id = uuidv4();
            let roleResource = await bundleOp.setBundlePost(practitionerResource, null, practitionerResource.id, "POST", "identifier");
            resourceResult.push(roleResource);
        }
        else if (["GET", "get"].includes(reqMethod)) {
            let role = [];
            let practitioner = FHIRData.find(e => e.resource.resourceType == "Practitioner");
            let practitionerData = new Practitioner({}, practitioner.resource);
            practitionerData.getFHIRToUserInput();
            practitionerData = practitionerData.getPersonResource();
            let roleArray = FHIRData.filter(e => e.resource.resourceType == "PractitionerRole");
            for (let i = 0; i < roleArray.length; i++) {                        
                let roleData = new PractitionerRole({}, roleArray[i].resource);
                roleData.getFhirToJson();
                let roleObj = roleData.getRoleJson();
                let orgResource = FHIRData.find(e => e.resource.resourceType == "Organization" && e.fullUrl.includes(roleArray[i].resource.organization.reference));
                let orgData = new Organization({},orgResource.resource);
                orgData.getFHIRToUserInput();
                orgData = orgData.getOrgResource();
                roleObj.orgId = orgData.orgId;
                roleObj.orgName = orgData.orgName,
                roleObj.orgType = orgData.orgType;
                role.push(roleObj);
            }
            let data = {
                "practitionerId": practitionerData.fhirId,
                "firstName": practitionerData.firstName,
                "middleName": practitionerData.middleName,
                "lastName": practitionerData.lastName,
                "mobileNumber" : practitionerData.mobileNumber,
                "email": practitionerData.email,
                "address": practitionerData.address,
                "role": role
            }
            resourceResult.push(data);
        }
        else if (["patch", "PATCH"].includes(reqMethod)) {
            console.log(reqMethod)
        }
        return {resourceResult, errData};
    }
    catch (e) {
        return Promise.reject(e);
    }
}




module.exports = { setPractitionerRoleData }