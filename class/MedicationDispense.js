let { checkEmptyData } = require("../services/CheckEmpty");
const config = require("../config/nodeConfig");
const { v4: uuidv4 } = require("uuid");
class MedicationRquest {
  medDispenseObj;
  fhirResource;

  constructor(med_dispense_obj, fhir_resource) {
    this.medDispenseObj = med_dispense_obj;
    this.fhirResource = fhir_resource;
    this.fhirResource.resourceType = "MedicationDispense"
  }

  setIdentifierJSON(element) {
    let jsonObj = {};
    if (!checkEmptyData(element.code)) {
      jsonObj = {
        type: {
          coding: [
            {
              system: config.fhirCodeUrl,
              code: element.code,
            },
          ],
        },
        system: element.identifierType,
        value: element.identifierNumber,
      };
    } else {
      jsonObj = {
        value: element.identifierNumber,
        system: element.identifierType,
      };
    }
    return jsonObj;
  }

  setIdentifier() {
    this.fhirResource.identifier = [this.setIdentifierJSON({
      identifierType: "https://www.thelattice.in/",
      identifierNumber:  uuidv4(),
      code: "MR",
    })]
  }

  getIdentifier() {
    this.medDispenseObj.identifier = this.fhirResource.identifier;
  }

  getId() {
    this.medDispenseObj.medDispenseFhirId =
      this.fhirResource.medicationReference.reference.split("/")[1];
  }

  setMedication() {
    this.fhirResource.medicationReference.reference =
      "Medication/" + this.medDispenseObj.medFhirId;
  }

  setPatientReference() {
    this.fhirResource.subject.reference =
      "Patient/" + this.medDispenseObj.patientId;
  }

  getPatientReference() {
    this.medDispenseObj.patientId =
      this.fhirResource.subject.reference.split("/")[1];
  }

  setEncounter() {
    // Sub encounter i.e dispensing-encounter Encounter to maintain date of recording
    this.fhirResource.context.reference =
      "urn:uuid:" + this.medDispenseObj.subEncounterId;
  }

  setMedicationRequestId() {
    if(this.medDispenseObj.category != "OTC") {
        this.fhirResource.authorizingPrescription = [
            {
              reference: "MedicationRequest/" + this.medDispenseObj.medReqFhirId,
            },
          ];
        }
    }


  getMedicationRequestId() {
    this.medDispenseObj.medReqFhirId =
      this.fhirResource?.authorizingPrescription[0]?.reference;
  }

  setDispenseQuantityDetail() {
    this.fhirResource.quantity = {
      value: this.medDispenseObj.dispenseQty
    };
  }

  getDispenseQuantityDetail() {
    this.medDispenseObj.quantity = this.fhirResource.quantity?.value
  }

  setMedicationDetail() {
    this.fhirResource.medicationReference = {
      reference : "Medication/" + this.medDispenseObj.medFhirId
    };
  }

  getMedicationDetail() {
    this.medDispenseObj.medFhirId =
      this.fhirResource.medicationCodeableConcept?.coding[0]?.code;
  }

  setMedHandoverTime() {
    this.fhirResource.whenHandedOver = this.medDispenseObj.date;
  }

  getMedHandoverDetail() {
    this.medDispenseObj.date = this.fhirResource.whenHandedOver;
  }

  setMedicationDispenseCategory() {
    console.log(this.medDispenseObj?.category)
    this.fhirResource.category = {
      coding: [
        {
          "system": "http://your-custom-coding-system",
          code: this.medDispenseObj?.category,
        },
      ],
    };
  }

  getMedicationDispenseCategory() {
    this.medDispenseObj.category = this.fhirResource?.category?.coding[0]?.code;
  }

  setMedicationDispenseNote() {
    if (this.medDispenseObj.note) {
        this.fhirResource.note = [
            {
              text: this.medDispenseObj?.medNote,
            },
          ];
    }

  }
  getMedicationDispenseNote() {
    this.medDispenseObj.medNote = this.fhirResource?.note[0]?.text;
  }

  getJSONtoFhir() {
    this.setBasicStructure();
    this.setIdentifier();
    this.setPatientReference();
    this.setEncounter();
    this.setDispenseQuantityDetail();
    this.setMedicationDetail();
    this.setMedicationRequestId();
    this.setMedHandoverTime();
    this.setMedicationDispenseCategory();
    this.setMedicationDispenseNote();
    return this.fhirResource
  }

  getFhirToJson() {
    this.getId();
    this.getPatientReference();
    this.getEncounter();
    this.getDispenseQuantityDetail();
    this.getMedicationDetail();
    this.getMedicationRequestId();
    this.getMedHandoverDetail();
    this.getMedicationDispenseCategory();
    this.getMedicationDispenseNote();
  }

  getUserResponseFormat() {
    return this.medDispenseObj;
  }

  getFhirResource() {
    return this.fhirResource;
  }

  setBasicStructure() {
    // this.fhirResource.dosageInstruction = [];
    this.fhirResource.medicationReference = {};
    this.fhirResource.subject = {};
    this.fhirResource.context = {};
    this.fhirResource.identifier = [];
  }
}

module.exports = MedicationRquest;
