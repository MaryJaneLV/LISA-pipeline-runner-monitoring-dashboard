import api from './api';

const StorageService = {
  listObjects: async (bucket, prefix = '') => {
    const response = await api.get('/api/storage/objects', {
      params: { bucket, prefix }
    });
    return response.data;
  },

  getDownloadUrl: (bucket, objectName) => {
    const url = new URL(window.location.href);
    const backendPort = '30083'; // This is the NodePort used by the backend service
    
    return `${url.protocol}//${url.hostname}:${backendPort}/api/storage/download?bucket=${bucket}&objectName=${encodeURIComponent(objectName)}`;
  },

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

  deleteObject: async (bucket, objectName) => {
    const response = await api.delete('/api/storage/objects', {
      params: { bucket, objectName }
    });
    return response.data;
  },

  createFolder: async (bucket, folderPath) => {
    const response = await api.post('/api/storage/folders', {
      bucket,
      folderPath
    });
    return response.data;
  }
};

export default StorageService;