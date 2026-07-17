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
        const entryMeta = []; // resolved (duplicate/not-found) + pending entries

        const allPatientIds = [...new Set(reqInput.map(r => r.patientId))].join(",");
        const patientSearchResult = await bundleFun.searchData(
            config.baseUrl + "Patient",
            { _id: allPatientIds, _elements: "id,birthDate", _count: 1000 }
        );
        const patientMap = {};
        (patientSearchResult?.data?.entry || []).forEach(e => {
            patientMap[e.resource.id] = e.resource;
        });

        const existingRecsResult = await bundleFun.searchData(
            config.baseUrl + "ImmunizationRecommendation",
            { patient: allPatientIds, _elements: "id,patient,identifier,recommendation", _count: 1000 }
        );
        const existingMap = new Map(); // "patientId::vaccineCode" -> { uuid, fhirId }
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

        for (const row of reqInput) {
            const { patientId, vaccineCode, doses, vaccineUuid } = row;
            const patientData = patientMap[patientId];

            if (!patientData) {
                entryMeta.push({
                    patientId, vaccineCode, uuid: vaccineUuid, fhirId: null,
                    status: "500", err: "Patient not found", resolved: true
                });
                continue;
            }

            const existing = existingMap.get(`${patientId}::${vaccineCode}`);
            if (existing) {
                entryMeta.push({
                    patientId, vaccineCode,
                    uuid: vaccineUuid,       // identifier of the EXISTING conflicting resource
                    fhirId: existing.fhirId,   // fhirId of the EXISTING conflicting resource
                    status: "500", err: "Immunization recommendation already exists", resolved: true
                });
                continue;
            }

            let resource = new ImmunizationRecommendation({
                patientId: patientData.id,
                orgId: token.orgId,
                code: vaccineCode,
                birthDate: patientData.birthDate,
                vaccineData: { doses, uuid: vaccineUuid }, // adapt if class expects {doses, text, display} - see note below
            }, {});
            resource = resource.getJsonToFhirTranslator();

            const bundleEntry = await bundleFun.setBundlePost(resource, null, resource.id, "POST", "identifier");
            resourceResult.push(bundleEntry);

            entryMeta.push({
                patientId, vaccineCode,
                uuid: vaccineUuid, fhirId: null,
                status: "pending", err: null, resolved: false
            });
        }

        return { resourceResult, entryMeta };
    }
    catch (e) {
        console.error("create immunization recommendation error", e);
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
            const vaccineName = resource?.recommendation?.[0]?.vaccineCode?.[0]?.text
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
                    id: uuid,
                    fhirId,
                    patientId,
                    vaccineCode: code,
                    doses: codeGroups[code],
                    vaccineName
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