const config = require("../config/nodeConfig");
const db = require('../models/index');
const userRole = require("../utils/role.json")

// Get user profile
let getUserProfile = async function (req, res, next) {
    try {
        let userDetail = await db.user_master.findOne({
            attributes: ['user_id', 'user_name', 'role_id', "user_email", "mobile_number", 'is_active'],
            where: { "user_id": req.decoded.userId }
        });
        if(userDetail !== null) {
            userDetail.role = userRole[userDetail.role_id.toString()];
            console.log(userRole, userDetail);
            let data = {
                "userId" : userDetail.dataValues.user_id,
                "userName" : userDetail.dataValues.user_name,
                "userEmail" : userDetail.dataValues.user_email,
                "mobileNumber" : userDetail.dataValues.mobile_number,
                "roleId" : userDetail.dataValues.role_id,
                "role" : userRole[userDetail.dataValues.role_id]
            }
            return res.status(200).json({ status: 1, "message": "Data fetched successfully", data: data });
        }
        else 
        return res.status(404).json({ status: 1, "message": "Data not found", data: userDetail }); 
    }
    catch (e) {
        console.error(e);
        if (e.code && e.code == "ERR") {
            let statusCode = e.statusCode ? e.statusCode : 500;
            return res.status(statusCode).json({
                status: 0,
                message: e.message
            })
        }
        return res.status(500).json({
            status: 0,
            message: "Unable to process. Please try again.",
            error: e
        })
    }

}


module.exports = {
    getUserProfile
}