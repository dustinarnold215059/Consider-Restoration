const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
require('dotenv').config();

// Import security configuration
const { getSecurityConfig, isSecure, logSecurityEvent } = require('./config/security');
const { ensureAdminExists, validateAdminSession } = require('./middleware/adminAuth');

const { sequelize } = require('./models');
const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const userRoutes = require('./routes/users');
const paymentRoutes = require('./routes/payments');
const contactRoutes = require('./routes/contact');
const waitlistRoutes = require('./routes/waitlist');
const analyticsRoutes = require('./routes/analytics');
const healthRoutes = require('./routes/health');
const adminRoutes = require('./routes/admin');
const reminderService = require('./services/reminderService');

const app = express();
const PORT = process.env.PORT || 3050;

// Get security configuration
const securityConfig = getSecurityConfig();

// Log startup security status
console.log(`🔒 Starting server in ${process.env.NODE_ENV || 'development'} mode`);
console.log(`🔒 Secure environment: ${isSecure() ? 'YES' : 'NO'}`);
logSecurityEvent('server_startup', {
    environment: process.env.NODE_ENV || 'development',
    secure: isSecure(),
    port: PORT
});

// Security middleware
app.use(helmet(securityConfig.helmet));

// Rate limiting middleware
const generalLimiter = rateLimit(securityConfig.rateLimit);
const authLimiter = rateLimit(securityConfig.authRateLimit);

app.use(generalLimiter);

// Middleware
app.use(compression());
app.use(morgan('combined'));
app.use(cors(securityConfig.cors));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
const sessionStore = new SequelizeStore({
    db: sequelize,
});

app.use(session({
    ...securityConfig.session,
    store: sessionStore
}));

// Admin session validation middleware
app.use(validateAdminSession);

// Static files
app.use('/uploads', express.static('uploads'));

// API Routes with rate limiting
app.use('/api/auth', authLimiter, authRoutes); // Stricter rate limiting for auth
app.use('/api/admin', authLimiter, adminRoutes); // Secure admin routes with rate limiting
app.use('/api/appointments', appointmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check routes (no /api prefix for monitoring tools)
app.use('/health', healthRoutes);

// Reminder service endpoints (admin only)
app.post('/api/reminders/trigger', async (req, res) => {
    try {
        await reminderService.triggerReminderCheck();
        res.json({ 
            success: true, 
            message: 'Reminder check triggered successfully' 
        });
    } catch (error) {
        console.error('Failed to trigger reminder check:', error);
        res.status(500).json({ 
            error: 'Failed to trigger reminder check',
            details: error.message 
        });
    }
});

app.get('/api/reminders/status', (req, res) => {
    const status = reminderService.getStatus();
    res.json(status);
});

// Serve static website files
app.use(express.static('../'));

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error);
    
    if (error.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            details: error.details
        });
    }
    
    if (error.name === 'UnauthorizedError') {
        return res.status(401).json({
            error: 'Unauthorized'
        });
    }
    
    res.status(500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : error.message
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Database connection and server startup
async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.');
        
        // Sync database (use { force: true } only in development to reset DB)
        await sequelize.sync({ alter: true });
        console.log('Database synchronized.');
        
        // Create session store table
        sessionStore.sync();
        
        // Ensure at least one admin user exists
        await ensureAdminExists();
        
        app.listen(PORT, () => {
            console.log(`✅ Server running on port ${PORT}`);
            console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/health`);
            
            // Log security status
            logSecurityEvent('server_ready', {
                port: PORT,
                environment: process.env.NODE_ENV,
                secure: isSecure()
            });
            
            // Start the appointment reminder service
            reminderService.start();
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        logSecurityEvent('server_startup_failed', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
}

// Global error handlers
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
    });
    
    // Give the application time to finish any pending operations
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Application specific logging, throwing an error, or other logic here
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    try {
        reminderService.stop();
        await sequelize.close();
        console.log('Database connections closed.');
    } catch (error) {
        console.error('Error during graceful shutdown:', error);
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    try {
        reminderService.stop();
        await sequelize.close();
        console.log('Database connections closed.');
    } catch (error) {
        console.error('Error during graceful shutdown:', error);
    }
    process.exit(0);
});

startServer();

module.exports = app;