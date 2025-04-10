const minioService = require('../services/minio.service');
const createError = require('http-errors');

/**
 * List objects in a bucket
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware
 */
exports.listObjects = async (req, res, next) => {
  try {
    const { bucket, prefix } = req.query;
    
    if (!bucket) {
      return next(createError(400, 'Bucket name is required'));
    }
    
    // Check if bucket exists
    const bucketExists = await minioService.bucketExists(bucket);
    
    if (!bucketExists) {
      return next(createError(404, 'Bucket not found'));
    }
    
    // Determine accessible prefixes based on user ID
    const userId = req.user._id.toString();
    const userPrefix = `${userId}/`;
    const publicPrefix = 'public/';
    
    // If no prefix is provided or prefix is invalid, default to the user's root
    let adjustedPrefix = prefix || userPrefix;
    
    // Check if the prefix starts with allowed prefixes, otherwise restrict to user's folder
    if (!adjustedPrefix.startsWith(userPrefix) && !adjustedPrefix.startsWith(publicPrefix)) {
      adjustedPrefix = userPrefix;
    }
    
    // List objects with proper access control
    const objects = await minioService.listObjects(bucket, adjustedPrefix);
    
    res.json({
      objects
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a presigned URL for an object
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware
 */
exports.getPresignedUrl = async (req, res, next) => {
  try {
    const { bucket, objectName, expires } = req.query;
    
    if (!bucket || !objectName) {
      return next(createError(400, 'Bucket and object name are required'));
    }
    
    // Check access permissions based on user ID
    const userId = req.user._id.toString();
    const userPrefix = `${userId}/`;
    const publicPrefix = 'public/';
    
    if (!objectName.startsWith(userPrefix) && !objectName.startsWith(publicPrefix)) {
      return next(createError(403, 'Access denied: You can only access your files or public files'));
    }
    
    // Get presigned URL
    const url = await minioService.getPresignedUrl(
      bucket,
      objectName,
      expires ? parseInt(expires) : 3600
    );
    
    res.json({
      url
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload a file
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware
 */
exports.uploadFile = async (req, res, next) => {
  try {
    const { bucket, objectName } = req.query;
    
    if (!bucket || !objectName) {
      return next(createError(400, 'Bucket and object name are required'));
    }
    
    if (!req.file) {
      return next(createError(400, 'File is required'));
    }
    
    // Check if bucket exists, create if not
    const bucketExists = await minioService.bucketExists(bucket);
    
    if (!bucketExists) {
      await minioService.createBucket(bucket);
    }
    
    // Determine if this upload is allowed based on path
    const userId = req.user._id.toString();
    const userInputPrefix = `${userId}/input/`;
    const userOutputPrefix = `${userId}/output/`;
    const publicInputPrefix = 'public/input/';
    const publicOutputPrefix = 'public/output/';
    
    // Ensure file is being uploaded to an allowed location
    if (!objectName.startsWith(userInputPrefix) && 
        !objectName.startsWith(userOutputPrefix) && 
        !objectName.startsWith(publicInputPrefix) && 
        !objectName.startsWith(publicOutputPrefix)) {
      return next(createError(403, 'Files must be uploaded to a valid input or output folder'));
    }
    
    // Upload file
    const result = await minioService.uploadObject(
      bucket,
      objectName,
      req.file.buffer,
      req.file.size,
      req.file.mimetype
    );
    
    res.status(201).json({
      message: 'File uploaded successfully',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an object
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware
 */
exports.deleteObject = async (req, res, next) => {
  try {
    const { bucket, objectName } = req.query;
    
    if (!bucket || !objectName) {
      return next(createError(400, 'Bucket and object name are required'));
    }
    
    // Enforce access control for deletion
    const userId = req.user._id.toString();
    const userPrefix = `${userId}/`;
    
    // Only allow deletion within user's own folder, not in public folders
    if (!objectName.startsWith(userPrefix)) {
      return next(createError(403, 'You can only delete files in your own folders'));
    }
    
    // Delete object
    await minioService.deleteObject(bucket, objectName);
    
    res.json({
      message: 'Object deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};