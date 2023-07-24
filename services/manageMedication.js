let Medication = require("../class/medication");

let setMedicationData = async function (resType, reqInput, FHIRData, reqMethod) {
    try {
            let resourceResult = [], errData = [];
            let medication = new Medication(reqInput, FHIRData);
            medication.getFHIRToUserInput();
            resourceResult.push(medication.getMedicationResource())
        return {resourceResult, errData};
    }
    catch (e) {
        return Promise.reject(e);
    }

}

module.exports = { setMedicationData }