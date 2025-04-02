let router = require('express').Router();
let auth = require("../../middleware/checkAuth");
router.use("/auth", require("./authentication"));
router.use("/user", auth, require("./user"));
router.use("/sct", auth, require("./snomedCT"));
router.use("/timestamp", auth, require('./timestamp'));
router.use('/upload', auth, require('./fileUpload'));
router.use("/vaccine", auth, require("./vaccine"));
router.use("/Practitioner", auth, require("./practitionerRoute"))
router.use("/PractitionerRole", auth, require("./practitionerRoleRoute"))
router.use("/Organization", auth, require("./organizationRoute"))
router.use("/Patient", auth, require("./patientRoute"))
router.use("/RelatedPerson", auth, require("./relatedPersonRoute"))
router.use("/Schedule", auth, require("./scheduleRoute"))
router.use("/Appointment", auth, require("./appointmentRoute"));
router.use("/Vital", auth, require("./vitalRoute"));
router.use("/SympDx", auth, require("./symDiagRoute"));
router.use("/Medication", auth, require("./medicationRoute"));
router.use("/Prescription", auth, require("./prescriptionRoute"));

module.exports = router;