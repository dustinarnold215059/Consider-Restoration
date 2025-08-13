// Email Automation System
// Handles automatic email triggers based on user actions and events

class EmailAutomation {
    constructor() {
        this.initialized = false;
        this.scheduledEmails = new Map();
        this.automationRules = new Map();
        this.eventListeners = new Set();
    }

    async initialize() {
        if (this.initialized) return;

        console.log('🤖 Initializing Email Automation...');
        
        try {
            await this.waitForEmailService();
            this.setupAutomationRules();
            this.setupEventListeners();
            this.startScheduler();
            this.initialized = true;
            
            console.log('✅ Email Automation initialized successfully');
        } catch (error) {
            console.error('❌ Email Automation initialization failed:', error);
        }
    }

    async waitForEmailService() {
        // Wait for EmailService to be available (reduced wait time)
        let attempts = 0;
        while (!window.EmailService && attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.EmailService) {
            console.log('EmailService not available, email automation disabled');
            return; // Don't throw error, just disable
        }

        // Wait for EmailService to be initialized (reduced wait time)
        attempts = 0;
        while (!window.EmailService.initialized && attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!window.EmailService.initialized) {
            console.log('EmailService not initialized, email automation disabled');
            return; // Don't throw error, just disable
        }
    }

    setupAutomationRules() {
        // Define automation rules for different events
        
        // Rule 1: Send confirmation email when appointment is booked
        this.automationRules.set('appointment_booked', {
            emailType: 'appointment_confirmation',
            delay: 0, // Send immediately
            enabled: true,
            condition: (data) => data.status === 'confirmed'
        });

        // Rule 2: Send reminder email 24 hours before appointment
        this.automationRules.set('appointment_reminder_24h', {
            emailType: 'appointment_reminder',
            delay: -24 * 60 * 60 * 1000, // 24 hours before
            enabled: true,
            condition: (data) => data.status === 'confirmed'
        });

        // Rule 3: Send welcome email when user registers
        this.automationRules.set('user_registered', {
            emailType: 'welcome_email',
            delay: 0,
            enabled: true,
            condition: (data) => data.emailVerified !== false
        });

        // Rule 4: Send review request 2 hours after appointment
        this.automationRules.set('appointment_completed', {
            emailType: 'review_request',
            delay: 2 * 60 * 60 * 1000, // 2 hours after
            enabled: true,
            condition: (data) => data.status === 'completed'
        });

        // Rule 5: Send cancellation notice when appointment is cancelled
        this.automationRules.set('appointment_cancelled', {
            emailType: 'appointment_cancelled',
            delay: 0,
            enabled: true,
            condition: (data) => data.status === 'cancelled'
        });

        console.log(`🤖 Automation rules configured: ${this.automationRules.size}`);
    }

    setupEventListeners() {
        // Listen for booking events
        window.addEventListener('appointmentBooked', (event) => {
            this.handleEvent('appointment_booked', event.detail);
        });

        window.addEventListener('appointmentCancelled', (event) => {
            this.handleEvent('appointment_cancelled', event.detail);
        });

        window.addEventListener('appointmentCompleted', (event) => {
            this.handleEvent('appointment_completed', event.detail);
        });

        window.addEventListener('userRegistered', (event) => {
            this.handleEvent('user_registered', event.detail);
        });

        // Listen for localStorage changes to detect bookings from other tabs
        window.addEventListener('storage', (event) => {
            if (event.key === 'appointments') {
                this.checkForNewAppointments(event.newValue, event.oldValue);
            }
        });

        console.log('🤖 Event listeners configured');
    }

    handleEvent(eventType, eventData) {
        console.log(`🤖 Handling event: ${eventType}`, eventData);

        const rule = this.automationRules.get(eventType);
        if (!rule || !rule.enabled) {
            console.log(`🤖 No active rule for event: ${eventType}`);
            return;
        }

        // Check if condition is met
        if (rule.condition && !rule.condition(eventData)) {
            console.log(`🤖 Condition not met for event: ${eventType}`);
            return;
        }

        // Schedule the email
        this.scheduleEmail(rule.emailType, eventData, rule.delay);

        // For appointment reminders, schedule them for the future
        if (eventType === 'appointment_booked' && eventData.date && eventData.time) {
            this.scheduleAppointmentReminder(eventData);
        }
    }

