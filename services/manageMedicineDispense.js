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
      console.log("Post or put request", token);     
      for(let reqData of reqInput) {
        reqData.practitionerId = token.userId
        let bundleResources = await addNewRecord(resType, reqData);
        console.log("bundleResources", bundleResources)
        resourceResult = [...resourceResult, ...bundleResources]
      }
      console.log(resourceResult)

    } else if (["PATCH", "patch"].includes(reqMethod)) {
      console.log("patch section");
    } else {
      console.log("get data section");

    }
    return { resourceResult, errData };
  } catch (e) {
    return Promise.reject(e);
  }
};


const addNewRecord = async function (resType, reqInput) {
  try {
    let bundleResources = []
    // get encounter id of the prescription from which it is attached
    let prescriptionEncounterId = reqInput.prescriptionFhirId;
    const subEncounterId = uuidv4()
    reqInput.subEncounterId = subEncounterId
    // Matching MedicationRequest list to be fetched to further link it to medicationDispense
    let combinedMedReqResource = await combineMedReqAndInput(  prescriptionEncounterId, reqInput.medicineDispensedList, reqInput);
    // get OTC medicines list
    let mainEncounterQuery = {"part-of": reqInput.prescriptionFhirId, type: "http://custom-coding-system|" + "pharapharmacy-service",  _count: 1000 };
    const mainEncounterResource = await getEncounterResource( reqInput, {}, true, mainEncounterQuery );
    // console.log("main encounter: ", mainEncounterResource);
    const mainEncounterId = mainEncounterResource.id  ? mainEncounterResource.id : "urn:uuid:" + reqInput.dispenseId;
  //  create main encounter to maintain status
    reqInput.mainEncounterId = mainEncounterId;
    if (!mainEncounterResource.id) {
        const mainEncounterResInBundle = await bundleFun.setBundlePost(mainEncounterResource, mainEncounterResource.identifier, reqInput.dispenseId, "POST", "identifier");
        bundleResources.push(mainEncounterResInBundle)
    }
    else {
      const mainEncounterResInBundle = await bundleFun.setBundlePost(mainEncounterResource, mainEncounterResource.identifier, mainEncounterResource.id, "PUT", "identifier");        
      bundleResources.push(mainEncounterResInBundle)
    }
     // create sub-encounter to maintain notes and date time
    const subEncounter = await getEncounterResource(reqInput, {}, false, {});
    const subEncounterResInBundle = await bundleFun.setBundlePost(subEncounter, subEncounter.identifier, reqInput.subEncounterId, "POST", "identifier");
    // console.log("sub encounter: ", subEncounter);
    bundleResources.push(subEncounterResInBundle)
    //  create medical dispense record
    const medicationDispenseResources = await getMedicationDispenseResources(combinedMedReqResource)
    // console.log("medicationDispenseResources: ", medicationDispenseResources)
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
        for ( let dispData of combinedMedReqResource) {
            const medDispenseClass = new MedicationDispense(dispData, {})
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
    let dispenseListMedIds = medicineDispensedList
      .map((e) => e.medFhirId)
      .join(",");
    //  get medIds to fetch MedicationRequest data for that prescriptionId
    let medicationRequestResources = await bundleOp.searchData(
      config.baseUrl + "MedicationRequest",
      {
        encounter: prescriptionEncounterId,
        medication: dispenseListMedIds,
        _count: 2000,
      }
    );

    // create lookup of medicines to be dispensed list
    const medDispenseLookup = new Map(
      medicineDispensedList.map((dispense) => [dispense.medFhirId, dispense])
    );
    // combine both using medId
    const combined = medicationRequestResources.data.entry.map((obj1) => {
      const medFhirId =
        obj1.resource.medicationReference.reference.split("/")[1];
      const medDispense = medDispenseLookup.get(medFhirId) || {};

      // Remove the matched item from the lookup to track unmatched items
      medDispenseLookup.delete(medFhirId);
      return {
        ...medDispense,
        medReqFhirId: obj1.resource.id,
        dosageInstruction: obj1.resource.dosageInstruction,
        subEncounterId: reqInput.subEncounterId,
        patientId: reqInput.patientId,
        date: reqInput.generatedOn,
        practitionerId: reqInput.practitionerId

      };
    });

    // Add the remaining unmatched items from the lookup
    const unmatchedDispenses = Array.from(medDispenseLookup.values()).map((unmatched) => ({
        ...unmatched, 
        date: reqInput.generatedOn,
        subEncounterId: reqInput.subEncounterId,
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
