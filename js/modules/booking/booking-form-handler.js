// Booking Form Handler Module
// Handles form submission, validation, and data processing
console.log('📝 Booking Form Handler loading...');

class BookingFormHandler {
    constructor() {
        this.isSubmitting = false;
        this.pendingBookingData = null;
        this.formValidationRules = this.initializeValidationRules();
        
        console.log('📝 BookingFormHandler initialized');
    }

    initializeValidationRules() {
        return {
            clientName: {
                required: true,
                minLength: 2,
                pattern: /^[a-zA-Z\s'-]+$/,
                message: 'Please enter a valid name (letters, spaces, hyphens, and apostrophes only)'
            },
            email: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Please enter a valid email address'
            },
            phone: {
                required: true,
                pattern: /^[\d\s\-\(\)\+\.]+$/,
                minLength: 10,
                message: 'Please enter a valid phone number'
            },
            service: {
                required: true,
                message: 'Please select a service'
            },
            date: {
                required: true,
                validate: (value) => {
                    const selectedDate = new Date(value);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return selectedDate >= today;
                },
                message: 'Please select a future date'
            },
            time: {
                required: true,
                message: 'Please select an appointment time'
            }
        };
    }

    // Main form submission handler
    async handleBookingSubmit(event) {
        console.log('📝 Form submission started');
        event.preventDefault();
        
        // Prevent duplicate submissions
        if (this.isSubmitting) {
            console.log('⚠️ Already submitting, ignoring duplicate');
            return;
        }
        
        this.isSubmitting = true;
        
        try {
            // Extract and validate form data
            const formData = this.extractFormData();
            const validationResult = this.validateFormData(formData);
            
            if (!validationResult.isValid) {
                this.showValidationErrors(validationResult.errors);
                return;
            }
            
            // Store booking data globally
            this.pendingBookingData = formData;
            window.pendingBookingData = formData;
            
            console.log('📝 Booking data validated:', formData);
            
            // Check authentication status
            const authResult = await this.checkAuthenticationStatus();
            
            if (authResult.isAuthenticated) {
                // User is logged in, proceed directly to payment
                await this.processAuthenticatedBooking(formData, authResult.user);
            } else {
                // User needs to login/register, show auth modal
                this.showAuthenticationModal();
            }
            
        } catch (error) {
            console.error('📝 Booking submission error:', error);
            this.showErrorMessage('An error occurred while processing your booking. Please try again.');
        } finally {
            this.isSubmitting = false;
        }
    }

    extractFormData() {
        const formData = {
            clientName: this.getFieldValue('clientName').trim(),
            email: this.getFieldValue('email').trim(),
            phone: this.getFieldValue('phone').trim(),
            service: this.getFieldValue('service'),
            date: this.getFieldValue('date'),
            time: this.getFieldValue('time'),
            notes: this.getFieldValue('notes'),
            price: this.getFieldValue('totalPrice') || '0'
        };
        
        // Add computed fields
        formData.timestamp = new Date().toISOString();
        formData.source = 'booking_form';
        
        return formData;
    }

    getFieldValue(fieldId) {
        const element = document.getElementById(fieldId);
        if (!element) {
            console.warn(`📝 Field ${fieldId} not found`);
            return '';
        }
        return element.value || element.textContent || '';
    }

