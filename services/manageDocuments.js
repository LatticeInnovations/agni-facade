let bundleFun = require("./bundleOperation");
const MedicationRequest = require("../class/MedicationRequest");
const Encounter = require("../class/encounter")
const { v4: uuidv4 } = require('uuid');
let config = require("../config/nodeConfig");
let bundleOp = require("./bundleOperation");
const DocumentReference = require("../class/DocumentReference");
let axios = require('axios');

const setDocumentReference = async (resType, reqInput, FHIRData, reqMethod, reqQuery, token) => {
    try {
        let resourceResult = [], errData = [];
        if (["patch", "PATCH"].includes(reqMethod)) {
            for(let document of reqInput){
                let documentResource = await bundleOp.searchData(config.baseUrl + "DocumentReference", { "_id": document.documentFhirId }, token);
                documentResource = documentResource.data.entry[0].resource;
                let documentData = new DocumentReference(document, documentResource).getDocumentPatch();
                let documentPatchData = await bundleFun.setBundlePut(documentData, documentData.setIdentifier, documentData.id, "PUT");
                resourceResult.push(documentPatchData);
            }
        }
        return {resourceResult, errData};
    }
    catch (e) {
        return Promise.reject(e);
    }
}

module.exports = { setDocumentReference }