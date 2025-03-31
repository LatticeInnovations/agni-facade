let Person = require("../class/person");
let RelatedPerson = require("../class/relatedPerson");
let axios = require("axios");
let config = require("../config/nodeConfig");
const bundleStructure = require("../services/bundleOperation")
const responseService = require("../services/responseService");


//  Save Practitioner data
let saveRelatedPersonData = async function (req, res) {
    try {
        let patientArrayById = {};
        // let response = resourceValid(req.params);
        // if (response.error) {
        //     console.error(response.error.details)
        //     let errData = { status: 0, response: { data: response.error.details }, message: "Invalid input" }
        //     return res.status(422).json(errData);
        // }
        let resourceResult = [];
        for (let inputData of req.body) {

            if (!patientArrayById.hasOwnProperty(inputData.id)) {
                patientArrayById[inputData.id] = { "personId": null, relation: [] };
            }

            let person1Link = await bundleStructure.searchData(config.baseUrl + "Person", { link: "Patient/" + inputData.id, _include: "Person:link:RelatedPerson" });
            if (person1Link.data.total != 1) {
                return res.status(500).json({ status: 0,  message: "Patient Id " + inputData.id + " does not exist." })
            }
            let resourcePost = await createNewRelation(person1Link, patientArrayById, inputData.id, inputData.relationship);
            //console.log("resourcePost", resourcePost)
            patientArrayById = resourcePost.patientArrayById;
            resourceResult = resourceResult.concat(resourcePost.resourceList);   
        
         }

         for (const key of Object.keys(patientArrayById)) {
            if (patientArrayById[key].relation.length == 0) {
                delete patientArrayById[key];
            }
            else {

                let patchData = await bundleStructure.setBundlePatch(patientArrayById[key].relation, "Person/" + patientArrayById[key].personId);
                resourceResult.push(patchData);
            }

        }
        let bundleData = await bundleStructure.getBundleJSON({resourceResult})  
        let response = await axios.post(config.baseUrl, bundleData.bundle); 
        console.info("get bundle json response: ", response.status)  
        if (response.status == 200 || response.status == 201) {
            let responseData = setRelatedPersonSaveResponse(bundleData.bundle.entry, response.data.entry, "post");  
            res.status(201).json({ status: 1, message: "Related person data saved.", data: responseData })
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
            message: e.code && e.code == "ERR" ? e.message : "Unable to process. Please try again.",
            error: e
        })
    }

}


const setRelatedPersonSaveResponse  = (reqBundleData, responseBundleData, type) => {
    let filteredData = [];
    let response = [];
    const responseData = bundleStructure.mapBundleService(reqBundleData, responseBundleData)
    console.info("responseData: ", responseData)
    filteredData = responseData.filter(e => e.resource && (e.resource.resourceType == "RelatedPerson"|| (type == "patch" && e.resource.resourceType == "Binary")))
    console.info("responseData: ", responseData,  "------------", "filteredData: ", filteredData)
    response = responseService.setDefaultResponse("RelatedPerson", "post", filteredData);
    return response;
}

let createNewRelation = async function (person1Link, patientArrayById, patientId, relationship) {
    try {
        let resourceResult = [];
        let person1PatchData = [];
        for (let element of relationship) {
            let index = person1Link.data.entry.findIndex(e =>
                e.resource.resourceType == "RelatedPerson" && e.resource.patient.reference == "Patient/" + element.relativeId);
            if (index == -1) {
                let relatedPerson1 = new RelatedPerson({ patientId: element.relativeId, relationCode: element.patientIs }, {});
                let fhirResource1 = relatedPerson1.getJsonToFhirTranslator();
                let relatedPerson1Post = await bundleStructure.setBundlePost(fhirResource1, null, fhirResource1.id, "POST", "identifier")
                if (person1Link.data.total != 1 ) {
                    let e = { status: 0, code: "ERR", message: "Patient Id " + element.relativeId + " does not exist.", statusCode: 500}
                   return Promise.reject(e);
                }                    
                let person1 = new Person({
                    operation: "add", value: {
                        "target": { "reference": "urn:uuid:" + relatedPerson1Post.resource.id },
                        "assurance": "level3"
                    }
                }, []);
                person1.patchLink();
                person1PatchData = [...person1.getFHIRResource()];
                patientArrayById[patientId].personId = person1Link.data.entry[0].resource.id;
                patientArrayById[patientId].relation = patientArrayById[patientId].relation.concat(person1PatchData)
                resourceResult.push(relatedPerson1Post);
            }
        }


        return { resourceList: resourceResult, patientArrayById };
    }
    catch (e) {
        return Promise.reject(e);
    }
}



