const express = require('express');
const passport = require('passport');
const templateController = require('../controllers/template.controller');
const { validateCreateTemplate, validateUpdateTemplate } = require('../middlewares/validators');

const router = express.Router();

// All routes require authentication
router.use(passport.authenticate('jwt', { session: false }));

/**
 * @swagger
 * /templates:
 *   get:
 *     summary: List templates
 *     description: Returns a list of all templates for the authenticated user
 *     tags: [Templates]
 *     parameters:
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
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of templates
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
 *                       description:
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
router.get('/', templateController.listTemplates);

/**
 * @swagger
 * /templates/{id}:
 *   get:
 *     summary: Get a template by ID
 *     description: Returns a specific template by its ID
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Template details
 *       404:
 *         description: Template not found
 */
router.get('/:id', templateController.getTemplate);

/**
 * @swagger
 * /templates:
 *   post:
 *     summary: Create a new template
 *     description: Creates a new workflow template
 *     tags: [Templates]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - template
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               template:
 *                 type: object
 *               parameters:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     type:
 *                       type: string
 *                     default:
 *                       type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Template created successfully
 *       400:
 *         description: Invalid input
 */
router.post('/', validateCreateTemplate, templateController.createTemplate);

/**
 * @swagger
 * /templates/{id}:
 *   put:
 *     summary: Update a template
 *     description: Updates an existing workflow template
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               template:
 *                 type: object
 *               parameters:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     type:
 *                       type: string
 *                     default:
 *                       type: string
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Template updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Template not found
 */
router.put('/:id', validateUpdateTemplate, templateController.updateTemplate);

/**
 * @swagger
 * /templates/{id}:
 *   delete:
 *     summary: Delete a template
 *     description: Deletes a workflow template
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Template deleted successfully
 *       404:
 *         description: Template not found
 */
router.delete('/:id', templateController.deleteTemplate);

module.exports = router;