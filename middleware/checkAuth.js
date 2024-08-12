let router = require('express').Router();
let bodyParser = require('body-parser');
router.use(bodyParser.json()); // support json encoded bodies
router.use(bodyParser.urlencoded({ extended: true }));
let jwt = require('jsonwebtoken');
let secretKey = require('../config/nodeConfig').jwtSecretKey;
const sequelize = require("sequelize");
const db = require('../models/index');

//middleware to verify the
router.use(async function (req, res, next) {

    try {
            // check header or url parameters or post parameters for token
    let tokenData = req.headers['authorization'];

    // decode token
    if (tokenData) {
        let token = tokenData.split(" ")[1];
        // verifies secret and checks exp
        jwt.verify(token, secretKey, async function (err, decoded) {
            if (err) {
                    console.error(err, err.name )
                    if(err.name == 'TokenExpiredError') {
                        return res.status(401).json({ status: 0, message: 'Token expired.' });
                    }                        
                    else
                        return res.status(401).json({ status: 0, message: 'Invalid token.' });
            } else {
                // if everything is good, save to request for use in other routes
                req.decoded = decoded;
                console.info("decoded Token", decoded)
                let practitionerData = await getUserData(req.decoded.user_id);
                let practitionerRoleData = await getPractitionerRoleData(req.decoded.user_id);
                let userData = createUserData(practitionerData, practitionerRoleData);
                console.info(userData)
                if(practitionerData.length < 1) {
                    return res.status(401).json({ status: 0, message: 'Unauthorized' });
                }
                else if(!JSON.parse(practitionerData[0].res_text_vc).active){
                    return res.status(401).json({ status: 0, message: 'Your account has been disabled. Please contact your administrator.' });
                }
                else if((decoded.user_name != userData.user_name) || (decoded.mobile_number != userData.mobile_number) || (decoded.orgId != userData.orgId) || (decoded.roles[0] != userData.roles[0])){
                    return res.status(401).json({ status: 0, message: 'Unauthorized' });
                }
                else {
                    req.token = tokenData;
                    next();
                }

            }
        });
    } else {
        // if there is no token
        // return an error
        return res.status(403).send({ status: 0, message: 'No token provided.' });
    }
    }
    catch(e) {
        console.error(e);
        return res.status(500).json({
            status: 0,
            message: "Unable to process. Please try again."
        })
    }

});

async function getUserData(user_id) {
    try {
        const practitionerResource = await db.sequelize.query(`SELECT res_id, res_type, res_text_vc FROM hfj_res_ver where res_id = ${user_id} and res_type = 'Practitioner' order by res_ver desc limit 1;`,{type: sequelize.QueryTypes.SELECT});
   
        return practitionerResource;
    }
    catch(e) {
        return Promise.reject(e)
    }

    
}

async function getPractitionerRoleData(user_id){
    try{
        const roleResource = await db.sequelize.query(`select res_id, res_type, res_text_vc FROM hfj_res_ver where res_type = 'PractitionerRole' and res_id = 
            (SELECT src_resource_id FROM public.hfj_res_link where source_resource_type = 'PractitionerRole' and target_resource_id=${user_id} order by pId limit 1)  order by res_ver desc limit 1;`,{type: sequelize.QueryTypes.SELECT});
        return roleResource;
    }
    catch(e){
        return Promise.reject(e)
    }
}

const createUserData = (practitionerData, practitionerRoleData) => {
    practitionerData = JSON.parse(practitionerData[0].res_text_vc);
    let user_name = practitionerData.name[0].given.join(' ');
    user_name += practitionerData?.name[0]?.family ? " " + practitionerData.name[0].family : '';
            
    let phone = practitionerData.telecom.filter(e => e.system == "phone");
    let roleData = JSON.parse(practitionerRoleData[0].res_text_vc);
    let roleList = roleData.code[0].coding.map(element => element.code);
    return {
        user_name,
        mobile_number: phone[0].value,
        orgId: roleData.organization.reference.split("/")[1],
        roles: roleList
    }
}


module.exports = router;