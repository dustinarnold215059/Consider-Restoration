const nodemailer = require('nodemailer');
require('dotenv').config();

// Create nodemailer transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Main send email function
async function sendEmail({ to, subject, html, text }) {
    // Input validation
    if (!to || !subject) {
        throw new Error('Email recipient and subject are required');
    }

    // Validate email address format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
        throw new Error(`Invalid email address: ${to}`);
    }

    try {
        const emailOptions = {
            from: process.env.FROM_EMAIL || 'considerrestoration@gmail.com',
            to: to.trim(),
            subject: subject.trim(),
            html: html || '',
            text: text || (html ? html.replace(/<[^>]*>/g, '') : '') // Strip HTML for text version
        };

        // Only send email if SMTP is configured, otherwise just log
        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            // Test transporter connection before sending
            try {
                await transporter.verify();
            } catch (verifyError) {
                console.error('SMTP connection verification failed:', verifyError);
                throw new Error('Email service is not available. Please try again later.');
            }

            const result = await transporter.sendMail(emailOptions);
            console.log(`Email sent successfully to ${to}. Message ID: ${result.messageId}`);
            
            return {
                success: true,
                messageId: result.messageId,
                to: to,
                subject: subject
            };
        } else {
            console.log('Email would be sent (SMTP not configured):', emailOptions.subject, 'to', to);
            return {
                success: true,
                messageId: 'dev-mode-' + Date.now(),
                to: to,
                subject: subject,
                note: 'Development mode - no email actually sent'
            };
        }

    } catch (error) {
        // Enhanced error logging with context
        const errorContext = {
            to,
            subject,
            error: error.message,
            timestamp: new Date().toISOString(),
            smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
        };
        
        console.error('Failed to send email:', errorContext);

        // Throw user-friendly error message
        if (error.code === 'EAUTH') {
            throw new Error('Email authentication failed. Please contact support.');
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            throw new Error('Unable to connect to email server. Please try again later.');
        } else if (error.responseCode >= 500) {
            throw new Error('Email server error. Please try again later.');
        } else {
            throw new Error('Failed to send email. Please try again or contact support.');
        }
    }
}

// Appointment reminder email templates
function getDayBeforeReminderTemplate(appointment, service) {
    const appointmentDate = new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    return {
        subject: `Appointment Reminder - Tomorrow at ${appointment.startTime}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #2c5530; margin: 0;">Consider Restoration</h1>
                    <p style="color: #666; margin: 5px 0;">Massage Therapy & Wellness</p>
                </div>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h2 style="color: #2c5530; margin-top: 0;">Appointment Reminder</h2>
                    <p>Hello ${appointment.clientName},</p>
                    <p>This is a friendly reminder about your upcoming appointment <strong>tomorrow</strong>:</p>
                    
                    <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <p style="margin: 5px 0;"><strong>Service:</strong> ${service.name}</p>
                        <p style="margin: 5px 0;"><strong>Date:</strong> ${appointmentDate}</p>
                        <p style="margin: 5px 0;"><strong>Time:</strong> ${appointment.startTime}</p>
                        <p style="margin: 5px 0;"><strong>Duration:</strong> ${appointment.duration} minutes</p>
                        <p style="margin: 5px 0;"><strong>Price:</strong> $${appointment.price}</p>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #2c5530;">What to Expect</h3>
                    <p>• Please arrive 10-15 minutes early for check-in</p>
                    <p>• Bring a valid ID and any necessary forms</p>
                    <p>• Wear comfortable clothing</p>
                    <p>• Let us know if you have any health concerns or injuries</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #2c5530;">Need to Reschedule?</h3>
                    <p>If you need to reschedule or cancel, please contact us as soon as possible:</p>
                    <p>📞 Phone: (734) 419-4116</p>
                    <p>📧 Email: considerrestoration@gmail.com</p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                    <p>We look forward to seeing you tomorrow!</p>
                    <p style="color: #666; font-size: 14px;">
                        Consider Restoration<br>
                        Massage Therapy & Wellness<br>
                        considerrestoration@gmail.com<br>
                        (734) 419-4116
                    </p>
                </div>
            </div>
        `
    };
}

