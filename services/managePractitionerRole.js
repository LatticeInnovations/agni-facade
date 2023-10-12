let PractitionerRole = require("../class/practitionerRole");
let Organization = require("../class/organization");
let Practitioner = require("../class/practitioner");

let setPractitionerRoleData = async function (token, relatedPersonList, reqInput, FHIRData, reqMethod) {
    try {
        let resourceResult = [], errData = [];
        if (["post", "POST", "put", "PUT"].includes(reqMethod)) {
            console.log(reqInput)
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