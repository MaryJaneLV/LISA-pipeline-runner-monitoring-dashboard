const Workflow = require('../models/workflow.model');
const Template = require('../models/template.model');
const argoService = require('../services/argo.service');
const kafkaService = require('../services/kafka.service');
const createError = require('http-errors');

/**
 * List workflows with optional filters
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware
 */
exports.listWorkflows = async (req, res, next) => {
  try {
    const { status, limit = 10, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query
    const query = { createdBy: req.user._id };
    if (status) {
      query.status = status;
    }
    
    // Get total count for pagination
    const total = await Workflow.countDocuments(query);
    
    // Get workflows
    const workflows = await Workflow.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    res.json({
      data: workflows,
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
 * Get a workflow by ID
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware
 */
exports.getWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    }).lean();
    
    if (!workflow) {
      return next(createError(404, 'Workflow not found'));
    }
    
    // Get Argo workflow details
    let argoWorkflow = null;
    try {
      argoWorkflow = await argoService.getWorkflow(workflow.argoWorkflowName);
    } catch (error) {
      console.error(`Error fetching Argo workflow: ${error.message}`);
    }
    
    res.json({
      workflow,
      argoWorkflow
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new workflow
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware
 */
exports.createWorkflow = async (req, res, next) => {
  try {
    const { name, description, templateName, parameters } = req.body;
    
    // Check if template exists
    const template = await Template.findOne({ name: templateName });
    
    if (!template) {
      return next(createError(404, 'Workflow template not found'));
    }
    
    // Convert parameters to the format expected by Argo
    const argoParameters = [];
    
    for (const [key, value] of Object.entries(parameters || {})) {
      argoParameters.push({
        name: key,
        value: value.toString()
      });
    }
    
    // Create Argo workflow from template
    console.log(`[Workflow] Creating workflow "${name}" from template "${templateName}"`);
    console.log('[Workflow] Parameters:', parameters);
    console.log('[Workflow] Argo parameters:', argoParameters);
    
    const argoWorkflow = {
      apiVersion: 'argoproj.io/v1alpha1',
      kind: 'Workflow',
      metadata: {
        generateName: `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-`,
      },
      spec: {
        workflowTemplateRef: {
          name: templateName
        },
        arguments: {
          parameters: argoParameters
        }
      }
    };
    
    console.log('[Workflow] Submitting to Argo:', JSON.stringify(argoWorkflow, null, 2));
    
    // Submit to Argo
    const result = await argoService.submitWorkflow(argoWorkflow);
    
    console.log('[Workflow] Argo submission result:', JSON.stringify(result, null, 2));
    
    if (!result || !result.metadata || !result.metadata.name) {
      return next(createError(500, 'Failed to create Argo workflow'));
    }
    
    // Create workflow in DB
    const workflow = new Workflow({
      name,
      description,
      templateName,
      argoWorkflowName: result.metadata.name,
      parameters: parameters || {},
      status: 'Pending',
      createdBy: req.user._id
    });
    
    await workflow.save();
    
    // Publish workflow creation event
    await kafkaService.publishWorkflowSubmission({
      id: workflow._id.toString(),
      argoWorkflowName: workflow.argoWorkflowName,
    });
    
    res.status(201).json({
      message: 'Workflow created successfully',
      workflow,
      argoWorkflow: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Terminate a workflow
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware
 */
exports.terminateWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });
    
    if (!workflow) {
      return next(createError(404, 'Workflow not found'));
    }
    
    // Only allow terminating pending or running workflows
    if (!['Pending', 'Running'].includes(workflow.status)) {
      return next(createError(400, 'Cannot terminate a completed workflow'));
    }
    
    // Terminate in Argo
    await argoService.terminateWorkflow(workflow.argoWorkflowName);
    
    // Update status
    workflow.status = 'Terminated';
    workflow.finishedAt = new Date();
    await workflow.save();
    
    res.json({
      message: 'Workflow terminated successfully',
      workflow
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resubmit a workflow
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware
 */
exports.resubmitWorkflow = async (req, res, next) => {
  try {
    const originalWorkflow = await Workflow.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });
    
    if (!originalWorkflow) {
      return next(createError(404, 'Workflow not found'));
    }
    
    // Create a new workflow with the same parameters
    const { name, description, templateName, parameters } = originalWorkflow;
    
    // Convert parameters to the format expected by Argo
    const argoParameters = [];
    
    for (const [key, value] of Object.entries(parameters || {})) {
      argoParameters.push({
        name: key,
        value: value.toString()
      });
    }
    
    // Create Argo workflow from template
    console.log(`[Workflow] Resubmitting workflow "${name}" from template "${templateName}"`);
    console.log('[Workflow] Parameters:', parameters);
    console.log('[Workflow] Argo parameters:', argoParameters);
    
    const argoWorkflow = {
      apiVersion: 'argoproj.io/v1alpha1',
      kind: 'Workflow',
      metadata: {
        generateName: `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-`,
      },
      spec: {
        workflowTemplateRef: {
          name: templateName
        },
        arguments: {
          parameters: argoParameters
        }
      }
    };
    
    console.log('[Workflow] Submitting to Argo:', JSON.stringify(argoWorkflow, null, 2));
    
    // Submit to Argo
    const result = await argoService.submitWorkflow(argoWorkflow);
    
    console.log('[Workflow] Argo submission result:', JSON.stringify(result, null, 2));
    
    if (!result || !result.metadata || !result.metadata.name) {
      return next(createError(500, 'Failed to create Argo workflow'));
    }
    
    // Create a new workflow in DB
    const workflow = new Workflow({
      name: `${name} (Resubmission)`,
      description,
      templateName,
      argoWorkflowName: result.metadata.name,
      parameters: parameters || {},
      status: 'Pending',
      createdBy: req.user._id
    });
    
    await workflow.save();
    
    // Publish workflow creation event
    await kafkaService.publishWorkflowSubmission({
      id: workflow._id.toString(),
      argoWorkflowName: workflow.argoWorkflowName,
    });
    
    res.status(201).json({
      message: 'Workflow resubmitted successfully',
      workflow,
      argoWorkflow: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a workflow
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware
 */
exports.deleteWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });
    
    if (!workflow) {
      return next(createError(404, 'Workflow not found'));
    }
    
    // Delete from Argo if not already completed
    if (!['Succeeded', 'Failed', 'Terminated'].includes(workflow.status)) {
      try {
        await argoService.terminateWorkflow(workflow.argoWorkflowName);
      } catch (error) {
        console.error(`Error terminating workflow: ${error.message}`);
      }
    }
    
    try {
      await argoService.deleteWorkflow(workflow.argoWorkflowName);
    } catch (error) {
      console.error(`Error deleting workflow from Argo: ${error.message}`);
    }
    
    // Delete from DB
    await workflow.deleteOne();
    
    res.json({
      message: 'Workflow deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get workflow logs
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware
 */
exports.getWorkflowLogs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { podName } = req.query;
    
    const workflow = await Workflow.findOne({
      _id: id,
      createdBy: req.user._id
    });
    
    if (!workflow) {
      return next(createError(404, 'Workflow not found'));
    }
    
    if (!podName) {
      return next(createError(400, 'Pod name is required'));
    }
    
    // Get logs from Argo
    const logs = await argoService.getWorkflowLogs(workflow.argoWorkflowName, podName);
    
    res.json({
      logs
    });
  } catch (error) {
    next(error);
  }
};