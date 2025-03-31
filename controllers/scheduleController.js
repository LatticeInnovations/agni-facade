let axios = require("axios");
let Schedule = require("../class/Schedule");
const bundleStructure = require("../services/bundleOperation");
const responseService = require("../services/responseService");
let config = require("../config/nodeConfig");
let scheduleValid = require("../utils/Validator/scheduleAppointment").scheduleValidation;

let setScheduleData = async function (req, res) {
    try {
        let resourceResult = [], errData = [];
        const resType = "Schedule"
        for (let scheduleData of req.body) {
            let response = scheduleValid(scheduleData);
            if (response.error) {
                console.error(response.error.details)
                return res.status(422).json({status: 0, response: { data: response.error.details[0] }, message: "Invalid input" })
            }
            let locationResource = await bundleStructure.searchData(config.baseUrl + "Location", { organization: "Organization/" + scheduleData.orgId, _elements: "id", _total: "accurate" });
            let locationId = locationResource.data.entry[0].resource.id;
            scheduleData.locationId = locationId;
                console.info("this is a check for data")
                let schedule = new Schedule(scheduleData, {});
                schedule.getJsonToFhirTranslator();
                let scheduleResource = {};
                scheduleResource = { ...schedule.getResource() };
                scheduleResource.resourceType = resType;
                let noneExistData = [
                    { "key": "date", "value": "ge" + scheduleData.planningHorizon.start },
                    { "key": "date", "value": "le" + scheduleData.planningHorizon.end },
                    { "key": "actor", "value": 'Location/' + locationId }
                ];
                let scheduleBundle = await bundleStructure.setBundlePost(scheduleResource, noneExistData, scheduleData.uuid, "POST", "object");
                resourceResult.push(scheduleBundle);
        }
        console.info("=============>", resourceResult, errData, "<=========================");
        let bundleData = await bundleStructure.getBundleJSON({resourceResult})  
        console.info("main bundle transaction resource: ", bundleData)
        let response = await axios.post(config.baseUrl, bundleData.bundle); 
        console.log("get bundle json response: ", response.status)  
        if (response.status == 200 || response.status == 201) {
            let responseData = setScheduleResponse(bundleData.bundle.entry, response.data.entry, "post");
            res.status(201).json({ status: 1, message: "Patient data saved.", data: responseData })
        }
        else {
            return res.status(500).json({status: 0, message: "Unable to process. Please try again.", error: response})
        }
        
    }

    catch (e) {
        return Promise.reject(e);
    }

}


const setScheduleResponse  = (reqBundleData, responseBundleData, type) => {
    let filteredData = [];
    let response = [];
    const responseData = bundleStructure.mapBundleService(reqBundleData, responseBundleData)
    filteredData = responseData.filter(e => e.resource.resourceType == "Schedule" || (type == "patch" && e.resource.resourceType == "Binary"));
    response = responseService.setDefaultResponse("Schedule", "post", filteredData);
    return response;
}

module.exports = { setScheduleData }