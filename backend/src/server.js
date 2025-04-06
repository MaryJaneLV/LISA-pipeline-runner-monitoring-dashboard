const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketIo = require('socket.io');
const winston = require('winston');
const path = require('path');
const passport = require('passport');
const mongoose = require('mongoose');

// Import services
const kafkaService = require('./services/kafka.service');

// Import routes
const authRoutes = require('./routes/auth.routes');
const workflowRoutes = require('./routes/workflow.routes');
const templateRoutes = require('./routes/template.routes');
const storageRoutes = require('./routes/storage.routes');

// Import config
const config = require('./config');
const { setupPassport } = require('./config/passport');

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST']
  }
});

// Initialize MongoDB connection
mongoose.connect(config.mongodb.uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  logger.info('Connected to MongoDB');
})
.catch((err) => {
  logger.error('MongoDB connection error:', err);
});

// Connect to Kafka and subscribe to workflow status updates
(async () => {
  try {
    await kafkaService.connect();
    logger.info('Connected to Kafka');
    
    // Subscribe to workflow status updates
    await kafkaService.subscribeToWorkflowStatus((data) => {
      logger.info(`Received workflow status update: ${JSON.stringify(data)}`);
      io.emit('workflow:status', data);
    });
    
    logger.info('Subscribed to workflow.status topic');
  } catch (err) {
    logger.error('Failed to connect to Kafka', err);
    process.exit(1);
  }
})();

// Apply middlewares
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Disable helmet CSP in development
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Passport
setupPassport();
app.use(passport.initialize());

// Set up routes
app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/storage', storageRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(config.env === 'development' && { stack: err.stack })
  });
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Start the server
const PORT = config.port || 3000;

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  server.close(async () => {
    logger.info('HTTP server closed');
    await kafkaService.disconnect();
    process.exit(0);
  });
});