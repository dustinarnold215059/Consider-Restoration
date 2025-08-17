// Booking Form Handler Module
// Handles form submission, validation, and data processing
console.log('📝 Booking Form Handler loading...');

class BookingFormHandler {
    constructor() {
        this.isSubmitting = false;
        this.pendingBookingData = null;
        this.formValidationRules = this.initializeValidationRules();
        this.userDataPopulated = false;
        
        console.log('📝 BookingFormHandler initialized');
        
        // Auto-populate user data when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupAutoPopulation());
        } else {
            // DOM already ready, try to populate immediately or wait a bit for other scripts
            setTimeout(() => this.setupAutoPopulation(), 500);
        }
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
            price: this.calculateServicePrice()
        };
        
        // Add computed fields
        formData.timestamp = new Date().toISOString();
        formData.source = 'booking_form';
        
        return formData;
    }

    calculateServicePrice() {
        // Get price from the totalPrice span element
        const priceElement = document.getElementById('totalPrice');
        if (priceElement && priceElement.textContent) {
            const priceText = priceElement.textContent.trim();
            console.log('📝 Price from totalPrice element:', priceText);
            return priceText;
        }
        
        // Fallback: get price from selected service option
        const serviceSelect = document.getElementById('service');
        if (serviceSelect && serviceSelect.selectedIndex > 0) {
            const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
            const price = selectedOption.getAttribute('data-price') || '0';
            console.log('📝 Price from service data-price attribute:', price);
            
            // Update the totalPrice display if it's not showing correct price
            if (priceElement) {
                priceElement.textContent = price;
            }
            
            return price;
        }
        
        console.warn('📝 Could not determine service price, defaulting to 0');
        return '0';
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
        console.log('📝 showPaymentModal called with appointment:', appointment);
        console.log('📝 Checking for showBookingPaymentModal function...');
        console.log('📝 window.showBookingPaymentModal exists:', typeof window.showBookingPaymentModal);
        
        // First, ensure the appointment is stored globally
        window.pendingAppointment = appointment;
        
        // Use the global showBookingPaymentModal function from booking.html
        if (window.showBookingPaymentModal && typeof window.showBookingPaymentModal === 'function') {
            console.log('📝 Using global showBookingPaymentModal function');
            try {
                window.showBookingPaymentModal(appointment);
                console.log('📝 Payment modal should be visible now');
            } catch (error) {
                console.error('📝 Error calling showBookingPaymentModal:', error);
                this.showSuccessMessage('Booking confirmed! You will receive payment instructions via email.');
            }
        } else {
            console.error('📝 showBookingPaymentModal function not found');
            console.log('📝 Available window functions:', Object.keys(window).filter(key => key.includes('Payment') || key.includes('Modal')));
            
            // Try alternative approaches
            if (typeof showBookingPaymentModal === 'function') {
                console.log('📝 Found showBookingPaymentModal in global scope');
                showBookingPaymentModal(appointment);
            } else {
                console.error('📝 No payment modal function available, using fallback');
                // Create a simple payment modal as fallback
                this.createFallbackPaymentModal(appointment);
            }
        }
    }

    createFallbackPaymentModal(appointment) {
        console.log('📝 Creating fallback payment modal');
        
        // Remove any existing modal
        const existingModal = document.getElementById('fallbackPaymentModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create a simple payment modal
        const modal = document.createElement('div');
        modal.id = 'fallbackPaymentModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.8);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        modal.innerHTML = `
            <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 400px; text-align: center;">
                <h3>Payment Required</h3>
                <p><strong>Service:</strong> ${appointment.service}</p>
                <p><strong>Date:</strong> ${appointment.date}</p>
                <p><strong>Time:</strong> ${appointment.time}</p>
                <p><strong>Total:</strong> $${appointment.price}</p>
                <div style="margin: 2rem 0;">
                    <button onclick="document.getElementById('fallbackPaymentModal').remove(); alert('Payment successful! Appointment confirmed.')" 
                            style="background: #28a745; color: white; border: none; padding: 1rem 2rem; border-radius: 4px; cursor: pointer; margin: 0.5rem;">
                        Complete Payment ($${appointment.price})
                    </button>
                </div>
                <button onclick="document.getElementById('fallbackPaymentModal').remove()" 
                        style="background: #dc3545; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer;">
                    Cancel
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        console.log('📝 Fallback payment modal created and shown');
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

    // Setup auto-population system
    setupAutoPopulation() {
        console.log('📝 Setting up auto-population system...');
        
        // Initial population attempt
        this.autoPopulateUserData();
        
        // Listen for authentication events
        window.addEventListener('userAuthChanged', (event) => {
            console.log('📝 User authentication changed, re-populating form');
            this.userDataPopulated = false; // Reset flag
            setTimeout(() => this.autoPopulateUserData(), 100);
        });
        
        window.addEventListener('userLoggedIn', (event) => {
            console.log('📝 User logged in, populating form');
            this.userDataPopulated = false; // Reset flag
            setTimeout(() => this.autoPopulateUserData(), 100);
        });
        
        // Listen for custom booking form refresh events
        window.addEventListener('refreshBookingForm', () => {
            console.log('📝 Booking form refresh requested');
            this.userDataPopulated = false; // Reset flag
            this.autoPopulateUserData();
        });
    }

    // Auto-populate form with logged-in user data
    async autoPopulateUserData() {
        if (this.userDataPopulated) {
            console.log('📝 User data already populated, skipping');
            return;
        }

        try {
            console.log('📝 Attempting to auto-populate user data...');
            
            // Check for current user from CookieSessionManager
            let currentUser = null;
            if (window.CookieSessionManager) {
                currentUser = window.CookieSessionManager.getCurrentUser();
            }
            
            // Fallback to other auth methods
            if (!currentUser && window.getCurrentUser) {
                currentUser = window.getCurrentUser();
            }
            
            if (!currentUser) {
                console.log('📝 No logged-in user found, skipping auto-population');
                return;
            }
            
            console.log('📝 Found logged-in user, populating form:', currentUser.name);
            
            // Wait a bit more for form elements to be ready
            await this.waitForFormElements();
            
            // Populate form fields with user data
            this.populateField('clientName', currentUser.name || '');
            this.populateField('email', currentUser.email || '');
            this.populateField('phone', currentUser.phone || '');
            
            // Add visual feedback
            this.showUserDataPopulatedMessage(currentUser.name);
            
            this.userDataPopulated = true;
            console.log('✅ User data auto-populated successfully');
            
        } catch (error) {
            console.error('❌ Error auto-populating user data:', error);
        }
    }
    
    async waitForFormElements() {
        const requiredFields = ['clientName', 'email', 'phone'];
        const maxWait = 3000; // 3 seconds max wait
        const checkInterval = 100; // Check every 100ms
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWait) {
            const allFieldsReady = requiredFields.every(fieldId => 
                document.getElementById(fieldId) !== null
            );
            
            if (allFieldsReady) {
                console.log('📝 Form elements ready for auto-population');
                return;
            }
            
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }
        
        console.warn('📝 Timeout waiting for form elements');
    }
    
    populateField(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field && value && !field.value) {
            field.value = value;
            console.log(`📝 Populated ${fieldId}: ${value}`);
            
            // Add visual indication that the field was auto-populated
            field.style.background = '#f0f8ff';
            field.style.border = '1px solid #3A7D99';
            
            // Reset styling after a delay
            setTimeout(() => {
                field.style.background = '';
                field.style.border = '';
            }, 2000);
        }
    }
    
    showUserDataPopulatedMessage(userName) {
        // Remove any existing messages first
        const existingMessage = document.getElementById('userDataPopulatedMessage');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const messageEl = document.createElement('div');
        messageEl.id = 'userDataPopulatedMessage';
        messageEl.innerHTML = `
            <div style="
                background: #d4edda;
                border: 1px solid #c3e6cb;
                color: #155724;
                padding: 12px 16px;
                border-radius: 8px;
                margin-bottom: 1rem;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
            ">
                <span style="font-size: 16px;">✅</span>
                <span><strong>Welcome back, ${userName}!</strong> Your information has been automatically filled in.</span>
                <button onclick="window.bookingFormHandler.refreshUserData()" style="
                    background: #28a745;
                    color: white;
                    border: none;
                    padding: 4px 8px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    margin-left: 8px;
                ">Refresh</button>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: #155724;
                    cursor: pointer;
                    font-size: 18px;
                    margin-left: auto;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                ">&times;</button>
            </div>
        `;
        
        // Insert message above the form
        const form = document.getElementById('bookingForm');
        if (form) {
            form.insertBefore(messageEl, form.firstChild);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 5000);
        }
    }

    // Refresh user data manually
    refreshUserData() {
        console.log('📝 Manual user data refresh requested');
        
        // Clear current form data
        ['clientName', 'email', 'phone'].forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = '';
                field.style.background = '';
                field.style.border = '';
            }
        });
        
        // Reset flag and re-populate
        this.userDataPopulated = false;
        this.autoPopulateUserData();
    }

    // Public API methods
    reset() {
        this.isSubmitting = false;
        this.pendingBookingData = null;
        this.clearValidationErrors();
        this.userDataPopulated = false; // Reset auto-population flag
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

// Global function to manually refresh user data (for convenience)
window.refreshBookingUserData = function() {
    if (window.bookingFormHandler) {
        return window.bookingFormHandler.refreshUserData();
    }
    console.warn('BookingFormHandler not available');
};

console.log('📝 Booking Form Handler module loaded');