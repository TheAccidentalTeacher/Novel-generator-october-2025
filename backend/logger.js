// logger.js - Production-ready logging system with comprehensive monitoring
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { format } = winston;

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Environment configuration
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// Custom format for structured logging
const structuredFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'service'] }),
  format.json()
);

// Custom format for console output (human-readable)
const consoleFormat = format.combine(
  format.timestamp({ format: 'HH:mm:ss.SSS' }),
  format.colorize({ all: true }),
  format.printf(({ timestamp, level, message, service, requestId, userId, jobId, ...meta }) => {
    let logMessage = `${timestamp} [${service || 'APP'}] ${level}: ${message}`;
    
    // Add contextual information
    const context = [];
    if (requestId) context.push(`req:${requestId}`);
    if (userId) context.push(`user:${userId}`);
    if (jobId) context.push(`job:${jobId}`);
    
    if (context.length > 0) {
      logMessage += ` [${context.join('|')}]`;
    }
    
    // Add metadata if present
    const metaKeys = Object.keys(meta);
    if (metaKeys.length > 0) {
      logMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

// Performance monitoring
const performanceFormat = format.combine(
  format.timestamp(),
  format.json(),
  format.printf((info) => {
    if (info.level === 'performance') {
      return JSON.stringify({
        timestamp: info.timestamp,
        type: 'performance',
        metric: info.metric,
        value: info.value,
        unit: info.unit,
        metadata: info.metadata
      });
    }
    return false;
  })
);

// Security audit format
const securityFormat = format.combine(
  format.timestamp(),
  format.json(),
  format.printf((info) => {
    if (info.level === 'security') {
      return JSON.stringify({
        timestamp: info.timestamp,
        type: 'security',
        event: info.event,
        severity: info.severity,
        ip: info.ip,
        userAgent: info.userAgent,
        details: info.details
      });
    }
    return false;
  })
);

// Create the main logger
const logger = winston.createLogger({
  level: logLevel,
  defaultMeta: { 
    service: 'novel-generator',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    pid: process.pid
  },
  transports: []
});

// Console transport (always enabled)
logger.add(new winston.transports.Console({
  format: isDevelopment ? consoleFormat : structuredFormat,
  level: isDevelopment ? 'debug' : 'info'
}));

// File transports for production
if (isProduction) {
  // Error log - only errors and fatal
  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: structuredFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
    tailable: true,
    zippedArchive: true
  }));

  // Combined log - all levels
  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: structuredFormat,
    maxsize: 50 * 1024 * 1024, // 50MB
    maxFiles: 5,
    tailable: true,
    zippedArchive: true
  }));

  // Performance metrics log
  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'performance.log'),
    level: 'info',
    format: performanceFormat,
    maxsize: 20 * 1024 * 1024, // 20MB
    maxFiles: 3,
    tailable: true
  }));

  // Security audit log
  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'security.log'),
    level: 'warn',
    format: securityFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
    tailable: true
  }));
}

