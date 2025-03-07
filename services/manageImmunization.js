let Encounter = require("../class/GroupEncounter");
let Immunization = require("../class/Immunization")
let DocumentReference = require("../class/DocumentReference")
let bundleOp = require("./bundleOperation");
let config = require("../config/nodeConfig");
let bundleFun = require("./bundleOperation");
const { v4: uuidv4 } = require("uuid");
const {validateImmunization} = require("../utils/Validator/immunizationValidation")


const manageImmunizationDetail = async (resType, reqInput, FHIRData,reqMethod,reqQuery,token) => {
  try {
        let resourceResult = [],
        errData = [];
        if (["post", "POST", "PUT", "put"].includes(reqMethod)) {
        resourceResult = await saveImmunizationData(reqInput, token);
        } else if (["PATCH", "patch"].includes(reqMethod)) {
            return resourceResult;
        } else {
        resourceResult = await getImmunizationDetails(FHIRData, reqQuery, token)
        }
        // console.log("==============> ", resourceResult);
        return { resourceResult, errData };
  } catch (e) {
    return Promise.reject(e);
  }
};

const saveImmunizationData = async function (reqInput, token) {
  let resourceResult = [];
  try {
      let validationResponse = validateImmunization(reqInput);
      if (validationResponse.error) {
          console.error(validationResponse.error.details)
          let errData = { code: "ERR", statusCode: 422, response: { data: validationResponse.error.details[0] }, message: "Invalid input" }
          return Promise.reject(errData);
      }
      const mainEncounters = await getMainEncounter(reqInput, token);
      // Get immunization recommendation resources of the patients
      const immunizationRecommendations = await getImmunizationRecommendation(reqInput, token);
      // console.log(immunizationRecommendations)
      for (let immunizationData of reqInput) {
          let mainEncounter = mainEncounters.filter(
              (e) =>e.resourceType == "Encounter" && e.appointment[0]?.reference?.split("/")[1] == immunizationData.appointmentId);
          console.log("Immunization POST");
          mainEncounter = mainEncounter[0];

          //  create sub encounter
          const encounterData = { token, mainEncounter, immunizationData };
          let subEncounter = createSubEncounter(encounterData);
          let subEncounterBundle = await bundleFun.setBundlePost(subEncounter, null, subEncounter.identifier[0].value, "POST", "identifier");

          // set immunization parameters and create Immunization Record
          immunizationData.orgId = token.orgId;
          immunizationData.practitionerId = token.userId;
          immunizationData.subEncounterId = subEncounter.identifier[0].value;
          const immunizationBundle = await createImmunizationResource(immunizationData);        

          // Link immunization To ImmunizationRecommendation
          const recommendationBundle = await addImmunizationReference(immunizationRecommendations, immunizationData)   
          console.log("recommendation resource check: ", recommendationBundle)
          //  push data
          resourceResult.push(subEncounterBundle, immunizationBundle, recommendationBundle);
          // if documents exist create reference
          if(immunizationData.immunizationFiles) {
              immunizationData.immunizationFiles.forEach(async file => {
                  file.encounterUuid = subEncounter.identifier[0].value;
                  file.patientId = immunizationData.patientId;
                  let docReferenceBundle = await createDocumentReference(file)
                  resourceResult.push(docReferenceBundle)
              });
          }
      }
      return resourceResult;
    } catch (e) {
      return Promise.reject(e);
    }
  };

  const getImmunizationDetails = async function(FHIRData, reqQuery, token) {
    try {
      let resourceResult = []
        console.log("FHIR data received: ", FHIRData)
        if(FHIRData.length == 0) {
          return resourceResult
        }
        // get encounters list
        const encounterIds = FHIRData.map(e => e.resource.encounter.reference.split("/")[1]).join(",")
        // fetch Document references for the immunization
        let docReferenceResources = await bundleOp.searchData(config.baseUrl + "DocumentReference",{
          "encounter": encounterIds, "encounter.type": "384810002",  "_count": 5000 }, token );
          if(docReferenceResources.data.entry.length > 0){
            docReferenceResources = docReferenceResources.data.entry.map(e => e.resource)
          }
          else {
            docReferenceResources = [];
          }
          console.log("docReferenceResources: ", docReferenceResources)
        // create response data
        FHIRData.forEach(vaccine => {
          let immunizationObj = new Immunization({}, vaccine.resource).getImmunizationObj();
          //  get doc if present
          let immunizationFiles = []
          immunizationFiles = docReferenceResources.filter(e => e.context.encounter[0].reference == vaccine.resource.encounter.reference).map(e => {
            return {filename: e.content[0].attachment.title}})
          immunizationObj.immunizationFiles = immunizationFiles
          // console.log("immunizationObj: ", immunizationObj)
          resourceResult.push(immunizationObj)
        })
        return resourceResult;

  }
  catch(e) {
    console.error(e);
    return Promise.reject(e);
  }
}

