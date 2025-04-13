const minioService = require('../services/minio.service');
const createError = require('http-errors');

exports.listObjects = async (req, res, next) => {
  try {
    const { bucket, prefix } = req.query;
    
    if (!bucket) {
      return next(createError(400, 'Bucket name is required'));
    }
    
    const bucketExists = await minioService.bucketExists(bucket);
    
    if (!bucketExists) {
      return next(createError(404, 'Bucket not found'));
    }
    
    const userId = req.user._id.toString();
    const userPrefix = `${userId}/`;
    const publicPrefix = 'public/';
    
    let adjustedPrefix = prefix || userPrefix;
    
    if (!adjustedPrefix.startsWith(userPrefix) && !adjustedPrefix.startsWith(publicPrefix)) {
      adjustedPrefix = userPrefix;
    }
    
    const objects = await minioService.listObjects(bucket, adjustedPrefix);
    
    res.json({
      objects
    });
  } catch (error) {
    next(error);
  }
};

exports.getFile = async (req, res, next) => {
  try {
    const { bucket, objectName } = req.query;
    
    if (!bucket || !objectName) {
      return next(createError(400, 'Bucket and object name are required'));
    }
    
    const bodyToken = req.body?.token;
    const queryToken = req.query?.token;
    const token = bodyToken || queryToken;
    
    if (token && !req.user) {
      console.log('Token found in request, attempting to validate');
      try {
        const jwt = require('jsonwebtoken');
        const config = require('../config');
        
        const decoded = jwt.verify(token, config.jwt.secret);
        console.log(`Token validated: User ID ${decoded.id}`);
        
        req.user = { _id: decoded.id };
      } catch (tokenError) {
        console.error('Token validation failed:', tokenError.message);
      }
    }
    
    const userId = req.user ? req.user._id.toString() : null;
    
    const isWorkflowArtifact = objectName.includes('/output/') || 
                              objectName.includes('/scripts/') || 
                              objectName.includes('/input/');  
    
    const isPublicFile = objectName.includes('public/');
    
    let isUserFile = false;
    if (userId) {
      isUserFile = objectName.includes(`${userId}/`);
    }

    const isAuthorized = isWorkflowArtifact || isPublicFile || isUserFile;
    
    if (process.env.NODE_ENV === 'development' && process.env.ALLOW_ALL_DOWNLOADS === 'true') {
      console.log('- Development override: Allowing download regardless of authorization');
    } 
    else if (!isAuthorized) {
      console.log(`Access denied for ${objectName}: user=${userId || 'none'}`);
      return next(createError(403, 'Access denied: You can only access your files or public files'));
    }
    
    try {
      try {
        const bucketExists = await minioService.bucketExists(bucket);
        if (!bucketExists) {
          console.error(`Bucket does not exist: ${bucket}`);
          return next(createError(404, `Bucket not found: ${bucket}`));
        }
        
        let stat;
        try {
          stat = await minioService.client.statObject(bucket, objectName);
        } catch (statError) {
          console.error(`Object stat failed: ${statError.message}`);
          if (statError.code === 'NotFound') {
            return next(createError(404, `File not found: ${objectName}`));
          } else if (statError.code === 'AccessDenied') {
            return next(createError(403, `Access denied to file: ${objectName}`));
          } else {
            return next(createError(500, `Error accessing file: ${statError.code} - ${statError.message}`));
          }
        }
        
        const stream = await minioService.getObject(bucket, objectName);
        
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
          if (!res.headersSent) {
            return next(createError(500, `Error streaming file: ${streamError.message}`));
          }
        });
        
        stream.pipe(res);
      } catch (err) {
        console.error(`MinIO error details: ${err.code} - ${err.message}`);
        throw err; 
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

exports.uploadFile = async (req, res, next) => {
  try {
    const { bucket, objectName } = req.query;
    
    if (!bucket || !objectName) {
      return next(createError(400, 'Bucket and object name are required'));
    }
    
    if (!req.file) {
      return next(createError(400, 'File is required'));
    }
    
    const bucketExists = await minioService.bucketExists(bucket);
    
    if (!bucketExists) {
      await minioService.createBucket(bucket);
    }
    
    const userId = req.user._id.toString();
    const userInputPrefix = `${userId}/input/`;
    const userOutputPrefix = `${userId}/output/`;
    const userScriptsPrefix = `${userId}/scripts/`;
    const publicInputPrefix = 'public/input/';
    const publicOutputPrefix = 'public/output/';
    const publicScriptsPrefix = 'public/scripts/';
    
    if (!objectName.startsWith(userInputPrefix) && 
        !objectName.startsWith(userOutputPrefix) && 
        !objectName.startsWith(userScriptsPrefix) && 
        !objectName.startsWith(publicInputPrefix) && 
        !objectName.startsWith(publicOutputPrefix) &&
        !objectName.startsWith(publicScriptsPrefix)) {
      return next(createError(403, 'Files must be uploaded to a valid input, output, or scripts folder'));
    }
    
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

exports.deleteObject = async (req, res, next) => {
  try {
    const { bucket, objectName } = req.query;
    
    if (!bucket || !objectName) {
      return next(createError(400, 'Bucket and object name are required'));
    }
    
    const userId = req.user._id.toString();
    const userPrefix = `${userId}/`;
    
    if (!objectName.startsWith(userPrefix)) {
      return next(createError(403, 'You can only delete files in your own folders'));
    }
    
    await minioService.deleteObject(bucket, objectName);
    
    res.json({
      message: 'Object deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.createFolder = async (req, res, next) => {
  try {
    const { bucket, folderPath } = req.body;
    
    if (!bucket || !folderPath) {
      return next(createError(400, 'Bucket and folder path are required'));
    }
    
    const userId = req.user._id.toString();
    const userInputPrefix = `${userId}/input/`;
    const userOutputPrefix = `${userId}/output/`;
    const userScriptsPrefix = `${userId}/scripts/`;
    const publicInputPrefix = 'public/input/';
    const publicOutputPrefix = 'public/output/';
    const publicScriptsPrefix = 'public/scripts/';
    
    const normalizedPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
    
    if (!normalizedPath.startsWith(userInputPrefix) && 
        !normalizedPath.startsWith(userOutputPrefix) && 
        !normalizedPath.startsWith(userScriptsPrefix) && 
        !normalizedPath.startsWith(publicInputPrefix) && 
        !normalizedPath.startsWith(publicOutputPrefix) &&
        !normalizedPath.startsWith(publicScriptsPrefix)) {
      return next(createError(403, 'Folders must be created in a valid input, output, or scripts folder'));
    }

    const result = await minioService.createFolder(bucket, normalizedPath);
    
    res.status(201).json({
      message: 'Folder created successfully',
      ...result
    });
  } catch (error) {
    next(error);
  }
};