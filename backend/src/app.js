require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const batchRoutes = require('./routes/batches');
const userRoutes = require('./routes/users');
const teamRoutes = require('./routes/teams');
const dailyUpdateRoutes = require('./routes/dailyUpdates');
const reviewRoutes = require('./routes/reviews');
const announcementRoutes = require('./routes/announcements');
const paperRoutes = require('./routes/papers');
const followupRoutes = require('./routes/followups');
const holidayRoutes = require('./routes/holidays');
const dashboardRoutes = require('./routes/dashboard');
const reportRoutes = require('./routes/reports');
const auditRoutes = require('./routes/audit');
const notificationRoutes = require('./routes/notifications');
const cronRoutes = require('./routes/cron');

const app = express();

// Security
app.use(helmet());

// CORS
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(u => u.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(allowed => origin === allowed || origin.endsWith('.vercel.app'))) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/daily-updates', dailyUpdateRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/cron', cronRoutes);

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Error handler
app.use(errorHandler);

module.exports = app;
