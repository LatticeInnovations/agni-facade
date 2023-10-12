let router = require('express').Router();
let bodyParser = require('body-parser');
let config = require("../config/nodeConfig");
router.use(bodyParser.json()); // support json encoded bodies
router.use(bodyParser.urlencoded({ extended: true }));
let jwt = require('jsonwebtoken');
let secretKey = require('../config/nodeConfig').jwtSecretKey;


//middleware to verify the
router.use(function (req, res, next) {
    // check header or url parameters or post parameters for token
    console.log(req.headers)
    let tokenData = req.headers['authorization'];

    // decode token
    if (tokenData) {
        let token = tokenData.split(" ")[1];
        // verifies secret and checks exp
        jwt.verify(token, secretKey,function (err, decoded) {
            if (err) {
                    console.error(err, err.name )
                    if(err.name == 'TokenExpiredError')
                        return res.status(401).json({ status: 0, message: 'Session expired.' });
                    else
                        return res.status(401).json({ status: 0, message: 'Unauthorized' });
            } else {
                // if everything is good, save to request for use in other routes
              
                req.decoded = decoded;
                req.token = config.authToken
                console.log("token check:============>",  req.token);
                next();
            }
        });
    } else {
        // if there is no token
        // return an error
        return res.status(403).send({ status: 0, message: 'No token provided.' });
    }
});

// check user is blocked or not





module.exports = router;