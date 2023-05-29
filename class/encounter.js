let { checkEmptyData } = require("../services/CheckEmpty");

class Encounter {
    prescriptionObj;
    fhirResource;

    constructor(prescription_obj, fhir_resource) {
        this.prescriptionObj = prescription_obj;
        this.fhirResource = fhir_resource;
    }

    setuuid() {
        this.fhirResource.identifier.push({
               "system": "http://hl7.org/fhir/sid/sn",
               "value": this.prescriptionObj.prescriptionId
        })
        this.fhirResource.status = "finished";
    }
    
    getId() {
        this.prescriptionObj.prescriptionId = this.fhirResource.identifier[0].value;
    }

    setPatientReference() {
        this.fhirResource.subject.reference = "Patient/" + this.prescriptionObj.patientId
    }

    getPatientReference() {
        this.prescriptionObj.patientId = this.fhirResource.subject.reference;
    }

    setEncounterTime() {
        this.fhirResource.period = {
            "start": this.prescriptionObj.generatedOn,
            "end": this.prescriptionObj.generatedOn
        }
    }

    getEncounterTime() {
        this.prescriptionObj.generatedOn = this.fhirResource.authoredOn;
    }

    getUserInputToFhir() {
        this.setBasicStructure();
        this.setuuid();
        this.setPatientReference();
        this.setEncounterTime();
    }

    getFhirToJson() {
        this.getId();
        this.getEncounterTime();
        this.getPatientReference();
    }

    getEncounterResource() {
        return this.prescriptionObj;
    }

    getFHIRResource() {
        return this.fhirResource;
    }

    setBasicStructure() {
        this.fhirResource.identifier = [];
        this.fhirResource.subject = {};
    }

}


module.exports = Encounter;