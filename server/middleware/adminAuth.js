// Admin Authentication and Authorization Middleware
// Provides server-side admin role verification and protection

const { logSecurityEvent } = require('../config/security');

/**
 * Middleware to verify admin role on server-side
 * This replaces client-side admin checking for security
 */
const requireAdmin = async (req, res, next) => {
    try {
        // Check if user is authenticated
        if (!req.session || !req.session.userId) {
            logSecurityEvent('admin_access_denied', {
                reason: 'no_session',
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path
            });
            
            return res.status(401).json({
                error: 'Authentication required',
                message: 'You must be logged in to access this resource'
            });
        }

        // Get user from database to verify current role
        const { User } = require('../models');
        const user = await User.findByPk(req.session.userId);

        if (!user) {
            logSecurityEvent('admin_access_denied', {
                reason: 'user_not_found',
                userId: req.session.userId,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path
            });
            
            // Invalid session - user doesn't exist
            req.session.destroy();
            return res.status(401).json({
                error: 'Invalid session',
                message: 'Your session is invalid. Please log in again.'
            });
        }

        // Verify admin role
        if (user.role !== 'admin') {
            logSecurityEvent('admin_access_denied', {
                reason: 'insufficient_privileges',
                userId: user.id,
                userRole: user.role,
                userEmail: user.email,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path
            });
            
            return res.status(403).json({
                error: 'Access denied',
                message: 'Administrator privileges required'
            });
        }

        // Check if admin user is active
        if (!user.isActive) {
            logSecurityEvent('admin_access_denied', {
                reason: 'inactive_admin',
                userId: user.id,
                userEmail: user.email,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path
            });
            
            return res.status(403).json({
                error: 'Account disabled',
                message: 'Your administrator account has been disabled'
            });
        }

        // Log successful admin access
        logSecurityEvent('admin_access_granted', {
            userId: user.id,
            userEmail: user.email,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path,
            method: req.method
        });

        // Add user info to request for use in route handlers
        req.adminUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        };

        next();
    } catch (error) {
        console.error('Admin authentication error:', error);
        
        logSecurityEvent('admin_auth_error', {
            error: error.message,
            stack: error.stack,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path
        });
        
        res.status(500).json({
            error: 'Authentication error',
            message: 'An error occurred during authentication'
        });
    }
};

/**
 * Middleware to verify super admin role (for critical operations)
 */
const requireSuperAdmin = async (req, res, next) => {
    try {
        // First check if user is admin
        await new Promise((resolve, reject) => {
            requireAdmin(req, res, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Additional super admin checks could go here
        // For now, all admins are considered super admins
        // In the future, you could add a separate superAdmin field

        logSecurityEvent('super_admin_access', {
            userId: req.adminUser.id,
            userEmail: req.adminUser.email,
            ip: req.ip,
            path: req.path,
            method: req.method
        });

        next();
    } catch (error) {
        // Error already handled by requireAdmin
        return;
    }
};

/**
 * Middleware to log admin actions for auditing
 */
const logAdminAction = (action) => {
    return (req, res, next) => {
        // Store original send function
        const originalSend = res.send;
        
        // Override send to capture response
        res.send = function(data) {
            // Log the admin action
            logSecurityEvent('admin_action', {
                action: action,
                userId: req.adminUser?.id,
                userEmail: req.adminUser?.email,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path,
                method: req.method,
                requestBody: req.method === 'POST' || req.method === 'PUT' ? req.body : undefined,
                responseStatus: res.statusCode,
                timestamp: new Date().toISOString()
            });
            
            // Call original send
            originalSend.call(this, data);
        };
        
        next();
    };
};

/**
 * Middleware to validate admin session and refresh if needed
 */
const validateAdminSession = async (req, res, next) => {
    try {
        if (!req.session || !req.session.userId) {
            return next();
        }

        // Check if session is about to expire
        const sessionAge = Date.now() - (req.session.lastAccess || 0);
        const sessionTimeout = 30 * 60 * 1000; // 30 minutes

        if (sessionAge > sessionTimeout) {
            logSecurityEvent('admin_session_expired', {
                userId: req.session.userId,
                sessionAge: sessionAge,
                ip: req.ip
            });
            
            req.session.destroy();
            return res.status(401).json({
                error: 'Session expired',
                message: 'Your session has expired. Please log in again.'
            });
        }

        // Update last access time
        req.session.lastAccess = Date.now();
        next();
    } catch (error) {
        console.error('Session validation error:', error);
        next();
    }
};

/**
 * Create initial admin user if none exists
 */
const ensureAdminExists = async () => {
    try {
        const { User } = require('../models');
        const bcrypt = require('bcryptjs');
        
        // Check if any admin users exist
        const adminCount = await User.count({
            where: { role: 'admin' }
        });

        if (adminCount === 0) {
            console.log('⚠️ No admin users found. Creating default admin...');
            
            // Create default admin with secure password
            const defaultAdminPassword = process.env.ADMIN_SETUP_TOKEN || 'admin123';
            const hashedPassword = await bcrypt.hash(defaultAdminPassword, 12);
            
            const adminUser = await User.create({
                name: 'Administrator',
                email: 'admin@considerrestoration.com',
                phone: '5551234567',
                password: hashedPassword,
                role: 'admin',
                isActive: true,
                emailVerified: true
            });

            console.log('✅ Default admin user created');
            console.log(`📧 Email: admin@considerrestoration.com`);
            console.log(`🔑 Password: ${defaultAdminPassword}`);
            console.log('⚠️ IMPORTANT: Change the default password immediately!');
            
            logSecurityEvent('admin_user_created', {
                adminId: adminUser.id,
                email: adminUser.email,
                createdBy: 'system'
            });
        }
    } catch (error) {
        console.error('Error ensuring admin exists:', error);
    }
};

module.exports = {
    requireAdmin,
    requireSuperAdmin,
    logAdminAction,
    validateAdminSession,
    ensureAdminExists
};