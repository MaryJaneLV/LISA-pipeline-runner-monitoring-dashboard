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

// Most routes require authentication
const requireAuth = passport.authenticate('jwt', { session: false });

// CORS middleware specifically for the download endpoint
const downloadCors = (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Accept');
  res.header('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
};

// Optional authentication middleware - allows access even if auth fails
const optionalAuth = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (user) {
      req.user = user;
    }
    // Continue regardless of auth success/failure
    next();
  })(req, res, next);
};

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
router.get('/objects', requireAuth, storageController.listObjects);

/**
 * @swagger
 * /storage/download:
 *   get:
 *      summary: Download a file directly
 *      description: >
 *        Downloads a file from the object storage if the user is authorized to access it.
 *        Authorization is based on token validation or file path rules (public, workflow, or user-owned files).
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
router.get('/download', downloadCors, optionalAuth, storageController.getFile);

/**
 * @swagger
 * /storage/upload:
 *   post:
 *     summary: Upload a file
 *     description: Uploads a file to the specified bucket
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
router.post('/upload', requireAuth, upload.single('file'), storageController.uploadFile);

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
router.delete('/objects', requireAuth, storageController.deleteObject);

module.exports = router;