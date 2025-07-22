// requestLimiter.js - Comprehensive request size and rate limiting middleware
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const logger = require('../logger');

/**
 * Request size and rate limiting middleware factory
 */
class RequestLimiter {
  constructor() {
    this.config = {
      // General API limits
      generalLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_GENERAL) || 100,
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false
      },
      
      // Authentication limits (stricter)
      authLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_AUTH) || 10,
        message: 'Too many authentication attempts, please try again later.',
        skipSuccessfulRequests: true
      },
      
      // Generation limits (very strict)
      generationLimit: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: parseInt(process.env.RATE_LIMIT_GENERATION) || 5,
        message: 'Generation limit reached. Please wait before requesting another novel.',
        skipSuccessfulRequests: false
      },
      
      // File upload limits
      uploadLimit: {
        windowMs: 10 * 60 * 1000, // 10 minutes
        max: parseInt(process.env.RATE_LIMIT_UPLOAD) || 20,
        message: 'Too many file uploads, please try again later.'
      },
      
      // Request size limits
      requestSizes: {
        json: parseInt(process.env.MAX_JSON_SIZE) || (1024 * 1024), // 1MB
        urlencoded: parseInt(process.env.MAX_URLENCODED_SIZE) || (1024 * 1024), // 1MB
        raw: parseInt(process.env.MAX_RAW_SIZE) || (5 * 1024 * 1024), // 5MB
        text: parseInt(process.env.MAX_TEXT_SIZE) || (1024 * 1024), // 1MB
        field: parseInt(process.env.MAX_FIELD_SIZE) || (1024 * 1024), // 1MB per field
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || (5 * 1024 * 1024), // 5MB
        files: parseInt(process.env.MAX_FILES) || 5,
        fields: parseInt(process.env.MAX_FIELDS) || 100
      }
    };

    logger.info('Request limiter initialized', { config: this.config });
  }

  /**
   * Create rate limiter with custom options
   */
  createRateLimit(options = {}) {
    const config = { ...this.config.generalLimit, ...options };
    
    return rateLimit({
      ...config,
      handler: (req, res, next) => {
        logger.security('Rate limit exceeded', 'high', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method,
          limit: config.max,
          windowMs: config.windowMs
        });
        
        res.status(429).json({
          error: config.message,
          retryAfter: Math.ceil(config.windowMs / 1000),
          limit: config.max,
          windowMs: config.windowMs
        });
      }
      // Note: onLimitReached is deprecated in express-rate-limit v7
      // Rate limiting events are now handled in the handler function above
    });
  }

  /**
   * Create slow down middleware (progressive delay)
   */
  createSlowDown(options = {}) {
    const defaultOptions = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      delayAfter: 50, // Start slowing down after 50 requests
      delayMs: 500, // Add 500ms delay per request after delayAfter
      maxDelayMs: 10000, // Maximum delay of 10 seconds
      skipFailedRequests: false,
      skipSuccessfulRequests: false
    };

    return slowDown({
      ...defaultOptions,
      ...options
      // Note: onLimitReached is deprecated - slowDown middleware handles delays differently
    });
  }

  /**
   * General API rate limiting
   */
  general() {
    return this.createRateLimit(this.config.generalLimit);
  }

  /**
   * Authentication rate limiting
   */
  auth() {
    return this.createRateLimit(this.config.authLimit);
  }

  /**
   * Novel generation rate limiting
   */
  generation() {
    return this.createRateLimit(this.config.generationLimit);
  }

  /**
   * File upload rate limiting
   */
  upload() {
    return this.createRateLimit(this.config.uploadLimit);
  }

  /**
   * Request size validation middleware
   */
  requestSize() {
    return (req, res, next) => {
      const contentLength = parseInt(req.get('Content-Length') || '0');
      const maxSize = this.getMaxSizeForRequest(req);

      if (contentLength > maxSize) {
        logger.security('Request size exceeded', 'medium', {
          ip: req.ip,
          path: req.path,
          method: req.method,
          contentLength,
          maxSize,
          userAgent: req.get('User-Agent')
        });

        return res.status(413).json({
          error: 'Request too large',
          maxSize: maxSize,
          receivedSize: contentLength,
          message: `Request size ${this.formatBytes(contentLength)} exceeds limit of ${this.formatBytes(maxSize)}`
        });
      }

      next();
    };
  }

  /**
   * Get maximum allowed size for a specific request
   */
  getMaxSizeForRequest(req) {
    const contentType = req.get('Content-Type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      return this.config.requestSizes.raw; // File uploads
    } else if (contentType.includes('application/json')) {
      return this.config.requestSizes.json;
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      return this.config.requestSizes.urlencoded;
    } else if (contentType.includes('text/')) {
      return this.config.requestSizes.text;
    }
    
    return this.config.requestSizes.raw; // Default
  }

  /**
   * Request validation middleware
   */
  validate() {
    return (req, res, next) => {
      // Validate request method
      const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
      if (!allowedMethods.includes(req.method)) {
        logger.security('Invalid HTTP method', 'medium', {
          ip: req.ip,
          method: req.method,
          path: req.path
        });
        
        return res.status(405).json({
          error: 'Method not allowed',
          allowed: allowedMethods
        });
      }

      // Validate content type for POST/PUT requests
      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const contentType = req.get('Content-Type');
        if (!contentType) {
          return res.status(400).json({
            error: 'Content-Type header required for this method'
          });
        }

        const allowedTypes = [
          'application/json',
          'application/x-www-form-urlencoded',
          'multipart/form-data',
          'text/plain'
        ];

        const isValidType = allowedTypes.some(type => contentType.includes(type));
        if (!isValidType) {
          logger.security('Invalid content type', 'medium', {
            ip: req.ip,
            contentType,
            path: req.path
          });
          
          return res.status(415).json({
            error: 'Unsupported Media Type',
            allowed: allowedTypes
          });
        }
      }

      // Validate URL length
      const maxUrlLength = 2048;
      if (req.originalUrl.length > maxUrlLength) {
        logger.security('URL too long', 'medium', {
          ip: req.ip,
          urlLength: req.originalUrl.length,
          maxLength: maxUrlLength
        });
        
        return res.status(414).json({
          error: 'URL too long',
          maxLength: maxUrlLength
        });
      }

      // Validate headers
      const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip'];
      for (const header of suspiciousHeaders) {
        const value = req.get(header);
        if (value && value.length > 200) {
          logger.security('Suspicious header detected', 'medium', {
            ip: req.ip,
            header,
            value: value.substring(0, 100) + '...'
          });
        }
      }

      next();
    };
  }

  /**
   * Body parser size limits
   */
  getBodyParserOptions() {
    return {
      json: {
        limit: this.config.requestSizes.json,
        verify: (req, res, buf, encoding) => {
          if (buf.length > this.config.requestSizes.json) {
            throw new Error('JSON payload too large');
          }
        }
      },
      urlencoded: {
        limit: this.config.requestSizes.urlencoded,
        extended: true,
        parameterLimit: 100,
        verify: (req, res, buf, encoding) => {
          if (buf.length > this.config.requestSizes.urlencoded) {
            throw new Error('URL-encoded payload too large');
          }
        }
      },
      raw: {
        limit: this.config.requestSizes.raw,
        verify: (req, res, buf, encoding) => {
          if (buf.length > this.config.requestSizes.raw) {
            throw new Error('Raw payload too large');
          }
        }
      },
      text: {
        limit: this.config.requestSizes.text,
        verify: (req, res, buf, encoding) => {
          if (buf.length > this.config.requestSizes.text) {
            throw new Error('Text payload too large');
          }
        }
      }
    };
  }

  /**
   * Multer configuration for file uploads
   */
  getMulterOptions() {
    return {
      limits: {
        fileSize: this.config.requestSizes.fileSize,
        files: this.config.requestSizes.files,
        fields: this.config.requestSizes.fields,
        fieldNameSize: 100,
        fieldSize: this.config.requestSizes.field
      },
      fileFilter: (req, file, cb) => {
        // Basic file type validation
        const allowedMimes = [
          'text/plain',
          'text/markdown',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          logger.security('Invalid file type uploaded', 'medium', {
            ip: req.ip,
            mimetype: file.mimetype,
            filename: file.originalname
          });
          cb(new Error('File type not allowed'), false);
        }
      }
    };
  }

  /**
   * Format bytes into human readable format
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info('Request limiter configuration updated', { config: this.config });
  }
}

// Export singleton instance
module.exports = new RequestLimiter();
