let response = require("../utils/responseStatus");
let resourceFunc = require("../services/resourceOperation");
let bundleFun = require("../services/bundleOperation");
let config = require("../config/nodeConfig");
let url = require('url');
let resourceValid = require("../utils/Validator/validateRsource").resourceValidation;
let getResourceUrl = async function (resourceType, queryParams, token) {
    let url = "", nestedResource = null, specialOffset = null;
    switch (resourceType) {
        case "Patient": 
             queryParams._total = "accurate"
             queryParams['organization'] = "Organization/"+token.orgId;
             url = config.baseUrl + resourceType;
            break;
        case "Medication" :
        case "ValueSet":
        case "Practitioner" :
             queryParams._total = "accurate"
             url = config.baseUrl + resourceType;
            break;
        case "RelatedPerson": {
            let patientIds = queryParams.patientId
            url = config.baseUrl + `Person`;
            queryParams = {
                "_include" : "Person:link:RelatedPerson",
                "patient._id" : patientIds,
                "_total": "accurate",
                "_count" : queryParams._count
            };
            nestedResource = 1;
        }

            break;
        case "MedicationRequest" : 
            url = config.baseUrl + "Encounter";
            queryParams.patient = queryParams.patientId;
            delete queryParams.patientId;
            queryParams._count= 3000;
            queryParams._revinclude = "MedicationRequest:encounter:Encounter";
            queryParams["type"] = "prescription-encounter-form";
            nestedResource = 1;
            break;
        case "PrescriptionFile":
            url = config.baseUrl + "Encounter";
            queryParams.patient = queryParams.patientId;
            delete queryParams.patientId;
            queryParams._count= 3000;
            queryParams._revinclude = "MedicationRequest:encounter:Encounter";
            queryParams["type"] = "prescription-encounter-document";
            nestedResource = 1;
            break;
        case "Organization" : 
            url = config.baseUrl + resourceType;
            queryParams.Organization = queryParams.orgId;
            queryParams = {
                "_revinclude" : "Location:organization:Organization",
                "_total": "accurate",
            };
            nestedResource = 1;
            break;
        case "PractitionerRole":
            url = config.baseUrl + resourceType;
            queryParams = {
                "practitioner" : queryParams.practitionerId,
                "_include": "*",
                "_total": "accurate"
            }
            nestedResource = 1;
            break;
        case "Schedule":
            queryParams._total = "accurate"
            queryParams["actor.organization"] = queryParams.orgId;
            delete queryParams.orgId;
            url = config.baseUrl + resourceType;
            nestedResource = 1;
            specialOffset = 1;
            break;
        case "Appointment": 
             queryParams._total = "accurate"
             if(queryParams.orgId) {
                queryParams["location.organization"] = queryParams.orgId;
                delete queryParams.orgId;
             }
             if(queryParams.patientId) {
                queryParams["patient"] = queryParams.patientId;
                delete queryParams.patientId;
             }
            url = config.baseUrl + resourceType;
            nestedResource = 1;
            specialOffset = 1;
            break;
            case "CVD":
                url = config.baseUrl + "Encounter";
                queryParams.type="cvd-encounter"
                queryParams["subject.organization"] = token.orgId
                nestedResource = 1;
                break;
            case "Observation":
                url = config.baseUrl + "Encounter";
                queryParams.type="vital-encounter"
                queryParams["subject.organization"] = token.orgId
                nestedResource = 1;
                break;
                case "MedicationDispense": 
                queryParams._total = "accurate"
                if(queryParams.prescriptionId) {
                   queryParams["part-of"]= queryParams.prescriptionId;
                   delete queryParams.prescriptionId;
                }
                if(queryParams.patientId) {
                   queryParams["subject"] = queryParams.patientId;
                   delete queryParams.patientId;
   
                }
                queryParams["type"]="pharmacy-service";
                url = config.baseUrl + "Encounter";
                nestedResource = 1;
               //  specialOffset = 1;
                break;
           case "DispenseLog": 
                queryParams._total = "accurate"
                if(queryParams.patientId) {
                   queryParams["subject"] = queryParams.patientId;
                   delete queryParams.patientId;
                }
                queryParams["type"]="dispensing-encounter";
                url = config.baseUrl + "Encounter";
                nestedResource = 1;
               //  specialOffset = 1;
                break;
            case "DiagnosticReport":
                url = config.baseUrl + "Encounter";
                queryParams._revinclude = "DiagnosticReport:encounter:Encounter";
                queryParams["subject.organization"] = token.orgId
                nestedResource = 1;
                break;
            case "DocumentManifest":
                url = config.baseUrl + "Encounter";
                queryParams._revinclude = "DocumentManifest:related-ref:Encounter";
                queryParams["subject.organization"] = token.orgId
                nestedResource = 1;
                break;
            case "Condition":
                url = config.baseUrl + "Encounter";
                queryParams["_revinclude:0"] = "Condition:encounter";
                queryParams["_revinclude:1"] = "Observation:encounter";
                queryParams._include= "Encounter:part-of:Encounter";
                queryParams.type="symptom-diagnosis-encounter"
                queryParams["subject.organization"] = token.orgId
                nestedResource = 1;
                break;

    }

    return { link: url, reqQuery: queryParams, nestedResource: nestedResource, specialOffset: specialOffset }
}

let searchResourceData = async function (req, res) {
    try {
        let token = req.token;
        let response = resourceValid(req.params);
        if (response.error) {
            console.error(response.error.details)
            let errData = { status: 0, response: { data: response.error.details }, message: "Invalid input" }
            return res.status(422).json(errData);
        }
        const resourceType = req.params.resourceType;
        let resouceUrl = await getResourceUrl(resourceType, req.query, token);
        let responseData = await bundleFun.searchData(resouceUrl.link, resouceUrl.reqQuery);
        let reqUrl = url.parse(req.originalUrl, true)
        let reqQuery = reqUrl.query;
        // console.info(responseData.data.link)
        let result = [];
        let resStatus = 1;
        if( !responseData.data.entry || responseData.data.total == 0) {
            resStatus = reqUrl.query && reqUrl.query._offset ? 2 : 1;
            return res.status(200).json({ status: resStatus, message: "Data fetched", total: 0, data: []  })
        }
        else if (resouceUrl.nestedResource == 1) {
            let res_data = await resourceFunc.getResource(resourceType, {}, responseData.data.entry, req.method, reqQuery, 0);
            result = result.concat(res_data.resourceResult);
            if(resouceUrl.specialOffset) {
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

module.exports = {
    searchResourceData,
    getResourceUrl
}