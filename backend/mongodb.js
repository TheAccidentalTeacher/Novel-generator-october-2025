// mongodb.js - Production-ready MongoDB connection with comprehensive error handling
const mongoose = require('mongoose');
const logger = require('./logger');

class DatabaseManager {
  constructor() {
    this.connectionState = 'disconnected';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = parseInt(process.env.DB_MAX_RECONNECT_ATTEMPTS) || 10;
    this.reconnectInterval = parseInt(process.env.DB_RECONNECT_INTERVAL) || 5000;
    this.isShuttingDown = false;
    this.connectionPromise = null;
    
    // Connection configuration
    this.connectionOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: parseInt(process.env.DB_SERVER_SELECTION_TIMEOUT) || 30000, // 30 seconds
      socketTimeoutMS: parseInt(process.env.DB_SOCKET_TIMEOUT) || 60000, // 60 seconds
      connectTimeoutMS: parseInt(process.env.DB_CONNECT_TIMEOUT) || 30000, // 30 seconds
      maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE) || 10, // Maximum connections
      minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE) || 2, // Minimum connections
      maxIdleTimeMS: parseInt(process.env.DB_MAX_IDLE_TIME) || 30000, // 30 seconds
      waitQueueTimeoutMS: parseInt(process.env.DB_WAIT_QUEUE_TIMEOUT) || 10000, // 10 seconds
      retryWrites: true,
      retryReads: true,
      readPreference: 'primary',
      compressors: ['zlib'],
      heartbeatFrequencyMS: 10000, // 10 seconds
      serverSelectionRetryDelayMS: 2000, // 2 seconds
    };
    
    // Bind event handlers
    this.handleConnectionEvents();
    
    logger.info('Database manager initialized');
  }

  /**
   * Establish database connection with retry logic
   */
  async connect() {
    if (this.connectionPromise) {
      logger.debug('Connection already in progress, waiting...');
      return this.connectionPromise;
    }

    this.connectionPromise = this._attemptConnection();
    return this.connectionPromise;
  }

  /**
   * Internal connection attempt with comprehensive error handling
   */
  async _attemptConnection() {
    try {
      // Validate MongoDB URI
      if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI environment variable is not set');
      }

      if (!process.env.MONGODB_URI.startsWith('mongodb')) {
        throw new Error('Invalid MongoDB URI format');
      }

      logger.info('Connecting to MongoDB...');
      this.connectionState = 'connecting';

      // Set mongoose configuration
      mongoose.set('strictQuery', true); // Prepare for Mongoose 7
      mongoose.set('bufferCommands', false); // Disable mongoose buffering
      mongoose.set('maxTimeMS', 20000); // Global query timeout

      // Attempt connection
      await mongoose.connect(process.env.MONGODB_URI, this.connectionOptions);
      
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      this.connectionPromise = null;
      
      logger.info('✅ MongoDB connected successfully');
      logger.debug('Database connection details:', {
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
        readyState: mongoose.connection.readyState
      });

      // Test the connection
      await this.testConnection();
      
      return { success: true, message: 'Connected to MongoDB' };

    } catch (error) {
      this.connectionState = 'error';
      this.connectionPromise = null;
      
      logger.error('❌ MongoDB connection failed:', {
        error: error.message,
        code: error.code,
        codeName: error.codeName,
        attempt: this.reconnectAttempts + 1
      });

      // Handle specific error types
      if (error.name === 'MongoServerSelectionError') {
        logger.error('Server selection failed - check MongoDB URI and network connectivity');
      } else if (error.name === 'MongooseTimeoutError') {
        logger.error('Connection timeout - MongoDB server may be overloaded');
      } else if (error.name === 'MongoParseError') {
        logger.error('URI parsing error - check MongoDB connection string format');
      }

      throw error;
    }
  }

  /**
   * Test database connection with a simple operation
   */
  async testConnection() {
    try {
      const admin = mongoose.connection.db.admin();
      const result = await admin.ping();
      logger.debug('Database ping successful:', result);
      
      // Test basic operations
      const collections = await mongoose.connection.db.listCollections().toArray();
      logger.debug(`Database has ${collections.length} collections`);
      
      return { success: true, ping: result };
      
    } catch (error) {
      logger.error('Database connection test failed:', error);
      throw error;
    }
  }

  /**
   * Handle all MongoDB connection events
   */
  handleConnectionEvents() {
    // Connection established
    mongoose.connection.on('connected', () => {
      this.connectionState = 'connected';
      logger.info('🔗 MongoDB connection established');
    });

    // Connection ready
    mongoose.connection.on('open', () => {
      logger.info('📖 MongoDB connection opened');
    });

    // Connection error
    mongoose.connection.on('error', (error) => {
      this.connectionState = 'error';
      logger.error('💥 MongoDB connection error:', {
        error: error.message,
        code: error.code,
        name: error.name
      });
      
      // Don't attempt reconnection on authentication errors
      if (error.name === 'MongoAuthenticationError') {
        logger.error('Authentication failed - check MongoDB credentials');
        return;
      }
      
      // Attempt reconnection for recoverable errors
      if (!this.isShuttingDown) {
        this.scheduleReconnection();
      }
    });

    // Connection lost
    mongoose.connection.on('disconnected', () => {
      this.connectionState = 'disconnected';
      logger.warn('🔌 MongoDB disconnected');
      
      if (!this.isShuttingDown) {
        this.scheduleReconnection();
      }
    });

    // Reconnection attempt
    mongoose.connection.on('reconnected', () => {
      this.connectionState = 'connected';
      this.reconnectAttempts = 0;
      logger.info('🔄 MongoDB reconnected successfully');
    });

    // Connection close
    mongoose.connection.on('close', () => {
      this.connectionState = 'closed';
      logger.info('❌ MongoDB connection closed');
    });

    // Buffer overflow (when operations are queued but connection is lost)
    mongoose.connection.on('buffer', () => {
      logger.warn('⚠️ MongoDB operations are being buffered due to connection issues');
    });

    // Full set event (replica set only)
    mongoose.connection.on('fullsetup', () => {
      logger.info('🎯 MongoDB replica set fully connected');
    });
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnection() {
    if (this.isShuttingDown || this.connectionPromise) {
      return;
    }

    this.reconnectAttempts++;
    
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      logger.error(`❌ Maximum reconnection attempts (${this.maxReconnectAttempts}) exceeded. Manual intervention required.`);
      return;
    }

    // Exponential backoff: 5s, 10s, 20s, 40s, etc. (max 5 minutes)
    const delay = Math.min(
      this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      5 * 60 * 1000 // 5 minutes max
    );

    logger.info(`📅 Scheduling reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(async () => {
      if (!this.isShuttingDown) {
        try {
          await this.connect();
        } catch (error) {
          logger.error('Reconnection attempt failed:', error.message);
        }
      }
    }, delay);
  }

  /**
   * Gracefully close database connection
   */
  async disconnect() {
    if (this.isShuttingDown) {
      logger.debug('Already shutting down database connection');
      return { success: true, message: 'Already disconnecting' };
    }

    try {
      this.isShuttingDown = true;
      logger.info('🔒 Closing MongoDB connection...');

      // Wait for any pending operations (with timeout)
      const closeTimeout = 10000; // 10 seconds
      const closePromise = mongoose.connection.close();
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection close timeout')), closeTimeout);
      });

      await Promise.race([closePromise, timeoutPromise]);
      
      this.connectionState = 'closed';
      logger.info('✅ MongoDB connection closed gracefully');
      
      return { success: true, message: 'Database disconnected' };

    } catch (error) {
      logger.error('❌ Error closing MongoDB connection:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get current connection status and health
   */
  getConnectionStatus() {
    const connection = mongoose.connection;
    
    return {
      state: this.connectionState,
      readyState: connection.readyState,
      readyStateString: this.getReadyStateString(connection.readyState),
      host: connection.host,
      port: connection.port,
      name: connection.name,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      isShuttingDown: this.isShuttingDown,
      uptime: connection.startTime ? Date.now() - connection.startTime : 0,
      collections: connection.collections ? Object.keys(connection.collections).length : 0
    };
  }

  /**
   * Convert numeric ready state to string
   */
  getReadyStateString(readyState) {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    return states[readyState] || 'unknown';
  }

  /**
   * Get detailed database statistics
   */
  async getDatabaseStats() {
    try {
      if (this.connectionState !== 'connected') {
        return { error: 'Database not connected' };
      }

      const admin = mongoose.connection.db.admin();
      
      // Get database stats
      const dbStats = await mongoose.connection.db.stats();
      
      // Get server status (if available)
      let serverStatus = null;
      try {
        serverStatus = await admin.serverStatus();
      } catch (error) {
        logger.debug('Server status not available:', error.message);
      }

      return {
        database: {
          name: mongoose.connection.name,
          collections: dbStats.collections,
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexSize: dbStats.indexSize,
          objects: dbStats.objects
        },
        server: serverStatus ? {
          version: serverStatus.version,
          uptime: serverStatus.uptime,
          connections: serverStatus.connections
        } : null,
        connection: this.getConnectionStatus(),
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Error getting database stats:', error);
      return { error: error.message };
    }
  }

  /**
   * Perform database health check
   */
  async healthCheck() {
    try {
      const startTime = Date.now();
      
      // Test connection
      await this.testConnection();
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        connection: this.getConnectionStatus(),
        timestamp: new Date()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        connection: this.getConnectionStatus(),
        timestamp: new Date()
      };
    }
  }

  /**
   * Check if database is connected and ready
   */
  isConnected() {
    return mongoose.connection.readyState === 1 && this.connectionState === 'connected';
  }

  /**
   * Wait for database to be connected
   */
  async waitForConnection(timeout = 30000) {
    const startTime = Date.now();
    
    while (!this.isConnected() && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (!this.isConnected()) {
      throw new Error('Database connection timeout');
    }
    
    return true;
  }
}

// Create singleton instance
const databaseManager = new DatabaseManager();

// Legacy export for backward compatibility
const connectDB = () => databaseManager.connect();

// Enhanced exports
module.exports = {
  connectDB,
  databaseManager,
  // Legacy export
  default: connectDB
};
