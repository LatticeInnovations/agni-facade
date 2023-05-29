let response = require("../utils/responseStatus");
let axios = require("axios");
let resourceFunc = require("../services/resourceOperation");
let bundleFun = require("../services/bundleOperation");
let config = require("../config/nodeConfig");
let url = require('url');

let getResourceUrl = async function (resourceType, queryParams) {
    let url = "", dataEntryLength = null;
    switch (resourceType) {
        case "Patient": queryParams = queryParams;
             queryParams._total = "accurate"
            url = config.baseUrl + resourceType;
            break;
        case "RelatedPerson":
            let patientIds = queryParams.patientId
            url = config.baseUrl + `Person`;
            queryParams = {
                "_include" : "Person:link:RelatedPerson",
                "patient._id" : patientIds,
                "_total": "accurate"
            };
            dataEntryLength = 1;
            break;
        case "Medication" :
            url = config.baseUrl + resourceType;
            queryParams = queryParams;
            break;

    }

    return { link: url, reqQuery: queryParams, dataEntryLength: dataEntryLength }
}

let searchResourceData = async function (req, res, next) {
    try {
        let resourceType = req.params.resourceType;
        let resouceUrl = await getResourceUrl(resourceType, req.query);
        console.log("resource url", resouceUrl)
        let responseData = await bundleFun.searchData(resouceUrl.link, resouceUrl.reqQuery);
        console.log(responseData.data.entry)
        let result = [];
        let resStatus = 1;
        if( !responseData.data.entry || responseData.data.total == 0) {
            resStatus = 2;
            return res.status(200).json({ status: resStatus, message: "details fetched successfully", total: 0, data: []  })
        }
        else if (resouceUrl.dataEntryLength == 1) {
            let res_data = await resourceFunc.getResource(resourceType, {}, responseData.data.entry, req.method, null, 0);
            result = result.concat(res_data);
            res.status(200).json({ status: resStatus, message: "details fetched successfully", total: result.length, data: result  })
        }
        else {
            let reqUrl = url.parse(req.originalUrl, true)
            let reqQuery = reqUrl.query;
             if(responseData.data.link) {
                let nextIndex = responseData.data.link.findIndex(e => e.relation == "next");
                if(nextIndex != -1) {
                     let urlPart = url.parse(responseData.data.link[nextIndex].url, true);                   
                    let query = urlPart.query;
                    resStatus = query._offset >= responseData.data.total ? 2 : 1;
                }                
            }
            for (let i = 0; i < responseData.data.entry.length; i++) {
                let res_data = await resourceFunc.getResource(resourceType, {}, responseData.data.entry[i].resource, req.method, null, 0);
                result = result.concat(res_data);
            }
             res.status(200).json({ status: resStatus, message: "details fetched successfully", total: result.length,"offset": +reqQuery._offset, data: result  })
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

module.exports = {
    searchResourceData
}