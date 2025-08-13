// Optimized Email Automation System
// Non-blocking, performance-focused email automation with graceful degradation
console.log('📧 Loading Optimized Email Automation...');

class OptimizedEmailAutomation {
    constructor() {
        this.initialized = false;
        this.isEnabled = true;
        this.scheduledEmails = new Map();
        this.automationRules = new Map();
        this.processingQueue = false;
        this.maxQueueSize = 100;
        this.batchSize = 5; // Process max 5 emails at once
        
        // Performance monitoring
        this.stats = {
            emailsSent: 0,
            emailsFailed: 0,
            averageProcessingTime: 0,
            lastProcessedAt: null
        };
        
        console.log('📧 OptimizedEmailAutomation created');
    }

    async initialize() {
        if (this.initialized) {
            console.log('📧 Email automation already initialized');
            return;
        }

        console.log('📧 Initializing Optimized Email Automation...');
        
        try {
            // Non-blocking initialization
            this.setupAutomationRules();
            this.setupEventListeners();
            this.startOptimizedScheduler();
            
            this.initialized = true;
            console.log('✅ Optimized Email Automation initialized successfully');
            
            // Test email service availability (non-blocking)
            this.testEmailServiceAvailability();
            
        } catch (error) {
            console.error('❌ Email Automation initialization failed:', error);
            this.isEnabled = false; // Gracefully disable if initialization fails
        }
    }

    async testEmailServiceAvailability() {
        try {
            // Quick non-blocking test
            const timeout = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 2000)
            );
            
            const serviceCheck = new Promise((resolve) => {
                if (window.EmailService && window.EmailService.initialized) {
                    resolve(true);
                } else {
                    // Give it a moment to load
                    setTimeout(() => {
                        resolve(window.EmailService && window.EmailService.initialized);
                    }, 500);
                }
            });

            const isAvailable = await Promise.race([serviceCheck, timeout]);
            
