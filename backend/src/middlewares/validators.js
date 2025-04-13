const Joi = require('joi');
const createError = require('http-errors');

/**
 * Validate request body against a schema
 * @param {Object} schema - The Joi schema to validate against
 * @returns {Function} Middleware function
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return next(createError(400, error.details[0].message));
    }
    
    next();
  };
};

// Schema for user registration
const registerSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required()
});

// Schema for user login
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Schema for changing password
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required()
});

// Schema for creating a workflow
const createWorkflowSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow('', null),
  templateName: Joi.string().required(),
  parameters: Joi.object().pattern(
    Joi.string(),
    Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean())
  )
});

// Schema for creating a template
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
  category: Joi.string().valid('Data Processing', 'Machine Learning', 'Visualization', 'Other')
});

// Schema for updating a template
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
  category: Joi.string().valid('Data Processing', 'Machine Learning', 'Visualization', 'Other')
}).min(1);

module.exports = {
  validateRegister: validate(registerSchema),
  validateLogin: validate(loginSchema),
  validateChangePassword: validate(changePasswordSchema),
  validateCreateWorkflow: validate(createWorkflowSchema),
  validateCreateTemplate: validate(createTemplateSchema),
  validateUpdateTemplate: validate(updateTemplateSchema)
};