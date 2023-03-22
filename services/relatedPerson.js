const { v4: uuidv4 } = require('uuid');
let { checkEmptyData } = require("./CheckEmpty");
class RelatedPerson {

    relationObject; fhirResource;

    constructor(relationObject, fhirResource) {
        this.relationObject = relationObject;
        this.fhirResource = fhirResource;        
    }

    setRelationData() {
        this.fhirResource.id = uuidv4();
        this.fhirResource.resourceType = "RelatedPerson";
        this.fhirResource.relationship = [];
    }
    setPatientReference() {
        console.log(this.relationObject)
        this.fhirResource.patient = {"reference" : "Patient/" + this.relationObject.patientId.toString()};
    }

    getPatientReference() {
        this.relationObject.patientId = this.fhirResource.patient.reference.substring(this.fhirResource.patient.reference.indexOf('/') + 1);
    }
    
    setRelationship() {
        this.fhirResource.relationship.push({
            "coding": [{
                "system": "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
                "code": this.relationObject.relationCode
            }]
        })
        console.log("check relation object", this.relationObject)
    }

    getRelationship() {
        if(this.fhirResource.relationship) {
            this.relationObject.relationCode = this.fhirResource.relationship[0].coding[0].code;
        }
    }

    patchRelationship() {
        this.fhirResource.push({ "op": this.personObj.operation, "path": "/relationship/0/coding/0/code", value: this.personObj.relationCode});
        return this.fhirResource;
    }

    getJsonToFhirTranslator(relation_data) {
        this.setRelationData();
        this.setPatientReference();
        this.setRelationship();
        return this.fhirResource;
    }

    getFHIRtoJsonTranslator() {
        this.getPatientReference();
        this.getRelationship();
        return this.relationObject;
    }
}

module.exports = RelatedPerson