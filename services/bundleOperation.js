
let axios = require("axios");
let config = require("../config/nodeConfig");
const schemaList = config.schemaList;
const domainsList = config.domainsList;
let resourceFunc = require("../services/resourceOperation");
let bundleOp = require("../services/bundleOperation");
let response = require("../utils/responseStatus");
let resourceValid = require("../utils/Validator/validateRsource").resourceValidation;
let url = require('url');

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


let searchResourceData = async function (req, res, resourceUrl) {
    try {
        let token = req.token;
        let response = resourceValid(req.params);
        if (response.error) {
            console.error(response.error.details)
            let errData = { status: 0, response: { data: response.error.details }, message: "Invalid input" }
            return res.status(422).json(errData);
        }
        const resourceType = req.params.resourceType;
        let responseData = await bundleOp.searchData(resourceUrl.link, resourceUrl.reqQuery);
        let reqUrl = url.parse(req.originalUrl, true)
        let reqQuery = reqUrl.query;
        // console.info(responseData.data.link)
        let result = [];
        let resStatus = 1;
        if( !responseData.data.entry || responseData.data.total == 0) {
            resStatus = reqUrl.query && reqUrl.query._offset ? 2 : 1;
            return res.status(200).json({ status: resStatus, message: "Data fetched", total: 0, data: []  })
        }
        else if (resourceUrl.allowNesting == 1) {
            let res_data = await resourceFunc.getResource(resourceType, {}, responseData.data.entry, req.method, reqQuery, 0);
            result = result.concat(res_data.resourceResult);
            if(resourceUrl.specialOffset) {
                let nextIndex = responseData.data.link.findIndex(e => e.relation == "next");
                if(nextIndex != -1) {
                     let urlPart = url.parse(responseData.data.link[nextIndex].url, true);                   
                    let query = urlPart.query;
                    resStatus = query._offset >= responseData.data.total ? 2 : 1;
                }  
                else {
                    resStatus = 2;
                }     
            }
            res.status(200).json({ status: resStatus, message: "Data fetched", total: result.length, data: result  })
        }
        else {      
            console.log("response data: ", responseData.data)
             if(responseData.data.link) {
                let nextIndex = responseData.data.link.findIndex(e => e.relation == "next");
                if(nextIndex != -1) {
                     let urlPart = url.parse(responseData.data.link[nextIndex].url, true);                   
                    let query = urlPart.query;
                    resStatus = query._offset >= responseData.data.total ? 2 : 1;
                }  
                else {
                    resStatus = 2;
                }           
            }
            for (let i = 0; i < responseData.data.entry.length; i++) {
                let res_data = await resourceFunc.getResource(resourceType, {}, responseData.data.entry[i].resource, req.method, reqQuery, 0, token);
                result = result.concat(res_data.resourceResult);
            }
             res.status(200).json({ status: resStatus, message: "Data fetched successfully.", total: result.length,"offset": +reqQuery._offset, data: result  })
        }

    }
    catch (e) {
        console.error("Error",e)
        if (e.code && e.code == "ERR") {
            return res.status(200).json({
                status: 0,
                message: e.message,
                error: e
            })
        }
        return response.sendDBError(res, e.code);
    }
}


let searchData = async function (link, reqQuery) {
    console.log("reached here: ", link)
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

let setResponse = function(resourceUrlData, responseData) {
    try {
        let resStatus = 1;
        if (resourceUrlData.allowNesting == 1) {          
            // result = result.concat(resourceData.resourceResult);
            if(resourceUrlData.specialOffset) {
                let nextIndex = responseData.data.link.findIndex(e => e.relation == "next");
                if(nextIndex != -1) {
                     let urlPart = url.parse(responseData.data.link[nextIndex].url, true);                   
                    let query = urlPart.query;
                    resStatus = query._offset >= responseData.data.total ? 2 : 1;
                }  
                else {
                    resStatus = 2;
                }     
            }
            
        }
        else {      
            console.log("response data: ", responseData.data)
             if(responseData.data.link) {
                let nextIndex = responseData.data.link.findIndex(e => e.relation == "next");
                if(nextIndex != -1) {
                     let urlPart = url.parse(responseData.data.link[nextIndex].url, true);                   
                    let query = urlPart.query;
                    resStatus = query._offset >= responseData.data.total ? 2 : 1;
                }  
                else {
                    resStatus = 2;
                }           
            }
        

        }
        return {resStatus};
} catch(e) {

    console.error("Error",e)
    if (e.code && e.code == "ERR") {
        return res.status(200).json({
            status: 0,
            message: e.message,
            error: e
        })
    }
    return response.sendDBError(res, e.code);
}
}

let getBundleJSON = async function (resourceData) {
    let bundle = {
        "resourceType": "Bundle",
        "type": "transaction",
        "entry": []
    };
    let errData = [];
    console.info(resourceData)
    bundle.entry = resourceData.resourceResult
    errData = resourceData.errData
    return { bundle, errData };
}

let mapBundleService = function(reqBundleData, responseBundleData) {
    return  responseBundleData.map((data, i) => Object.assign({}, data, reqBundleData[i]));
 }
 

module.exports = {setBundlePatch, setBundlePost, setBundleDelete, searchData, setBundlePut, getBundleJSON, mapBundleService, searchResourceData, setResponse};