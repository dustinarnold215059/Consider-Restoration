const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { User, Appointment, Payment, GiftCertificate } = require('../models');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });

    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Update user profile
router.put('/profile', authenticateToken, [
    body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('email').optional().isEmail().withMessage('Valid email required'),
    body('phone').optional().matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Valid phone number required'),
    body('preferences').optional().isLength({ max: 500 }).withMessage('Preferences must be under 500 characters'),
    body('address').optional().isLength({ max: 200 }).withMessage('Address must be under 200 characters'),
    body('emergencyContact').optional().isLength({ max: 200 }).withMessage('Emergency contact must be under 200 characters'),
    body('medicalConditions').optional().isLength({ max: 1000 }).withMessage('Medical conditions must be under 1000 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const {
            name,
            email,
            phone,
            preferences,
            address,
            emergencyContact,
            medicalConditions,
            communicationPreferences
        } = req.body;

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if email is already taken by another user
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (phone !== undefined) updateData.phone = phone;
        if (preferences !== undefined) updateData.preferences = preferences;
        if (address !== undefined) updateData.address = address;
        if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;
        if (medicalConditions !== undefined) updateData.medicalConditions = medicalConditions;
        if (communicationPreferences !== undefined) updateData.communicationPreferences = communicationPreferences;

        await user.update(updateData);

        // Return updated user without sensitive data
        const updatedUser = await User.findByPk(user.id, {
            attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] }
        });

        res.json({
            message: 'Profile updated successfully',
            user: updatedUser
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Change password
router.put('/change-password', authenticateToken, [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.newPassword) {
            throw new Error('Password confirmation does not match');
        }
        return true;
    })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ error: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 12);

        await user.update({ password: hashedNewPassword });

        res.json({ message: 'Password changed successfully' });

    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
});

// Get user dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] }
        });

        // Get upcoming appointments
        const upcomingAppointments = await Appointment.findAll({
            where: {
                userId: req.user.id,
                appointmentDate: {
                    [require('sequelize').Op.gte]: new Date()
                },
                status: ['confirmed', 'pending']
            },
            include: [{ model: require('../models').Service, as: 'service' }],
            order: [['appointmentDate', 'ASC'], ['startTime', 'ASC']],
            limit: 5
        });

        // Get recent payments
        const recentPayments = await Payment.findAll({
            where: { userId: req.user.id },
            include: [{
                model: Appointment,
                as: 'appointment',
                include: [{ model: require('../models').Service, as: 'service' }]
            }],
            order: [['createdAt', 'DESC']],
            limit: 5
        });

        // Get gift certificates
        const giftCertificates = await GiftCertificate.findAll({
            where: {
                [require('sequelize').Op.or]: [
                    { purchasedBy: req.user.id },
                    { recipientEmail: user.email }
                ]
            },
            order: [['createdAt', 'DESC']]
        });

        // Calculate statistics
        const totalAppointments = await Appointment.count({
            where: { userId: req.user.id, status: 'completed' }
        });

        const totalSpent = await Payment.sum('amount', {
            where: { userId: req.user.id, status: 'completed' }
        });

        res.json({
            user,
            upcomingAppointments,
            recentPayments,
            giftCertificates,
            statistics: {
                totalAppointments: totalAppointments || 0,
                totalSpent: totalSpent || 0,
                membershipSessionsRemaining: user.membershipSessionsRemaining || 0,
                membershipType: user.membershipType,
                membershipStatus: user.membershipStatus
            }
        });

    } catch (error) {
        console.error('Dashboard fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// Admin: Get all users
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            search,
            membershipType,
            membershipStatus,
            role 
        } = req.query;
        
        const offset = (page - 1) * limit;
        const where = {};

        if (search) {
            where[require('sequelize').Op.or] = [
                { name: { [require('sequelize').Op.iLike]: `%${search}%` } },
                { email: { [require('sequelize').Op.iLike]: `%${search}%` } }
            ];
        }

        if (membershipType) where.membershipType = membershipType;
        if (membershipStatus) where.membershipStatus = membershipStatus;
        if (role) where.role = role;

        const { rows: users, count } = await User.findAndCountAll({
            where,
            attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] },
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            users,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Admin users fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Admin: Get user details
router.get('/admin/:userId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findByPk(userId, {
            attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get user's appointments
        const appointments = await Appointment.findAll({
            where: { userId },
            include: [{ model: require('../models').Service, as: 'service' }],
            order: [['appointmentDate', 'DESC']]
        });

        // Get user's payments
        const payments = await Payment.findAll({
            where: { userId },
            include: [{
                model: Appointment,
                as: 'appointment',
                include: [{ model: require('../models').Service, as: 'service' }]
            }],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            user,
            appointments,
            payments
        });

    } catch (error) {
        console.error('Admin user details error:', error);
        res.status(500).json({ error: 'Failed to fetch user details' });
    }
});

// Admin: Update user
router.put('/admin/:userId', authenticateToken, requireAdmin, [
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('email').optional().isEmail(),
    body('role').optional().isIn(['user', 'admin']),
    body('membershipType').optional().isIn(['none', 'wellness', 'restoration-plus', 'therapeutic-elite']),
    body('membershipStatus').optional().isIn(['active', 'paused', 'cancelled']),
    body('membershipSessionsRemaining').optional().isInt({ min: 0 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { userId } = req.params;
        const updateData = req.body;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if email is already taken by another user
        if (updateData.email && updateData.email !== user.email) {
            const existingUser = await User.findOne({ 
                where: { 
                    email: updateData.email,
                    id: { [require('sequelize').Op.ne]: userId }
                }
            });
            if (existingUser) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }

        await user.update(updateData);

        const updatedUser = await User.findByPk(userId, {
            attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] }
        });

        res.json({
            message: 'User updated successfully',
            user: updatedUser
        });

    } catch (error) {
        console.error('Admin user update error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Admin: Toggle user active status
router.put('/admin/:userId/toggle-active', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await user.update({ isActive: !user.isActive });

        res.json({
            message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
            isActive: user.isActive
        });

    } catch (error) {
        console.error('User toggle active error:', error);
        res.status(500).json({ error: 'Failed to toggle user status' });
    }
});

// Admin: Get user statistics
router.get('/admin/statistics', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const totalUsers = await User.count();
        const activeUsers = await User.count({ where: { isActive: true } });
        
        const membershipStats = await User.findAll({
            attributes: [
                'membershipType',
                [require('sequelize').fn('COUNT', '*'), 'count']
            ],
            group: ['membershipType'],
            raw: true
        });

        const newUsersThisMonth = await User.count({
            where: {
                createdAt: {
                    [require('sequelize').Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
            }
        });

        res.json({
            totalUsers,
            activeUsers,
            inactiveUsers: totalUsers - activeUsers,
            newUsersThisMonth,
            membershipBreakdown: membershipStats.reduce((acc, stat) => {
                acc[stat.membershipType] = parseInt(stat.count);
                return acc;
            }, {})
        });

    } catch (error) {
        console.error('User statistics error:', error);
        res.status(500).json({ error: 'Failed to fetch user statistics' });
    }
});

module.exports = router;