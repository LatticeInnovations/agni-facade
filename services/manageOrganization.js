let Organization = require("../class/organization");
let Location = require("../class/location");
let bundleFun = require("./bundleOperation");
const { v4: uuidv4 } = require('uuid');

let setOrganizationData = async function (resType, reqInput, FHIRData, reqMethod) {
    try {
        let resource_result = [];
        if (["post", "POST", "PUT", "put"].includes(reqMethod)) {
            for (let orgData of reqInput) { 
            }
        }
        else if (["patch", "PATCH"].includes(reqMethod)) {
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
                resource_result.push(organizationData)
            }

        }
        return resource_result;
    }
    catch (e) {
        return Promise.reject(e);
    }

}

module.exports = { setOrganizationData }