const Joi = require("joi");




function resourceValidation(userInput) {
  let JoiSchema = Joi.object({
    resourceType: Joi.string().valid("Patient", "Medication", "Practitioner", "RelatedPerson", "MedicationRequest", "Organization", "PractitionerRole", "Schedule", "Appointment", ).required()
  });
  return JoiSchema.validate(userInput);
}

module.exports = {resourceValidation}