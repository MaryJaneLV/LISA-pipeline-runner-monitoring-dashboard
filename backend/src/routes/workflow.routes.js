const express = require('express');
const passport = require('passport');
const workflowController = require('../controllers/workflow.controller');
const { validateCreateWorkflow } = require('../middlewares/validators');

const router = express.Router();

// All routes require authentication
router.use(passport.authenticate('jwt', { session: false }));

/**
 * @swagger
 * /workflows:
 *   get:
 *     summary: List workflows
 *     description: Returns a list of all workflows for the authenticated user
 *     tags: [Workflows]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by workflow status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Results per page
 *     responses:
 *       200:
 *         description: List of workflows
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       status:
 *                         type: string
 *                       templateName:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get('/', workflowController.listWorkflows);

/**
 * @swagger
 * /workflows/{id}:
 *   get:
 *     summary: Get a workflow by ID
 *     description: Returns a specific workflow by its ID
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workflow ID
 *     responses:
 *       200:
 *         description: Workflow details
 *       404:
 *         description: Workflow not found
 */
router.get('/:id', workflowController.getWorkflow);

/**
 * @swagger
 * /workflows:
 *   post:
 *     summary: Create a new workflow
 *     description: Creates a new workflow from a template
 *     tags: [Workflows]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - templateName
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               templateName:
 *                 type: string
 *               parameters:
 *                 type: object
 *     responses:
 *       201:
 *         description: Workflow created successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Template not found
 */
router.post('/', validateCreateWorkflow, workflowController.createWorkflow);

/**
 * @swagger
 * /workflows/{id}:
 *   delete:
 *     summary: Delete a workflow
 *     description: Deletes a workflow and terminates it if running
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workflow ID
 *     responses:
 *       200:
 *         description: Workflow deleted successfully
 *       404:
 *         description: Workflow not found
 */
router.delete('/:id', workflowController.deleteWorkflow);

/**
 * @swagger
 * /workflows/{id}/terminate:
 *   put:
 *     summary: Terminate a workflow
 *     description: Terminates a running workflow
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workflow ID
 *     responses:
 *       200:
 *         description: Workflow terminated successfully
 *       400:
 *         description: Cannot terminate a completed workflow
 *       404:
 *         description: Workflow not found
 */
router.put('/:id/terminate', workflowController.terminateWorkflow);

/**
 * @swagger
 * /workflows/{id}/suspend:
 *   put:
 *     summary: Suspend a workflow
 *     description: Suspends a running workflow
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workflow ID
 *     responses:
 *       200:
 *         description: Workflow suspended successfully
 *       400:
 *         description: Only running workflows can be suspended
 *       404:
 *         description: Workflow not found
 */
router.put('/:id/suspend', workflowController.suspendWorkflow);

/**
 * @swagger
 * /workflows/{id}/resume:
 *   put:
 *     summary: Resume a workflow
 *     description: Resumes a suspended workflow
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workflow ID
 *     responses:
 *       200:
 *         description: Workflow resumed successfully
 *       400:
 *         description: Only suspended workflows can be resumed
 *       404:
 *         description: Workflow not found
 */
router.put('/:id/resume', workflowController.resumeWorkflow);

/**
 * @swagger
 * /workflows/{id}/resubmit:
 *   post:
 *     summary: Resubmit a workflow
 *     description: Creates a new workflow with the same parameters as an existing one
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workflow ID
 *     responses:
 *       201:
 *         description: Workflow resubmitted successfully
 *       404:
 *         description: Workflow not found
 */
router.post('/:id/resubmit', workflowController.resubmitWorkflow);

/**
 * @swagger
 * /workflows/{id}/logs:
 *   get:
 *     summary: Get workflow logs
 *     description: Retrieves logs for a specific workflow
 *     tags: [Workflows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Workflow ID
 *     responses:
 *       200:
 *         description: Workflow logs
 *       404:
 *         description: Workflow not found
 */
router.get('/:id/logs', workflowController.getWorkflowLogs);

module.exports = router;