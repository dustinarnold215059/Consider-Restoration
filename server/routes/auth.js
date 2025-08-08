const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { sendEmail } = require('../services/emailService');
const crypto = require('crypto');
const router = express.Router();

// Validation middleware
const registerValidation = [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('phone').matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Please provide a valid phone number'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

const loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
];

// Register new user
router.post('/register', registerValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { name, email, phone, password, preferences } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                error: 'User already exists with this email'
            });
        }

        // Generate email verification token
        const emailVerificationToken = crypto.randomBytes(32).toString('hex');

        // Create user
        const user = await User.create({
            name,
            email,
            phone,
            password,
            preferences: preferences || '',
            emailVerificationToken
        });

        // Generate JWT token
        const token = user.generateAuthToken();

        // Send verification email
        try {
            await sendEmail({
                to: email,
                subject: 'Welcome to Consider Restoration - Verify Your Email',
                template: 'welcome',
                data: {
                    name,
                    verificationToken: emailVerificationToken,
                    verificationUrl: `${process.env.FRONTEND_URL}/verify-email?token=${emailVerificationToken}`
                }
            });
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't fail registration if email fails
        }

        res.status(201).json({
            message: 'User registered successfully',
            user: user.toJSON(),
            token
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Failed to register user'
        });
    }
});

// Login user
router.post('/login', loginValidation, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { email, password } = req.body;

        // Find user
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                error: 'Account is deactivated. Please contact support.'
            });
        }

        // Validate password
        const isValidPassword = await user.validatePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = user.generateAuthToken();

        // Update last login
        await user.update({ lastVisit: new Date() });

        res.json({
            message: 'Login successful',
            user: user.toJSON(),
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Failed to login'
        });
    }
});

// Verify email
router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                error: 'Verification token is required'
            });
        }

        const user = await User.findOne({
            where: { emailVerificationToken: token }
        });

        if (!user) {
            return res.status(400).json({
                error: 'Invalid or expired verification token'
            });
        }

        await user.update({
            emailVerified: true,
            emailVerificationToken: null
        });

        res.json({
            message: 'Email verified successfully'
        });

    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({
            error: 'Failed to verify email'
        });
    }
});

// Request password reset
router.post('/forgot-password', [
    body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { email } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            // Don't reveal if email exists or not
            return res.json({
                message: 'If the email exists, a password reset link has been sent'
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date();
        resetExpires.setHours(resetExpires.getHours() + 1); // 1 hour expiry

        await user.update({
            passwordResetToken: resetToken,
            passwordResetExpires: resetExpires
        });

        // Send reset email
        try {
            await sendEmail({
                to: email,
                subject: 'Password Reset - Consider Restoration',
                template: 'password-reset',
                data: {
                    name: user.name,
                    resetToken,
                    resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
                }
            });
        } catch (emailError) {
            console.error('Failed to send password reset email:', emailError);
        }

        res.json({
            message: 'If the email exists, a password reset link has been sent'
        });

    } catch (error) {
        console.error('Password reset request error:', error);
        res.status(500).json({
            error: 'Failed to process password reset request'
        });
    }
});

// Reset password
router.post('/reset-password', [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { token, password } = req.body;

        const user = await User.findOne({
            where: {
                passwordResetToken: token,
                passwordResetExpires: {
                    [require('sequelize').Op.gt]: new Date()
                }
            }
        });

        if (!user) {
            return res.status(400).json({
                error: 'Invalid or expired reset token'
            });
        }

        await user.update({
            password,
            passwordResetToken: null,
            passwordResetExpires: null
        });

        res.json({
            message: 'Password reset successfully'
        });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({
            error: 'Failed to reset password'
        });
    }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [
                { model: require('../models').Appointment, as: 'appointments' },
                { model: require('../models').Payment, as: 'payments' }
            ]
        });

        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        res.json({
            user: user.toJSON()
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch profile'
        });
    }
});

// Update user profile
router.put('/profile', authenticateToken, [
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('phone').optional().matches(/^[\+]?[1-9][\d]{0,15}$/),
    body('preferences').optional().isString()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        const updateData = {};
        ['name', 'phone', 'preferences', 'dateOfBirth', 'emergencyContact', 'medicalNotes', 'marketingOptIn', 'reminderPreferences'].forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        await user.update(updateData);

        res.json({
            message: 'Profile updated successfully',
            user: user.toJSON()
        });

    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            error: 'Failed to update profile'
        });
    }
});

// Change password
router.post('/change-password', authenticateToken, [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
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
            return res.status(404).json({
                error: 'User not found'
            });
        }

        const isValidPassword = await user.validatePassword(currentPassword);
        if (!isValidPassword) {
            return res.status(400).json({
                error: 'Current password is incorrect'
            });
        }

        await user.update({ password: newPassword });

        res.json({
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({
            error: 'Failed to change password'
        });
    }
});

// Admin: Get all users
router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, search, role } = req.query;
        const offset = (page - 1) * limit;

        const where = {};
        if (search) {
            where[require('sequelize').Op.or] = [
                { name: { [require('sequelize').Op.iLike]: `%${search}%` } },
                { email: { [require('sequelize').Op.iLike]: `%${search}%` } }
            ];
        }
        if (role) {
            where.role = role;
        }

        const { rows: users, count } = await User.findAndCountAll({
            where,
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });

        res.json({
            users: users.map(user => user.toJSON()),
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Admin users fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch users'
        });
    }
});

// Logout (clear token client-side)
router.post('/logout', (req, res) => {
    res.json({
        message: 'Logged out successfully'
    });
});

module.exports = router;