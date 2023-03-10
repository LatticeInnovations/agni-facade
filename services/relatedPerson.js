let uuid = require("uuid");
class RelatedPerson {

    relation_object; fhir_resource;

    constructor(relation_object, fhir_resource) {
        this.relation_object = relation_object;
        this.fhir_resource = fhir_resource;
        this.fhir_resource.id = uuid();
        this.fhir_resource.resourceType = "RelatedPerson"
        this.fhir_resource.relation = [];
    }

    setPatientReference() {
        this.fhir_resource.patient = this.relation_object.patientId;
    }


    setRelationship() {
        this.fhir_resource.relation.push({
            "system": "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
            "code": this.relation_object.relationCode,
        })

    }

    getJsonToFhirTranslator(relation_data) {
        this.setPatientReference();
        this.setRelationship(relation_data);
        return this.fhir_resource;
    }


}