//  Get Practitioner data
let getRelatedPersonData = async function (req, res) {
    try {
        let specialOffset = null;
        let queryParams = req.query;
        const link = config.baseUrl + `Person`;
        queryParams["_include"] = "Person:link:RelatedPerson";
        queryParams["patient._id"] = req.query.patientId;
        queryParams["_total"] = "accurate";
        queryParams["_count"] = 1000;
        delete queryParams.patientId;
        let resourceResult = []

        let outputArray = [];
        let resourceUrlData = { link: link, reqQuery: queryParams, allowNesting: 1, specialOffset: specialOffset }
        let responseData = await bundleStructure.searchData(link, queryParams);
        const FHIRData = responseData.data.entry;
        let resStatus = 1;
        if( !FHIRData || responseData.data.total == 0) {
                return res.status(200).json({ status: resStatus, message: "Data fetched", total: 0, data: []  })
        }
        resStatus = bundleStructure.setResponse(resourceUrlData, responseData)
        let personResource = FHIRData.filter(e => e.resource.resourceType == "Person");
        for (let i = 0; i < personResource.length; i++) {
            let linkList = personResource[i].resource.link;
            let patientIdIndex = linkList.findIndex(e => e.target.reference.includes("Patient"));
            let patientId = linkList[patientIdIndex].target.reference.split('Patient/')[1];
            let patientRelation = {
                    "id": patientId,
                    "relationship": []
            }
            for (let j = 0; j < linkList.length; j++) {
                if (linkList[j].target.reference.includes("RelatedPerson")) {                       
                    let id = linkList[j].target.reference.split('RelatedPerson/')[1];
                    let relatedPersonIndex = FHIRData.findIndex(e => e.resource.resourceType == "RelatedPerson" && id == e.resource.id);
                    let patientId = FHIRData[relatedPersonIndex].resource.patient.reference.split("/")
                    patientRelation.relationship.push({
                            "relativeId": patientId[1],
                            "patientIs": FHIRData[relatedPersonIndex].resource.relationship[0].coding[0].code
                    })
                       
                }
            }              
            if(patientRelation.relationship.length > 0)
                outputArray.push(patientRelation)
            resourceResult = outputArray;
        }
        
        res.status(200).json({ status: resStatus, message: "Data fetched.", total: resourceResult.length,"offset": +queryParams?._offset, data: resourceResult  })
        
    }
    catch(e) {
        console.error("Error",e)
        return res.status(200).json({
                status: 0,
                message: "Unable to process. Please try again"
            })
       
    }
}


