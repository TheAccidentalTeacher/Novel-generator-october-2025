// app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const http = require('http');
const path = require('path');
const connectDB = require('./mongodb');
const { initializeWebSocket } = require('./websocket');
const logger = require('./logger');
const novelRoutes = require('./routes/novel');
const recoveryService = require('./services/recoveryService');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Initialize WebSocket
initializeWebSocket(server);

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: true, // Allow all origins since frontend is served from same domain
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json({ limit: '15mb' }));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Routes
app.use('/api/novel', novelRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Serve React app for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

// Start recovery service
recoveryService.startPeriodicCheck();

module.exports = app;
