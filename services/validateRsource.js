
let { body, param } = require("express-validator");

exports.validate = async(req) => {
    console.log("resourceType is: ", req.params)
    switch (req.params.resourceType) {
        case 'patient': {
            return [
                await body().isArray(),
                await body('*.id', 'id does not exists').exists(),
                await body('*.firstName', 'Invalid details').exists().isAlpha(),
                await body('*.middleName').optional().isAlpha(),
                await body('*.lastName').optional().isAlpha(),
                await body('*.identifier').isArray().exists(),
                await body("*.identifier.*.identifierType").exists(),
                await body("*.identifier.*.identifierNumber").exists(),
                await body("*.gender").exists().isIn(["male", "female", "other", "unknown"]),
                await body("*.birthDate").exists().isDate(),
                await body("*.mobileNumber").exists().isNumeric().isLength({ min: 10, max: 10 }),
                await body("*.email").optional().isEmail(),
                await body("*.permanentAddress").isObject().exists(),
                await body("*.permanentAddress.addressLine1").exists(),
                await body("*.permanentAddress.addressLine2").optional(),
                await body("*.permanentAddress.city").exists().isAlpha(),
                await body("*.permanentAddress.state").exists().isAlpha(),
                await body("*.permanentAddress.country").optional().isAlpha(),
                await body("*.permanentAddress.district").optional().isAlpha(),
                await body("*.permanentAddress.postalCode").exists().isNumeric().isLength({ min: 6, max: 6 }),
            ]
        }
    }
}

