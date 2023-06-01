const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-json-schema'));
const app = require("../app")
let request = require('supertest')(app);
const { v4: uuidv4 } = require('uuid');
let token = `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInVzZXJOYW1lIjoiVHVsaWthIiwiaWF0IjoxNjg1NDE5ODMxLCJleHAiOjE2ODU4NTE4MzF9.YDfW3NAkod3mZ0kIEZ6gYoS04jx4C3_SGk5RvMTlz3Y`;
let jsonMedication = {
    "title": "Medication data schema",
    "type": "object",
    "properties": {
        "medFhirId": {type: "string"},
        "medCode":  {type: "string"},
        "medName":  {type: "string"},
        "doseForm":  {type: "string"},
        "doseFormCode":  {type: "string"},
        "activeIngredient":  {type: "string"},
        "activeIngredientCode":  {type: "string"},
        "medUnit":  {type: "string"},
        "medNumeratorVal":  {type: "number"}
    }

};
let medicationList = [];

describe('GET /api/v1/Medication', () => {
    it('calls list of medicines', async () => {
        const response = await request.get('/api/v1/Medication?_count=100&_offset=0').set({ 'x-access-token': token });
        expect(response.status).to.eql(200);
        expect(response.body).to.have.property("status");
        expect(response.body.status).to.eql(2);
        expect(response.body.message).to.eql("details fetched successfully");
        expect(response.body.data).to.be.an('array').that.is.not.empty;
        response.body.data.forEach(medicine => {console.info(medicine); return expect(chai.tv4.validate(medicine, jsonMedication)).to.be.true });
        medicationList = response.body.data;
    });

});

describe('GET /api/v1/sct/medTime', () => {
    it('calls timing list', async () => {
        const response = await request.get('/api/v1/sct/medTime').set({ 'x-access-token': token });
        expect(response.status).to.eql(200);
        expect(response.body).to.have.property("status");
        expect(response.body.status).to.eql(1);
        expect(response.body.message).to.eql("Data fetched successfully");
        expect(response.body.data).to.be.an('array').that.is.not.empty;
        let schemaTiming = {
            "title": "Schema timing",
            "type": "object",
            "properties" : {
                "medinstructionCode":  {type: "string"},
                "medinstructionVal": {type: "string"}
            }

        };

        let timingList = ["Before meal", "Before food", "An hour before food or on an empty stomach", "Half to one hour before food", "Before lunch", "Between meals", "With snack", "During meal", "During feed", "Postprandial", "After feed", "After food", "With or after meal", "After dinner", "After lunch", "Daily with breakfast", "Daily with dinner", "Daily with lunch", "With breakfast", "With dinner", "With largest meal", "With lunch", "With meals", "With or after food", "With supper", "Without regard to meals"];
        let resTimingList = response.body.data.map(e => e.medinstructionVal);
        response.body.data.forEach(instruction => expect(chai.tv4.validate(instruction, schemaTiming)).to.be.true);
        expect(timingList).to.have.members(resTimingList);
    });
});

let inputPrescriptionData = 
[{
    "patientId": "19808",
    "generatedOn": "2023-05-29T09:10:36+05:30",
    "prescriptionId": "61de4824-a365-45b1-9ad5-250f6f0f115c",
    "prescription": [
        {
            "medFhirId": "21111",
            "qtyPerDose": 1,
            "frequency": 1,
            "doseForm": "Powder for solution for injection",
            "timing": "24863003",
            "duration": 4,
            "qtyPrescribed": 4,
            "note": "As prescribed by doctor"
        },
        {
            "medFhirId": "21116",
            "qtyPerDose": 2,
            "frequency": 2,
            "doseForm": "Capsule",
            "timing": "769556001",
            "duration": 5,
            "qtyPrescribed": 20,
            "note": null
        }
    ]
},
{
    "patientId": "21028",
    "generatedOn": "2023-05-24T11:00:35+05:30",
    "prescriptionId": "45adb9bf-a9e6-46d3-b1be-0fa83f0d033c",
    "prescription": [
        {
            "medFhirId": "21117",
            "qtyPerDose": 1,
            "frequency": 1,
            "doseForm": "Tablet",
            "timing": "311501008",
            "duration": 3,
            "qtyPrescribed": 3,
            "note": null
        },
        {
            "medFhirId": "21131",
            "qtyPerDose": 2,
            "frequency": 3,
            "doseForm": "Tablet",
            "timing": null,
            "duration": 3,
            "qtyPrescribed": 18,
            "note": null
        }
    ]
}
]

let prescriptionSchemaFormat = {
    title: "prescription schema",
    "type": "object",
    "properties": {
        "patientId": "string",
        "generatedOn": {
            "type": "string",
            "format": "date-time"
        },
        "prescriptionId": "string",
        "prescription": {
            "type": "array",
            "minItems": 1,
            "items": [{
                type: 'object',
                properties: {
                    "medFhirId":  {type: "string"},
                    "qtyPerDose":  {type: "number"},
                    "doseForm":  {type: "string"},
                    "doseFormCode":  {type: "string"},
                    "frequency":  {type: "number"},
                    "timing": {
                        "type": ["string", "null"],
                    },
                    "duration":  {type: "number"},
                    "qtyPrescribed":  {type: "number"},
                    "note": {
                        "type": ["string", "null"]
                    }
                }
            }]
        }
    }

};



