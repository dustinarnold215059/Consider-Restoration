// Enhanced Email Integration Service
// Provides template-based email sending with fallback support

class EmailService {
    constructor() {
        this.initialized = false;
        this.templates = new Map();
        this.queue = [];
        this.retryAttempts = 3;
        this.retryDelay = 5000; // 5 seconds
        this.apiEndpoint = '/api/email';
    }

    async initialize() {
        if (this.initialized) return;

        console.log('📧 Initializing Email Service...');
        
        try {
            await this.loadEmailTemplates();
            this.setupQueueProcessor();
            this.initialized = true;
            console.log('✅ Email Service initialized successfully');
        } catch (error) {
            console.error('❌ Email Service initialization failed:', error);
        }
    }

    async loadEmailTemplates() {
        // Load email templates for different types of notifications
        this.templates.set('appointment_confirmation', {
            subject: 'Appointment Confirmation - Christopher\'s Massage Therapy',
            template: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #3A7D99; color: white; padding: 20px; text-align: center;">
                        <h1>Christopher's Massage Therapy</h1>
                        <p>Appointment Confirmation</p>
                    </div>
                    <div style="padding: 20px; background: #f9f9f9;">
                        <h2>Hello {{clientName}},</h2>
                        <p>Your massage appointment has been confirmed! Here are the details:</p>
                        
                        <div style="background: white; padding: 15px; border-left: 4px solid #3A7D99; margin: 20px 0;">
                            <p><strong>Service:</strong> {{serviceName}}</p>
                            <p><strong>Date:</strong> {{appointmentDate}}</p>
                            <p><strong>Time:</strong> {{appointmentTime}}</p>
                            <p><strong>Duration:</strong> {{duration}} minutes</p>
                            <p><strong>Price:</strong> ${{price}}</p>
                        </div>

                        <h3>What to Expect:</h3>
                        <ul>
                            <li>Please arrive 10 minutes before your appointment</li>
                            <li>Comfortable clothing is recommended</li>
                            <li>Let us know about any health conditions or concerns</li>
                            <li>Payment can be made by cash, card, or through our online system</li>
                        </ul>

                        <h3>Location:</h3>
                        <p>Christopher's Massage Therapy<br>
                        Livonia, MI<br>
                        Phone: (248) 123-4567</p>

                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                            <p>Need to reschedule? <a href="{{portalLink}}" style="color: #3A7D99;">Manage your appointments online</a></p>
                            <p>Questions? Reply to this email or call us at (248) 123-4567</p>
                        </div>
                    </div>
                    <div style="background: #333; color: white; padding: 15px; text-align: center; font-size: 14px;">
                        <p>Thank you for choosing Christopher's Massage Therapy</p>
                        <p>Because Pain Shouldn't Be Your Normal</p>
                    </div>
                </div>
            `
        });

        this.templates.set('appointment_reminder', {
            subject: 'Appointment Reminder - Tomorrow at {{appointmentTime}}',
            template: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #3A7D99; color: white; padding: 20px; text-align: center;">
                        <h1>Appointment Reminder</h1>
                    </div>
                    <div style="padding: 20px; background: #f9f9f9;">
                        <h2>Hi {{clientName}},</h2>
                        <p>This is a friendly reminder about your massage appointment tomorrow:</p>
                        
                        <div style="background: white; padding: 15px; border-left: 4px solid #ff9800; margin: 20px 0;">
                            <p><strong>Service:</strong> {{serviceName}}</p>
                            <p><strong>Date:</strong> {{appointmentDate}}</p>
                            <p><strong>Time:</strong> {{appointmentTime}}</p>
                        </div>

                        <p>We're looking forward to seeing you! Please remember to arrive 10 minutes early.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{{portalLink}}" style="background: #3A7D99; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">View Appointment Details</a>
                        </div>
                    </div>
                </div>
            `
        });

        this.templates.set('appointment_cancelled', {
            subject: 'Appointment Cancelled - Christopher\'s Massage Therapy',
            template: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #d32f2f; color: white; padding: 20px; text-align: center;">
                        <h1>Appointment Cancelled</h1>
                    </div>
                    <div style="padding: 20px; background: #f9f9f9;">
                        <h2>Hello {{clientName}},</h2>
                        <p>Your massage appointment has been cancelled:</p>
                        
                        <div style="background: white; padding: 15px; border-left: 4px solid #d32f2f; margin: 20px 0;">
                            <p><strong>Service:</strong> {{serviceName}}</p>
                            <p><strong>Date:</strong> {{appointmentDate}}</p>
                            <p><strong>Time:</strong> {{appointmentTime}}</p>
                        </div>

                        {{#refundAmount}}
                        <p>A refund of ${{refundAmount}} has been processed and will appear in your account within 5-7 business days.</p>
                        {{/refundAmount}}

                        <p>We apologize for any inconvenience. We'd love to reschedule your appointment:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{{bookingLink}}" style="background: #3A7D99; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Book New Appointment</a>
                        </div>
                    </div>
                </div>
            `
        });

        this.templates.set('welcome_email', {
            subject: 'Welcome to Christopher\'s Massage Therapy!',
            template: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #3A7D99; color: white; padding: 20px; text-align: center;">
                        <h1>Welcome!</h1>
                        <p>Christopher's Massage Therapy</p>
                    </div>
                    <div style="padding: 20px; background: #f9f9f9;">
                        <h2>Welcome, {{clientName}}!</h2>
                        <p>Thank you for creating your account with Christopher's Massage Therapy. We're excited to help you on your journey to better health and wellness.</p>
                        
                        <h3>What You Can Do:</h3>
                        <ul>
                            <li>Book appointments online 24/7</li>
                            <li>View your appointment history</li>
                            <li>Manage your preferences</li>
                            <li>Access exclusive member benefits</li>
                        </ul>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{{portalLink}}" style="background: #3A7D99; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Access Your Portal</a>
                        </div>

                        <h3>Our Services:</h3>
                        <ul>
                            <li><strong>Swedish Massage</strong> - Relaxing full-body treatment</li>
                            <li><strong>Deep Tissue Massage</strong> - Therapeutic muscle work</li>
                            <li><strong>Applied Neurology</strong> - Specialized pain management</li>
                            <li><strong>Prenatal Massage</strong> - Safe treatment for expecting mothers</li>
                        </ul>
                    </div>
                </div>
            `
        });

        this.templates.set('password_reset', {
            subject: 'Password Reset Request - Christopher\'s Massage Therapy',
            template: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #3A7D99; color: white; padding: 20px; text-align: center;">
                        <h1>Password Reset</h1>
                    </div>
                    <div style="padding: 20px; background: #f9f9f9;">
                        <h2>Password Reset Request</h2>
                        <p>Hello {{clientName}},</p>
                        <p>We received a request to reset your password. Click the button below to create a new password:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{{resetLink}}" style="background: #3A7D99; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Reset Password</a>
                        </div>

                        <p><strong>This link will expire in 1 hour.</strong></p>
                        
                        <p>If you didn't request this password reset, please ignore this email or contact us if you have concerns.</p>
                        
                        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 5px;">
                            <p><strong>Security Tip:</strong> Never share your password with anyone. Christopher's Massage Therapy will never ask for your password via email.</p>
                        </div>
                    </div>
                </div>
            `
        });

        this.templates.set('review_request', {
            subject: 'How was your massage? Share your experience!',
            template: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #3A7D99; color: white; padding: 20px; text-align: center;">
                        <h1>How Was Your Visit?</h1>
                    </div>
                    <div style="padding: 20px; background: #f9f9f9;">
                        <h2>Hi {{clientName}},</h2>
                        <p>Thank you for visiting Christopher's Massage Therapy! We hope you enjoyed your {{serviceName}} session.</p>
                        
                        <p>Your feedback helps us provide the best possible service. Would you mind taking a moment to share your experience?</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{{reviewLink}}" style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Leave a Review</a>
                        </div>

                        <p>We'd also love to see you again soon! Book your next appointment:</p>
                        
                        <div style="text-align: center; margin: 20px 0;">
                            <a href="{{bookingLink}}" style="background: #3A7D99; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px;">Book Next Visit</a>
                        </div>
                    </div>
                </div>
            `
        });

        console.log('📧 Email templates loaded:', this.templates.size);
    }

    setupQueueProcessor() {
        // Process email queue every 30 seconds
        setInterval(() => {
            this.processQueue();
        }, 30000);
    }

    async processQueue() {
        if (this.queue.length === 0) return;

        console.log(`📧 Processing email queue: ${this.queue.length} emails`);

        const emailsToProcess = [...this.queue];
        this.queue = [];

        for (const emailData of emailsToProcess) {
            try {
                await this.sendEmailDirect(emailData);
                console.log(`✅ Email sent successfully to ${emailData.to}`);
            } catch (error) {
                console.error(`❌ Failed to send email to ${emailData.to}:`, error);
                
                // Retry logic
                if (emailData.retries < this.retryAttempts) {
                    emailData.retries++;
                    setTimeout(() => {
                        this.queue.push(emailData);
                    }, this.retryDelay * emailData.retries);
                }
            }
        }
    }

    async sendEmail(templateName, recipientEmail, data, options = {}) {
        if (!this.initialized) {
            console.warn('Email service not initialized, queueing email');
        }

        const emailData = {
            templateName,
            to: recipientEmail,
            data: data || {},
            options,
            retries: 0,
            timestamp: Date.now()
        };

        // Add to queue for processing
        this.queue.push(emailData);
        
        // If high priority, process immediately
        if (options.priority === 'high') {
            setTimeout(() => this.processQueue(), 100);
        }

        return { success: true, queued: true };
    }

    async sendEmailDirect(emailData) {
        const { templateName, to, data, options } = emailData;
        
        if (!this.templates.has(templateName)) {
            throw new Error(`Template '${templateName}' not found`);
        }

        const template = this.templates.get(templateName);
        const compiledHtml = this.compileTemplate(template.template, data);
        const compiledSubject = this.compileTemplate(template.subject, data);

        const payload = {
            to,
            subject: compiledSubject,
            html: compiledHtml,
            ...options
        };

        // Try to send via server API first
        if (window.apiClient && window.apiClient.token) {
            try {
                const response = await window.apiClient.sendEmail(payload);
                return response;
            } catch (error) {
                console.warn('Server email API failed, trying fallback');
            }
        }

        // Fallback to direct API call
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    compileTemplate(template, data) {
        let compiled = template;
        
        // Simple template compilation - replace {{variable}} with data values
        Object.entries(data).forEach(([key, value]) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            compiled = compiled.replace(regex, value || '');
        });

        // Handle conditional blocks {{#variable}} content {{/variable}}
        compiled = compiled.replace(/{{#(\w+)}}([\s\S]*?){{\/\1}}/g, (match, key, content) => {
            return data[key] ? content : '';
        });

        // Clean up any remaining template variables
        compiled = compiled.replace(/{{[^}]+}}/g, '');

        return compiled;
    }

    // Convenience methods for common email types
    async sendAppointmentConfirmation(clientEmail, appointmentData) {
        return this.sendEmail('appointment_confirmation', clientEmail, {
            clientName: appointmentData.clientName,
            serviceName: appointmentData.service,
            appointmentDate: new Date(appointmentData.date).toLocaleDateString(),
            appointmentTime: appointmentData.time,
            duration: appointmentData.duration || 60,
            price: appointmentData.price || 0,
            portalLink: `${window.location.origin}/user-portal.html`
        }, { priority: 'high' });
    }

    async sendAppointmentReminder(clientEmail, appointmentData) {
        return this.sendEmail('appointment_reminder', clientEmail, {
            clientName: appointmentData.clientName,
            serviceName: appointmentData.service,
            appointmentDate: new Date(appointmentData.date).toLocaleDateString(),
            appointmentTime: appointmentData.time,
            portalLink: `${window.location.origin}/user-portal.html`
        });
    }

    async sendWelcomeEmail(clientEmail, userData) {
        return this.sendEmail('welcome_email', clientEmail, {
            clientName: userData.name || 'Valued Client',
            portalLink: `${window.location.origin}/user-portal.html`
        });
    }

    async sendPasswordReset(clientEmail, userData, resetToken) {
        return this.sendEmail('password_reset', clientEmail, {
            clientName: userData.name || 'User',
            resetLink: `${window.location.origin}/reset-password.html?token=${resetToken}`
        }, { priority: 'high' });
    }

    async sendReviewRequest(clientEmail, appointmentData) {
        return this.sendEmail('review_request', clientEmail, {
            clientName: appointmentData.clientName,
            serviceName: appointmentData.service,
            reviewLink: `${window.location.origin}/user-portal.html#reviews`,
            bookingLink: `${window.location.origin}/booking.html`
        });
    }

    async sendCancellationNotice(clientEmail, appointmentData) {
        return this.sendEmail('appointment_cancelled', clientEmail, {
            clientName: appointmentData.clientName,
            serviceName: appointmentData.service,
            appointmentDate: new Date(appointmentData.date).toLocaleDateString(),
            appointmentTime: appointmentData.time,
            refundAmount: appointmentData.refundAmount,
            bookingLink: `${window.location.origin}/booking.html`
        }, { priority: 'high' });
    }

    // Bulk email functionality for marketing/newsletters
    async sendBulkEmail(templateName, recipients, data, options = {}) {
        console.log(`📧 Sending bulk email to ${recipients.length} recipients`);
        
        const results = {
            sent: 0,
            failed: 0,
            errors: []
        };

        for (const recipient of recipients) {
            try {
                await this.sendEmail(templateName, recipient.email, {
                    ...data,
                    clientName: recipient.name || 'Valued Client'
                }, options);
                results.sent++;
            } catch (error) {
                results.failed++;
                results.errors.push({
                    email: recipient.email,
                    error: error.message
                });
            }
        }

        return results;
    }

    // Get email queue status
    getQueueStatus() {
        return {
            queueLength: this.queue.length,
            initialized: this.initialized,
            templatesLoaded: this.templates.size
        };
    }

    // Clear email queue (for admin use)
    clearQueue() {
        this.queue = [];
        console.log('📧 Email queue cleared');
    }

    destroy() {
        this.initialized = false;
        this.queue = [];
        this.templates.clear();
    }
}

// Create global instance
window.EmailService = new EmailService();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.EmailService.initialize();
    });
} else {
    window.EmailService.initialize();
}

// Export for ES6 modules
export { EmailService };