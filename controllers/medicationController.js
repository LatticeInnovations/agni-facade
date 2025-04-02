let Medication = require("../class/medication");
let axios = require("axios");
let config = require("../config/nodeConfig");
const bundleStructure = require("../services/bundleOperation")
const responseService = require("../services/responseService");


//  Get Practitioner data
let getMedicationList = async function (req, res) {
    try {
        const link = config.baseUrl + "Medication"
        let specialOffset = null;
        let queryParams = req.query
        queryParams._total = "accurate";
        let resourceResult = []
        let resourceUrlData = { link: link, reqQuery: queryParams, allowNesting: 1, specialOffset: specialOffset }
        let responseData = await bundleStructure.searchData(link, queryParams);
        let resStatus = 1;
        if( !responseData.data.entry || responseData.data.total == 0) {
                return res.status(200).json({ status: resStatus, message: "Data fetched", total: 0, data: []  })
        }          
        resStatus = bundleStructure.setResponse(resourceUrlData, responseData);
        responseData.data.entry.forEach(element => {
            const FHIRData = element.resource;
            let medication = new Medication({}, FHIRData);
            medication.getFHIRToUserInput();
            resourceResult.push(medication.getMedicationResource())
        });
        
        res.status(200).json({ status: resStatus, message: "Medicines list fetched.", total: resourceResult.length,"offset": +queryParams?._offset, data: resourceResult  })
        
    }
    catch(e) {
        console.error("Error",e)
        return res.status(200).json({
                status: 0,
                message: "Unable to process. Please try again"
            })
       
    }
}


//  Patch Practitioner data
let patchPractitionerData = async function (req, res) {
    try {
        const resType = "Practitioner"
        // let response = resourceValid(req.params);
        // if (response.error) {
        //     console.error(response.error.details)
        //     let errData = { status: 0, response: { data: response.error.details }, message: "Invalid input" }
        //     return res.status(422).json(errData);
        // }
        let resourceResult = [];
        for (let inputData of req.body) {
            let practitioner = new Practitioner(inputData, []);
            let link = config.baseUrl + resType;
            let resourceSavedData = await bundleStructure.searchData(link, { "_id": inputData.id });
            if (resourceSavedData.data.total != 1) {
               return res.status(422).json({ status: 0, code: "ERR", message: "Practitioner Id " + inputData.id + " does not exist."})
            }
            practitioner.patchUserInputToFHIR(resourceSavedData.data.entry[0].resource);
            let resourceData = [...practitioner.getFHIRResource()];
            const patchUrl = resType + "/" + inputData.id;
            let patchResource = await bundleStructure.setBundlePatch(resourceData, patchUrl);
            resourceResult.push(patchResource);
        }
        let bundleData = await bundleStructure.getBundleJSON({resourceResult})  
        let response = await axios.post(config.baseUrl, bundleData.bundle); 
        console.info("get bundle json response: ", response.status)  
        if (response.status == 200 || response.status == 201) {
            let responseData = setPractitionerSaveResponse(bundleData.bundle.entry, response.data.entry, "patch"); 
            res.status(201).json({ status: 1, message: "Practitioner data saved.", data: responseData })
        }
        else {
                return res.status(500).json({
                status: 0, message: "Unable to process. Please try again.", error: response
            })
        }
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({
            status: 0,
            message: "Unable to process. Please try again.",
            error: e
        })
    }

}



const setPractitionerSaveResponse  = (reqBundleData, responseBundleData, type) => {
    let filteredData = [];
    let response = [];
    const responseData = bundleStructure.mapBundleService(reqBundleData, responseBundleData)
    filteredData = responseData.filter(e => e.resource.resourceType == "Practitioner" || (type == "patch" && e.resource.resourceType == "Binary") );
    response = responseService.setDefaultResponse("Practitioner", type, filteredData)
    console.info("responses: ============================>", filteredData)
    return response;
}


module.exports = {
    getMedicationList
}