            if (!isAvailable) {
                console.log('📧 EmailService not available - automation disabled');
                this.isEnabled = false;
            } else {
                console.log('📧 EmailService available - automation enabled');
                this.isEnabled = true;
            }
        } catch (error) {
            console.log('📧 Email service test failed - running in disabled mode');
            this.isEnabled = false;
        }
    }

    setupAutomationRules() {
        // Lightweight automation rules without heavy dependencies
        this.automationRules.set('appointment_booked', {
            trigger: 'appointment_created',
            delay: 0, // Immediate
            emailType: 'appointment_confirmation',
            enabled: true
        });

        this.automationRules.set('appointment_reminder', {
            trigger: 'appointment_scheduled',
            delay: 24 * 60 * 60 * 1000, // 24 hours before
            emailType: 'appointment_reminder',
            enabled: true
        });

        this.automationRules.set('welcome_series', {
            trigger: 'user_registered',
            delay: 60 * 1000, // 1 minute after registration
            emailType: 'welcome_email',
            enabled: true
        });

        console.log('📧 Automation rules configured:', this.automationRules.size);
    }

    setupEventListeners() {
        // Lightweight event listeners without blocking operations
        const events = [
            'appointment_created',
            'appointment_updated', 
            'appointment_cancelled',
            'user_registered',
            'payment_completed'
        ];

        events.forEach(eventType => {
            window.addEventListener(eventType, (event) => {
                // Non-blocking event processing
                setImmediate(() => this.handleEvent(eventType, event.detail));
            });
        });

        console.log('📧 Event listeners setup for', events.length, 'events');
    }

    handleEvent(eventType, eventData) {
        if (!this.isEnabled || !this.initialized) {
            return; // Silently skip if disabled
        }

        try {
            // Find matching automation rules
            for (const [ruleId, rule] of this.automationRules) {
                if (rule.trigger === eventType && rule.enabled) {
                    this.scheduleEmail(ruleId, rule, eventData);
                }
            }
        } catch (error) {
            console.warn('📧 Event handling error (non-critical):', error);
            // Don't let email errors break the main application
        }
    }

    scheduleEmail(ruleId, rule, eventData) {
        if (!this.isEnabled) return;

        try {
            const emailId = `${ruleId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const scheduleTime = Date.now() + (rule.delay || 0);

            // Limit queue size to prevent memory issues
            if (this.scheduledEmails.size >= this.maxQueueSize) {
                console.warn('📧 Email queue full, dropping oldest emails');
                this.cleanupOldEmails(true); // Force cleanup
            }

            const emailData = {
                ruleId,
                emailType: rule.emailType,
                eventData,
                scheduleTime,
                createdAt: Date.now(),
                attempts: 0,
                maxAttempts: 3
            };

            this.scheduledEmails.set(emailId, emailData);
            console.log(`📧 Email scheduled: ${rule.emailType} for ${new Date(scheduleTime).toLocaleString()}`);

        } catch (error) {
            console.warn('📧 Email scheduling error (non-critical):', error);
        }
    }

    startOptimizedScheduler() {
        // Use efficient scheduling instead of continuous polling
        const scheduleNextRun = () => {
            const nextRunTime = this.getNextScheduledTime();
            const delay = nextRunTime ? Math.min(nextRunTime - Date.now(), 60000) : 60000;
            
            setTimeout(() => {
                this.processPendingEmailsBatch();
                scheduleNextRun(); // Schedule next run
            }, Math.max(delay, 5000)); // Minimum 5 second delay
        };

        // Start the scheduler
        scheduleNextRun();

        // Cleanup scheduler (less frequent)
        setInterval(() => {
            this.cleanupOldEmails();
        }, 10 * 60 * 1000); // Every 10 minutes

        console.log('📧 Optimized scheduler started');
    }

    getNextScheduledTime() {
        let nextTime = null;
        for (const emailData of this.scheduledEmails.values()) {
            if (!nextTime || emailData.scheduleTime < nextTime) {
                nextTime = emailData.scheduleTime;
            }
        }
        return nextTime;
    }

    async processPendingEmailsBatch() {
        if (!this.isEnabled || this.processingQueue) {
            return; // Skip if disabled or already processing
        }

        this.processingQueue = true;
        const startTime = Date.now();

        try {
            const now = Date.now();
            const pendingEmails = [];

            // Find emails that need to be sent (limited batch)
            for (const [emailId, emailData] of this.scheduledEmails) {
                if (emailData.scheduleTime <= now && pendingEmails.length < this.batchSize) {
                    pendingEmails.push({ emailId, ...emailData });
                }
            }

            if (pendingEmails.length === 0) {
                return;
            }

            console.log(`📧 Processing batch of ${pendingEmails.length} emails`);

            // Process emails concurrently but with limited concurrency
            const emailPromises = pendingEmails.map(email => 
                this.processEmail(email).catch(error => {
                    console.warn(`📧 Email ${email.emailId} failed:`, error);
                    return { success: false, emailId: email.emailId, error };
                })
            );

            const results = await Promise.allSettled(emailPromises);
            
            // Update stats
            this.updateStats(results, startTime);

            // Remove processed emails from queue
            pendingEmails.forEach(email => {
                this.scheduledEmails.delete(email.emailId);
            });

        } catch (error) {
            console.error('📧 Batch processing error (non-critical):', error);
        } finally {
            this.processingQueue = false;
        }
    }

    async processEmail(emailData) {
        if (!this.isEnabled) {
            throw new Error('Email automation disabled');
        }

        const { emailId, emailType, eventData } = emailData;

        try {
            // Check if EmailService is available before attempting to send
            if (!window.EmailService || !window.EmailService.initialized) {
                throw new Error('EmailService not available');
            }

            // Generate email content based on type
            const emailContent = this.generateEmailContent(emailType, eventData);
            
            if (!emailContent) {
                throw new Error(`No template found for email type: ${emailType}`);
            }

            // Send email through service
            const result = await window.EmailService.sendEmail(emailContent);
            
            console.log(`📧 Email sent successfully: ${emailId}`);
            this.stats.emailsSent++;
            
            return { success: true, emailId, result };

        } catch (error) {
            console.warn(`📧 Email ${emailId} failed:`, error.message);
            this.stats.emailsFailed++;
            
            // Retry logic for failed emails
            emailData.attempts = (emailData.attempts || 0) + 1;
            if (emailData.attempts < emailData.maxAttempts) {
                // Reschedule with exponential backoff
                const retryDelay = Math.pow(2, emailData.attempts) * 60000; // 1, 2, 4 minutes
                emailData.scheduleTime = Date.now() + retryDelay;
                this.scheduledEmails.set(emailData.emailId, emailData);
                console.log(`📧 Email ${emailId} rescheduled for retry ${emailData.attempts}/${emailData.maxAttempts}`);
            }
            
            throw error;
        }
    }

    generateEmailContent(emailType, eventData) {
        // Lightweight email content generation
        const templates = {
            appointment_confirmation: {
                subject: 'Appointment Confirmation - Consider Restoration',
                body: `Your appointment for ${eventData.service} on ${eventData.date} at ${eventData.time} has been confirmed.`,
                html: true
            },
            appointment_reminder: {
                subject: 'Appointment Reminder - Tomorrow',
                body: `Reminder: You have an appointment tomorrow for ${eventData.service} at ${eventData.time}.`,
                html: true
            },
            welcome_email: {
                subject: 'Welcome to Consider Restoration',
                body: `Welcome ${eventData.name}! Thank you for joining us.`,
                html: true
            }
        };

        const template = templates[emailType];
        if (!template) return null;

        return {
            to: eventData.email,
            subject: template.subject,
            body: template.body,
            html: template.html
        };
    }

    updateStats(results, startTime) {
        const processingTime = Date.now() - startTime;
        this.stats.averageProcessingTime = 
            (this.stats.averageProcessingTime + processingTime) / 2;
        this.stats.lastProcessedAt = new Date().toISOString();
    }

    cleanupOldEmails(force = false) {
        const maxAge = force ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 1 hour if forced, 24 hours normally
        const cutoffTime = Date.now() - maxAge;
        let cleanedCount = 0;

        for (const [emailId, emailData] of this.scheduledEmails) {
            if (emailData.createdAt < cutoffTime) {
                this.scheduledEmails.delete(emailId);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`📧 Cleaned up ${cleanedCount} old emails`);
        }
    }

    // Public API methods
    triggerEvent(eventType, eventData) {
        // Safe event triggering
        try {
            window.dispatchEvent(new CustomEvent(eventType, { detail: eventData }));
        } catch (error) {
            console.warn('📧 Event trigger error (non-critical):', error);
        }
    }

    getStats() {
        return {
            ...this.stats,
            queueSize: this.scheduledEmails.size,
            isEnabled: this.isEnabled,
            isInitialized: this.initialized
        };
    }

    disable() {
        this.isEnabled = false;
        this.scheduledEmails.clear();
        console.log('📧 Email automation disabled');
    }

    enable() {
        this.isEnabled = true;
        console.log('📧 Email automation enabled');
    }
}

// Create global instance with error protection
try {
    window.OptimizedEmailAutomation = new OptimizedEmailAutomation();
    
    // Initialize when DOM is ready (non-blocking)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => window.OptimizedEmailAutomation.initialize(), 100);
        });
    } else {
        setTimeout(() => window.OptimizedEmailAutomation.initialize(), 100);
    }
    
    console.log('📧 Optimized Email Automation loaded successfully');
    
} catch (error) {
    console.error('📧 Failed to create OptimizedEmailAutomation:', error);
    // Provide a dummy implementation to prevent other code from breaking
    window.OptimizedEmailAutomation = {
        triggerEvent: () => {},
        getStats: () => ({ disabled: true }),
        disable: () => {},
        enable: () => {}
    };
}

// Helper function for immediate scheduling
function setImmediate(callback) {
    return setTimeout(callback, 0);
}