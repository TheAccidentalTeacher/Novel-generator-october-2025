const socketIO = require('socket.io');
const logger = require('./logger');

let io;
const activeConnections = new Map(); // Track active connections for cleanup

// Enhanced event types for monitoring and transparency
const EventTypes = {
  // Existing events
  JOB_UPDATE: 'jobUpdate',
  CHAPTER_COMPLETE: 'chapterComplete',
  
  // New monitoring events
  STORY_BIBLE_UPDATE: 'storyBibleUpdate',
  CONTINUITY_ALERT: 'continuityAlert',
  PLOT_THREAD_UPDATE: 'plotThreadUpdate',
  CHARACTER_UPDATE: 'characterUpdate',
  GENERATION_PROGRESS: 'generationProgress',
  QUALITY_METRICS: 'qualityMetrics',
  LIVE_TEXT_STREAM: 'liveTextStream',
  PHASE_TRANSITION: 'phaseTransition',
  COST_TRACKING: 'costTracking',
  ENHANCEMENT_APPLIED: 'enhancementApplied',
  AI_DECISION: 'aiDecision',
  SYSTEM_HEALTH: 'systemHealth'
};

const initializeWebSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: true, // Allow all origins since frontend is served from same domain
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 120000, // 2 minutes (increased for long generation)
    pingInterval: 30000, // 30 seconds (more frequent pings)
    transports: ['websocket', 'polling'],
    // Railway-specific optimizations
    allowEIO3: true,
    maxHttpBufferSize: 1e6, // 1MB buffer
    connectTimeout: 45000, // 45 seconds connection timeout
    upgradeTimeout: 30000, // 30 seconds upgrade timeout
    // Force polling fallback if websocket fails
    forceJSONP: false
  });

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    // Track connection with metadata
    activeConnections.set(socket.id, {
      connectedAt: new Date(),
      lastActivity: new Date(),
      subscriptions: new Set()
    });
    
    socket.on('subscribe', (jobId) => {
      if (!jobId) {
        logger.warn(`Client ${socket.id} tried to subscribe without jobId`);
        return;
      }
      
      socket.join(`job-${jobId}`);
      logger.info(`Client ${socket.id} subscribed to job ${jobId}`);
      
      // Track subscription
      const connection = activeConnections.get(socket.id);
      if (connection) {
        connection.subscriptions.add(jobId);
        connection.lastActivity = new Date();
      }
    });
    
    socket.on('unsubscribe', (jobId) => {
      if (!jobId) {
        logger.warn(`Client ${socket.id} tried to unsubscribe without jobId`);
        return;
      }
      
      socket.leave(`job-${jobId}`);
      logger.info(`Client ${socket.id} unsubscribed from job ${jobId}`);
      
      // Remove subscription tracking
      const connection = activeConnections.get(socket.id);
      if (connection) {
        connection.subscriptions.delete(jobId);
        connection.lastActivity = new Date();
      }
    });
    
    socket.on('ping', () => {
      // Update last activity on ping
      const connection = activeConnections.get(socket.id);
      if (connection) {
        connection.lastActivity = new Date();
      }
      socket.emit('pong');
    });
    
    // Add heartbeat mechanism for long-running processes
    socket.on('heartbeat', (data) => {
      const connection = activeConnections.get(socket.id);
      if (connection) {
        connection.lastActivity = new Date();
        // Send heartbeat response
        socket.emit('heartbeat_ack', { 
          timestamp: Date.now(),
          jobId: data?.jobId 
        });
      }
    });
    
    // Keep-alive for active generation jobs
    const heartbeatInterval = setInterval(() => {
      const connection = activeConnections.get(socket.id);
      if (connection && connection.subscriptions.size > 0) {
        socket.emit('keep_alive', { 
          timestamp: Date.now(),
          activeJobs: Array.from(connection.subscriptions)
        });
      }
    }, 45000); // Every 45 seconds
    
    // Clean up interval on disconnect
    socket.on('disconnect', (reason) => {
      logger.info(`Client ${socket.id} disconnected: ${reason}`);
      
      // Clear heartbeat interval
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      
      // Clean up connection tracking
      const connection = activeConnections.get(socket.id);
      if (connection) {
        logger.debug(`Cleaning up ${connection.subscriptions.size} subscriptions for ${socket.id}`);
        activeConnections.delete(socket.id);
      }
    });
    
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
      
      // Clean up on error
      activeConnections.delete(socket.id);
    });
  });

  // Periodic cleanup of stale connections
  setInterval(() => {
    cleanupStaleConnections();
  }, 60000); // Clean up every minute

  logger.info('WebSocket server initialized with connection tracking');
};

