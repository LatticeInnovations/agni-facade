let ImmunizationRecommendation = require('../class/ImmunizationRecommendation');

let setImmunizationRecommendationData = async function (resType, reqInput, FHIRData, reqMethod, reqQuery, token) {
    try {
        let resourceResult = [], errData = [];
        console.log(FHIRData)
        FHIRData = FHIRData.map(e => e.resource)
        FHIRData.forEach(recommendationData => {
            let vaccineData = new ImmunizationRecommendation({}, recommendationData);
            vaccineData = vaccineData.getFHIRtoJSON()
            resourceResult.push(...vaccineData);
        })

        return { resourceResult, errData };
    }
    catch (e) {
        return Promise.reject(e);
    }
}

module.exports = { setImmunizationRecommendationData }