let apptStatus = require("../utils/appointmentStatus.json");
const config = require("../config/nodeConfig")
class Encounter {
    encounterObj;
    fhirResource;

    constructor(prescription_obj, fhir_resource) {
        this.encounterObj = prescription_obj;
        this.fhirResource = fhir_resource;
    }

    setuuid() {
        this.fhirResource.identifier.push({
               "system": config.snUrl,
               "value": this.encounterObj.uuid
        });
    }

    setStatus() {
        //  changed for anni for school planned apptStatus
        let statusData = apptStatus.find(e => e.uiStatus == this.encounterObj.status);
        this.fhirResource.status = statusData.encounter;
    }
    
    getId() {
        console.info(this.fhirResource);
        this.encounterObj.appointmentUuid = this.fhirResource?.identifier[0]?.value;
    }

    setPatientReference() {
        this.fhirResource.subject.reference = "Patient/" + this.encounterObj.patientId
    }

    getPatientReference() {
        this.encounterObj.patientId = this.fhirResource.subject.reference.split("/")[1];
    }

    setAppointmentReference() {
        this.fhirResource.appointment.reference = "urn:uuid:" + this.encounterObj.uuid;
    }

    getAppointmentReference() {
        this.encounterObj.appointmentId = this?.fhirResource?.appointment?.[0]?.reference?.split("/")[1] || null;
    }

    setEncounterTime() {
        if(this.encounterObj.generatedOn) {
            this.fhirResource.period = {
                "start": this.encounterObj.generatedOn,
                "end": this.encounterObj.generatedOn
            }
        }

    }

    getEncounterTime() {
        if(this.fhirResource.period)
        this.encounterObj.generatedOn = this.fhirResource.period.start;
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
        return this.encounterObj
    }

    getEncounterResource() {
        return this.encounterObj;
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
        this.fhirResource.id = this.encounterObj.id;
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
            "start": this.encounterObj.createdOn,
            "end": this.encounterObj.createdOn
        }
        this.fhirResource.partOf = {
            "reference": "Encounter/" + this.encounterObj.encounterId,
            "display": "Primary Encounter"
        }

        this.fhirResource.identifier.push({
            "system": config.snUrl + '/vital',
            "value": this.encounterObj.vitalUuid
        });
        this.fhirResource.participant = [{
            "individual" : {
                "reference": "Practitioner/" + this.encounterObj.practitionerId
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
        this.encounterObj.vitalUuid = this?.fhirResource?.identifier?.[this?.fhirResource?.identifier?.length - 1]?.value || null;
    }

    getCVDUuid() {
        this.encounterObj.cvdUuid = this?.fhirResource?.identifier?.[this?.fhirResource?.identifier?.length - 1]?.value || null;
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
        this.encounterObj.practitionerId = this?.fhirResource?.participant?.[0]?.individual?.reference?.split('/')[1] || null;
    }

    getPrimaryEncounterReference() {
        this.encounterObj.primaryEncounterId = this?.fhirResource?.partOf?.reference?.split('/')[1] || null;
    }

    getUserInputToFhirForCVD() {
        this.fhirResource.resourceType = "Encounter";
        this.fhirResource.id = this.encounterObj.id;
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
            "start": this.encounterObj.createdOn,
            "end": this.encounterObj.createdOn
        }
        this.fhirResource.partOf = {
            "reference": "Encounter/" + this.encounterObj.encounterId,
            "display": "Primary Encounter"
        }

        this.fhirResource.identifier.push({
            "system": config.snUrl + '/CVD',
            "value": this.encounterObj.cvdUuid
        });
        this.fhirResource.participant = [{
            "individual" : {
                "reference": "Practitioner/" + this.encounterObj.practitionerId
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

    getUserInputToFhirForPrescriptionDocument() {
        this.fhirResource.resourceType = "Encounter";
        this.fhirResource.id = this.encounterObj.id;
        this.fhirResource.identifier = [];
        this.fhirResource.subject = {};
        this.setPatientReference();
        this.fhirResource.type = [
            {
                "coding": [
                            {
                                "system": "http://your-custom-coding-system",
                                "code": "prescription-encounter-document",
                                "display": "Prescription document encounter"
                            }
                        ]
            }
        ];
        this.fhirResource.period = {
            "start": this.encounterObj.createdOn,
            "end": this.encounterObj.createdOn
        }
        this.fhirResource.partOf = {
            "reference": "Encounter/" + this.encounterObj.encounterId,
            "display": "Primary Encounter"
        }

        this.fhirResource.identifier.push({
            "system": config.snUrl + '/prescriptionDocument',
            "value": this.encounterObj.prescriptionId
        });
        this.fhirResource.participant = [{
            "individual" : {
                "reference": "Practitioner/" + this.encounterObj.practitionerId
            }
        }];
        this.fhirResource.status = 'planned';
        return this.fhirResource;
    }

    deletePrescriptionDocument(){
        this.fhirResource.status = "entered-in-error";
        return this.fhirResource;
    }
    
}


module.exports = Encounter;