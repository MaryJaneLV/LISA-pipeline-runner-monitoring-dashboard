import api from './api';

/**
 * Service for managing storage (Minio)
 */
const StorageService = {
  /**
   * List objects in a bucket
   * @param {String} bucket - Bucket name
   * @param {String} prefix - Prefix for filtering objects (optional)
   * @returns {Promise<Object>} - Objects data
   */
  listObjects: async (bucket, prefix = '') => {
    const response = await api.get('/api/storage/objects', {
      params: { bucket, prefix }
    });
    return response.data;
  },

  /**
   * Get the download URL for an object
   * @param {String} bucket - Bucket name
   * @param {String} objectName - Object name
   * @returns {String} - Direct download URL
   */
  getDownloadUrl: (bucket, objectName) => {
    // Use the domain from the current window location, but with the specific backend port
    // This ensures we're using the correct host regardless of how the frontend is accessed
    const url = new URL(window.location.href);
    const backendPort = '30083'; // This is the NodePort used by the backend service
    
    return `${url.protocol}//${url.hostname}:${backendPort}/api/storage/download?bucket=${bucket}&objectName=${encodeURIComponent(objectName)}`;
  },

  /**
   * Upload a file
   * @param {File} file - File to upload
   * @param {String} bucket - Bucket name
   * @param {String} objectName - Object name
   * @returns {Promise<Object>} - Upload result
   */
  uploadFile: async (file, bucket, objectName) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(`/api/storage/upload?bucket=${bucket}&objectName=${objectName}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  },

  /**
   * Delete an object
   * @param {String} bucket - Bucket name
   * @param {String} objectName - Object name
   * @returns {Promise<Object>} - Delete result
   */
  deleteObject: async (bucket, objectName) => {
    const response = await api.delete('/api/storage/objects', {
      params: { bucket, objectName }
    });
    return response.data;
  }
};

export default StorageService;