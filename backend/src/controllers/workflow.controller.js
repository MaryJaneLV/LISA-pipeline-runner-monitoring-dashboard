const Workflow = require('../models/workflow.model');
const Template = require('../models/template.model');
const argoService = require('../services/argo.service');
const kafkaService = require('../services/kafka.service');
const createError = require('http-errors');

exports.listWorkflows = async (req, res, next) => {
  try {
    const { status, limit = 10, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { createdBy: req.user._id };
    if (status) {
      query.status = status;
    }

    const total = await Workflow.countDocuments(query);

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
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    }).lean();

    if (!workflow) {
      return next(createError(404, 'Workflow not found'));
    }

    let argoWorkflow = null;
    try {
      argoWorkflow = await argoService.getWorkflow(workflow.argoWorkflowName);
    } catch (error) {
      console.error(`Error fetching Argo workflow: ${error.message}`);
    }

    res.json({
      workflow,
      argoWorkflow,
    });
  } catch (error) {
    next(error);
  }
};

exports.createWorkflow = async (req, res, next) => {
  try {
    const { name, description, templateName, parameters } = req.body;

    const template = await Template.findOne({ name: templateName });

    if (!template) {
      return next(createError(404, 'Workflow template not found'));
    }

    const userId = req.user._id.toString();

    const workflowParams = { ...parameters } || {};

    if (!workflowParams.artifactOutputPath) {
      workflowParams.artifactOutputPath = 'public/output';
    }
    const unauthorizedParams = Object.keys(workflowParams).filter(
      (key) =>
        workflowParams[key].includes('/') &&
        !workflowParams[key].startsWith(`${userId}`) &&
        !workflowParams[key].startsWith('public')
    );

    if (unauthorizedParams.length > 0) {
      return next(
        createError(
          400,
          `Artifacts must be within your private or public folder: ${unauthorizedParams.join(
            ', '
          )}`
        )
      );
    }

    const argoParameters = [];

    for (const [key, value] of Object.entries(workflowParams)) {
      argoParameters.push({
        name: key,
        value: value.toString(),
      });
    }

    // Generates a valid Kubernetes workflow name by:
    // 1. Adding 'lisa-workflow-' prefix for identification
    // 2. Converting the workflow name to lowercase
    // 3. Replacing any non-alphanumeric chars with hyphens
    // 4. Appending 5 random alphanumeric characters for uniqueness
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const generatedName = `lisa-workflow-${name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')}-${randomSuffix}`;

    const yaml = require('js-yaml');
    const templateSpec = yaml.load(template.template);
    console.log('Template metrics:', templateSpec.spec?.metrics);
    console.log(templateSpec, 'templateSpec -----');

    const argoWorkflow = {
      apiVersion: 'argoproj.io/v1alpha1',
      kind: 'Workflow',
      metadata: {
        // TODO: change to env variable
        name: generatedName,
      },
      spec: {
        workflowTemplateRef: {
          name: templateName,
        },
        arguments: {
          parameters: argoParameters,
        },
        metrics: {
          prometheus: [
            ...(templateSpec.spec?.metrics?.prometheus || []),
            {
              help: 'The user who created the workflow',
              labels: [
                {
                  key: 'author_id',
                  value: req.user.email,
                },
                {
                  key: 'workflow_name',
                  value: generatedName,
                },
              ],
              counter: {
                value: '1',
              },
              name: 'created_by',
            },
          ],
        },
      },
    };

    // console.log(argoWorkflow, 'argoWorkflow ------------------');

    // Submit to Argo
    const result = await argoService.submitWorkflow(argoWorkflow);

    if (!result || !result.metadata || !result.metadata.name) {
      return next(createError(500, 'Failed to create Argo workflow'));
    }

    const workflow = new Workflow({
      name: generatedName,
      description,
      templateName,
      argoWorkflowName: result.metadata.name,
      parameters: workflowParams,
      status: 'Pending',
      createdBy: req.user._id,
    });

    await workflow.save();

    await kafkaService.publishWorkflowSubmission({
      id: workflow._id.toString(),
      argoWorkflowName: workflow.argoWorkflowName,
    });

    res.status(201).json({
      message: 'Workflow created successfully',
      workflow,
      argoWorkflow: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.terminateWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!workflow) {
      return next(createError(404, 'Workflow not found'));
    }

    if (!['Pending', 'Running'].includes(workflow.status)) {
      return next(createError(400, 'Cannot terminate a completed workflow'));
    }

    await argoService.terminateWorkflow(workflow.argoWorkflowName);

    workflow.status = 'Terminated';
    workflow.finishedAt = new Date();
    await workflow.save();

    res.json({
      message: 'Workflow terminated successfully',
      workflow,
    });
  } catch (error) {
    next(error);
  }
};

exports.resubmitWorkflow = async (req, res, next) => {
  try {
    const originalWorkflow = await Workflow.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!originalWorkflow) {
      return next(createError(404, 'Workflow not found'));
    }

    // Create a new workflow with the same parameters
    const { name, description, templateName, parameters } = originalWorkflow;

    const argoParameters = [];

    for (const [key, value] of Object.entries(parameters || {})) {
      if (!key.startsWith('$') && /^[a-zA-Z0-9_-]+$/.test(key)) {
        argoParameters.push({
          name: key,
          value: value.toString(),
        });
      } else {
        console.log(`[Workflow] Skipping invalid parameter name: ${key}`);
      }
    }

    const argoWorkflow = {
      apiVersion: 'argoproj.io/v1alpha1',
      kind: 'Workflow',
      metadata: {
        generateName: `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-`,
      },
      spec: {
        workflowTemplateRef: {
          name: templateName,
        },
        arguments: {
          parameters: argoParameters,
        },
      },
    };

    const result = await argoService.submitWorkflow(argoWorkflow);

    if (!result || !result.metadata || !result.metadata.name) {
      return next(createError(500, 'Failed to create Argo workflow'));
    }

    const workflow = new Workflow({
      name: `${name} (Resubmission)`,
      description,
      templateName,
      argoWorkflowName: result.metadata.name,
      parameters: parameters || {},
      status: 'Pending',
      createdBy: req.user._id,
    });

    await workflow.save();

    await kafkaService.publishWorkflowSubmission({
      id: workflow._id.toString(),
      argoWorkflowName: workflow.argoWorkflowName,
    });

    res.status(201).json({
      message: 'Workflow resubmitted successfully',
      workflow,
      argoWorkflow: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!workflow) {
      return next(createError(404, 'Workflow not found'));
    }

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

    await workflow.deleteOne();

    res.json({
      message: 'Workflow deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.getWorkflowLogs = async (req, res, next) => {
  try {
    const { id } = req.params;

    const workflow = await Workflow.findOne({
      _id: id,
      createdBy: req.user._id,
    });

    if (!workflow) {
      return next(createError(404, 'Workflow not found'));
    }

    const logs = await argoService.getWorkflowLogs(workflow.argoWorkflowName);

    res.json({
      logs,
    });
  } catch (error) {
    next(error);
  }
};

exports.suspendWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
    });

    if (!workflow) {
      return next(createError(404, 'Workflow not found'));
    }

    if (workflow.status !== 'Running') {
      return next(createError(400, 'Only running workflows can be suspended'));
    }

    await argoService.suspendWorkflow(workflow.argoWorkflowName);

    workflow.status = 'Suspended';
    await workflow.save();

    res.json({
      message: 'Workflow suspended successfully',
      workflow,
    });
  } catch (error) {
    next(error);
  }
};

