const fs = require('fs');
const path = require('path');

// Create sample appointment data
const sampleAppointment = {
    id: 'test-appointment-123',
    clientName: 'Test Client',
    clientEmail: 'gecko215059@gmail.com',
    appointmentDate: '2025-08-08', // Tomorrow
    startTime: '14:00',
    endTime: '15:00',
    duration: 60,
    price: 100.00,
    status: 'confirmed'
};

const sampleService = {
    name: 'Integrated Massage',
    description: 'Comprehensive bodywork addressing multiple concerns with various modalities',
    duration: 60
};

// Generate email templates
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

function getConfirmationTemplate(appointment, service) {
    const appointmentDate = new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return {
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
}

// Generate HTML files for each email type
function generateEmailPreviews() {
    console.log('📧 Generating email preview files...');
    
    const outputDir = path.join(__dirname, '../email-previews');
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }
    
    // Generate confirmation email
    const confirmationTemplate = getConfirmationTemplate(sampleAppointment, sampleService);
    const confirmationHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>${confirmationTemplate.subject}</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
    <div style="background-color: #f4f4f4; padding: 20px;">
        <div style="background-color: white; margin: 0 auto; max-width: 600px;">
            <div style="background-color: #2c5530; color: white; padding: 10px 20px; text-align: center;">
                <h3 style="margin: 0;">EMAIL PREVIEW: ${confirmationTemplate.subject}</h3>
                <p style="margin: 5px 0; font-size: 14px;">To: ${sampleAppointment.clientEmail}</p>
            </div>
            ${confirmationTemplate.html}
        </div>
    </div>
</body>
</html>`;
    
    fs.writeFileSync(path.join(outputDir, '1-appointment-confirmation.html'), confirmationHtml);
    
    // Generate day-before reminder
    const dayBeforeTemplate = getDayBeforeReminderTemplate(sampleAppointment, sampleService);
    const dayBeforeHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>${dayBeforeTemplate.subject}</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
    <div style="background-color: #f4f4f4; padding: 20px;">
        <div style="background-color: white; margin: 0 auto; max-width: 600px;">
            <div style="background-color: #2c5530; color: white; padding: 10px 20px; text-align: center;">
                <h3 style="margin: 0;">EMAIL PREVIEW: ${dayBeforeTemplate.subject}</h3>
                <p style="margin: 5px 0; font-size: 14px;">To: ${sampleAppointment.clientEmail}</p>
            </div>
            ${dayBeforeTemplate.html}
        </div>
    </div>
</body>
</html>`;
    
    fs.writeFileSync(path.join(outputDir, '2-day-before-reminder.html'), dayBeforeHtml);
    
    // Generate day-of reminder
    const dayOfTemplate = getDayOfReminderTemplate(sampleAppointment, sampleService);
    const dayOfHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>${dayOfTemplate.subject}</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
    <div style="background-color: #f4f4f4; padding: 20px;">
        <div style="background-color: white; margin: 0 auto; max-width: 600px;">
            <div style="background-color: #2c5530; color: white; padding: 10px 20px; text-align: center;">
                <h3 style="margin: 0;">EMAIL PREVIEW: ${dayOfTemplate.subject}</h3>
                <p style="margin: 5px 0; font-size: 14px;">To: ${sampleAppointment.clientEmail}</p>
            </div>
            ${dayOfTemplate.html}
        </div>
    </div>
</body>
</html>`;
    
    fs.writeFileSync(path.join(outputDir, '3-day-of-reminder.html'), dayOfHtml);
    
    console.log('✅ Email preview files generated!');
    console.log(`📁 Files saved in: ${outputDir}`);
    console.log('\n📧 Generated email previews:');
    console.log('   1. 1-appointment-confirmation.html');
    console.log('   2. 2-day-before-reminder.html');  
    console.log('   3. 3-day-of-reminder.html');
    
    console.log('\n🌐 Open these HTML files in your browser to see exactly how the emails will look!');
    
    // Also create an index file
    const indexHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Consider Restoration - Email Preview Index</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background-color: #f4f4f4; }
        .container { background-color: white; padding: 30px; border-radius: 8px; max-width: 600px; margin: 0 auto; }
        h1 { color: #2c5530; text-align: center; }
        .email-list { list-style: none; padding: 0; }
        .email-list li { margin: 15px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px; }
        .email-list a { color: #2c5530; text-decoration: none; font-weight: bold; font-size: 18px; }
        .email-list a:hover { text-decoration: underline; }
        .description { color: #666; margin-top: 5px; }
        .note { background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Consider Restoration Email Previews</h1>
        <p style="text-align: center; color: #666;">Sample emails for appointment system</p>
        
        <ul class="email-list">
            <li>
                <a href="1-appointment-confirmation.html">📧 Appointment Confirmation Email</a>
                <div class="description">Sent immediately after booking an appointment</div>
            </li>
            <li>
                <a href="2-day-before-reminder.html">⏰ Day-Before Reminder Email</a>
                <div class="description">Sent 24 hours before the appointment</div>
            </li>
            <li>
                <a href="3-day-of-reminder.html">🔔 Day-Of Reminder Email</a>
                <div class="description">Sent 4 hours before the appointment</div>
            </li>
        </ul>
        
        <div class="note">
            <strong>Note:</strong> These are preview versions showing how the actual emails will look when sent to clients. The appointment reminder system is fully automated and will send these emails at the appropriate times.
        </div>
    </div>
</body>
</html>`;
    
    fs.writeFileSync(path.join(outputDir, 'index.html'), indexHtml);
}

// Run the preview generation
generateEmailPreviews();