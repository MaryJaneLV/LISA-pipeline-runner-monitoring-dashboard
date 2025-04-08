const express = require('express');
const passport = require('passport');
const multer = require('multer');
const storageController = require('../controllers/storage.controller');

const router = express.Router();

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// All routes require authentication
router.use(passport.authenticate('jwt', { session: false }));

/**
 * @swagger
 * /storage/objects:
 *   get:
 *     summary: List objects in a bucket
 *     description: Returns a list of objects in the specified bucket
 *     tags: [Storage]
 *     parameters:
 *       - in: query
 *         name: bucket
 *         schema:
 *           type: string
 *         required: true
 *         description: Bucket name
 *       - in: query
 *         name: prefix
 *         schema:
 *           type: string
 *         description: Object prefix for filtering
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of objects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   size:
 *                     type: number
 *                   lastModified:
 *                     type: string
 *                     format: date-time
 *       400:
 *         description: Missing bucket parameter
 *       404:
 *         description: Bucket not found
 */
router.get('/objects', storageController.listObjects);

/**
 * @swagger
 * /storage/presigned-url:
 *   get:
 *     summary: Get a presigned URL for an object
 *     description: Generates a presigned URL for accessing an object
 *     tags: [Storage]
 *     parameters:
 *       - in: query
 *         name: bucket
 *         schema:
 *           type: string
 *         required: true
 *         description: Bucket name
 *       - in: query
 *         name: objectName
 *         schema:
 *           type: string
 *         required: true
 *         description: Object name/path
 *       - in: query
 *         name: expirySeconds
 *         schema:
 *           type: integer
 *           default: 3600
 *         description: URL expiry time in seconds
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Presigned URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: Object not found
 */
router.get('/presigned-url', storageController.getPresignedUrl);

/**
 * @swagger
 * /storage/upload:
 *   post:
 *     summary: Upload a file
 *     description: Uploads a file to the specified bucket
 *     tags: [Storage]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: query
 *         name: bucket
 *         schema:
 *           type: string
 *         required: true
 *         description: Bucket name
 *       - in: query
 *         name: objectName
 *         schema:
 *           type: string
 *         description: Custom object name (optional)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 etag:
 *                   type: string
 *                 objectName:
 *                   type: string
 *       400:
 *         description: Missing required parameters or file
 */
router.post('/upload', upload.single('file'), storageController.uploadFile);

/**
 * @swagger
 * /storage/objects:
 *   delete:
 *     summary: Delete an object
 *     description: Deletes an object from the specified bucket
 *     tags: [Storage]
 *     parameters:
 *       - in: query
 *         name: bucket
 *         schema:
 *           type: string
 *         required: true
 *         description: Bucket name
 *       - in: query
 *         name: objectName
 *         schema:
 *           type: string
 *         required: true
 *         description: Object name/path
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Object deleted successfully
 *       400:
 *         description: Missing required parameters
 *       404:
 *         description: Object not found
 */
router.delete('/objects', storageController.deleteObject);

module.exports = router;