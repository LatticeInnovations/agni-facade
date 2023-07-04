let PractitionerRole = require("../class/practitionerRole");
let Organization = require("../class/organization");
let Practitioner = require("../class/practitioner");

let setPractitionerRoleData = async function (relatedPersonList, reqInput, FHIRData, reqMethod) {
    try {
        let resourceData = [];
        if (["post", "POST", "put", "PUT"].includes(reqMethod)) {

            return resourceData;

        }
        else if (["GET", "get"].includes(reqMethod)) {
            let outputArray = [];
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
                roleObj.orgId = orgData.orgId,
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
            outputArray.push(data)
            return outputArray;
        }
        else if (["patch", "PATCH"].includes(reqMethod)) {
            let deleteList = [];
            return resourceData;
        }

    }
    catch (e) {
        return Promise.reject(e);
    }
}




module.exports = { setPractitionerRoleData }