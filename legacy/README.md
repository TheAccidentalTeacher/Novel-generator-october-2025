<h1 align="center">Let's Write a Book - AI Novel Generator</h1>

<p align="center"><em>AI-powered novel generator deployed entirely on Railway for maximum simplicity and reliability.</em></p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Railway Deployment](#railway-deployment)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Performance Considerations](#performance-considerations)
- [Complete Implementation Guide](#complete-implementation-guide)

---

## Overview

**Let's Write a Book** is a full-stack application deployed entirely on **Railway** that leverages OpenAI models to generate complete novels. This simplified deployment approach eliminates CORS issues, reduces complexity, and provides a single URL for both frontend and backend. The system features real-time progress updates, robust error handling, and cost optimization.

---

## Features

- **Single Railway deployment** for both frontend and backend
- **Dual-model AI approach:** GPT-4o-mini for planning, GPT-4o for prose
- **Real-time progress updates** via WebSocket
- **Robust error handling** and automatic recovery
- **Cost and token usage tracking**
- **Genre-specific generation** with detailed instructions
- **Download options** (TXT, HTML)
- **Modern, responsive UI** (React + Vite)
- **No CORS issues** - everything served from one domain

---

## Project Structure

```
letswriteabook/
├── backend/                # Node.js/Express backend + static frontend
│   ├── app.js             # Main server file
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── services/          # AI and business logic
│   ├── public/            # Built frontend files (auto-generated)
│   ├── package.json
│   └── .env
├── frontend/              # React source (builds to backend/public/)
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── railway.json           # Railway deployment config
└── README.md
```

---

## Prerequisites

- **Node.js v18+** - [Download here](https://nodejs.org/)
- **Railway account** - [Sign up for free](https://railway.app/)
- **MongoDB Atlas account** - [Sign up for free](https://www.mongodb.com/atlas)
- **OpenAI API key** - [Get your key here](https://platform.openai.com/api-keys)
  - Requires access to GPT-4o and GPT-4o-mini models
  - Ensure your account has sufficient credit/quota
- **Git** - For repository management

---

## Quick Start

**Deploy to Railway in 5 minutes:**

1. **Fork or clone this repository:**
   ```bash
   git clone https://github.com/yourusername/letswriteabook.git
   cd letswriteabook
   ```

2. **Set up MongoDB Atlas:**
   - Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Get your connection string (see detailed steps below)

3. **Deploy to Railway:**
   - Connect your GitHub repo to [Railway](https://railway.app/)
   - Add environment variables (see section below)
   - Railway automatically builds and deploys everything

4. **Access your app:**
   - Visit your Railway-provided URL
   - Start generating novels!

---

## Environment Variables

Create these environment variables in Railway's dashboard:

### Required Variables

```env
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here

# Database Configuration  
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/letswriteabook

# Railway Configuration
NODE_ENV=production
PORT=3000
```

### Optional Variables (with defaults)

```env
# Generation Limits
MAX_CONCURRENT_JOBS=3
COST_ALERT_THRESHOLD=25.00

# Feature Flags
ENABLE_COST_TRACKING=true
ENABLE_QUALITY_METRICS=true
```

### How to Set Variables in Railway:

1. Go to your Railway project dashboard
2. Click on your service
3. Go to "Variables" tab
4. Add each variable name and value
5. Deploy to apply changes

---

## Railway Deployment

### Automatic Deployment (Recommended)

1. **Connect GitHub to Railway:**
   - Sign up/login to [Railway](https://railway.app/)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Choose the main branch

2. **Configure Environment Variables:**
   - Add all required variables listed above
   - Railway will automatically detect it's a Node.js project

3. **Railway builds everything automatically:**
   - Installs backend dependencies
   - Builds frontend (React/Vite)
   - Copies frontend build to backend/public/
   - Starts the Express server
   - Serves both API and frontend from one URL

4. **Access your app:**
   - Railway provides a URL like `https://your-app.railway.app`
   - Both frontend and API are available at this URL

### Manual Deployment

If you prefer manual deployment:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Set environment variables
railway variables set OPENAI_API_KEY=your-key
railway variables set MONGODB_URI=your-mongodb-uri
# ... add other variables

# Deploy
railway up
```

### Build Process

Railway automatically runs:

1. **Backend setup:** `npm install` in root directory
2. **Frontend build:** Builds React app with Vite
3. **Static file serving:** Copies build to backend/public/
4. **Server start:** Runs Express server that serves both API and frontend

---

## Usage

### Accessing Your Application

Once deployed to Railway, your app is available at: `https://your-app.railway.app`

This single URL serves:
- **Frontend**: The React application for users to interact with
- **API**: Backend endpoints for novel generation
- **WebSocket**: Real-time progress updates

### Using the Application

1. **Visit your Railway URL** in a web browser

2. **Fill out the novel generation form:**
   - Enter a title for your novel
   - Select genre and subgenre from comprehensive lists
   - Configure target word count (20,000 - 100,000 words)
   - Set number of chapters (5 - 50 chapters)
   - Provide a premise (type directly or upload a .txt/.md file)

3. **Monitor generation progress:**
   - Real-time progress updates via WebSocket
   - Phase tracking: Planning → Outlining → Writing
   - Chapter-by-chapter progress bar
   - Cost tracking (if enabled)
   - Estimated completion time

4. **Preview and download your novel:**
   - Navigate through chapters
   - Read content in a clean, book-like interface
   - Download as TXT or HTML formats

### Local Development (Optional)

For development purposes, you can run locally:

```bash
# Install dependencies
npm install

# Build frontend
cd frontend && npm run build && cd ..

# Copy frontend build to backend
cp -r frontend/dist/* backend/public/

# Start backend (serves both API and frontend)
cd backend && npm start
```

Visit `http://localhost:3000` to access your local version.

---

## API Documentation

### Base URL
- **Production**: `https://your-app.railway.app/api`
- **Local**: `http://localhost:3000/api`

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/novel/generate` | Start novel generation |
| `GET` | `/novel/status/:jobId` | Get generation status |
| `GET` | `/novel/download/:jobId` | Download completed novel |
| `POST` | `/novel/upload-premise` | Upload premise file |
| `GET` | `/novel/genres` | Get available genres |

### Example API Usage

**Health Check:**
```bash
curl https://your-app.railway.app/health
```

**Start Generation:**
```bash
curl -X POST https://your-app.railway.app/api/novel/generate \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My Novel",
    "genre": "SCIENCE_FICTION",
    "subgenre": "SPACE_OPERA",
    "premise": "A story about...",
    "targetWordCount": 50000,
    "targetChapters": 15
  }'
```

**Check Status:**
```bash
curl https://your-app.railway.app/api/novel/status/JOB_ID
```

---

## Performance Considerations

### Memory Usage
- **Backend**: Typically uses 200-500MB RAM depending on concurrent jobs
- **MongoDB**: Free tier provides 512MB storage (sufficient for thousands of novels)
- **Railway**: Free tier includes 512MB RAM, 1GB storage

### Cost Optimization
- **GPT-4o-mini**: Used for planning/outlining (~$0.15 per 1M tokens)
- **GPT-4o**: Used for prose generation (~$5.00 per 1M tokens)
- **Average Cost**: $3-8 per 50,000-word novel depending on complexity

### Scaling Considerations
- **Concurrent Jobs**: Default limit of 3 concurrent generations
- **Database Connections**: MongoDB Atlas free tier supports 500 connections
- **Railway Scaling**: Automatically scales based on traffic and resource usage

---

## Troubleshooting

### Common Issues and Solutions

#### MongoDB Connection Issues
- **Error:** `MongoNetworkError` or connection timeout
- **Solutions:**
  - Verify `MONGODB_URI` is correctly formatted
  - Check network access whitelist in MongoDB Atlas (add `0.0.0.0/0` for development)
  - Ensure database user has proper permissions
  - Test connection string in MongoDB Compass

#### OpenAI API Issues
- **Error:** `401 Unauthorized` or `403 Forbidden`
- **Solutions:**
  - Verify `OPENAI_API_KEY` is valid and active
  - Check your OpenAI account has sufficient credits
  - Ensure you have access to GPT-4o and GPT-4o-mini models
  - Check rate limits on your OpenAI account

#### Railway Deployment Issues
- **Error:** Build failures or deployment errors
- **Solutions:**
  - Check Railway logs for specific error messages
  - Verify all environment variables are set correctly
  - Ensure Node.js version is 18+ in Railway settings
  - Check that build script completes successfully
  - Verify Railway has access to your GitHub repository

#### WebSocket Connection Issues
- **Error:** WebSocket connection failed or not receiving updates
- **Solutions:**
  - Verify backend is running and accessible
  - Check firewall settings aren't blocking WebSocket connections
  - Try refreshing the page to reconnect
  - Check browser console for connection errors

#### Frontend Build Errors
- **Error:** Build failures or dependency issues
- **Solutions:**
  - Use Node.js v18+ (`node --version`)
  - Clear npm cache: `npm cache clean --force`
  - Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
  - Check for peer dependency warnings

#### High API Costs
- **Solution:** 
  - Monitor the cost tracker in the application
  - Adjust `COST_ALERT_THRESHOLD` to get warnings
  - Use shorter novels for testing
  - Consider using GPT-4o-mini for all generation in development

#### Performance Issues
- **Solutions:**
  - Reduce `MAX_CONCURRENT_JOBS` if server is overloaded
  - Monitor MongoDB connection pool
  - Check server resources (RAM, CPU)
  - Consider upgrading MongoDB Atlas tier for production

### Getting Help

If you encounter issues not covered here:
1. Check the browser console for error messages
2. Check backend logs for detailed error information
3. Verify all environment variables are set correctly
4. Try the API endpoints directly with curl to isolate issues

---

## Package.json Files

### Root package.json

Create `package.json` in the project root:

```json
{
  "name": "letswriteabook",
  "version": "1.0.0",
  "description": "AI-powered novel generator deployed on Railway",
  "main": "backend/app.js",
  "scripts": {
    "start": "node backend/app.js",
    "build": "cd frontend && npm install && npm run build && cd .. && mkdir -p backend/public && cp -r frontend/dist/* backend/public/",
    "dev": "cd backend && npm run dev",
    "install-deps": "cd backend && npm install && cd ../frontend && npm install"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "dependencies": {}
}
```

### Backend package.json

Create `backend/package.json`:

```json
{
  "name": "somers-backend",
  "version": "1.0.0",
  "description": "Backend for Somers Novel Generator",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js",
    "test": "jest"
  },
  "dependencies": {
    "compression": "^1.7.4",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "helmet": "^7.1.0",
    "mongoose": "^8.0.3",
    "morgan": "^1.10.0",
    "multer": "^1.4.5-lts.1",
    "openai": "^4.20.1",
    "socket.io": "^4.7.2",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "nodemon": "^3.0.2"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Frontend package.json

Create `frontend/package.json`:

```json
{
  "name": "somers-frontend",
  "version": "1.0.0",
  "description": "Frontend for Somers Novel Generator",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.15.0",
    "axios": "^1.5.0",
    "socket.io-client": "^4.7.2"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.3",
    "vite": "^4.4.5"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Vite Configuration

Create `frontend/vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true
  },
  server: {
    // Only proxy for local development
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true
      }
    }
  }
})
```

---

## MongoDB Atlas Setup

### Step-by-Step Instructions

1. **Create Account:**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign up for a free account

2. **Create a Cluster:**
   - Click "Build a Database"
   - Choose "M0 Sandbox" (free tier)
   - Select your preferred cloud provider and region
   - Name your cluster (e.g., "letswriteabook")
   - Click "Create Cluster"

3. **Configure Database Access:**
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Create a username and strong password
   - Set privileges to "Read and write to any database"
   - Click "Add User"

4. **Configure Network Access:**
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - Choose "Allow Access from Anywhere" (0.0.0.0/0)
   - Click "Confirm"

5. **Get Connection String:**
   - Go to "Database" and click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<username>`, `<password>`, and `<dbname>` with your actual values

Example connection string:
```
mongodb+srv://myuser:mypassword@cluster0.xyz.mongodb.net/letswriteabook?retryWrites=true&w=majority
```

---

## License

This project is licensed under the MIT License. 

### MIT License

```
MIT License

Copyright (c) 2025 Somers Novel Generator

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/letswriteabook.git
   cd letswriteabook
   ```

2. **Install dependencies:**
   ```bash
   npm run install-deps
   ```

3. **Build and start the application:**
   ```bash
   # Build frontend and start backend
   npm run build
   npm start
   ```

4. **Open your browser:**
   Visit [http://localhost:3000](http://localhost:3000)

**For Development (Frontend Hot Reload):**
If you want to develop with hot reload:
```bash
# Terminal 1: Start backend
cd backend && npm run dev

# Terminal 2: Start frontend with hot reload
cd frontend && npm run dev
```
Then visit [http://localhost:5173](http://localhost:5173) for development with hot reload.

---

## Complete Implementation Guide

**Note**: This section contains the complete code implementation. Use the code examples below to create the actual application files in your project structure.

**Files to Create**: Based on the code examples in this guide, you'll need to create:
- Backend: `app.js`, `mongodb.js`, `logger.js`, `websocket.js`, `models/job.js`, `routes/novel.js`, `services/aiService.js`, `services/recoveryService.js`, `shared/genreInstructions.js`
- Frontend: `index.html`, `src/main.jsx`, `src/App.jsx`, and all component files shown in Part 6
- Configuration: Already created - `package.json` files, `railway.json`, `.env.example` files

Greetings. I am Data, and I will provide a comprehensive implementation guide for the Somers Novel Generator application. This guide will be structured methodically with complete code examples and detailed explanations to ensure optimal implementation.
Part 1: Project Overview and Architecture
1.1 Project Description
The Somers Novel Generator is a full-stack web application that leverages artificial intelligence to generate complete novels based on user inputs. The system employs a dual-model approach:
1.	GPT-4o-mini: Used for planning, outlining, and context summarization to optimize costs
2.	GPT-4o: Used for high-quality prose generation in the actual novel chapters
1.2 System Architecture
The application follows a unified deployment architecture:
•	Frontend: React application with Vite, built and served by the Express backend
•	Backend: Node.js with Express, deployed on Railway
•	Database: MongoDB Atlas for data persistence
•	Real-time Updates: Socket.IO for streaming generation progress
•	AI Integration: OpenAI API for text generation
1.3 Project Structure
code


letswriteabook/
├── backend/
│   ├── app.js                  # Main Express application
│   ├── mongodb.js              # MongoDB connection
│   ├── websocket.js            # WebSocket implementation
│   ├── logger.js               # Logging configuration
│   ├── package.json            # Backend dependencies
│   ├── .env                    # Environment variables (gitignored)
│   ├── .env.example            # Example environment variables
│   ├── models/
│   │   └── job.js              # MongoDB schema for jobs
│   ├── routes/
│   │   └── novel.js            # API routes for novel generation
│   ├── services/
│   │   ├── aiService.js        # OpenAI integration
│   │   └── recoveryService.js  # Job recovery system
│   ├── shared/
│   │   └── genreInstructions.js # Genre-specific writing guidelines
│   └── public/                 # Built frontend files (auto-generated)
├── frontend/
│   ├── index.html              # HTML entry point
│   ├── package.json            # Frontend dependencies
│   ├── vite.config.js          # Vite configuration
│   ├── .env                    # Environment variables (gitignored)
│   ├── .env.example            # Example environment variables
│   ├── src/
│   │   ├── main.jsx            # React entry point
│   │   ├── App.jsx             # Root component
│   │   ├── components/         # React components
│   │   ├── context/            # React context providers
│   │   ├── hooks/              # Custom React hooks
│   │   └── services/           # API services
│   └── public/                 # Static assets
├── railway.json                # Railway configuration
└── README.md                   # Project documentation
Part 2: Environment Setup
2.1 Environment Variables
Backend (.env.example)
code


NODE_ENV=production
PORT=3000
OPENAI_API_KEY=your_openai_api_key
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
MAX_CONCURRENT_JOBS=3
COST_ALERT_THRESHOLD=25.00
ENABLE_COST_TRACKING=true
ENABLE_QUALITY_METRICS=true

Frontend (.env.example)
Since the frontend is built and served by the backend, no environment variables are needed for production. For local development only:
code


VITE_API_BASE_URL=http://localhost:3000
2.2 Backend Package Configuration
Create a package.json file for the backend:
json


{
  "name": "letswriteabook-backend",
  "version": "1.0.0",
  "description": "AI-powered novel generation backend",
  "main": "app.js",
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js",
    "test": "jest"
  },
  "dependencies": {
    "compression": "^1.7.4",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "helmet": "^7.1.0",
    "mongoose": "^8.0.3",
    "morgan": "^1.10.0",
    "multer": "^1.4.5-lts.1",
    "openai": "^4.20.1",
    "socket.io": "^4.7.2",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "nodemon": "^3.0.2"
  }
}
2.3 Frontend Package Configuration
Create a package.json file for the frontend:
json


{
  "name": "letswriteabook-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.6.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.1",
    "socket.io-client": "^4.7.2"
  },
  "devDependencies": {
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8"
  }
}

Part 3: Backend Implementation

3.1 Express Server Setup

Create an app.js file:

javascript


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

module.exports = app;

3.2 MongoDB Configuration

Create a mongodb.js file:

javascript


const mongoose = require('mongoose');
const logger = require('./logger');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    logger.info('MongoDB connected');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('error', err => {
  logger.error('MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected, attempting to reconnect');
  setTimeout(connectDB, 5000);
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = connectDB;

3.3 Logging Implementation

Create a logger.js file:

javascript


const winston = require('winston');
const { format } = winston;

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: 'novel-generator' },
  transports: [
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      )
    })
  ]
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({ 
    filename: 'error.log', 
    level: 'error',
    maxsize: 10485760, // 10MB
    maxFiles: 5
  }));
  logger.add(new winston.transports.File({ 
    filename: 'combined.log',
    maxsize: 10485760, // 10MB
    maxFiles: 5
  }));
}

