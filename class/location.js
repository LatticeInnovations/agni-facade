// let { checkEmptyData } = require("../services/CheckEmpty");

class Location {
    locationObj;
    fhirResource;

    constructor(location_obj, fhir_resource) {
        this.locationObj = location_obj;
        this.fhirResource = fhir_resource;
    }

    setOrganizationReference() {
        this.fhirResource.managingOrganization = this.locationObj.orgUUID;
    }

    getOrganizationReference() {
        console.log("=====>", this.fhirResource.managingOrganization)
        this.locationObj.organization = this.fhirResource.managingOrganization.reference
    }

   setStatus() {
    this.fhirResource.status = "active";
   }

   getStatus() {
    this.locationObj.status = this.fhirResource.status;
   }

   setPosition() {
    this.fhirResource.position = {
        "latitude": this.locationObj.position.latitude,
        "longitude": this.locationObj.position.longitude
    }
   }

   getPosition() {
    this.locationObj.position = {
        "latitude": this.fhirResource.position.latitude,
        "longitude": this.fhirResource.position.longitude
    }
   }
  
    getUserInputToFhir() {
        this.setBasicStructure();
        this.setOrganizationReference();
        this.setStatus();
        this.setPosition();
    }

    getFhirToJson() {
        this.getOrganizationReference();
        this.getStatus();
        this.getPosition();
    }


    getLocationResource() {
        return this.locationObj;
    }

    getFHIRResource() {
        return this.fhirResource;
    }

    setBasicStructure() {
        this.fhirResource.position = {};
        this.fhirResource.managingOrganization = {};
    }

}


module.exports = Location;