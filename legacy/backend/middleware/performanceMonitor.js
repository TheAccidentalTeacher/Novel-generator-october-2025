// performanceMonitor.js - Comprehensive performance monitoring middleware
const logger = require('../logger');
const os = require('os');
const v8 = require('v8');
const { performance } = require('perf_hooks');

/**
 * Performance monitoring and metrics collection system
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        failed: 0,
        averageResponseTime: 0,
        slowRequests: 0,
        responseTimes: []
      },
      system: {
        lastCheck: null,
        cpuUsage: 0,
        memoryUsage: {},
        heapStatistics: {},
        loadAverage: []
      },
      endpoints: new Map(),
      alerts: []
    };

    this.config = {
      slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD) || 5000, // 5 seconds
      metricsRetentionMinutes: parseInt(process.env.METRICS_RETENTION_MINUTES) || 60, // 1 hour
      systemMonitorInterval: parseInt(process.env.SYSTEM_MONITOR_INTERVAL) || 30000, // 30 seconds
      alertThresholds: {
        responseTime: parseInt(process.env.ALERT_RESPONSE_TIME) || 10000, // 10 seconds
        errorRate: parseFloat(process.env.ALERT_ERROR_RATE) || 0.1, // 10%
        memoryUsage: parseFloat(process.env.ALERT_MEMORY_USAGE) || 0.9, // 90%
        cpuUsage: parseFloat(process.env.ALERT_CPU_USAGE) || 0.8 // 80%
      }
    };

    // Start system monitoring
    this.startSystemMonitoring();
    
    logger.info('Performance monitor initialized', { config: this.config });
  }

  /**
   * Express middleware for request performance monitoring
   */
  requestMiddleware() {
    return (req, res, next) => {
      const startTime = performance.now();
      const startMemory = process.memoryUsage();
      
      // Add request ID if not present
      if (!req.id) {
        req.id = Math.random().toString(36).substr(2, 9);
      }

      // Track request start
      this.trackRequestStart(req);

      // Override res.end to capture metrics
      const originalEnd = res.end;
      res.end = (...args) => {
        const endTime = performance.now();
        const endMemory = process.memoryUsage();
        const responseTime = endTime - startTime;

        // Track request completion
        this.trackRequestEnd(req, res, responseTime, {
          startMemory,
          endMemory,
          startTime,
          endTime
        });

        originalEnd.apply(res, args);
      };

      next();
    };
  }

  /**
   * Track request start
   */
  trackRequestStart(req) {
    const endpoint = this.getEndpointKey(req);
    
    if (!this.metrics.endpoints.has(endpoint)) {
      this.metrics.endpoints.set(endpoint, {
        path: req.route?.path || req.path,
        method: req.method,
        requests: 0,
        errors: 0,
        totalResponseTime: 0,
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        responseTimes: [],
        statusCodes: new Map(),
        firstSeen: new Date(),
        lastSeen: new Date()
      });
    }

    this.metrics.requests.total++;
  }

  /**
   * Track request completion with detailed metrics
   */
  trackRequestEnd(req, res, responseTime, memoryData) {
    const endpoint = this.getEndpointKey(req);
    const endpointMetrics = this.metrics.endpoints.get(endpoint);
    
    if (!endpointMetrics) return;

    // Update endpoint metrics
    endpointMetrics.requests++;
    endpointMetrics.totalResponseTime += responseTime;
    endpointMetrics.averageResponseTime = endpointMetrics.totalResponseTime / endpointMetrics.requests;
    endpointMetrics.minResponseTime = Math.min(endpointMetrics.minResponseTime, responseTime);
    endpointMetrics.maxResponseTime = Math.max(endpointMetrics.maxResponseTime, responseTime);
    endpointMetrics.lastSeen = new Date();

    // Track response times (keep last 100)
    endpointMetrics.responseTimes.push({
      time: responseTime,
      timestamp: new Date(),
      statusCode: res.statusCode
    });
    if (endpointMetrics.responseTimes.length > 100) {
      endpointMetrics.responseTimes.shift();
    }

    // Track status codes
    const statusCode = res.statusCode.toString();
    endpointMetrics.statusCodes.set(
      statusCode,
      (endpointMetrics.statusCodes.get(statusCode) || 0) + 1
    );

    // Track errors
    if (res.statusCode >= 400) {
      endpointMetrics.errors++;
      this.metrics.requests.failed++;
    }

    // Track slow requests
    if (responseTime > this.config.slowRequestThreshold) {
      this.metrics.requests.slowRequests++;
      
      logger.performance('slow_request', responseTime, 'ms', {
        endpoint: endpoint,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        requestId: req.id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    // Update global averages
    this.metrics.requests.responseTimes.push(responseTime);
    if (this.metrics.requests.responseTimes.length > 1000) {
      this.metrics.requests.responseTimes.shift();
    }
    
    this.metrics.requests.averageResponseTime = 
      this.metrics.requests.responseTimes.reduce((a, b) => a + b, 0) / 
      this.metrics.requests.responseTimes.length;

    // Memory usage tracking
    const memoryDelta = {
      rss: memoryData.endMemory.rss - memoryData.startMemory.rss,
      heapUsed: memoryData.endMemory.heapUsed - memoryData.startMemory.heapUsed,
      external: memoryData.endMemory.external - memoryData.startMemory.external
    };

    // Log performance data
    logger.performance('request_completed', responseTime, 'ms', {
      endpoint: endpoint,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      requestId: req.id,
      memoryDelta: memoryDelta,
      contentLength: res.get('Content-Length')
    });

    // Check for performance alerts
    this.checkPerformanceAlerts(req, res, responseTime, endpointMetrics);
  }

  /**
   * Get endpoint key for metrics grouping
   */
  getEndpointKey(req) {
    // Group by route pattern instead of exact path to avoid explosion of metrics
    const routePattern = req.route?.path || req.path;
    return `${req.method} ${routePattern}`;
  }

  /**
   * Start system performance monitoring
   */
  startSystemMonitoring() {
    const monitor = () => {
      try {
        this.collectSystemMetrics();
      } catch (error) {
        logger.error('Error collecting system metrics:', error);
      }
    };

    // Initial collection
    monitor();
    
    // Periodic collection
    setInterval(monitor, this.config.systemMonitorInterval);
  }

  /**
   * Collect comprehensive system metrics
   */
  collectSystemMetrics() {
    const now = new Date();
    
    // CPU usage
    const cpuUsage = process.cpuUsage();
    this.metrics.system.cpuUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds

    // Memory usage
    this.metrics.system.memoryUsage = process.memoryUsage();
    
    // Heap statistics
    this.metrics.system.heapStatistics = v8.getHeapStatistics();
    
    // Load average (Unix-like systems only)
    if (os.loadavg) {
      this.metrics.system.loadAverage = os.loadavg();
    }

    // System information
    const systemInfo = {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      uptime: os.uptime(),
      nodeVersion: process.version,
      pid: process.pid
    };

    this.metrics.system.lastCheck = now;

    // Log system health
    logger.systemHealth({
      memory: this.metrics.system.memoryUsage,
      heap: this.metrics.system.heapStatistics,
      cpu: this.metrics.system.cpuUsage,
      loadAverage: this.metrics.system.loadAverage,
      system: systemInfo,
      timestamp: now
    });

    // Check system alerts
    this.checkSystemAlerts();
  }

  /**
   * Check for performance alerts
   */
  checkPerformanceAlerts(req, res, responseTime, endpointMetrics) {
    const alerts = [];

    // Response time alert
    if (responseTime > this.config.alertThresholds.responseTime) {
      alerts.push({
        type: 'response_time',
        severity: 'high',
        message: `Response time ${responseTime.toFixed(2)}ms exceeds threshold ${this.config.alertThresholds.responseTime}ms`,
        endpoint: this.getEndpointKey(req),
        value: responseTime,
        threshold: this.config.alertThresholds.responseTime
      });
    }

    // Error rate alert
    const errorRate = endpointMetrics.errors / endpointMetrics.requests;
    if (errorRate > this.config.alertThresholds.errorRate && endpointMetrics.requests > 10) {
      alerts.push({
        type: 'error_rate',
        severity: 'medium',
        message: `Error rate ${(errorRate * 100).toFixed(2)}% exceeds threshold ${(this.config.alertThresholds.errorRate * 100).toFixed(2)}%`,
        endpoint: this.getEndpointKey(req),
        value: errorRate,
        threshold: this.config.alertThresholds.errorRate
      });
    }

    // Process alerts
    alerts.forEach(alert => {
      this.metrics.alerts.push({
        ...alert,
        timestamp: new Date(),
        requestId: req.id,
        ip: req.ip
      });

      logger.security('Performance alert', alert.severity, alert);
    });

    // Keep only recent alerts (last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    this.metrics.alerts = this.metrics.alerts.filter(alert => alert.timestamp > oneHourAgo);
  }

  /**
   * Check for system-level alerts
   */
  checkSystemAlerts() {
    const alerts = [];

    // Memory usage alert
    const memoryUsagePercent = this.metrics.system.memoryUsage.heapUsed / this.metrics.system.memoryUsage.heapTotal;
    if (memoryUsagePercent > this.config.alertThresholds.memoryUsage) {
      alerts.push({
        type: 'memory_usage',
        severity: 'high',
        message: `Memory usage ${(memoryUsagePercent * 100).toFixed(2)}% exceeds threshold ${(this.config.alertThresholds.memoryUsage * 100).toFixed(2)}%`,
        value: memoryUsagePercent,
        threshold: this.config.alertThresholds.memoryUsage
      });
    }

    // Process alerts
    alerts.forEach(alert => {
      this.metrics.alerts.push({
        ...alert,
        timestamp: new Date(),
        type: 'system_alert'
      });

      logger.security('System alert', alert.severity, alert);
    });
  }

  /**
   * Get performance metrics summary
   */
  getMetrics() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    return {
      timestamp: now,
      requests: {
        total: this.metrics.requests.total,
        failed: this.metrics.requests.failed,
        successRate: this.metrics.requests.total > 0 ? 
          ((this.metrics.requests.total - this.metrics.requests.failed) / this.metrics.requests.total * 100).toFixed(2) + '%' : 
          'N/A',
        averageResponseTime: this.metrics.requests.averageResponseTime.toFixed(2) + 'ms',
        slowRequests: this.metrics.requests.slowRequests
      },
      system: {
        ...this.metrics.system,
        memoryUsagePercent: this.metrics.system.memoryUsage.heapTotal > 0 ?
          (this.metrics.system.memoryUsage.heapUsed / this.metrics.system.memoryUsage.heapTotal * 100).toFixed(2) + '%' :
          'N/A'
      },
      endpoints: Array.from(this.metrics.endpoints.entries()).map(([key, metrics]) => ({
        endpoint: key,
        ...metrics,
        errorRate: metrics.requests > 0 ? (metrics.errors / metrics.requests * 100).toFixed(2) + '%' : '0%',
        averageResponseTime: metrics.averageResponseTime.toFixed(2) + 'ms'
      })),
      alerts: this.metrics.alerts.filter(alert => alert.timestamp > oneHourAgo),
      uptime: process.uptime()
    };
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const metrics = this.getMetrics();
    const now = new Date();
    
    // Determine overall health
    let health = 'healthy';
    const issues = [];

    // Check response time
    if (this.metrics.requests.averageResponseTime > this.config.slowRequestThreshold / 2) {
      health = 'degraded';
      issues.push('High average response time');
    }

    // Check error rate
    const errorRate = this.metrics.requests.total > 0 ? 
      this.metrics.requests.failed / this.metrics.requests.total : 0;
    if (errorRate > this.config.alertThresholds.errorRate) {
      health = 'unhealthy';
      issues.push('High error rate');
    }

    // Check memory usage
    const memoryUsagePercent = this.metrics.system.memoryUsage.heapUsed / this.metrics.system.memoryUsage.heapTotal;
    if (memoryUsagePercent > this.config.alertThresholds.memoryUsage) {
      health = 'unhealthy';
      issues.push('High memory usage');
    }

    return {
      status: health,
      timestamp: now,
      issues: issues,
      metrics: {
        requests: metrics.requests,
        memory: metrics.system.memoryUsagePercent,
        uptime: metrics.uptime,
        activeAlerts: metrics.alerts.length
      }
    };
  }

  /**
   * Reset metrics (useful for testing)
   */
  reset() {
    this.metrics = {
      requests: {
        total: 0,
        failed: 0,
        averageResponseTime: 0,
        slowRequests: 0,
        responseTimes: []
      },
      system: {
        lastCheck: null,
        cpuUsage: 0,
        memoryUsage: {},
        heapStatistics: {},
        loadAverage: []
      },
      endpoints: new Map(),
      alerts: []
    };

    logger.info('Performance metrics reset');
  }
}

// Export singleton instance
module.exports = new PerformanceMonitor();
