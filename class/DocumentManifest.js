const config = require("../config/nodeConfig");

class DocumentManifest {
    reportObj;
    fhirResource;
    constructor(reportObj, fhirResource){
        this.reportObj = reportObj;
        this.fhirResource = fhirResource;
    }

    setBasicStructure() {
        this.fhirResource.resourceType = "DocumentManifest";
        this.fhirResource.created = this?.reportObj?.createdOn || new Date().toISOString();
        this.fhirResource.subject = {};
        this.fhirResource.content = [];
        this.fhirResource.author = [];
        this.fhirResource.related = [];
        this.fhirResource.identifier = [];
    }

    setPatientReference() {
        this.fhirResource.subject.reference = "Patient/" + this.reportObj?.patientId;
    }

    setEncounterReference() {
        this.fhirResource.related.push({
            "ref": {
                "reference": "Encounter/" + this.reportObj?.encounterId
            }
        });
    }

    setPractitionerReference() {
        this.fhirResource.author.push({
            "reference": "Practitioner/" + this.reportObj?.practitionerId ,
            "display": this.reportObj?.practitionerName || ""
        });
    }

    setContent(){
        if (this.reportObj?.documents?.length > 0 ){
            this.reportObj?.documents.forEach((document) => {
                this.fhirResource.content.push({
                    "reference": "DocumentReference/" + "urn:uuid:" + document.id
                });
            });
        }
    }

    setIdentifier() {
        this.fhirResource.identifier.push({
            "system": "http://hl7.org/fhir/sid/sn",
            "value": this.reportObj?.medicalReportUuid || null
        });
    }

    getUserInputToFhir(){
        this.setBasicStructure();
        this.setPatientReference();
        this.setEncounterReference();
        this.setPractitionerReference();
        this.setContent();
        this.setIdentifier();
        return this.fhirResource;
    }

    getResourceDetails() {
        this.reportObj.labReport.medicalRecordFhirId = this.fhirResource.id;
        this.reportObj.labReport.resourceType = this.fhirResource.resourceType;
        this.reportObj.labReport.documentIds = [];
        if(this?.fhirResource?.content && this?.fhirResource?.content?.length > 0){
            this.reportObj.labReport.documentIds = this?.fhirResource?.content.map((doc) => {
                return doc.reference.split('/')[1];
            });
        }
        this.reportObj.labReport.createdOn = this?.fhirResource?.created || "";
        this.reportObj.labReport.medicalReportUuid = this?.fhirResource?.identifier?.[0]?.value || null;
    }

    getFHIRToUserData() {
        this.reportObj.labReport = {};
        this.getResourceDetails();
        return this.reportObj.labReport;
    }

    patchDocuments() {
        this.fhirResource.content = [];
        this.setContent();
        return this.fhirResource;
    }
}

module.exports = DocumentManifest;