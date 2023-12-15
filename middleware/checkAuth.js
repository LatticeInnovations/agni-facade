let router = require('express').Router();
let bodyParser = require('body-parser');
let config = require("../config/nodeConfig");
router.use(bodyParser.json()); // support json encoded bodies
router.use(bodyParser.urlencoded({ extended: true }));
let jwt = require('jsonwebtoken');
let secretKey = require('../config/nodeConfig').jwtSecretKey;

//middleware to verify the
router.use(async function (req, res, next) {

    try {
            // check header or url parameters or post parameters for token
    let tokenData = req.headers['authorization'];

    // decode token
    if (tokenData) {
        let token = tokenData.split(" ")[1];
        // verifies secret and checks exp
        jwt.verify(token, secretKey,function (err, decoded) {
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
                req.token = token;
                next();
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



module.exports = router;