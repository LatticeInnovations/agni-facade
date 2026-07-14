let ImmunizationRecommendation = require("../class/ImmunizationRecommendation")
let bundleFun = require("./bundleOperation");
let config = require("../config/nodeConfig");
const { v4: uuidv4 } = require("uuid");

const DATE_CRITERION_MAP = {
    "30981-5": "startDate", // Earliest date to give
    "30980-7": "endDate",   // Date vaccine due
    "59778-1": "midDate"    // Latest date to give immunization
};

const manageImmunizationRecommendationDetail = async (resType, reqInput, FHIRData, reqMethod, reqQuery, token) => {
    try {
        let resourceResult = [], errData = [], entryMeta = [];

        if (["post", "POST"].includes(reqMethod)) {
            const saveResult = await saveImmunizationRecommendation(reqInput, token);
            resourceResult = saveResult.resourceResult;
            entryMeta = saveResult.entryMeta;
            // errData intentionally stays [] - everything lives in entryMeta now
        } else if (["PUT", "PUT"].includes(reqMethod)) {
            return { resourceResult, errData, entryMeta };
        } else {
            resourceResult = await getImmunizationDetails(FHIRData, reqQuery, token);
        }

        return { resourceResult, errData, entryMeta };
    } catch (e) {
        return Promise.reject(e);
    }
};

const saveImmunizationRecommendation = async (reqInput, token) => {
    try {
        const resourceResult = [];
        const entryMeta = []; // single array: resolved entries (duplicate/not-found) + pending entries (to resolve after save)

        // ---- BATCH FETCH PATIENTS ----
        const allPatientIds = reqInput.map(p => p.patientId).join(",");
        const patientSearchResult = await bundleFun.searchData(
            config.baseUrl + "Patient",
            { _id: allPatientIds, _elements: "id,birthDate", _count: 1000 }
        );
        const patientMap = {};
        (patientSearchResult?.data?.entry || []).forEach(e => {
            patientMap[e.resource.id] = e.resource;
        });

        // ---- BATCH FETCH EXISTING RECOMMENDATIONS ----
        const existingRecsResult = await bundleFun.searchData(
            config.baseUrl + "ImmunizationRecommendation",
            { patient: allPatientIds, _elements: "id,patient,identifier,recommendation", _count: 1000 }
        );
        const existingMap = new Map();
        (existingRecsResult?.data?.entry || []).forEach(e => {
            const patId = e.resource.patient?.reference?.split("/")[1];
            const existingFhirId = e.resource.id;
            const existingUuid = e.resource.identifier?.[0]?.value || null;

            (e.resource.recommendation || []).forEach(r => {
                const code = r.vaccineCode?.[0]?.coding?.[0]?.code;
                if (patId && code) {
                    existingMap.set(`${patId}::${code}`, { uuid: existingUuid, fhirId: existingFhirId });
                }
            });
        });

        for (let i = 0; i < reqInput.length; i++) {
            const patientId = reqInput[i].patientId;
            const vaccines = reqInput[i].vaccines;
            const vaccineCodes = Object.keys(vaccines);
            const patientData = patientMap[patientId];

            if (!patientData) {
                entryMeta.push({
                    patientId,
                    uuid: null,
                    fhirId: patientId,
                    status: "500",
                    err: "Patient not found",
                    resolved: true // no bundle entry, nothing more to fill in
                });
                continue;
            }

            for (let code of vaccineCodes) {
                const existing = existingMap.get(`${patientId}::${code}`);
                const vaccineUuid = vaccines[code].uuid
                if (existing) {
                    entryMeta.push({
                        patientId,
                        uuid: vaccineUuid,       // identifier of the EXISTING conflicting resource
                        fhirId: existing.fhirId,   // fhirId of the EXISTING conflicting resource
                        status: "500",
                        err: "Immunization recommendation already exists",
                        resolved: true
                    });
                    continue;
                }

                let ImmunizationRecommendationResource = new ImmunizationRecommendation({
                    patientId: patientData.id,
                    orgId: token.orgId,
                    code: code,
                    birthDate: patientData.birthDate,
                    identifier: vaccineUuid,
                    vaccineData: vaccines[code],
                }, {});

                ImmunizationRecommendationResource = ImmunizationRecommendationResource.getJsonToFhirTranslator();

                let ImmunizationRecommendationBundle = await bundleFun.setBundlePost(
                    ImmunizationRecommendationResource,
                    null,
                    ImmunizationRecommendationResource.id,
                    "POST",
                    "identifier"
                );

                resourceResult.push(ImmunizationRecommendationBundle);

                entryMeta.push({
                    patientId,
                    uuid: vaccineUuid,
                    fhirId: null,
                    status: "pending",
                    err: null,
                    resolved: false // will be filled in after axios.post, matched by position among unresolved entries
                });
            }
        }

        return { resourceResult, entryMeta };
    }
    catch (e) {
        console.error("create immunization recommendation result", e);
        return Promise.reject(e);
    }
};


const getImmunizationDetails = async (FHIRData, reqQuery, token) => {
    try {
        const result = [];

        FHIRData.forEach(entry => {
            const resource = entry.resource || entry; // handles bundle entry ({resource:...}) or raw resource
            if (!resource || resource.resourceType !== "ImmunizationRecommendation") return;

            const patientId = resource.patient?.reference?.split("/")[1];
            const fhirId = resource.id;
            const uuid = resource.identifier?.[0]?.value || null;
            if (!patientId) return;

            // group this resource's recommendation[] entries by vaccine code first,
            // in case a single resource ever holds multiple codes
            const codeGroups = {};
            (resource.recommendation || []).forEach(rec => {
                const code = rec.vaccineCode?.[0]?.coding?.[0]?.code;
                const doseNumber = rec.doseNumberString;
                if (!code || !doseNumber) return;

                if (!codeGroups[code]) codeGroups[code] = {};

                const doseDates = {};
                (rec.dateCriterion || []).forEach(dc => {
                    const dcCode = dc.code?.coding?.[0]?.code;
                    const fieldName = DATE_CRITERION_MAP[dcCode];
                    if (fieldName) doseDates[fieldName] = dc.value;
                });

                codeGroups[code][doseNumber] = doseDates;
            });

            Object.keys(codeGroups).forEach(code => {
                result.push({
                    uuid,
                    fhirId,
                    patientId,
                    vaccineCode: code,
                    doses: codeGroups[code]
                });
            });
        });

        return result;
    }
    catch (e) {
        console.error("get immunization recommendation details error", e);
        return Promise.reject(e);
    }
};

module.exports = { manageImmunizationRecommendationDetail };