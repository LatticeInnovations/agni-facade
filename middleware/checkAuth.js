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
              
                let practitionerData = await getUserData(req.decoded.user_id);
                console.info(req.decoded, practitionerData)
                if(practitionerData.length < 1) {
                    return res.status(401).json({ status: 0, message: 'Unauthorized' });
                }
                else if(!JSON.parse(practitionerData[0].res_text_vc).active){
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



module.exports = router;