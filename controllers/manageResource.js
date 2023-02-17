let response = require("../utils/responseStatus");
let axios = require("axios");
let Person = require("../services/person");
let baseUrl = "http://134.209.154.146:8080/fhir/"
let createResource = async function (req, res, next) {
    try {
        resourceType = req.params.resourceType;
        let resourceData = await getResource(req.params.resourceType, req.body, {}, req.method, null);
        console.log(resourceData);
        let headers = {
            "Content-Type": "application/json"
        }
        if(req.body.identifier) 
            headers["If-None-Exist"] = "identifier=" + req.body.identifier[0].identifier_type + "|" + req.body.identifier[0].identifier_number
        let response = await axios.post(baseUrl + req.params.resourceType, resourceData, {
            headers: headers
        });
        console.log(response.data);
        if (response.status == 201)
            res.status(201).json({ status: 1, message: "Data saved successfully.", id: response.data.id })
        else if (response.status == 200) {
            res.status(200).json({ status: 1, message: "Data already exists.", id: response.data.id })
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
            message: "Unable to process. Please try again."
        })
    }

}
const patchResource = async function (req, res, next) {
    try {
        resourceType = req.params.resourceType;
        let link = baseUrl + resourceType;
        let resourceSavedData = await searchData(link, {"_id": req.params.id})
        let resourceData = await getResource(req.params.resourceType, req.body, [], req.method, resourceSavedData.data.entry[0].resource);
        console.log("====>", resourceData);
        resourceData.id = req.params.id;
        let response = await axios.patch(baseUrl + req.params.resourceType + "/" + req.params.id, resourceData, {
            headers: {
                "Content-Type": "application/json-patch+json"
            }
        });
        console.log("======>",response.data, response.status);
        if (response.status == 200)
            res.status(201).json({ status: 1, message: "Data updated successfully.", id: response.data.id })
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
        let resourceData = await getResource(req.params.resourceType, req.body, {}, req.method, null);
        resourceData.id = req.params.id;
        console.log(resourceData, baseUrl + req.params.resourceType + "/" + req.params.id)
        let response = await axios.put(baseUrl + req.params.resourceType + "/" + req.params.id, resourceData, {
            headers: {
                "Content-Type": "application/json"
            }
        });
        console.log(response.data, response.status);
        if (response.status == 200)
            res.status(201).json({ status: 1, message: "Data updated successfully.", id: response.data.id })
        else
            return Promise.reject({ status: 0, code: "ERR" })
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
        let link = baseUrl + resourceType;
        let responseData = await searchData(link, req.query);
        console.log(responseData.data, req.method);
        let response_data = [];
        for(let i=0; i< responseData.data.total; i++) {
                console.log(responseData.data.entry[i].resource)
                let res_data = await getResource(resourceType, {}, responseData.data.entry[i].resource, req.method);
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
                message: e.message
            })
        }
        return response.sendDBError(res, e.code);
    }
}

let searchData = async function(link, reqQuery) {
    try{
        let responseData = await axios.get(link, {params: reqQuery});
        return responseData;
    }catch (e) {
        console.log(e)
         e = {status: 0, code: "ERR", e: e}
        return Promise.reject(e);
    }

}


let getResource = async function (resType, inputData, FHIRData,  reqMethod, fetchedResourceData) {
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
            else if(["patch", "PATCH"].includes(reqMethod)) {
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
module.exports = {
    createResource, patchResource, updateResource, deleteResource, searchResourceData
}