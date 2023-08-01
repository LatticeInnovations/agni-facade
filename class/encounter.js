let apptStatus = require("../utils/appointmentStatus.json");
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
               "value": this.prescriptionObj.uuid
        });
    }

    setStatus() {
        let statusData = apptStatus.find(e => e.uiStatus == this.prescriptionObj.status);
        this.fhirResource.status = statusData.encounter;
    }
    
    getId() {
        console.log(this.fhirResource)
        this.prescriptionObj.prescriptionId = this.fhirResource.identifier[0].value;
        this.prescriptionObj.prescriptionFhirId = this.fhirResource.id;
    }

    setPatientReference() {
        this.fhirResource.subject.reference = "Patient/" + this.prescriptionObj.patientId
    }

    getPatientReference() {
        this.prescriptionObj.patientId = this.fhirResource.subject.reference.split("/")[1];
    }

    setAppointmentReference() {
        this.fhirResource.appointment.reference = "urn:uuid:" + this.prescriptionObj.uuid;
    }

    getAppointmentReference() {
        console.info(this.fhirResource)
        this.prescriptionObj.appointmentId = this.fhirResource.appointment[0].reference.split("/")[1];
    }

    setEncounterTime() {
        this.fhirResource.period = {
            "start": this.prescriptionObj.generatedOn,
            "end": this.prescriptionObj.generatedOn
        }
    }

    getEncounterTime() {
        this.prescriptionObj.generatedOn = this.fhirResource.period.start;
    }

    getUserInputToFhir() {
        this.setBasicStructure();
        this.setuuid();
        this.setPatientReference();
        this.setAppointmentReference();
        this.setEncounterTime();
        this.setStatus();
    }

    getFhirToJson() {
        this.getId();
        this.getAppointmentReference();
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
        this.fhirResource.appointment = {};
    }

}


module.exports = Encounter;