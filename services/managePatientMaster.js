const axios = require("axios");
const config = require("../config/nodeConfig");
const model = require("../models/index");
const Sequelize = require("sequelize");

function calculateAge(birthDate) {
  if (!birthDate) return null;
  let dob = new Date(birthDate);
  let today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  let m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function getFullName(resource) {
  let nameObj = resource.name?.[resource.name.length - 1];
  if (!nameObj) return "";
  let given = nameObj.given?.join(" ") || "";
  let family = nameObj.family || "";
  return (given + " " + family).trim();
}

async function resolveOrgCache(orgRefs) {
  let uniqueRefs = [...new Set(orgRefs.filter(Boolean))];
  if (uniqueRefs.length === 0) return {};
  let orgIds = uniqueRefs.map(r => r.replace("Organization/", ""));
  let orgMap = {};
  for (let id of orgIds) {
    try {
      let res = await axios.get(config.baseUrl + "Organization/" + id);
      orgMap["Organization/" + id] = res.data.name || "Unknown";
    } catch {
      orgMap["Organization/" + id] = "Unknown";
    }
  }
  return orgMap;
}

async function getSyncDateMap(patientUuids) {
  if (patientUuids.length === 0) return {};
  let records = await model.userTimeMap.findAll({
    where: { uuid: { [Sequelize.Op.in]: patientUuids } },
    raw: true
  });
  let map = {};
  records.forEach(r => {
    let existing = map[r.uuid];
    if (!existing || new Date(r.timestamp) > new Date(existing)) {
      map[r.uuid] = r.timestamp;
    }
  });
  return map;
}

function extractPatientKeys(entry) {
  let keys = [entry.resource.id];
  let uuidId = entry.resource.identifier?.find(id => id.system === "https://www.thelattice.in/");
  if (uuidId) keys.push(uuidId.value);
  return keys;
}

async function listPatients({ search, sort_by, order, offset, count }) {
  offset = Math.max(0, parseInt(offset) || 0);
  count = Math.min(100, Math.max(1, parseInt(count) || 10));

  let needsFullFetch = ["facility_name", "last_screening_date"].includes(sort_by);
  let MAX_FETCH = 10000;

  let patientParams = { _total: "accurate" };

  if (search) {
    let orgRes = await axios.get(config.baseUrl + "Organization", {
      params: { name: search, type: "facility" }
    });
    let orgIds = orgRes.data.entry ? orgRes.data.entry.map(e => "Organization/" + e.resource.id) : [];

    if (orgIds.length > 0) {
      patientParams.organization = orgIds.join(",");
    } else {
      patientParams["name:contains"] = search;
    }
  }

  if (!needsFullFetch) {
    let sortMap = {
      name: "name",
      age: "birthdate",
      gender: "gender",
      dob: "birthdate"
    };
    if (sortMap[sort_by]) {
      patientParams._sort = (order === "desc" ? "-" : "") + sortMap[sort_by];
    }
    patientParams._count = count;
    patientParams._offset = offset;

    let response = await axios.get(config.baseUrl + "Patient", { params: patientParams });
    let entries = response.data.entry || [];
    let total = response.data.total || 0;

    let orgRefs = entries.map(e => e.resource.managingOrganization?.reference).filter(Boolean);
    let orgCache = await resolveOrgCache(orgRefs);

    entries.forEach(e => {
      console.log("DEBUG patient", e.resource.id, "orgRef:", e.resource.managingOrganization?.reference, "identifiers:", JSON.stringify(e.resource.identifier));
    });

    let patientKeys = [];
    entries.forEach(e => { patientKeys.push(...extractPatientKeys(e)); });

    console.log("DEBUG patient keys:", JSON.stringify(patientKeys));

    let syncMap = await getSyncDateMap([...new Set(patientKeys)]);

    console.log("DEBUG syncMap:", JSON.stringify(syncMap));

    let data = entries.map(e => {
      let orgRef = e.resource.managingOrganization?.reference;
      let keys = extractPatientKeys(e);
      let lastScreeningDate = null;
      for (let key of keys) {
        if (syncMap[key]) {
          lastScreeningDate = new Date(syncMap[key]).toISOString().split("T")[0];
          break;
        }
      }
      return {
        patient_id: e.resource.id,
        name: getFullName(e.resource),
        age: calculateAge(e.resource.birthDate),
        gender: e.resource.gender || null,
        dob: e.resource.birthDate || null,
        facility_name: orgRef ? orgCache[orgRef] : null,
        last_screening_date: lastScreeningDate
      };
    });

    return { data, total };
  }

  // Cross-resource sorting: fetch larger batch, enrich, sort, page in app
  patientParams._count = MAX_FETCH;
  patientParams._offset = 0;

  let response = await axios.get(config.baseUrl + "Patient", { params: patientParams });
  let entries = response.data.entry || [];
  let total = response.data.total || 0;

  let orgRefs = entries.map(e => e.resource.managingOrganization?.reference).filter(Boolean);
  let orgCache = await resolveOrgCache(orgRefs);

  let patientKeys = [];
  entries.forEach(e => { patientKeys.push(...extractPatientKeys(e)); });

  let syncMap = await getSyncDateMap([...new Set(patientKeys)]);

  let allData = entries.map(e => {
    let orgRef = e.resource.managingOrganization?.reference;
    let keys = extractPatientKeys(e);
    let lastScreeningDate = null;
    for (let key of keys) {
      if (syncMap[key]) {
        lastScreeningDate = new Date(syncMap[key]).toISOString().split("T")[0];
        break;
      }
    }
    return {
      patient_id: e.resource.id,
      name: getFullName(e.resource),
      age: calculateAge(e.resource.birthDate),
      gender: e.resource.gender || null,
      dob: e.resource.birthDate || null,
      facility_name: orgRef ? orgCache[orgRef] : null,
      last_screening_date: lastScreeningDate
    };
  });

  let sortFieldMap = {
    name: "name",
    age: "age",
    gender: "gender",
    dob: "dob",
    facility_name: "facility_name",
    last_screening_date: "last_screening_date"
  };
  let field = sortFieldMap[sort_by] || "name";
  let cmp = (a, b) => {
    let va = a[field], vb = b[field];
    if (va == null) return 1;
    if (vb == null) return -1;
    if (field === "age") return va - vb;
    if (field === "last_screening_date") return va.localeCompare(vb);
    return String(va).localeCompare(String(vb));
  };
  allData.sort((a, b) => (order === "desc" ? -cmp(a, b) : cmp(a, b)));

  let pagedData = allData.slice(offset, offset + count);

  return { data: pagedData, total };
}

module.exports = { listPatients };
