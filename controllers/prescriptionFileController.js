
const MedicationRequest = require("../class/MedicationRequest");
const DocumentReference = require("../class/DocumentReference")
const Encounter = require("../class/encounter")
const { v4: uuidv4 } = require('uuid');
let axios = require("axios");
let config = require("../config/nodeConfig");
const bundleStructure = require("../services/bundleOperation")
const responseService = require("../services/responseService");


//  Save prescription File data
let savePrescriptionFile = async function (req, res) {
    try {
        // let response = resourceValid(req.params);
        // if (response.error) {
        //     console.error(response.error.details)
        //     let errData = { status: 0, response: { data: response.error.details }, message: "Invalid input" }
        //     return res.status(422).json(errData);
        // }
        let resourceResult = [];
        for (let patPres of req.body) {
            let encounterData = await bundleStructure.searchData(config.baseUrl + "Encounter", { "appointment": patPres.appointmentId, _count: 5000 , "_include": "Encounter:appointment" });
            let encounterUuid = patPres.prescriptionId;
            let encounter = new Encounter({ 
                id: patPres.prescriptionId,
                encounterId: encounterData.data.entry[0].resource.id,
                patientId: patPres.patientId,
                prescriptionId: encounterUuid,
                practitionerId: req.decoded.userId,
                createdOn: patPres.generatedOn,
                orgId: req.decoded.orgId
            }, {}).getUserInputToFhirForPrescriptionDocument();
        
            let dateToday = (new Date(patPres.generatedOn)).getTime().toString();
            let lastDigits = dateToday.slice(9, -1);
            let grpIdentify =  lastDigits + patPres.patientId;

            let prescription = {
                identifier: [{
                    "system": config.medReqUuidUrl,
                    "value": uuidv4()
                }],
                grpIdentify: grpIdentify,
                patientId: patPres.patientId,
                encounterId: encounterUuid,
                prescriptionFiles: patPres.prescriptionFiles
            }
            let medRequestData = new MedicationRequest(prescription, {}).getJSONtoFhirForPrescriptionDocument();
            let encounterBundle = await bundleStructure.setBundlePost(encounter, null, encounter.id, "POST", "identifier");
            let medicationResourceBundle= await bundleStructure.setBundlePost(medRequestData, prescription.identifier, prescription.identifier[0].value, "POST", "identifier");
           
            resourceResult.push(encounterBundle, medicationResourceBundle);

            for(let document of patPres.prescriptionFiles) {
                let documentRefData = new DocumentReference({
                    filename: document.filename, 
                    note: document.note, 
                    uuid: document.documentUuid
                }, {}).getJSONtoFhir();
                let documentResource = await bundleStructure.setBundlePost(documentRefData, documentRefData.identifier, documentRefData.id, "POST", "identifier");
                resourceResult.push(documentResource); 
            }
        }
        let bundleData = await bundleStructure.getBundleJSON({resourceResult})  
        let response = await axios.post(config.baseUrl, bundleData.bundle); 
        console.info("get bundle json response: ", response.status)  
        if (response.status == 200 || response.status == 201) {
            let responseData = setPrescriptionFileResponse(bundleData.bundle.entry, response.data.entry, "post");        

            res.status(201).json({ status: 1, message: "Practitioner data saved.", data: responseData })
        }
        else {
                return res.status(500).json({
                status: 0, message: "Unable to process. Please try again.", error: response
            })
        }
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({
            status: 0,
            message: "Unable to process. Please try again.",
            error: e
        })
    }

}

