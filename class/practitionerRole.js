const roleJson = require("../utils/role.json");
class PractitionerRole {
    roleObj;
    fhirResource;

    constructor(location_obj, fhir_resource) {
        this.roleObj = location_obj;
        this.fhirResource = fhir_resource;
    }

    setOrganizationReference() {
        this.fhirResource.organization.reference = "Organization/"+this.roleObj.orgId;
    }

    getOrganizationRole() {
        let result = roleJson.find(a => a.code === this.fhirResource.code[0].coding[0].code);
            this.roleObj.roleId =  this.fhirResource.code[0].coding[0].code;
            this.roleObj.role = result.display
    }
    setPractitionerReference() {
        this.fhirResource.practitioner.reference = "Practitioner/"+this.roleObj.orgId;
    }

    setRole() {
        let result = roleJson.find(a => a.code === this.roleObj.roleId);
        this.fhirResource.code[0].coding = [
            {
                "system" : result.system,
                "code": result.code,
            }
        ]
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
    }

}


module.exports = PractitionerRole;