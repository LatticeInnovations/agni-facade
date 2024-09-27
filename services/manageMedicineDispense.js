let bundleFun = require("./bundleOperation");
const MedicationDispense = require("../class/MedicationDispense");
const DispenseEncounter = require("../class/DispenseEncounter");
const { v4: uuidv4 } = require("uuid");
let config = require("../config/nodeConfig");
let bundleOp = require("./bundleOperation");
const dispenseStatus = require("../utils/dispenseStatus.json");
let setMedicationDispenseData = async function (resType, reqInput, FHIRData, reqMethod, reqQuery, token) {
  try {
    let resourceResult = [],
      errData = [];
    if (["post", "POST", "PUT", "put"].includes(reqMethod)) {
      for (let reqData of reqInput) {
        reqData.practitionerId = token.userId;
        let bundleResources = await addNewRecord(resType, reqData);
        resourceResult = [...resourceResult, ...bundleResources];
      }
      console.log(resourceResult);
    } else if (["PATCH", "patch"].includes(reqMethod)) {
      console.log("patch section");
    } else {
      console.log("Medication dispense GET API")     
      const mainEncounters = FHIRData.map(e => e.resource)
      console.log("get data section", mainEncounters);
      const mainEncounterFhirIds = mainEncounters.map((e) => e.id).join(",");
      // Fetch medication list and sub encounter from main encounter
      const medDispenseWithEncounter = await fetchMedDispenseList(mainEncounterFhirIds)
      // console.log(medDispenseWithEncounter);      
      resourceResult = await mapEncounterAndMedDispense(mainEncounters, medDispenseWithEncounter)
    }
    return { resourceResult, errData };
  } catch (e) {
    return Promise.reject(e);
  }
};


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
    const mainEncounterUuid = uuidv4()
    reqInput.mainEncounterUuid = mainEncounterUuid
    // Matching MedicationRequest list to be fetched to further link it to medicationDispense
    let combinedMedReqResource = await combineMedReqAndInput(prescriptionEncounterId, reqInput.medicineDispensedList, reqInput);
    // get OTC medicines list
    let mainEncounterQuery = {"part-of": reqInput.prescriptionFhirId, type: "pharmacy-service",  _count: 1000 };
    const mainEncounterResource = await getEncounterResource( reqInput, {}, true, mainEncounterQuery );
    let mainEncounterResInBundle = null
    if (!mainEncounterResource.id) {        
        mainEncounterResInBundle = await bundleFun.setBundlePost(mainEncounterResource, mainEncounterResource.identifier, mainEncounterUuid, "POST", "identifier");       
    }
    else {
      reqInput.mainEncounterFhirId = mainEncounterResource.id
      mainEncounterResInBundle = await bundleFun.setBundlePost(mainEncounterResource, mainEncounterResource.identifier, mainEncounterResource.id, "PUT", "identifier");        
    }
    bundleResources.push(mainEncounterResInBundle)
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

const combineMedReqAndInput = async function ( prescriptionEncounterId, medicineDispensedList, reqInput) {
  try {
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

const getEncounterResource = async function (reqInput, FHIRData, isMain, query) {
  try {
    //  Create main encounter resource to combine it to prescription
    // check if any main encounter already exists else create it
    let encounterResource = null;
    //  this is for sub encounter
    if (!isMain) {
      const dispenseEncounter = new DispenseEncounter(reqInput, FHIRData, isMain);
      encounterResource = dispenseEncounter.getUserInputToFhir();
      return encounterResource;
    }
    let checkMainEncounter = await bundleOp.searchData(
      config.baseUrl + "Encounter",
      query
    );
    // check if main encounter already exists change it's status else create a new main encounter
    if (isMain && checkMainEncounter.data.total == 0) {
      const dispenseEncounter = new DispenseEncounter(reqInput, FHIRData, isMain);
      encounterResource = dispenseEncounter.getUserInputToFhir();
    } else {
      encounterResource = checkMainEncounter.data.entry[0].resource;
      let statusData = dispenseStatus.find( (e) => e.statusId == reqInput?.status);
      encounterResource.status = statusData?.encounter;
    }
    return encounterResource;
  } catch (e) {
    return Promise.reject(e);
  }
};

module.exports = { setMedicationDispenseData };