//  Get Practitioner data
let getPrescriptionFile = async function (req, res) {
    try {
        const link = config.baseUrl + "Encounter";
        let queryParams = {
            "_revinclude": "MedicationRequest:encounter:Encounter",
            "type": "prescription-encounter-form",
            "_total": "accurate",
            "_count": 3000,
            "patient": req.query.patientId
        }
        let resourceResult = []
        let responseData = await bundleStructure.searchData(link, queryParams);
        let resStatus = 1;

        console.info("FHIRData: ", responseData)
        if( !responseData.data.entry || responseData.data.total == 0) {
                return res.status(200).json({ status: resStatus, message: "Data fetched", total: 0, data: []  })
        }
        const FHIRData = responseData.data.entry;
        const prescriptionFormEncounter = FHIRData.filter(e => e.resource.resourceType == "Encounter").map(e => e.resource)
        let appointmentEncounterIds = [... new Set(prescriptionFormEncounter.map(e =>  parseInt(e.partOf.reference.split("/")[1])))]
        let appointmentEncounters = await bundleStructure.searchData(config.baseUrl + "Encounter", { "_id": appointmentEncounterIds.join(","), _count: 5000});
        appointmentEncounters = appointmentEncounters.data.entry.map(e=> e.resource)
        
        for(let encData of prescriptionFormEncounter) {
            // map the encounter from the list to sub encounter of prescription
            let apptEncounter = appointmentEncounters.filter( e=> e.id == encData.partOf.reference.split("/")[1])
            apptEncounter = new AppointmentEncounter({}, apptEncounter[0]);
            apptEncounter = apptEncounter.getFhirToJson();
            console.info("apptEncounter: ", apptEncounter)
            let medReqList = FHIRData.filter(e => e.resource.resourceType == "MedicationRequest" && e.resource.encounter.reference == "Encounter/"+encData.id).map(e => e.resource);    
            let prescriptionData = {
                "prescriptionId": encData.identifier[0].value,
                "prescriptionFhirId": encData.id,
                "generatedOn": encData.period.start
            }   
            prescriptionData = {...apptEncounter, ...prescriptionData}
            prescriptionData.prescription = [];
        //  let insert = false;
            for(let medReq of medReqList) {   
                medReq.prescriptionId = encData.prescriptionId                  
                let medReqData = new MedicationRequest({}, medReq);
                medReqData.getFhirToJson();
                let medData = medReqData.getMedReqResource();
                medData.qtyPrescribed = medData.qtyPerDose * medData.frequency * medData.duration;
                prescriptionData.prescription.push(medData);
            }
            if(prescriptionData.prescription.length > 0)
                resourceResult.push(prescriptionData)
        }
        
        res.status(200).json({ status: resStatus, message: "Data fetched.", total: resourceResult.length,"offset": +queryParams?._offset, data: resourceResult  })
        
    }
    catch(e) {
        console.error("Error",e)
        return res.status(200).json({
                status: 0,
                message: "Unable to process. Please try again"
            })
       
    }
}


const setPrescriptionFileResponse  = (reqBundleData, responseBundleData, type) => {
    let filteredData = [];
    let response = [];
    const responseData = bundleStructure.mapBundleService(reqBundleData, responseBundleData)

    filteredData = responseData.filter(e => e.resource.resourceType == "Encounter" && e.resource.type[0].coding[0].code == "prescription-encounter-document");
    let medicationRequest = responseData.filter(e => e.resource.resourceType == "MedicationRequest");
    let documentRefs = responseData.filter(e => e.resource.resourceType == "DocumentReference");
    filteredData = filteredData.map((e) => {
        e.documents = [];
        let med = medicationRequest.find((m) => {return m.resource.encounter.reference.split(':')[2] == e.resource.id });
        
        med.resource.supportingInformation.forEach((m) => {
            let doc = documentRefs.find((d) => { return d.resource.id == m.reference.split(':')[2] });
            e.documents.push({
                documentfhirId: doc.response.location.split('/')[1],
                documentUuid: doc.resource.id,
            });
        });
        return e;
    });

    response = responseService.setDefaultResponse("PrescriptionFile", type, filteredData)
    for(let i=0; i<response.length; i++) {
        response[i].prescriptionFiles = filteredData[i].documents || []
    }
    return response;
}


module.exports = {
    savePrescriptionFile,
    getPrescriptionFile
}