//  Patch Practitioner data
let patchRelatedPersonData = async function (req, res) {
    try {
        let patientArrayById = {};
        // let response = resourceValid(req.params);
        // if (response.error) {
        //     console.error(response.error.details)
        //     let errData = { status: 0, response: { data: response.error.details }, message: "Invalid input" }
        //     return res.status(422).json(errData);
        // }
        let resourceResult = [];
        let deleteList = [];
        for (let inputData of req.body) {
            if (!patientArrayById.hasOwnProperty(inputData.id)) {
                patientArrayById[inputData.id] = { "personId": null, relation: [] };
            }
            let replaceList = inputData.relationship.filter(e => e.operation == "replace");
            let removeList = inputData.relationship.filter(e => e.operation == "remove");
            let addList = inputData.relationship.filter(e => e.operation == "add").map(e => { return e.value });
            // patient's person and related person data                  
            let person1Link = await bundleStructure.searchData(config.baseUrl + "Person", { link: "Patient/" + inputData.id, _include: "Person:link:RelatedPerson" });
            if (person1Link.data.total != 1) {
                let e = { status: 0, code: "ERR", message: "Patient Id " + inputData.id + " does not exist.", statusCode: 500 }
                return Promise.reject(e)
            }
            let person1Data = person1Link.data.entry[0].resource;
            let relatedPersonList = person1Link.data.entry.filter(e => e.resource.resourceType == "RelatedPerson");
            let replacePatchList = await replaceRelation(inputData.id, replaceList);
            resourceResult = resourceResult.concat(replacePatchList);
            let removePatchJSON = await removeRelation(inputData.id, removeList, relatedPersonList, person1Data, patientArrayById);
            patientArrayById = removePatchJSON.patientArrayById
            let addData = await createNewRelation(person1Link, patientArrayById, inputData.id, addList);
            resourceResult = resourceResult.concat(addData.resourceList);
            patientArrayById = removePatchJSON.patientArrayById;
            if (removePatchJSON.deleteBundleList.length > 0) {
                deleteList = deleteList.concat(removePatchJSON.deleteBundleList);
            }
        }

        for (const key of Object.keys(patientArrayById)) {
            if (patientArrayById[key].relation.length > 0) {
                let patchData = await bundleStructure.setBundlePatch(patientArrayById[key].relation, "Person/" + patientArrayById[key].personId);
                resourceResult.push(patchData);
            }
        }

        resourceResult = resourceResult.concat(deleteList)
        let bundleData = await bundleStructure.getBundleJSON({resourceResult})  
        let response = await axios.post(config.baseUrl, bundleData.bundle);   
        if (response.status == 200 || response.status == 201) {
            let responseData = setRelatedPersonSaveResponse(bundleData.bundle.entry, response.data.entry, "patch"); 
            res.status(201).json({ status: 1, message: "Data saved.", data: responseData })
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


let removeRelation = async function (patientId, removeList, relatedPersonList, person1Data, patientArrayById) {
    try {
        let person1PatchData = [];
        let deleteBundleList = []
        let deleteRelatedPersonID1, person1;
        for (let relation of removeList) {
            let relaterdPerson1Id = relatedPersonList.filter(e => e.resource.patient.reference == "Patient/" + relation.value.relativeId)[0];
            if(relaterdPerson1Id == undefined) {
                let e = { status: 0, code: "ERR", message: `Relation of ${patientId} with ${relation.value.relativeId} does not exist.`, statusCode: 500 }
                return Promise.reject(e);
            }
            deleteRelatedPersonID1 = await bundleStructure.setBundleDelete("RelatedPerson", relaterdPerson1Id.resource.id);
            let person1LinkIndex = person1Data.link.findIndex(e => e.target.reference == "RelatedPerson/" + relaterdPerson1Id.resource.id);
            person1 = new Person(relation, []);
            person1.patchLink(person1LinkIndex);
            person1PatchData = [...person1.getFHIRResource()];
            patientArrayById[patientId].personId = person1Data.id;
            patientArrayById[patientId].relation = patientArrayById[patientId].relation.concat(person1PatchData);
            deleteBundleList.push(deleteRelatedPersonID1)
        }
        return { patientArrayById, deleteBundleList }
    }
    catch (e) {
        return Promise.reject(e);
    }

}

let replaceRelation = async function (patientId, replaceList) {
    try {
        let relationBundle = []
        for (let relation of replaceList) {
            // person data for patching further of the relative
            let patchPatienttoRelativeURL = `RelatedPerson?patient=Patient/${relation.value.relativeId}&_has:Person:link:patient=${patientId}`;
            let relationPatient = new RelatedPerson({ operation: "replace", value: relation.value.patientIs }, []);
            let relation1Patch = relationPatient.patchRelationship();
            let patchPatientRelation = await bundleStructure.setBundlePatch(relation1Patch, patchPatienttoRelativeURL);
            relationBundle.push(patchPatientRelation);
        }
        return relationBundle;
    }
    catch (e) {
        return Promise.reject(e);
    }
}


module.exports = {
    saveRelatedPersonData,
    getRelatedPersonData,
    patchRelatedPersonData
}