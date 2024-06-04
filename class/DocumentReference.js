const config = require("../config/nodeConfig")

class DocumentReference {
    filename;
    fhirResource;

    constructor(filename, fhir_resource) {
        this.filename = filename;
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

    getJSONtoFhir() {
        this.setBasicStructure();
        this.setDocumentContent();
    }

    setBasicStructure() {
        this.fhirResource.resourceType = "DocumentReference";
        this.fhirResource.status = "current";
        this.fhirResource.content = [];
    }

    getFhirResource() {
        return this.fhirResource;
    }
}

module.exports = DocumentReference;