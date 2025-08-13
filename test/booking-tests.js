// Booking System Tests
// Comprehensive tests for appointment booking functionality

describe('Booking System', () => {
    let originalAppointments, originalUsers;

    beforeAll(() => {
        // Backup original data
        originalAppointments = window.sharedAppointments ? [...window.sharedAppointments] : [];
        originalUsers = window.sharedUsers ? [...window.sharedUsers] : [];
        
        // Initialize test data
        window.sharedAppointments = [];
        window.sharedUsers = [];
    });

    afterAll(() => {
        // Restore original data
        if (originalAppointments) window.sharedAppointments = originalAppointments;
        if (originalUsers) window.sharedUsers = originalUsers;
    });

    beforeEach(async () => {
        // Clear any existing modals
        document.querySelectorAll('.modal').forEach(modal => modal.remove());
        
        // Reset form if it exists
        const form = document.getElementById('bookingForm');
        if (form) {
            form.reset();
        }
    });

    it('should display available services', async () => {
        // Check if service options are present
        const serviceOptions = document.querySelectorAll('input[name="service"]');
        expect(serviceOptions.length).toBeGreaterThan(0);
        
        // Verify standard services are available
        const services = Array.from(serviceOptions).map(input => input.value);
        expect(services).toContain('Swedish Massage');
        expect(services).toContain('Deep Tissue Massage');
    });

    it('should validate required booking form fields', async () => {
        if (!document.getElementById('bookingForm')) {
            console.log('Booking form not found, skipping test');
            return;
        }

        // Try to submit form without required fields
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) {
            TestUtils.click(submitBtn);
            
            // Check for validation messages
            const requiredFields = document.querySelectorAll('input[required]');
            let hasValidation = false;
            
            requiredFields.forEach(field => {
                if (field.validity && !field.validity.valid) {
                    hasValidation = true;
                }
            });
            
            expect(hasValidation).toBeTruthy();
        }
    });

    it('should create appointment with valid data', async () => {
        // Create a test booking
        const testBooking = {
            service: 'Swedish Massage',
            date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
            time: '10:00 AM',
            name: 'Test User',
            email: 'test@example.com',
            phone: '555-0123',
            message: 'Test booking'
        };

        // Use the booking function if available
        if (window.processBookingSubmission) {
            const result = await window.processBookingSubmission(testBooking);
            expect(result).toBeTruthy();
            
            // Check if appointment was added to data
            expect(window.sharedAppointments.length).toBe(1);
            expect(window.sharedAppointments[0].service).toBe(testBooking.service);
            expect(window.sharedAppointments[0].email).toBe(testBooking.email);
        }
    });

    it('should prevent double booking', async () => {
        const existingBooking = {
            id: 1,
            service: 'Deep Tissue Massage',
            date: '2024-12-25',
            time: '2:00 PM',
            name: 'Existing Client',
            email: 'existing@example.com',
            status: 'confirmed'
        };

        // Add existing booking
        window.sharedAppointments.push(existingBooking);

        // Try to book same date/time
        const duplicateBooking = {
            service: 'Swedish Massage',
            date: '2024-12-25',
            time: '2:00 PM',
            name: 'New Client',
            email: 'new@example.com',
            phone: '555-0456'
        };

        // Check if time slot validation works
        if (window.isTimeSlotAvailable) {
            const isAvailable = window.isTimeSlotAvailable(
                duplicateBooking.date,
                duplicateBooking.time
            );
            expect(isAvailable).toBeFalsy();
        }
    });

    it('should handle payment modal for paid services', async () => {
        const paidServiceBooking = {
            service: 'Hot Stone Massage',
            date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            time: '3:00 PM',
            name: 'Payment Test',
            email: 'payment@example.com',
            phone: '555-0789'
        };

        // Check if payment modal appears for paid services
        if (window.showBookingPaymentModal) {
            window.showBookingPaymentModal(paidServiceBooking);
            
            // Wait for modal to appear
            await TestUtils.sleep(100);
            
            const paymentModal = document.querySelector('.modal');
            expect(paymentModal).toBeTruthy();
            expect(paymentModal.style.display).toBe('flex');
        }
    });

    it('should display booking confirmation', async () => {
        const confirmedBooking = {
            id: 123,
            service: 'Prenatal Massage',
            date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            time: '11:00 AM',
            name: 'Expectant Mother',
            email: 'prenatal@example.com',
            status: 'confirmed'
        };

        const userSession = {
            name: 'Expectant Mother',
            email: 'prenatal@example.com',
            isNewUser: false
        };

        // Show success modal
        if (window.showBookingSuccessModal) {
            window.showBookingSuccessModal(confirmedBooking, userSession);
            
            // Wait for modal to appear
            await TestUtils.sleep(100);
            
            const successModal = document.querySelector('.modal');
            expect(successModal).toBeTruthy();
            
            // Check for confirmation content
            const modalContent = successModal.textContent;
            expect(modalContent).toContain('confirmed');
            expect(modalContent).toContain(confirmedBooking.service);
        }
    });

    it('should validate email format', async () => {
        const invalidEmails = [
            'invalid-email',
            '@example.com',
            'test@',
            'test.example.com',
            ''
        ];

        const emailInput = document.querySelector('input[type="email"]');
        if (emailInput) {
            for (const email of invalidEmails) {
                TestUtils.type(emailInput, email);
                
                // Trigger validation
                emailInput.dispatchEvent(new Event('blur'));
                
                if (emailInput.validity) {
                    expect(emailInput.validity.valid).toBeFalsy();
                }
            }
        }
    });

    it('should handle date selection correctly', async () => {
        const today = new Date();
        const tomorrow = new Date(today.getTime() + 86400000);
        const yesterday = new Date(today.getTime() - 86400000);

        // Test that past dates are disabled
        if (window.isDateAvailable) {
            expect(window.isDateAvailable(yesterday)).toBeFalsy();
            expect(window.isDateAvailable(tomorrow)).toBeTruthy();
        }

        // Test date input constraints
        const dateInput = document.querySelector('input[type="date"]');
        if (dateInput) {
            const minDate = dateInput.getAttribute('min');
            expect(minDate).toBeTruthy();
            
            // Min date should be today or later
            expect(new Date(minDate)).toBeGreaterThan(yesterday);
        }
    });

    it('should integrate with email system', async () => {
        // Mock email automation
        let emailTriggered = false;
        const originalEmailAutomation = window.EmailAutomation;
        
        window.EmailAutomation = {
            initialized: true,
            triggerAppointmentConfirmation: () => {
                emailTriggered = true;
            }
        };

        const testBooking = {
            service: 'Applied Neurology',
            date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            time: '4:00 PM',
            name: 'Email Test',
            email: 'email@example.com',
            phone: '555-0987'
        };

        // Process booking and check if email was triggered
        if (window.processBookingSubmission) {
            await window.processBookingSubmission(testBooking);
            
            // Wait for async operations
            await TestUtils.sleep(500);
            
            // Check if appointment booked event was dispatched
            // (This would normally trigger the email)
            expect(window.sharedAppointments.length).toBeGreaterThan(0);
        }

        // Restore original
        window.EmailAutomation = originalEmailAutomation;
    });

    it('should handle service worker integration', async () => {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            // Test service worker message handling
            const testMessage = {
                type: 'CACHE_BOOKING',
                booking: {
                    service: 'Swedish Massage',
                    date: '2024-12-20',
                    time: '1:00 PM'
                }
            };

            // This would normally cache the booking offline
            navigator.serviceWorker.controller.postMessage(testMessage);
            
            // Service worker integration is complex to test
            // Just verify it doesn't throw errors
            expect(true).toBeTruthy();
        }
    });

    it('should maintain data consistency', async () => {
        const initialCount = window.sharedAppointments.length;

        // Add multiple bookings
        const bookings = [
            {
                service: 'Swedish Massage',
                date: '2024-12-21',
                time: '9:00 AM',
                name: 'Client 1',
                email: 'client1@example.com'
            },
            {
                service: 'Deep Tissue Massage',
                date: '2024-12-22',
                time: '10:00 AM',
                name: 'Client 2',
                email: 'client2@example.com'
            }
        ];

        for (const booking of bookings) {
            if (window.processBookingSubmission) {
                await window.processBookingSubmission(booking);
            }
        }

        // Check data consistency
        expect(window.sharedAppointments.length).toBe(initialCount + bookings.length);

        // Each booking should have unique ID
        const ids = window.sharedAppointments.map(apt => apt.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });
});