exports.resumeWorkflow = async (req, res, next) => {
  try {
    const workflow = await Workflow.findOne({
      _id: req.params.id,
      createdBy: req.user._id,
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
      workflow,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateWorkflowStatus = async (argoWorkflow) => {
  try {
    if (
      !argoWorkflow ||
      !argoWorkflow.metadata ||
      !argoWorkflow.metadata.name
    ) {
      console.error('Invalid Argo workflow object received for status update');
      return null;
    }

    const argoWorkflowName = argoWorkflow.metadata.name;

    const workflow = await Workflow.findOne({ argoWorkflowName });

    if (!workflow) {
      console.error(
        `[WorkflowController] Workflow not found for Argo name: ${argoWorkflowName}`
      );
      return null;
    }

    let argoStatus = argoWorkflow.status?.phase;

    const isSuspended = argoStatus === 'Running' && argoWorkflow?.spec?.suspend;
    let newStatus = isSuspended ? 'Suspended' : argoStatus;

    if (
      argoStatus &&
      !['Suspended', 'Pending', 'Running', 'Succeeded', 'Failed'].includes(
        argoStatus
      )
    ) {
      newStatus = argoStatus === 'Error' ? 'Failed' : argoStatus;
      if (argoStatus !== 'Error') {
        console.log(`[WorkflowController] Unknown status: ${argoStatus}`);
      }
    }

    let requiresSave = false;

    if (workflow.status !== newStatus) {
      console.log(
        `[WorkflowController] Updating workflow ${workflow._id} status from ${workflow.status} to ${newStatus}`
      );

      workflow.status = newStatus;
      requiresSave = true;

      if (['Running'].includes(newStatus) && !workflow.startedAt) {
        workflow.startedAt = new Date();
      }

      if (
        ['Succeeded', 'Failed', 'Terminated'].includes(newStatus) &&
        !workflow.finishedAt
      ) {
        workflow.finishedAt = new Date();
      }
    }

    if (['Running', 'Succeeded', 'Failed'].includes(newStatus)) {
      const artifacts = extractArtifactsFromArgoWorkflow(
        argoWorkflow,
        workflow
      );

      if (artifacts && artifacts.length > 0) {
        console.log(
          `[WorkflowController] Updating workflow ${workflow._id} with ${artifacts.length} artifacts`
        );
        workflow.artifacts = artifacts;
        requiresSave = true;
      }
    }

    if (requiresSave) {
      await workflow.save();
      console.log(
        `[WorkflowController] Workflow ${workflow._id} updated successfully`
      );
      return workflow;
    } else {
      console.log(
        `[WorkflowController] No changes for workflow ${workflow._id}`
      );
      return workflow;
    }
  } catch (error) {
    console.error(
      `[WorkflowController] Error updating workflow status: ${error.message}`
    );
    return null;
  }
};

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
              key: argoArtifact.s3.key,
            },
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
            if (
              nodeArtifact.s3 &&
              !artifacts.some(
                (a) =>
                  a.name === nodeArtifact.name &&
                  a.s3.bucket === nodeArtifact.s3.bucket &&
                  a.s3.key === nodeArtifact.s3.key
              )
            ) {
              artifacts.push({
                name: nodeArtifact.name,
                path: nodeArtifact.path || '',
                s3: {
                  bucket: nodeArtifact.s3.bucket || 'pipeline-runner-artifacts',
                  key: nodeArtifact.s3.key,
                },
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
          const isDuplicate = artifacts.some(
            (a) =>
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
                key: workflowArtifact.s3.key,
              },
            });
          }
        }
      }
    }

    // For workflows that haven't completed yet, we should not try to infer artifacts
    // from templates as they don't exist yet on S3

    console.log(
      `[WorkflowController] Extracted ${
        artifacts.length
      } artifacts from Argo workflow with phase: ${
        argoWorkflow.status?.phase || 'unknown'
      }`
    );
    return artifacts;
  } catch (error) {
    console.error(
      `[WorkflowController] Error extracting artifacts: ${error.message}`
    );
    return [];
  }
};
