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
 * @route GET /api/storage/objects
 * @desc List objects in a bucket
 * @access Private
 */
router.get('/objects', storageController.listObjects);

/**
 * @route GET /api/storage/presigned-url
 * @desc Get a presigned URL for an object
 * @access Private
 */
router.get('/presigned-url', storageController.getPresignedUrl);

/**
 * @route POST /api/storage/upload
 * @desc Upload a file
 * @access Private
 */
router.post('/upload', upload.single('file'), storageController.uploadFile);

/**
 * @route DELETE /api/storage/objects
 * @desc Delete an object
 * @access Private
 */
router.delete('/objects', storageController.deleteObject);

module.exports = router;