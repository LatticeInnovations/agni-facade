let bundleFun = require("./bundleOperation");
const MedicationDispense = require("../class/MedicationDispense");
const DispenseEncounter = require("../class/DispenseEncounter");
const { v4: uuidv4 } = require("uuid");
let config = require("../config/nodeConfig");
let bundleOp = require("./bundleOperation");
const dispenseStatus = require("../utils/dispenseStatus.json");
let setMedicationDispenseData = async function (resType, reqInput, FHIRData, reqMethod, reqQuery, token) {
  try {
    let resourceResult = [], errData = [];
    if (["post", "POST", "PUT", "put"].includes(reqMethod)) {
      let existingMainEncountersList = await  getMainEncountersForPrescription(reqInput)
      console.log("existingMainEncountersList: =======>", existingMainEncountersList)
      let bundleResources = []
      for (let reqData of reqInput) {
        reqData.practitionerId = token.userId;
        let statusData = dispenseStatus.find( (e) => e.statusId == reqData.status);
        const mainEncounterIndex = existingMainEncountersList.findIndex(
          (e) => e.resource.partOf.reference.split("/")[1] === reqData.prescriptionFhirId
        );
          // Update the status to "XXX"
        existingMainEncountersList[mainEncounterIndex].resource.status = statusData?.encounter;
        const mainEncounter = existingMainEncountersList[mainEncounterIndex]
        reqData.mainEnounterId = mainEncounter.resource.id ? "Encounter/" + mainEncounter.resource.id : "urn:uuid:" + mainEncounter.resource.identifier[0].value
        const newRecord = await addNewRecord(resType, reqData)
        console.log("new record: ", newRecord)
        bundleResources.push(...newRecord);
      }
      resourceResult = existingMainEncountersList
      resourceResult = [...resourceResult, ...bundleResources]
      console.log("resourceResult ============> ", resourceResult, "----------", bundleResources)
    } else if (["PATCH", "patch"].includes(reqMethod)) {
      console.log("patch section");
      return Promise.reject({statusCode: 401, code: "ERR", message: "Unauthorized to perform this operation"})
    } else {
      console.log("Medication dispense GET API")     
      const mainEncounters = FHIRData.map(e => e.resource)
      console.log("get data section", mainEncounters);
      const mainEncounterFhirIds = mainEncounters.map((e) => e.id).join(",");
      // Fetch medication list and sub encounter from main encounter
      const medDispenseWithEncounter = await fetchMedDispenseList(mainEncounterFhirIds)   
      resourceResult = await mapEncounterAndMedDispense(mainEncounters, medDispenseWithEncounter)
    }
    return { resourceResult, errData };
  } catch (e) {
    return Promise.reject(e);
  }
};

const getMainEncountersForPrescription = async function(reqInput) {
  try {
    //  fetch prescription Ids
    const uniquePrescriptions = Array.from(
      new Set(reqInput.map((e) => e.prescriptionFhirId))
    ).map((id) => reqInput.find((e) => e.prescriptionFhirId === id));

    // search existing main encounters
    const mainEncounterQuery = {
      "part-of": uniquePrescriptions.map((e) => e.prescriptionFhirId).join(","),
      type: "pharmacy-service",
      _count: 1000,
    };
    const existingMainEncounters = await bundleOp.searchData(
      config.baseUrl + "Encounter",
      mainEncounterQuery
    );
    console.log(existingMainEncounters)
    let existingMainEncountersList = []
    if(existingMainEncounters.data.total > 0)
      existingMainEncountersList = await Promise.all(existingMainEncounters?.data?.entry?.map(
        async (encounter) => {
          const mainEncounterResInBundle = await bundleOp.setBundlePost(encounter.resource, encounter.resource.identifier, encounter.resource.id, "PUT", "identifier");  
          return mainEncounterResInBundle  
        }
      )) || [];
    if (existingMainEncountersList.length < uniquePrescriptions.length) {
      // Find the prescription Ids that do not exist already
      const existingMainPrescriptionIds = new Set(
        existingMainEncountersList.map((e) => e.resource.partOf.reference.split("/")[1])
      );
      // filter non existing main encounters
      const leftMainEncounters = uniquePrescriptions.filter(
        (item) => !existingMainPrescriptionIds.has(item.prescriptionFhirId)
      );

      // Create new main encounters concurrently using Promise.all
      let newEncounters = await Promise.all(
        leftMainEncounters.map(async (input) => {
          input.mainEncounterUuid = uuidv4()
          const mainEncounterResource =  await getEncounterResource(input, {}, true);
          const mainEncounterResInBundle = await bundleOp.setBundlePost(mainEncounterResource, mainEncounterResource.identifier, input.mainEncounterUuid, "POST", "identifier");  
          return mainEncounterResInBundle;
        }));
      console.log()
      existingMainEncountersList.push(...newEncounters);
    }

    return existingMainEncountersList;
  } catch (e) {
    return Promise.reject(e);
  }
}

