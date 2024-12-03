const config = require("../config/nodeConfig")

class DocumentReference {
    fhirResource;
    documentObj;

    constructor(documentObj, fhir_resource) {
        this.documentObj = documentObj;
        this.fhirResource = fhir_resource;
    }


    setDocumentContent(){
        this.fhirResource.content.push(
            {
                "attachment" : {
                    "url" : `${config.facadeUrl}/uploads/${this.documentObj.filename}`,
                    "title" : `${this.documentObj.filename}`
                }
            }
        );
    }

    setNote(){
        this.fhirResource.description = this.documentObj.note;
    }

    setIdentifier(){
        this.fhirResource.identifier.push({
            "system": config.snUrl,
            "value": this.documentObj.uuid
        });
    }

    getJSONtoFhir() {
        this.setBasicStructure();
        this.setIdentifier();
        this.setDocumentContent();
        this.setNote();
        return this.fhirResource;
    }

    setBasicStructure() {
        this.fhirResource.id = this.documentObj.uuid;
        this.fhirResource.resourceType = "DocumentReference";
        this.fhirResource.status = "current";
        this.fhirResource.content = [];
        this.fhirResource.description = "";
        this.fhirResource.identifier = [];
    }

    getFHIRToJSON(){
        this.documentObj.documentFhirId = this.fhirResource.id;
        this.documentObj.documentUuid = this.fhirResource.identifier[0].value;
        this.documentObj.note = this?.fhirResource?.description || "";
        this.documentObj.filename = this?.fhirResource?.content?.[0]?.attachment?.title || "";
        return this.documentObj;
    }

    patchDocumentContent(){
        this.fhirResource.content = [];
        this.fhirResource.content.push(
            {
                "attachment" : {
                    "url" : `${config.facadeUrl}/uploads/${this.documentObj.filename}`,
                    "title" : `${this.documentObj.filename}`
                }
            }
        );
    }

    getDocumentPatch(){
        this.setNote();
        this.patchDocumentContent();
        return this.fhirResource;
    }
}

module.exports = DocumentReference;