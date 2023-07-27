let idFunction = require("../utils/setGetIdentifier");
let apptStatus = require("../utils/appointmentStatus.json");
class Appointment {
    apptObj;
    fhirResource;
    reqType;
    constructor(apptObj, fhir_resource) {
        this.apptObj = apptObj;
        this.fhirResource = fhir_resource;
        this.fhirResource.resourceType = "Appointment";
    }

    setBasicStructure() {
        this.fhirResource.identifier = [];
        this.fhirResource.slot = [];
        this.fhirResource.participant = [];
        this.fhirResource.appointmentType = {};
    }

    setIdentifier() {
        let data = idFunction.setIdAsIdentifier(this.apptObj, "U")
        this.fhirResource.identifier.push(data);
    }

    getIdentifier() {
        let data = idFunction.getIdentifier(this.fhirResource, "U");
        this.apptObj.uuid = data.uuid;
        //this.apptObj.identifier = data.identifier;
    }
    
    setStatus() {
        let statusData = apptStatus.find(e => e.uiStatus == this.apptObj.status);
        console.info("statusData", statusData, this.apptObj.status, apptStatus)
        this.fhirResource.status = statusData.fhirStatus;
        this.fhirResource.appointmentType.coding = [
            {
                "system":"http://snomed.info/sct",
                "code": statusData.type    
            }
        ]
    }
    
    getStatus() {
        let statusData = apptStatus.find(e => e.type == this.fhirResource.appointmentType.coding[0].code && e.fhirStatus == this.fhirResource.status);
        this.apptObj.status =  statusData.uiStatus;
    }

    patchStatus() {
    if(this.apptObj.status) {
        let statusData = apptStatus.find(e => e.uiStatus == this.apptObj.status.value);
        this.fhirResource.push({ "op": this.apptObj.status.operation, "path": "/status", value: statusData.fhirStatus });    
        }
    }

    setSlot() {
        this.fhirResource.slot.push({
            "reference": "urn:uuid:" + this.apptObj.slotUuid
        })
    }

   setParticipant() {
    this.fhirResource.participant.push({
        actor : { "reference": "Patient/" + this.apptObj.patientId }
    });
    this.fhirResource.participant.push({
        actor : { "reference": "Location/" + this.apptObj.locationId } 
    })
    console.info("", this.fhirResource.participant)
   }

   getParticipant() {
    this.apptObj.patientId = this.fhirResource.participant[0].actor.reference.split("/")[1];
    this.apptObj.locationId = this.fhirResource.participant[1].actor.reference.split("/")[1];
   }

    getSlot() {
        this.apptObj.slot = this.fhirResource.slot;
    }

    patchSlot() {
        if (this.apptObj.status && this.apptObj.status.value == "cancelled") {
            this.apptObj.slot = {"operation": "remove", "path": "/slot"}
            this.fhirResource.push({ "op": this.apptObj.slot.operation, "path": "/slot", value: this.apptObj.slot.value });  
        }


    }

    setCreated() {
        this.fhirResource.created = this.apptObj.createdOn;
    }

    patchCreatedOn() {
        if(this.apptObj.status.value == "scheduled")
            this.fhirResource.push({ "op": this.apptObj.createdOn.operation, "path": "/created", value: this.apptObj.createdOn.value }); 

    }

    getCreated() {
        this.apptObj.createdOn = this.fhirResource.created;
    }

    setStart() {
        this.fhirResource.start = this.apptObj.slot.start;
    }

    getId() {
        this.apptObj.appointmentId = this.fhirResource.id;
    }   

    getFHIRToUserInput() {
        this.getId();
        this.getIdentifier();
        this.getStatus();
        this.getSlot();
        this.getParticipant();
        this.getCreated();
    }

    getJsonToFhirTranslator() {
        this.setBasicStructure()
        this.setIdentifier();
        this.setStatus();
        this.setSlot();
        this.setStart();
        this.setParticipant();
        this.setCreated();
    }

    patchUserInputToFHIR() {
        this.patchStatus();
        this.patchCreatedOn();   
        this.patchSlot();    

    }

    getInput() {
        return this.apptObj;
    }

    getResource() {
        return this.fhirResource;
    }

}


module.exports = Appointment;