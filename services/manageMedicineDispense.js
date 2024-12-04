let bundleFun = require("./bundleOperation");
const MedicationDispense = require("../class/MedicationDispense");
const DispenseEncounter = require("../class/DispenseEncounter");
const Medication = require("../class/medication");
const { v4: uuidv4 } = require("uuid");
let config = require("../config/nodeConfig");
let bundleOp = require("./bundleOperation");
const dispenseStatus = require("../utils/dispenseStatus.json");
const MedicationRequest = require("../class/MedicationRequest");
let setMedicationDispenseData = async function (resType, reqInput, FHIRData, reqMethod, reqQuery, token) {
  try {
    let resourceResult = [], errData = [];
    if (["post", "POST", "PUT", "put"].includes(reqMethod)) {
     
      const prescriptionFhirIds = [ ...new Set(reqInput.map(e=> e.prescriptionFhirId).filter(value => value !== undefined))];
        // fetch main encounter using appointment id
      const prescriptionEncounters = await bundleOp.searchData(config.baseUrl + "Encounter", { "_id": prescriptionFhirIds.join(","), _count: 5000}, token);   
      if(prescriptionEncounters.data.entry.length == 0) {
                return []
      }
     
      let existingMainEncountersList = await  getMainEncountersForPrescription(reqInput, token, prescriptionFhirIds)
      // console.info("existingMainEncountersList: =======>", existingMainEncountersList)
      let bundleResources = []
      for (let reqData of reqInput) {
        reqData.practitionerId = token.userId;
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
          const newRecord = await addNewRecord(resType, reqData, token)
          console.log("new record: ", newRecord)
          bundleResources.push(...newRecord);
          resourceResult = existingMainEncountersList
        }
        else {
          const newOTCRecord = await addOTCRecord(resType, reqData)
          console.log("check OTC ENTRY    =============================================")
          bundleResources.push(...newOTCRecord);
          console.info("bundleResources 2: ", bundleResources)
        }
        
      }
      resourceResult = [...resourceResult, ...bundleResources]
     
      // resourceResult = []
    } else if (["PATCH", "patch"].includes(reqMethod)) {
      console.log("patch section");
      return Promise.reject({statusCode: 401, code: "ERR", message: "Unauthorized to perform this operation"})
    } else {
      if(resType == "MedicationDispense") {
        console.log("Medication dispense GET API")     
        let mainEncounters = FHIRData.map(e => e.resource)
        console.info("mainEncounters: ", mainEncounters)
        const mainEncounterFhirIds = mainEncounters.map((e) => e.id).join(",");
        
        const prescriptionEncounterIds = mainEncounters.map(e => e.partOf.reference.split("/")[1])
        console.info("prescriptionEncounterIds: ", prescriptionEncounterIds)
        let appointmentEncounter = await bundleOp.searchData( config.baseUrl + "Encounter",
          { _id: prescriptionEncounterIds.join(","), _include: "Encounter:part-of",  _count: 2000}, token
        );
        const prescriptionEncounters = appointmentEncounter.data.entry.filter(e => e.resource.type).map(enc => enc.resource)
        appointmentEncounter = appointmentEncounter.data.entry.filter(e => !e.resource.type).map(enc => enc.resource)
        // console.info("appointmentEncounter:", appointmentEncounter)
        // console.info("prescriptionEncounters:", prescriptionEncounters)
        mainEncounters = mainEncounters.map((mainEnc) => {
          const mappedPrescriptionEncounter = prescriptionEncounters.filter( e=> e.id == mainEnc.partOf.reference.split("/")[1])
          console.info("mappedPrescriptionEncounter: ", mappedPrescriptionEncounter);
          const mappedAppointmentEncounter = appointmentEncounter.filter( e => e.id == mappedPrescriptionEncounter[0].partOf.reference.split("/")[1]);
          console.info("mappedAppointmentEncounter: ", mappedAppointmentEncounter[0]);
          mainEnc.mappedPrescriptionEncounter = mappedPrescriptionEncounter[0]
          mainEnc.mappedAppointmentEncounter = mappedAppointmentEncounter[0];
          return mainEnc;
        })
        let subEncountersMedDispense = await bundleOp.searchData( config.baseUrl + "Encounter",
          { "part-of": mainEncounterFhirIds, type: "dispensing-encounter", _revinclude: "MedicationDispense:context:Encounter",  _count: 2000}, token
        );
        const medDispResources = subEncountersMedDispense.data.entry;
        // Fetch medication list and sub encounter from main encounter
        const medDispenseWithEncounter = await fetchMedDispenseList(medDispResources, mainEncounters, token)  
        console.log("medDispenseWithEncounter ---------------------", medDispenseWithEncounter, "------------------------")
        resourceResult = await mapEncounterAndMedDispense(mainEncounters, medDispenseWithEncounter)
        
      }
      else {
        resourceResult = await groupMedicationLog(FHIRData, token)        
      }

    }
    return { resourceResult, errData };
  } catch (e) {
    return Promise.reject(e);
  }
};