const mapEncounterAndMedDispense= async function(mainEncounters, medDispenseWithEncounter) {
  try {
    const medicationDispenseResult = mainEncounters.map((mainEnc) => {
      // get main encounter object
      const mainEncounterObj = new DispenseEncounter({}, mainEnc, true).getFhirToJson();
      // get sub encounter
      let subEncounterWithMedDispenseObj = medDispenseWithEncounter
        .filter(
          (e) => e.subEncounter.partOf.reference.split("/")[1] == mainEnc.id
        )
        .map((e) => {
          const subEncounterObj = new DispenseEncounter({}, e.subEncounter, false).getFhirToJson();
          // get dispense list for a sub encounter
          const medDispenseObjects = e.medDispenseRes.map((medDispense) =>
            new MedicationDispense({}, medDispense).getFhirToJson()
          );
          return { ...subEncounterObj,  medicineDispensedList: medDispenseObjects};
        });
        subEncounterWithMedDispenseObj = subEncounterWithMedDispenseObj.sort((a, b) => new Date(b.generatedOn) - new Date(a.generatedOn))
        mainEncounterObj.dispenseData = subEncounterWithMedDispenseObj
      return mainEncounterObj
    });
    return medicationDispenseResult
  } catch (e) {
    return Promise.reject(e);
  }
}

// Fetch medicine dispense list with their sub encounters combined
const fetchMedDispenseList = async function(ids) {
  try {
    let subEncountersMedDispense = await bundleOp.searchData( config.baseUrl + "Encounter",
      { "part-of": ids, type: "dispensing-encounter", _revinclude: "MedicationDispense:context:Encounter",  _count: 2000}
    );
    const medResources = subEncountersMedDispense.data.entry;
    //  filter sub encounter resource from fetched resources
    const encounters = medResources.filter(
      (res) => res.resource.resourceType == "Encounter"
    ).map(e => e.resource);
    //  map sub encounter resources to their respective MedicationDispense resources
    const medDispenseWithEncounter = encounters.map((enc) => {
    const medDispenseRes = medResources.filter((md) => md.resource.resourceType == "MedicationDispense" && md.resource.context.reference.split("/")[1] == enc.id)
        .map((e) => e.resource);
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
const addNewRecord = async function (resType, reqInput) {
  try {
    let bundleResources = []
    // get encounter id of the prescription from which it is attached
    let prescriptionEncounterId = reqInput.prescriptionFhirId;
    // Matching MedicationRequest list to be fetched to further link it to medicationDispense
    let combinedMedReqResource = await combineMedReqAndInput(prescriptionEncounterId, reqInput);

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

const getMedicationDispenseResources = async function(combinedMedReqResource) {
    try {
        let medicationDispenseResources = []
        for ( let dispenseData of combinedMedReqResource) {
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

const combineMedReqAndInput = async function ( prescriptionEncounterId, reqInput) {
  try {
    console.log(" ==========>", reqInput)
    const medicineDispensedList = reqInput.medicineDispensedList
    let dispenseListMedReqIds = medicineDispensedList
      .map((e) => e.medReqFhirId)
      .join(",");
    //  get medReqFhirId to fetch MedicationRequest data for that prescriptionId
    let medicationRequestResources = await bundleOp.searchData(
      config.baseUrl + "MedicationRequest",{encounter: prescriptionEncounterId,  _id: dispenseListMedReqIds,  _count: 2000}
    );
    // create lookup of medicines to be dispensed list
    const medDispenseLookup = new Map(
      medicineDispensedList.map((dispense) => [dispense.medReqFhirId, dispense])
    );
    // combine both using medReqFhirId
    const combined = medicationRequestResources.data.entry
    .map((obj1) => {
      const medReqFhirId =
        obj1.resource.id;
      const medDispense = medDispenseLookup.get(medReqFhirId) || {};

      // Remove the matched item from the lookup to track unmatched items
      medDispenseLookup.delete(medReqFhirId);
      return {
        ...medDispense,  medFhirId: obj1.resource.medicationReference.reference.split("/")[1], dosageInstruction: obj1.resource.dosageInstruction,  subEncounterId: reqInput.dispenseId,
        patientId: reqInput.patientId, date: reqInput.generatedOn, practitionerId: reqInput.practitionerId};
    });

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
