const config = require("../config/nodeConfig");
const dispenseStatus = require("../utils/dispenseStatus.json");

class DispenseEncounter {
  dispenseObj;
  fhirResource;
  isMain;
  constructor(dispense_obj, fhir_resource, isMain) {
    this.dispenseObj = dispense_obj;
    this.fhirResource = fhir_resource;
    this.isMain = Boolean(isMain);
    this.fhirResource.resourceType = "Encounter"
    console.log("check the receieved resource: ", this.isMain, this.dispenseObj)
  }

  setIdentifier() {
    this.fhirResource.identifier.push({
      system: config.snUrl,
      value: this.isMain ? this.dispenseObj.dispenseId : this.dispenseObj.subEncounterId,
    });
  }

  getId() {
    console.info(this.fhirResource.id);
    this.dispenseObj.dispenseId = this.fhirResource?.identifier[1]?.value;
    this.dispenseObj.fhirId = this.fhirResource?.id;
  }

  setStatus() {

    if(this.isMain) {
      console.log("it should not work in sub encounter")
      console.log("check if this is coming to if: ")
      let statusData = dispenseStatus.find(
        (e) => e.statusId == this.dispenseObj?.status
      );
      this.fhirResource.status = statusData?.encounter;
    }
  }

  getStatus() {
    let statusData = dispenseStatus.find(
      (e) => e.encounter == this.fhirResource?.status
    );
    this.dispenseObj.status = statusData?.statusId;
  }

  setType() {
    console.log("check in type: ", this.isMain); // Check if the value is what you expect
    let code = "pharmacy-service"
    let display = "Pharmacy service"
    if(!this.isMain) {
      code = "dispensing-encounter"
      display = "Dispensing encounter"
    }
    this.fhirResource.type = [
      {
        coding: [
          {
            system: "http://your-custom-coding-system",
            code: code,
            display: display
          },
        ],
      },
    ];
    console.log("check type: ", this.fhirResource.type[0].coding[0])
  }
  getType() {
    this.dispenseObj.type = this.fhirResource?.type[0]?.coding[0]?.code;
  }

  setPatientReference() {
    this.fhirResource.subject.reference =
      "Patient/" + this.dispenseObj?.patientId;
  }

  setPartOf() {
      this.fhirResource.partOf = {
        reference: this.isMain ? "Encounter/" + this.dispenseObj.prescriptionFhirId : "urn:uuid:" + this.dispenseObj?.dispenseId,
      };
  }

  getPartOf() {
    this.dispenseObj.prescriptionFhirId = this.fhirResource?.partOf?.reference.split("/")[1]
  }

  setNote() {
    if (!this.isMain) {
      this.fhirResource.note = [
        {
          authorReference: {
            reference: "Practitioner/" + this.dispenseObj?.practitionerId,
          },
          text: this.dispenseObj?.note,
        },
      ];
    }
  }

  getNote() {
    this.dispenseObj.note = this.fhirResource?.note[0]?.text
  }

  getPatientReference() {
    this.dispenseObj.patientId =
      this.fhirResource.subject.reference.split("/")[1];
  }

  setEncounterTime() {
    if (this.dispenseObj.generatedOn) {
      this.fhirResource.period = {
        start: this.dispenseObj.generatedOn,
        end: this.dispenseObj.generatedOn,
      };
    }
  }

  getEncounterTime() {
    if (this.fhirResource.period)
      this.dispenseObj.generatedOn = this.fhirResource.period.start;
  }

  getUserInputToFhir() {
    this.setBasicStructure();
    this.setIdentifier();
    this.setPatientReference();
    this.setPartOf()
    this.setType()
    this.setEncounterTime();
    this.setStatus();
    this.setNote()
    return this.fhirResource;
  }

  getFhirToJson() {
    this.getId();
    this.getPatientReference();
    this.getEncounterTime();
    this.getStatus()
    this.getType()
    this.getNote()
    this.getPartOf()
  }

  getUserResponseFormat() {
    return this.dispenseObj;
  }

  getFHIRResource() {
    return this.fhirResource;
  }

  setBasicStructure() {
    this.fhirResource.identifier = [];
    this.fhirResource.subject = {};
    this.fhirResource.note = [];
  }
}

module.exports = DispenseEncounter;