const cleanupStaleConnections = () => {
  const now = Date.now();
  const staleThreshold = 5 * 60 * 1000; // 5 minutes
  let cleanedCount = 0;
  
  // Check all tracked connections
  for (const [socketId, connection] of activeConnections) {
    const timeSinceActivity = now - connection.lastActivity.getTime();
    
    if (timeSinceActivity > staleThreshold) {
      // Check if socket still exists in io.sockets
      const socket = io.sockets.sockets.get(socketId);
      
      if (!socket || !socket.connected) {
        logger.debug(`Cleaning up stale connection: ${socketId}`);
        activeConnections.delete(socketId);
        cleanedCount++;
      }
    }
  }
  
  if (cleanedCount > 0) {
    logger.info(`Cleaned up ${cleanedCount} stale WebSocket connections`);
  }
  
  // Also clean up any disconnected sockets from io.sockets
  const ioSocketsCount = io.sockets.sockets.size;
  const trackedCount = activeConnections.size;
  
  if (ioSocketsCount !== trackedCount) {
    logger.debug(`Socket count mismatch: IO=${ioSocketsCount}, Tracked=${trackedCount}`);
  }
};

const emitJobUpdate = (jobId, updateData) => {
  if (!io) {
    logger.warn('WebSocket not initialized, cannot emit job update');
    return;
  }
  
  if (!jobId) {
    logger.warn('Cannot emit job update without jobId');
    return;
  }
  
  const room = `job-${jobId}`;
  const payload = {
    jobId,
    timestamp: new Date(),
    ...updateData
  };
  
  io.to(room).emit('job-update', payload);
  logger.debug(`Emitted update for job ${jobId} to room ${room}:`, updateData);
};

const hasSubscribers = (jobId) => {
  if (!io || !jobId) return false;
  
  const room = io.sockets.adapter.rooms.get(`job-${jobId}`);
  return room && room.size > 0;
};

const getConnectionStats = () => {
  if (!io) {
    return {
      totalConnections: 0,
      activeConnections: 0,
      rooms: 0
    };
  }
  
  return {
    totalConnections: io.sockets.sockets.size,
    activeConnections: activeConnections.size,
    rooms: io.sockets.adapter.rooms.size,
    connectionDetails: Array.from(activeConnections.entries()).map(([socketId, connection]) => ({
      socketId,
      connectedAt: connection.connectedAt,
      lastActivity: connection.lastActivity,
      subscriptions: Array.from(connection.subscriptions)
    }))
  };
};

const broadcastToAllClients = (event, data) => {
  if (!io) {
    logger.warn('WebSocket not initialized, cannot broadcast');
    return;
  }
  
  io.emit(event, {
    timestamp: new Date(),
    ...data
  });
  
  logger.debug(`Broadcasted ${event} to all clients:`, data);
};

const gracefulShutdown = () => {
  if (io) {
    logger.info('Gracefully shutting down WebSocket server...');
    
    // Notify all clients of shutdown
    broadcastToAllClients('server-shutdown', {
      message: 'Server is shutting down for maintenance'
    });
    
    // Close all connections
    io.close(() => {
      logger.info('WebSocket server closed');
    });
    
    // Clear tracking
    activeConnections.clear();
  }
};

