// Admin Routes with Server-Side Validation
// Provides secure admin endpoints with proper role verification

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

const { requireAdmin, requireSuperAdmin, logAdminAction } = require('../middleware/adminAuth');
const { logSecurityEvent } = require('../config/security');
const { User, Appointment, ContactMessage } = require('../models');

/**
 * Admin Login Endpoint
 * POST /api/admin/login
 */
router.post('/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 1 })
], async (req, res) => {
    try {
        // Validate input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            logSecurityEvent('admin_login_validation_failed', {
                errors: errors.array(),
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            logSecurityEvent('admin_login_failed', {
                reason: 'user_not_found',
                email: email,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        // Check if user is admin
        if (user.role !== 'admin') {
            logSecurityEvent('admin_login_failed', {
                reason: 'not_admin',
                userId: user.id,
                userRole: user.role,
                email: email,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            return res.status(403).json({
                error: 'Access denied',
                message: 'Administrator privileges required'
            });
        }

        // Check if admin account is active
        if (!user.isActive) {
            logSecurityEvent('admin_login_failed', {
                reason: 'account_disabled',
                userId: user.id,
                email: email,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            return res.status(403).json({
                error: 'Account disabled',
                message: 'Your administrator account has been disabled'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            logSecurityEvent('admin_login_failed', {
                reason: 'invalid_password',
                userId: user.id,
                email: email,
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect'
            });
        }

        // Create admin session
        req.session.userId = user.id;
        req.session.userRole = user.role;
        req.session.lastAccess = Date.now();

        // Update user's last login
        await user.update({
            lastVisit: new Date()
        });

        logSecurityEvent('admin_login_success', {
            userId: user.id,
            email: user.email,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: 'Admin login successful',
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Admin login error:', error);
        
        logSecurityEvent('admin_login_error', {
            error: error.message,
            stack: error.stack,
            ip: req.ip
        });
        
        res.status(500).json({
            error: 'Login failed',
            message: 'An error occurred during login'
        });
    }
});

/**
 * Admin Dashboard Data
 * GET /api/admin/dashboard
 */
router.get('/dashboard', requireAdmin, logAdminAction('dashboard_access'), async (req, res) => {
    try {
        // Get dashboard statistics
        const stats = await Promise.all([
            User.count(),
            User.count({ where: { role: 'admin' } }),
            Appointment.count(),
            Appointment.count({ where: { status: 'pending' } }),
            Appointment.count({ where: { status: 'confirmed' } }),
            ContactMessage.count({ where: { status: 'unread' } })
        ]);

        const dashboardData = {
            totalUsers: stats[0],
            totalAdmins: stats[1],
            totalAppointments: stats[2],
            pendingAppointments: stats[3],
            confirmedAppointments: stats[4],
            unreadMessages: stats[5],
            lastUpdated: new Date().toISOString()
        };

        res.json({
            success: true,
            data: dashboardData
        });

    } catch (error) {
        console.error('Dashboard data error:', error);
        res.status(500).json({
            error: 'Failed to load dashboard',
            message: 'An error occurred while loading dashboard data'
        });
    }
});

/**
 * Get All Users (Admin)
 * GET /api/admin/users
 */
router.get('/users', requireAdmin, logAdminAction('users_view'), async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'phone', 'role', 'isActive', 'createdAt', 'lastVisit'],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            users: users
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            error: 'Failed to fetch users',
            message: 'An error occurred while fetching users'
        });
    }
});

/**
 * Update User Status (Admin)
 * PUT /api/admin/users/:id/status
 */
router.put('/users/:id/status', [
    requireAdmin,
    logAdminAction('user_status_update'),
    body('isActive').isBoolean()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { id } = req.params;
        const { isActive } = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        // Prevent deactivating the last admin
        if (user.role === 'admin' && !isActive) {
            const adminCount = await User.count({ where: { role: 'admin', isActive: true } });
            if (adminCount <= 1) {
                return res.status(400).json({
                    error: 'Cannot deactivate last admin',
                    message: 'At least one admin must remain active'
                });
            }
        }

        await user.update({ isActive });

        logSecurityEvent('user_status_changed', {
            targetUserId: user.id,
            targetUserEmail: user.email,
            newStatus: isActive,
            adminUserId: req.adminUser.id,
            adminUserEmail: req.adminUser.email
        });

        res.json({
            success: true,
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
        });

    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({
            error: 'Failed to update user status',
            message: 'An error occurred while updating user status'
        });
    }
});

/**
 * Get All Appointments (Admin)
 * GET /api/admin/appointments
 */
router.get('/appointments', requireAdmin, logAdminAction('appointments_view'), async (req, res) => {
    try {
        const appointments = await Appointment.findAll({
            include: [
                {
                    model: User,
                    attributes: ['id', 'name', 'email', 'phone']
                }
            ],
            order: [['appointmentDate', 'DESC'], ['startTime', 'DESC']]
        });

        res.json({
            success: true,
            appointments: appointments
        });

    } catch (error) {
        console.error('Get appointments error:', error);
        res.status(500).json({
            error: 'Failed to fetch appointments',
            message: 'An error occurred while fetching appointments'
        });
    }
});

/**
 * Update Appointment Status (Admin)
 * PUT /api/admin/appointments/:id/status
 */
router.put('/appointments/:id/status', [
    requireAdmin,
    logAdminAction('appointment_status_update'),
    body('status').isIn(['pending', 'confirmed', 'completed', 'cancelled', 'no-show'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { id } = req.params;
        const { status } = req.body;

        const appointment = await Appointment.findByPk(id, {
            include: [{ model: User, attributes: ['name', 'email'] }]
        });

        if (!appointment) {
            return res.status(404).json({
                error: 'Appointment not found'
            });
        }

        await appointment.update({ status });

        logSecurityEvent('appointment_status_changed', {
            appointmentId: appointment.id,
            previousStatus: appointment.status,
            newStatus: status,
            customerEmail: appointment.User.email,
            adminUserId: req.adminUser.id,
            adminUserEmail: req.adminUser.email
        });

        res.json({
            success: true,
            message: `Appointment status updated to ${status}`
        });

    } catch (error) {
        console.error('Update appointment status error:', error);
        res.status(500).json({
            error: 'Failed to update appointment status',
            message: 'An error occurred while updating appointment status'
        });
    }
});

/**
 * Admin Logout
 * POST /api/admin/logout
 */
router.post('/logout', requireAdmin, logAdminAction('logout'), (req, res) => {
    const userId = req.adminUser.id;
    const userEmail = req.adminUser.email;
    
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destroy error:', err);
            return res.status(500).json({
                error: 'Logout failed',
                message: 'An error occurred during logout'
            });
        }

        logSecurityEvent('admin_logout', {
            userId: userId,
            userEmail: userEmail,
            ip: req.ip
        });

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    });
});

/**
 * Verify Admin Session
 * GET /api/admin/verify
 */
router.get('/verify', requireAdmin, (req, res) => {
    res.json({
        success: true,
        user: req.adminUser,
        message: 'Admin session verified'
    });
});

/**
 * Security Log Access (Super Admin)
 * GET /api/admin/security-logs
 */
router.get('/security-logs', requireSuperAdmin, logAdminAction('security_logs_access'), (req, res) => {
    // In a production environment, you would fetch logs from a proper logging service
    // For now, return a message about where logs are stored
    res.json({
        success: true,
        message: 'Security logs are stored in server console and security monitoring service',
        note: 'Implement proper log aggregation service for production'
    });
});

module.exports = router;