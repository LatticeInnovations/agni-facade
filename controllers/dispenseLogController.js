
let config = require("../config/nodeConfig");
const bundleStructure = require("../services/bundleOperation");
const dispenseService = require("../services/medicationDispenseService");

//  Get Practitioner data
let getDispenseLog = async function (req, res) {
    try {
        const link = config.baseUrl + "Encounter";
        let queryParams = {
            "type": "dispensing-encounter",
            "_total": "accurate",
            "_count": 3000
        }
        if(req.query.patientId) {
          queryParams["subject"] = req.query.patientId;
       }
        let resourceResult = []
        let responseData = await bundleStructure.searchData(link, queryParams);
        let resStatus = 1;
        const token = req.token.encodedToken;
        console.info("FHIRData: ", responseData.data.entry)
        if( !responseData.data.entry || responseData.data.total == 0) {
                return res.status(200).json({ status: resStatus, message: "Data fetched", total: 0, data: []  })
        }
        const FHIRData = responseData.data.entry;
        if(FHIRData.length == 0)
            return res.status(200).json({ status: resStatus, message: "Data fetched.", total: resourceResult.length,"offset": +queryParams?._offset, data: resourceResult  })
        
         let filteredEncounters = FHIRData.filter(enc => enc.resource.partOf == undefined)
         console.info("filteredEncounters: ", filteredEncounters)
         if (filteredEncounters.length ==0)
            return res.status(200).json({ status: resStatus, message: "Data fetched.", total: resourceResult.length,"offset": +queryParams?._offset, data: resourceResult  })
        
         let subEncounterIds = filteredEncounters.map(e=> e.resource.id).join(",")
        const mediCationResourceBundle = await bundleStructure.searchData(config.baseUrl + "MedicationDispense", {context: subEncounterIds, _count: 2000}, token)
        
        const subEncounterMedDispense = [...filteredEncounters, ...mediCationResourceBundle.data.entry]
        const mainEncounter = []
          const medDispenseWithEncounter = await dispenseService.fetchMedDispenseList(subEncounterMedDispense, mainEncounter, token) 
          let subEncounterWithMedDispenseObj = await Promise.all(
            medDispenseWithEncounter.map(async (element) => {
              const {subEncounterObj, medicineDispensedList} = await dispenseService.fetchSubEncounterWithMedDispenseUserOutput(element)
              subEncounterObj.medicineDispensedList = medicineDispensedList
              return subEncounterObj
        })
          ) 
        resourceResult = subEncounterWithMedDispenseObj.sort((a, b) => new Date(b.generatedOn) - new Date(a.generatedOn))
             
        return res.status(200).json({ status: resStatus, message: "Data fetched.", total: resourceResult.length,"offset": +queryParams?._offset, data: resourceResult  })
        
    }
    catch(e) {
        console.error("Error",e)
        return res.status(200).json({
                status: 0,
                message: "Unable to process. Please try again"
            })
       
    }
}



module.exports = {getDispenseLog}