const getMainEncountersForPrescription = async function(reqInput, token, prescriptionIds) {
  try {
    console.info
    let existingMainEncountersList = []
    console.info("prescriptionIds: ", prescriptionIds)
    if(prescriptionIds.length > 0) {
          // search existing main encounters
    const mainEncounterQuery = {
        "part-of": prescriptionIds.join(","),
        type: "pharmacy-service",
        _count: 1000,
      };
      const existingMainEncounters = await bundleOp.searchData(
        config.baseUrl + "Encounter",
        mainEncounterQuery, token
      );
      // console.info("main encounters list: ", existingMainEncounters.data)
      
      if(existingMainEncounters.data.total > 0) {
        existingMainEncountersList = await Promise.all(existingMainEncounters?.data?.entry?.map(
          async (encounter) => {
            const mainEncounterResInBundle = await bundleOp.setBundlePost(encounter.resource, encounter.resource.identifier, encounter.resource.id, "PUT", "identifier");  
            return mainEncounterResInBundle  
          }
        )) || [];
      }
    }


    if (existingMainEncountersList.length < prescriptionIds.length) {
      // Find the prescription Ids of main encounter that do not exist already
      const existingMainPrescriptionIds = new Set(
        existingMainEncountersList.map((e) => e.resource.partOf.reference.split("/")[1])
      );
      // console.info("existingMainPrescriptionIds: ", existingMainPrescriptionIds, "prescriptionIds: ", prescriptionIds)
      // filter non existing main encounters
      const leftMainEncounters = prescriptionIds.filter(
        (item) => !existingMainPrescriptionIds.has(item)
      );
      // console.info("check nonexisting", leftMainEncounters)
      // Create new main encounters concurrently using Promise.all
      let newEncounters = await Promise.all(
        leftMainEncounters.map(async (inputId) => {
            let input = reqInput.filter(e=> e.prescriptionFhirId == inputId)[0]
            input.mainEncounterUuid = uuidv4()
          const mainEncounterResource =  await getEncounterResource(input, {}, true);
          const mainEncounterResInBundle = await bundleOp.setBundlePost(mainEncounterResource, mainEncounterResource.identifier, input.mainEncounterUuid, "POST", "identifier");  
          return mainEncounterResInBundle;
        }));
      console.info("Check new Encounters: ", newEncounters)
      existingMainEncountersList.push(...newEncounters);
    }
    


    return existingMainEncountersList;
  } catch (e) {
    return Promise.reject(e);
  }
}

const mapEncounterAndMedDispense= async function(mainEncounters, medDispenseWithEncounter) {
  try {
    const medicationDispenseResult = await Promise.all(
      mainEncounters.map(async (mainEnc) => {
        // get main encounter object
        const mainEncounterObj = new DispenseEncounter({}, mainEnc, true).getFhirToJson();
        // get sub encounter
        let subEncounterWithMedDispenseObj = await Promise.all(
          medDispenseWithEncounter
            .filter(
              (e) => e.subEncounter.partOf.reference.split("/")[1] == mainEnc.id
            )
            .map(async (element) => {
              let { subEncounterObj,  medicineDispensedList } = await fetchSubEncounterWithMedDispenseUserOutput(element);  
              subEncounterObj.medicineDispensedList = medicineDispensedList         
              return subEncounterObj;
            })
        );
          console.log("check RESULT ---------->", subEncounterWithMedDispenseObj, "---------------")    
          subEncounterWithMedDispenseObj = subEncounterWithMedDispenseObj.sort((a, b) => new Date(b.generatedOn) - new Date(a.generatedOn))
          mainEncounterObj.dispenseData = subEncounterWithMedDispenseObj
        return mainEncounterObj
      })
    );
    return medicationDispenseResult
  } catch (e) {
    return Promise.reject(e);
  }
}