function getDayOfReminderTemplate(appointment, service) {
    const appointmentDate = new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    return {
        subject: `Today's Appointment - ${appointment.startTime} (4 Hours)`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #2c5530; margin: 0;">Consider Restoration</h1>
                    <p style="color: #666; margin: 5px 0;">Massage Therapy & Wellness</p>
                </div>
                
                <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2c5530;">
                    <h2 style="color: #2c5530; margin-top: 0;">Your Appointment is Today!</h2>
                    <p>Hello ${appointment.clientName},</p>
                    <p>Your massage appointment is <strong>today in approximately 4 hours</strong>:</p>
                    
                    <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <p style="margin: 5px 0;"><strong>Service:</strong> ${service.name}</p>
                        <p style="margin: 5px 0;"><strong>Date:</strong> ${appointmentDate}</p>
                        <p style="margin: 5px 0;"><strong>Time:</strong> ${appointment.startTime}</p>
                        <p style="margin: 5px 0;"><strong>Duration:</strong> ${appointment.duration} minutes</p>
                        <p style="margin: 5px 0;"><strong>Price:</strong> $${appointment.price}</p>
                    </div>
                </div>
                
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
                    <h3 style="color: #856404; margin-top: 0;">Preparation Reminders</h3>
                    <p style="margin: 5px 0;">✓ Please arrive 10-15 minutes early</p>
                    <p style="margin: 5px 0;">✓ Avoid heavy meals 2 hours before your appointment</p>
                    <p style="margin: 5px 0;">✓ Stay hydrated</p>
                    <p style="margin: 5px 0;">✓ Turn off or silence your phone</p>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #2c5530;">Running Late or Need to Cancel?</h3>
                    <p>Please call us immediately if you're running late or need to cancel:</p>
                    <div style="text-align: center; margin: 15px 0;">
                        <a href="tel:7344194116" style="display: inline-block; background-color: #2c5530; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">📞 Call (734) 419-4116</a>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                    <p style="color: #2c5530; font-size: 18px; font-weight: bold;">We can't wait to help you relax and restore!</p>
                    <p style="color: #666; font-size: 14px;">
                        Consider Restoration<br>
                        Massage Therapy & Wellness<br>
                        considerrestoration@gmail.com<br>
                        (734) 419-4116
                    </p>
                </div>
            </div>
        `
    };
}

// Send appointment reminder emails
async function sendAppointmentReminder(appointment, service, reminderType = 'day-before') {
    try {
        const template = reminderType === 'day-before' 
            ? getDayBeforeReminderTemplate(appointment, service)
            : getDayOfReminderTemplate(appointment, service);

        const result = await sendEmail({
            to: appointment.clientEmail,
            subject: template.subject,
            html: template.html
        });

        console.log(`${reminderType} reminder sent to ${appointment.clientEmail} for appointment ${appointment.id}`);
        return result;

    } catch (error) {
        console.error(`Failed to send ${reminderType} reminder for appointment ${appointment.id}:`, error);
        throw error;
    }
}

// Send appointment confirmation email
async function sendAppointmentConfirmation(appointment, user, service) {
    const appointmentDate = new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const template = {
        subject: `Appointment Confirmed - ${appointmentDate} at ${appointment.startTime}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #2c5530; margin: 0;">Consider Restoration</h1>
                    <p style="color: #666; margin: 5px 0;">Massage Therapy & Wellness</p>
                </div>
                
                <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #28a745;">
                    <h2 style="color: #155724; margin-top: 0;">✓ Appointment Confirmed</h2>
                    <p>Hello ${appointment.clientName},</p>
                    <p>Your appointment has been successfully scheduled!</p>
                    
                    <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
                        <p style="margin: 5px 0;"><strong>Service:</strong> ${service.name}</p>
                        <p style="margin: 5px 0;"><strong>Date:</strong> ${appointmentDate}</p>
                        <p style="margin: 5px 0;"><strong>Time:</strong> ${appointment.startTime}</p>
                        <p style="margin: 5px 0;"><strong>Duration:</strong> ${appointment.duration} minutes</p>
                        <p style="margin: 5px 0;"><strong>Price:</strong> $${appointment.price}</p>
                        <p style="margin: 5px 0;"><strong>Confirmation #:</strong> ${appointment.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #2c5530;">What's Next?</h3>
                    <p>• You'll receive a reminder email 24 hours before your appointment</p>
                    <p>• You'll receive another reminder on the day of your appointment</p>
                    <p>• Please arrive 10-15 minutes early for check-in</p>
                </div>
                
                <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                    <p>Thank you for choosing Consider Restoration!</p>
                    <p style="color: #666; font-size: 14px;">
                        Consider Restoration<br>
                        Massage Therapy & Wellness<br>
                        considerrestoration@gmail.com<br>
                        (734) 419-4116
                    </p>
                </div>
            </div>
        `
    };

    return await sendEmail({
        to: appointment.clientEmail,
        subject: template.subject,
        html: template.html
    });
}

module.exports = {
    sendEmail,
    sendAppointmentReminder,
    sendAppointmentConfirmation
};