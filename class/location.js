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
        this.locationObj.organization = this.fhirResource?.managingOrganization?.reference || null
    }

   setStatus() {
    this.fhirResource.status = "active";
   }

   getStatus() {
    this.locationObj.status = this.fhirResource?.status || null;
   }

   setPosition() {
    this.fhirResource.position = {
        "latitude": this.locationObj.position.latitude,
        "longitude": this.locationObj.position.longitude
    }
   }

   getPosition() {
    this.locationObj.position = {
        "latitude": this.fhirResource?.position?.latitude || null,
        "longitude": this.fhirResource?.position?.longitude || null
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