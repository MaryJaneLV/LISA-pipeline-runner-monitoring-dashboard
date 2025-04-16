const Minio = require('minio');
const config = require('../config');

class MinioService {
  constructor() {
    this.client = new Minio.Client({
      endPoint: config.minio.endPoint,
      port: config.minio.port,
      useSSL: config.minio.useSSL,
      accessKey: config.minio.accessKey,
      secretKey: config.minio.secretKey
    });
    
    this.defaultBucket = config.minio.defaultBucket;
  }

  async initBuckets() {
    const defaultBuckets = [
      'pipeline-runner-artifacts',
    ];
    
    for (const bucket of defaultBuckets) {
      const exists = await this.bucketExists(bucket);
      if (!exists) {
        await this.createBucket(bucket);
      }
    }
  }
  
  async initUserStorage(userId) {
    const bucket = 'pipeline-runner-artifacts';
    const userFolderPaths = [
      `${userId}/`, 
      `${userId}/input/`, 
      `${userId}/output/`,
      `${userId}/scripts/`,
      `public/`,
      `public/input/`,
      `public/output/`,
      `public/scripts/`
    ];
    
    try {
      // Check if bucket exists
      const bucketExists = await this.bucketExists(bucket);
      if (!bucketExists) {
        await this.createBucket(bucket);
      }
      
      // Create empty objects to represent folders
      for (const folderPath of userFolderPaths) {
        // Using putObject with empty buffer creates the "folder"
        await this.client.putObject(bucket, folderPath, Buffer.from(''), 0);
      }
      
      console.log(`Storage folders initialized for user: ${userId}`);
    } catch (error) {
      console.error(`Error initializing user storage: ${error.message}`);
      throw new Error(`Error initializing user storage: ${error.message}`);
    }
  }

  async bucketExists(bucketName) {
    try {
      return await this.client.bucketExists(bucketName);
    } catch (error) {
      throw new Error(`Error checking if bucket exists: ${error.message}`);
    }
  }

  async createBucket(bucketName, region = 'us-east-1') {
    try {
      await this.client.makeBucket(bucketName, region);
    } catch (error) {
      throw new Error(`Error creating bucket: ${error.message}`);
    }
  }

  async uploadObject(bucketName, objectName, data, size, contentType = 'application/octet-stream') {
    try {
      const etag = await this.client.putObject(bucketName, objectName, data, size, {
        'Content-Type': contentType
      });
      
      return {
        etag,
        bucket: bucketName,
        key: objectName,
        url: this.getObjectUrl(bucketName, objectName)
      };
    } catch (error) {
      throw new Error(`Error uploading object: ${error.message}`);
    }
  }

  async getObject(bucketName, objectName) {
    try {
      return await this.client.getObject(bucketName, objectName);
    } catch (error) {
      throw new Error(`Error getting object: ${error.message}`);
    }
  }

  async deleteObject(bucketName, objectName) {
    try {
      await this.client.removeObject(bucketName, objectName);
    } catch (error) {
      throw new Error(`Error deleting object: ${error.message}`);
    }
  }

  async createFolder(bucketName, folderPath) {
    try {
      // Ensure folder path ends with a slash
      const normalizedPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
      
      // Create an empty object to represent the folder
      await this.client.putObject(bucketName, normalizedPath, Buffer.from(''), 0);
      
      return {
        bucket: bucketName,
        key: normalizedPath,
        url: this.getObjectUrl(bucketName, normalizedPath)
      };
    } catch (error) {
      throw new Error(`Error creating folder: ${error.message}`);
    }
  }

  async listObjects(bucketName, prefix = '', recursive = true) {
    try {
      const objectStream = this.client.listObjects(bucketName, prefix, recursive);
      
      return new Promise((resolve, reject) => {
        const objects = [];
        
        objectStream.on('data', (obj) => {
          // Skip objects that exactly match the prefix as they are usually just "folder markers"
          // But include them if they are the actual prefix itself (ending with '/')
          if (obj.name !== prefix && obj.name.endsWith('/')) {
            objects.push({
              name: obj.name,
              prefix: obj.prefix,
              size: obj.size,
              etag: obj.etag,
              lastModified: obj.lastModified,
              url: this.getObjectUrl(bucketName, obj.name),
              isFolder: true
            });
          } else if (!obj.name.endsWith('/')) {
            objects.push({
              name: obj.name,
              prefix: obj.prefix,
              size: obj.size,
              etag: obj.etag,
              lastModified: obj.lastModified,
              url: this.getObjectUrl(bucketName, obj.name),
              isFolder: false
            });
          }
        });
        
        objectStream.on('error', reject);
        objectStream.on('end', () => resolve(objects));
      });
    } catch (error) {
      throw new Error(`Error listing objects: ${error.message}`);
    }
  }

  getObjectUrl(bucketName, objectName) {
    // Use public host and port if available
    const host = process.env.PUBLIC_MINIO_HOST || 'localhost';
    const port = process.env.PUBLIC_MINIO_PORT || config.minio.port;
    
    // Make sure we're using IPv4 for localhost (not IPv6 ::1)
    const hostToUse = host === 'localhost' ? '127.0.0.1' : host;
    
    const baseUrl = `${config.minio.useSSL ? 'https' : 'http'}://${hostToUse}:${port}`;
    return `${baseUrl}/${bucketName}/${objectName}`;
  }
}

module.exports = new MinioService();