let prescription2 = 
[{
    "patientId": "20154",
    "generatedOn": "2023-06-01T15:15:45+05:30",
    "prescriptionId": "78e2d936-39e4-42c3-abf4-b96274726c27",
    "prescription": [
        {
            "medFhirId": "21117",
            "qtyPerDose": 1,
            "frequency": 1,
            "doseForm": "Tablet",
            "timing": "1521000175104",
            "duration": 7,
            "qtyPrescribed": 7,
            "note": "As prescribed by doctor"
        },
        {
            "medFhirId": "21117",
            "qtyPerDose": 5,
            "frequency": 2,
            "doseForm": "Tablet",
            "timing": "1521000175104",
            "duration": 7,
            "qtyPrescribed": 17,
            "note": null
        },
        {
            "medFhirId": "21122",
            "qtyPerDose": 7,
            "frequency": 3,
            "doseForm": "Oral suspension",
            "timing": "1521000175104",
            "duration": 7,
            "qtyPrescribed": 52,
            "note": null
        },
        {
            "medFhirId": "21128",
            "qtyPerDose": 10,
            "frequency": 4,
            "doseForm": "Capsule",
            "timing": null,
            "duration": 7,
            "qtyPrescribed": 280,
            "note": null
        },
        {
            "medFhirId": "21134",
            "qtyPerDose": 2,
            "frequency": 5,
            "doseForm": "Solution for injection",
            "timing": null,
            "duration": 7,
            "qtyPrescribed": 70,
            "note": null
        },
        {
            "medFhirId": "21129",
            "qtyPerDose": 6,
            "frequency": 7,
            "doseForm": "Capsule",
            "timing": null,
            "duration": 7,
            "qtyPrescribed": 294,
            "note": null
        }

    ]
}
]
describe('POST /api/v1/sync/MedicationRequest', () => {
    for (let prescription of inputPrescriptionData) {
        expect(chai.tv4.validate(prescription, prescriptionSchemaFormat)).to.be.true;
    }
    it('Save prescription data for multiple patients and their visits', async () => {
        const response = await request.post('/api/v1/sync/MedicationRequest').set({'x-access-token': token})
        .send(inputPrescriptionData);
        expect(response.status).to.be.oneOf([200, 201]);
        expect(response.body.status).to.eql(1);
        expect(response.body.message).to.eql("Data saved successfully.");
        expect(response.body.data).to.be.an('array').that.is.not.empty;
    });

    it('Get 403 while saving as token is not provided', async () => {
        const response = await request.put('/api/v1/sync/MedicationRequest')
            .send(inputPrescriptionData);
        expect(response.status).to.eql(403);
    });
});

describe('GET /api/v1/MedicationRequest', () => {
    it('calls list of prescriptions of patient id: 21028', async () => {
        const response = await request.get('/api/v1/MedicationRequest?patientId=21028').set({ 'x-access-token': "sdshgd3874uewfhudewhfu4374fehdhsf743" });
        expect(response.status).to.eql(401);
        expect(response.body).to.have.property("status");
        expect(response.body.status).to.eql(0);
        expect(response.body.message).to.eql("Unauthorized");
        medicationList = response.body.data;
    });

    it('calls list of prescriptions of patient id: 19808', async () => {
        const response = await request.get('/api/v1/MedicationRequest?patientId=19808').set({ 'x-access-token': token });
        expect(response.status).to.eql(200);
        expect(response.body).to.have.property("status");
        expect(response.body.status).to.eql(1);
        expect(response.body.message).to.eql("details fetched successfully");
        expect(response.body.data).to.be.an('array').that.is.not.empty;
        let result = response.body.data;
        for (let prescription of result) {
            expect(chai.tv4.validate(prescription, prescriptionSchemaFormat)).to.be.true;
        }
    });
    it('calls list of prescriptions of all patients', async () => {
        const response = await request.get('/api/v1/MedicationRequest?_count=500').set({ 'x-access-token': token });
        expect(response.status).to.eql(200);
        expect(response.body).to.have.property("status");
        expect(response.body.status).to.eql(1);
        expect(response.body.message).to.eql("details fetched successfully");
        prescriptionSchemaFormat.prescriptionFhirId = "string";
        expect(response.body.data).to.be.an('array').that.is.not.empty;
        response.body.data.forEach(medicine =>  expect(chai.tv4.validate(medicine, jsonMedication)).to.be.true);
        let result = response.body.data;
        for (let prescription of result) {
            expect(chai.tv4.validate(prescription, prescriptionSchemaFormat)).to.be.true;
        }
    }); 
    
    describe('POST /api/v1/sync/MedicationRequest', () => {
        for (let prescription of prescription2) {
            expect(chai.tv4.validate(prescription, prescriptionSchemaFormat)).to.be.true;
        }
        it('Save prescription data for patient 20154 and her visits', async () => {
            const response = await request.post('/api/v1/sync/MedicationRequest').set({'x-access-token': token})
            .send(prescription2);
            expect(response.status).to.be.oneOf([200, 201]);
            expect(response.body.status).to.eql(1);
            expect(response.body.message).to.eql("Data saved successfully.");
            expect(response.body.data).to.be.an('array').that.is.not.empty;
        });
    });

});
