let { checkEmptyData } = require("../services/CheckEmpty");
const { v4: uuidv4 } = require('uuid');
let timing = require("../utils/medtime.json")
class MedicationRquest {
    medReqObj;
    fhirResource;

    constructor(med_req_obj, fhir_resource) {
        this.medReqObj = med_req_obj;
        this.fhirResource = fhir_resource;
    }

   setIdentifier() {
    this.fhirResource.identifier = this.medReqObj.identifier;
   }

    getId() {
        this.medReqObj.medFirId = this.fhirResource.id
    }

    setIntent() {
        this.fhirResource.intent = "order";
    }

    setMedication() {
        this.fhirResource.medicationReference.reference = "Medication/" + this.medReqObj.medFhirId
    }

    setGroupIdentifier() {
      
        this.fhirResource.groupIdentifier = {
            "system": "http://hospital.smarthealthit.org/prescriptions",
            "value": this.medReqObj.grpIdentify
        }
    }


    setPatientReference() {
        this.fhirResource.subject.reference = "Patient/" + this.medReqObj.patientId
    }

    getPatientReference() {
        this.medReqObj.patientId = this.fhirResource.subject.reference;
    }

    setEncounter() {
        this.fhirResource.encounter.reference = "urn:uuid:" +this.medReqObj.prescriptionId;
    }

    setNote() {
        if(!checkEmptyData(this.medReqObj.note)){
            this.fhirResource.note.push({text: this.medReqObj.note}) 
        }
    }

    setEffectiveDosePeriod() {
        let startDate = this.medReqObj.generatedOn;
        let endDate = new Date(startDate);  
        endDate = endDate.setDate(endDate.getDate() + (this.medReqObj.duration -1));
        this.fhirResource.effectiveDosePeriod = {
            start: startDate,
            end: endDate
        }
    }

    setDosageInstruction() {
        let data = {
            "timing" : {
                "repeat": {
                    "boundsDuration" : {
                           "unit":"days",
                           "system":"http://unitsofmeasure.org",
                           "code":"d"

                    },
                    "frequency": this.medReqObj.frequency,
                    "period": this.medReqObj.duration,
                    "periodUnit": "d"
                }
            },
            "doseAndRate": [
                {
                    "doseQuantity":{
                        "value":this.medReqObj.qtyPerDose,
                        "unit":this.medReqObj.doseForm,
                        "system":"http://snomed.info/sct",
                        "code": this.medReqObj.doseFormCode
                     }

                }
            ]
        }
        if(!checkEmptyData(this.medReqObj.timing)){
           data.additionalInstruction = [
            {
                "coding": [
                    {
                        "system":"http://snomed.info/sct",
                        "code":this.medReqObj.timing,
                        "display": timing.filter(e => e.medinstructionCode == this.medReqObj.timing).map(e => e.medinstructionVal)[0]
                    }
                ]
            }
           ]
        }
        this.fhirResource.dosageInstruction.push(data);
        
    }

    getJSONtoFhir() {
        this.setBasicStructure();
        this.setIdentifier();
        this.setIntent();
        this.setMedication();
        this.setGroupIdentifier();
        this.setPatientReference();
        this.setEncounter();
        this.setNote();
        this.setDosageInstruction();
       // this.setEffectiveDosePeriod();
    }

    getFhirToJson() {
        this.getId();
        this.getEncounterTime();
        this.getPatientReference();
    }

    getEncounterResource() {
        return this.medReqObj;
    }

    getFhirResource() {
        return this.fhirResource;
    }

    setBasicStructure() {
        this.fhirResource.dosageInstruction = [];
        this.fhirResource.medicationReference = {};
        this.fhirResource.subject = {};
        this.fhirResource.encounter = {};
        this.fhirResource.note = [];
        this.fhirResource.identifier = [];
    }

}


module.exports = MedicationRquest;