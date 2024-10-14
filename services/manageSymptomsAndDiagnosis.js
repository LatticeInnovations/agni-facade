let ValueSet = require("../class/ValueSet");

let manageValueSetData= async function (resType, reqInput, FHIRData, reqMethod, token) {
    try {
            let resourceResult = [], errData = [];
            const type = FHIRData.name == "symptomsList" ? "symptoms" : "diagnosis"
            console.log("==========>", resType, reqInput, FHIRData, reqMethod, token)
            let valueSet = new ValueSet(reqInput, FHIRData, type);            
            resourceResult = valueSet.getFHIRToJSONOutput();
            return {resourceResult, errData};
    }
    catch (e) {
        return Promise.reject(e);
    }

}

module.exports = { manageValueSetData }