// Add daily rotation for high-volume logs
if (isProduction) {
  const DailyRotateFile = require('winston-daily-rotate-file');
  
  logger.add(new DailyRotateFile({
    filename: path.join(logsDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '100m',
    maxFiles: '30d', // Keep 30 days
    format: structuredFormat
  }));
}

// Enhanced logging methods with context
class EnhancedLogger {
  constructor(baseLogger) {
    this.logger = baseLogger;
    this.context = {};
  }

  // Set context for subsequent log messages
  setContext(context) {
    this.context = { ...this.context, ...context };
    return this;
  }

  // Clear context
  clearContext() {
    this.context = {};
    return this;
  }

  // Log with context
  _logWithContext(level, message, meta = {}) {
    const logMeta = { ...this.context, ...meta };
    this.logger.log(level, message, logMeta);
  }

  // Standard log levels
  error(message, meta = {}) {
    this._logWithContext('error', message, meta);
  }

  warn(message, meta = {}) {
    this._logWithContext('warn', message, meta);
  }

  info(message, meta = {}) {
    this._logWithContext('info', message, meta);
  }

  debug(message, meta = {}) {
    this._logWithContext('debug', message, meta);
  }

  // Specialized logging methods
  
  // Performance logging
  performance(metric, value, unit = 'ms', metadata = {}) {
    this.logger.info('Performance metric recorded', {
      metric,
      value,
      unit,
      metadata: { ...this.context, ...metadata },
      type: 'performance'
    });
  }

  // Timer for measuring execution time
  startTimer(label) {
    const startTime = process.hrtime.bigint();
    return {
      end: (metadata = {}) => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        this.performance(label, duration, 'ms', metadata);
        return duration;
      }
    };
  }

  // Security logging
  security(event, severity = 'medium', details = {}) {
    this.logger.warn('Security event', {
      event,
      severity,
      details: { ...this.context, ...details },
      type: 'security'
    });
  }

  // API request logging
  apiRequest(req, res, responseTime) {
    const logData = {
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      requestId: req.id,
      responseTime,
      statusCode: res.statusCode,
      contentLength: res.get('Content-Length'),
      type: 'api_request'
    };

    if (res.statusCode >= 400) {
      this.warn('API request failed', logData);
    } else {
      this.info('API request completed', logData);
    }
  }

  // Database operation logging
  dbOperation(operation, collection, duration, result = {}) {
    this.info('Database operation', {
      operation,
      collection,
      duration,
      result: typeof result === 'object' ? 
        { affectedRows: result.modifiedCount || result.deletedCount || result.insertedCount } : 
        result,
      type: 'db_operation'
    });
  }

  // AI service logging
  aiOperation(operation, model, tokens = {}, cost = null, duration, metadata = {}) {
    this.info('AI operation', {
      operation,
      model,
      tokens,
      cost,
      duration,
      metadata,
      type: 'ai_operation'
    });
  }

  // Job lifecycle logging
  jobEvent(jobId, event, phase, metadata = {}) {
    this.info('Job event', {
      jobId,
      event,
      phase,
      metadata,
      type: 'job_lifecycle'
    });
  }

  // Error with stack trace and context
  errorWithContext(error, message, context = {}) {
    this.error(message || error.message, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      context: { ...this.context, ...context },
      type: 'error_with_context'
    });
  }

  // System health logging
  systemHealth(metrics) {
    this.info('System health check', {
      metrics,
      type: 'system_health'
    });
  }

  // Audit trail
  audit(action, resource, userId, details = {}) {
    this.info('Audit trail', {
      action,
      resource,
      userId,
      details,
      type: 'audit'
    });
  }
}

// Create enhanced logger instance
const enhancedLogger = new EnhancedLogger(logger);

// Middleware for Express request logging
enhancedLogger.requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Add request ID if not present
  if (!req.id) {
    req.id = Math.random().toString(36).substr(2, 9);
  }

  // Set request context
  const requestLogger = enhancedLogger.setContext({
    requestId: req.id,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Log request start
  requestLogger.debug('Request started', {
    method: req.method,
    url: req.originalUrl || req.url,
    query: req.query,
    body: req.method === 'POST' ? (req.body ? '[BODY_PRESENT]' : '[NO_BODY]') : undefined
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    requestLogger.apiRequest(req, res, responseTime);
    enhancedLogger.clearContext();
    originalEnd.apply(this, args);
  };

  next();
};

// Graceful shutdown logging
process.on('SIGTERM', () => {
  enhancedLogger.info('Received SIGTERM, shutting down gracefully');
});

process.on('SIGINT', () => {
  enhancedLogger.info('Received SIGINT, shutting down gracefully');
});

// Unhandled exceptions and rejections
process.on('uncaughtException', (error) => {
  enhancedLogger.error('Uncaught Exception', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    type: 'uncaught_exception'
  });
  
  // Exit after logging
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  enhancedLogger.error('Unhandled Rejection', {
    reason: reason?.toString(),
    promise: promise?.toString(),
    type: 'unhandled_rejection'
  });
});

// Memory usage monitoring
if (isProduction) {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    enhancedLogger.systemHealth({
      memory: {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      },
      uptime: process.uptime()
    });
  }, 5 * 60 * 1000); // Every 5 minutes
}

module.exports = enhancedLogger;
