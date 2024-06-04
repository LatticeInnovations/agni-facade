const Joi = require("joi");




function resourceValidation(userInput) {
  let JoiSchema = Joi.object({
    resourceType: Joi.string().valid("Patient", "Medication", "Practitioner", "RelatedPerson", "MedicationRequest", "Organization", "PractitionerRole", "Schedule", "Appointment", ).required()
  });
  return JoiSchema.validate(userInput);
}

function validTimestamp(data){
  let JoiSchema = Joi.array().min(1).max(20).required().items(Joi.object({
    uuid : Joi.string().required(),
    timestamp : Joi.required(),
  }));
  return JoiSchema.validate(data);
}

module.exports = {resourceValidation, validTimestamp}