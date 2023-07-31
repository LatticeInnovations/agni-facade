let Appointment = require("../class/Appointment");
let Slot = require("../class/Slot");
const Encounter = require("../class/encounter")
let bundleFun = require("./bundleOperation");
let bundleOp = require("./bundleOperation");
let config = require("../config/nodeConfig");
const { v4: uuidv4 } = require('uuid');
let apptValid = require("../utils/Validator/scheduleAppointment").apptValidation;
let apptPatchValidation = require("../utils/Validator/scheduleAppointment").apptPatchValidation;


// postMessage, update and get app data handling function
let setApptData = async function (resType, reqInput, FHIRData, reqMethod) {
    try {
        let resourceResult = [], errData = [];
        if (["post", "POST", "PUT", "put"].includes(reqMethod)) {
            for (let apptData of reqInput) {
                let response = apptValid(apptData);
                if (response.error) {
                    console.error(response.error.details)
                    let errData = { code: "ERR", statusCode: 422, response: { data: response.error.details }, message: "Invalid input" }
                    return Promise.reject(errData);
                }
                // get location id of the organization sent by app and map it to the appointments
                let locationResource = await bundleOp.searchData(config.baseUrl + "Location", { organization: "Organization/" + apptData.orgId, _elements: "id", _total: "accurate" });
                if (locationResource.data.total && locationResource.data.total == 1) {
                    let locationId = locationResource.data.entry[0].resource.id;
                    apptData.locationId = locationId;
                    if(apptData.status !== "cancelled") {
                        let slotData = apptData.slot;
                        // generate slot of  the given schedule
                        slotData.scheduleId = apptData.scheduleId;
                        slotData.uuid = uuidv4();
                        let slot = new Slot(slotData, {})
                        slot.getJsonToFhirTranslator();
                        let slotResource = slot.getResource();
                        let slotBundle = await bundleFun.setBundlePost(slotResource, null, slotData.uuid, "POST", "object");
                        apptData.slotUuid = slotData.uuid;
                        resourceResult.push(slotBundle);
                    }
                    let appt = new Appointment(apptData, FHIRData);
                    appt.getJsonToFhirTranslator();
                    let apptResource = {};
                    apptResource = { ...appt.getResource() };
                    apptResource.resourceType = resType;
                    let encounter = new Encounter(apptData, {});
                    encounter.getUserInputToFhir();
                    let encounterResource = {...encounter.getFHIRResource()};
                    encounterResource.resourceType = "Encounter";
                    let encounterUuid =  uuidv4();
                    // constraint to not allow multiple appoinments creation for same patient  on same Time for same organization
                    let noneExistDataAppt = [
                        { "key": "date", "value": apptData.slot.start },
                        { "key": "location", "value": 'Location/' + locationId },
                        { "key": "patient", "value": 'Patient/' + apptData.patientId }
                    ]
                   
                    let apptBundle = await bundleFun.setBundlePost(apptResource, noneExistDataAppt, apptData.uuid, "POST", "object");              
                    let encounterBundle = await bundleFun.setBundlePost(encounterResource, encounterResource.identifier, encounterUuid, "POST", "identifier");
                    resourceResult.push(apptBundle, encounterBundle);
                }
                else {
                    // if location data is not gound that means either location or organization details are incorrect
                    errData.push({
                        "status": "500",
                        "id": apptData.uuid,
                        "err": "Organization or it's location missing",
                        "fhirId": null
                    })
                }
            }
        }    
        else if (["patch", "PATCH"].includes(reqMethod)) {
            // update appointment by rescheduling or cneceling and noshow status
            for (let inputData of reqInput) {
                let response = apptPatchValidation(inputData);
                if (response.error) {
                    console.error(response.error.details)
                    let errData = { code: "ERR", statusCode: 422, response: { data: response.error.details }, message: "Invalid input" }
                    return Promise.reject(errData);
                }
                let link = config.baseUrl + resType;
                let resourceSavedData = await bundleFun.searchData(link, { "_id": inputData.appointmentId });
                if (resourceSavedData.data.total != 1) {
                    errData.push({
                        "status": "500",
                        "id": null,
                        "err": "Appointment does not exist",
                        "fhirId": inputData.appointmentId
                    })
                }
                else if(resourceSavedData.data.entry[0].resource.status == "cancelled" || resourceSavedData.data.entry[0].resource.status == "noshow" || resourceSavedData.data.entry[0].resource.status == "arrived") {
                    // once appointment status is no-show and cancelled it cannot be changed.
                    errData.push({
                        "status": "500",
                        "id": null,
                        "err": "Appointment data not changed as status is " + resourceSavedData.data.entry[0].resource.status,
                        "fhirId": inputData.appointmentId
                    })
                }
                else {
                    // update appointment details 
                    let slotPatch = null;                    
                    let appointment = new Appointment(inputData, []);
                    appointment.patchUserInputToFHIR(resourceSavedData.data.entry[0].resource);
                    let resourceData = [...appointment.getResource()];
                    const patchUrl = resType + "/" + inputData.appointmentId;
                    let slotId = resourceSavedData.data.entry[0].resource.slot[0].reference.split("/")[1]; 
                    let patchResource = await bundleFun.setBundlePatch(resourceData, patchUrl);
                    // if an appointment is cancelled delete the linked slot
                    if(inputData.status.value == "cancelled") {  
                        slotPatch = await bundleOp.setBundleDelete("Slot", slotId);
          
                    }
                    else {
                        let slot = new Slot(inputData, []);
                        slot.patchUserInputToFHIR();
                        let slotPatchResource = [...slot.getResource()];
                        const slotPatchUrl = "Slot/" + slotId;
                         slotPatch = await bundleFun.setBundlePatch(slotPatchResource, slotPatchUrl);
                    }
                    resourceResult.push(patchResource, slotPatch);
                }

            }

        }
        else {
            // get all the details of appointment
            let locationIds = new Set(); let apptIds = new Set(), slotIds = new Set(); let apptResult = [];
            for (let apptData of FHIRData) {
                let appointment = new Appointment({}, apptData.resource);
                appointment.getFHIRToUserInput();
                let apptResponse = appointment.getInput();
                console.info(apptResponse)
                apptIds.add(apptResponse.appointmentId);
                locationIds.add(apptResponse.locationId);
                let slotId = apptData.resource.slot ? apptData.resource.slot[0].reference.split("/")[1] : null;
                slotIds.add(slotId);
                apptResponse.slotId = slotId;
                apptResult.push(apptResponse);
            }
            // get orh=ganization id of an appointment
            let orgResource = await bundleOp.searchData(config.baseUrl + "Location", { _elements: "managingOrganization", _id: [...locationIds].join(","), _count: locationIds.size });

            let locationOrg = orgResource.data.entry.map(e => { return { locationId: e.resource.id, orgId: e.resource.managingOrganization.reference.split("/")[1] } });
            console.info(locationOrg)
            apptResult = apptResult.map(obj1 => {
                let obj2 = locationOrg.find(obj2 => obj2.locationId === obj1.locationId);
              
                return { ...obj1, ...obj2 };
            });
            // get assigned slot and schedule data of an appointment
            let slotList = await bundleOp.searchData(config.baseUrl + "Slot", { "_id": [...slotIds].join(","), _count: 5000 });
            let slotAppt = slotList.data.entry.map(e => { return { slotId: e.resource.id, slot: { start: e.resource.start, end: e.resource.end}, scheduleId: e.resource.schedule.reference.split("/")[1] } });
            resourceResult = apptResult.map(obj1 => {
                let obj2 = slotAppt.find(obj2 => obj2.slotId === obj1.slotId);
                if(typeof obj2 == "undefined") {
                    obj2 = {slot: null, slotId: null};
                    obj1.scheduleId = null;
                }
                return { ...obj1, ...obj2 };
            });
        }

        return { resourceResult, errData };
    }

    catch (e) {
        return Promise.reject(e);
    }

}

module.exports = { setApptData }