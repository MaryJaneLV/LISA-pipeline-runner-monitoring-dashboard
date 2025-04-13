const Template = require('../models/template.model');
const argoService = require('../services/argo.service');
const createError = require('http-errors');
const yaml = require('js-yaml');

/**
 * List templates with optional filters
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware
 */
exports.listTemplates = async (req, res, next) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query
    const query = { 
      $or: [
        { isPublic: true },
        { createdBy: req.user._id }
      ]
    };
    
    // Get total count for pagination
    const total = await Template.countDocuments(query);
    
    // Get templates
    const templates = await Template.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    res.json({
      data: templates,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a template by ID
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware
 */
exports.getTemplate = async (req, res, next) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      $or: [
        { isPublic: true },
        { createdBy: req.user._id }
      ]
    }).lean();
    
    if (!template) {
      return next(createError(404, 'Template not found'));
    }
    
    res.json(template);
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new template
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware
 */
exports.createTemplate = async (req, res, next) => {
  try {
    const { name, description, template: templateYaml, parameters, isPublic } = req.body;
    
    // Check if name already exists
    const existingTemplate = await Template.findOne({ name });
    
    if (existingTemplate) {
      return next(createError(409, 'Template with this name already exists'));
    }
    
    // Create template in Argo
    try {
      console.log(`[Template] Creating new template "${name}" with YAML:`, templateYaml);
      
      // Parse the template YAML properly using js-yaml
      let templateObj;
      
      try {
        // Try parsing as YAML first
        console.log('[Template] Attempting to parse as YAML');
        templateObj = yaml.load(templateYaml);
        console.log('[Template] Successfully parsed YAML:', JSON.stringify(templateObj, null, 2));
      } catch (yamlError) {
        console.log('[Template] YAML parsing failed:', yamlError.message);
        try {
          // If YAML parsing fails, try evaluating as JavaScript object (for backward compatibility)
          console.log('[Template] Attempting to parse as JavaScript object');
          templateObj = JSON.parse(JSON.stringify(eval(`(${templateYaml})`)));
          console.log('[Template] Successfully parsed JS object:', JSON.stringify(templateObj, null, 2));
        } catch (jsError) {
          console.error('[Template] Both YAML and JS parsing failed:', jsError.message);
          return next(createError(400, `Invalid template format: ${yamlError.message}`));
        }
      }
      
      console.log(`[Template] Original kind: ${templateObj.kind || 'not specified'}`);
      
      // Convert a Workflow to a WorkflowTemplate if needed
      if (templateObj.kind === 'Workflow') {
        console.log('[Template] Converting Workflow to WorkflowTemplate');
        // Create a WorkflowTemplate from the Workflow
        const workflowTemplate = {
          apiVersion: templateObj.apiVersion,
          kind: 'WorkflowTemplate',
          metadata: {
            name: name, // Use the provided template name
            namespace: templateObj.metadata?.namespace || 'scientific-workflow'
          },
          spec: templateObj.spec
        };
        
        // Remove generateName if it exists
        if (templateObj.metadata?.generateName) {
          console.log(`[Template] Removing generateName: ${templateObj.metadata.generateName}`);
          delete workflowTemplate.metadata.generateName;
        }
        
        // Use the WorkflowTemplate instead
        templateObj = workflowTemplate;
        console.log('[Template] Converted to WorkflowTemplate:', JSON.stringify(templateObj, null, 2));
      } else if (!templateObj.kind || templateObj.kind !== 'WorkflowTemplate') {
        console.log(`[Template] Setting kind to WorkflowTemplate (was: ${templateObj.kind || 'not set'})`);
        templateObj.kind = 'WorkflowTemplate';
        if (!templateObj.metadata) {
          console.log('[Template] Creating metadata object');
          templateObj.metadata = {};
        }
        templateObj.metadata.name = name;
      }
      
      // Ensure the template has a name
      if (!templateObj.metadata.name) {
        console.log(`[Template] Setting metadata.name to "${name}"`);
        templateObj.metadata.name = name;
      }
      
      console.log('[Template] Final template object before submission:', JSON.stringify(templateObj, null, 2));
      
      console.log('[Template] Submitting to Argo service');
      await argoService.createWorkflowTemplate(templateObj);
      console.log('[Template] Successfully created template in Argo');
    } catch (error) {
      console.error('[Template] Error creating template in Argo:', error.message);
      return next(createError(400, `Template error: ${error.message}`));
    }
    
    // Create template in DB
    const template = new Template({
      name,
      description,
      template: templateYaml,
      parameters: parameters || [],
      isPublic: isPublic !== undefined ? isPublic : true,
      createdBy: req.user._id
    });
    
    await template.save();
    console.log(`[Template] Saved template "${name}" to database`);
    
    res.status(201).json({
      message: 'Template created successfully',
      template
    });
  } catch (error) {
    console.error('[Template] Unexpected error in createTemplate:', error.message);
    next(error);
  }
};

/**
 * Update a template
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware
 */
