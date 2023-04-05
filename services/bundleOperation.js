
let axios = require("axios");

let setBundlePatch = async function (resource_data, patchUrl) {
    let objJsonStr = JSON.stringify(resource_data);
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
        identifierConcat = "";
        identifier.forEach(element => {
           
            identifierConcat += "identifier=" + element.system + "|" + element.value + "&"
        })
        identifierConcat = identifierConcat.slice(0, -1);
    }
    let bundlePostStructure = {
        "fullUrl": reqMethod == "PUT" ? resourceData.resourceType + "/" + id : "urn:uuid:" + id,
        "resource": resourceData,
        "request": {
            "method": reqMethod,
            "url": reqMethod == "PUT" ? resourceData.resourceType + "/" + id : resourceData.resourceType,
            "ifNoneExist": reqMethod == "POST" && identifier ? identifierConcat : null
        }
    }
    return bundlePostStructure;
} catch (e) {
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
    e = { status: 0, code: "ERR", e: e }
    return Promise.reject(e);
}
}

let setBundleDelete = async function (resourceType, id) {
    try {
    let bundlePostStructure = {
        "request": {
            "method": "DELETE",
            "url": resourceType + "/" + id
        }
    }
    return bundlePostStructure;
} catch (e) {
    e = { status: 0, code: "ERR", e: e }
    return Promise.reject(e);
}
}

let searchData = async function (link, reqQuery) {
    try {
        
        let responseData = await axios.get(link, { params: reqQuery });
        return responseData;
    } catch (e) {
        e = { status: 0, code: "ERR", e: e }
        return Promise.reject(e);
    }

}

module.exports = {setBundlePatch, setBundlePost, setBundleDelete, searchData};