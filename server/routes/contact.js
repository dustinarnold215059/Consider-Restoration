const express = require('express');
const { body, validationResult } = require('express-validator');
// Rate limiting removed
const { sendEmail } = require('../services/emailService');
const { ContactMessage } = require('../models');
const router = express.Router();

// All rate limiting code removed

// Validation rules for contact form
const validateContactForm = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    
    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    
    body('phone')
        .optional()
        .trim()
        .matches(/^[\d\s\-\(\)\+\.]+$/)
        .withMessage('Please provide a valid phone number'),
    
    body('subject')
        .trim()
        .notEmpty()
        .withMessage('Subject is required')
        .isIn(['appointment', 'services', 'membership', 'gift-certificate', 'other'])
        .withMessage('Please select a valid subject'),
    
    body('message')
        .trim()
        .notEmpty()
        .withMessage('Message is required')
        .isLength({ min: 10, max: 2000 })
        .withMessage('Message must be between 10 and 2000 characters')
];

// Contact form submission endpoint
router.post('/submit', validateContactForm, async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Please check your form data',
                errors: errors.array()
            });
        }

        const { name, email, phone, subject, message } = req.body;
        
        // Save message to database
        const contactMessage = await ContactMessage.create({
            name,
            email,
            phone: phone || null,
            subject,
            message,
            ipAddress: req.ip || req.connection.remoteAddress
        });
        
        // Subject mapping for better email subjects
        const subjectMap = {
            'appointment': 'Appointment Question',
            'services': 'Services Information Request',
            'membership': 'Membership Program Inquiry',
            'gift-certificate': 'Gift Certificate Inquiry',
            'other': 'General Inquiry'
        };

        // Prepare email content
        const emailSubject = `New Contact Form: ${subjectMap[subject]} - ${name}`;
        
        const adminEmailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #3A7D99; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
                    .field { margin: 15px 0; }
                    .field strong { color: #2c3e50; }
                    .message-box { background: white; padding: 20px; border-left: 4px solid #3A7D99; margin: 20px 0; }
                    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>📬 New Contact Form Submission</h2>
                        <p>Consider Restoration Website</p>
                    </div>
                    <div class="content">
                        <div class="field">
                            <strong>Name:</strong> ${name}
                        </div>
                        <div class="field">
                            <strong>Email:</strong> <a href="mailto:${email}">${email}</a>
                        </div>
                        ${phone ? `<div class="field"><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></div>` : ''}
                        <div class="field">
                            <strong>Subject:</strong> ${subjectMap[subject]}
                        </div>
                        <div class="field">
                            <strong>Submitted:</strong> ${new Date().toLocaleString('en-US', { 
                                timeZone: 'America/Detroit',
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </div>
                        
                        <div class="message-box">
                            <strong>Message:</strong><br><br>
                            ${message.replace(/\n/g, '<br>')}
                        </div>
                        
                        <div style="margin-top: 30px;">
                            <p><strong>Quick Actions:</strong></p>
                            <a href="mailto:${email}?subject=Re: Your message to Consider Restoration" 
                               style="background: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">
                               Reply via Email
                            </a>
                            ${phone ? `<a href="tel:${phone}" style="background: #3A7D99; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Call ${name}</a>` : ''}
                        </div>
                    </div>
                    <div class="footer">
                        <p>This message was sent through the Consider Restoration contact form.</p>
                        <p>To manage contact form settings, visit your admin panel.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        // Try to send email to admin (considerrestoration@gmail.com)
        try {
            await sendEmail({
                to: process.env.ADMIN_EMAIL || 'considerrestoration@gmail.com',
                subject: emailSubject,
                html: adminEmailHtml
            });
        } catch (emailError) {
            console.log('Email sending failed (continuing anyway):', emailError.message);
        }

        // Try to send auto-reply to customer
        const customerReplyHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #3A7D99; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
                    .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>✅ Message Received</h2>
                        <p>Consider Restoration</p>
                    </div>
                    <div class="content">
                        <h3>Hello ${name}!</h3>
                        
                        <p>Thank you for contacting Consider Restoration. We have received your message and will respond within 24 hours during business hours.</p>
                        
                        <p><strong>Your message details:</strong></p>
                        <ul>
                            <li><strong>Subject:</strong> ${subjectMap[subject]}</li>
                            <li><strong>Submitted:</strong> ${new Date().toLocaleString('en-US', { timeZone: 'America/Detroit' })}</li>
                        </ul>
                        
                        <p>If you have an urgent question or need immediate assistance, please call us directly at <strong><a href="tel:7344194116">(734) 419-4116</a></strong>.</p>
                        
                        <hr style="border: 1px solid #ddd; margin: 20px 0;">
                        
                        <h3>📍 Visit Us</h3>
                        <p><strong>Consider Restoration</strong><br>
                        32788 Five Mile Rd<br>
                        Livonia, MI 48152<br>
                        Phone: <a href="tel:7344194116">(734) 419-4116</a></p>
                        
                        <h3>🕐 Hours</h3>
                        <p>Monday - Friday: 9:00 AM - 7:00 PM<br>
                        Saturday: 9:00 AM - 4:00 PM<br>
                        Sunday: Closed</p>
                        
                        <p>We look forward to helping you with your wellness journey!</p>
                        
                        <p>Best regards,<br>
                        <strong>Christopher Rembisz, LMT</strong><br>
                        Consider Restoration</p>
                    </div>
                    <div class="footer">
                        <p>Consider Restoration | 32788 Five Mile Rd, Livonia, MI 48152</p>
                        <p><em>"Because Pain Shouldn't Be Your Normal"</em></p>
                    </div>
                </div>
            </body>
            </html>
        `;

        // Try to send auto-reply to customer
        try {
            await sendEmail({
                to: email,
                subject: 'Thank you for contacting Consider Restoration',
                html: customerReplyHtml
            });
        } catch (emailError) {
            console.log('Customer auto-reply failed (continuing anyway):', emailError.message);
        }

        // Log the submission for admin tracking
        console.log(`New contact form submission from ${name} (${email}) - Subject: ${subjectMap[subject]}`);

        res.json({
            success: true,
            message: 'Your message has been sent successfully! We\'ll get back to you within 24 hours.'
        });

    } catch (error) {
        console.error('Contact form submission error:', error);
        
        res.status(500).json({
            success: false,
            message: 'Sorry, there was an error sending your message. Please try again or call us at (734) 419-4116.'
        });
    }
});

// Get all contact messages (for admin panel)
router.get('/messages', async (req, res) => {
    try {
        const messages = await ContactMessage.findAll({
            order: [['createdAt', 'DESC']]
        });
        
        res.json({
            success: true,
            messages: messages
        });
    } catch (error) {
        console.error('Error fetching contact messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch messages'
        });
    }
});

// Delete a contact message (for admin panel)
router.delete('/messages/:id', async (req, res) => {
    try {
        const messageId = req.params.id;
        const deleted = await ContactMessage.destroy({
            where: { id: messageId }
        });
        
        if (deleted) {
            res.json({
                success: true,
                message: 'Message deleted successfully'
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Message not found'
            });
        }
    } catch (error) {
        console.error('Error deleting contact message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete message'
        });
    }
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({ status: 'Contact form service is running' });
});

module.exports = router;