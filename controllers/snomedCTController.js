let response = require("../utils/responseStatus");
const config = require("../config/nodeConfig");
let medData = require("../utils/medtime.json");

//get presection intake timing
let getMedTiming = async function (req, res, next) {
    try {
        res.status(200).json({status: 1, message: "Data fetched successfully", data: medData});
        
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


module.exports = {
    getMedTiming
}