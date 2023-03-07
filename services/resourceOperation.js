let Person = require("./person");
let axios = require("axios");
let config = require("../config/config")
let getResource = async function (resType, inputData, FHIRData, reqMethod, fetchedResourceData) {
    let resource_data = {};
    switch (resType) {
        case "Person":
        case "Patient":
            let person = new Person(inputData, FHIRData);
            if (["post", "POST", "put", "PUT"].includes(reqMethod)) {
                person.getJsonToFhirTranslator();
                resource_data = person.getFHIRResource();
                resource_data.resourceType = resType;
            }
            else if (["patch", "PATCH"].includes(reqMethod)) {
                person.patchUserInputToFHIR(fetchedResourceData);
                resource_data = person.getFHIRResource();
            }
            else {
                person.getFHIRToUserInput();
                resource_data = person.getPersonResource();
            }
            break;
    }
    return resource_data;
}

let getBundleResponse = async function (bundleResponse, reqData, reqMethod, resType) {
    let response = [], filtereredData = [];
    let mergedArray = bundleResponse.map((data, i) => Object.assign({}, data, reqData[i]));
    if (["post", "POST", "put", "PUT"].includes(reqMethod))
        filtereredData = mergedArray.filter(e => e.resource.resourceType == resType);
    else
        filtereredData = mergedArray;
          filtereredData.forEach(element => {
            console.log(element)
        let fullUrl = element.fullUrl.substring(element.fullUrl.indexOf("/") + 1, element.fullUrl.length) 
        response.push({
            status: element.response.status,
            fhirId: element.response.status == "200 OK" ||  element.response.status == "201 Created" ? element.response.location.substring(element.response.location.indexOf("/") + 1, element.response.location.indexOf("/_history")) : ( reqMethod == "PATCH" ? fullUrl : null),
            id: ["patch", "PATCH"].includes(reqMethod) ? null :  fullUrl,
            err: element.response.status == "200 OK" ||  element.response.status == "201 Created" ? null : element.response.outcome
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
module.exports = { getResource, getBundleResponse, searchData, setBundlePatch }