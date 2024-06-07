const config = require("../config/nodeConfig")

class DocumentReference {
    filename;
    note;
    fhirResource;

    constructor(filename, note, fhir_resource) {
        this.filename = filename;
        this.note = note
        this.fhirResource = fhir_resource;
    }


    setDocumentContent(){
        this.fhirResource.content.push(
            {
                "attachment" : {
                    "url" : `${config.facadeUrl}/uploads/${this.filename}`,
                    "title" : `${this.filename}`
                }
            }
        );
    }

    setNote(){
        this.fhirResource.description = this.note;
    }

    getJSONtoFhir() {
        this.setBasicStructure();
        this.setDocumentContent();
        this.setNote();
    }

    setBasicStructure() {
        this.fhirResource.resourceType = "DocumentReference";
        this.fhirResource.status = "current";
        this.fhirResource.content = [];
        this.fhirResource.description = ""
    }

    getFhirResource() {
        return this.fhirResource;
    }
}

module.exports = DocumentReference;