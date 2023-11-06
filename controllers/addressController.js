const province = require("../utils/address-map/province.json");
const areaCouncil = require("../utils/address-map/areaCouncil.json");
const island = require("../utils/address-map/island.json");
const addressMap = require("../utils/address-map/address-map.json");

let getProvince = async function (req, res) {

    let addressData = province;

    return res.status(200).json({status: 1, message: "Address fetched", data: addressData})
}

let getAreaCouncil = async function (req, res) {

    let addressData = areaCouncil;

    return res.status(200).json({status: 1, message: "Address fetched", data: addressData})
}

let getIsland = async function (req, res) {

    let addressData = island;

    return res.status(200).json({status: 1, message: "Address fetched", data: addressData})
}

let getAddressMapper = async function (req, res) {

    let addressData = addressMap;

    return res.status(200).json({status: 1, message: "Address fetched", data: addressData})
}
module.exports = {
    getProvince,
    getAreaCouncil,
    getIsland,
    getAddressMapper
}