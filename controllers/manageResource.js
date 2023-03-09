let response = require("../utils/responseStatus");
let axios = require("axios");
let resourceFunc = require("../services/resourceOperation");
let config = require("../config/config")
let createResource = async function (req, res, next) {
    try {
        resourceType = req.params.resourceType;
        let resourceData = await resourceFunc.getResource(req.params.resourceType, req.body, {}, req.method, null, 0);
        let headers = {
            "Content-Type": "application/json"
        }
        if(req.body.identifier) 
            headers["If-None-Exist"] = "identifier=" + req.body.identifier[0].identifierType + "|" + req.body.identifier[0].identifierNumber
        let response = await axios.post(config.baseUrl + req.params.resourceType, resourceData, {
            headers: headers
        });
        if (response.status == 201)
            res.status(201).json({ status: 1, message: "Data saved successfully.", data: response.data.id })
        else if (response.status == 200) {
            res.status(200).json({ status: 1, message: "Data already exists.", data: response.data.id })
        }
        else
            return Promise.reject({ status: 0, code: "ERR", e: response })
    }
    catch (e) {
        console.log(e)
        if (e.code && e.code == "ERR") {
            return res.status(500).json({
                status: 0,
                message: e.message,
                error: e
            })
        }
        return res.status(500).json({
            status: 0,
            message: "Unable to process. Please try again.",
            error: e
        })
    }

}
const patchResource = async function (req, res, next) {
    try {
        resourceType = req.params.resourceType;
        let link = config.baseUrl + resourceType;
        let resourceSavedData = await resourceFunc.searchData(link, {"_id": req.params.id})
        let resourceData = await resourceFunc.getResource(req.params.resourceType, req.body, [], req.method, resourceSavedData.data.entry[0].resource, 0);
        console.log("====>", resourceData);
        resourceData.id = req.params.id;
        let response = await axios.patch(config.baseUrl + req.params.resourceType + "/" + req.params.id, resourceData, {
            headers: {
                "Content-Type": "application/json-patch+json"
            }
        });
        if (response.status == 200)
            res.status(201).json({ status: 1, message: "Data updated successfully.", data: response.data.id })
        else
            return Promise.reject({ status: 0, code: "ERR" })
    }
    catch (e) {
        console.log(e)
        if (e.code && e.code == "ERR") {
            return res.status(500).json({
                status: 0,
                message: e.message
            })
        }
        return res.status(500).json({
            status: 0,
            message: e.message,
            e: e
        })
    }
}

let updateResource = async function (req, res, next) {
    try {
        resourceType = req.params.resourceType;
        console.log(req.method)
        let resourceData = await resourceFunc.getResource(req.params.resourceType, req.body, {}, req.method, null, 0);
        resourceData.id = req.params.id;
        console.log(resourceData, config.baseUrl + req.params.resourceType + "/" + req.params.id)
        let response = await axios.put(config.baseUrl + req.params.resourceType + "/" + req.params.id, resourceData, {
            headers: {
                "Content-Type": "application/json"
            }
        });
        console.log(response.data, response.status);
        if (response.status == 200)
            res.status(201).json({ status: 1, message: "Data updated successfully.", data: response.data.id })
        else
            return Promise.reject({ status: 0, code: "ERR" })
    }
    catch (e) {
        console.log(e)
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

let deleteResource = async function (req, res, next) {
    try {
        resourceType = req.params.resourceType;
    }
    catch (e) {
        console.log(e)
        if (e.code && e.code == "ERR") {
            return res.status(200).json({
                status: 0,
                message: e.message
            })
        }
        return response.sendDBError(res, e.code);
    }
}


let searchResourceData = async function (req, res, next) {
    try {
        resourceType = req.params.resourceType;
        let link = config.baseUrl + resourceType;
        let responseData = await resourceFunc.searchData(link, req.query);
        console.log(responseData.data, req.method);
        let response_data = [];
        for(let i=0; i< responseData.data.total; i++) {
                console.log(responseData.data.entry[i].resource)
                let res_data = await resourceFunc.getResource(resourceType, {}, responseData.data.entry[i].resource, req.method, 0);
                response_data.push(res_data);
        }
        console.log(response_data)
        res.status(200).json({status: 1, message: "details fetched successfully", data: response_data})

    }
    catch (e) {
        console.log(e)
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
    createResource, patchResource, updateResource, deleteResource, searchResourceData
}