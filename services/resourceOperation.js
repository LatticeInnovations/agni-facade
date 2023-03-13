let Person = require("./person");
let axios = require("axios");
let config = require("../config/config");
const { v4: uuidv4 } = require('uuid');
let getResource = async function (resType, inputData, FHIRData, reqMethod, fetchedResourceData, isBundle) {
    let resource_data = {};
    let resource_result = [];
    switch (resType) {
        case "Patient":
            let patient = new Person(inputData, FHIRData);
            if (["post", "POST"].includes(reqMethod)) {
                patient.getJsonToFhirTranslator();
                resource_data = patient.getFHIRResource();
                resource_data.resourceType = resType;
                let personInput = { patientId: inputData.id };
                let person1 = new Person(personInput, {});
                person1.setLink(inputData.id);
                let personResource = person1.getFHIRResource();
                personResource.identifier = resource_data.identifier;
                personResource.resourceType = "Person";
                personResource.id = uuidv4();
                let patientBundle = await setBundlePost(resource_data, inputData.identifier, inputData.id, "PUT");
                let personBundle = await setBundlePost(personResource, inputData.identifier, personResource.id, "PUT");
                resource_result.push(patientBundle, personBundle);
            }
            else if (["patch", "PATCH"].includes(reqMethod)) {
                patient.patchUserInputToFHIR(fetchedResourceData);
                resource_result = patient.getFHIRResource();
            }
            else {
                patient.getFHIRToUserInput();
                resource_result.push(patient.getPersonResource())
            }
            break;
        case "RelatedPerson":
            if (["post", "POST", "put", "PUT"].includes(reqMethod)) {
                resourceData = [];
                inputData
                inputData.relationship.forEach(element => {
                    let relatedPerson1 = new RelatedPerson({ patientId: element.relativeId, relationCode: patientRelationCode });
                    let fhirResource1 = relatedPerson1.getJsonToFhirTranslator();
                    let relatedPerson2 = new RelatedPerson({ patientId: inputData.id, relationCode: relativeRelationCode });
                    let fhirResource2 = relatedPerson2.getJsonToFhirTranslator();
                    resource_data.resourceType = resType;
                    //let person1Link = searchData(link, {link: "Patient/" + inputData.id})
                });
            }

    }

    return resource_result;
}

let getBundleResponse = async function (bundleResponse, reqData, reqMethod, resType) {
    let response = [], filtereredData = [];
    let mergedArray = bundleResponse.map((data, i) => Object.assign({}, data, reqData[i]));
    if (["post", "POST", "put", "PUT"].includes(reqMethod))
        filtereredData = mergedArray.filter(e => e.resource.resourceType == resType);
    else
        filtereredData = mergedArray;
        console.log(mergedArray)
    filtereredData.forEach(element => {
        console.log(element.resource.resourceType, resType)
        let fullUrl = element.fullUrl.substring(element.fullUrl.indexOf("/") + 1, element.fullUrl.length)
        response.push({
            status: element.response.status,
            fhirId: element.response.status == "200 OK" || element.response.status == "201 Created" ? element.response.location.substring(element.response.location.indexOf("/") + 1, element.response.location.indexOf("/_history")) : (reqMethod == "PATCH" ? fullUrl : null),
            id: ["patch", "PATCH"].includes(reqMethod) ? null : fullUrl,
            err: element.response.status == "200 OK" || element.response.status == "201 Created" ? null : element.response.outcome
        })
    });

    return response;
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

let setBundlePatch = async function (resource_data, resource_type, id) {
    console.log(resource_data)
    let objJsonStr = JSON.stringify(resource_data)
    let objJsonB64 = Buffer.from(objJsonStr).toString("base64");
    let bundlePatchStructure = {
        "fullUrl": resource_type + "/" + id,
        "resource": {
            "resourceType": "Binary",
            "contentType": "application/json-patch+json",
            "data": objJsonB64
        },
        "request": {
            "method": "PATCH",
            "url": resource_type + "/" + id
        }
    }

    return bundlePatchStructure;

}

let setBundlePost = async function (resourceData, identifier, id, reqMethod) {
    let identifierConcat = "?";
    identifier.forEach(element => {
        identifierConcat += "identifier="+ element.identifierType + "|" + element.identifierNumber + "&"
    })
    identifierConcat = identifierConcat.slice(0, -1);
    let bundlePostStructure = {
        "fullUrl": "urn:uuid:"+id,
        "resource": resourceData,
        "request": {
            "method": "POST",
            "url": resourceData.resourceType,
            "ifNoneExist": identifier ? resourceData.resourceType + identifierConcat: null
        }
    }

    console.log("==========================================> ", bundlePostStructure)
    return bundlePostStructure;
}
module.exports = { getResource, getBundleResponse, searchData, setBundlePatch }