// Enhanced emission functions for monitoring system
const emitStoryBibleUpdate = (jobId, bibleUpdate) => {
  if (!io || !hasSubscribers(jobId)) return;
  
  const targetRoom = `job-${jobId}`;
  io.to(targetRoom).emit(EventTypes.STORY_BIBLE_UPDATE, {
    jobId,
    timestamp: new Date().toISOString(),
    ...bibleUpdate
  });
  
  logger.debug(`Story bible update emitted for job ${jobId}:`, bibleUpdate);
};

const emitContinuityAlert = (jobId, alert) => {
  if (!io || !hasSubscribers(jobId)) return;
  
  const targetRoom = `job-${jobId}`;
  io.to(targetRoom).emit(EventTypes.CONTINUITY_ALERT, {
    jobId,
    timestamp: new Date().toISOString(),
    severity: alert.severity || 'warning',
    ...alert
  });
  
  logger.debug(`Continuity alert emitted for job ${jobId}:`, alert);
};

const emitGenerationProgress = (jobId, progress) => {
  if (!io || !hasSubscribers(jobId)) return;
  
  const targetRoom = `job-${jobId}`;
  io.to(targetRoom).emit(EventTypes.GENERATION_PROGRESS, {
    jobId,
    timestamp: new Date().toISOString(),
    ...progress
  });
  
  // Don't log every progress update to avoid spam
};

const emitLiveTextStream = (jobId, textData) => {
  if (!io || !hasSubscribers(jobId)) return;
  
  const targetRoom = `job-${jobId}`;
  io.to(targetRoom).emit(EventTypes.LIVE_TEXT_STREAM, {
    jobId,
    timestamp: new Date().toISOString(),
    ...textData
  });
};

const emitPhaseTransition = (jobId, phase) => {
  if (!io || !hasSubscribers(jobId)) return;
  
  const targetRoom = `job-${jobId}`;
  io.to(targetRoom).emit(EventTypes.PHASE_TRANSITION, {
    jobId,
    timestamp: new Date().toISOString(),
    ...phase
  });
  
  logger.info(`Phase transition emitted for job ${jobId}: ${phase.from} -> ${phase.to}`);
};

const emitQualityMetrics = (jobId, metrics) => {
  if (!io || !hasSubscribers(jobId)) return;
  
  const targetRoom = `job-${jobId}`;
  io.to(targetRoom).emit(EventTypes.QUALITY_METRICS, {
    jobId,
    timestamp: new Date().toISOString(),
    ...metrics
  });
  
  logger.debug(`Quality metrics emitted for job ${jobId}:`, metrics);
};

const emitCostTracking = (jobId, cost) => {
  if (!io || !hasSubscribers(jobId)) return;
  
  const targetRoom = `job-${jobId}`;
  io.to(targetRoom).emit(EventTypes.COST_TRACKING, {
    jobId,
    timestamp: new Date().toISOString(),
    ...cost
  });
};

const emitAIDecision = (jobId, decision) => {
  if (!io || !hasSubscribers(jobId)) return;
  
  const targetRoom = `job-${jobId}`;
  io.to(targetRoom).emit(EventTypes.AI_DECISION, {
    jobId,
    timestamp: new Date().toISOString(),
    ...decision
  });
  
  logger.debug(`AI decision emitted for job ${jobId}:`, decision);
};

module.exports = {
  initializeWebSocket,
  emitJobUpdate,
  hasSubscribers,
  getConnectionStats,
  broadcastToAllClients,
  gracefulShutdown,
  cleanupStaleConnections,
  // Enhanced monitoring functions
  emitStoryBibleUpdate,
  emitContinuityAlert,
  emitGenerationProgress,
  emitLiveTextStream,
  emitPhaseTransition,
  emitQualityMetrics,
  emitCostTracking,
  emitAIDecision,
  EventTypes
};
