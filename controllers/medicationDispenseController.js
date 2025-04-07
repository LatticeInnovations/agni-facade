
const dispenseStatus = require("../utils/dispenseStatus.json");
let axios = require("axios");
let config = require("../config/nodeConfig");
const bundleStructure = require("../services/bundleOperation")
const responseService = require("../services/responseService");
const dispenseService = require("../services/medicationDispenseService");

//  Save prescription data
let saveMedicationDispense = async function (req, res) {
    try {
        // let response = resourceValid(req.params);
        // if (response.error) {
        //     console.error(response.error.details)
        //     let errData = { status: 0, response: { data: response.error.details }, message: "Invalid input" }
        //     return res.status(422).json(errData);
        // }
        const token = req.token.encodedToken;
        const resType = "MedicationDispense"
        let resourceResult = [];
        const prescriptionFhirIds = [ ...new Set(req.body.map(e=> e.prescriptionFhirId).filter(value => value !== undefined))];
        // fetch main encounter using appointment id
      const prescriptionEncounters = await bundleStructure.searchData(config.baseUrl + "Encounter", { "_id": prescriptionFhirIds.join(","), _count: 5000});   
      if(prescriptionEncounters.data.entry.length == 0) {
                return []
      }
     
      let existingMainEncountersList = await  dispenseService.getMainEncountersForPrescription(req.body, token, prescriptionFhirIds)
      // console.info("existingMainEncountersList: =======>", existingMainEncountersList)
      let bundleResources = []
      for (let reqData of req.body) {
        reqData.practitionerId = req.decoded.userId;
        let statusData = dispenseStatus.find( (e) => e.statusId == reqData.status);
        if(existingMainEncountersList.length > 0 && reqData.prescriptionFhirId) {
          const mainEncounterIndex = existingMainEncountersList.findIndex(
            (e) => e.resource.partOf.reference.split("/")[1] === reqData.prescriptionFhirId
          );
          // console.log("main encounter index check :", mainEncounterIndex)
            // Update the status to "XXX"
          existingMainEncountersList[mainEncounterIndex].resource.status = statusData?.encounter;
          const mainEncounter = existingMainEncountersList[mainEncounterIndex]
          reqData.mainEnounterId = mainEncounter.resource.id ? "Encounter/" + mainEncounter.resource.id : "urn:uuid:" + mainEncounter.resource.identifier[0].value
          // console.info("check req data ==============> ", reqData)
          const newRecord = await dispenseService.addNewRecord(resType, reqData, token)
          console.log("new record: ", newRecord)
          bundleResources.push(...newRecord);
          resourceResult = existingMainEncountersList
        }
        else {
          const newOTCRecord = await dispenseService.addOTCRecord(resType, reqData)
          console.log("check OTC ENTRY    =============================================")
          bundleResources.push(...newOTCRecord);
          console.info("bundleResources 2: ", bundleResources)
        }
        
      }
        resourceResult = [...resourceResult, ...bundleResources]
        let bundleData = await bundleStructure.getBundleJSON({resourceResult})  
        let response = await axios.post(config.baseUrl, bundleData.bundle); 
        console.info("get bundle json response: ", response.status)  
        if (response.status == 200 || response.status == 201) {
            let responseData = setMedicationDispenseResponse(bundleData.bundle.entry, response.data.entry, "post");        //    
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
let getMedicationDispense = async function (req, res) {
    try {
        const link = config.baseUrl + "Encounter";
        let queryParams = {
            "type": "pharmacy-service",
            "_total": "accurate",
            "_count": 3000
        }
        if(req.query.prescriptionId) {
            queryParams["part-of"]= req.query.prescriptionId;
        }
        else if(req.query.patientId) {
            queryParams["subject"] = req.query.patientId;

        }
        let resourceResult = []
        let responseData = await bundleStructure.searchData(link, queryParams);
        console.info("response data: ", responseData)
        let resStatus = 1;
        const token = req.token.encodedToken;
        if( !responseData.data.entry || responseData.data.total == 0) {
                return res.status(200).json({ status: resStatus, message: "Data fetched", total: 0, data: []  })
        }
        const FHIRData = responseData.data.entry;
        console.log("Medication dispense GET API")     
        let mainEncounters = FHIRData.map(e => e.resource)

        // console.info("mainEncounters: ", mainEncounters)
        const mainEncounterFhirIds = mainEncounters.map((e) => e.id).join(",");
            
        const prescriptionEncounterIds = mainEncounters.map(e => e.partOf.reference.split("/")[1]);
        //  get prescription's encounter ids with which the dispense in linked
        // console.info("prescriptionEncounterIds: ", prescriptionEncounterIds)
        //  get appointment encounter ids
        let appointmentEncounter = await bundleStructure.searchData( config.baseUrl + "Encounter",
              { _id: prescriptionEncounterIds.join(","), _include: "Encounter:part-of",  _count: 2000}, token
        );
        const prescriptionEncounters = appointmentEncounter.data.entry.filter(e => e.resource.type).map(enc => enc.resource)
        appointmentEncounter = appointmentEncounter.data.entry.filter(e => !e.resource.type).map(enc => enc.resource)
        // console.info("appointmentEncounter:", appointmentEncounter)
        // console.info("prescriptionEncounters:", prescriptionEncounters)
        mainEncounters = mainEncounters.map((mainEnc) => {
              const mappedPrescriptionEncounter = prescriptionEncounters.filter( e=> e.id == mainEnc.partOf.reference.split("/")[1])
            //   console.info("mappedPrescriptionEncounter: ", mappedPrescriptionEncounter);
              const mappedAppointmentEncounter = appointmentEncounter.filter( e => e.id == mappedPrescriptionEncounter[0].partOf.reference.split("/")[1]);
            //   console.info("mappedAppointmentEncounter: ", mappedAppointmentEncounter[0]);
              mainEnc.mappedPrescriptionEncounter = mappedPrescriptionEncounter[0]
              mainEnc.mappedAppointmentEncounter = mappedAppointmentEncounter[0];
              return mainEnc;
        })
        let subEncountersMedDispense = await bundleStructure.searchData( config.baseUrl + "Encounter",
              { "part-of": mainEncounterFhirIds, type: "dispensing-encounter", _revinclude: "MedicationDispense:context:Encounter",  _count: 2000}, token
        );
        const medDispResources = subEncountersMedDispense.data.entry;
        // Fetch medication list and sub encounter from main encounter
        const medDispenseWithEncounter = await dispenseService.fetchMedDispenseList(medDispResources, mainEncounters, token)  
        // console.log("medDispenseWithEncounter ---------------------", medDispenseWithEncounter, "------------------------")
        resourceResult = await dispenseService.mapEncounterAndMedDispense(mainEncounters, medDispenseWithEncounter)
                     
        res.status(200).json({ status: resStatus, message: "Data fetched.", total: resourceResult.length,"offset": +queryParams?._offset, data: resourceResult})
        
    }
    catch(e) {
        console.error("Error",e)
        return res.status(200).json({
                status: 0,
                message: "Unable to process. Please try again"
            })
       
    }
}


const setMedicationDispenseResponse  = (reqBundleData, responseBundleData, type) => {
    let filteredData = [];
    let response = [];
    const responseData = bundleStructure.mapBundleService(reqBundleData, responseBundleData)

    filteredData = responseData.filter(e => e.resource.resourceType == "Encounter" && e.resource.type && e.resource.type[0].coding[0].code == "dispensing-encounter");
    let medDispenseData = responseData.filter(e => e.resource.resourceType == "MedicationDispense").map(e => { 
            return {
                "medDispenseUuid" : e.resource.identifier[0].value, 
                "medDispenseFhirId": e.response.location.substring(e.response.location.indexOf("/") + 1, e.response.location.indexOf("/_history"))
            }
    });

    //  filtered data contains sub encounters for the date nandad time capture
    filteredData = filteredData.map(subEnc => {
        let dispenseData = reqBundleData.filter(inp => inp.dispenseId == subEnc.resource.identifier[0].value);
        let medicineDispensedList = dispenseData[0].medicineDispensedList.map((medDisp) => {
        const medDispenseIndex = medDispenseData.findIndex(output => medDisp.medDispenseUuid == output. medDispenseUuid);
        if(medDispenseIndex != -1){
            return medDispenseData[medDispenseIndex]
        }    
    });

    subEnc.medicineDispensedList = medicineDispensedList;
        return subEnc;
    });

    response = responseService.setDefaultResponse("MedicationDispense", type, filteredData);
    response.forEach((res, i) => {
        res.medicineDispensedList = filteredData[i].medicineDispensedList || [];
    });
    
    return response;

}



module.exports = {
    saveMedicationDispense,
    getMedicationDispense
}