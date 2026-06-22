let Organization = require("../class/organization");
let Location = require("../class/location");

let setOrganizationData = async function (resType, reqInput, FHIRData, reqMethod) {
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

let createFacilityData = async function (facilityData) {
    try {
        let organization = {
            "resourceType": "Organization",
            "active": true,
            "type": [{
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/organization-type",
                    "code": "facility",
                    "display": "Facility"
                }]
            }],
            "name": facilityData.name,
            "address": [{
                "district": facilityData.district_id,
                "state": facilityData.state
            }]
        };

        if (facilityData.block) {
            organization.address[0].text = facilityData.block;
        }

        if (facilityData.block_code || facilityData.state_code || facilityData.dist_code) {
            organization.address[0].extension = [];
            if (facilityData.block_code) {
                organization.address[0].extension.push({
                    "url": "https://lattice.in/extension/address-block-code",
                    "valueString": facilityData.block_code
                });
            }
            if (facilityData.state_code) {
                organization.address[0].extension.push({
                    "url": "https://lattice.in/extension/address-state-code",
                    "valueString": facilityData.state_code
                });
            }
            if (facilityData.dist_code) {
                organization.address[0].extension.push({
                    "url": "https://lattice.in/extension/address-dist-code",
                    "valueString": facilityData.dist_code
                });
            }
        }

        let location = {
            "resourceType": "Location",
            "status": "active",
            "name": facilityData.name,
            "managingOrganization": {}
        };

        if (facilityData.location_type === "google_maps_url") {
            location.extension = [{
                "url": "https://lattice.in/extension/google-maps-url",
                "valueString": facilityData.google_maps_url
            }];
        } else if (facilityData.location_type === "manual") {
            location.position = {
                "latitude": facilityData.latitude,
                "longitude": facilityData.longitude
            };
        }

        return { organization, location };
    } catch (e) {
        return Promise.reject(e);
    }
};

let updateFacilityData = async function (facilityData, facilityId) {
    try {
        let organization = {
            "resourceType": "Organization",
            "id": facilityId,
            "active": true,
            "type": [{
                "coding": [{
                    "system": "http://terminology.hl7.org/CodeSystem/organization-type",
                    "code": "facility",
                    "display": "Facility"
                }]
            }],
            "name": facilityData.name,
            "address": [{
                "district": facilityData.district_id,
                "state": facilityData.state
            }]
        };

        if (facilityData.block) {
            organization.address[0].text = facilityData.block;
        }

        if (facilityData.block_code || facilityData.state_code || facilityData.dist_code) {
            organization.address[0].extension = [];
            if (facilityData.block_code) {
                organization.address[0].extension.push({
                    "url": "https://lattice.in/extension/address-block-code",
                    "valueString": facilityData.block_code
                });
            }
            if (facilityData.state_code) {
                organization.address[0].extension.push({
                    "url": "https://lattice.in/extension/address-state-code",
                    "valueString": facilityData.state_code
                });
            }
            if (facilityData.dist_code) {
                organization.address[0].extension.push({
                    "url": "https://lattice.in/extension/address-dist-code",
                    "valueString": facilityData.dist_code
                });
            }
        }

        let location = {
            "resourceType": "Location",
            "status": "active",
            "name": facilityData.name,
            "managingOrganization": {
                "reference": "Organization/" + facilityId
            }
        };

        if (facilityData.location_type === "google_maps_url") {
            location.extension = [{
                "url": "https://lattice.in/extension/google-maps-url",
                "valueString": facilityData.google_maps_url
            }];
        } else if (facilityData.location_type === "manual") {
            location.position = {
                "latitude": facilityData.latitude,
                "longitude": facilityData.longitude
            };
        }

        return { organization, location };
    } catch (e) {
        return Promise.reject(e);
    }
};

module.exports = { setOrganizationData, createFacilityData, updateFacilityData }