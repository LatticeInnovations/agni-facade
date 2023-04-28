let Person = require("../class/person");
let RelatedPerson = require("../class/relatedPerson");
let bundleOp = require("./bundleOperation");
let config = require("../config/config");

let setRelatedPersonData = async function (relatedPersonList, FHIRData, reqMethod, fetchedResourceData) {
    try {
        let resourceData = [];
        let patientArrayById = {};
        if (["post", "POST", "put", "PUT"].includes(reqMethod)) {

            for (let inputData of relatedPersonList) {
                if (!patientArrayById.hasOwnProperty(inputData.id)) {
                    patientArrayById[inputData.id] = { "personId": null, relation: [] };
                }

                let person1Link = await bundleOp.searchData(config.baseUrl + "Person", { link: "Patient/" + inputData.id, _include: "Person:link:RelatedPerson" });
                if (person1Link.data.total != 1) {
                    let e = { status: 0, code: "ERR", response: "Patient Id " + inputData.id + " does not exist." }
                    return Promise.reject(e)
                }
                resourcePost = await createNewRelation(person1Link, patientArrayById, inputData.id, inputData.relationship);
                console.log("resourcePost", resourcePost)
                patientArrayById = resourcePost.patientArrayById;
                resourceData = resourceData.concat(resourcePost.resourceList);
            }
            for (const key of Object.keys(patientArrayById)) {
                if (patientArrayById[key].relation.length == 0) {
                    delete patientArrayById[key];
                }
                else {

                    let patchData = await bundleOp.setBundlePatch(patientArrayById[key].relation, "Person/" + patientArrayById[key].personId);
                    resourceData.push(patchData);
                }

            }
            return resourceData;

        }
        else if (["GET", "get"].includes(reqMethod)) {
            let outputArray = [];
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
                        let relatedPersonindex = FHIRData.findIndex(e => e.resource.resourceType == "RelatedPerson" && id == e.resource.id)
                        console.log(FHIRData[relatedPersonindex].resource)
                        let patientId = FHIRData[relatedPersonindex].resource.patient.reference.split("/")
                        console.log(patientId[1])
                        patientRelation.relationship.push({
                            "relativeId": patientId[1],
                            "patientIs": FHIRData[relatedPersonindex].resource.relationship[0].coding[0].code
                        })
                    }
                }
                if(patientRelation.relationship.length > 0)
                    outputArray.push(patientRelation)
            }
            return outputArray;
        }
        else if (["patch", "PATCH"].includes(reqMethod)) {
            let deleteList = [];
            for (let inputData of relatedPersonList) {
                if (!patientArrayById.hasOwnProperty(inputData.id)) {
                    patientArrayById[inputData.id] = { "personId": null, relation: [] };
                }
                let replaceList = inputData.relationship.filter(e => e.operation == "replace");
                let removeList = inputData.relationship.filter(e => e.operation == "remove");
                let addList = inputData.relationship.filter(e => e.operation == "add").map(e => { return e.value });
                // patient's person and related person data                  
                let person1Link = await bundleOp.searchData(config.baseUrl + "Person", { link: "Patient/" + inputData.id, _include: "Person:link:RelatedPerson" });
                if (person1Link.data.total != 1) {
                    console.log(person1Link)
                    let e = { status: 0, code: "ERR", response: "Patient Id " + inputData.id + " does not exist." }
                    return Promise.reject(e)
                }
                let person1Data = person1Link.data.entry[0].resource;
                let relatedPersonList = person1Link.data.entry.filter(e => e.resource.resourceType == "RelatedPerson");
                let replacePatchList = await replaceRelation(inputData.id, replaceList);
                resourceData = resourceData.concat(replacePatchList);
                let removePatchJSON = await removeRelation(inputData.id, removeList, relatedPersonList, person1Data, patientArrayById);
                patientArrayById = removePatchJSON.patientArrayById
                let addData = await createNewRelation(person1Link, patientArrayById, inputData.id, addList);
                resourceData = resourceData.concat(addData.resourceList);
                patientArrayById = removePatchJSON.patientArrayById;
                if (removePatchJSON.deleteBundleList.length > 0) {
                    deleteList = deleteList.concat(removePatchJSON.deleteBundleList);
                }
            }
            for (const key of Object.keys(patientArrayById)) {
                console.log("check hereeeeee ============>", patientArrayById[key])
                if (patientArrayById[key].relation.length > 0) {
                    let patchData = await bundleOp.setBundlePatch(patientArrayById[key].relation, "Person/" + patientArrayById[key].personId);
                    resourceData.push(patchData);
                }
            }
            resourceData = resourceData.concat(deleteList)
            console.log("check patching of data", resourceData)
            return resourceData;
        }

    }
    catch (e) {
        return Promise.reject(e);
    }
}

let createNewRelation = async function (person1Link, patientArrayById, patientId, relationship) {
    try {
        resourceData = [];
        person1PatchData = [];
        allowPost = 0;
        for (let element of relationship) {
            let index = person1Link.data.entry.findIndex(e =>
                e.resource.resourceType == "RelatedPerson" && e.resource.patient.reference == "Patient/" + element.relativeId);
            if (index == -1) {
                let relatedPerson1 = new RelatedPerson({ patientId: element.relativeId, relationCode: element.patientIs }, {});
                let fhirResource1 = relatedPerson1.getJsonToFhirTranslator();
                let relatedPerson1Post = await bundleOp.setBundlePost(fhirResource1, null, fhirResource1.id, "POST")
                if (person1Link.data.total != 1 ) {
                    let e = { status: 0, code: "ERR", response: "Patient Id " + element.relativeId + " does not exist."}
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
                resourceData.push(relatedPerson1Post);
            }
        }


        return { resourceList: resourceData, patientArrayById };
    }
    catch (e) {
        return Promise.reject(e);
    }
}

let removeRelation = async function (patientId, removeList, relatedPersonList, person1Data, patientArrayById) {
    try {
        let person1PatchData = [];
        bundlePatch = [];
        let deleteBundleList = []
        let deleteRelatedPersonID1, person1;
        for (let relation of removeList) {
            let relaterdPerson1Id = relatedPersonList.filter(e => e.resource.patient.reference == "Patient/" + relation.value.relativeId)[0];
            // console.log(relaterdPerson1Id)
            if(relaterdPerson1Id == undefined) {
                let e = { status: 0, code: "ERR", response: `Relation of ${patientId} with ${relation.value.relativeId} does not exist.` }
                return Promise.reject(e);
            }
            deleteRelatedPersonID1 = await bundleOp.setBundleDelete("RelatedPerson", relaterdPerson1Id.resource.id);
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
            let patchPatientRelation = await bundleOp.setBundlePatch(relation1Patch, patchPatienttoRelativeURL);
            relationBundle.push(patchPatientRelation);
        }
        return relationBundle;
    }
    catch (e) {
        return Promise.reject(e);
    }
}

module.exports = { setRelatedPersonData }