module.exports = logger;

3.4 MongoDB Schema

Create a models/job.js file:

javascript


const mongoose = require('mongoose');

const outlineChapterSchema = new mongoose.Schema({
  chapterNumber: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  keyEvents: {
    type: [String],
    required: true
  },
  characterFocus: {
    type: [String],
    required: true
  },
  plotAdvancement: {
    type: String,
    required: true
  },
  wordTarget: {
    type: Number,
    required: true
  },
  genreElements: {
    type: [String],
    required: true
  }
});

const chapterSchema = new mongoose.Schema({
  chapterNumber: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  wordCount: {
    type: Number,
    required: true
  },
  qualityScore: {
    type: Number,
    default: 0
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  tokensUsed: Number,
  cost: Number,
  attempts: Number
});

const jobSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['planning', 'outlining', 'writing', 'completed', 'failed', 'recovering'],
    default: 'planning',
    required: true,
    index: true
  },
  currentPhase: {
    type: String,
    enum: ['premise_analysis', 'outline_generation', 'chapter_writing', 'quality_validation', 'finalization'],
    default: 'premise_analysis',
    required: true
  },
  
  // Story data
  premise: { 
    type: String, 
    maxLength: 10000,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  genre: {
    type: String,
    required: true
  },
  subgenre: {
    type: String,
    required: true
  },
  targetWordCount: {
    type: Number,
    required: true,
    min: 10000,
    max: 500000
  },
  targetChapters: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  
  // Model usage tracking
  modelUsage: {
    outlineGeneration: {
      model: String,
      tokensUsed: Number,
      cost: Number,
      attempts: Number,
      duration: Number
    },
    chapterGeneration: {
      model: String,
      tokensUsed: Number,
      cost: Number,
      attempts: Number,
      duration: Number
    }
  },
  
  // Generation results
  outline: [outlineChapterSchema],
  chapters: [chapterSchema],
  
  // Progress tracking
  progress: {
    outlineComplete: {
      type: Boolean,
      default: false
    },
    chaptersCompleted: {
      type: Number,
      default: 0
    },
    totalChapters: {
      type: Number,
      required: true
    },
    estimatedCompletion: Date,
    lastActivity: {
      type: Date,
      default: Date.now
    }
  },
  
  // Quality metrics
  qualityMetrics: {
    averageChapterLength: Number,
    genreAdherence: Number,
    characterConsistency: Number,
    plotContinuity: Number
  },
  
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  },
  completedAt: Date
});

// Add indexes for performance
jobSchema.index({ status: 1, createdAt: -1 });
jobSchema.index({ status: 1, updatedAt: -1 });

// Add pre-save hook to update timestamps
jobSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Job', jobSchema);

3.5 WebSocket Implementation

Create a websocket.js file:

javascript


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
      logger.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('error', (error) => {
      logger.error(`Socket error for client ${socket.id}:`, error);
    });
  });
  
  // Handle server-side errors
  io.engine.on('connection_error', (err) => {
    logger.error('WebSocket connection error:', err);
  });
  
  return io;
};

const emitJobUpdate = (jobId, data) => {
  if (io) {
    io.to(`job-${jobId}`).emit('job-update', data);
    logger.debug(`Emitted update for job ${jobId}:`, data);
  } else {
    logger.warn(`Attempted to emit update for job ${jobId} but WebSocket is not initialized`);
  }
};

// Check if a client is connected to a specific job
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

Part 4: Backend Services

4.1 Genre Instructions

Create a shared/genreInstructions.js file with comprehensive genre instructions:

javascript


