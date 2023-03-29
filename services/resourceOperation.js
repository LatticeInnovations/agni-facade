let patient = require("./managePatientOperation");
let relatedPerson = require("./manageRelatedPersonOperation");

let getResource = async function (resType, inputData, FHIRData, reqMethod, fetchedResourceData) {
    try {
        let bundleData = [];
        switch (resType) {
            case "Patient":
                bundleData = await patient.setPatientData(resType, inputData, FHIRData, reqMethod);
                break;
            case "RelatedPerson":
                bundleData = await relatedPerson.setRelatedPersonData(inputData, FHIRData, reqMethod, fetchedResourceData)
                break;

        }

        return bundleData;
    }
    catch (e) {
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
        e = { status: 0, code: "ERR", e: e }
        return Promise.reject(e);
    }
}




module.exports = { getResource, getBundleResponse }