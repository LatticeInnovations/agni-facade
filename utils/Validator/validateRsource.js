const Joi = require("joi");

function resourceValidation(userInput) {
  let JoiSchema = Joi.object({
    resourceType: Joi.string().valid("Patient", "Practitioner", "Organization", "PractitionerRole").required()
  });
  return JoiSchema.validate(userInput);
}

module.exports = {resourceValidation}