module.exports = {
  'SCIENCE_FICTION': {
    'SPACE_OPERA': 'Focus on grand-scale adventures across galaxies. Include interstellar travel, multiple alien civilizations, epic conflicts, and advanced technology. Emphasize character-driven narratives against the backdrop of a vast universe. Balance action with philosophical themes about humanity\'s place in the cosmos.',
    'CYBERPUNK': 'Set in a high-tech, low-life dystopian future. Feature advanced technology like cybernetic enhancements, artificial intelligence, and virtual reality alongside social disorder, corporate dominance, and urban decay. Protagonists are often marginalized, anti-heroic characters navigating corrupt systems.',
    'HARD_SCIENCE_FICTION': 'Prioritize scientific accuracy and technical detail. All technology and phenomena should be plausible extensions of existing scientific understanding. Include detailed explanations of scientific concepts without sacrificing narrative engagement. Characters should solve problems through scientific reasoning.',
    'DYSTOPIAN': 'Depict a nightmarish future society characterized by oppression, environmental collapse, or technological control. Explore themes of resistance, conformity, surveillance, and the human spirit under extreme conditions. Focus on systemic issues while maintaining individual character journeys.',
    'FIRST_CONTACT': 'Center the narrative on humanity\'s first encounter with alien intelligence. Explore communication challenges, cultural misunderstandings, and the psychological impact of discovering we\'re not alone. Balance wonder with tension and consider both human and alien perspectives.',
    'MILITARY_SCIENCE_FICTION': 'Focus on interstellar warfare and military organizations. Include detailed descriptions of futuristic weapons, tactics, strategy, and military hierarchy. Emphasize camaraderie among soldiers, the psychological effects of combat, and the moral complexities of warfare.',
    'POST-APOCALYPTIC': 'Set in a world devastated by catastrophe (nuclear war, pandemic, environmental collapse, etc.). Focus on survival, rebuilding society, and preserving humanity. Explore how characters adapt to harsh new realities and what aspects of civilization they choose to maintain or discard.',
    'TIME_TRAVEL': 'Feature technology or phenomena enabling movement through time. Address paradoxes, causality, and the ethics of altering history. Maintain consistent internal rules for how time travel works in your story. Balance technical aspects with emotional stakes of changing past or future events.',
    'BIOPUNK': 'Focus on biotechnology, genetic engineering, and their societal implications. Include detailed descriptions of biological modifications, synthetic organisms, and their effects. Explore ethical questions about human enhancement, corporate control of genetic resources, and what defines humanity.',
    'SOLARPUNK': 'Present an optimistic vision of the future focused on sustainability, renewable energy, and social harmony. Include innovative green technologies, community-based solutions, and characters working toward positive change. Balance optimism with realistic challenges to creating a better world.'
  },
  'FANTASY': {
    'EPIC_FANTASY': 'Create a secondary world with its own geography, history, and magic systems. Include a large-scale conflict with world-changing stakes. Feature a diverse cast of characters from different backgrounds. Balance action sequences with political intrigue and character development.',
    'URBAN_FANTASY': 'Set in a contemporary world where magic exists alongside modern technology. Hide magical elements from most ordinary humans. Create consistent rules for how magic and supernatural creatures interact with the modern world. Balance fantastical elements with realistic urban settings.',
    'DARK_FANTASY': 'Incorporate horror elements and morally ambiguous characters. Create a grim atmosphere with genuine consequences and dangers. Explore darker human emotions and ethical dilemmas. Balance darkness with moments of hope or triumph to avoid unrelenting bleakness.',
    'HISTORICAL_FANTASY': 'Set in a real historical period with added magical elements. Research the chosen era thoroughly for accurate details of daily life, politics, and culture. Ensure magical elements feel integrated with historical beliefs of the time. Balance historical accuracy with fantastical elements.',
    'SWORD_AND_SORCERY': 'Focus on swashbuckling adventure and personal conflicts rather than world-saving quests. Feature physically capable protagonists facing supernatural threats. Include fast-paced action sequences and exotic locations. Balance action with character development and sensory descriptions.',
    'MAGICAL_REALISM': 'Set in the real world with subtle magical elements presented as normal occurrences. Avoid explaining the magical elements—they should be accepted as part of reality. Use magic to explore emotional truths and cultural themes. Balance realistic human experiences with magical occurrences.',
    'PORTAL_FANTASY': 'Feature characters traveling between our world and a fantasy realm. Explore the protagonist\'s adjustment to new rules and environments. Consider the psychological impact of moving between worlds. Balance adventure in the fantasy world with connections to the character\'s original world.',
    'FAIRY_TALE_RETELLING': 'Base the narrative on traditional fairy tales but add depth, subvert expectations, or shift perspective. Maintain recognizable elements of the original tale while bringing fresh insights. Consider the psychological and social themes of the original story. Balance familiarity with innovation.',
    'MYTHIC_FANTASY': 'Draw on existing mythologies (Greek, Norse, Egyptian, etc.) for characters, settings, or plot elements. Research the chosen mythology thoroughly for authentic details. Consider how ancient myths would manifest in your story\'s context. Balance mythological elements with original content.',
    'LOW_FANTASY': 'Set in a world resembling historical reality with limited magical elements. Focus on human conflicts and challenges with magic as a rare or subtle force. Create a grounded atmosphere where supernatural occurrences feel significant. Balance realism with occasional magical elements.'
  },
  'ROMANCE': {
    'CONTEMPORARY_ROMANCE': 'Set in the present day with realistic characters and situations. Focus on the emotional journey and relationship development. Include meaningful obstacles that challenge the characters to grow. Balance romance with well-developed individual character arcs.',
    'HISTORICAL_ROMANCE': 'Set in a specific historical period with well-researched details. Balance historical accuracy with accessible language and sensibilities. Include period-appropriate conflicts and social constraints. Develop characters who feel authentic to their time while remaining relatable.',
    'PARANORMAL_ROMANCE': 'Feature supernatural elements (vampires, werewolves, witches, etc.) alongside the central romance. Create consistent rules for the supernatural elements. Balance the romance plot with worldbuilding and supernatural conflicts. Develop both human and supernatural characters with depth.',
    'ROMANTIC_SUSPENSE': 'Combine romance with elements of mystery, thriller, or action. Ensure both the romance and suspense plots are equally developed and intertwined. Create genuine danger that threatens the protagonists. Balance tender moments with tense, high-stakes situations.',
    'ROMANTIC_COMEDY': 'Include humor and lighthearted situations alongside romantic development. Create witty dialogue and amusing scenarios without resorting to caricature. Develop characters with genuine emotional depth despite the comedic tone. Balance humor with authentic emotional moments.',
    'FANTASY_ROMANCE': 'Set in a fantasy world or include fantasy elements in the contemporary world. Develop both the romance and fantasy elements fully. Create magical elements that enhance or complicate the romantic relationship. Balance worldbuilding with intimate character development.',
    'SCIENCE_FICTION_ROMANCE': 'Set in a futuristic world or include sci-fi elements alongside the romance. Develop technology or scientific concepts that affect the relationship. Consider how futuristic settings might change or highlight timeless relationship dynamics. Balance technical elements with emotional development.',
    'SECOND_CHANCE_ROMANCE': 'Feature characters with a shared romantic history reuniting after time apart. Explore how characters have changed and grown during their separation. Address the original reasons for their breakup. Balance past hurts with present attraction and potential future together.',
    'ENEMIES_TO_LOVERS': 'Begin with characters in genuine conflict or opposition. Develop a gradual shift from animosity to attraction with believable turning points. Ensure the initial conflict has substance beyond creating romantic tension. Balance conflict with growing mutual respect and understanding.',
    'SLOW_BURN_ROMANCE': 'Develop the romantic relationship gradually over an extended period. Focus on building emotional intimacy before physical intimacy. Create meaningful interactions that slowly change the characters\' perceptions of each other. Balance patience with enough tension to maintain engagement.'
  },
  'MYSTERY': {
    'DETECTIVE_FICTION': 'Feature a professional or amateur detective solving a crime through investigation and deduction. Include clues that allow readers to solve the mystery alongside the protagonist. Develop red herrings and multiple suspects with plausible motives. Balance investigation with character development.',
    'COZY_MYSTERY': 'Set in a small, intimate community with an amateur sleuth. Minimize graphic violence and explicit content. Include quirky secondary characters and community dynamics. Focus on the puzzle aspect of the mystery. Balance lighthearted elements with a satisfying mystery plot.',
    'POLICE_PROCEDURAL': 'Focus on realistic police work and investigation techniques. Research law enforcement procedures for authenticity. Include multiple officers with different roles in the investigation. Balance technical details with human drama. Develop both the professional and personal lives of officers.',
    'HISTORICAL_MYSTERY': 'Set in a specific historical period with accurate details of the era. Consider how historical context affects crime investigation and justice. Research period-appropriate investigation methods and social attitudes. Balance historical immersion with accessible storytelling.',
    'LEGAL_THRILLER': 'Center on courtroom drama and legal maneuvering. Research legal procedures and terminology for authenticity. Create morally complex situations that challenge the legal system. Balance technical legal aspects with human drama. Develop tension through legal strategy and unexpected revelations.',
    'PSYCHOLOGICAL_THRILLER': 'Focus on the psychological states of characters involved in the mystery. Create unreliable narrators or perspectives that challenge readers\' assumptions. Develop atmosphere and tension through psychological insight rather than action. Balance internal and external conflicts.',
    'NOIR': 'Create a cynical, morally ambiguous atmosphere with flawed protagonists. Use distinctive, terse prose style with vivid sensory details. Include elements of social criticism. Develop complex characters operating in corrupt systems. Balance darkness with compelling character motivations.',
    'AMATEUR_SLEUTH': 'Feature a protagonist whose primary occupation is not detective work. Provide a plausible reason for their involvement in solving the crime. Use their specialized knowledge or skills to provide a unique investigative approach. Balance amateur status with credible investigative progress.',
    'LOCKED_ROOM_MYSTERY': 'Present a crime that seems impossible given the physical circumstances. Create a confined setting with limited access. Develop multiple plausible theories before revealing the ingenious solution. Balance the puzzle aspect with character development and motivation.',
    'SUPERNATURAL_MYSTERY': 'Combine mystery elements with supernatural phenomena. Establish consistent rules for how supernatural elements work in your story world. Consider whether supernatural elements are the solution or merely complicate the mystery. Balance rational investigation with supernatural occurrences.'
  },
  'THRILLER': {
    'PSYCHOLOGICAL_THRILLER': 'Focus on mental and emotional states rather than physical danger. Create unreliable narrators or shifting perspectives that keep readers questioning reality. Develop atmosphere through psychological tension and paranoia. Balance internal conflicts with external threats.',
    'POLITICAL_THRILLER': 'Center on political power struggles, corruption, or conspiracy. Research political systems and procedures for authenticity. Create morally complex situations without simplistic villains. Balance political complexity with accessible storytelling and human drama.',
    'ESPIONAGE_THRILLER': 'Feature spies, intelligence agencies, and covert operations. Research espionage techniques and geopolitics for authenticity. Create layers of deception and shifting loyalties. Develop tension through information control and betrayal. Balance technical aspects with character development.',
    'TECHNO_THRILLER': 'Focus on advanced technology and its potential dangers. Research cutting-edge technology for plausible extrapolation. Create technical challenges that protagonists must overcome through knowledge and skill. Balance technical details with accessible explanations and human stakes.',
    'MEDICAL_THRILLER': 'Center on medical dangers such as pandemics, experimental treatments, or medical conspiracy. Research medical procedures and terminology for authenticity. Create plausible medical threats with accurate symptoms and progression. Balance technical medical details with human drama.',
    'LEGAL_THRILLER': 'Focus on courtroom drama and legal maneuvering with high stakes. Research legal procedures and terminology for authenticity. Create morally complex legal situations that challenge the justice system. Balance legal technicalities with accessible storytelling and character development.',
    'MILITARY_THRILLER': 'Feature military operations, personnel, and technology. Research military procedures, weapons, and hierarchy for authenticity. Create realistic mission parameters and obstacles. Balance tactical details with character development and moral complexity of combat situations.',
    'FINANCIAL_THRILLER': 'Center on financial crimes, market manipulation, or economic conspiracy. Research financial systems and terminology for authenticity. Create complex financial schemes that are explained clearly for readers. Balance technical financial details with accessible stakes and human drama.',
    'DISASTER_THRILLER': 'Focus on natural or man-made catastrophes and survival. Research disaster scenarios for plausible development and effects. Create escalating threats that challenge characters physically and emotionally. Balance spectacle of disaster with intimate human experiences and relationships.',
    'CONSPIRACY_THRILLER': 'Feature elaborate conspiracies involving powerful organizations or individuals. Create layers of deception that are gradually revealed. Develop plausible motivations for conspiracy that go beyond generic evil. Balance complexity of conspiracy with clear stakes and character focus.'
  },
  'HORROR': {
    'SUPERNATURAL_HORROR': 'Feature ghosts, demons, or other supernatural entities as the source of horror. Create consistent rules for how supernatural elements operate. Build atmosphere through suggestion and escalating uncanny events. Balance explicit supernatural occurrences with psychological terror.',
    'PSYCHOLOGICAL_HORROR': 'Focus on mental deterioration, paranoia, and uncertainty about reality. Create unreliable narrators or perspectives that question the nature of events. Develop horror through suggestion rather than explicit threats. Balance internal psychological states with external manifestations.',
    'BODY_HORROR': 'Center on physical transformation, disease, or violation of bodily integrity. Create detailed, visceral descriptions of physical corruption or transformation. Explore themes of identity, control, and humanity through bodily change. Balance graphic elements with psychological and emotional impact.',
    'COSMIC_HORROR': 'Feature vast, incomprehensible entities or forces beyond human understanding. Create a sense of humanity\'s insignificance in the universe. Develop atmosphere through suggestion of forces beyond perception. Balance cosmic scale with intimate human experiences of terror.',
    'FOLK_HORROR': 'Draw on rural settings, isolated communities, and traditional beliefs or rituals. Research folklore and regional traditions for authentic details. Create tension between outsiders and insular communities with hidden practices. Balance supernatural elements with human malevolence.',
    'GOTHIC_HORROR': 'Feature decaying settings, family secrets, and psychological unease. Create atmospheric descriptions of crumbling mansions, remote castles, or bleak landscapes. Develop slow-building dread through environment and history. Balance supernatural elements with psychological and emotional horror.',
    'SLASHER': 'Feature a killer targeting multiple victims in succession. Create tension through pursuit and near escapes. Develop creative and varied threat scenarios while maintaining internal logic. Balance graphic elements with suspense and character development.',
    'SURVIVAL_HORROR': 'Focus on characters struggling to survive against monstrous threats. Create resource scarcity and physical challenges alongside supernatural or human threats. Develop environments that are themselves threatening or disorienting. Balance physical threats with psychological breakdown.',
    'HAUNTED_HOUSE': 'Center on a location with supernatural presence or dark history affecting inhabitants. Create a house that feels like a character with its own personality and agency. Develop escalating supernatural phenomena tied to the location\'s history. Balance environmental horror with character psychology.',
    'APOCALYPTIC_HORROR': 'Feature the collapse of society and civilization due to supernatural or extraordinary threats. Create a world where familiar structures and safety have disappeared. Develop both external threats and the horror of human behavior in crisis. Balance large-scale catastrophe with intimate horror.'
  },
  'HISTORICAL_FICTION': {
    'ANCIENT_HISTORY': 'Set in civilizations before 500 CE (Rome, Greece, Egypt, China, etc.). Research daily life, social structures, and historical events of the chosen era. Create dialogue that feels period-appropriate without being inaccessible. Balance historical detail with engaging narrative and relatable characters.',
    'MEDIEVAL': 'Set between 500-1500 CE with accurate depiction of feudal systems and daily life. Research social hierarchies, religious influences, and material culture of the period. Avoid modern sensibilities while creating characters readers can empathize with. Balance historical accuracy with accessible storytelling.',
    'RENAISSANCE': 'Set in 14th-17th century Europe during cultural and artistic rebirth. Feature historical figures from art, science, or politics alongside fictional characters. Research the intellectual and cultural developments of the period. Balance historical context with personal stories and accessible language.',
    'REGENCY': 'Set in early 19th century Britain with focus on social manners and class distinctions. Research social customs, fashion, and speech patterns of the era. Create authentic period dialogue without becoming inaccessible. Balance social constraints of the era with characters readers can relate to.',
    'VICTORIAN': 'Set in 19th century during Queen Victoria\'s reign with attention to social change and industrial revolution. Research class divisions, technological developments, and social movements of the period. Create atmosphere through detailed sensory descriptions. Balance historical detail with engaging plot.',
    'WORLD_WAR_I': 'Set during 1914-1918 with focus on both battlefield and home front experiences. Research military tactics, technology, and daily experiences of soldiers. Consider the social and political changes triggered by the conflict. Balance historical events with personal stories and psychological impact.',
    'WORLD_WAR_II': 'Set during 1939-1945 with attention to global scope of the conflict. Research specific theaters of war, resistance movements, or home front experiences. Consider ethical complexities and human choices under extreme conditions. Balance historical events with personal narratives and moral questions.',
    'COLD_WAR': 'Set between 1947-1991 during ideological conflict between East and West. Research geopolitical tensions, espionage activities, and daily life on both sides of the Iron Curtain. Consider how ordinary people were affected by larger political forces. Balance historical context with personal stories.',
    'COLONIAL_AMERICA': 'Set in North American colonies before independence. Research interactions between European settlers, Native Americans, and enslaved Africans. Consider multiple perspectives on colonization and its effects. Balance historical accuracy with sensitivity to modern understanding of colonial impacts.',
    'CIVIL_WAR': 'Set during American Civil War (1861-1865) with attention to divided loyalties and social upheaval. Research military campaigns, political developments, and daily life during the conflict. Consider perspectives from both sides and from diverse social positions. Balance battlefield accounts with home front experiences.'
  },
  'LITERARY_FICTION': {
    'CHARACTER_STUDY': 'Focus intensely on the inner life and development of one or a few characters. Create complex, flawed characters with rich interior lives. Develop subtle changes in character perspective or understanding over time. Balance introspection with meaningful external events and relationships.',
    'SOCIAL_COMMENTARY': 'Examine contemporary social issues through narrative. Create characters representing different perspectives on the chosen issues. Avoid didactic messaging in favor of nuanced exploration. Balance social themes with compelling personal stories and complex characters.',
    'EXPERIMENTAL': 'Challenge conventional narrative structures, language use, or perspective. Create innovative formal elements that serve thematic purposes rather than novelty alone. Consider how experimental elements enhance reader understanding or experience. Balance innovation with sufficient clarity to engage readers.',
    'PHILOSOPHICAL_FICTION': 'Explore philosophical questions or ideas through narrative. Create scenarios that naturally raise philosophical issues without becoming merely didactic. Develop characters whose experiences embody philosophical concepts. Balance intellectual content with emotional engagement and narrative momentum.',
    'PSYCHOLOGICAL_REALISM': 'Focus on accurate, detailed portrayal of mental and emotional processes. Create characters whose psychology is complex, contradictory, and evolving. Develop subtle shifts in perception, understanding, or emotional state. Balance internal experience with external events and relationships.',
    'CULTURAL_IDENTITY': 'Explore questions of belonging, heritage, and identity formation. Create characters navigating between different cultural influences or expectations. Develop nuanced portrayal of cultural practices and their significance. Balance cultural specificity with universal human experiences.',
    'COMING_OF_AGE': 'Focus on transition from youth to maturity with emphasis on identity formation. Create meaningful experiences that challenge the protagonist\'s understanding of self and world. Develop changes in perspective that reflect growing maturity. Balance youthful viewpoint with insights that transcend age.',
    'FAMILY_SAGA': 'Trace relationships and events across multiple generations of a family. Create distinct characters in each generation while showing inherited traits or patterns. Develop family dynamics that evolve over time while maintaining core tensions. Balance individual stories with overarching family themes.',
    'POLITICAL_FICTION': 'Explore political ideas or systems through narrative without becoming merely allegorical. Create characters with complex political motivations beyond simple ideology. Develop nuanced portrayal of how political forces affect individual lives. Balance political content with human drama and character development.',
    'METAFICTION': 'Incorporate self-awareness about the nature of fiction into the narrative itself. Create layers of storytelling that comment on the act of creation or reception. Develop meaningful purpose for metafictional elements beyond cleverness. Balance self-reference with engaging story and emotional investment.'
  },
  'YOUNG_ADULT': {
    'CONTEMPORARY_YA': 'Focus on modern teenage experiences with authentic voice and concerns. Create protagonists dealing with identity, relationships, and finding their place in the world. Develop realistic dialogue that captures teenage speech without relying on quickly-dated slang. Balance serious issues with moments of humor and hope.',
    'YA_FANTASY': 'Create fantasy worlds accessible to teenage readers with protagonists usually 14-18 years old. Focus on themes of identity, power, and responsibility relevant to adolescent experience. Develop magic systems or fantastical elements that metaphorically reflect coming-of-age challenges. Balance worldbuilding with character development.',
    'YA_SCIENCE_FICTION': 'Develop science fiction concepts accessible to teenage readers with protagonists usually 14-18 years old. Create technological or scientific elements that metaphorically reflect adolescent experiences. Focus on questions of identity and society relevant to young readers. Balance technical elements with character-driven narrative.',
    'YA_DYSTOPIAN': 'Create oppressive future societies that metaphorically reflect teenage experiences of powerlessness and rebellion. Develop young protagonists challenging or subverting restrictive systems. Focus on themes of identity, conformity, and finding authentic voice. Balance dark elements with hope and agency.',
    'YA_MYSTERY': 'Feature teenage protagonists solving mysteries relevant to their lives and communities. Create age-appropriate investigations that utilize resources available to young people. Develop mysteries that connect to themes of identity and growing independence. Balance danger with plausible safety for young characters.',
    'YA_HISTORICAL': 'Set in historical periods with teenage protagonists facing both timeless adolescent challenges and period-specific circumstances. Research how young people lived in the chosen era for authenticity. Create accessible historical context without excessive exposition. Balance historical detail with relatable teenage experiences.',
    'YA_ROMANCE': 'Focus on first love, crushes, and romantic relationships from a teenage perspective. Create authentic emotional experiences while maintaining age-appropriate content. Develop romantic relationships that contribute to character growth and self-understanding. Balance romance with other aspects of teenage life.',
    'YA_THRILLER': 'Create suspenseful situations appropriate for teenage readers with young protagonists. Develop threats that are serious but not gratuitously disturbing for the age category. Focus on themes of courage, resourcefulness, and agency. Balance tension with moments of relief and positive relationships.',
    'YA_COMING_OF_AGE': 'Focus intensely on the transition from childhood to adulthood and formation of identity. Create significant experiences that challenge and transform the protagonist\'s self-conception. Develop meaningful relationships that help or hinder the maturation process. Balance internal growth with external challenges.',
    'YA_SOCIAL_ISSUES': 'Address contemporary issues relevant to teenage readers through compelling narrative. Create authentic situations that naturally raise social questions without becoming didactic. Develop nuanced perspectives on complex issues. Balance serious content with hope and potential for positive change.'
  },
  'MIDDLE_GRADE': {
    'CONTEMPORARY_MG': 'Focus on experiences relevant to 8-12 year old readers with age-appropriate protagonists. Create stories centered on friendship, family, school, and self-discovery. Develop plots that balance real-world challenges with optimism and growth. Use accessible language while introducing some vocabulary stretching.',
    'MG_FANTASY': 'Create magical worlds accessible to 8-12 year old readers with age-appropriate protagonists. Develop clear magic systems with consistent rules. Focus on themes of courage, friendship, and discovery. Balance fantastical elements with relatable emotional experiences. Include humor and wonder alongside adventure.',
    'MG_SCIENCE_FICTION': 'Develop science fiction concepts accessible to 8-12 year old readers. Create technological elements that spark curiosity and scientific interest. Focus on problem-solving, teamwork, and exploration. Explain scientific concepts clearly without condescension. Balance technical elements with strong character relationships.',
    'MG_MYSTERY': 'Feature young detectives solving age-appropriate mysteries. Create puzzles that readers can solve alongside protagonists. Develop investigations that utilize resources available to children. Focus on observation skills and logical thinking. Balance mystery elements with humor and character development.',
    'MG_HISTORICAL': 'Set in historical periods with child protagonists that 8-12 year olds can relate to. Make history accessible through personal experiences rather than dates and facts. Create historical context that enhances rather than overwhelms the story. Balance educational elements with engaging narrative and relatable emotions.',
    'MG_ADVENTURE': 'Create exciting journeys or quests appropriate for 8-12 year old readers. Develop challenges that test protagonists\' courage and resourcefulness. Focus on physical action balanced with character growth. Include elements of discovery and wonder. Balance danger with appropriate safety for the age category.',
    'MG_HUMOR': 'Create stories with strong comedic elements appealing to 8-12 year old readers. Develop humor through character, situation, and wordplay rather than cynicism or satire. Focus on universal experiences that young readers find funny. Balance humor with genuine emotional moments and character development.',
    'MG_ANIMAL_FICTION': 'Feature animal protagonists or strong animal characters in stories for 8-12 year olds. Create animal characters with distinct personalities while maintaining some authentic animal behavior. Consider whether animals are fully anthropomorphized or more realistic. Balance animal perspective with themes relevant to young readers.',
    'MG_SCHOOL_STORY': 'Set primarily in school environments with situations relevant to 8-12 year old readers. Create authentic classroom dynamics, teacher relationships, and peer interactions. Focus on friendship, belonging, and personal growth within school context. Balance academic elements with social and emotional development.',
    'MG_SPORTS_FICTION': 'Center on sports or athletic activities appealing to 8-12 year old readers. Create authentic sports action with accurate terminology and game dynamics. Focus on teamwork, practice, improvement, and good sportsmanship. Balance competitive elements with personal growth and relationship development.'
  },
  'CRIME': {
    'POLICE_PROCEDURAL': 'Focus on realistic police work and investigation techniques. Research law enforcement procedures, forensics, and departmental structure for authenticity. Develop multiple officers with different roles and perspectives. Balance technical details with character development and human drama.',
    'HEIST': 'Center on the planning and execution of a complex theft. Create intricate, plausible schemes requiring specialized skills. Develop a team of distinct characters with complementary abilities. Focus on obstacles, improvisation when plans go wrong, and interpersonal tensions. Balance technical details with character dynamics.',
    'NOIR': 'Create a cynical, morally ambiguous atmosphere with flawed protagonists. Use distinctive, terse prose style with vivid sensory details. Develop complex characters operating in corrupt systems with questionable choices. Include elements of social criticism. Balance darkness with compelling character motivations.',
    'LEGAL_CRIME': 'Focus on criminal cases from legal perspective (lawyers, judges, etc.). Research legal procedures and terminology for authenticity. Create morally complex situations that challenge the justice system. Develop courtroom strategy and maneuvering as central to the plot. Balance legal technicalities with human drama.',
    'ORGANIZED_CRIME': 'Feature criminal organizations and their internal operations. Research specific types of organized crime for authentic details. Create complex hierarchies and relationships within criminal structures. Develop moral complexity without glamorizing criminal lifestyle. Balance criminal perspective with consequences of actions.',
    'CAPER': 'Create lighthearted crime stories with wit and charm. Develop elaborate schemes with unexpected complications and clever resolutions. Focus on entertainment value over gritty realism. Include humor and playful tone while maintaining plot coherence. Balance criminal activities with likable characters and minimal violence.',
    'PSYCHOLOGICAL_CRIME': 'Focus on the psychology of criminals and those who pursue them. Create complex psychological profiles and motivations for criminal behavior. Develop cat-and-mouse dynamics between criminal and investigator. Explore moral gray areas and psychological damage. Balance internal psychological states with external actions.',
    'HISTORICAL_CRIME': 'Set crime stories in specific historical periods with accurate details. Research crime investigation methods available in the chosen era. Consider how social attitudes toward crime differed historically. Develop period-appropriate motivations and opportunities for crime. Balance historical authenticity with accessible storytelling.',
    'RURAL_CRIME': 'Set in small towns or isolated communities with limited resources. Create crimes affected by rural setting (isolation, limited law enforcement, close-knit community). Develop setting as a significant factor in both crime and investigation. Balance local color and atmosphere with universal human motivations.',
    'URBAN_CRIME': 'Set in city environments with crimes shaped by urban realities. Create authentic urban settings with specific neighborhoods and social dynamics. Consider how city infrastructure, population density, and anonymity affect criminal activity. Develop crimes that could only happen in urban environments. Balance city-specific elements with universal themes.'
  },
  'WESTERN': {
    'TRADITIONAL_WESTERN': 'Set in American frontier (typically 1865-1900) with classic western elements. Create historically accurate settings with attention to geography and period details. Develop themes of justice, honor, and civilization versus wilderness. Include iconic western settings like small towns, ranches, and untamed landscapes. Balance action with character development.',
    'REVISIONIST_WESTERN': 'Challenge or subvert traditional western myths and stereotypes. Create morally complex characters that defy western archetypes. Develop more historically accurate portrayal of diverse frontier populations. Consider perspectives traditionally marginalized in western narratives. Balance critique with compelling narrative.',
    'CIVIL_WAR_WESTERN': 'Set during or immediately after American Civil War with frontier elements. Research specific Civil War events and their impact on western territories. Develop characters with divided loyalties or war experiences affecting their actions. Consider how national conflict played out in western settings. Balance historical events with personal stories.',
    'OUTLAW_WESTERN': 'Focus on criminals or those outside the law in western settings. Create complex motivations for outlaw characters beyond simple villainy. Develop tension between freedom and lawlessness. Consider the real consequences of criminal life on the frontier. Balance sympathetic portrayal with moral complexity.',
    'LAWMAN_WESTERN': 'Center on sheriffs, marshals, or other law enforcement in frontier settings. Create realistic challenges of maintaining order in developing territories. Develop tension between legal authority and frontier justice. Consider limitations of law enforcement in isolated communities. Balance action with moral questions about justice.',
    'NATIVE_AMERICAN_WESTERN': 'Focus on indigenous perspectives during western expansion. Research specific tribes and their histories for authentic representation. Develop complex Native characters with agency and distinct cultural identities. Consider the impact of westward expansion on indigenous communities. Balance cultural specificity with accessible storytelling.',
    'MEXICAN_BORDER_WESTERN': 'Set near U.S.-Mexico border during frontier era. Research border history and cross-cultural interactions for authenticity. Develop characters from both Mexican and American cultures with depth. Consider how national identities and loyalties functioned in border regions. Balance cultural elements with universal themes.',
    'MINING_WESTERN': 'Center on gold rushes, silver booms, or other resource extraction. Research specific historical mining operations and communities. Develop the boom-town atmosphere with rapid growth and limited order. Consider environmental impact alongside human stories. Balance technical mining details with character-driven narrative.',
    'CATTLE_DRIVE_WESTERN': 'Focus on the logistics and challenges of moving cattle across long distances. Research historical cattle trails and the realities of the cowboy profession. Develop the group dynamics of diverse characters working together under difficult conditions. Create episodic challenges along the journey. Balance action with character development.',
    'SETTLEMENT_WESTERN': 'Center on the establishment and growth of frontier communities. Create realistic portrayal of the challenges of building civilization in wilderness. Develop conflicts between different visions for community development. Consider the diverse populations that contributed to western settlements. Balance community stories with individual narratives.'
  },
  'ADVENTURE': {
    'EXPLORATION': 'Focus on journeys into unknown territories or environments. Create detailed, immersive descriptions of unfamiliar settings. Develop challenges specific to the environment being explored. Consider both physical and psychological impacts of exploration. Balance external challenges with character development.',
    'SURVIVAL': 'Center on characters enduring extreme conditions or situations. Create realistic physical challenges and resource limitations. Develop practical problem-solving and adaptation to hostile environments. Consider psychological effects of survival situations. Balance physical ordeals with internal resilience and growth.',
    'QUEST': 'Structure around a specific goal or object that characters must obtain. Create a clear motivation for the quest that raises meaningful stakes. Develop episodic challenges that test different character strengths. Consider how the quest changes characters beyond achieving the objective. Balance action with character development.',
    'TREASURE_HUNT': 'Focus on search for valuable items with competition or obstacles. Create clever clues, maps, or puzzles leading to treasure. Develop competing interests and shifting alliances among searchers. Consider the moral implications of pursuing wealth or artifacts. Balance action sequences with intellectual challenges.',
    'HISTORICAL_ADVENTURE': 'Set adventure in specific historical period with accurate details. Research historical settings, transportation, and challenges of the era. Develop adventures that could only happen in the chosen time period. Consider historical figures or events as background or minor elements. Balance historical accuracy with exciting narrative.',
    'MARITIME_ADVENTURE': 'Center on seafaring journeys, naval conflicts, or oceanic challenges. Research nautical terminology, navigation techniques, and ship operations for authenticity. Develop the ship environment as a contained society with its own rules. Consider the psychological effects of isolation at sea. Balance technical details with human drama.',
    'MILITARY_ADVENTURE': 'Focus on warfare or military operations with emphasis on action. Research military procedures, weapons, and tactics of the relevant period. Develop realistic portrayal of military hierarchy and unit relationships. Consider the moral and psychological impacts of combat. Balance action sequences with character development.',
    'ARCHAEOLOGICAL_ADVENTURE': 'Center on discovery and investigation of historical artifacts or sites. Research archaeological methods and significant historical cultures. Develop mysteries connected to past civilizations or historical events. Consider ethical questions about cultural heritage and preservation. Balance educational elements with exciting narrative.',
    'TECHNOLOGICAL_ADVENTURE': 'Focus on challenges involving advanced technology or engineering. Create plausible technological  'TECHNOLOGICAL_ADVENTURE': 'Focus on challenges involving advanced technology or engineering. Create plausible technological elements based on scientific principles. Develop problems requiring technical knowledge and innovation to solve. Consider ethical implications of technology use. Balance technical details with accessible explanations and human stakes.',
    'WILDERNESS_ADVENTURE': 'Set in remote natural environments with minimal human presence. Create detailed, immersive descriptions of specific natural settings. Develop challenges arising from wilderness conditions and wildlife. Consider the psychological impact of isolation in nature. Balance environmental challenges with character growth.'
  },
  'HUMOR': {
    'SATIRE': 'Use wit and irony to critique social conventions, institutions, or human folly. Create exaggerated situations that reveal underlying truths about targets of satire. Develop characters that embody particular social types or attitudes. Consider the constructive purpose behind the critique. Balance critical elements with entertainment value.',
    'PARODY': 'Imitate and exaggerate the style of other literary works, genres, or authors for comic effect. Create recognizable references to source material while transforming it. Develop humor that works even for readers unfamiliar with the original. Consider affectionate versus critical approaches to source material. Balance specific references with broadly accessible humor.',
    'FARCE': 'Create improbable, highly exaggerated situations with rapid plot developments. Develop coincidences, mistaken identities, and comic misunderstandings. Focus on physical comedy and rapid dialogue. Create escalating complications before resolution. Balance outlandish situations with internal logic to the absurdity.',
    'ROMANTIC_COMEDY': 'Focus on humorous aspects of romantic relationships and dating. Create witty dialogue and amusing situations arising from romantic tension. Develop characters whose flaws and misconceptions create comic obstacles to romance. Consider both humor and genuine emotional connection. Balance comedy with authentic relationship development.',
    'BLACK_COMEDY': 'Address dark or taboo subjects through a comic lens. Create humor that provokes uncomfortable recognition rather than simple amusement. Develop situations where humor arises from normally serious or tragic circumstances. Consider ethical boundaries in treating difficult subjects. Balance darkness with genuine comic elements.',
    'WORKPLACE_COMEDY': 'Center on humorous aspects of professional environments and office relationships. Create specific workplace culture with distinct roles and dynamics. Develop comedy from professional hierarchies, workplace policies, and career ambitions. Consider relatable workplace frustrations as sources of humor. Balance comic exaggeration with recognizable situations.',
    'FAMILY_COMEDY': 'Focus on humorous aspects of family relationships and domestic life. Create distinct family members with complementary comic traits. Develop situations that arise from family dynamics and generational differences. Consider both conflict and affection in family humor. Balance comedy with authentic emotional connections.',
    'FISH_OUT_OF_WATER': 'Place characters in environments or situations where they fundamentally don\'t belong. Create humor from the protagonist\'s inability to understand or adapt to new circumstances. Develop both the character\'s perspective and the environment as sources of comedy. Consider growth and adaptation alongside continued misunderstandings. Balance laughing at and with the protagonist.',
    'ABSURDIST_HUMOR': 'Create deliberately illogical situations and nonsensical elements. Develop internal consistency within the absurdity. Focus on subverting expectations and conventional logic. Consider philosophical or existential themes beneath the absurdity. Balance pure nonsense with meaningful or emotionally resonant moments.',
    'SLAPSTICK': 'Focus on physical comedy, pratfalls, and exaggerated bodily humor. Create elaborate physical gags with careful timing and escalation. Develop characters whose physical traits or skills contribute to comic situations. Consider varying the types of physical humor to maintain freshness. Balance physical comedy with character and plot development.'
  },
  'CHILDREN\'S': {
    'PICTURE_BOOK': 'Create simple, clear stories appropriate for ages 3-8 with illustrations on every page. Develop concise text with strong read-aloud quality. Focus on single, straightforward concepts or messages. Consider how text and illustrations will work together. Balance simplicity with engaging narrative and language play.',
    'EARLY_READER': 'Write for children just learning to read independently (ages 5-7). Create simple sentence structures with controlled vocabulary. Develop short chapters or sections for sense of accomplishment. Consider both educational value and entertainment. Balance reading level constraints with engaging story and characters.',
    'CHAPTER_BOOK': 'Create stories for newly independent readers (ages 7-10) divided into short chapters. Develop straightforward plots with limited subplots. Focus on relatable protagonists similar in age to readers. Consider humor and adventure appropriate to age group. Balance simplicity with engaging narrative that builds reading confidence.',
    'CHILDREN\'S_FANTASY': 'Create magical elements accessible to young readers (typically ages 8-12). Develop clear, understandable magic systems with consistent rules. Focus on wonder, discovery, and age-appropriate challenges. Consider moral lessons without heavy-handed messaging. Balance fantasy elements with relatable emotional experiences.',
    'CHILDREN\'S_SCIENCE_FICTION': 'Develop science fiction concepts accessible to young readers (typically ages 8-12). Create technological elements that spark curiosity and scientific interest. Focus on sense of wonder and discovery rather than technical details. Consider educational value alongside entertainment. Balance scientific concepts with strong characters and plot.',
    'CHILDREN\'S_MYSTERY': 'Create age-appropriate puzzles and mysteries for young readers to solve alongside protagonists. Develop clues that observant children could reasonably notice and interpret. Focus on observation skills and logical thinking. Consider safety of child characters while maintaining suspense. Balance mystery elements with humor and character development.',
    'CHILDREN\'S_ADVENTURE': 'Create exciting journeys or quests appropriate for young readers. Develop challenges that test protagonists\' courage and resourcefulness. Focus on action suitable for the target age group. Consider appropriate levels of danger and resolution for young readers. Balance excitement with positive messages about bravery and problem-solving.',
    'CHILDREN\'S_HISTORICAL': 'Set stories in historical periods with child protagonists that young readers can relate to. Make history accessible through personal experiences rather than dates and facts. Focus on aspects of historical periods relevant to children\'s interests. Consider both educational value and entertainment. Balance historical setting with universal childhood experiences.',
    'CHILDREN\'S_ANIMAL_STORY': 'Feature animal protagonists or strong animal characters in stories for young readers. Create animal characters with distinct personalities while maintaining some authentic animal behavior. Consider whether animals are fully anthropomorphized or more realistic. Balance animal perspective with themes relevant to young readers.',
    'CHILDREN\'S_HUMOR': 'Create stories with strong comedic elements appealing to young readers. Develop humor through character, situation, and wordplay appropriate to target age. Focus on universal experiences that children find funny. Consider age-appropriate humor without relying on sarcasm or cynicism. Balance humor with genuine emotional moments.'
  },
  'WOMEN\'S_FICTION': {
    'CONTEMPORARY_WOMEN\'S_FICTION': 'Focus on modern women\'s experiences, relationships, and personal growth. Create complex female protagonists facing contemporary challenges. Develop nuanced relationships between women (friendships, family, colleagues). Consider issues particularly relevant to women\'s lives without reducing characters to issues. Balance challenges with moments of empowerment and connection.',
    'HISTORICAL_WOMEN\'S_FICTION': 'Center on women\'s experiences in specific historical periods. Research women\'s roles, limitations, and opportunities in the chosen era. Develop female characters with historically plausible agency and challenges. Consider how historical women navigated societal constraints. Balance historical accuracy with accessible, engaging narrative.',
    'DOMESTIC_FICTION': 'Focus on family relationships, home life, and personal connections. Create complex family dynamics with multiple perspectives. Develop the home environment as a rich setting for emotional drama. Consider both the comforts and constraints of domestic life. Balance intimate family moments with broader personal development.',
    'MOTHER_DAUGHTER_FICTION': 'Center on the complex relationships between mothers and daughters. Create distinct personalities that generate specific tensions and connections. Develop evolution of the relationship over time or through significant events. Consider both generational differences and inherited traits. Balance conflict with underlying attachment and love.',
    'SISTERHOOD_FICTION': 'Focus on relationships between sisters or close female friends. Create distinct personalities that generate specific dynamics between women. Develop both conflict and deep connection in female relationships. Consider how shared history affects current interactions. Balance individual character development with relationship evolution.',
    'CAREER_WOMEN\'S_FICTION': 'Center on professional challenges and workplace dynamics for female protagonists. Create realistic portrayal of specific career fields and their gender dynamics. Develop both professional and personal growth throughout the narrative. Consider work-life balance as a theme without reducing characters to this issue. Balance career focus with personal relationships.',
    'WOMEN\'S_COMING_OF_AGE': 'Focus on transition to adulthood with emphasis on female experience. Create meaningful experiences that shape the protagonist\'s identity as a woman. Develop changes in self-perception and understanding of womanhood. Consider societal expectations and personal authenticity as themes. Balance universal coming-of-age elements with female-specific experiences.',
    'MATURE_WOMEN\'S_FICTION': 'Center on women in middle age or beyond with age-appropriate concerns. Create protagonists dealing with life transitions specific to mature women. Develop themes of reinvention, wisdom gained from experience, or second chances. Consider issues like empty nests, aging parents, or midlife reassessment. Balance age-specific concerns with universal human experiences.',
    'WOMEN\'S_FRIENDSHIP_FICTION': 'Focus on the formation, maintenance, and evolution of female friendships. Create diverse female characters with distinct personalities and life circumstances. Develop both supportive aspects and realistic conflicts in friendships. Consider how friendships adapt to life changes and crises. Balance group dynamics with individual character development.',
    'WOMEN\'S_LITERARY_FICTION': 'Create literary-quality writing focused on women\'s experiences and perspectives. Develop complex female characters with rich interior lives. Focus on nuanced exploration of themes particularly relevant to women. Consider both universal human experiences and gender-specific perspectives. Balance literary techniques with accessible, engaging narrative.'
  },
  'CHRISTIAN_FICTION': {
    'CONTEMPORARY_CHRISTIAN_FICTION': 'Set in modern times with characters whose Christian faith influences their lives and decisions. Create authentic faith journeys without simplistic solutions to life\'s problems. Develop characters who struggle with real issues while maintaining or developing faith. Consider how Christianity intersects with contemporary challenges. Balance spiritual content with engaging narrative.',
    'HISTORICAL_CHRISTIAN_FICTION': 'Set in specific historical periods with characters whose Christian faith is central to the story. Research both historical setting and religious practices of the era for authenticity. Develop faith elements appropriate to the historical context rather than modern expressions. Consider historical challenges to faith practice. Balance historical and religious accuracy with accessible narrative.',
    'CHRISTIAN_ROMANCE': 'Focus on romantic relationships developed within Christian moral framework. Create characters whose faith influences their approach to dating and romance. Develop relationships based on shared values and spiritual connection. Consider realistic portrayal of temptation while maintaining appropriate content. Balance romantic elements with spiritual growth.',
    'CHRISTIAN_SUSPENSE': 'Combine suspenseful plot elements with characters whose faith influences their responses to danger. Create tension and excitement while maintaining Christian values in content. Develop characters who rely on faith during challenging circumstances. Consider moral and ethical dimensions of suspense situations. Balance thrilling elements with spiritual themes.',
    'BIBLICAL_FICTION': 'Elaborate on stories from the Bible with fictional details while remaining faithful to scripture. Research historical context of biblical events for authentic setting details. Develop biblical figures as fully-realized characters while respecting scriptural portrayal. Consider theological implications of fictional additions. Balance creative storytelling with biblical accuracy.',
    'CHRISTIAN_FANTASY': 'Create fantasy worlds that incorporate Christian themes, allegory, or moral framework. Develop fantasy elements that serve to illuminate spiritual truths. Consider how magic or supernatural elements align with Christian worldview. Create clear moral framework while avoiding simplistic good/evil dichotomies. Balance fantasy elements with spiritual meaning.',
    'CHRISTIAN_SCIENCE_FICTION': 'Develop science fiction scenarios that explore faith questions in futuristic or technological contexts. Create future worlds where Christianity continues or is challenged in new ways. Consider how faith might respond to scientific advancement or extraterrestrial contact. Develop ethical questions arising from technology through Christian lens. Balance scientific elements with spiritual themes.',
    'AMISH_FICTION': 'Focus on Amish communities and their distinct lifestyle and faith practices. Research Amish culture, beliefs, and daily life for authentic portrayal. Develop characters navigating tensions between Amish community and outside world. Consider both challenges and benefits of Amish lifestyle. Balance cultural specificity with universal human experiences.',
    'CHRISTIAN_WOMEN\'S_FICTION': 'Center on women\'s experiences with faith as a significant element in their lives. Create female protagonists whose Christian beliefs influence their approach to challenges. Develop realistic portrayal of women\'s roles in various Christian traditions. Consider both traditional and progressive Christian women\'s perspectives. Balance women\'s issues with spiritual growth.',
    'CHRISTIAN_FAMILY_SAGA': 'Trace family stories across generations with Christian faith as a connecting element. Create family members with varying relationships to faith tradition. Develop how faith is transmitted, questioned, and renewed across generations. Consider how family dynamics interact with religious practice. Balance family drama with spiritual themes and growth.'
  },
  'NEW_ADULT': {
    'CONTEMPORARY_NEW_ADULT': 'Focus on experiences of 18-25 year olds transitioning to independent adulthood. Create protagonists dealing with college, first jobs, or leaving home. Develop realistic portrayal of early adult challenges and decisions. Consider themes of identity formation and taking responsibility. Balance coming-of-age elements with more mature content than YA.',
    'NEW_ADULT_ROMANCE': 'Center on romantic relationships during the transitional years of early adulthood (18-25). Create age-appropriate romantic situations and challenges. Develop characters navigating both romantic relationships and other early adult responsibilities. Consider realistic portrayal of physical relationships for this age group. Balance romance with identity development and life transitions.',
    'COLLEGE_FICTION': 'Set primarily in college or university environments with characters 18-22. Create authentic portrayal of contemporary college life and academic pressures. Develop characters balancing studies, social life, and self-discovery. Consider diversity of college experiences beyond stereotypical party scenes. Balance campus-specific elements with universal coming-of-age themes.',
    'NEW_ADULT_FANTASY': 'Create fantasy worlds with protagonists in early adulthood (18-25) facing age-appropriate challenges. Develop magical elements that metaphorically reflect early adult transitions and choices. Consider how fantasy elements interact with themes of independence and identity formation. Balance worldbuilding with character development relevant to target age group.',
    'NEW_ADULT_SCIENCE_FICTION': 'Develop science fiction scenarios with protagonists in early adulthood (18-25). Create technological or scientific elements that connect to early adult experiences and choices. Consider how science fiction concepts can illuminate questions of identity and purpose. Balance technical elements with character-driven narrative appropriate for target age.',
    'NEW_ADULT_THRILLER': 'Create suspenseful situations with protagonists in early adulthood (18-25). Develop threats and challenges appropriate to early adult life circumstances. Consider how limited life experience affects characters\' responses to danger. Balance intensity and mature content with age-appropriate scenarios. Focus on both external threats and psychological tension.',
    'COMING_OF_INDEPENDENCE': 'Focus specifically on the transition from family dependence to self-sufficiency. Create realistic portrayal of early independence including financial challenges, living arrangements, and decision-making. Develop characters learning from mistakes and growing in capability. Consider both freedoms and responsibilities of independence. Balance struggles with moments of achievement and growth.',
    'CAREER_BEGINNINGS': 'Center on characters starting their professional lives and navigating early career challenges. Create realistic portrayal of entry-level positions, workplace dynamics, and professional identity formation. Develop characters balancing career ambitions with other life aspects. Consider both setbacks and successes in early professional development. Balance workplace specifics with broader life transitions.',
    'NEW_ADULT_LITERARY': 'Create literary-quality writing focused on the early adult experience (18-25). Develop complex characters with rich interior lives navigating the transition to adulthood. Focus on nuanced exploration of identity formation and life choices. Consider both universal and generation-specific aspects of early adulthood. Balance literary techniques with accessible narrative.',
    'INTERNATIONAL_NEW_ADULT': 'Focus on early adult experiences (18-25) in specific cultural contexts outside North America. Research cultural specifics of early adulthood in the chosen setting. Develop authentic portrayal of how adulthood transition varies across cultures. Consider both universal aspects of growing up and culturally specific expectations. Balance cultural specificity with accessible narrative for diverse readers.'
  }
};

 currentPhase: 'chapter_writing',
          message: `Generating chapter ${chapterNumber} of ${job.targetChapters}...`,
          progress: {
            chaptersCompleted: i,
            totalChapters: job.targetChapters
          }
        });
        
        // Generate the chapter
        const chapter = await this.generateChapter(jobId, chapterNumber, chapterOutline);
        
        // Update job with the new chapter
        job.chapters.push(chapter);
        job.progress.chaptersCompleted = job.chapters.length;
        job.progress.lastActivity = new Date();
        
        // Update token usage and cost
        totalTokensUsed += chapter.tokensUsed || 0;
        totalCost += chapter.cost || 0;
        attempts += chapter.attempts || 1;
        
        // Calculate estimated completion time
        const timePerChapter = (Date.now() - chapterGenerationStart) / job.chapters.length;
        const chaptersRemaining = job.targetChapters - job.chapters.length;
        const estimatedTimeRemaining = timePerChapter * chaptersRemaining;
        job.progress.estimatedCompletion = new Date(Date.now() + estimatedTimeRemaining);
        
        await job.save();
        
        emitJobUpdate(jobId, {
          currentPhase: 'chapter_writing',
          message: `Completed chapter ${chapterNumber} of ${job.targetChapters}`,
          progress: {
            chaptersCompleted: job.chapters.length,
            totalChapters: job.targetChapters,
            estimatedCompletion: job.progress.estimatedCompletion
          }
        });
        
      } catch (error) {
        logger.error(`Error generating chapter ${chapterNumber} for job ${jobId}:`, error);
        await this.handleOpenAIError(error, jobId, 'chapter_writing');
        
        // Continue with next chapter rather than stopping the whole process
        // But first, update the job to reflect the error
        job.progress.lastActivity = new Date();
        await job.save();
        
        emitJobUpdate(jobId, {
          currentPhase: 'chapter_writing',
          message: `Error in chapter ${chapterNumber}, skipping to next chapter`,
          error: error.message
        });
      }
    }
    
    // Update job with final chapter generation stats
    job.modelUsage.chapterGeneration = {
      model: 'gpt-4o',
      tokensUsed: totalTokensUsed,
      cost: totalCost,
      attempts: attempts,
      duration: Date.now() - chapterGenerationStart
    };
    
    // Calculate quality metrics
    if (job.chapters.length > 0) {
      const averageChapterLength = job.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0) / job.chapters.length;
      
      job.qualityMetrics = {
        averageChapterLength,
        genreAdherence: 0.85, // Placeholder - would need actual analysis
        characterConsistency: 0.9, // Placeholder - would need actual analysis
        plotContinuity: 0.95 // Placeholder - would need actual analysis
      };
    }
    
    job.progress.lastActivity = new Date();
    await job.save();
    
    logger.info(`Completed generating all chapters for job ${jobId}`);
  }
  
  async generateChapter(jobId, chapterNumber, chapterOutline) {
    const job = await Job.findById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    
    // Get genre-specific instructions
    const genreInstruction = genreInstructions[job.genre]?.[job.subgenre] || 
                            'Create a well-structured narrative with appropriate pacing and character development.';
    
    // Build context from previous chapters
    const previousChapters = job.chapters
      .filter(c => c.chapterNumber < chapterNumber)
      .sort((a, b) => a.chapterNumber - b.chapterNumber);
    
    // Create a summary of previous chapters to save tokens
    let previousChaptersSummary = "No previous chapters.";
    
    if (previousChapters.length > 0) {
      if (previousChapters.length <= 2) {
        // For the first few chapters, include brief summaries
        previousChaptersSummary = previousChapters
          .map(c => `Chapter ${c.chapterNumber}: ${c.title} - ${c.content.substring(0, 200)}...`)
          .join('\n\n');
      } else {
        // For later chapters, generate a condensed summary
        try {
          const summaryResponse = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'Summarize the following chapters concisely to provide context for the next chapter.'
              },
              {
                role: 'user',
                content: previousChapters
                  .map(c => `Chapter ${c.chapterNumber}: ${c.title}\n${c.content.substring(0, 300)}...`)
                  .join('\n\n')
              }
            ],
            temperature: 0.7,
            max_tokens: 1000
          });
          
          previousChaptersSummary = summaryResponse.choices[0].message.content;
        } catch (error) {
          logger.error(`Error generating chapter summary for job ${jobId}:`, error);
          // Fallback to basic summary
          previousChaptersSummary = `${previousChapters.length} previous chapters have established the main characters and conflicts.`;
        }
      }
    }
    
    // Maximum attempts for generation
    const maxAttempts = 3;
    let attempts = 0;
    let success = false;
    let chapterContent = '';
    let wordCount = 0;
    let tokensUsed = 0;
    let cost = 0;
    
    while (!success && attempts < maxAttempts) {
      attempts++;
      
      try {
        // Use GPT-4o for high-quality chapter generation
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a professional novelist writing in the ${job.genre} (${job.subgenre}) genre. Write a complete chapter based on the provided outline.`
            },
            {
              role: 'user',
              content: `
              STORY CONTEXT:
              - Title: ${job.title}
              - Genre: ${job.genre} (${job.subgenre})
              - Previous chapters summary: ${previousChaptersSummary}
              
              CHAPTER REQUIREMENTS:
              - Chapter Number: ${chapterNumber}
              - Chapter Title: ${chapterOutline.title}
              - Target Length: ${chapterOutline.wordTarget} words
              - Key Events: ${chapterOutline.keyEvents.join(', ')}
              - Character Focus: ${chapterOutline.characterFocus.join(', ')}
              - Plot Advancement: ${chapterOutline.plotAdvancement}
              
              GENRE GUIDELINES:
              ${genreInstruction}
              
              WRITING REQUIREMENTS:
              1. Maintain consistent character voices
              2. Use vivid, immersive scene descriptions
              3. Include authentic dialogue that advances plot and reveals character
              4. Incorporate genre-specific elements naturally
              5. Create a compelling chapter ending that encourages continued reading
              6. Maintain appropriate pacing
              7. Show don't tell - use active voice and concrete details
              ${attempts > 1 ? '8. IMPORTANT: This chapter needs to be longer to meet the target word count. Add more detail, dialogue, and description.' : ''}
              
              Write the complete chapter now:
              `
            }
          ],
          temperature: 0.8,
          max_tokens: 4000
        });
        
        chapterContent = response.choices[0].message.content;
        
        // Count words
        wordCount = this.countWords(chapterContent);
        
        // Track token usage and cost
        tokensUsed = response.usage.total_tokens;
        cost = this.calculateCost('gpt-4o', response.usage.prompt_tokens, response.usage.completion_tokens);
        
        // Validate word count
        const targetWordCount = chapterOutline.wordTarget;
        const minWordCount = targetWordCount * 0.75; // 75% of target
        
        if (wordCount < minWordCount) {
          logger.warn(`Chapter ${chapterNumber} for job ${jobId} is too short (${wordCount}/${targetWordCount} words). Attempt ${attempts}/${maxAttempts}`);
          
          if (attempts < maxAttempts) {
            // Try again with explicit instructions to write more
            continue;
          }
        }
        
        // If we get here, either the word count is acceptable or we've reached max attempts
        success = true;
        
      } catch (error) {
        logger.error(`Error in chapter ${chapterNumber} generation for job ${jobId}, attempt ${attempts}:`, error);
        
        if (attempts < maxAttempts) {
          // Wait before retrying with exponential backoff
          const backoffTime = Math.pow(2, attempts) * 1000;
          logger.info(`Waiting ${backoffTime}ms before retry ${attempts + 1}/${maxAttempts}`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
          continue;
        } else {
          throw new Error(`Failed to generate chapter after ${maxAttempts} attempts: ${error.message}`);
        }
      }
    }
    
    // Create chapter object
    const chapter = {
      chapterNumber,
      title: chapterOutline.title,
      content: chapterContent,
      wordCount,
      qualityScore: 0.8, // Placeholder - would need actual analysis
      generatedAt: new Date(),
      tokensUsed,
      cost,
      attempts
    };
    
    return chapter;
  }
  
  async resumeChapterGeneration(jobId, startFromChapter) {
    const job = await Job.findById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    
    // Add to active jobs
    this.activeJobs.set(jobId, {
      startTime: Date.now(),
      status: 'writing'
    });
    
    // Update job status
    job.status = 'writing';
    job.currentPhase = 'chapter_writing';
    job.progress.lastActivity = new Date();
    await job.save();
    
    emitJobUpdate(jobId, {
      status: job.status,
      currentPhase: job.currentPhase,
      message: `Resuming generation from chapter ${startFromChapter}...`,
      progress: {
        outlineComplete: true,
        chaptersCompleted: startFromChapter - 1,
        totalChapters: job.targetChapters
      }
    });
    
    // Generate remaining chapters
    try {
      // Initialize chapter generation tracking
      let chapterGenerationStart = Date.now();
      let totalTokensUsed = job.modelUsage.chapterGeneration?.tokensUsed || 0;
      let totalCost = job.modelUsage.chapterGeneration?.cost || 0;
      let attempts = job.modelUsage.chapterGeneration?.attempts || 0;
      
      for (let i = startFromChapter - 1; i < job.outline.length; i++) {
        const chapterNumber = i + 1;
        const chapterOutline = job.outline[i];
        
        // Check if this chapter already exists
        const existingChapter = job.chapters.find(c => c.chapterNumber === chapterNumber);
        if (existingChapter) {
          logger.info(`Chapter ${chapterNumber} already exists for job ${jobId}, skipping generation`);
          continue;
        }
        
        try {
          logger.info(`Generating chapter ${chapterNumber} for job ${jobId}`);
          
          emitJobUpdate(jobId, {
            currentPhase: 'chapter_writing',
            message: `Generating chapter ${chapterNumber} of ${job.targetChapters}...`,
            progress: {
              chaptersCompleted: job.chapters.length,
              totalChapters: job.targetChapters
            }
          });
          
          // Generate the chapter
          const chapter = await this.generateChapter(jobId, chapterNumber, chapterOutline);
          
          // Update job with the new chapter
          job.chapters.push(chapter);
          job.progress.chaptersCompleted = job.chapters.length;
          job.progress.lastActivity = new Date();
          
          // Update token usage and cost
          totalTokensUsed += chapter.tokensUsed || 0;
          totalCost += chapter.cost || 0;
          attempts += chapter.attempts || 1;
          
          await job.save();
          
          emitJobUpdate(jobId, {
            currentPhase: 'chapter_writing',
            message: `Completed chapter ${chapterNumber} of ${job.targetChapters}`,
            progress: {
              chaptersCompleted: job.chapters.length,
              totalChapters: job.targetChapters
            }
          });
          
        } catch (error) {
          logger.error(`Error generating chapter ${chapterNumber} for job ${jobId}:`, error);
          await this.handleOpenAIError(error, jobId, 'chapter_writing');
          
          // Continue with next chapter rather than stopping the whole process
          emitJobUpdate(jobId, {
            currentPhase: 'chapter_writing',
            message: `Error in chapter ${chapterNumber}, skipping to next chapter`,
            error: error.message
          });
        }
      }
      
      // Update job with final chapter generation stats
      job.modelUsage.chapterGeneration = {
        model: 'gpt-4o',
        tokensUsed: totalTokensUsed,
        cost: totalCost,
        attempts: attempts,
        duration: Date.now() - chapterGenerationStart
      };
      
      // Calculate quality metrics
      if (job.chapters.length > 0) {
        const averageChapterLength = job.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0) / job.chapters.length;
        
        job.qualityMetrics = {
          averageChapterLength,
          genreAdherence: 0.85, // Placeholder - would need actual analysis
          characterConsistency: 0.9, // Placeholder - would need actual analysis
          plotContinuity: 0.95 // Placeholder - would need actual analysis
        };
      }
      
      // Check if all chapters are complete
      if (job.chapters.length === job.targetChapters) {
        job.status = 'completed';
        job.completedAt = new Date();
      }
      
      job.progress.lastActivity = new Date();
      await job.save();
      
      // Remove from active jobs
      this.activeJobs.delete(jobId);
      
      if (job.status === 'completed') {
        emitJobUpdate(jobId, {
          status: 'completed',
          message: 'Novel generation complete',
          progress: {
            chaptersCompleted: job.chapters.length,
            totalChapters: job.targetChapters
          }
        });
      }
      
      logger.info(`Completed resuming chapter generation for job ${jobId}`);
      
    } catch (error) {
      await this.handleGenerationError(jobId, error);
    }
  }
  
  async handleOpenAIError(error, jobId, phase) {
    // Handle specific OpenAI API errors with appropriate strategies
    if (error.status === 429) {
      // Rate limit error - implement exponential backoff
      const retryAfter = error.headers?.['retry-after'] ? parseInt(error.headers['retry-after']) * 1000 : 30000;
      logger.warn(`Rate limit exceeded for job ${jobId}. Retrying after ${retryAfter}ms`);
      
      // Notify client about the delay
      emitJobUpdate(jobId, {
        message: `API rate limit reached. Waiting ${Math.ceil(retryAfter/1000)} seconds before retrying...`
      });
      
      // Wait for the specified time
      await new Promise(resolve => setTimeout(resolve, retryAfter));
      return true;
    } else if (error.status === 500 || error.status === 503) {
      // Server error - retry with backoff
      logger.warn(`OpenAI server error (${error.status}) for job ${jobId}. Retrying after 5s`);
      
      // Notify client
      emitJobUpdate(jobId, {
        message: `API server error. Retrying shortly...`
      });
      
      // Wait 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
      return true;
    } else if (error.status === 400 && error.message.includes('context_length_exceeded')) {
      // Context length error - need to reduce input
      logger.warn(`Context length exceeded for job ${jobId} in phase ${phase}`);
      
      // Notify client
      emitJobUpdate(jobId, {
        message: `Input too long. Adjusting and retrying...`
      });
      
      // This would need specific handling based on the phase
      return false;
    }
    
    // For other errors, don't retry automatically
    return false;
  }
  
  async handleGenerationError(jobId, error, phase = null) {
    logger.error(`Error in generation for job ${jobId}:`, error);
    
    try {
      const job = await Job.findById(jobId);
      if (!job) return;
      
      // Update job status
      job.status = 'failed';
      if (phase) job.currentPhase = phase;
      job.progress.lastActivity = new Date();
      await job.save();
      
      // Remove from active jobs
      this.activeJobs.delete(jobId);
      
      // Emit error update
      emitJobUpdate(jobId, {
        status: 'failed',
        message: `Generation failed: ${error.message}`,
        error: error.message
      });
      
    } catch (dbError) {
      logger.error(`Error updating job ${jobId} after generation error:`, dbError);
    }
  }
  
  calculateCost(model, promptTokens, completionTokens) {
    const rates = this.costTracking[model];
    if (!rates) return 0;
    
    return (promptTokens * rates.inputCost / 1000) + (completionTokens * rates.outputCost / 1000);
  }
  
  countWords(text) {
    return text.split(/\s+/).filter(Boolean).length;
  }
}

module.exports = new AIService();

Part 6: Frontend Implementation

6.1 Main Entry Point

Create a frontend/index.html file:

html


<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/book-icon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Somers Novel Generator</title>
    <meta name="description" content="AI-powered novel generation tool" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>

Create a frontend/src/main.jsx file:

jsx


import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

6.2 App Component

Create a frontend/src/App.jsx file:

jsx


import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { NovelProvider } from './context/NovelContext';
import Header from './components/Header';
import NovelGenerationForm from './components/NovelGenerationForm';
import GenerationProgress from './components/GenerationProgress';
import NovelPreview from './components/NovelPreview';

function App() {
  return (
    <Router>
      <NovelProvider>
        <div className="app">
          <Header />
          <main className="container">
            <Routes>
              <Route path="/" element={<NovelGenerationForm />} />
              <Route path="/progress/:jobId" element={<GenerationProgress />} />
              <Route path="/preview/:jobId" element={<NovelPreview />} />
            </Routes>
          </main>
        </div>
      </NovelProvider>
    </Router>
  );
}

export default App;

6.3 Context API

Create a frontend/src/context/NovelContext.jsx file:

jsx


import { createContext, useContext, useReducer } from 'react';

const NovelContext = createContext();

const initialState = {
  job: null,
  currentPhase: null,
  progress: {
    outlineComplete: false,
    chaptersCompleted: 0,
    totalChapters: 0
  },
  outline: [],
  chapters: [],
  error: null,
  isLoading: false
};

function novelReducer(state, action) {
  switch (action.type) {
    case 'START_GENERATION':
      return { 
        ...state, 
        isLoading: true, 
        error: null, 
        job: action.payload 
      };
    case 'UPDATE_PROGRESS':
      return { 
        ...state, 
        ...action.payload 
      };
    case 'GENERATION_COMPLETE':
      return { 
        ...state, 
        isLoading: false, 
        ...action.payload 
      };
    case 'GENERATION_ERROR':
      return { 
        ...state, 
        isLoading: false, 
        error: action.payload 
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function NovelProvider({ children }) {
  const [state, dispatch] = useReducer(novelReducer, initialState);
  
  return (
    <NovelContext.Provider value={{ state, dispatch }}>
      {children}
    </NovelContext.Provider>
  );
}

export function useNovel() {
  return useContext(NovelContext);
}

6.4 API Service

Create a frontend/src/services/api.js file:

javascript


import axios from 'axios';

// Use relative URLs in production since frontend and backend are served from same domain
// Only use environment variable for local development
const API_URL = import.meta.env.VITE_API_BASE_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response || error);
    return Promise.reject(error);
  }
);

export const generateNovel = async (novelData) => {
  const response = await api.post('/api/novel/generate', novelData);
  return response.data;
};

export const getJobStatus = async (jobId) => {
  const response = await api.get(`/api/novel/status/${jobId}`);
  return response.data;
};

export const downloadNovel = async (jobId) => {
  const response = await api.get(`/api/novel/download/${jobId}`);
  return response.data;
};

export const uploadPremise = async (file) => {
  const formData = new FormData();
  formData.append('premise', file);
  
  const response = await api.post('/api/novel/upload-premise', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  
  return response.data;
};

export const getGenres = async () => {
  const response = await api.get('/api/novel/genres');
  return response.data;
};

6.5 WebSocket Hook

Create a frontend/src/hooks/useWebSocket.js file:

javascript


import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useNovel } from '../context/NovelContext';

export function useWebSocket(jobId) {
  const socket = useRef(null);
  const { dispatch } = useNovel();
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  
  useEffect(() => {
    if (!jobId) return;
    
    const connectSocket = () => {
      // Connect to WebSocket - use environment variable for local dev, current domain for production
      const socketURL = import.meta.env.VITE_API_BASE_URL || window.location.origin;
      socket.current = io(socketURL, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
      });
      
      socket.current.on('connect', () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Subscribe to job updates
        socket.current.emit('subscribe', jobId);
      });
      
      socket.current.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setIsConnected(false);
      });
      
      socket.current.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        setIsConnected(false);
        
        // If the server closed the connection, try to reconnect manually
        if (reason === 'io server disconnect') {
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current += 1;
            socket.current.connect();
          }
        }
      });
      
      // Handle job updates
      socket.current.on('job-update', (data) => {
        console.log('Received job update:', data);
        dispatch({ type: 'UPDATE_PROGRESS', payload: data });
        
        if (data.status === 'completed') {
          dispatch({ type: 'GENERATION_COMPLETE', payload: data });
        } else if (data.status === 'failed') {
          dispatch({ type: 'GENERATION_ERROR', payload: data.message || 'Generation failed' });
        }
      });
    };
    
    connectSocket();
    
    // Cleanup on unmount
    return () => {
      if (socket.current) {
        socket.current.emit('unsubscribe', jobId);
        socket.current.disconnect();
        setIsConnected(false);
      }
    };
  }, [jobId, dispatch]);
  
  return { socket: socket.current, isConnected };
}

6.6 Header Component

Create a frontend/src/components/Header.jsx file:

jsx


import { Link } from 'react-router-dom';
import '../styles/Header.css';

function Header() {
  return (
    <header className="header">
      <div className="container header-content">
        <Link to="/" className="logo">
          <h1>Somers Novel Generator</h1>
        </Link>
        <nav>
          <ul>
            <li>
              <Link to="/">New Novel</Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default Header;

6.7 Novel Generation Form Components

Create a frontend/src/components/NovelGenerationForm/index.jsx file:

jsx


import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNovel } from '../../context/NovelContext';
import { generateNovel, uploadPremise, getGenres } from '../../services/api';
import GenreSelector from './GenreSelector';
import NovelConfigForm from './NovelConfigForm';
import PremiseUploader from './PremiseUploader';
import '../../styles/NovelGenerationForm.css';

function NovelGenerationForm() {
  const navigate = useNavigate();
  const { dispatch } = useNovel();
  const [formData, setFormData] = useState({
    title: '',
    genre: '',
    subgenre: '',
    premise: '',
    targetWordCount: 50000,
    targetChapters: 15
  });
  const [genres, setGenres] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load available genres
    const loadGenres = async () => {
      try {
        const genresData = await getGenres();
        setGenres(genresData);
      } catch (err) {
        console.error('Error loading genres:', err);
        setError('Failed to load genre options. Please refresh the page.');
      }
    };
    
    loadGenres();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenreChange = (genre, subgenre) => {
    setFormData(prev => ({ ...prev, genre, subgenre }));
  };

  const handlePremiseChange = (premise) => {
    setFormData(prev => ({ ...prev, premise }));
  };

  const handlePremiseUpload = async (file) => {
    try {
      setIsLoading(true);
      const result = await uploadPremise(file);
      setFormData(prev => ({ ...prev, premise: result.premise }));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Error uploading premise');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await generateNovel(formData);
      dispatch({ type: 'START_GENERATION', payload: { jobId: result.jobId } });
      navigate(`/progress/${result.jobId}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Error starting generation');
      setIsLoading(false);
    }
  };

  return (
    <div className="novel-generation-form">
      <h2>Generate a Novel</h2>
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
          />
        </div>
        
        <GenreSelector 
          genres={genres}
          selectedGenre={formData.genre}
          selectedSubgenre={formData.subgenre}
          onChange={handleGenreChange}
        />
        
        <NovelConfigForm
          targetWordCount={formData.targetWordCount}
          targetChapters={formData.targetChapters}
          onChange={handleInputChange}
        />
        
        <PremiseUploader
          premise={formData.premise}
          onChange={handlePremiseChange}
          onFileUpload={handlePremiseUpload}
        />
        
        <button 
          type="submit" 
          className="submit-button"
          disabled={isLoading || !formData.title || !formData.genre || !formData.subgenre || !formData.premise}
        >
          {isLoading ? 'Processing...' : 'Generate Novel'}
        </button>
      </form>
    </div>
  );
}

