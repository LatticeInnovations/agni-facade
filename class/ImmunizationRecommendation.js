const config = require("../config/nodeConfig");
const { v4: uuidv4 } = require('uuid');
const vaccines = require('../utils/vaccines.json');
const moment = require('moment');

class ImmunizationRecommendation {
    fhirResource;
    data;
    constructor(data, fhir_resource) {
        this.fhirResource = fhir_resource;
        this.data = data;
    }

    setBasicStructure() {
        this.fhirResource.resourceType = "ImmunizationRecommendation";
        this.fhirResource.id = uuidv4();
        this.fhirResource.patient = {
            reference: "Patient/" + "urn:uuid:" + this.data.patientId
        }
        this.fhirResource.date = new Date().toISOString();
        this.fhirResource.authority = {
            "reference": "Organization/" + this.data.orgId, // id of practitioner
        }
    }

    setRecommendation() {
        this.fhirResource.recommendation = [];
        let vaccineData = vaccines[this.data.code];
        let doses = Object.keys(vaccineData.doses);
        for (let dose of doses) {
            this.fhirResource.recommendation.push({
                "vaccineCode": [
                    {
                        "coding": [
                            {
                                "system": "http://hl7.org/fhir/sid/cvx",
                                "code": this.data.code,
                                "display": vaccineData.display
                            }
                        ],
                        "text": vaccineData.text
                    }
                ],
                "dateCriterion": [
                    {
                        "code": {
                            "coding": [
                                {
                                    "system": "http://loinc.org/",
                                    "code": "30981-5",
                                    "display": "Earliest date to give"
                                }
                            ]
                        },
                        "value": moment(this.data.birthDate).add(vaccineData.doses[dose].start, 'weeks').toISOString()
                    },
                    {
                        "code": {
                            "coding": [
                                {
                                    "system": "http://loinc.org/",
                                    "code": "30980-7",
                                    "display": "Date vaccine due"
                                }
                            ]
                        },
                        "value": moment(this.data.birthDate).add(vaccineData.doses[dose].end, 'weeks').toISOString()
                    },
                    {
                        "code": {
                            "coding": [
                                {
                                    "system": "http://loinc.org/",
                                    "code": "59778-1",
                                    "display": "Date when overdue for immunization"
                                }
                            ]
                        },
                        "value": moment(this.data.birthDate).add(vaccineData.doses[dose].buffer, 'weeks').toISOString()
                    }
                ],
                "doseNumber": dose,
                "seriesDoses": doses.length,
            });
        }
    }

    getJsonToFhirTranslator() {
        this.setBasicStructure();
        this.setRecommendation();
        return this.fhirResource;
    }
}

module.exports = ImmunizationRecommendation;