    scheduleEmail(emailType, data, delay = 0) {
        const scheduleTime = Date.now() + delay;
        const emailId = `${emailType}_${data.id || Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        this.scheduledEmails.set(emailId, {
            emailType,
            data,
            scheduleTime,
            attempts: 0,
            maxAttempts: 3
        });

        console.log(`📅 Email scheduled: ${emailType} at ${new Date(scheduleTime).toLocaleString()}`);

        // If delay is 0 or past, send immediately
        if (delay <= 0) {
            setTimeout(() => this.processPendingEmails(), 100);
        }
    }

    scheduleAppointmentReminder(appointmentData) {
        try {
            const appointmentDateTime = new Date(`${appointmentData.date} ${appointmentData.time}`);
            const reminderTime = appointmentDateTime.getTime() - (24 * 60 * 60 * 1000); // 24 hours before

            if (reminderTime > Date.now()) {
                this.scheduleEmail('appointment_reminder', appointmentData, reminderTime - Date.now());
                console.log(`📅 Reminder scheduled for ${new Date(reminderTime).toLocaleString()}`);
            }
        } catch (error) {
            console.error('❌ Failed to schedule appointment reminder:', error);
        }
    }

    checkForNewAppointments(newValue, oldValue) {
        try {
            const newAppointments = JSON.parse(newValue || '[]');
            const oldAppointments = JSON.parse(oldValue || '[]');

            // Find newly added appointments
            const newBookings = newAppointments.filter(newApt => 
                !oldAppointments.some(oldApt => oldApt.id === newApt.id)
            );

            // Trigger events for new bookings
            newBookings.forEach(booking => {
                window.dispatchEvent(new CustomEvent('appointmentBooked', {
                    detail: booking
                }));
            });
        } catch (error) {
            console.error('❌ Error checking for new appointments:', error);
        }
    }

    startScheduler() {
        // Process pending emails every minute
        setInterval(() => {
            this.processPendingEmails();
        }, 60000);

        // Cleanup old scheduled emails every hour
        setInterval(() => {
            this.cleanupOldEmails();
        }, 60 * 60 * 1000);

        console.log('📅 Email scheduler started');
    }

    async processPendingEmails() {
        const now = Date.now();
        const pendingEmails = [];

        // Find emails that need to be sent
        for (const [emailId, emailData] of this.scheduledEmails) {
            if (emailData.scheduleTime <= now) {
                pendingEmails.push({ emailId, ...emailData });
            }
        }

        if (pendingEmails.length === 0) {
            return;
        }

        console.log(`📧 Processing ${pendingEmails.length} pending emails`);

        for (const email of pendingEmails) {
            try {
                await this.sendScheduledEmail(email);
                this.scheduledEmails.delete(email.emailId);
                console.log(`✅ Sent scheduled email: ${email.emailType}`);
            } catch (error) {
                console.error(`❌ Failed to send scheduled email:`, error);
                
                // Retry logic
                email.attempts++;
                if (email.attempts < email.maxAttempts) {
                    // Reschedule with exponential backoff
                    email.scheduleTime = now + (Math.pow(2, email.attempts) * 60000);
                    this.scheduledEmails.set(email.emailId, email);
                } else {
                    console.error(`❌ Max attempts reached for email: ${email.emailId}`);
                    this.scheduledEmails.delete(email.emailId);
                }
            }
        }
    }

    async sendScheduledEmail(emailData) {
        const { emailType, data } = emailData;

        switch (emailType) {
            case 'appointment_confirmation':
                return await window.EmailService.sendAppointmentConfirmation(
                    data.email || data.clientEmail,
                    data
                );
            
            case 'appointment_reminder':
                return await window.EmailService.sendAppointmentReminder(
                    data.email || data.clientEmail,
                    data
                );
            
            case 'welcome_email':
                return await window.EmailService.sendWelcomeEmail(
                    data.email,
                    data
                );
            
            case 'review_request':
                return await window.EmailService.sendReviewRequest(
                    data.email || data.clientEmail,
                    data
                );
            
            case 'appointment_cancelled':
                return await window.EmailService.sendCancellationNotice(
                    data.email || data.clientEmail,
                    data
                );
            
            default:
                throw new Error(`Unknown email type: ${emailType}`);
        }
    }

    cleanupOldEmails() {
        const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
        let cleaned = 0;

        for (const [emailId, emailData] of this.scheduledEmails) {
            if (emailData.scheduleTime < cutoff) {
                this.scheduledEmails.delete(emailId);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`🧹 Cleaned up ${cleaned} old scheduled emails`);
        }
    }

    // Manual trigger methods for admin use
    triggerWelcomeEmail(userData) {
        this.handleEvent('user_registered', userData);
    }

    triggerAppointmentConfirmation(appointmentData) {
        this.handleEvent('appointment_booked', appointmentData);
    }

    triggerReviewRequest(appointmentData) {
        this.handleEvent('appointment_completed', appointmentData);
    }

    // Configuration methods
    enableRule(ruleId) {
        const rule = this.automationRules.get(ruleId);
        if (rule) {
            rule.enabled = true;
            console.log(`✅ Enabled automation rule: ${ruleId}`);
        }
    }

    disableRule(ruleId) {
        const rule = this.automationRules.get(ruleId);
        if (rule) {
            rule.enabled = false;
            console.log(`❌ Disabled automation rule: ${ruleId}`);
        }
    }

    updateRuleDelay(ruleId, newDelay) {
        const rule = this.automationRules.get(ruleId);
        if (rule) {
            rule.delay = newDelay;
            console.log(`🕒 Updated rule delay: ${ruleId} to ${newDelay}ms`);
        }
    }

    // Status and monitoring
    getStatus() {
        return {
            initialized: this.initialized,
            scheduledEmails: this.scheduledEmails.size,
            automationRules: Array.from(this.automationRules.entries()).map(([id, rule]) => ({
                id,
                enabled: rule.enabled,
                emailType: rule.emailType,
                delay: rule.delay
            }))
        };
    }

    getPendingEmails() {
        const now = Date.now();
        return Array.from(this.scheduledEmails.entries()).map(([id, email]) => ({
            id,
            emailType: email.emailType,
            scheduleTime: new Date(email.scheduleTime).toLocaleString(),
            isPending: email.scheduleTime <= now,
            attempts: email.attempts
        }));
    }

    destroy() {
        this.initialized = false;
        this.scheduledEmails.clear();
        this.automationRules.clear();
        
        // Remove event listeners
        this.eventListeners.forEach(removeListener => removeListener());
        this.eventListeners.clear();
    }
}

// Create global instance
window.EmailAutomation = new EmailAutomation();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.EmailAutomation.initialize();
    });
} else {
    window.EmailAutomation.initialize();
}

// Export for ES6 modules
export { EmailAutomation };