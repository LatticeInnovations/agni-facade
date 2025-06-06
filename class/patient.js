let { checkEmptyData } = require("../services/CheckEmpty");
const Person = require("./person");

class Patient  extends Person{
    patient_obj;
    fhir_resource;
    reqType;
    constructor(patient_obj, fhir_resource) {
        super();
        this.patient_obj = patient_obj;
        this.fhir_resource = fhir_resource;

    }

setLink() {
    if(!checkEmptyData(this.patient_obj.relation) && this.patient_obj.relation.length > 0)
    this.fhir_resource.link = [];
    this.patient_obj.relation.forEach(element => {
        this.fhir_resource.link.push({
            other: {
                reference: element.id,
                type: "seealso"
            }
        })
    })
}
  
}


module.exports = Patient;