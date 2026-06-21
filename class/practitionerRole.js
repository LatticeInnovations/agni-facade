const roleJson = require("../utils/role.json");
class PractitionerRole {
    roleObj;
    fhirResource;

    constructor(roleObj, fhir_resource) {
        this.roleObj = roleObj;
        this.fhirResource = fhir_resource;
    }

    setOrganizationReference() {
        if(this.roleObj.orgId != null) 
            this.fhirResource.organization.reference = "Organization/"+this.roleObj.orgId;
    }

    getOrganizationRole() {
        let result = roleJson.find(a => a.code === this.fhirResource.code[0].coding[0].code);
            this.roleObj.roleId =  this.fhirResource.code[0].coding[0].code;
            this.roleObj.role = result.display
    }
    setPractitionerReference() {
        this.fhirResource.practitioner.reference = "urn:uuid:" + this.roleObj.userUUid
    }

    setRole() {
        let result = roleJson.find(a => a.code === this.roleObj.roleId);
        this.fhirResource.code = [{
            "coding": [{
                "system" : result.system,
                "code": result.code,
            }],
            "text" : result.display
    }]
    }


    getUserInputToFhir() {
        this.setBasicStructure();
        this.setOrganizationReference();
        this.setPractitionerReference();
        this.setRole();
    }

    getFhirToJson() {
        this.getOrganizationRole();
    }

    getFHIRResource() {
        return this.fhirResource;
    }
    getRoleJson() {
        return this.roleObj;
    }

    setBasicStructure() {
        this.fhirResource.code = [];
        this.fhirResource.organization = {};
        this.fhirResource.practitioner = {};
        this.fhirResource.resourceType = "PractitionerRole"
    }

}


module.exports = PractitionerRole;