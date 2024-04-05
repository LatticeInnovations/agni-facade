let apptStatus = require("../utils/appointmentStatus.json");
const config = require("../config/nodeConfig")
class Encounter {
    prescriptionObj;
    fhirResource;

    constructor(prescription_obj, fhir_resource) {
        this.prescriptionObj = prescription_obj;
        this.fhirResource = fhir_resource;
    }

    setuuid() {
        this.fhirResource.identifier.push({
               "system": config.snUrl,
               "value": this.prescriptionObj.uuid
        });
    }

    setStatus() {
        let statusData = apptStatus.find(e => e.uiStatus == this.prescriptionObj.status);
        this.fhirResource.status = statusData.encounter;
    }
    
    getId() {
        console.info(this.fhirResource.id);
        this.prescriptionObj.appointmentUuid = this.fhirResource.identifier[0].value;
        this.prescriptionObj.prescriptionId =  this.fhirResource.identifier[1].value;
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
        this.prescriptionObj.appointmentId = this.fhirResource.appointment[0].reference.split("/")[1];
    }

    setEncounterTime() {
        if(this.prescriptionObj.generatedOn) {
            this.fhirResource.period = {
                "start": this.prescriptionObj.generatedOn,
                "end": this.prescriptionObj.generatedOn
            }
        }

    }

    getEncounterTime() {
        if(this.fhirResource.period)
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
        this.getEncounterTime();
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