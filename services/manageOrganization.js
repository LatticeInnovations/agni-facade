let Organization = require("../class/organization");
let Location = require("../class/location");

let setOrganizationData = async function (token, resType, reqInput, FHIRData, reqMethod) {
    try {
        let resourceResult = [], errData = [];
        if (["post", "POST", "PUT", "put"].includes(reqMethod)) {
            for (let orgData of reqInput) { 
                console.log(orgData)
            }
        }
        else if (["patch", "PATCH"].includes(reqMethod)) {
            console.log(reqMethod)
        }
        else {
            let orgList = FHIRData.filter(e => e.resource.resourceType == "Organization").map(e => e.resource);
            for (let orgData of orgList) { 
                let locationResource = FHIRData.filter(e => e.resource.resourceType == "Location" && e.resource.managingOrganization.reference == "Organization/" + orgData.id).map(e => e.resource)[0];
                let organization = new Organization({}, orgData );
                organization.getFHIRToUserInput();
                let organizationData = organization.getOrgResource();
                let location = new Location({}, locationResource);
                location.getFhirToJson();
                let locationData = location.getLocationResource();
                organizationData.position = locationData.position;
                console.info(organizationData);
                resourceResult.push(organizationData)
            }

        }
        return {resourceResult, errData};
    }
    catch (e) {
        return Promise.reject(e);
    }

}

module.exports = { setOrganizationData }