exports.updateTemplate = async (req, res, next) => {
  try {
    const { description, template: templateYaml, parameters, isPublic } = req.body;
    
    // Find the template
    const template = await Template.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });
    
    if (!template) {
      return next(createError(404, 'Template not found or you do not have permission to edit it'));
    }
    
    // Update template in Argo if template YAML changed
    if (templateYaml && templateYaml !== template.template) {
      try {
        console.log(`[Template] Updating template "${template.name}" with new YAML`);
        
        // Parse the template YAML properly using js-yaml
        let templateObj;
        
        try {
          // Try parsing as YAML first
          console.log('[Template] Attempting to parse as YAML');
          templateObj = yaml.load(templateYaml);
          console.log('[Template] Successfully parsed YAML:', JSON.stringify(templateObj, null, 2));
        } catch (yamlError) {
          console.log('[Template] YAML parsing failed:', yamlError.message);
          try {
            // If YAML parsing fails, try evaluating as JavaScript object (for backward compatibility)
            console.log('[Template] Attempting to parse as JavaScript object');
            templateObj = JSON.parse(JSON.stringify(eval(`(${templateYaml})`)));
            console.log('[Template] Successfully parsed JS object:', JSON.stringify(templateObj, null, 2));
          } catch (jsError) {
            console.error('[Template] Both YAML and JS parsing failed:', jsError.message);
            return next(createError(400, `Invalid template format: ${yamlError.message}`));
          }
        }
        
        console.log(`[Template] Original kind: ${templateObj.kind || 'not specified'}`);
        
        // Convert a Workflow to a WorkflowTemplate if needed
        if (templateObj.kind === 'Workflow') {
          console.log('[Template] Converting Workflow to WorkflowTemplate');
          // Create a WorkflowTemplate from the Workflow
          const workflowTemplate = {
            apiVersion: templateObj.apiVersion,
            kind: 'WorkflowTemplate',
            metadata: {
              name: template.name, // Use the existing template name
              namespace: templateObj.metadata?.namespace || 'scientific-workflow'
            },
            spec: templateObj.spec
          };
          
          // Remove generateName if it exists
          if (templateObj.metadata?.generateName) {
            console.log(`[Template] Removing generateName: ${templateObj.metadata.generateName}`);
            delete workflowTemplate.metadata.generateName;
          }
          
          // Use the WorkflowTemplate instead
          templateObj = workflowTemplate;
          console.log('[Template] Converted to WorkflowTemplate:', JSON.stringify(templateObj, null, 2));
        } else if (!templateObj.kind || templateObj.kind !== 'WorkflowTemplate') {
          console.log(`[Template] Setting kind to WorkflowTemplate (was: ${templateObj.kind || 'not set'})`);
          templateObj.kind = 'WorkflowTemplate';
          if (!templateObj.metadata) {
            console.log('[Template] Creating metadata object');
            templateObj.metadata = {};
          }
          templateObj.metadata.name = template.name;
        }
        
        // Ensure the template has the correct name
        if (!templateObj.metadata.name || templateObj.metadata.name !== template.name) {
          console.log(`[Template] Setting metadata.name to "${template.name}"`);
          templateObj.metadata.name = template.name;
        }
        
        console.log('[Template] Final template object before submission:', JSON.stringify(templateObj, null, 2));
        
        console.log('[Template] Submitting to Argo service');
        await argoService.updateWorkflowTemplate(template.name, templateObj);
        console.log('[Template] Successfully updated template in Argo');
        
        // Update the template YAML
        template.template = templateYaml;
      } catch (error) {
        console.error('[Template] Error updating template in Argo:', error.message);
        return next(createError(400, `Template error: ${error.message}`));
      }
    }
    
    // Update fields
    if (description !== undefined) template.description = description;
    if (parameters !== undefined) template.parameters = parameters;
    if (isPublic !== undefined) template.isPublic = isPublic;
    
    // Increment version
    const versionParts = template.version.split('.');
    versionParts[2] = (parseInt(versionParts[2]) + 1).toString();
    template.version = versionParts.join('.');
    
    await template.save();
    console.log(`[Template] Saved updated template "${template.name}" to database`);
    
    res.json({
      message: 'Template updated successfully',
      template
    });
  } catch (error) {
    console.error('[Template] Unexpected error in updateTemplate:', error.message);
    next(error);
  }
};

/**
 * Delete a template
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware
 */
exports.deleteTemplate = async (req, res, next) => {
  try {
    const template = await Template.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });
    
    if (!template) {
      return next(createError(404, 'Template not found or you do not have permission to delete it'));
    }
    
    // Delete from Argo
    try {
      console.log(`[Template] Deleting template "${template.name}" from Argo`);
      await argoService.deleteWorkflowTemplate(template.name);
      console.log(`[Template] Successfully deleted template "${template.name}" from Argo`);
    } catch (error) {
      console.error(`[Template] Error deleting template from Argo: ${error.message}`);
    }
    
    // Delete from DB
    await template.deleteOne();
    console.log(`[Template] Deleted template "${template.name}" from database`);
    
    res.json({
      message: 'Template deleted successfully'
    });
  } catch (error) {
    console.error('[Template] Unexpected error in deleteTemplate:', error.message);
    next(error);
  }
};