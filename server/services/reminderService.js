const cron = require('node-cron');
const { Appointment, Service } = require('../models');
const { sendAppointmentReminder } = require('./emailService');

class ReminderService {
    constructor() {
        this.isRunning = false;
        this.reminderJob = null;
    }

    // Start the reminder service with cron job
    start() {
        if (this.isRunning) {
            console.log('Reminder service is already running');
            return;
        }

        // Run every hour to check for reminders to send
        this.reminderJob = cron.schedule('0 * * * *', async () => {
            await this.processReminders();
        }, {
            scheduled: false,
            timezone: "America/Detroit" // Eastern time zone
        });

        this.reminderJob.start();
        this.isRunning = true;
        
        console.log('📅 Appointment reminder service started');
        console.log('⏰ Checking for reminders every hour');
    }

    // Stop the reminder service
    stop() {
        if (this.reminderJob) {
            this.reminderJob.destroy();
            this.reminderJob = null;
        }
        this.isRunning = false;
        console.log('📅 Appointment reminder service stopped');
    }

    // Process all pending reminders
    async processReminders() {
        try {
            console.log('🔍 Checking for appointment reminders...');
            
            const currentTime = new Date();
            console.log(`Current time: ${currentTime.toLocaleString('en-US', { timeZone: 'America/Detroit' })}`);

            // Get all upcoming appointments that haven't been cancelled
            const upcomingAppointments = await Appointment.findAll({
                where: {
                    status: ['pending', 'confirmed'],
                    appointmentDate: {
                        [require('sequelize').Op.gte]: currentTime.toISOString().split('T')[0]
                    }
                },
                include: [
                    {
                        model: Service,
                        as: 'service',
                        attributes: ['name', 'description', 'duration']
                    }
                ]
            });

            console.log(`Found ${upcomingAppointments.length} upcoming appointments to check`);

            let dayBeforeCount = 0;
            let dayOfCount = 0;

            for (const appointment of upcomingAppointments) {
                try {
                    // Check for day-before reminders
                    if (appointment.needsDayBeforeReminder()) {
                        await this.sendDayBeforeReminder(appointment);
                        dayBeforeCount++;
                    }

                    // Check for day-of reminders  
                    if (appointment.needsDayOfReminder()) {
                        await this.sendDayOfReminder(appointment);
                        dayOfCount++;
                    }

                } catch (error) {
                    console.error(`Error processing reminders for appointment ${appointment.id}:`, error);
                }
            }

            if (dayBeforeCount > 0 || dayOfCount > 0) {
                console.log(`✅ Sent ${dayBeforeCount} day-before reminders and ${dayOfCount} day-of reminders`);
            } else {
                console.log('ℹ️ No reminders needed at this time');
            }

        } catch (error) {
            console.error('Error in processReminders:', error);
        }
    }

    // Send day-before reminder
    async sendDayBeforeReminder(appointment) {
        try {
            await sendAppointmentReminder(appointment, appointment.service, 'day-before');
            
            // Mark reminder as sent
            await appointment.update({
                dayBeforeReminderSent: true,
                dayBeforeReminderSentAt: new Date()
            });

            console.log(`📧 Day-before reminder sent for appointment ${appointment.id} to ${appointment.clientEmail}`);

        } catch (error) {
            console.error(`Failed to send day-before reminder for appointment ${appointment.id}:`, error);
            throw error;
        }
    }

    // Send day-of reminder
    async sendDayOfReminder(appointment) {
        try {
            await sendAppointmentReminder(appointment, appointment.service, 'day-of');
            
            // Mark reminder as sent
            await appointment.update({
                dayOfReminderSent: true,
                dayOfReminderSentAt: new Date()
            });

            console.log(`📧 Day-of reminder sent for appointment ${appointment.id} to ${appointment.clientEmail}`);

        } catch (error) {
            console.error(`Failed to send day-of reminder for appointment ${appointment.id}:`, error);
            throw error;
        }
    }

    // Manual trigger for testing
    async triggerReminderCheck() {
        console.log('🔄 Manually triggering reminder check...');
        await this.processReminders();
    }

    // Get reminder status
    getStatus() {
        return {
            isRunning: this.isRunning,
            nextRun: this.reminderJob ? this.reminderJob.nextDate() : null
        };
    }
}

// Create singleton instance
const reminderService = new ReminderService();

module.exports = reminderService;