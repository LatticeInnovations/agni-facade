const config = require("../config/nodeConfig");
const axios = require("axios");
const { validationResult } = require("express-validator");
const bundleOp = require("../services/bundleOperation");
const { createFacilityData, updateFacilityData } = require("../services/manageOrganization");
const model = require("../models/index");
const Sequelize = require("sequelize");

let createFacility = async function (req, res) {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ success: false, message: "Validation failed", errors: errors.array() });
        }

        let facilityData = req.body;
        let { organization, location } = await createFacilityData(facilityData);

        let orgResponse = await axios.post(config.baseUrl + "Organization", organization);
        if (orgResponse.status !== 201) {
            return res.status(500).json({ success: false, message: "Failed to create facility" });
        }

        let facilityId = orgResponse.data.id;
        location.managingOrganization.reference = "Organization/" + facilityId;

        await axios.post(config.baseUrl + "Location", location);

        return res.status(201).json({
            success: true,
            message: "Facility created successfully",
            data: { facility_id: facilityId }
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            success: false,
            message: "Unable to process. Please try again.",
            error: e.response ? e.response.data : e.message
        });
    }
};

let listFacilities = async function (req, res) {
    try {
        let offset = parseInt(req.query.offset ?? req.query._offset) || 0;
        let count = parseInt(req.query.count ?? req.query._count) || 10;

        let orgQuery = {
            type: "facility",
            _revinclude: "Location:organization:Organization",
            _total: "accurate",
            _count: count,
            _offset: offset
        };

        let orgResponse = await bundleOp.searchData(config.baseUrl + "Organization", orgQuery);
        let entries = orgResponse.data.entry || [];
        let total = orgResponse.data.total || 0;

        let orgResources = entries.filter(e => e.resource.resourceType === "Organization").map(e => e.resource);
        let locationResources = entries.filter(e => e.resource.resourceType === "Location").map(e => e.resource);

        let facilities = await Promise.all(orgResources.map(async (org) => {
            let location = locationResources.find(loc =>
                loc.managingOrganization?.reference === "Organization/" + org.id
            );

            let patientCount = 0;
            let patientUuids = [];
            try {
                let patientRes = await axios.get(config.baseUrl + "Patient", {
                    params: { organization: "Organization/" + org.id, _elements: "identifier", _total: "accurate", _count: 10000 }
                });
                patientCount = patientRes.data.total || 0;
                if (patientRes.data.entry) {
                    patientRes.data.entry.forEach(entry => {
                        let uuidId = entry.resource.identifier?.find(
                            id => id.system === "https://www.thelattice.in/"
                        );
                        if (uuidId) patientUuids.push(uuidId.value);
                    });
                }
            } catch (e) {
                console.error("Patient fetch failed for org", org.id);
            }

            let lastSyncDate = null;
            if (patientUuids.length > 0) {
                let syncResult = await model.userTimeMap.findOne({
                    attributes: [[Sequelize.fn('max', Sequelize.col('timestamp')), 'last_sync_date']],
                    where: { uuid: { [Sequelize.Op.in]: patientUuids } },
                    raw: true
                });
                if (syncResult?.last_sync_date) {
                    lastSyncDate = syncResult.last_sync_date.toISOString().split("T")[0];
                }
            }

            let address = org.address?.[0] || {};
            let blockCode = address.extension?.find(e => e.url === "https://lattice.in/extension/address-block-code")?.valueString || null;
            let stateCode = address.extension?.find(e => e.url === "https://lattice.in/extension/address-state-code")?.valueString || null;
            let distCode = address.extension?.find(e => e.url === "https://lattice.in/extension/address-dist-code")?.valueString || null;
            let googleMapsUrl = null;
            let latitude = null;
            let longitude = null;

            if (location) {
                let mapsExt = location.extension?.find(e => e.url === "https://lattice.in/extension/google-maps-url");
                if (mapsExt) googleMapsUrl = mapsExt.valueString;
                if (location.position) {
                    latitude = location.position.latitude;
                    longitude = location.position.longitude;
                }
            }

            return {
                facility_id: parseInt(org.id),
                name: org.name,
                district: address.district || "",
                block: address.text || "",
                block_code: blockCode,
                state_code: stateCode,
                dist_code: distCode,
                last_sync_date: lastSyncDate,
                total_patients_registered: patientCount,
                google_maps_url: googleMapsUrl,
                latitude: latitude,
                longitude: longitude
            };
        }));

        return res.status(200).json({ success: true, total: total, data: facilities });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            success: false,
            message: "Unable to process. Please try again.",
            error: e.response ? e.response.data : e.message
        });
    }
};