    validateFormData(formData) {
        const errors = [];
        
        for (const [fieldName, rules] of Object.entries(this.formValidationRules)) {
            const value = formData[fieldName];
            
            // Check required fields
            if (rules.required && (!value || value.trim() === '')) {
                errors.push({ field: fieldName, message: `${this.getFieldLabel(fieldName)} is required` });
                continue;
            }
            
            // Skip other validations if field is empty and not required
            if (!value) continue;
            
            // Check pattern validation
            if (rules.pattern && !rules.pattern.test(value)) {
                errors.push({ field: fieldName, message: rules.message });
                continue;
            }
            
            // Check minimum length
            if (rules.minLength && value.length < rules.minLength) {
                errors.push({ field: fieldName, message: `${this.getFieldLabel(fieldName)} must be at least ${rules.minLength} characters` });
                continue;
            }
            
            // Check custom validation
            if (rules.validate && !rules.validate(value)) {
                errors.push({ field: fieldName, message: rules.message });
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    getFieldLabel(fieldName) {
        const labels = {
            clientName: 'Name',
            email: 'Email',
            phone: 'Phone',
            service: 'Service',
            date: 'Date',
            time: 'Time'
        };
        return labels[fieldName] || fieldName;
    }

    showValidationErrors(errors) {
        // Clear previous errors
        this.clearValidationErrors();
        
        // Show errors
        errors.forEach(error => {
            this.showFieldError(error.field, error.message);
        });
        
        // Focus on first error field
        if (errors.length > 0) {
            const firstErrorField = document.getElementById(errors[0].field);
            if (firstErrorField) {
                firstErrorField.focus();
            }
        }
    }

    showFieldError(fieldName, message) {
        const field = document.getElementById(fieldName);
        if (!field) return;
        
        // Add error class
        field.classList.add('error');
        
        // Create or update error message
        let errorElement = document.getElementById(`${fieldName}-error`);
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = `${fieldName}-error`;
            errorElement.className = 'field-error';
            field.parentNode.insertBefore(errorElement, field.nextSibling);
        }
        
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    clearValidationErrors() {
        // Remove error classes
        document.querySelectorAll('.error').forEach(field => {
            field.classList.remove('error');
        });
        
        // Hide error messages
        document.querySelectorAll('.field-error').forEach(error => {
            error.style.display = 'none';
        });
    }

    async checkAuthenticationStatus() {
        try {
            // Check if user is already authenticated
            const currentUser = window.getCurrentUser ? window.getCurrentUser() : null;
            
            if (currentUser) {
                return {
                    isAuthenticated: true,
                    user: currentUser
                };
            }
            
            // Check session validity
            if (window.validateSessionSecure) {
                const sessionUser = await window.validateSessionSecure();
                if (sessionUser) {
                    return {
                        isAuthenticated: true,
                        user: sessionUser
                    };
                }
            }
            
            return { isAuthenticated: false };
            
        } catch (error) {
            console.warn('📝 Auth check error:', error);
            return { isAuthenticated: false };
        }
    }

    async processAuthenticatedBooking(formData, user) {
        try {
            console.log('📝 Processing authenticated booking for user:', user.email);
            
            // Add user information to booking data
            const bookingData = {
                ...formData,
                userId: user.id,
                userEmail: user.email,
                userName: user.name || formData.clientName,
                status: 'pending',
                paymentStatus: 'pending'
            };
            
            // Save appointment using data persistence layer
            const savedAppointment = await window.addAppointment(bookingData);
            
            if (savedAppointment) {
                console.log('📝 Appointment saved successfully:', savedAppointment.id);
                
                // Trigger email notification
                if (window.OptimizedEmailAutomation) {
                    window.OptimizedEmailAutomation.triggerEvent('appointment_created', {
                        ...bookingData,
                        appointmentId: savedAppointment.id
                    });
                }
                
                // Show payment modal
                this.showPaymentModal(savedAppointment);
            } else {
                throw new Error('Failed to save appointment');
            }
            
        } catch (error) {
            console.error('📝 Authenticated booking error:', error);
            this.showErrorMessage('Failed to process your booking. Please try again.');
        }
    }

    showAuthenticationModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'block';
            modal.classList.add('show');
            
            // Store booking context in session storage
            sessionStorage.setItem('pendingBooking', JSON.stringify(this.pendingBookingData));
            
            console.log('📝 Authentication modal shown');
        } else {
            console.error('📝 Auth modal not found');
            this.showErrorMessage('Please log in to complete your booking.');
        }
    }

    showPaymentModal(appointment) {
        // Show payment processing modal
        const paymentModal = document.getElementById('paymentModal');
        if (paymentModal) {
            paymentModal.style.display = 'block';
            paymentModal.classList.add('show');
            
            // Trigger payment flow
            this.initializePaymentFlow(appointment);
            
            console.log('📝 Payment modal shown for appointment:', appointment.id);
        } else {
            console.error('📝 Payment modal not found');
            this.showSuccessMessage('Booking confirmed! You will receive payment instructions via email.');
        }
    }

    async initializePaymentFlow(appointment) {
        try {
            // Initialize Stripe payment if available
            if (window.stripe && window.initializePayment) {
                await window.initializePayment(appointment);
            } else {
                console.log('📝 Stripe not available, showing manual payment options');
                this.showManualPaymentOptions(appointment);
            }
        } catch (error) {
            console.error('📝 Payment initialization error:', error);
            this.showManualPaymentOptions(appointment);
        }
    }

    showManualPaymentOptions(appointment) {
        const paymentContent = document.getElementById('paymentContent');
        if (paymentContent) {
            paymentContent.innerHTML = `
                <h3>Booking Confirmed!</h3>
                <p>Your appointment has been scheduled. Please choose a payment method:</p>
                <div class="payment-options">
                    <button onclick="bookingFormHandler.handlePaymentOnSite()" class="btn-primary">
                        Pay at Appointment
                    </button>
                    <button onclick="bookingFormHandler.handleCallToPay()" class="btn-secondary">
                        Call to Pay: (734) 421-2000
                    </button>
                </div>
            `;
        }
    }

    handlePaymentOnSite() {
        this.showSuccessMessage('Booking confirmed! You can pay at your appointment.');
        this.closeAllModals();
    }

    handleCallToPay() {
        this.showSuccessMessage('Booking confirmed! Please call (734) 421-2000 to complete payment.');
        this.closeAllModals();
    }

    closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
            modal.classList.remove('show');
        });
    }

    showErrorMessage(message) {
        this.showMessage(message, 'error');
    }

    showSuccessMessage(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type = 'info') {
        // Create or update message element
        let messageEl = document.getElementById('booking-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'booking-message';
            messageEl.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                font-weight: bold;
                z-index: 10000;
                max-width: 400px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            `;
            document.body.appendChild(messageEl);
        }
        
        // Set message and style based on type
        messageEl.textContent = message;
        messageEl.className = `message-${type}`;
        
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        
        messageEl.style.backgroundColor = colors[type] || colors.info;
        messageEl.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.style.display = 'none';
            }
        }, 5000);
    }

    // Public API methods
    reset() {
        this.isSubmitting = false;
        this.pendingBookingData = null;
        this.clearValidationErrors();
        console.log('📝 Booking form handler reset');
    }

    getBookingData() {
        return this.pendingBookingData;
    }
}

// Create global instance
window.bookingFormHandler = new BookingFormHandler();

// Global function for form submission (for HTML onclick compatibility)
window.handleBookingSubmit = function(event) {
    return window.bookingFormHandler.handleBookingSubmit(event);
};

console.log('📝 Booking Form Handler module loaded');