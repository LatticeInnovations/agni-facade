let express = require("express");
let router = express.Router();
let checkRole = require("../../middleware/checkRole");
let patientController = require("../../controllers/managePatientMaster");

router.get("/patient", checkRole(["224608005", "analyst"]), patientController.getPatients);

module.exports = router;
