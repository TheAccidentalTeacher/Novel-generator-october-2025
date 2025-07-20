const socketIO = require('socket.io');
const logger = require('./logger');

let io;

const initializeWebSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: true, // Allow all origins since frontend is served from same domain
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000, // 60 seconds
    pingInterval: 25000 // 25 seconds
  });

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    
    socket.on('subscribe', (jobId) => {
      socket.join(`job-${jobId}`);
      logger.info(`Client ${socket.id} subscribed to job ${jobId}`);
    });
    
    socket.on('unsubscribe', (jobId) => {
      socket.leave(`job-${jobId}`);
      logger.info(`Client ${socket.id} unsubscribed from job ${jobId}`);
    });
    
    socket.on('disconnect', (reason) => {
      logger.info(`Client ${socket.id} disconnected: ${reason}`);
    });
  });

  logger.info('WebSocket server initialized');
};

const emitJobUpdate = (jobId, updateData) => {
  if (io) {
    const room = `job-${jobId}`;
    io.to(room).emit('job-update', {
      jobId,
      timestamp: new Date(),
      ...updateData
    });
    logger.debug(`Emitted update for job ${jobId}:`, updateData);
  }
};

const hasSubscribers = (jobId) => {
  if (!io) return false;
  const room = io.sockets.adapter.rooms.get(`job-${jobId}`);
  return room && room.size > 0;
};

module.exports = {
  initializeWebSocket,
  emitJobUpdate,
  hasSubscribers
};
