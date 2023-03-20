let Person = require("./person");
let RelatedPerson = require("./relatedPerson");
let axios = require("axios");
let config = require("../config/config");
const { v4: uuidv4 } = require('uuid');

let getResource = async function (resType, inputData, FHIRData, reqMethod, fetchedResourceData) {
    try {
    let resource_result = [];
    switch (resType) {
        case "Patient":
            resource_result = await setPatientData(resType, inputData, FHIRData, reqMethod);
            break;
        case "RelatedPerson":
            resource_result = await setRelatedPersonData(inputData, FHIRData, reqMethod, fetchedResourceData)
            break;

    }

    return resource_result;
}
catch(e) {
    e = { status: 0, code: "ERR", e: e }
    return Promise.reject(e);
}
}

let getBundleResponse = async function (bundleResponse, reqData, reqMethod, resType) {
    try {
    let response = [], filtereredData = [];
    let mergedArray = bundleResponse.map((data, i) => Object.assign({}, data, reqData[i]));
    console.log(mergedArray)
    if (["post", "POST", "put", "PUT"].includes(reqMethod) && resType == "Patient")
        filtereredData = mergedArray.filter(e => e.resource.resourceType == resType);
    // else if (["post", "POST", "put", "PUT"].includes(reqMethod) && resType == "RelatedPerson")
    //     filtereredData = mergedArray.filter(e => e.resource.resourceType == "Person");
    else
        filtereredData = mergedArray;
    filtereredData.forEach(element => {
        let fullUrl = element.fullUrl.substring(element.fullUrl.indexOf("/") + 1, element.fullUrl.length)
        response.push({
            status: element.response.status,
            fhirId: element.response.status == "200 OK" || element.response.status == "201 Created" ? element.response.location.substring(element.response.location.indexOf("/") + 1, element.response.location.indexOf("/_history")) : (reqMethod == "PATCH" ? fullUrl : null),
            id: ["patch", "PATCH"].includes(reqMethod) ? null : fullUrl,
            err: element.response.status == "200 OK" || element.response.status == "201 Created" ? null : element.response.outcome
        })
    });

    return response;
} catch (e) {
    console.log(e)
    e = { status: 0, code: "ERR", e: e }
    return Promise.reject(e);
}
}

let searchData = async function (link, reqQuery) {
    try {
        let responseData = await axios.get(link, { params: reqQuery });
        return responseData;
    } catch (e) {
        console.log(e)
        e = { status: 0, code: "ERR", e: e }
        return Promise.reject(e);
    }

}

let setBundlePatch = async function (resource_data, patchUrl) {
    let objJsonStr = JSON.stringify(resource_data)
    let objJsonB64 = Buffer.from(objJsonStr).toString("base64");
    let bundlePatchStructure = {
        "fullUrl": patchUrl,
        "resource": {
            "resourceType": "Binary",
            "contentType": "application/json-patch+json",
            "data": objJsonB64
        },
        "request": {
            "method": "PATCH",
            "url": patchUrl
        }
    }
    return bundlePatchStructure;

}

let setBundlePost = async function (resourceData, identifier, id, reqMethod) {
    try {
    let identifierConcat = "";
    if (identifier || identifier != null) {
        identifierConcat = "?";
        identifier.forEach(element => {
            identifierConcat += "identifier=" + element.identifierType + "|" + element.identifierNumber + "&"
        })
        identifierConcat = identifierConcat.slice(0, -1);
    }

    let bundlePostStructure = {
        "fullUrl": reqMethod == "PUT" ? resourceData.resourceType + "/" + id : "urn:uuid:" + id,
        "resource": resourceData,
        "request": {
            "method": reqMethod,
            "url": reqMethod == "PUT" ? resourceData.resourceType + "/" + id : resourceData.resourceType,
            "ifNoneExist": reqMethod == "POST" && identifier ? resourceData.resourceType + identifierConcat : null
        }
    }
    return bundlePostStructure;
} catch (e) {
    console.log(e)
    e = { status: 0, code: "ERR", e: e }
    return Promise.reject(e);
}
}

let setBundlePut = async function (resourceData, identifier, id, reqMethod) {
    try {
    let identifierConcat = "";
    if (identifier || identifier != null) {
        identifierConcat = "?";
        identifier.forEach(element => {
            identifierConcat += "identifier=" + element.identifierType + "|" + element.identifierNumber + "&"
        })
        identifierConcat = identifierConcat.slice(0, -1);
    }

    let bundlePostStructure = {
        "fullUrl": resourceData.resourceType + "/" + id,
        "resource": resourceData,
        "request": {
            "method": "PUT",
            "url": resourceData.resourceType + "/" + id
        }
    }
    return bundlePostStructure;
} catch (e) {
    console.log(e)
    e = { status: 0, code: "ERR", e: e }
    return Promise.reject(e);
}
}

