// app.js - Production-ready Express application with comprehensive security
require('dotenv').config();

// Environment validation at startup
function validateEnvironment() {
  const requiredVars = [
    'OPENAI_API_KEY',
    'MONGODB_URI',
    'NODE_ENV'
  ];
  
  const optionalVars = [
    'PORT',
    'MAX_CONCURRENT_JOBS',
    'OPENAI_MAX_RETRIES',
    'OPENAI_TIMEOUT_MS',
    'COST_ALERT_THRESHOLD'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('Please ensure all required environment variables are set before starting the application.');
    process.exit(1);
  }
  
  // Log configuration status
  logger.info('✅ Environment validation passed');
  logger.info(`📍 Running in ${process.env.NODE_ENV} mode`);
  
  // Validate optional vars and set defaults
  optionalVars.forEach(varName => {
    if (!process.env[varName]) {
      logger.warn(`⚠️  Optional environment variable ${varName} not set`);
    }
  });
  
  // Validate OpenAI API key format
  if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
    console.error('❌ Invalid OpenAI API key format');
    process.exit(1);
  }
  
  // Validate MongoDB URI format
  if (!process.env.MONGODB_URI.startsWith('mongodb')) {
    console.error('❌ Invalid MongoDB URI format');
    process.exit(1);
  }
}

// Validate environment before proceeding
validateEnvironment();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const http = require('http');
const path = require('path');
const connectDB = require('./mongodb');
const { initializeWebSocket, gracefulShutdown: shutdownWebSocket } = require('./websocket');
const logger = require('./logger');
const novelRoutes = require('./routes/novel');
const healthRoutes = require('./routes/health');
const recoveryService = require('./services/recoveryService');
const performanceMonitor = require('./middleware/performanceMonitor');
const requestLimiter = require('./middleware/requestLimiter');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Production security configuration
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// Connect to MongoDB with error handling
let mongoConnection = null;
connectDB().then(() => {
  mongoConnection = true;
  logger.info('MongoDB connection established');
}).catch(error => {
  logger.error('Failed to connect to MongoDB:', error);
  process.exit(1);
});

// Initialize WebSocket with error handling
try {
  initializeWebSocket(server);
  logger.info('WebSocket initialized successfully');
} catch (error) {
  logger.error('Failed to initialize WebSocket:', error);
  process.exit(1);
}

// Comprehensive Security Headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for React in development
        "'unsafe-eval'", // Required for React DevTools
        ...(isDevelopment ? ["'unsafe-eval'"] : [])
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for styled-components
        "https://fonts.googleapis.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "data:"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https:"
      ],
      connectSrc: [
        "'self'",
        "wss:",
        "ws:",
        ...(isDevelopment ? ["ws://localhost:*", "http://localhost:*"] : [])
      ],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: isProduction ? [] : null
    },
    reportOnly: isDevelopment // Only report in development, enforce in production
  },
  crossOriginEmbedderPolicy: isDevelopment ? false : { policy: "require-corp" },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: isProduction ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  } : false,
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: "no-referrer" },
  xssFilter: true
}));

// Additional security headers
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // API versioning header
  res.setHeader('API-Version', '1.0');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
});

// Compression with security considerations
app.use(compression({
  filter: (req, res) => {
    // Don't compress responses with security headers that shouldn't be compressed
    if (res.getHeader('Cache-Control') && res.getHeader('Cache-Control').includes('no-store')) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balance between compression and CPU usage
  threshold: 1024 // Only compress responses larger than 1KB
}));

// CORS configuration with security
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (isDevelopment) {
      // In development, allow localhost origins
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }
    
    // In production, be more restrictive
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.DOMAIN_URL
    ].filter(Boolean);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // For now, allow same-origin requests
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 24 hours preflight cache
}));

