const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
// Rate limiting removed
const morgan = require('morgan');
const session = require('express-session');
const SequelizeStore = require('connect-session-sequelize')(session.Store);
require('dotenv').config();

const { sequelize } = require('./models');
const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const userRoutes = require('./routes/users');
const paymentRoutes = require('./routes/payments');
const contactRoutes = require('./routes/contact');
const waitlistRoutes = require('./routes/waitlist');
const analyticsRoutes = require('./routes/analytics');
const healthRoutes = require('./routes/health');
const reminderService = require('./services/reminderService');

const app = express();
const PORT = process.env.PORT || 3050;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "https://js.stripe.com", "https://www.googletagmanager.com"],
            connectSrc: ["'self'", "https://api.stripe.com"],
            frameSrc: ["https://js.stripe.com"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// All rate limiting code removed

// Middleware
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests from specific origins or no origin (for mobile apps, etc.)
        const allowedOrigins = [
            'http://localhost:3050',
            'http://localhost:3050',
            'https://considerrestoration.com',
            'https://www.considerrestoration.com',
            process.env.FRONTEND_URL
        ].filter(Boolean); // Remove undefined/null values
        
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // In development, allow all origins
            if (process.env.NODE_ENV === 'development') {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    },
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
const sessionStore = new SequelizeStore({
    db: sequelize,
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-super-secret-session-key-consider-restoration-2024',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Static files
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/auth', authRoutes);
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
        
        app.listen(PORT, () => {
            console.log(`✅ Server running on port ${PORT}`);
            console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/health`);
            
            // Start the appointment reminder service
            reminderService.start();
        });
    } catch (error) {
        console.error('Failed to start server:', error);
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