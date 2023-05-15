let router = require('express').Router();
let bodyParser = require('body-parser');
router.use(bodyParser.json()); // support json encoded bodies
router.use(bodyParser.urlencoded({ extended: true }));
let jwt = require('jsonwebtoken');
let secretKey = require('../config/nodeConfig').jwtSecretKey;


//middleware to verify the
router.use(function (req, res, next) {
    // check header or url parameters or post parameters for token
    let tokenData = req.headers['x-access-token'];

    // decode token
    if (tokenData) {
        let token = tokenData.split(" ")[1];
        console.log("token is", token)
        // verifies secret and checks exp
        jwt.verify(token, secretKey,function (err, decoded) {
            if (err) {
                console.log("dsadsad", err)
                return res.status(401).json({ error: 1, message: 'Failed to authenticate token.' });
            } else if (decoded.user_type_id && isBlocked(decoded)) {
                console.log("dsadsad1", decoded)
                return res.status(401).json({ error: 1, message: 'Failed to authenticate token.' });
            } else {
                // if everything is good, save to request for use in other routes
                console.log(decoded);
                req.decoded = decoded;
                next();
            }
        });
    } else {
        // if there is no token
        // return an error
        return res.status(403).send({ success: 0, message: 'No token provided.' });
    }
});

// check user is blocked or not





module.exports = router;