let updateFacility = async function (req, res) {
    try {
        let tokenType = req.token?.type;

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ success: false, message: "Validation failed", errors: errors.array() });
        }

        let facilityId = req.params.id;
        let facilityData = req.body;
        let { organization, location } = await updateFacilityData(facilityData, facilityId);

        await axios.put(config.baseUrl + "Organization/" + facilityId, organization);

        let locResponse = await axios.get(config.baseUrl + "Location", {
            params: { organization: "Organization/" + facilityId }
        });
        if (locResponse.data.entry && locResponse.data.entry.length > 0) {
            let locId = locResponse.data.entry[0].resource.id;
            location.id = locId;
            await axios.put(config.baseUrl + "Location/" + locId, location);
        } else {
            await axios.post(config.baseUrl + "Location", location);
        }

        return res.status(200).json({
            success: true,
            message: "Facility updated successfully",
            data: { facility_id: parseInt(facilityId) }
        });
    } catch (e) {
        console.error(e);
        return res.status(500).json({
            success: false,
            message: "Unable to process. Please try again.",
            error: e.response ? e.response.data : e.message
        });
    }
};

let getFacilityById = async function (req, res) {
    try {
        let facilityId = req.params.id;

        let orgResponse = await axios.get(config.baseUrl + "Organization/" + facilityId);
        let org = orgResponse.data;

        let locResponse = await axios.get(config.baseUrl + "Location", {
            params: { organization: "Organization/" + facilityId }
        });
        let location = locResponse.data.entry?.[0]?.resource || null;

        let patientCount = 0;
        let patientUuids = [];
        try {
            let patientRes = await axios.get(config.baseUrl + "Patient", {
                params: { organization: "Organization/" + facilityId, _elements: "identifier", _total: "accurate", _count: 10000 }
            });
            patientCount = patientRes.data.total || 0;
            if (patientRes.data.entry) {
                patientRes.data.entry.forEach(entry => {
                    let uuidId = entry.resource.identifier?.find(
                        id => id.system === "https://www.thelattice.in/"
                    );
                    if (uuidId) patientUuids.push(uuidId.value);
                });
            }
        } catch (e) {
            console.error("Patient fetch failed for org", facilityId);
        }

        let lastSyncDate = null;
        if (patientUuids.length > 0) {
            let syncResult = await model.userTimeMap.findOne({
                attributes: [[Sequelize.fn('max', Sequelize.col('timestamp')), 'last_sync_date']],
                where: { uuid: { [Sequelize.Op.in]: patientUuids } },
                raw: true
            });
            if (syncResult?.last_sync_date) {
                lastSyncDate = syncResult.last_sync_date.toISOString().split("T")[0];
            }
        }

        let address = org.address?.[0] || {};
        let blockCode = address.extension?.find(e => e.url === "https://lattice.in/extension/address-block-code")?.valueString || null;
        let stateCode = address.extension?.find(e => e.url === "https://lattice.in/extension/address-state-code")?.valueString || null;
        let distCode = address.extension?.find(e => e.url === "https://lattice.in/extension/address-dist-code")?.valueString || null;
        let googleMapsUrl = null;
        let latitude = null;
        let longitude = null;

        if (location) {
            let mapsExt = location.extension?.find(e => e.url === "https://lattice.in/extension/google-maps-url");
            if (mapsExt) googleMapsUrl = mapsExt.valueString;
            if (location.position) {
                latitude = location.position.latitude;
                longitude = location.position.longitude;
            }
        }

        return res.status(200).json({
            success: true,
            data: {
                facility_id: parseInt(org.id),
                name: org.name,
                district: address.district || "",
                block: address.text || "",
                block_code: blockCode,
                state_code: stateCode,
                dist_code: distCode,
                last_sync_date: lastSyncDate,
                total_patients_registered: patientCount,
                google_maps_url: googleMapsUrl,
                latitude: latitude,
                longitude: longitude
            }
        });
    } catch (e) {
        console.error(e);
        if (e.response?.status === 404) {
            return res.status(404).json({ success: false, message: "Facility not found" });
        }
        return res.status(500).json({
            success: false,
            message: "Unable to process. Please try again.",
            error: e.response ? e.response.data : e.message
        });
    }
};

module.exports = { createFacility, listFacilities, updateFacility, getFacilityById };
