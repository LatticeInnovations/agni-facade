


class ValueSet {
    valueset_obj;
    fhirResource;
    reqType;
    constructor(valueset_obj, fhir_resource, type) {
        this.valueset_obj = valueset_obj;
        this.fhirResource = fhir_resource;
        this.reqType = type
    }

    getCode() {
        this.valueset_obj[this.reqType] = this.fhirResource.compose.include[0].concept
    }
     getFHIRToJSONOutput() {
        this.getCode();     
        return this.valueset_obj;
    }

}


module.exports = ValueSet;