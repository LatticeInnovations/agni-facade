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
        //  changed for anni for school planned apptStatus
        let statusData = apptStatus.find(e => e.uiStatus == this.prescriptionObj.status);
        this.fhirResource.status = statusData.encounter;
    }
    
    getId() {
        console.info(this.fhirResource.id);
        this.prescriptionObj.appointmentUuid = this.fhirResource?.identifier[0]?.value;
        this.prescriptionObj.prescriptionId =  this.fhirResource?.identifier[1]?.value;
        this.prescriptionObj.prescriptionFhirId = this.fhirResource?.id;
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
        this.prescriptionObj.appointmentId = this?.fhirResource?.appointment?.[0]?.reference?.split("/")[1] || null;
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

    getUserInputToFhirForVitals() {
        this.fhirResource.resourceType = "Encounter";
        this.fhirResource.id = this.prescriptionObj.id;
        this.fhirResource.identifier = [];
        this.fhirResource.subject = {};
        this.setPatientReference();
        this.fhirResource.type = [
            {
                "coding": [
                            {
                                "system": "http://your-custom-coding-system",
                                "code": "vital-encounter",
                                "display": "Vital encounter"
                            }
                        ]
            }
        ];
        this.fhirResource.period = {
            "start": this.prescriptionObj.createdOn,
            "end": this.prescriptionObj.createdOn
        }
        this.fhirResource.partOf = {
            "reference": "Encounter/" + this.prescriptionObj.encounterId,
            "display": "Primary Encounter"
        }

        this.fhirResource.identifier.push({
            "system": config.snUrl + '/vital',
            "value": this.prescriptionObj.vitalUuid
        });
        this.fhirResource.participant = [{
            "individual" : {
                "reference": "Practitioner/" + this.prescriptionObj.practitionerId
            }
        }];
        this.fhirResource.length = {
            "value": new Date().valueOf(),
            "unit": "millisecond",
            "system": "http://unitsofmeasure.org",
            "code": "ms"
        };
        return this.fhirResource;
    }

    getVitalUuid() {
        this.prescriptionObj.vitalUuid = this?.fhirResource?.identifier?.[this?.fhirResource?.identifier?.length - 1]?.value || null;
    }

    getCVDUuid() {
        this.prescriptionObj.cvdUuid = this?.fhirResource?.identifier?.[this?.fhirResource?.identifier?.length - 1]?.value || null;
    }

    getFhirToJsonForVitals() {
        this.getId();
        this.getAppointmentReference();
        this.getPatientReference();
        this.getEncounterTime();
        this.getPractitionerReference();
        this.getPrimaryEncounterReference();
        this.getVitalUuid();
    }

    getFhirToJsonForCVD() {
        this.getId();
        this.getAppointmentReference();
        this.getPatientReference();
        this.getEncounterTime();
        this.getPractitionerReference();
        this.getPrimaryEncounterReference();
        this.getCVDUuid();
    }


    getPractitionerReference() {
        this.prescriptionObj.practitionerId = this?.fhirResource?.participant?.[0]?.individual?.reference?.split('/')[1] || null;
    }

    getPrimaryEncounterReference() {
        this.prescriptionObj.primaryEncounterId = this?.fhirResource?.partOf?.reference?.split('/')[1] || null;
    }

    getUserInputToFhirForCVD() {
        this.fhirResource.resourceType = "Encounter";
        this.fhirResource.id = this.prescriptionObj.id;
        this.fhirResource.identifier = [];
        this.fhirResource.subject = {};
        this.setPatientReference();
        this.fhirResource.type = [
            {
                "coding": [
                            {
                                "system": "http://your-custom-coding-system",
                                "code": "cvd-encounter",
                                "display": "CVD encounter"
                            }
                        ]
            }
        ];
        this.fhirResource.period = {
            "start": this.prescriptionObj.createdOn,
            "end": this.prescriptionObj.createdOn
        }
        this.fhirResource.partOf = {
            "reference": "Encounter/" + this.prescriptionObj.encounterId,
            "display": "Primary Encounter"
        }

        this.fhirResource.identifier.push({
            "system": config.snUrl + '/CVD',
            "value": this.prescriptionObj.cvdUuid
        });
        this.fhirResource.participant = [{
            "individual" : {
                "reference": "Practitioner/" + this.prescriptionObj.practitionerId
            }
        }];
        this.fhirResource.length = {
            "value": new Date().valueOf(),
            "unit": "millisecond",
            "system": "http://unitsofmeasure.org",
            "code": "ms"
        };
        return this.fhirResource;
    }
    
}


module.exports = Encounter;