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
    
    // Get user ID for artifact paths
    const userId = req.user._id.toString();
    
    // Add user-specific artifact paths if not provided
    const workflowParams = { ...parameters } || {};
    

    if (!workflowParams.artifactOutputPath) {
      workflowParams.artifactOutputPath = 'public/output';
    }
    const unauthorizedParams = Object.keys(workflowParams).filter(key => workflowParams[key].includes('/') && (!workflowParams[key].startsWith(`${userId}`) && !workflowParams[key].startsWith('public')));

    if(unauthorizedParams.length > 0) {
      return next(createError(400, `Artifacts must be within your private or public folder: ${unauthorizedParams.join(', ')}`));
    }
    
    // Convert parameters to the format expected by Argo
    const argoParameters = [];
    
    for (const [key, value] of Object.entries(workflowParams)) {
      argoParameters.push({
        name: key,
        value: value.toString()
      });
    }
    
    // Create Argo workflow from template
    console.log(`[Workflow] Creating workflow "${name}" from template "${templateName}"`);
    console.log('[Workflow] Parameters:', workflowParams);
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
      parameters: workflowParams,
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
    
    const workflow = await Workflow.findOne({
      _id: id,
      createdBy: req.user._id
    });
    
    if (!workflow) {
      return next(createError(404, 'Workflow not found'));
    }
    
    // Get logs from Argo
    const logs = await argoService.getWorkflowLogs(workflow.argoWorkflowName);
    
    res.json({
      logs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Suspend a workflow
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware
 */
exports.suspendWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });
    
    if (!workflow) {
      return next(createError(404, 'Workflow not found'));
    }
    
    // Only allow suspending running workflows
    if (workflow.status !== 'Running') {
      return next(createError(400, 'Only running workflows can be suspended'));
    }
    
    // Suspend in Argo
    await argoService.suspendWorkflow(workflow.argoWorkflowName);
    
    // Update status
    workflow.status = 'Suspended';
    await workflow.save();
    
    res.json({
      message: 'Workflow suspended successfully',
      workflow
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resume a workflow
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware
 */
exports.resumeWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });
    
    if (!workflow) {
      return next(createError(404, 'Workflow not found'));
    }
    
    // Only allow resuming suspended workflows
    if (workflow.status !== 'Suspended') {
      return next(createError(400, 'Only suspended workflows can be resumed'));
    }
    
    // Resume in Argo
    await argoService.resumeWorkflow(workflow.argoWorkflowName);
    
    // Update status
    workflow.status = 'Running';
    await workflow.save();
    
    res.json({
      message: 'Workflow resumed successfully',
      workflow
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update workflow status from an Argo workflow event
 * @param {Object} argoWorkflow - The Argo workflow object from event
 * @returns {Promise<Object|null>} - Updated workflow or null if not found
 */
exports.updateWorkflowStatus = async (argoWorkflow) => {
  try {
    if (!argoWorkflow || !argoWorkflow.metadata || !argoWorkflow.metadata.name) {
      console.error('Invalid Argo workflow object received for status update');
      return null;
    }

    const argoWorkflowName = argoWorkflow.metadata.name;
    console.log(`[WorkflowController] Updating status for workflow: ${argoWorkflowName}`);

    // Find the workflow in the database
    const workflow = await Workflow.findOne({ argoWorkflowName });
    
    if (!workflow) {
      console.error(`[WorkflowController] Workflow not found for Argo name: ${argoWorkflowName}`);
      return null;
    }

    // Extract status from Argo workflow
    const argoStatus = argoWorkflow.status?.phase;
    let newStatus = workflow.status;

    // Map Argo status to our status
    if (argoStatus) {
      switch (argoStatus) {
        case 'Pending':
          newStatus = 'Pending';
          break;
        case 'Running':
          newStatus = 'Running';
          break;
        case 'Succeeded':
          newStatus = 'Succeeded';
          break;
        case 'Failed':
          newStatus = 'Failed';
          break;
        case 'Error':
          newStatus = 'Failed';
          break;
        default:
          console.log(`[WorkflowController] Unknown status: ${argoStatus}`);
      }
    }

    // Track if any updates were made to require saving
    let requiresSave = false;

    // Update status if changed
    if (workflow.status !== newStatus) {
      console.log(`[WorkflowController] Updating workflow ${workflow._id} status from ${workflow.status} to ${newStatus}`);
      
      workflow.status = newStatus;
      requiresSave = true;
      
      // Update timestamps based on status
      if (['Running'].includes(newStatus) && !workflow.startedAt) {
        workflow.startedAt = new Date();
      }
      
      if (['Succeeded', 'Failed', 'Terminated'].includes(newStatus) && !workflow.finishedAt) {
        workflow.finishedAt = new Date();
      }
    }

    // Update artifacts if workflow is completed or running
    if (['Running', 'Succeeded', 'Failed'].includes(newStatus)) {
      // Extract artifacts from Argo workflow
      const artifacts = extractArtifactsFromArgoWorkflow(argoWorkflow, workflow);
      
      if (artifacts && artifacts.length > 0) {
        console.log(`[WorkflowController] Updating workflow ${workflow._id} with ${artifacts.length} artifacts`);
        workflow.artifacts = artifacts;
        requiresSave = true;
      }
    }
    
    // Save if any updates were made
    if (requiresSave) {
      await workflow.save();
      console.log(`[WorkflowController] Workflow ${workflow._id} updated successfully`);
      return workflow;
    } else {
      console.log(`[WorkflowController] No changes for workflow ${workflow._id}`);
      return workflow;
    }
  } catch (error) {
    console.error(`[WorkflowController] Error updating workflow status: ${error.message}`);
    return null;
  }
};

/**
 * Extract artifacts from Argo workflow and merge with existing artifacts
 * @param {Object} argoWorkflow - The Argo workflow object from event
 * @param {Object} workflow - The workflow from MongoDB
 * @returns {Array} - Merged array of artifact objects
 */

const extractArtifactsFromArgoWorkflow = (argoWorkflow, workflow) => {
  try {
    const artifacts = [];

    // Extract top-level workflow outputs artifacts - only present in completed workflows
    if (argoWorkflow.status?.outputs?.artifacts) {
      for (const argoArtifact of argoWorkflow.status.outputs.artifacts) {
        // Only consider s3 artifacts
        if (argoArtifact.s3) {
          artifacts.push({
            name: argoArtifact.name,
            path: argoArtifact.path || '',
            s3: {
              bucket: argoArtifact.s3.bucket,
              key: argoArtifact.s3.key
            }
          });
        }
      }
    }

    // Extract artifacts from nodes - only actual generated artifacts, not template definitions
    if (argoWorkflow.status?.nodes) {
      const nodes = Object.values(argoWorkflow.status.nodes);
      
      for (const node of nodes) {
        // Only extract artifacts from completed or running nodes that have actual outputs
        // We can verify a node has real outputs if it has phase Succeeded
        const nodeCompleted = node.phase === 'Succeeded';
        
        if (nodeCompleted && node.outputs?.artifacts) {
          for (const nodeArtifact of node.outputs.artifacts) {
            // Skip log artifacts unless specifically configured to include them
            if (nodeArtifact.name === 'main-logs' && !nodeArtifact.path) {
              continue;
            }
            
            // Only consider s3 artifacts and avoid duplicates
            if (nodeArtifact.s3 && !artifacts.some(a => 
              a.name === nodeArtifact.name && 
              a.s3.bucket === nodeArtifact.s3.bucket && 
              a.s3.key === nodeArtifact.s3.key)) {
              
              artifacts.push({
                name: nodeArtifact.name,
                path: nodeArtifact.path || '',
                s3: {
                  bucket: nodeArtifact.s3.bucket || 'pipeline-runner-artifacts',
                  key: nodeArtifact.s3.key
                }
              });
            }
          }
        }
      }
    }
    
    // Merge artifacts from the workflow.artifacts property if it exists
    if (workflow?.artifacts && Array.isArray(workflow.artifacts)) {
      for (const workflowArtifact of workflow.artifacts) {
        // Only consider valid workflow artifacts with s3 data
        if (workflowArtifact.s3) {
          // Check if this artifact already exists in our list to avoid duplications
          const isDuplicate = artifacts.some(a => 
            a.name === workflowArtifact.name && 
            a.s3.bucket === workflowArtifact.s3.bucket && 
            a.s3.key === workflowArtifact.s3.key
          );
          
          // Add to artifacts list if not a duplicate
          if (!isDuplicate) {
            artifacts.push({
              name: workflowArtifact.name,
              path: workflowArtifact.path || '',
              s3: {
                bucket: workflowArtifact.s3.bucket,
                key: workflowArtifact.s3.key
              }
            });
          }
        }
      }
    }
    
    // For workflows that haven't completed yet, we should not try to infer artifacts
    // from templates as they don't exist yet on S3
    
    console.log(`[WorkflowController] Extracted ${artifacts.length} artifacts from Argo workflow with phase: ${argoWorkflow.status?.phase || 'unknown'}`);
    return artifacts;
  } catch (error) {
    console.error(`[WorkflowController] Error extracting artifacts: ${error.message}`);
    return [];
  }
};

