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
                resourcePost = await createNewRelation(person1Link, patientArrayById, inputData.id, inputData.relationship);
                patientArrayById = resourcePost.patientArrayById;
                resourceData = resourceData.concat(resourcePost.resourceList);
            }

            for (const key of Object.keys(patientArrayById)) {
                let patchData = await bundleOp.setBundlePatch(patientArrayById[key].relation, "Person/" + patientArrayById[key].personId);
                resourceData.push(patchData);
            }
            return resourceData;

        }
        else if (["GET", "get"].includes(reqMethod)) {
            let personResource = FHIRData.filter(e => e.resource.resourceType == "Person")[0].resource;
            let relatedPersonLink = personResource.link.filter(e => e.target.reference.includes("RelatedPerson"));
            let patientRelation = {
                "patientId": FHIRData[0].resource.id,
                "relationship": relatedPersonLink ? [] : null
            }
            for (let i = 0; i < relatedPersonLink.length; i++) {
                let relativeResource = FHIRData.filter(e => e.resource.id == relatedPersonLink[i].target.reference.substring(relatedPersonLink[i].target.reference.indexOf('/') + 1));
                let relatedPerson1 = new RelatedPerson({}, relativeResource[0].resource);
                relationData = relatedPerson1.getFHIRtoJsonTranslator();
                patientRelation.relationship.push({
                    "relativeId": relationData.patientId,
                    "patientIs": relationData.relationCode
                });
            };
            return patientRelation;
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
                if (patientArrayById[key].relation.length > 0) {
                    let patchData = await bundleOp.setBundlePatch(patientArrayById[key].relation, "Person/" + patientArrayById[key].personId);
                    resourceData.push(patchData);
                }
            }
            resourceData = resourceData.concat(deleteList)

            return resourceData;
        }

    }
    catch (e) {
        e = { status: 0, code: "ERR", e: e }
        return Promise.reject(e);
    }
}

let createNewRelation = async function (person1Link, patientArrayById, patientId, relationship) {
    try {
        resourceData = [];
        person1PatchData = [];
        allowPost = 0;
        for (let element of relationship) {
            if (!patientArrayById.hasOwnProperty(element.relativeId))
                patientArrayById[element.relativeId] = { "personId": null, relation: [] };
            let index = person1Link.data.entry.findIndex(e =>
                e.resource.resourceType == "RelatedPerson" && e.resource.patient.reference == "Patient/" + element.relativeId);
            if (index == -1) {
                let relatedPerson1 = new RelatedPerson({ patientId: element.relativeId, relationCode: element.patientIs }, {});
                let fhirResource1 = relatedPerson1.getJsonToFhirTranslator();
                let relatedPerson2 = new RelatedPerson({ patientId: patientId, relationCode: element.relativeIs }, {});
                let fhirResource2 = relatedPerson2.getJsonToFhirTranslator();
                let relatedPerson1Post = await bundleOp.setBundlePost(fhirResource1, null, fhirResource1.id, "POST")
                let relatedPerson2Post = await bundleOp.setBundlePost(fhirResource2, null, fhirResource2.id, "POST")
                let person2Link = await bundleOp.searchData(config.baseUrl + "Person", { link: "Patient/" + element.relativeId });
                if (person1Link.data.total != 1 || person2Link.data.total != 1)
                    Promise.reject({ status: 0, ERR: "Data does not exist" });
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
                let person2 = new Person({
                    operation: "add", value: {
                        "target": { "reference": "urn:uuid:" + relatedPerson2Post.resource.id },
                        "assurance": "level3"
                    }
                }, []);
                person2.patchLink();
                patientArrayById[element.relativeId].personId = person2Link.data.entry[0].resource.id;
                patientArrayById[element.relativeId].relation = patientArrayById[element.relativeId].relation.concat(person2.getFHIRResource());
                resourceData.push(relatedPerson1Post, relatedPerson2Post);
            }
        }


        return { resourceList: resourceData, patientArrayById };
    }
    catch (e) {
        e = { status: 0, code: "ERR", e: e }
        return Promise.reject(e);
    }
}