const fetchSubEncounterWithMedDispenseUserOutput = async function(element) {
  try {
    const subEncounterObj = new DispenseEncounter({}, element.subEncounter, false).getFhirToJson();
    subEncounterObj.appointmentId = element.subEncounter.appointmentId
    // get dispense list included with medicationRequest data and medication data as well for a sub encounter
    const medDispenseObjects = element.medDispenseRes.map((medDispense) =>
{         let medDispenseData = new MedicationDispense({}, medDispense).getFhirToJson()
          medDispenseData.prescriptionData = medDispense.prescriptionData;
          medDispenseData.dispensedMedication = medDispense.dispensedMedication
      return medDispenseData}
    );
    return { subEncounterObj: subEncounterObj,  medicineDispensedList: medDispenseObjects};
  }
  catch(e) {
    return Promise.reject(e)
  }
}

const groupMedicationLog= async function(FHIRData, token) {
  try {
    console.info("FHIRdata: ", FHIRData)
    if(FHIRData.length == 0)
      return [];
   let filteredEncounters = FHIRData.filter(enc => enc.resource.partOf == undefined)
   console.info("filteredEncounters: ", filteredEncounters)
   if (filteredEncounters.length ==0)
      return [];
   let subEncounterIds = filteredEncounters.map(e=> e.resource.id).join(",")
  const mediCationResourceBundle = await bundleFun.searchData(config.baseUrl + "MedicationDispense", {context: subEncounterIds, _count: 2000}, token)
  
  const subEncounterMedDispense = [...filteredEncounters, ...mediCationResourceBundle.data.entry]
  const mainEncounter = []
    const medDispenseWithEncounter = await fetchMedDispenseList(subEncounterMedDispense, mainEncounter, token) 
    let subEncounterWithMedDispenseObj = await Promise.all(
      medDispenseWithEncounter.map(async (element) => {
        const {subEncounterObj, medicineDispensedList} = await fetchSubEncounterWithMedDispenseUserOutput(element)
        subEncounterObj.medicineDispensedList = medicineDispensedList
        return subEncounterObj
  })
    ) 
    let result = subEncounterWithMedDispenseObj.sort((a, b) => new Date(b.generatedOn) - new Date(a.generatedOn))
    return result
  }
  catch(e) {
    return Promise.reject(e)
  }
}
// Fetch medicine dispense list with their sub encounters combined
const fetchMedDispenseList = async function(medDispResources, mainEncounters, token) {
  try {

    let {medReqData, medicationData} = await getMedicationRequestAndMedication(medDispResources, token)
    //  filter sub encounter resource from fetched resources
    let subEncounters = medDispResources.filter(
      (res) => res.resource.resourceType == "Encounter"
    ).map(e => e.resource);
    subEncounters = subEncounters.map(element => {      
      if(mainEncounters.length > 0) {
        let primaryEncounter = mainEncounters.filter(e => e.id == element.partOf.reference.split("/")[1])
        element.appointmentId = primaryEncounter[0].mappedAppointmentEncounter.appointment[0].reference.split("/")[1]
        
      }
      else {
        element.appointmentId = null
      }
      return element
      
    })
    //  map sub encounter resources to their respective MedicationDispense resources
    const medDispenseWithEncounter = subEncounters.map((enc) => {
    let medDispenseRes = medDispResources.filter((md) => md.resource.resourceType == "MedicationDispense" && md.resource.context.reference.split("/")[1] == enc.id)
    .map((e) => {return e.resource});
    // map medicine and medicationRequest data with medicationDispense data
    medDispenseRes = medDispenseRes.map(medDisp => {
      let medReqIndex = -1 
      //  check if it's not OTC then it have medicationRequest reference
      if(medDisp.authorizingPrescription)
        medReqIndex = medReqData.findIndex(e => e.medReqFhirId == medDisp.authorizingPrescription[0].reference.split("/")[1])
      const medIndex = medicationData.findIndex(e => e.medFhirId == medDisp.medicationReference.reference.split("/")[1])
      if(medReqIndex != -1) {
        medDisp.prescriptionData = medReqData[medReqIndex]
      }
      else {
        medDisp.prescriptionData = {}
      }
      if(medIndex != -1) {
        medDisp.dispensedMedication = medicationData[medIndex]
      }
      return medDisp
    });
      return {
        subEncounter: enc, medDispenseRes: medDispenseRes
      };
    });    
    return medDispenseWithEncounter;
  } catch (e) {
    console.error(e);
    const err = { statusCode: 404, code: "ERR", message: "Data not found" };
    return Promise.reject(err);
  }

}

