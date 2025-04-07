const bundleStructure = require("../services/bundleOperation")
const responseService = require("../services/responseService");
let config = require("../config/nodeConfig");
const Observation = require("../class/Observation");
const Encounter = require("../class/encounter");
const { v4: uuidv4 } = require('uuid');
let axios = require("axios");



const saveCVDData = async (req, res) => {
    try {
        // let response = resourceValid(req.params);
        // if (response.error) {
        //     console.error(response.error.details)
        //     let errData = { status: 0, response: { data: response.error.details }, message: "Invalid input" }
        //     return res.status(422).json(errData);
        // }
        let resourceResult = [];
        for(let cvd of req.body){ 
            let encounterData = await bundleStructure.searchData(config.baseUrl + "Encounter", { "appointment": cvd.appointmentId, _count: 5000 , "_include": "Encounter:appointment" });
            let encounterUuid = cvd.cvdUuid;
            let encounter = new Encounter({ 
                id: encounterUuid,
                encounterId: encounterData.data.entry[0].resource.id,
                patientId: cvd.patientId,
                cvdUuid: encounterUuid,
                practitionerId: req.decoded.userId,
                createdOn: cvd.createdOn,
                orgId: req.decoded.orgId
            }, {}).getUserInputToFhirForCVD();
            cvd.encounterId = encounterUuid;
            cvd.practitionerId = req.decoded.userId;
            cvd.categoryCode = "CVD";
            cvd.categoryDisplay = "CVD risk assessment";
            let heightObservation = new Observation(cvd, {}).getUserInputToFhirHeight();
            let weightObservation = new Observation(cvd, {}).getUserInputToFhirWeight();
            let diabeticObservation = new Observation(cvd, {}).getUserInputToFhirDiabetic();
            let smokingObservation = new Observation(cvd, {}).getUserInputToFhirSmoker(); 
            let bpObservation = new Observation(cvd, {}).getUserInputToFhirBloodPressure();
            let cholesterolObservation = new Observation(cvd, {}).getUserInputToFhirCholesterol();
            let bmiObservation = new Observation(cvd, {}).getUserInputToFhirBMI();
            let cvdValueObservation = new Observation(cvd, {}).getUserInputToFhirRisk();

            heightObservation.id = uuidv4();
            weightObservation.id = uuidv4();
            diabeticObservation.id = uuidv4();
            smokingObservation.id = uuidv4();
            bpObservation.id = uuidv4();
            cholesterolObservation.id = uuidv4();
            bmiObservation.id = uuidv4();
            cvdValueObservation.id = uuidv4();
        
            let encounterBundle = await bundleStructure.setBundlePost(encounter, null, encounter.id, "POST", "identifier");
            heightObservation = await bundleStructure.setBundlePost(heightObservation, null, heightObservation.id, "POST", "identifier");
            weightObservation = await bundleStructure.setBundlePost(weightObservation, null, weightObservation.id, "POST", "identifier");
            diabeticObservation = await bundleStructure.setBundlePost(diabeticObservation, null, diabeticObservation.id, "POST", "identifier");
            smokingObservation = await bundleStructure.setBundlePost(smokingObservation, null, smokingObservation.id, "POST", "identifier");
            bpObservation = await bundleStructure.setBundlePost(bpObservation, null, bpObservation.id, "POST", "identifier");
            cholesterolObservation = await bundleStructure.setBundlePost(cholesterolObservation, null, cholesterolObservation.id, "POST", "identifier");
            bmiObservation = await bundleStructure.setBundlePost(bmiObservation, null, bmiObservation.id, "POST", "identifier");
            cvdValueObservation = await bundleStructure.setBundlePost(cvdValueObservation, null, cvdValueObservation.id, "POST", "identifier"); 
            resourceResult.push(encounterBundle, heightObservation, weightObservation, diabeticObservation, smokingObservation, bpObservation, cholesterolObservation, bmiObservation, cvdValueObservation);
        }
        let bundleData = await bundleStructure.getBundleJSON({resourceResult})  
        let response = await axios.post(config.baseUrl, bundleData.bundle); 
        console.info("get bundle json response: ", response.status)  
        if (response.status == 200 || response.status == 201) {
            let responseData = setCVDResponse(bundleData.bundle.entry, response.data.entry, "post");        //    
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

const getCVDData = async (req, res) => {

}

const updateCVDData = async (req, res) => {

}



const setCVDResponse  = (reqBundleData, responseBundleData, type) => {
    let filteredData = [];
    let response = [];
    const responseData = bundleStructure.mapBundleService(reqBundleData, responseBundleData)
    if(["post", "POST"].includes(type)){
        filteredData = responseData.filter(e => e.resource.resourceType == "Encounter" && e.resource?.type?.[0]?.coding?.[0]?.code == "cvd-encounter");
    }
    else if(["patch", "PATCH"].includes(type)) {
        filteredData = responseData.filter(e => e.fullUrl.split("/")[0] == "Observation");
    }  
    response = responseService.setDefaultResponse("Encounter", type, filteredData)
    return response;
}

module.exports = {saveCVDData, getCVDData, updateCVDData}