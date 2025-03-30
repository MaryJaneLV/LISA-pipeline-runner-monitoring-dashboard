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
    
    // List objects
    const objects = await minioService.listObjects(bucket, prefix || '');
    
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
    
    // Delete object
    await minioService.deleteObject(bucket, objectName);
    
    res.json({
      message: 'Object deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};