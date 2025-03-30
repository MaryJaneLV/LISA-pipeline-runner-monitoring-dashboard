const express = require('express');
const passport = require('passport');
const workflowController = require('../controllers/workflow.controller');
const { validateCreateWorkflow } = require('../middlewares/validators');

const router = express.Router();

// All routes require authentication
router.use(passport.authenticate('jwt', { session: false }));

/**
 * @route GET /api/workflows
 * @desc List workflows
 * @access Private
 */
router.get('/', workflowController.listWorkflows);

/**
 * @route GET /api/workflows/:id
 * @desc Get a workflow by ID
 * @access Private
 */
router.get('/:id', workflowController.getWorkflow);

/**
 * @route POST /api/workflows
 * @desc Create a new workflow
 * @access Private
 */
router.post('/', validateCreateWorkflow, workflowController.createWorkflow);

/**
 * @route DELETE /api/workflows/:id
 * @desc Delete a workflow
 * @access Private
 */
router.delete('/:id', workflowController.deleteWorkflow);

/**
 * @route PUT /api/workflows/:id/terminate
 * @desc Terminate a workflow
 * @access Private
 */
router.put('/:id/terminate', workflowController.terminateWorkflow);

/**
 * @route POST /api/workflows/:id/resubmit
 * @desc Resubmit a workflow
 * @access Private
 */
router.post('/:id/resubmit', workflowController.resubmitWorkflow);

/**
 * @route GET /api/workflows/:id/logs
 * @desc Get workflow logs
 * @access Private
 */
router.get('/:id/logs', workflowController.getWorkflowLogs);

module.exports = router;