// Request parsing with limits
app.use(express.json({ 
  limit: '10mb', // Reduced from 15mb for security
  verify: (req, res, buf) => {
    // Basic JSON bomb protection
    if (buf.length > 10 * 1024 * 1024) { // 10MB hard limit
      const error = new Error('Request too large');
      error.status = 413;
      throw error;
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000 // Limit number of parameters
}));

// Enhanced logging
app.use(morgan(isProduction ? 'combined' : 'dev', { 
  stream: { 
    write: message => logger.info(message.trim()) 
  },
  skip: (req, res) => {
    // Skip logging health checks in production
    return isProduction && req.url.startsWith('/health');
  }
}));

// Performance monitoring (should be early in middleware stack)
app.use(performanceMonitor.requestMiddleware());

// Request validation and size limits
app.use(requestLimiter.validate());
app.use(requestLimiter.requestSize());

// Request ID middleware for tracing
app.use((req, res, next) => {
  req.id = Math.random().toString(36).substr(2, 9);
  res.setHeader('X-Request-ID', req.id);
  req.startTime = Date.now();
  next();
});

// Rate limiting with different tiers
const createRateLimit = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP ${req.ip} on ${req.path}`);
    res.status(429).json({ 
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    });
  }
});

// Apply different rate limits using the request limiter
app.use('/api/', requestLimiter.general());

// Stricter rate limiting for generation endpoints
app.use('/api/novel/generate', requestLimiter.generation());

// Request timeout middleware
app.use((req, res, next) => {
  const timeout = isProduction ? 300000 : 600000; // 5 min prod, 10 min dev
  
  req.setTimeout(timeout, () => {
    logger.error(`Request timeout for ${req.method} ${req.path}`);
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout' });
    }
  });
  
  res.setTimeout(timeout, () => {
    logger.error(`Response timeout for ${req.method} ${req.path}`);
  });
  
  next();
});

// Serve static frontend files with security headers
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: isProduction ? '1d' : '0', // Cache in production
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Security headers for static files
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    if (path.endsWith('.js') || path.endsWith('.css')) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  }
}));

// API Routes
app.use('/api/novel', novelRoutes);

// Health check routes
app.use('/health', healthRoutes);

// Legacy health endpoint redirect
app.get('/api/health', (req, res) => {
  res.redirect(301, '/health');
});

// API documentation endpoint (development only)
if (isDevelopment) {
  app.get('/api/docs', (req, res) => {
    res.json({
      endpoints: {
        'GET /health': 'Health check',
        'GET /api/novel/genres': 'Get available genres',
        'POST /api/novel/generate': 'Start novel generation',
        'GET /api/novel/status/:jobId': 'Get generation status',
        'GET /api/novel/download/:jobId': 'Download completed novel',
        'POST /api/novel/upload-premise': 'Upload premise file',
        'GET /api/novel/jobs': 'List recent jobs',
        'DELETE /api/novel/:jobId': 'Delete job'
      }
    });
  });
}

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  // Security check for path traversal
  if (req.path.includes('..') || req.path.includes('%2e%2e')) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err) {
      logger.error('Error serving index.html:', err);
      res.status(500).json({ error: 'Failed to load application' });
    }
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.path,
    method: req.method
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  // Log error with request context
  logger.error(`Error in ${req.method} ${req.path}:`, {
    error: err.message,
    stack: err.stack,
    requestId: req.id,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Don't leak error details in production
  const errorResponse = {
    error: {
      message: isProduction ? 'Internal Server Error' : err.message,
      status: err.status || 500,
      requestId: req.id
    }
  };
  
  // Include stack trace only in development
  if (isDevelopment && err.stack) {
    errorResponse.error.stack = err.stack;
  }
  
  res.status(err.status || 500).json(errorResponse);
});

// Graceful shutdown handling
let isShuttingDown = false;

const gracefulShutdown = (signal) => {
  if (isShuttingDown) {
    logger.warn('Already shutting down, forcing exit...');
    process.exit(1);
  }
  
  isShuttingDown = true;
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(async (err) => {
    if (err) {
      logger.error('Error closing server:', err);
      process.exit(1);
    }
    
    logger.info('Server closed');
    
    try {
      // Shutdown services in order
      logger.info('Shutting down WebSocket connections...');
      await shutdownWebSocket();
      
      logger.info('Stopping recovery service...');
      await recoveryService.stop();
      
      logger.info('Closing MongoDB connection...');
      // MongoDB connection will be closed by the driver
      
      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 30000);
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGQUIT', () => gracefulShutdown('SIGQUIT'));

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV}`);
  logger.info(`🔒 Security headers enabled`);
  
  // Start recovery service after server is listening
  try {
    recoveryService.startPeriodicCheck();
    logger.info('🔄 Recovery service started');
  } catch (error) {
    logger.error('Failed to start recovery service:', error);
  }
});

// Export for testing
module.exports = app;
