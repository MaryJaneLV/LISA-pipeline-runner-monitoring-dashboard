const Joi = require('joi');
const createError = require('http-errors');

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return next(createError(400, error.details[0].message));
    }
    
    next();
  };
};

const registerSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required()
});

const createWorkflowSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow('', null),
  templateName: Joi.string().required(),
  parameters: Joi.object().pattern(
    Joi.string(),
    Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean())
  )
});

const createTemplateSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow('', null),
  template: Joi.string().required(),
  parameters: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      description: Joi.string().allow('', null),
      type: Joi.string().valid('string', 'number', 'boolean', 'file', 'reference').default('string'),
      default: Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean()),
      required: Joi.boolean().default(false)
    })
  ),
  isPublic: Joi.boolean(),
});

const updateTemplateSchema = Joi.object({
  description: Joi.string().allow('', null),
  template: Joi.string(),
  parameters: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      description: Joi.string().allow('', null),
      type: Joi.string().valid('string', 'number', 'boolean', 'file', 'reference').default('string'),
      default: Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean()),
      required: Joi.boolean().default(false)
    })
  ),
  isPublic: Joi.boolean(),
}).min(1);

module.exports = {
  validateRegister: validate(registerSchema),
  validateLogin: validate(loginSchema),
  validateChangePassword: validate(changePasswordSchema),
  validateCreateWorkflow: validate(createWorkflowSchema),
  validateCreateTemplate: validate(createTemplateSchema),
  validateUpdateTemplate: validate(updateTemplateSchema)
};