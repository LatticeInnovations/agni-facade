let bundleFun = require("../services/bundleOperation");
let config = require("../config/nodeConfig");
let getManufacturer = async function (req, res) {
    try {
        //  Get organizations list which are manufacturers
        let link = config.baseUrl + "Organization"
        let reqQuery = {
            type: "bus",
            _count: 1000
        }
        //  fetch data from fhir server
        let responseData = await bundleFun.searchData(link, reqQuery);
        let manufacturersList = []
        if(responseData.data.entry.length > 0) {
            manufacturersList = responseData.data.entry.map(res => {
                return {
                    "manufacturerId": res.resource.id,
                    "manufacturerName": res.resource.name,
                    "active": res.resource.active,
                    "orgType": res.resource.type[0].coding[0].code
                }
            })
        }

        return res.status(200).json({status: 1, message: "Data fetched", total : responseData.data.total, data: manufacturersList});
        
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

module.exports = {getManufacturer}