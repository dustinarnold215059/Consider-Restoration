const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Middleware to authenticate JWT tokens
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ 
                error: 'Access token required',
                code: 'NO_TOKEN'
            });
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database to ensure they still exist and are active
        const user = await User.findByPk(decoded.id, {
            attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] }
        });

        if (!user) {
            return res.status(401).json({ 
                error: 'Invalid token - user not found',
                code: 'USER_NOT_FOUND'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({ 
                error: 'Account is deactivated',
                code: 'ACCOUNT_DEACTIVATED'
            });
        }

        // Add user to request object
        req.user = user;
        next();

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                error: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }

        console.error('Authentication middleware error:', error);
        return res.status(500).json({ 
            error: 'Authentication failed',
            code: 'AUTH_ERROR'
        });
    }
};

// Middleware to require admin role
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            error: 'Authentication required',
            code: 'NO_AUTH'
        });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            error: 'Admin access required',
            code: 'INSUFFICIENT_PERMISSIONS'
        });
    }

    next();
};

// Middleware to check if user owns resource or is admin
const requireOwnershipOrAdmin = (resourceIdParam = 'id', userIdField = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Authentication required',
                code: 'NO_AUTH'
            });
        }

        // Admin can access any resource
        if (req.user.role === 'admin') {
            return next();
        }

        // Check if user owns the resource
        const resourceId = req.params[resourceIdParam];
        const userId = req.body[userIdField] || req.query[userIdField];

        if (userId && userId !== req.user.id) {
            return res.status(403).json({ 
                error: 'Access denied - not resource owner',
                code: 'NOT_OWNER'
            });
        }

        next();
    };
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            req.user = null;
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id, {
            attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] }
        });

        if (user && user.isActive) {
            req.user = user;
        } else {
            req.user = null;
        }

        next();

    } catch (error) {
        // If token is invalid, just continue without user
        req.user = null;
        next();
    }
};

// Middleware to validate membership status
const requireActiveMembership = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            error: 'Authentication required',
            code: 'NO_AUTH'
        });
    }

    if (req.user.membershipType === 'none' || req.user.membershipStatus !== 'active') {
        return res.status(403).json({ 
            error: 'Active membership required',
            code: 'NO_ACTIVE_MEMBERSHIP'
        });
    }

    next();
};


// Middleware to validate API key (for external integrations)
const validateApiKey = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'];
        
        if (!apiKey) {
            return res.status(401).json({ 
                error: 'API key required',
                code: 'NO_API_KEY'
            });
        }

        // In a real implementation, you'd store API keys in the database
        // For now, we'll use an environment variable
        if (apiKey !== process.env.API_KEY) {
            return res.status(401).json({ 
                error: 'Invalid API key',
                code: 'INVALID_API_KEY'
            });
        }

        next();

    } catch (error) {
        console.error('API key validation error:', error);
        res.status(500).json({ 
            error: 'API key validation failed',
            code: 'API_KEY_ERROR'
        });
    }
};

// Middleware to check if user email is verified
const requireEmailVerification = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            error: 'Authentication required',
            code: 'NO_AUTH'
        });
    }

    if (!req.user.emailVerified) {
        return res.status(403).json({ 
            error: 'Email verification required',
            code: 'EMAIL_NOT_VERIFIED'
        });
    }

    next();
};

// Middleware to log API requests (for analytics)
const logApiRequest = (req, res, next) => {
    const startTime = Date.now();
    
    // Log request
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
    
    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });

    next();
};

// Middleware to handle CORS preflight requests
const handleCors = (req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
    res.header('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
};

module.exports = {
    authenticateToken,
    requireAdmin,
    requireOwnershipOrAdmin,
    optionalAuth,
    requireActiveMembership,
    validateApiKey,
    requireEmailVerification,
    logApiRequest,
    handleCors
};