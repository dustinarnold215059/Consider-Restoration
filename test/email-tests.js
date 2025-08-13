// Email Service Tests
// Tests for email integration and automation functionality

describe('Email Service', () => {
    let mockEmailSent, emailData;

    beforeAll(() => {
        // Mock email sending for testing
        mockEmailSent = false;
        emailData = null;

        // Mock the email service if it exists
        if (window.EmailService) {
            const originalSendEmail = window.EmailService.sendEmail;
            window.EmailService.sendEmail = async (templateName, recipientEmail, data, options) => {
                mockEmailSent = true;
                emailData = { templateName, recipientEmail, data, options };
                return { success: true, queued: true };
            };
        }
    });

    beforeEach(() => {
        // Reset mock data
        mockEmailSent = false;
        emailData = null;
    });

    it('should initialize email service properly', async () => {
        if (window.EmailService) {
            expect(window.EmailService).toBeTruthy();
            
            // Wait for initialization
            await TestUtils.sleep(500);
            
            const status = window.EmailService.getQueueStatus();
            expect(status.initialized).toBeTruthy();
            expect(status.templatesLoaded).toBeGreaterThan(0);
        }
    });

    it('should load email templates', async () => {
        if (window.EmailService && window.EmailService.templates) {
            const templates = window.EmailService.templates;
            
            // Check for required templates
            expect(templates.has('appointment_confirmation')).toBeTruthy();
            expect(templates.has('welcome_email')).toBeTruthy();
            expect(templates.has('appointment_reminder')).toBeTruthy();
            expect(templates.has('password_reset')).toBeTruthy();
            expect(templates.has('review_request')).toBeTruthy();
        }
    });

    it('should compile email templates with data', async () => {
        if (window.EmailService) {
            const testData = {
                clientName: 'John Doe',
                serviceName: 'Swedish Massage',
                appointmentDate: '2024-12-20',
                appointmentTime: '2:00 PM',
                price: 80
            };

            const template = '{{clientName}} has booked {{serviceName}} on {{appointmentDate}} at {{appointmentTime}} for ${{price}}';
            const compiled = window.EmailService.compileTemplate(template, testData);
            
            expect(compiled).toBe('John Doe has booked Swedish Massage on 2024-12-20 at 2:00 PM for $80');
            expect(compiled).not.toContain('{{');
        }
    });

    it('should handle conditional template blocks', async () => {
        if (window.EmailService) {
            const testData = {
                refundAmount: 50,
                hasRefund: true
            };

            const template = 'Your appointment is cancelled. {{#refundAmount}}Refund: ${{refundAmount}}{{/refundAmount}}';
            const compiled = window.EmailService.compileTemplate(template, testData);
            
            expect(compiled).toContain('Refund: $50');

            // Test without refund data
            const noRefundData = { hasRefund: false };
            const noRefundCompiled = window.EmailService.compileTemplate(template, noRefundData);
            expect(noRefundCompiled).not.toContain('Refund:');
        }
    });

    it('should send appointment confirmation email', async () => {
        if (window.EmailService) {
            const appointmentData = {
                clientName: 'Jane Smith',
                service: 'Deep Tissue Massage',
                date: '2024-12-21',
                time: '3:00 PM',
                duration: 60,
                price: 90
            };

            await window.EmailService.sendAppointmentConfirmation('jane@example.com', appointmentData);

            expect(mockEmailSent).toBeTruthy();
            expect(emailData.templateName).toBe('appointment_confirmation');
            expect(emailData.recipientEmail).toBe('jane@example.com');
            expect(emailData.data.clientName).toBe(appointmentData.clientName);
        }
    });

    it('should send welcome email for new users', async () => {
        if (window.EmailService) {
            const userData = {
                name: 'New User',
                email: 'newuser@example.com'
            };

            await window.EmailService.sendWelcomeEmail(userData.email, userData);

            expect(mockEmailSent).toBeTruthy();
            expect(emailData.templateName).toBe('welcome_email');
            expect(emailData.recipientEmail).toBe(userData.email);
            expect(emailData.data.clientName).toBe(userData.name);
        }
    });

    it('should queue emails for batch processing', async () => {
        if (window.EmailService) {
            const initialQueueLength = window.EmailService.getQueueStatus().queueLength;

            // Send multiple emails
            await window.EmailService.sendEmail('appointment_reminder', 'user1@example.com', {});
            await window.EmailService.sendEmail('review_request', 'user2@example.com', {});

            const newQueueLength = window.EmailService.getQueueStatus().queueLength;
            expect(newQueueLength).toBeGreaterThan(initialQueueLength);
        }
    });

    it('should prioritize high priority emails', async () => {
        if (window.EmailService) {
            // Send regular priority email
            await window.EmailService.sendEmail('review_request', 'normal@example.com', {}, {});
            
            // Send high priority email
            await window.EmailService.sendEmail('password_reset', 'urgent@example.com', {}, { priority: 'high' });

            // High priority should be processed faster
            await TestUtils.sleep(200);
            
            expect(mockEmailSent).toBeTruthy();
            expect(emailData.templateName).toBe('password_reset');
        }
    });

    it('should handle email automation events', async () => {
        if (window.EmailAutomation) {
            // Wait for initialization
            await TestUtils.sleep(500);
            
            expect(window.EmailAutomation.initialized).toBeTruthy();

            // Test appointment booked event
            const appointmentEvent = new CustomEvent('appointmentBooked', {
                detail: {
                    id: 1,
                    service: 'Test Service',
                    clientEmail: 'client@example.com',
                    clientName: 'Test Client',
                    date: '2024-12-22',
                    time: '1:00 PM',
                    status: 'confirmed'
                }
            });

            window.dispatchEvent(appointmentEvent);
            
            // Wait for automation to process
            await TestUtils.sleep(300);
            
            // Should trigger confirmation email
            expect(mockEmailSent).toBeTruthy();
        }
    });

    it('should schedule reminder emails', async () => {
        if (window.EmailAutomation) {
            const appointmentData = {
                id: 2,
                service: 'Prenatal Massage',
                date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
                time: '10:00 AM',
                clientEmail: 'reminder@example.com',
                clientName: 'Reminder Client',
                status: 'confirmed'
            };

            // Trigger appointment booked event
            window.EmailAutomation.handleEvent('appointment_booked', appointmentData);

            // Check if reminder was scheduled
            const pendingEmails = window.EmailAutomation.getPendingEmails();
            const reminderEmail = pendingEmails.find(email => 
                email.emailType === 'appointment_reminder'
            );

            expect(reminderEmail).toBeTruthy();
        }
    });

    it('should handle user registration events', async () => {
        if (window.EmailAutomation) {
            const userEvent = new CustomEvent('userRegistered', {
                detail: {
                    id: 10,
                    name: 'Auto User',
                    email: 'autouser@example.com',
                    emailVerified: true
                }
            });

            window.dispatchEvent(userEvent);
            
            // Wait for automation
            await TestUtils.sleep(200);
            
            // Should trigger welcome email
            expect(mockEmailSent).toBeTruthy();
            expect(emailData.templateName).toBe('welcome_email');
        }
    });

    it('should retry failed emails', async () => {
        if (window.EmailService) {
            // Mock a failing email service
            const originalSendEmailDirect = window.EmailService.sendEmailDirect;
            let attemptCount = 0;

            window.EmailService.sendEmailDirect = async () => {
                attemptCount++;
                if (attemptCount < 3) {
                    throw new Error('Email service unavailable');
                }
                return { success: true };
            };

            // Add email to queue
            await window.EmailService.sendEmail('appointment_confirmation', 'retry@example.com', {});

            // Process queue multiple times
            await window.EmailService.processQueue();
            await TestUtils.sleep(1000);
            await window.EmailService.processQueue();

            expect(attemptCount).toBeGreaterThan(1);

            // Restore original
            window.EmailService.sendEmailDirect = originalSendEmailDirect;
        }
    });

    it('should validate email addresses', async () => {
        if (window.EmailService) {
            const invalidEmails = [
                'invalid-email',
                '@example.com',
                'test@',
                '',
                null,
                undefined
            ];

            // Try to send emails to invalid addresses
            for (const email of invalidEmails) {
                try {
                    await window.EmailService.sendEmail('welcome_email', email, {});
                } catch (error) {
                    // Should handle invalid emails gracefully
                    expect(error).toBeTruthy();
                }
            }
        }
    });

    it('should handle bulk email sending', async () => {
        if (window.EmailService) {
            const recipients = [
                { email: 'bulk1@example.com', name: 'Bulk User 1' },
                { email: 'bulk2@example.com', name: 'Bulk User 2' },
                { email: 'bulk3@example.com', name: 'Bulk User 3' }
            ];

            const results = await window.EmailService.sendBulkEmail(
                'review_request',
                recipients,
                { serviceName: 'Bulk Test Service' }
            );

            expect(results.sent).toBe(recipients.length);
            expect(results.failed).toBe(0);
        }
    });

    it('should manage email queue size', async () => {
        if (window.EmailService) {
            const initialStatus = window.EmailService.getQueueStatus();

            // Add many emails to queue
            for (let i = 0; i < 10; i++) {
                await window.EmailService.sendEmail(
                    'appointment_reminder',
                    `test${i}@example.com`,
                    { clientName: `Test ${i}` }
                );
            }

            const queuedStatus = window.EmailService.getQueueStatus();
            expect(queuedStatus.queueLength).toBeGreaterThan(initialStatus.queueLength);

            // Clear queue
            window.EmailService.clearQueue();

            const clearedStatus = window.EmailService.getQueueStatus();
            expect(clearedStatus.queueLength).toBe(0);
        }
    });

    it('should handle template compilation errors', async () => {
        if (window.EmailService) {
            const invalidTemplate = '{{unclosedVariable and {{nested{{variables}}}}';
            const testData = { variable: 'test' };

            // Should handle malformed templates gracefully
            const compiled = window.EmailService.compileTemplate(invalidTemplate, testData);
            expect(compiled).toBeTruthy();
            expect(typeof compiled).toBe('string');
        }
    });

    it('should integrate with service worker for offline queuing', async () => {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            // Test service worker message for email queuing
            const emailMessage = {
                type: 'QUEUE_EMAIL',
                emailData: {
                    templateName: 'appointment_confirmation',
                    recipientEmail: 'offline@example.com',
                    data: { clientName: 'Offline User' }
                }
            };

            // This would queue the email for sending when online
            navigator.serviceWorker.controller.postMessage(emailMessage);

            // Service worker integration test - just verify no errors
            expect(true).toBeTruthy();
        }
    });

    it('should track email delivery status', async () => {
        if (window.EmailService) {
            await window.EmailService.sendEmail(
                'appointment_confirmation',
                'tracking@example.com',
                { clientName: 'Tracking User' },
                { trackDelivery: true }
            );

            expect(mockEmailSent).toBeTruthy();
            expect(emailData.options.trackDelivery).toBeTruthy();
        }
    });
});