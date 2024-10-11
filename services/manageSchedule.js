let Schedule = require("../class/Schedule");
let bundleFun = require("./bundleOperation");
let bundleOp = require("./bundleOperation");
let config = require("../config/nodeConfig");
let scheduleValid = require("../utils/Validator/scheduleAppointment").scheduleValidation
let setScheduleData = async function (resType, reqInput, FHIRData, reqMethod, token) {
    try {
        let resourceResult = [], errData = [];
        if (["post", "POST", "PUT", "put"].includes(reqMethod)) {
            for (let scheduleData of reqInput) {
                let response = scheduleValid(scheduleData);
                if (response.error) {
                    console.error(response.error.details)
                    let errData = { code: "ERR", statusCode: 422, response: { data: response.error.details[0] }, message: "Invalid input" }
                    return Promise.reject(errData);
                }
                let locationResource = await bundleOp.searchData(config.baseUrl + "Location", { organization: "Organization/" + scheduleData.orgId, _elements: "id", _total: "accurate" }, token);
                let locationId = locationResource.data.entry[0].resource.id;
                scheduleData.locationId = locationId;
                    console.info("this is a check for data")
                    let schedule = new Schedule(scheduleData, FHIRData);
                    schedule.getJsonToFhirTranslator();
                    let scheduleResource = {};
                    scheduleResource = { ...schedule.getResource() };
                    scheduleResource.resourceType = resType;
                    let noneExistData = [
                        { "key": "date", "value": "ge" + encodeURIComponent(scheduleData.planningHorizon.start) },
                        { "key": "date", "value": "le" + encodeURIComponent(scheduleData.planningHorizon.end) },
                        { "key": "actor", "value": 'Location/' + locationId }
                    ];
                    let scheduleBundle = await bundleFun.setBundlePost(scheduleResource, noneExistData, scheduleData.uuid, "POST", "object");
                    resourceResult.push(scheduleBundle);
            }
            console.info("=============>", resourceResult, errData, "<=========================")
        }
        else {
            let locationIds = new Set(), scheduleIds = new Set(); let scheduleResult = [], resourceSlotResult = [];
            for (let scheduleData of FHIRData) {
                let schedule = new Schedule({}, scheduleData.resource);
                schedule.getFHIRToUserInput();
                let scheduleResponse = schedule.getInput();
                scheduleIds.add(scheduleResponse.scheduleId);
                let locationId = scheduleData.resource.actor[0].reference.split("/")[1];
                locationIds.add(locationId);
                scheduleResponse.locationId = locationId;
                scheduleResponse.bookedSlots = 0;
                scheduleResult.push(scheduleResponse);
            }
            console.log("=================>", token)
            // to get organization id from location of the schedule and join it with schedule data
            let orgResource = await bundleOp.searchData(config.baseUrl + "Location", { _elements: "managingOrganization", _id: [...locationIds].join(","), _count: locationIds.size }, token);

            let locationOrg = orgResource.data.entry.map(e => { return { locationId: e.resource.id, orgId: e.resource.managingOrganization.reference.split("/")[1] } });
            resourceSlotResult = scheduleResult.map(obj1 => {
                let obj2 = locationOrg.find(obj2 => obj2.locationId === obj1.locationId);
                return { ...obj1, ...obj2 };
            });
            // booked slots count

            let slotList = await bundleOp.searchData(config.baseUrl + "Slot", { _elements: "schedule", "_has:Appointment:slot:slot.schedule": [...scheduleIds].join(","), _count: 5000, "_has:Appointment:slot:status": "proposed,arrived,noshow" }, token);
            let resData = []; let resourceResult1 = null;
            if (slotList.data.total > 0) {
                resData = slotList.data.entry.reduce((acc, { resource }) => {
                    let scheduleId = resource.schedule.reference.split("/")[1];
                    if (scheduleIds.has(scheduleId))
                        acc[scheduleId] = (acc[scheduleId] || 0) + 1;
                    return acc;
                }, {});
            }
            else {
                slotList.data.entry = []
                for (let i = 0; i < scheduleIds.size; i++) {
                    resData[scheduleIds[i]] = 0
                }
            }

            resourceResult1 = Object.entries(resData).map(([scheduleId, bookedSlots]) => ({ scheduleId, bookedSlots }));
            resourceResult = resourceSlotResult.map(obj1 => {
                let obj2 = resourceResult1.find(obj2 => obj2.scheduleId === obj1.scheduleId);
                return { ...obj1, ...obj2 };
            });
        }
        return { resourceResult, errData };
    }

    catch (e) {
        return Promise.reject(e);
    }

}

module.exports = { setScheduleData }