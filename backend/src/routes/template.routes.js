const express = require('express');
const passport = require('passport');
const templateController = require('../controllers/template.controller');
const { validateCreateTemplate, validateUpdateTemplate } = require('../middlewares/validators');

const router = express.Router();

// All routes require authentication
router.use(passport.authenticate('jwt', { session: false }));

/**
 * @route GET /api/templates
 * @desc List templates
 * @access Private
 */
router.get('/', templateController.listTemplates);

/**
 * @route GET /api/templates/:id
 * @desc Get a template by ID
 * @access Private
 */
router.get('/:id', templateController.getTemplate);

/**
 * @route POST /api/templates
 * @desc Create a new template
 * @access Private
 */
router.post('/', validateCreateTemplate, templateController.createTemplate);

/**
 * @route PUT /api/templates/:id
 * @desc Update a template
 * @access Private
 */
router.put('/:id', validateUpdateTemplate, templateController.updateTemplate);

/**
 * @route DELETE /api/templates/:id
 * @desc Delete a template
 * @access Private
 */
router.delete('/:id', templateController.deleteTemplate);

module.exports = router;