let bundleOp = require("./bundleOperation");
let bundleFun = require("./bundleOperation");
let config = require("../config/nodeConfig");
const { v4: uuidv4 } = require('uuid');
let ImmunizationRecommendation = require('../class/ImmunizationRecommendation');
const vaccines = require('../utils/vaccines.json');

let setImmunizationRecommendationData = async function (resType, reqInput, FHIRData, reqMethod, reqQuery, token) {
    try {
        let resourceResult = [], errData = [];
        let vaccineData = new ImmunizationRecommendation({}, FHIRData);
        vaccineData = vaccineData.getFHIRtoJSON()
        resourceResult.push(...vaccineData);
        return { resourceResult, errData };
    }
    catch (e) {
        return Promise.reject(e);
    }
}

module.exports = { setImmunizationRecommendationData }