let setBundleDelete = async function (resourceType, id) {
    try {
    let bundlePostStructure = {
        "request": {
            "method": "Delete",
            "url": resourceType + "/" + id
        }
    }
    return bundlePostStructure;
} catch (e) {
    console.log(e)
    e = { status: 0, code: "ERR", e: e }
    return Promise.reject(e);
}
}

let setPatientData = async function (resType, inputData, FHIRData, reqMethod) {
    try {
        let resource_result = [];
        let resource_data = {};
        let patient = new Person(inputData, FHIRData);
        if (["post", "POST"].includes(reqMethod)) {
            patient.getJsonToFhirTranslator();
            resource_data = patient.getFHIRResource();
            resource_data.resourceType = resType;
            let personInput = { patientId: inputData.id };
            let person1 = new Person(personInput, {});
            person1.setBasicStructure();
            person1.setLink(inputData.id);
            let personResource = person1.getFHIRResource();
            personResource.identifier = resource_data.identifier;
            personResource.resourceType = "Person";
            personResource.id = uuidv4();
            let patientBundle = await setBundlePost(resource_data, inputData.identifier, inputData.id, "POST");
            let personBundle = await setBundlePost(personResource, inputData.identifier, personResource.id, "POST");
            resource_result.push(patientBundle, personBundle);
        }
        else if (["patch", "PATCH"].includes(reqMethod)) {
            let link = config.baseUrl + resType;
            let resourceSavedData = await searchData(link, { "_id": inputData.id });
            patient.patchUserInputToFHIR(resourceSavedData);
            let resourceData = patient.getFHIRResource();
            const patchUrl = resType+"/"+inputData.id;
            resource_result = await setBundlePatch(resourceData, patchUrl);
        }
        else {
            patient.getFHIRToUserInput();
            resource_result.push(patient.getPersonResource())
        }
        return resource_result;
    }
    catch(e) {
        console.log(e)
        e = { status: 0, code: "ERR", e: e }
        return Promise.reject(e);
    }

}

