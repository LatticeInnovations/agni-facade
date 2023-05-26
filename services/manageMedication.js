let Medication = require("../class/medication");
let bundleFun = require("./bundleOperation");
let config = require("../config/nodeConfig");

let setMedicationData = async function (resType, reqInput, FHIRData, reqMethod) {
    try {
            let resource_result = [];
            let medication = new Medication(reqInput, FHIRData);
            medication.getFHIRToUserInput();
            resource_result.push(medication.getMedicationResource())
        return resource_result;
    }
    catch (e) {
        return Promise.reject(e);
    }

}

module.exports = { setMedicationData }