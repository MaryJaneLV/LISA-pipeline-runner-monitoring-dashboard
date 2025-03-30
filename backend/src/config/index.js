require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d'
  },
  
  argo: {
    baseURL: process.env.ARGO_BASE_URL || 'http://argo-server.scientific-workflow.svc.cluster.local:2746',
    namespace: process.env.ARGO_NAMESPACE || 'scientific-workflow'
  },
  
  minio: {
    endPoint: process.env.MINIO_ENDPOINT || 'minio',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    defaultBucket: process.env.MINIO_DEFAULT_BUCKET || 'workflow-outputs'
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://redis:6379'
  },
  
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/scientific-workflow'
  }
};