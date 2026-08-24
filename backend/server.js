import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import axios from 'axios';
import connectDB, { getDBStatus } from './config/db.js';
import authRoutes from './routes/auth.js';
import tasksRoutes from './routes/tasks.js';
import contactsRoutes from './routes/contacts.js';
import whatsappRoutes from './routes/whatsapp.js';
import settingsRoutes from './routes/settings.js';

// Get the directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file explicitly from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });
console.log('📁 Loading .env from:', path.join(__dirname, '.env'));

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration - allow both local and production
const allowedOrigins = [
  // Local development
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  // Production server IP & subpaths
  'https://160.187.169.41',
  'http://160.187.169.41',
  // Production - Netlify & Render
  'https://tasktracker4297.netlify.app',
  'https://tasktracker-4xm2.onrender.com',
  // Custom domains
  'https://krishnalavu.com',
  'https://www.krishnalvu.com',
  'https://krishnalvu.com',
  'https://www.krishnalavu.com',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: true, // Allow all origins in production or check allowedOrigins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'adminPin', 'admin-pin']
}));

// Log allowed origins for debugging
console.log('✅ CORS enabled for origins:', allowedOrigins);

// Static file serving configuration for uploads
const staticUploadOptions = {
  maxAge: '7d',  // Cache for 7 days
  etag: true,    // Enable ETag for file versioning
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    if (path.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) res.setHeader('Content-Type', 'image/jpeg');
    if (path.endsWith('.gif')) res.setHeader('Content-Type', 'image/gif');
    if (path.endsWith('.webp')) res.setHeader('Content-Type', 'image/webp');
  }
};

const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

app.use('/megha/uploads', express.static(uploadsPath, staticUploadOptions));
app.use('/uploads', express.static(uploadsPath, staticUploadOptions));

// Connect to MongoDB
connectDB();

// Create Router for /megha path
const meghaRouter = express.Router();

// Mount API routes under /megha/api
meghaRouter.use('/api/auth', authRoutes);
meghaRouter.use('/api/tasks', tasksRoutes);
meghaRouter.use('/api/contacts', contactsRoutes);
meghaRouter.use('/api/whatsapp', whatsappRoutes);
meghaRouter.use('/api/settings', settingsRoutes);

// Also mount routes under /megha directly
meghaRouter.use('/auth', authRoutes);
meghaRouter.use('/tasks', tasksRoutes);
meghaRouter.use('/contacts', contactsRoutes);
meghaRouter.use('/whatsapp', whatsappRoutes);
meghaRouter.use('/settings', settingsRoutes);

// Health check under /megha/health and /megha/api/health
const handleHealthCheck = (req, res) => {
  const dbStatus = getDBStatus();
  res.json({ 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    status: dbStatus.connected ? 'ONLINE' : 'OFFLINE'
  });
};

meghaRouter.get('/health', handleHealthCheck);
meghaRouter.get('/api/health', handleHealthCheck);

// Root API under /megha
meghaRouter.get('/', (req, res) => {
  res.json({
    message: '✅ Backend is running successfully at /megha!',
    status: 'active',
    version: '1.0.0',
    database: 'MongoDB Connected',
    endpoints: {
      tasks: '/megha/api/tasks',
      contacts: '/megha/api/contacts',
      whatsapp: '/megha/api/whatsapp',
      health: '/megha/api/health',
      auth: '/megha/api/auth/login'
    }
  });
});

meghaRouter.get('/api', (req, res) => {
  res.json({
    message: '✅ Backend is running successfully at /megha/api!',
    status: 'active',
    version: '1.0.0',
    database: 'MongoDB Connected',
    endpoints: {
      tasks: '/megha/api/tasks',
      contacts: '/megha/api/contacts',
      whatsapp: '/megha/api/whatsapp',
      health: '/megha/api/health',
      auth: '/megha/api/auth/login'
    }
  });
});

// Mount /megha router on app
app.use('/megha', meghaRouter);

// Also keep legacy /api routes for backward compatibility
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/contacts', contactsRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/settings', settingsRoutes);
app.get('/api/health', handleHealthCheck);
app.get('/api', (req, res) => {
  res.json({
    message: '✅ Backend is running successfully!',
    status: 'active',
    version: '1.0.0',
    database: 'MongoDB Connected',
  });
});

// Root endpoint (HTML fallback)
app.get('/', (req, res) => {
  if (fs.existsSync(frontendDistPath)) {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  } else {
    res.json({
      message: '✅ Backend is running successfully!',
      status: 'active',
      version: '1.0.0',
      database: 'MongoDB Atlas Connected'
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  const dbStatus = getDBStatus();
  res.json({ 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    status: dbStatus.connected ? 'ONLINE' : 'OFFLINE'
  });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  const { pin } = req.body;
  const expectedPin = (process.env.ADMIN_PIN || '1234').trim();
  const receivedPin = String(pin || '').trim();
  
  console.log('Login attempt - Expected PIN:', expectedPin, 'Received PIN:', receivedPin);

  if (receivedPin === expectedPin) {
    res.json({
      success: true,
      message: 'Login successful',
      token: 'admin-token',
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid PIN',
    });
  }
});

// Centralized Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ [Global Error Handler]:', err.stack || err);
  
  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map(val => val.message)
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate value entered for field, please choose another value'
    });
  }

  // Mongoose bad object id
  if (err.name === 'CastError') {
    return res.status(404).json({
      success: false,
      message: `Resource not found with id of ${err.value}`
    });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected server error occurred.',
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });
});

const PORT = process.env.PORT || 9000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Keep-alive: Ping the server every 14 minutes to prevent Render sleep
  if (process.env.NODE_ENV === 'production') {
    const keepAliveInterval = 14 * 60 * 1000; // 14 minutes
    setInterval(async () => {
      try {
        // Ping the health endpoint
        const baseURL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
        await axios.get(`${baseURL}/api/health`, { timeout: 5000 });
        console.log('✅ Keep-alive ping sent successfully');
      } catch (error) {
        console.log('⚠️  Keep-alive ping failed (optional):', error.message);
      }
    }, keepAliveInterval);
    console.log('⏰ Keep-alive ping scheduled every 14 minutes');
  }
});
