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

  /**
   * Initialize default buckets if they don't exist
   * @returns {Promise<void>}
   */
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
  
  /**
   * Initialize user storage folders in the default bucket
   * Creates the necessary folder structure for user storage
   * @param {String} userId - The user ID
   * @returns {Promise<void>}
   */
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

  /**
   * Check if a bucket exists
   * @param {String} bucketName - The bucket name
   * @returns {Promise<Boolean>} - Whether the bucket exists
   */
  async bucketExists(bucketName) {
    try {
      return await this.client.bucketExists(bucketName);
    } catch (error) {
      throw new Error(`Error checking if bucket exists: ${error.message}`);
    }
  }

  /**
   * Create a new bucket
   * @param {String} bucketName - The bucket name
   * @param {String} region - The region (optional)
   * @returns {Promise<void>}
   */
  async createBucket(bucketName, region = 'us-east-1') {
    try {
      await this.client.makeBucket(bucketName, region);
    } catch (error) {
      throw new Error(`Error creating bucket: ${error.message}`);
    }
  }

  /**
   * Upload a file to a bucket
   * @param {String} bucketName - The bucket name
   * @param {String} objectName - The object name
   * @param {Buffer|Stream} data - The file data
   * @param {Number} size - The file size
   * @param {String} contentType - The content type
   * @returns {Promise<Object>} - The object info
   */
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

  /**
   * Download an object from a bucket
   * @param {String} bucketName - The bucket name
   * @param {String} objectName - The object name
   * @returns {Promise<Stream>} - The object data stream
   */
  async getObject(bucketName, objectName) {
    try {
      return await this.client.getObject(bucketName, objectName);
    } catch (error) {
      throw new Error(`Error getting object: ${error.message}`);
    }
  }

  /**
   * Delete an object from a bucket
   * @param {String} bucketName - The bucket name
   * @param {String} objectName - The object name
   * @returns {Promise<void>}
   */
  async deleteObject(bucketName, objectName) {
    try {
      await this.client.removeObject(bucketName, objectName);
    } catch (error) {
      throw new Error(`Error deleting object: ${error.message}`);
    }
  }

  /**
   * List objects in a bucket
   * @param {String} bucketName - The bucket name
   * @param {String} prefix - The prefix to filter by (optional)
   * @param {Boolean} recursive - Whether to list recursively (optional)
   * @returns {Promise<Array>} - The list of objects
   */
  async listObjects(bucketName, prefix = '', recursive = true) {
    try {
      const objectStream = this.client.listObjects(bucketName, prefix, recursive);
      
      return new Promise((resolve, reject) => {
        const objects = [];
        
        objectStream.on('data', (obj) => {
          objects.push({
            name: obj.name,
            prefix: obj.prefix,
            size: obj.size,
            etag: obj.etag,
            lastModified: obj.lastModified,
            url: this.getObjectUrl(bucketName, obj.name)
          });
        });
        
        objectStream.on('error', reject);
        objectStream.on('end', () => resolve(objects));
      });
    } catch (error) {
      throw new Error(`Error listing objects: ${error.message}`);
    }
  }

  /**
   * Get a direct URL for an object
   * @param {String} bucketName - The bucket name
   * @param {String} objectName - The object name
   * @returns {String} - The object URL
   */
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