let removeRelation = async function (patientId, removeList, relatedPersonList, person1Data, patientArrayById) {
    try {
        let person1PatchData = [];
        bundlePatch = [];
        let deleteBundleList = []
        let deleteRelatedPersonID1, deleteRelatedPersonID2, patchPerson2Bundle, person1;
        for (let relation of removeList) {
            console.log("relation", relation)
            if (!patientArrayById.hasOwnProperty(relation.relativeId)) {
                patientArrayById[relation.value.relativeId] = { "personId": null, relation: [] };
            }
            // person data for patching further of the relative
            let relativePersonData = await bundleOp.searchData(config.baseUrl + "Person", { link: "Patient/" + relation.value.relativeId, _include: "Person:link:RelatedPerson" });
            let relaterdPerson1Id = relatedPersonList.filter(e => e.resource.patient.reference == "Patient/" + relation.value.relativeId)[0];
            deleteRelatedPersonID1 = await bundleOp.setBundleDelete("RelatedPerson", relaterdPerson1Id.resource.id);
            let relatedPerson2Id = relativePersonData.data.entry.filter(e => e.resource.resourceType == "RelatedPerson" && e.resource.patient.reference == "Patient/" + patientId);
            relatedPerson2Id = relatedPerson2Id[0];
            deleteRelatedPersonID2 = await bundleOp.setBundleDelete("RelatedPerson", relatedPerson2Id.resource.id);
            let person2LinkIndex = relativePersonData.data.entry[0].resource.link.findIndex(e => e.target.reference == "RelatedPerson/" + relatedPerson2Id.resource.id);
            let person2 = new Person(relation, []);
            person2.patchLink(person2LinkIndex);
            let person2Data = [...person2.getFHIRResource()];
            patientArrayById[relation.value.relativeId].personId = relativePersonData.data.entry[0].resource.id;
            patientArrayById[relation.value.relativeId].relation = patientArrayById[relation.value.relativeId].relation.concat(person2Data);
            let person1LinkIndex = person1Data.link.findIndex(e => e.target.reference == "RelatedPerson/" + relaterdPerson1Id.resource.id);
            person1 = new Person(relation, []);
            person1.patchLink(person1LinkIndex);
            person1PatchData = [...person1.getFHIRResource()];
            patientArrayById[patientId].personId = person1Data.id;
            patientArrayById[patientId].relation = patientArrayById[patientId].relation.concat(person1PatchData);
            deleteBundleList.push(deleteRelatedPersonID1, deleteRelatedPersonID2)
        }
        return { patientArrayById, deleteBundleList }
    }
    catch (e) {
        e = { status: 0, code: "ERR", e: e }
        return Promise.reject(e);
    }

}

let replaceRelation = async function (patientId, replaceList) {
    try {
        let relationBundle = []
        for (let relation of replaceList) {
            // person data for patching further of the relative
            let patchPatienttoRelativeURL = `RelatedPerson?patient=Patient/${relation.value.relativeId}&_has:Person:link:patient=${patientId}`;
            let patchRelativeToPatientURL = `RelatedPerson?patient=Patient/${patientId}&_has:Person:link:patient=${relation.value.relativeId}`;
            let relationPatient = new RelatedPerson({ operation: "replace", value: relation.value.patientIs }, []);
            let relation1Patch = relationPatient.patchRelationship();
            let relationRelative = new RelatedPerson({ operation: "replace", value: relation.value.relativeIs }, []);
            let relation2Patch = relationRelative.patchRelationship();
            let patchPatientRelation = await bundleOp.setBundlePatch(relation1Patch, patchPatienttoRelativeURL);
            let patchRelativeRelation = await bundleOp.setBundlePatch(relation2Patch, patchRelativeToPatientURL);
            relationBundle.push(patchPatientRelation, patchRelativeRelation);
        }
        return relationBundle;
    }
    catch (e) {
        e = { status: 0, code: "ERR", e: e }
        return Promise.reject(e);
    }
}

module.exports = { setRelatedPersonData }