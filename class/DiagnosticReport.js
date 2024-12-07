const config = require("../config/nodeConfig");

class DiagnosticReport {
    reportObj;
    fhirResource;
    constructor(reportObj, fhirResource){
        this.reportObj = reportObj;
        this.fhirResource = fhirResource;
    }

    setBasicStructure() {
        this.fhirResource.resourceType = "DiagnosticReport";
        this.fhirResource.code = {
            "coding": [
                {
                    "system": "http://loinc.org",
                    "code": "11502-2",
                    "display": "Laboratory report"
                }
            ]
        }
        this.fhirResource.subject = {};
        this.fhirResource.encounter = {};
        this.fhirResource.issued = this?.reportObj?.createdOn || new Date().toISOString();
        this.fhirResource.extension = [];
        this.fhirResource.identifier = [];
        this.fhirResource.status = "final";
    }

    setPatientReference() {
        this.fhirResource.subject.reference = "Patient/" + this.reportObj?.patientId;
    }

    setEncounterReference() {
        this.fhirResource.encounter.reference = "Encounter/" + this.reportObj?.encounterId;
    }

    setExtension() {
        if (this.reportObj?.documents?.length > 0 ){
            this.reportObj?.documents.forEach((document) => {
                this.fhirResource.extension.push({
                        "url": "http://hl7.org/fhir/StructureDefinition/DocumentReference",
                        "valueReference": {
                          "reference": "DocumentReference/" + "urn:uuid:" + document.id
                        }
                });
            });
        }
    }

    setIdentifier() {
        this.fhirResource.identifier.push({
            "system": "http://hl7.org/fhir/sid/sn",
            "value": this.reportObj?.diagnosticUuid || null
        });
    }

    getUserInputToFhir() {
        this.setBasicStructure();
        this.setPatientReference();
        this.setEncounterReference();
        this.setExtension();
        this.setIdentifier();
        return this.fhirResource;
    }

    getResourceDetails() {
        this.reportObj.labReport.diagnosticReportFhirId = this.fhirResource.id;
        this.reportObj.labReport.resourceType = this.fhirResource.resourceType;
        this.reportObj.labReport.documentIds = [];
        if(this?.fhirResource?.extension && this?.fhirResource?.extension?.length > 0){
            this.reportObj.labReport.documentIds = this?.fhirResource?.extension.map((doc) => {
                return doc.valueReference.reference.split('/')[1];
            });
        }
        this.reportObj.labReport.createdOn = this?.fhirResource?.issued || "";
        this.reportObj.labReport.diagnosticUuid = this?.fhirResource?.identifier?.[0]?.value || null;
        this.reportObj.labReport.status = this?.fhirResource?.status == "entered-in-error" ? "deleted" : "saved";
    }

    getFHIRToUserData() {
        this.reportObj.labReport = {};
        this.getResourceDetails();
        return this.reportObj.labReport;
    }

    patchDocuments() {
        this.fhirResource.extension = [];
        this.setExtension();
        return this.fhirResource;
    }

    deleteDiagnosticReport(){
        this.fhirResource.status = "entered-in-error";
        return this.fhirResource;
    }
}

module.exports = DiagnosticReport;

