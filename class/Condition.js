let idFunction = require("../utils/setGetIdentifier");

//  Used for symptoms and diagnosis
class Condition {
    conditionObj;
    fhirResource;
    reqType;
    constructor(conditionObj, fhir_resource) {
        this.conditionObj = conditionObj;
        this.fhirResource = fhir_resource;
        this.fhirResource.resourceType = "Condition";
    }

    setBasicStructure() {
        this.fhirResource.identifier = [];
        this.fhirResource.category = [{
            "coding": [
              {
                "system": "http://terminology.hl7.org/CodeSystem/condition-category",
                "code": "symptom-diagnosis",
                "display": "Symptom & Diagnosis"
              }
            ]
          }];
          
    }

    setIdentifier() {
        let data = idFunction.setIdAsIdentifier(this.conditionObj, "U");
        this.fhirResource.identifier.push(data);
    }

    getId() {
        this.conditionObj.symDiagFhirId = this.fhirResource.id
    }

    getIdentifier() {
        let data = idFunction.getIdentifier(this.fhirResource, "U");
        this.conditionObj.uuid = data.uuid;
        this.conditionObj.identifier = data.identifier;
    }

    setPatientId() {
        this.fhirResource.subject = {
            "reference": "Patient/" + this.conditionObj.patientId
        }
    }

    setEncounterId() {
        this.fhirResource.encounter = {
            "reference": "Encounter/" + this.conditionObj.encounterId
        }
    }

    setRecorder() {
        this.fhirResource.recorder = {
            "reference": "PractitionerId/" + this.conditionObj.practitionerId
        }
    }
    
    setOnsetDateTime() {
        this.fhirResource.onsetDateTime = this.conditionObj.onsetDateTime
    }

    setSymptom() {
        let symptoms_list = []
        this.conditionObj.symptoms.map(symptom => symptoms_list.push({
            "system": "http://www.lattice.in/fhir/ValueSet/symptoms",
             "code": symptom
        }))
        this.fhirResource.evidence = [
            {
                "code": {
                    "coding": symptoms_list
            }
            }
        ]
    }

    getSymptom() {
        const symptoms = this.fhirResource.evidence[0].code.coding.map(symptom => symptom.code);
        this.conditionObj.symptoms = symptoms;
    }

    setDiagnosis() {
        let diagnosis_list = [];
        this.conditionObj.diagnosis.map(code => diagnosis_list.push({
            "system": "http://hl7.org/fhir/sid/icd-10",
            "code": code,
        }));
        this.fhirResource.code = [
            {
                "code": {
                    "coding": diagnosis_list
            }
            }
        ]
        
    }

    getDiagnosis() {
        const diagnosis = this.fhirResource.code[0].code.coding.map(element => element.code);
        this.conditionObj.diagnosis = diagnosis
    }



    getFHIRToUserResponse() {
        this.getId();
        this.getSymptom();
        this.getDiagnosis()
        return this.conditionObj;
    }

    getJsonToFhirTranslator() {
        this.setBasicStructure();
        this.setIdentifier();
        this.setEncounterId();
        this.setPatientId();
        this.setRecorder();
        this.setSymptom();
        this.setDiagnosis();
        return this.fhirResource;
    }

}


module.exports = Condition;