let setRelatedPersonData = async function (inputData, FHIRData, reqMethod, fetchedResourceData) {
    try {
    let resourceData = [];
    if (["post", "POST", "put", "PUT"].includes(reqMethod)) {
        let person1Link = await searchData(config.baseUrl + "Person", { link: "Patient/" + inputData.id ,_include: "Person:link:RelatedPerson" });
        let person1Data = person1Link.data.entry[0].resource;
        let allowPost = 0;
        let retrievedData;
        for (let i = 0; i < inputData.relationship.length; i++) {   
            let element = inputData.relationship[i];
             retrievedData = await createNewRelation(element, person1Link, person1Data, inputData)
            resourceData = resourceData.concat(retrievedData.resourceData);
            allowPost = retrievedData.allowPost;
        }
        if(allowPost) {
            let person1Post = await setBundlePut(person1Data, null, person1Data.id, "PUT");
            resourceData.push(person1Post);
            resource_result = resourceData;
        }
        return resourceData;

    }
    else if(["GET", "get"].includes(reqMethod)) {
        let personResource = FHIRData.filter(e => e.resource.resourceType == "Person")[0].resource;
        let relatedPersonLink = personResource.link.filter(e => e.target.reference.includes("RelatedPerson"));
        let patientRelation = {
            "patientId": FHIRData[0].resource.id,
            "relationship": relatedPersonLink ? [] : null
        }
        for(let i=0; i<relatedPersonLink.length; i++) {
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
    else if(["patch", "PATCH"].includes(reqMethod)) {
        let replaceList = inputData.relationship.filter(e => e.operation == "replace");  
        let removeList = inputData.relationship.filter(e => e.operation == "remove");
        let addList = inputData.relationship.filter(e => e.operation == "add");
        // patient's person and related person data                  
        let person1Link = await searchData(config.baseUrl + "Person", { link: "Patient/" + inputData.id ,_include: "Person:link:RelatedPerson" });
        let person1Data = person1Link.data.entry[0].resource;
        let relatedPersonList = person1Link.data.entry.filter(e => e.resource.resourceType == "RelatedPerson");
        let replacePatchList = await replaceRelation(inputData.id,replaceList);
        resourceData = resourceData.concat(replacePatchList);
        let removePatchJSON = await removeRelation(inputData.id, removeList, relatedPersonList, person1Data);
         const url1 = "Person/"+ person1Data.id
        let patchPerson1Bundle = await setBundlePatch(removePatchJSON.person1Patch, url1);
        removePatchJSON.person1Patch = patchPerson1Bundle;
        resourceData = resourceData.concat(removePatchJSON.bundleRemovePatch, removePatchJSON.person1Patch);
        return resourceData;
    }

}
catch(e) {
    console.log(e)
    e = { status: 0, code: "ERR", e: e }
    return Promise.reject(e);
}
}

let createNewRelation = async function(element, person1Link, person1Data, inputData) {
    try {
    resourceData = [];
    allowPost = 0;
    let index = person1Link.data.entry.findIndex(e => 
        e.resource.resourceType == "RelatedPerson" && e.resource.patient.reference == "Patient/" + element.relativeId);
    if(index == -1) {
        let relatedPerson1 = new RelatedPerson({ patientId: element.relativeId, relationCode: element.patientIs }, {});
        let fhirResource1 = relatedPerson1.getJsonToFhirTranslator();
        let relatedPerson2 = new RelatedPerson({ patientId: inputData.id, relationCode: element.relativeIs }, {});
        let fhirResource2 = relatedPerson2.getJsonToFhirTranslator();
        let relatedPerson1Post = await setBundlePost(fhirResource1, null, fhirResource1.id, "POST")
        let relatedPerson2Post = await setBundlePost(fhirResource2, null, fhirResource2.id, "POST")
        let person2Link = await searchData(config.baseUrl + "Person", { link: "Patient/" + element.relativeId });
        if (person1Link.data.total != 1 || person2Link.data.total != 1)
            Promise.reject({ status: 0, ERR: "Data does not exist" });
        let person2Data = person2Link.data.entry[0].resource;
        person1Data.link.push({
            "target": { "reference": "urn:uuid:" + relatedPerson1Post.resource.id },
            "assurance": "level3"
        });
        person2Data.link.push({
            "target": { "reference": "urn:uuid:" + relatedPerson2Post.resource.id },
            "assurance": "level3"
        });
        let person2Post = await setBundlePut(person2Data, null, person2Data.id, "PUT");
        resourceData.push(relatedPerson1Post, relatedPerson2Post, person2Post);
        allowPost = 1;
    }

    return {resourceData: resourceData, allowPost: allowPost};
}
catch(e) {
    console.log(e)
    e = { status: 0, code: "ERR", e: e }
    return Promise.reject(e);
}
}

let removeRelation= async function(patientId, removeList, relatedPersonList, person1Data) {
    try {
        let person1Patch = [];
        bundlePatch = [];
        let deleteRelatedPersonID1, deleteRelatedPersonID2, patchPerson2Bundle, person1;
        for(let relation of removeList) {
            // person data for patching further of the relative
            let relativePersonData = await searchData(config.baseUrl + "Person", { link: "Patient/" + relation.value.relativeId ,_include: "Person:link:RelatedPerson"});
            let relaterdPerson1Id = relatedPersonList.filter(e => e.resource.patient.reference == "Patient/" + relation.value.relativeId)[0];
            deleteRelatedPersonID1 = await setBundleDelete("RelatedPerson", relaterdPerson1Id.resource.id);
            let relatedPerson2Id = relativePersonData.data.entry.filter(e => e.resource.resourceType == "RelatedPerson" && e.resource.patient.reference == "Patient/" + patientId)[0];
            deleteRelatedPersonID2 = await setBundleDelete("RelatedPerson", relatedPerson2Id.resource.id);
            let person2LinkIndex = relativePersonData.data.entry[0].resource.link.findIndex(e => e.target.reference == "RelatedPerson/" + relatedPerson2Id.resource.id);
            let person2 = new Person(relation, []);
            person2.patchLink(person2LinkIndex)
            let person2Data = person2.getFHIRResource();
            let url1 = "Person/"+ relativePersonData.data.entry[0].resource.id
            patchPerson2Bundle = await setBundlePatch(person2Data, url1);
            let person1LinkIndex = person1Data.link.findIndex(e => e.target.reference == "RelatedPerson/" + relaterdPerson1Id.resource.id);
            person1 = new Person(relation, []);
            person1.patchLink(person1LinkIndex);
            person1Patch = person1Patch.concat(person1.getFHIRResource());
            bundlePatch.push(deleteRelatedPersonID1, deleteRelatedPersonID2, patchPerson2Bundle);
        }
        return {bundleRemovePatch: bundlePatch, person1Patch}
    }
    catch(e) {
        console.log(e)
        e = { status: 0, code: "ERR", e: e }
        return Promise.reject(e);  
    }

}

let replaceRelation = async function(patientId, replaceList) {
    try {
        let relationBundle = []
        for(let relation of replaceList) {
            // person data for patching further of the relative
            let patchPatienttoRelativeURL = `RelatedPerson?patient=Patient/${relation.value.relativeId}&_has:Person:link:patient=${patientId}`;
            let patchRelativeToPatientURL = `RelatedPerson?patient=Patient/${patientId}&_has:Person:link:patient=${relation.value.relativeId}`;
            let relationPatient = new RelatedPerson({operation: "patch", value: relation.value.patientIs});
            let relationRelative = new RelatedPerson({operation: "patch", value: relation.value.RelativeIs});
            let patchPatientRelation = await setBundlePatch(relationPatient, patchPatienttoRelativeURL);
            let patchRelativeRelation = await setBundlePatch(relationRelative, patchRelativeToPatientURL);
            relationBundle.push(patchPatientRelation, patchRelativeRelation);
        }        
        return relationBundle;
    }
    catch(e) {
        console.log(e)
        e = { status: 0, code: "ERR", e: e }
        return Promise.reject(e);  
    } 
}




module.exports = { getResource, getBundleResponse, searchData, setBundlePatch }