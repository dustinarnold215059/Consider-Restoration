const { sendEmail, sendAppointmentReminder, sendAppointmentConfirmation } = require('./services/emailService');

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

const sampleUser = {
    name: 'Test Client',
    email: 'gecko215059@gmail.com'
};

async function sendTestEmails() {
    console.log('🧪 Sending test emails to gecko215059@gmail.com...');
    
    try {
        // 1. Send appointment confirmation email
        console.log('📧 Sending appointment confirmation email...');
        await sendAppointmentConfirmation(sampleAppointment, sampleUser, sampleService);
        console.log('✅ Appointment confirmation email sent!');
        
        // Wait a moment between emails
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 2. Send day-before reminder email
        console.log('📧 Sending day-before reminder email...');
        await sendAppointmentReminder(sampleAppointment, sampleService, 'day-before');
        console.log('✅ Day-before reminder email sent!');
        
        // Wait a moment between emails
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 3. Send day-of reminder email
        console.log('📧 Sending day-of reminder email...');
        await sendAppointmentReminder(sampleAppointment, sampleService, 'day-of');
        console.log('✅ Day-of reminder email sent!');
        
        console.log('🎉 All test emails sent successfully!');
        console.log('📮 Check gecko215059@gmail.com inbox for:');
        console.log('   1. Appointment Confirmation');
        console.log('   2. Day-Before Reminder');
        console.log('   3. Day-Of Reminder (4 Hours)');
        
    } catch (error) {
        console.error('❌ Error sending test emails:', error);
        
        // If SMTP is not configured, show what the emails would look like
        if (error.message.includes('Email service is not available') || 
            error.message.includes('SMTP not configured')) {
            
            console.log('\n📧 SMTP not configured, but here are the email templates:');
            console.log('\n=== APPOINTMENT CONFIRMATION EMAIL ===');
            
            const confirmationTemplate = getConfirmationTemplate();
            console.log('Subject:', confirmationTemplate.subject);
            console.log('To:', sampleAppointment.clientEmail);
            console.log('\n=== DAY-BEFORE REMINDER EMAIL ===');
            
            const dayBeforeTemplate = getDayBeforeTemplate();
            console.log('Subject:', dayBeforeTemplate.subject);
            console.log('To:', sampleAppointment.clientEmail);
            
            console.log('\n=== DAY-OF REMINDER EMAIL ===');
            
            const dayOfTemplate = getDayOfTemplate();
            console.log('Subject:', dayOfTemplate.subject);
            console.log('To:', sampleAppointment.clientEmail);
            
            console.log('\n💡 To actually send emails, configure SMTP settings in .env file');
        }
    }
    
    process.exit(0);
}

// Template preview functions
function getConfirmationTemplate() {
    return {
        subject: `Appointment Confirmed - Friday, August 8, 2025 at 14:00`,
    };
}

function getDayBeforeTemplate() {
    return {
        subject: `Appointment Reminder - Tomorrow at 14:00`,
    };
}

function getDayOfTemplate() {
    return {
        subject: `Today's Appointment - 14:00 (4 Hours)`,
    };
}

// Run the test
sendTestEmails();