async function getImmunizationRecommendation(reqInput, token) {
    try {
            const patientIds = reqInput.map(e => e.patientId).join(",");
            const vaccineCodes = reqInput.map(e => e.vaccineCode).join(",");
            const immunizationRecommendations = await bundleOp.searchData(config.baseUrl + "ImmunizationRecommendation",{
                "vaccine-type": vaccineCodes,  "patient": patientIds,  "_count": 5000 },
              token );
              if (immunizationRecommendations.data.entry.length == 0) {
                return [];
              }
              const immunizationRecommendationResources = immunizationRecommendations.data.entry.map((e) => e.resource);
              return immunizationRecommendationResources;
            
    }
    catch(e) {
        console.error(e);
        return Promise.reject(e)
    }
}

async function getMainEncounter(reqInput, token) {
    try {
        console.log(reqInput)
        const appointmentIds = reqInput.map((e) => e.appointmentId).join(",");
        // fetch main encounter using appointment id
        const getMainEncounters = await bundleOp.searchData(config.baseUrl + "Encounter",{
            appointment: appointmentIds, _count: 5000, _include: "Encounter:appointment",},
          token );
        if (getMainEncounters.data.entry.length == 0) {
          return [];
        }
        const mainEncounters = getMainEncounters.data.entry.map((e) => e.resource);
        return mainEncounters;
    }
    catch(e) {
       console.error(e) 
       return Promise.reject(e);
    }
}

function createSubEncounter(parameters) {
  try {
    const { token, mainEncounter, immunizationData } = parameters;
    const patientId = immunizationData.patientId;
    const encounterId = uuidv4();
    let subEncounter = new Encounter({
        id: encounterId,
        appointmentEncounterId: mainEncounter.id,
        patientId: patientId,
        uuid: encounterId,
        practitionerId: token.userId,
        createdOn: immunizationData.createdOn,
        orgId: token.orgId,
      },{}
    ).getUserInputToFhir();
    subEncounter.type = [
      {
        coding: [
          {
            system: "http://snomed.info/sct",
            code: "384810002",
            display: "Immunization management",
          },
        ],
      },
    ];

    return subEncounter;
  } catch (e) {
    console.error(e);
    return Promise.reject(e);
  }
}


async function createImmunizationResource(inputData) {
    try {
        inputData.identifier = [
            {
                "system" : "http://hl7.org/fhir/sid/sn",
                value: inputData.immunizationUuid
            }
        ]
        let immunizationResource = new Immunization(inputData, {}).getFhirResource();
        let immunizationBundle = await bundleOp.setBundlePost(immunizationResource,null, inputData.immunizationUuid, "POST", "identifier");
        console.log("immunization:", immunizationBundle)
        return immunizationBundle;

    }
    catch(e) {
        console.error(e)
        return Promise.reject(e)
    }
}

async function addImmunizationReference(immunizationRecommendations, immunizationData) {
    let recommendationResource = immunizationRecommendations.filter(e => 
        e.recommendation[0].vaccineCode[0].coding[0].code == immunizationData.vaccineCode &&
        e.patient.reference.split("/")[1] == immunizationData.patientId
    )
    recommendationResource = recommendationResource[0]
    for(let i=0; i<recommendationResource.recommendation.length; i++) {
        if(!recommendationResource.recommendation[i].supportingImmunization) {
            console.log("entered loop if condition")
            recommendationResource.recommendation[i].supportingImmunization = [
                {
                    "reference": "urn:uuid:" + immunizationData.immunizationUuid
                }
            ]
            break;
        }
    }

    let recommendationBundle = await bundleFun.setBundlePost(recommendationResource, null, recommendationResource.id, "PUT", "identifier"); 

    console.log("recommendation bundle: ", recommendationBundle)
    return recommendationBundle
}

async function createDocumentReference(file) {
    try {
        file.uuid = uuidv4();
        const documentReferenceResource = new DocumentReference(file, {}).getJSONtoFhir();
        let documentReferenceBundle = await bundleOp.setBundlePost(documentReferenceResource,null, file.uuid, "POST", "identifier");
        console.log("documentReferenceBundle: ", documentReferenceBundle)
        return documentReferenceBundle;
    }
    catch(e) {
        console.error(e)
        return Promise.reject(e)
    }
}

module.exports = { manageImmunizationDetail };
