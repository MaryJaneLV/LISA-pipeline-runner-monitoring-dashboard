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
 * Download a file directly
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 * @param {Function} next - The next middleware
 */
exports.getFile = async (req, res, next) => {
  try {
    const { bucket, objectName } = req.query;
    
    if (!bucket || !objectName) {
      return next(createError(400, 'Bucket and object name are required'));
    }
    
    // Check for token in request body, query or headers
    const bodyToken = req.body?.token;
    const queryToken = req.query?.token;
    const token = bodyToken || queryToken;
    
    if (token && !req.user) {
      console.log('Token found in request, attempting to validate');
      try {
        const jwt = require('jsonwebtoken');
        const config = require('../config');
        
        // Verify the token
        const decoded = jwt.verify(token, config.jwt.secret);
        console.log(`Token validated: User ID ${decoded.id}`);
        
        // Set user information for this request
        req.user = { _id: decoded.id };
      } catch (tokenError) {
        console.error('Token validation failed:', tokenError.message);
      }
    }
    
    // Get userId from authenticated user (or null for non-auth requests)
    const userId = req.user ? req.user._id.toString() : null;
    
    // Validate access permissions with flexible rules
    const isWorkflowArtifact = objectName.includes('/output/') || 
                              objectName.includes('/scripts/') || 
                              objectName.includes('/input/');  // All input files are treated as artifacts
    
    const isPublicFile = objectName.includes('public/');
    
    // Check if object is in user's folder with flexible matching
    let isUserFile = false;
    if (userId) {
      isUserFile = objectName.includes(`${userId}/`);
    }

    // Security check - Apply access control
    const isAuthorized = isWorkflowArtifact || isPublicFile || isUserFile;
    
    // For better debugging, allow a system override in development mode
    if (process.env.NODE_ENV === 'development' && process.env.ALLOW_ALL_DOWNLOADS === 'true') {
      console.log('- Development override: Allowing download regardless of authorization');
    } 
    // Enforce authorization in normal operation
    else if (!isAuthorized) {
      console.log(`Access denied for ${objectName}: user=${userId || 'none'}`);
      return next(createError(403, 'Access denied: You can only access your files or public files'));
    }
    
    try {
      try {
        // Check if bucket exists first
        const bucketExists = await minioService.bucketExists(bucket);
        if (!bucketExists) {
          console.error(`Bucket does not exist: ${bucket}`);
          return next(createError(404, `Bucket not found: ${bucket}`));
        }
        
        // Then check if object exists with stat operation
        let stat;
        try {
          stat = await minioService.client.statObject(bucket, objectName);
        } catch (statError) {
          console.error(`Object stat failed: ${statError.message}`);
          // Provide more user-friendly error based on error code
          if (statError.code === 'NotFound') {
            return next(createError(404, `File not found: ${objectName}`));
          } else if (statError.code === 'AccessDenied') {
            return next(createError(403, `Access denied to file: ${objectName}`));
          } else {
            // For other errors, provide the error code in the message
            return next(createError(500, `Error accessing file: ${statError.code} - ${statError.message}`));
          }
        }
        
        // Get the object stream
        const stream = await minioService.getObject(bucket, objectName);
        
        // Get filename from the path
        const filename = objectName.split('/').pop();
        
        // Determine content type based on file extension
        let contentType = 'application/octet-stream';
        if (filename) {
          const extension = filename.split('.').pop().toLowerCase();
          // Set common content types based on extension
          if (['jpg', 'jpeg'].includes(extension)) contentType = 'image/jpeg';
          else if (extension === 'png') contentType = 'image/png';
          else if (extension === 'pdf') contentType = 'application/pdf';
          else if (extension === 'csv') contentType = 'text/csv';
          else if (extension === 'txt') contentType = 'text/plain';
          else if (extension === 'json') contentType = 'application/json';
          else if (extension === 'xlsx' || extension === 'xls') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        }
        
        // Set appropriate headers for file download
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', stat.size);
        
        // Enable CORS headers for the download
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
        
        // Add event handlers for stream errors
        stream.on('error', (streamError) => {
          console.error(`Stream error during download: ${streamError.message}`);
          // The response might already be partially sent, but try to end it gracefully
          if (!res.headersSent) {
            return next(createError(500, `Error streaming file: ${streamError.message}`));
          }
        });
        
        // Pipe the stream to the response
        stream.pipe(res);
      } catch (err) {
        // Log the specific minio error
        console.error(`MinIO error details: ${err.code} - ${err.message}`);
        throw err; // Re-throw for the outer try/catch
      }
    } catch (error) {
      console.error(`Error streaming file directly: ${error.message}`);
      return next(createError(404, `File not found: ${error.message}`));
    }
  } catch (error) {
    console.error('Error in download controller:', error);
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
    const userScriptsPrefix = `${userId}/scripts/`;
    const publicInputPrefix = 'public/input/';
    const publicOutputPrefix = 'public/output/';
    const publicScriptsPrefix = 'public/scripts/';
    
    // Ensure file is being uploaded to an allowed location
    if (!objectName.startsWith(userInputPrefix) && 
        !objectName.startsWith(userOutputPrefix) && 
        !objectName.startsWith(userScriptsPrefix) && 
        !objectName.startsWith(publicInputPrefix) && 
        !objectName.startsWith(publicOutputPrefix) &&
        !objectName.startsWith(publicScriptsPrefix)) {
      return next(createError(403, 'Files must be uploaded to a valid input, output, or scripts folder'));
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