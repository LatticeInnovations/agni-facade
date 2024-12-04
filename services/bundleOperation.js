
let axios = require("axios");
let config = require("../config/nodeConfig");
const schemaList = config.schemaList;
const domainsList = config.domainsList;
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

let setBundlePost = async function (resourceData, identifier, id, reqMethod, identifierType) {
    try {
    let identifierConcat = "";
        if(identifier || identifier != null) {
            identifierConcat = "";
            identifier.forEach(element => {    
                if(identifierType != "object")       
                    identifierConcat += identifierType+"=" + element.system + "|" + element.value + "&"
                else
                    identifierConcat += element.key+"="+element.value + "&"
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
    let  eData = { status: 0, code: "ERR", e: e, statusCode: 500 }
    return Promise.reject(eData);
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
    e = { status: 0, code: "ERR", e: e, statusCode: 500 }
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
    let  eData = { status: 0, code: "ERR", e: e, statusCode: 500 }
    return Promise.reject(eData);
}
}

let searchData = async function (link, reqQuery) {
    const url = (new URL(link));
    if (schemaList.includes(url.protocol) && domainsList.includes(url.hostname)) {
        try {
            let responseData = await axios.get(url, { params: reqQuery });
            return responseData;
        } catch (e) {
            let eData = { status: 0, code: "ERR", e: e, statusCode: 500 }
            return Promise.reject(eData);
        }
    }
    else {
        let error = { status: 0, code: "ERR", e: "INVALID_URL", statusCode: 500 }
        return Promise.reject(error)
    }


}

module.exports = {setBundlePatch, setBundlePost, setBundleDelete, searchData, setBundlePut};