const getMedicationRequestAndMedication = async function(medDispResources, token) {
  try {
    // Get medication Request ids and medicationIds to further fetch the data from medication details
    let {medReqIds, medicationIds} = medDispResources.reduce((acc, element) => {
      if(element.resource.authorizingPrescription){
        acc.medReqIds.add(element?.resource.authorizingPrescription[0]?.reference.split("/")[1])
      }  

      if(element.resource.medicationReference) {
        acc.medicationIds.add(element.resource.medicationReference.reference.split("/")[1])
      }
      return acc; 
    }, { medReqIds: new Set(), medicationIds: new Set() });
    console.info("medReqIds: ", medReqIds)
    // fetch medication request resource with their data.
    let medReqData = []
    if(medReqIds.size > 0) {
      const medRequestResources = await bundleOp.searchData(config.baseUrl + "MedicationRequest", {_id: Array.from(medReqIds).join(","), _count: 200}, token)
        medReqData = medRequestResources.data.entry.map(medReq => {
          let medReqData = new MedicationRequest({}, medReq.resource);
          medReqData.getFhirToJson();
          let medData = medReqData.getMedReqResource();
          medData.qtyPrescribed = medData.qtyPerDose * medData.frequency * medData.duration;
          medicationIds.add(medReq.resource.medicationReference.reference.split("/")[1])
          return medData
      });
    }

    let medicationResources = await bundleOp.searchData(config.baseUrl + "Medication", {_id: Array.from(medicationIds).join(","), _count: 200}, token)
    let medicationData = medicationResources.data.entry.map(element => {
      let medication = new Medication({}, element.resource);
      medication.getFHIRToUserInput();
      const medData = medication.getMedicationResource()
      return  medData
    });

    medReqData = medReqData.map(reqData => {
      const foundMedId = medicationData.findIndex(e =>  Number(e.medFhirId) == reqData.medFhirId)      
      if(foundMedId != -1) {
        reqData.prescribedMedication = medicationData[foundMedId]        
      }
      return reqData
    })
    
    return {"medReqData" : medReqData, "medicationData" : medicationData}
  }
  catch (e) {
    return Promise.reject(e)
  }

}
const addNewRecord = async function (resType, reqInput, token) {
  try {
    let bundleResources = []
    // get encounter id of the prescription from which it is attached
    let prescriptionEncounterId = reqInput.prescriptionFhirId;
    // console.info(" ======> prescriptionEncounterId: ", prescriptionEncounterId, reqInput)
    // Matching MedicationRequest list to be fetched to further link it to medicationDispense
    let combinedMedReqResource = await combineMedReqAndInput(prescriptionEncounterId, reqInput, token);

     // create sub-encounter to maintain notes and date time
    const subEncounter = await getEncounterResource(reqInput, {}, false, {});
    const subEncounterResInBundle = await bundleFun.setBundlePost(subEncounter, subEncounter.identifier, reqInput.dispenseId, "POST", "identifier");
    bundleResources.push(subEncounterResInBundle)
    //  create medical dispense record
    const medicationDispenseResources = await getMedicationDispenseResources(combinedMedReqResource)
    bundleResources = [...bundleResources, ...medicationDispenseResources]

    return bundleResources
  } catch (e) {
    console.error(e);
    return Promise.reject(e);
  }
};