export default NovelGenerationForm;

Create a frontend/src/components/NovelGenerationForm/GenreSelector.jsx file:

jsx


import { useState, useEffect } from 'react';
import '../../styles/GenreSelector.css';

function GenreSelector({ genres, selectedGenre, selectedSubgenre, onChange }) {
  const [subgenres, setSubgenres] = useState([]);
  
  useEffect(() => {
    if (selectedGenre) {
      const genreData = genres.find(g => g.name === selectedGenre);
      if (genreData) {
        setSubgenres(genreData.subgenres);
        
        // If the current subgenre is not in the new list, reset it
        if (!genreData.subgenres.some(sg => sg.name === selectedSubgenre)) {
          onChange(selectedGenre, '');
        }
      }
    } else {
      setSubgenres([]);
    }
  }, [selectedGenre, genres]);

  const handleGenreChange = (e) => {
    const newGenre = e.target.value;
    onChange(newGenre, '');
  };

  const handleSubgenreChange = (e) => {
    onChange(selectedGenre, e.target.value);
  };

  return (
    <div className="genre-selector">
      <div className="form-group">
        <label htmlFor="genre">Genre</label>
        <select
          id="genre"
          name="genre"
          value={selectedGenre}
          onChange={handleGenreChange}
          required
        >
          <option value="">Select a genre</option>
          {genres.map(genre => (
            <option key={genre.name} value={genre.name}>
              {genre.name.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="subgenre">Subgenre</label>
        <select
          id="subgenre"
          name="subgenre"
          value={selectedSubgenre}
          onChange={handleSubgenreChange}
          disabled={!selectedGenre}
          required
        >
          <option value="">Select a subgenre</option>
          {subgenres.map(subgenre => (
            <option key={subgenre.name} value={subgenre.name}>
              {subgenre.name.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>
      
      {selectedGenre && selectedSubgenre && (
        <div className="subgenre-description">
          {subgenres.find(sg => sg.name === selectedSubgenre)?.description}
        </div>
      )}
    </div>
  );
}

export default GenreSelector;

Create a frontend/src/components/NovelGenerationForm/NovelConfigForm.jsx file:

jsx


import '../../styles/NovelConfigForm.css';

function NovelConfigForm({ targetWordCount, targetChapters, onChange }) {
  const handleWordCountChange = (e) => {
    const value = parseInt(e.target.value);
    onChange({
      target: {
        name: 'targetWordCount',
        value: value
      }
    });
  };

  const handleChaptersChange = (e) => {
    const value = parseInt(e.target.value);
    onChange({
      target: {
        name: 'targetChapters',
        value: value
      }
    });
  };

  // Calculate average chapter length
  const avgChapterLength = Math.round(targetWordCount / targetChapters);

  return (
    <div className="novel-config-form">
      <h3>Novel Configuration</h3>
      
      <div className="form-group">
        <label htmlFor="targetWordCount">Target Word Count</label>
        <input
          type="range"
          id="targetWordCount"
          name="targetWordCount"
          min="10000"
          max="150000"
          step="5000"
          value={targetWordCount}
          onChange={handleWordCountChange}
        />
        <div className="range-value">{targetWordCount.toLocaleString()} words</div>
      </div>
      
      <div className="form-group">
        <label htmlFor="targetChapters">Number of Chapters</label>
        <input
          type="range"
          id="targetChapters"
          name="targetChapters"
          min="5"
          max="50"
          step="1"
          value={targetChapters}
          onChange={handleChaptersChange}
        />
        <div className="range-value">{targetChapters} chapters</div>
      </div>
      
      <div className="chapter-length-info">
        Average chapter length: <strong>{avgChapterLength.toLocaleString()} words</strong>
      </div>
    </div>
  );
}

export default NovelConfigForm;

Create a frontend/src/components/NovelGenerationForm/PremiseUploader.jsx file:

jsx


import { useRef, useState } from 'react';
import '../../styles/PremiseUploader.css';

function PremiseUploader({ premise, onChange, onFileUpload }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const [charCount, setCharCount] = useState(premise.length);
  
  const handleTextChange = (e) => {
    const newPremise = e.target.value;
    onChange(newPremise);
    setCharCount(newPremise.length);
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = () => {
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  };
  
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFile(file);
    }
  };
  
  const handleFile = (file) => {
    if (file.type === 'text/plain' || file.type === 'text/markdown') {
      onFileUpload(file);
    } else {
      alert('Please upload a .txt or .md file');
    }
  };
  
  const handleBrowseClick = () => {
    fileInputRef.current.click();
  };
  
  return (
    <div className="premise-uploader">
      <h3>Novel Premise</h3>
      
      <div 
        className={`upload-area ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept=".txt,.md"
          style={{ display: 'none' }}
        />
        <p>Drag & drop a text file or <button type="button" onClick={handleBrowseClick}>browse</button></p>
        <p className="file-types">Accepted file types: .txt, .md (max 10,000 characters)</p>
      </div>
      
      <div className="form-group">
        <label htmlFor="premise">
          Premise <span className="char-count">{charCount}/10000</span>
        </label>
        <textarea
          id="premise"
          name="premise"
          value={premise}
          onChange={handleTextChange}
          rows="10"
          maxLength="10000"
          placeholder="Enter your novel premise here or upload a file..."
          required
        ></textarea>
      </div>
    </div>
  );
}

export default PremiseUploader;

6.8 Generation Progress Components

Create a frontend/src/components/GenerationProgress/index.jsx file:

jsx


import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useNovel } from '../../context/NovelContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import { getJobStatus } from '../../services/api';
import ProgressPhase from './ProgressPhase';
import ChapterProgress from './ChapterProgress';
import CostTracker from './CostTracker';
import '../../styles/GenerationProgress.css';

function GenerationProgress() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useNovel();
  const [isLoading, setIsLoading] = useState(true);
  const { isConnected } = useWebSocket(jobId);
  
  useEffect(() => {
    const fetchJobStatus = async () => {
      try {
        const jobData = await getJobStatus(jobId);
        dispatch({ type: 'UPDATE_PROGRESS', payload: jobData });
        
        if (jobData.status === 'completed') {
          dispatch({ type: 'GENERATION_COMPLETE', payload: jobData });
        }
      } catch (error) {
        dispatch({ type: 'GENERATION_ERROR', payload: error.message || 'Failed to load job status' });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchJobStatus();
    
    // Set up polling as a fallback if WebSocket is not connected
    let pollingInterval;
    
    if (!isConnected) {
      pollingInterval = setInterval(fetchJobStatus, 10000); // Poll every 10 seconds
    }
    
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [jobId, dispatch, isConnected]);
  
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading progress...</p>
      </div>
    );
  }
  
  if (state.error) {
    return (
      <div className="error-container">
        <h2>Generation Error</h2>
        <p className="error-message">{state.error}</p>
        <button onClick={() => navigate('/')}>Start Over</button>
      </div>
    );
  }
  
  if (state.status === 'completed') {
    return (
      <div className="completion-container">
        <h2>Novel Generation Complete!</h2>
        <p>Your novel has been successfully generated.</p>
        <button onClick={() => navigate(`/preview/${jobId}`)}>View Novel</button>
      </div>
    );
  }
  
  return (
    <div className="generation-progress">
      <h2>Generating Your Novel</h2>
      
      {!isConnected && (
        <div className="connection-warning">
          <p>WebSocket connection lost. Using fallback polling. Reconnecting...</p>
        </div>
      )}
      
      <div className="progress-container">
        <ProgressPhase 
          phase="planning"
          currentPhase={state.currentPhase}
          status={state.status}
          description="Analyzing premise and planning structure"
        />
        
        <ProgressPhase 
          phase="outlining"
          currentPhase={state.currentPhase}
          status={state.status}
          description="Creating chapter-by-chapter outline"
        />
        
        <ProgressPhase 
          phase="writing"
          currentPhase={state.currentPhase}
          status={state.status}
          description="Writing chapters based on outline"
        />
        
        {state.currentPhase === 'chapter_writing' && (
          <ChapterProgress 
            completed={state.progress?.chaptersCompleted || 0}
            total={state.progress?.totalChapters || 0}
            estimatedCompletion={state.progress?.estimatedCompletion}
          />
        )}
        
        {import.meta.env.VITE_ENABLE_COST_TRACKING === 'true' && (
          <CostTracker 
            outlineGeneration={state.modelUsage?.outlineGeneration}
            chapterGeneration={state.modelUsage?.chapterGeneration}
          />
        )}
      </div>
    </div>
  );
}

export default GenerationProgress;

Create a frontend/src/components/GenerationProgress/ProgressPhase.jsx file:

jsx


import '../../styles/ProgressPhase.css';

function ProgressPhase({ phase, currentPhase, status, description }) {
  // Map phase names to their corresponding API phase values
  const phaseMapping = {
    'planning': 'premise_analysis',
    'outlining': 'outline_generation',
    'writing': 'chapter_writing'
  };
  
  const apiPhase = phaseMapping[phase];
  
  // Determine the status of this phase
  let phaseStatus = 'pending';
  
  if (currentPhase === apiPhase) {
    phaseStatus = 'active';
  } else if (
    (apiPhase === 'premise_analysis' && ['outline_generation', 'chapter_writing'].includes(currentPhase)) ||
    (apiPhase === 'outline_generation' && currentPhase === 'chapter_writing') ||
    status === 'completed'
  ) {
    phaseStatus = 'completed';
  }

  return (
    <div className={`progress-phase ${phaseStatus}`}>
      <div className="phase-icon">
        {phaseStatus === 'completed' ? '✓' : phaseStatus === 'active' ? '•' : '○'}
      </div>
      <div className="phase-content">
        <h3 className="phase-title">{phase.charAt(0).toUpperCase() + phase.slice(1)}</h3>
        <p className="phase-description">{description}</p>
      </div>
    </div>
  );
}

export default ProgressPhase;

Create a frontend/src/components/GenerationProgress/ChapterProgress.jsx file:

jsx


import '../../styles/ChapterProgress.css';

function ChapterProgress({ completed, total, estimatedCompletion }) {
  const progressPercentage = total > 0 ? (completed / total) * 100 : 0;
  
  // Format estimated completion time
  let completionText = '';
  if (estimatedCompletion) {
    const estimatedDate = new Date(estimatedCompletion);
    completionText = `Estimated completion: ${estimatedDate.toLocaleTimeString()}`;
  }

  return (
    <div className="chapter-progress">
      <div className="progress-header">
        <span>Chapter Progress</span>
        <span>{completed} of {total} chapters</span>
      </div>
      
      <div className="progress-bar-container">
        <div 
          className="progress-bar" 
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      
      <div className="progress-percentage">
        {Math.round(progressPercentage)}%
      </div>
      
      {completionText && (
        <div className="estimated-completion">
          {completionText}
        </div>
      )}
    </div>
  );
}

export default ChapterProgress;

Create a frontend/src/components/GenerationProgress/CostTracker.jsx file:

jsx


import '../../styles/CostTracker.css';

function CostTracker({ outlineGeneration, chapterGeneration }) {
  // Calculate total cost
  const outlineCost = outlineGeneration?.cost || 0;
  const chapterCost = chapterGeneration?.cost || 0;
  const totalCost = outlineCost + chapterCost;
  
  // Format costs
  const formatCost = (cost) => {
    return `$${cost.toFixed(4)}`;
  };
  
  // Calculate token usage
  const outlineTokens = outlineGeneration?.tokensUsed || 0;
  const chapterTokens = chapterGeneration?.tokensUsed || 0;
  const totalTokens = outlineTokens + chapterTokens;

  return (
    <div className="cost-tracker">
      <h3>Cost & Usage Tracking</h3>
      
      <div className="cost-grid">
        <div className="cost-label">Outline Generation:</div>
        <div className="cost-value">{formatCost(outlineCost)}</div>
        <div className="cost-tokens">{outlineTokens.toLocaleString()} tokens</div>
        
        <div className="cost-label">Chapter Generation:</div>
        <div className="cost-value">{formatCost(chapterCost)}</div>
        <div className="cost-tokens">{chapterTokens.toLocaleString()} tokens</div>
        
        <div className="cost-label total">Total:</div>
        <div className="cost-value total">{formatCost(totalCost)}</div>
        <div className="cost-tokens total">{totalTokens.toLocaleString()} tokens</div>
      </div>
    </div>
  );
}

export default CostTracker;

6.9 Novel Preview Components

Create a frontend/src/components/NovelPreview/index.jsx file:

jsx


import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { downloadNovel } from '../../services/api';
import ChapterList from './ChapterList';
import ChapterViewer from './ChapterViewer';
import DownloadOptions from './DownloadOptions';
import '../../styles/NovelPreview.css';

function NovelPreview() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [novel, setNovel] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchNovel
 useEffect(() => {
    const fetchNovel = async () => {
      try {
        setIsLoading(true);
        const data = await downloadNovel(jobId);
        setNovel(data);
        
        // Select first chapter by default
        if (data.chapters && data.chapters.length > 0) {
          setSelectedChapter(data.chapters[0]);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error loading novel');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchNovel();
  }, [jobId]);
  
  const handleChapterSelect = (chapter) => {
    setSelectedChapter(chapter);
    
    // Scroll to top of chapter viewer on mobile
    if (window.innerWidth < 768) {
      document.querySelector('.chapter-viewer')?.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  const handleBackToHome = () => {
    navigate('/');
  };
  
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading novel...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-container">
        <h2>Error Loading Novel</h2>
        <p className="error-message">{error}</p>
        <button onClick={handleBackToHome}>Back to Home</button>
      </div>
    );
  }
  
  if (!novel) {
    return (
      <div className="error-container">
        <h2>Novel Not Found</h2>
        <p>The requested novel could not be found.</p>
        <button onClick={handleBackToHome}>Back to Home</button>
      </div>
    );
  }
  
  return (
    <div className="novel-preview">
      <div className="novel-header">
        <h1>{novel.title}</h1>
        <div className="novel-meta">
          <p>Genre: {novel.genre.replace(/_/g, ' ')} ({novel.subgenre.replace(/_/g, ' ')})</p>
          <p>Word Count: {novel.wordCount.toLocaleString()}</p>
          <p>Chapters: {novel.chapters.length}</p>
        </div>
      </div>
      
      <div className="novel-content">
        <ChapterList 
          chapters={novel.chapters}
          selectedChapter={selectedChapter}
          onSelectChapter={handleChapterSelect}
        />
        
        <ChapterViewer chapter={selectedChapter} />
      </div>
      
      <DownloadOptions novel={novel} />
    </div>
  );
}

export default NovelPreview;
Create a frontend/src/components/NovelPreview/ChapterList.jsx file:

jsx


import '../../styles/ChapterList.css';

function ChapterList({ chapters, selectedChapter, onSelectChapter }) {
  return (
    <div className="chapter-list">
      <h2>Chapters</h2>
      <ul>
        {chapters.map(chapter => (
          <li 
            key={chapter.number}
            className={selectedChapter?.number === chapter.number ? 'selected' : ''}
            onClick={() => onSelectChapter(chapter)}
          >
            <span className="chapter-number">{chapter.number}.</span>
            <span className="chapter-title">{chapter.title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ChapterList;

Create a frontend/src/components/NovelPreview/ChapterViewer.jsx file:

jsx


import '../../styles/ChapterViewer.css';

function ChapterViewer({ chapter }) {
  if (!chapter) {
    return (
      <div className="chapter-viewer empty">
        <p>Select a chapter to view</p>
      </div>
    );
  }

  // Format the chapter content with proper paragraphs
  const formatContent = (content) => {
    return content.split('\n\n').map((paragraph, index) => (
      <p key={index}>{paragraph}</p>
    ));
  };

  return (
    <div className="chapter-viewer">
      <h2>
        <span className="chapter-number">Chapter {chapter.number}:</span>
        <span className="chapter-title">{chapter.title}</span>
      </h2>
      <div className="chapter-content">
        {formatContent(chapter.content)}
      </div>
    </div>
  );
}

export default ChapterViewer;

Create a frontend/src/components/NovelPreview/DownloadOptions.jsx file:

jsx


import { useState } from 'react';
import '../../styles/DownloadOptions.css';

function DownloadOptions({ novel }) {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const downloadAsText = () => {
    setIsGenerating(true);
    
    try {
      // Format the novel as plain text
      let content = `${novel.title}\n\n`;
      content += `Genre: ${novel.genre} (${novel.subgenre})\n`;
      content += `Word Count: ${novel.wordCount}\n\n`;
      
      // Add each chapter
      novel.chapters.forEach(chapter => {
        content += `\n\nCHAPTER ${chapter.number}: ${chapter.title}\n\n`;
        content += chapter.content;
      });
      
      // Create and download the file
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${novel.title}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating text file:', error);
      alert('Failed to generate text file');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const downloadAsHTML = () => {
    setIsGenerating(true);
    
    try {
      // Format the novel as HTML
      let content = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${novel.title}</title>
  <style>
    body { font-family: Georgia, serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { text-align: center; margin-bottom: 10px; }
    .meta { text-align: center; margin-bottom: 40px; color: #666; }
    .chapter { margin-top: 40px; }
    .chapter-title { text-align: center; margin-bottom: 20px; }
    p { margin-bottom: 20px; text-indent: 2em; }
  </style>
</head>
<body>
  <h1>${novel.title}</h1>
  <div class="meta">
    <p>Genre: ${novel.genre} (${novel.subgenre})</p>
    <p>Word Count: ${novel.wordCount}</p>
  </div>`;
      
      // Add each chapter
      novel.chapters.forEach(chapter => {
        content += `
  <div class="chapter">
    <h2 class="chapter-title">Chapter ${chapter.number}: ${chapter.title}</h2>
    ${chapter.content.split('\n\n').map(p => `    <p>${p}</p>`).join('\n')}
  </div>`;
      });
      
      content += `
</body>
</html>`;
      
      // Create and download the file
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${novel.title}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating HTML file:', error);
      alert('Failed to generate HTML file');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="download-options">
      <h3>Download Options</h3>
      <div className="buttons">
        <button 
          onClick={downloadAsText}
          disabled={isGenerating}
        >
          Download as Text
        </button>
        <button 
          onClick={downloadAsHTML}
          disabled={isGenerating}
        >
          Download as HTML
        </button>
      </div>
    </div>
  );
}

export default DownloadOptions;

6.10 CSS Styles

Create a frontend/src/styles/index.css file:

css


:root {
  --primary-color: #4a6fa5;
  --primary-dark: #345888;
  --secondary-color: #6b8cae;
  --accent-color: #ff6b6b;
  --text-color: #333;
  --light-text: #666;
  --background-color: #f9f9f9;
  --card-background: #fff;
  --border-color: #e0e0e0;
  --success-color: #4caf50;
  --warning-color: #ff9800;
  --error-color: #f44336;
  --shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background-color: var(--background-color);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

main.container {
  padding-top: 30px;
  padding-bottom: 50px;
}

h1, h2, h3, h4, h5, h6 {
  margin-bottom: 15px;
  line-height: 1.2;
}

a {
  color: var(--primary-color);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

button {
  cursor: pointer;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 20px;
  font-size: 16px;
  transition: background-color 0.2s;
}

button:hover {
  background-color: var(--primary-dark);
}

button:disabled {
  background-color: var(--light-text);
  cursor: not-allowed;
}

.error-message {
  color: var(--error-color);
  background-color: rgba(244, 67, 54, 0.1);
  border: 1px solid var(--error-color);
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 20px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 50px 0;
}

.loading-spinner {
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: var(--primary-color);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-container {
  text-align: center;
  padding: 40px 20px;
  max-width: 600px;
  margin: 0 auto;
}

.error-container h2 {
  color: var(--error-color);
  margin-bottom: 20px;
}

.error-container button {
  margin-top: 20px;
}

.completion-container {
  text-align: center;
  padding: 40px 20px;
  max-width: 600px;
  margin: 0 auto;
  background-color: var(--card-background);
  border-radius: 8px;
  box-shadow: var(--shadow);
}

.completion-container h2 {
  color: var(--success-color);
  margin-bottom: 20px;
}

.completion-container button {
  margin-top: 20px;
  background-color: var(--success-color);
}

.completion-container button:hover {
  background-color: #3d8b40;
}

@media (max-width: 768px) {
  h1 {
    font-size: 24px;
  }
  
  h2 {
    font-size: 20px;
  }
  
  button {
    padding: 8px 16px;
    font-size: 14px;
  }
}

Create additional CSS files for each component (Header.css, NovelGenerationForm.css, etc.) with appropriate styles.

Part 7: Railway Configuration

7.1 Railway.json Configuration

Create a `railway.json` file in the project root:

```json
{
  "schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build && cd backend && npm install"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 10,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

7.2 Build Process

Railway automatically executes this build sequence:

1. **Frontend Build**: Runs `npm run build` which:
   - Installs frontend dependencies (`cd frontend && npm install`)
   - Builds React app with Vite (`npm run build`)
   - Copies built files to `backend/public/` directory

2. **Backend Setup**: Runs `cd backend && npm install` to install backend dependencies

3. **Deployment**: Starts the Express server with `npm start`, which serves both the API and built frontend

Part 8: Railway Deployment Instructions

8.1 Setting Up MongoDB Atlas

**Create a MongoDB Atlas Account:**
- Go to [MongoDB Atlas](https://www.mongodb.com/atlas) and sign up
- Create a new project
- Click "Build a Database" and choose the free tier (M0)
- Select your preferred cloud provider and region

**Configure Security:**
- In Security → Database Access, create a database user with a secure password
- In Security → Network Access, add `0.0.0.0/0` to allow access from anywhere
- Get your connection string from "Connect" → "Connect your application"

**Connection String Format:**
```
mongodb+srv://username:password@cluster.mongodb.net/letswriteabook?retryWrites=true&w=majority
```

8.2 Deploying to Railway

**Create Railway Account:**
- Go to [Railway](https://railway.app/) and sign up
- Connect your GitHub account

**Deploy Your Application:**

1. **Connect Repository:**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your `letswriteabook` repository
   - Choose the main branch

2. **Configure Environment Variables:**
   Go to your project → Variables tab and add:
   ```
   NODE_ENV=production
   PORT=3000
   OPENAI_API_KEY=your-openai-api-key
   MONGODB_URI=your-mongodb-atlas-connection-string
   MAX_CONCURRENT_JOBS=3
   COST_ALERT_THRESHOLD=25.00
   ENABLE_COST_TRACKING=true
   ENABLE_QUALITY_METRICS=true
   ```

3. **Deploy:**
   - Railway automatically detects the Node.js project
   - It runs the build process defined in `railway.json`
   - Deployment completes and provides a URL like `https://your-app.railway.app`

**Verify Deployment:**
- Visit your Railway URL
- Test the health endpoint: `https://your-app.railway.app/health`
- Try generating a novel through the web interface

Part 9: Testing Your Railway Deployment

### 9.1 Automated Testing

Test your Railway deployment with these commands:

**Health Check:**
```bash
curl https://your-app.railway.app/health
```
Expected: `{"status":"ok","timestamp":"2025-07-19T12:00:00.000Z"}`

**Novel Generation API:**
```bash
curl -X POST https://your-app.railway.app/api/novel/generate \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Test Novel",
    "genre":"SCIENCE_FICTION",
    "subgenre":"SPACE_OPERA",
    "premise":"A test premise for a space opera novel.",
    "targetWordCount":30000,
    "targetChapters":10
  }'
```
Expected: `{"message":"Novel generation started","jobId":"..."}`

**Job Status Check:**
```bash
curl https://your-app.railway.app/api/novel/status/YOUR_JOB_ID
```

### 9.2 Frontend Testing

1. **Form Submission:**
   - Visit your Railway URL
   - Fill out the novel generation form
   - Submit and verify redirect to progress page

2. **WebSocket Connection:**
   - Generate a novel
   - Verify real-time progress updates appear
   - Check that phases update correctly (Planning → Outlining → Writing)

3. **Novel Preview:**
   - After generation completes, view the novel
   - Test chapter navigation
   - Try download options (TXT and HTML)

### 9.3 Performance Testing

Monitor your application through Railway's dashboard:
- **Response Times**: Should be under 2 seconds for API calls
- **Memory Usage**: Typically 200-500MB depending on concurrent jobs
- **WebSocket Stability**: Connections should remain stable during generation

Part 10: Conclusion - Railway Deployment Success

The Somers Novel Generator is now fully deployed on Railway as a unified application. This Railway-focused implementation provides:

**Single-Platform Deployment**: Everything runs on Railway - no need for multiple services or CORS configuration.

**Simplified Architecture**: Frontend and backend served from the same URL, eliminating deployment complexity.

**Dual-Model AI Approach**: GPT-4o-mini for planning and GPT-4o for prose generation optimizes both cost and quality.

**Robust Error Handling**: Comprehensive error handling for API failures, rate limits, and deployment issues.

**Automatic Recovery**: Job recovery mechanism ensures that stalled generations can be resumed automatically.

**Real-Time Updates**: WebSocket integration provides real-time progress updates to users.

**Cost Optimization**: Built-in cost tracking and optimization using appropriate models for each task.

**Genre-Specific Generation**: Comprehensive genre instructions ensure generated novels adhere to genre conventions.

**Production-Ready Scalability**: Railway's infrastructure handles scaling automatically as your user base grows.

**Zero-Configuration Deployment**: Railway automatically detects, builds, and deploys your application with minimal configuration.

By following this Railway-focused implementation guide, you have created a production-ready application that leverages AI for novel generation with proper error handling, recovery mechanisms, real-time updates, and simplified deployment - all from a single platform.

**Your application is now live at: `https://your-app.railway.app`**

---

## Contributing

We welcome contributions! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Guidelines

1. **Fork the repository**
2. **Create a feature branch:** `git checkout -b feature/amazing-feature`
3. **Make your changes** and test thoroughly
4. **Follow the existing code style** and formatting
5. **Add tests** for new functionality
6. **Commit your changes:** `git commit -m 'Add some amazing feature'`
7. **Push to the branch:** `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Testing

Run tests before submitting:

```bash
# Backend tests
cd backend && npm test

# Frontend tests (if available)
cd frontend && npm test
```

---

## Performance Considerations

- **Novel Generation Time:** Typical 50k word novel takes 15-30 minutes
- **Concurrent Jobs:** Limit based on your OpenAI rate limits
- **Memory Usage:** Each active generation job uses ~100-200MB RAM
- **Database Storage:** ~1-2MB per completed novel
- **API Costs:** Approximately $0.50-$2.00 per 50k word novel (varies by complexity)

---

## Acknowledgements

- [OpenAI](https://openai.com/) - For providing the AI models
- [MongoDB Atlas](https://www.mongodb.com/atlas) - For database hosting  
- [Railway](https://railway.app/) - For unified deployment platform
- [React](https://reactjs.org/) - Frontend framework
- [Express.js](https://expressjs.com/) - Backend framework
- [Socket.IO](https://socket.io/) - Real-time communication
- [Vite](https://vitejs.dev/) - Frontend build tool

---
