const config = require("../config/nodeConfig");

class GroupEncounter {
  groupEncounterObj;
  fhirResource;
  isMain;
  constructor(groupEncounter_obj, fhir_resource) {
    this.groupEncounterObj = groupEncounter_obj;
    this.fhirResource = fhir_resource;
    this.fhirResource.resourceType = "Encounter"
  }

  setIdentifier() {
    this.fhirResource.identifier.push({
      system: config.snUrl,
      value: this.groupEncounterObj.uuid
    });
  }

  getId() {
    if(!this.isMain) {
      console.log(this.fhirResource)
      this.groupEncounterObj.dispenseId = this.fhirResource?.identifier[0]?.value;
      this.groupEncounterObj.dispenseFhirId = this.fhirResource?.id;
    }

  }


  setEncounterTime() {
    if(this.groupEncounterObj.generatedOn) {
        this.fhirResource.period = {
            "start": this.groupEncounterObj.generatedOn,
            "end": this.groupEncounterObj.generatedOn
        }
    }

}

getEncounterTime() {
    if(this.fhirResource.period)
    this.groupEncounterObj.generatedOn = this.fhirResource.period.start;
}

  setType() {
    let code = this.groupEncounterObj.code
    let display = this.groupEncounterObj.display
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

  setPatientReference() {
    this.fhirResource.subject.reference =
      "Patient/" + this.groupEncounterObj?.patientId;
  }

  setPartOf() {
    if(this.groupEncounterObj.appointmentId)
        this.fhirResource.partOf = {
          reference: "Encounter/" + this.groupEncounterObj.appointmentId
        };
  }

  getPartOf() {
    if(this.isMain && this.fhirResource?.partOf)
      this.groupEncounterObj.appointmentId = this.fhirResource?.partOf?.reference.split("/")[1]
  }

  getPatientReference() {
    this.groupEncounterObj.patientId =
      this.fhirResource.subject.reference.split("/")[1];
  }


  getUserInputToFhir() {
    this.setBasicStructure();
    this.setIdentifier();
    this.setPatientReference();
    this.setPartOf();
    this.setType()
    this.setEncounterTime();
    return this.fhirResource;
  }

  getFhirToJson() {
    this.getId();
    this.getPatientReference();
    this.getEncounterTime();
    this.getPartOf()
    return this.groupEncounterObj;
  }

  getUserResponseFormat() {
    return this.groupEncounterObj;
  }

  getFHIRResource() {
    return this.fhirResource;
  }

  setBasicStructure() {
    this.fhirResource.identifier = [];
    this.fhirResource.subject = {};
    // this.fhirResource.note = [];
    // this.fhirResource.extension = []
  }

 
}

module.exports = GroupEncounter;