const addOTCRecord = async function (resType, reqInput) {
  try {
  let bundleResources = []
     // create sub-encounter to maintain notes and date time
    const subEncounter = await getEncounterResource(reqInput, {}, false, {});
    const subEncounterResInBundle = await bundleFun.setBundlePost(subEncounter, subEncounter.identifier, reqInput.dispenseId, "POST", "identifier");
    bundleResources.push(subEncounterResInBundle)
    //  create medical dispense record
     // Add the remaining unmatched items from the lookup
     console.log("$$$$$$$$$$$$$$$$$$: ", reqInput)
     const medDispenseData = reqInput.medicineDispensedList.map((medDispense) => {
      medDispense.date  =  reqInput.generatedOn,
      medDispense.subEncounterId = reqInput.dispenseId,
      medDispense.patientId = reqInput.patientId,
      medDispense.practitionerId = reqInput.practitionerId
      return medDispense;
  });
    const medicationDispenseResources = await getMedicationDispenseResources(medDispenseData)
    bundleResources = [...bundleResources, ...medicationDispenseResources]

    return bundleResources
  } catch (e) {
    console.error(e);
    return Promise.reject(e);
  }
}


const getMedicationDispenseResources = async function(combinedMedReqResource) {
    try {
        let medicationDispenseResources = []
        for ( let dispenseData of combinedMedReqResource) {
          console.log("DISPENSE DATA *******************************:", dispenseData)
            const medDispenseClass = new MedicationDispense(dispenseData, {})
            let medDisResource = medDispenseClass.getJSONtoFhir()
            const dispenseResourceBundle = await bundleFun.setBundlePost(medDisResource, medDisResource.identifier, medDisResource.identifier[0].value, "POST", "identifier");    
            medicationDispenseResources.push(dispenseResourceBundle)
        }
        return medicationDispenseResources
    }
    catch(e) {
        return Promise.reject(e)
    }
}

const combineMedReqAndInput = async function ( prescriptionEncounterId, reqInput, token) {
  try {
    console.info(" ==========>", prescriptionEncounterId)
    const medicineDispensedList = reqInput.medicineDispensedList
    let dispenseListMedReqIds = medicineDispensedList
      .map((e) => e.medReqFhirId)
      .join(",");
    //  get medReqFhirId to fetch MedicationRequest data for that prescriptionId
    let medicationRequestResources = await bundleOp.searchData(
      config.baseUrl + "MedicationRequest",{encounter: prescriptionEncounterId,  _id: dispenseListMedReqIds,  _count: 2000}, token
    );
    // create lookup of medicines to be dispensed list
    const medDispenseLookup = new Map(
      medicineDispensedList.map((dispense) => [dispense.medReqFhirId, dispense])
    );
    console.info("medicationRequestResources: ", medicationRequestResources)
    // combine both using medReqFhirId
    const combined = medicationRequestResources.data.entry
    .map((obj1) => {
      const medReqFhirId =
        obj1.resource.id;
      const medDispense = medDispenseLookup.get(medReqFhirId) || {};

      // Remove the matched item from the lookup to track unmatched items
      medDispenseLookup.delete(medReqFhirId);
      return {
        ...medDispense,  prescribedMedFhirId: obj1.resource.medicationReference.reference.split("/")[1], dosageInstruction: obj1.resource.dosageInstruction,  subEncounterId: reqInput.dispenseId,
        patientId: reqInput.patientId, date: reqInput.generatedOn, practitionerId: reqInput.practitionerId};
    });
    console.log("Check combined: =================", combined, "==================")
    // Add the remaining unmatched items from the lookup
    const unmatchedDispenses = Array.from(medDispenseLookup.values()).map((unmatched) => ({
        ...unmatched, 
        date: reqInput.generatedOn,
        subEncounterId: reqInput.dispenseId,
        patientId: reqInput.patientId,
        practitionerId: reqInput.practitionerId
    }));

    return [...combined, ...unmatchedDispenses];
  } catch (e) {
    console.error(e);
    return Promise.reject(e);
  }
};

const getEncounterResource = async function (reqInput, FHIRData, isMain) {
  try {
    //  Create main encounter resource to combine it to prescription
    let encounterResource = null;
    const dispenseEncounter = new DispenseEncounter(reqInput, FHIRData, isMain);
    encounterResource = dispenseEncounter.getUserInputToFhir();
    return encounterResource;
  } catch (e) {
    return Promise.reject(e);
  }
};

module.exports = { setMedicationDispenseData };