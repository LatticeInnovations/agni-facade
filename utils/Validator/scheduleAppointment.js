const Joi = require("joi");

function scheduleValidation(userInput) {
  let JoiSchema = Joi.object({
    uuid: Joi.string()
      .min(30)
      .max(100)
      .required(),
    planningHorizon: Joi.object({
      start: Joi.date().required(),
      end: Joi.date().greater(Joi.ref("start")).required()
    }).required(),
    orgId: Joi.string().required()
  });
  return JoiSchema.validate(userInput);
}


function apptValidation(userInput) {
  let JoiSchema = Joi.object({
    uuid: Joi.string()
      .min(30)
      .max(100)
      .required(),
    slot: Joi.object({
      start: Joi.date().required(),
      end: Joi.date().greater(Joi.ref("start")).required()
    }).required(),
    createdOn: Joi.date().required(),
    status: Joi.string().valid('arrived', 'walkin', 'scheduled', 'noshow', 'cancelled', 'in-progress', 'completed').required(),
    patientId: Joi.string().required(),
    scheduleId: Joi.string().required(),
    orgId: Joi.string().required(),
    appointmentType: Joi.string().valid('walkin', 'routine').required()
  });
  return JoiSchema.validate(userInput);
}

function apptPatchValidation(userInput) {
  let JoiSchema = Joi.object({
    "appointmentId": Joi.string().required(),
    "generatedOn": Joi.date().optional(),
    status: Joi.object({
      "operation": Joi.string().valid('replace').required(),
      "value": Joi.string().valid('arrived', 'scheduled', 'noshow', 'cancelled', 'in-progress', 'completed').required()
    }).required() ,
    slot: Joi.object({
      "operation": Joi.string().valid('replace').required(),
      "value": Joi.object({
        start: Joi.date().required(),
        end: Joi.date().greater(Joi.ref("start")).required()
      }) }).when('status.value', { is: "scheduled", then: Joi.required(), otherwise: Joi.optional() }),
    createdOn: Joi.object({
      "operation": Joi.string().valid('replace').required(),
      "value":Joi.date().required()
    }).when('status.value', { is: "scheduled", then: Joi.required(), otherwise: Joi.optional() }),
    scheduleId: Joi.object({
      "operation": Joi.string().valid('replace').required(),
      "value": Joi.string().required()
    }).when('status.value', { is: "scheduled", then: Joi.required(), otherwise: Joi.optional() })
  });
  return JoiSchema.validate(userInput);
}


module.exports = { scheduleValidation, apptValidation, apptPatchValidation }