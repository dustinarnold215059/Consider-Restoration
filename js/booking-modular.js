// Modular Booking System Main Controller
// Coordinates all booking modules and provides unified interface
console.log('📅 Modular Booking System loading...');

class ModularBookingSystem {
    constructor() {
        this.modules = new Map();
        this.initialized = false;
        this.config = {
            enableEmailNotifications: true,
            enablePaymentProcessing: true,
            enableAnalytics: false, // Disabled for performance
            enableSocialSharing: false // Disabled for privacy
        };
        
        console.log('📅 ModularBookingSystem created');
    }

    async initialize() {
        if (this.initialized) {
            console.log('📅 Booking system already initialized');
            return;
        }

        console.log('📅 Initializing Modular Booking System...');

        try {
            // Wait for required dependencies
            await this.waitForDependencies();
            
            // Initialize core modules
            await this.initializeModules();
            
            // Setup global event handlers
            this.setupGlobalEventHandlers();
            
            // Setup page-specific initialization
            this.setupPageInitialization();
            
            this.initialized = true;
            console.log('✅ Modular Booking System initialized successfully');
            
            // Dispatch ready event
            window.dispatchEvent(new CustomEvent('bookingSystemReady'));
            
        } catch (error) {
            console.error('❌ Booking system initialization failed:', error);
            this.initializeFallbackMode();
        }
    }

    async waitForDependencies() {
        const dependencies = [
            'window.dataPersistence',
            'window.apiClient',
            'window.bookingFormHandler',
            'window.bookingUIManager'
        ];

        for (const dep of dependencies) {
            await this.waitForGlobal(dep, 5000); // 5 second timeout
        }
    }

    async waitForGlobal(globalPath, timeout = 3000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (this.getNestedProperty(window, globalPath)) {
                console.log(`📅 Dependency ready: ${globalPath}`);
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.warn(`📅 Dependency timeout: ${globalPath}`);
    }

    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, prop) => {
            return current && current[prop];
        }, obj);
    }

    async initializeModules() {
        // Register form handler module
        if (window.bookingFormHandler) {
            this.modules.set('formHandler', window.bookingFormHandler);
            console.log('📅 Form handler module registered');
        }

        // Register UI manager module
        if (window.bookingUIManager) {
            this.modules.set('uiManager', window.bookingUIManager);
            console.log('📅 UI manager module registered');
        }

        // Initialize payment module if available
        if (window.stripe && this.config.enablePaymentProcessing) {
            await this.initializePaymentModule();
        }

        // Initialize email notifications if configured
        if (this.config.enableEmailNotifications && window.OptimizedEmailAutomation) {
            this.modules.set('emailAutomation', window.OptimizedEmailAutomation);
            console.log('📅 Email automation module registered');
        }
    }

    async initializePaymentModule() {
        try {
            const paymentModule = {
                stripe: window.stripe,
                elements: null,
                card: null,
                initialized: false
            };

            // Initialize Stripe elements
            paymentModule.elements = paymentModule.stripe.elements();
            paymentModule.card = paymentModule.elements.create('card');
            
            // Mount card element when payment modal is shown
            document.addEventListener('modalShown', (event) => {
                if (event.target.id === 'paymentModal') {
                    this.mountCardElement(paymentModule);
                }
            });

            paymentModule.initialized = true;
            this.modules.set('payment', paymentModule);
            console.log('📅 Payment module initialized');
            
        } catch (error) {
            console.warn('📅 Payment module initialization failed:', error);
        }
    }

    mountCardElement(paymentModule) {
        const cardContainer = document.getElementById('card-element');
        if (cardContainer && paymentModule.card) {
            paymentModule.card.mount('#card-element');
            console.log('📅 Stripe card element mounted');
        }
    }

    setupGlobalEventHandlers() {
        // Form submission handler
        document.addEventListener('submit', (event) => {
            if (event.target.id === 'bookingForm') {
                event.preventDefault();
                this.handleBookingSubmission(event);
            }
        });

        // Service selection changes
        document.addEventListener('change', (event) => {
            if (event.target.id === 'service') {
                this.handleServiceChange(event.target.value);
            }
        });

        // Date selection changes  
        document.addEventListener('change', (event) => {
            if (event.target.id === 'date') {
                this.handleDateChange(event.target.value);
            }
        });

        // Auth modal handlers
        document.addEventListener('click', (event) => {
            if (event.target.matches('.auth-tab')) {
                this.handleAuthTabSwitch(event.target);
            }
        });

        // Payment handlers
        document.addEventListener('click', (event) => {
            if (event.target.id === 'confirmPayment') {
                this.handlePaymentConfirmation();
            }
        });

        console.log('📅 Global event handlers setup');
    }

    setupPageInitialization() {
        // Initialize form validation
        this.initializeFormValidation();
        
        // Setup service pricing
        this.initializeServicePricing();
        
        // Setup calendar availability
        this.initializeCalendarAvailability();
        
        // Setup progress tracking
        // this.initializeProgressTracking(); // Temporarily disabled - no CSS styling available
        
        console.log('📅 Page-specific initialization complete');
    }

    initializeFormValidation() {
        const requiredFields = ['clientName', 'email', 'phone', 'service', 'date', 'time'];
        
        requiredFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('blur', () => {
                    this.validateField(field);
                });
            }
        });
    }

    validateField(field) {
        const formHandler = this.modules.get('formHandler');
        if (formHandler && formHandler.validateFieldRealTime) {
            formHandler.validateFieldRealTime(field);
        }
    }

    initializeServicePricing() {
        const serviceSelect = document.getElementById('service');
        if (serviceSelect) {
            // Set initial price if service is pre-selected
            if (serviceSelect.value) {
                this.handleServiceChange(serviceSelect.value);
            }
        }
    }

    initializeCalendarAvailability() {
        const dateInput = document.getElementById('date');
        if (dateInput) {
            // Set minimum date to today
            const today = new Date().toISOString().split('T')[0];
            dateInput.min = today;
            
            // Set maximum date to 60 days from now
            const maxDate = new Date();
            maxDate.setDate(maxDate.getDate() + 60);
            dateInput.max = maxDate.toISOString().split('T')[0];
        }
    }

    initializeProgressTracking() {
        const uiManager = this.modules.get('uiManager');
        if (uiManager && uiManager.showProgressBar) {
            const steps = ['Select Service', 'Choose Date & Time', 'Enter Details', 'Authentication', 'Payment'];
            uiManager.showProgressBar(steps, 0);
        }
    }

    // Event Handlers
    async handleBookingSubmission(event) {
        console.log('📅 Booking submission triggered');
        
        const formHandler = this.modules.get('formHandler');
        if (formHandler && formHandler.handleBookingSubmit) {
            try {
                await formHandler.handleBookingSubmit(event);
            } catch (error) {
                console.error('📅 Booking submission failed:', error);
                this.showErrorMessage('Booking submission failed. Please try again.');
            }
        } else {
            console.error('📅 Form handler not available');
            this.showErrorMessage('Booking system unavailable. Please try again later.');
        }
    }

    handleServiceChange(serviceValue) {
        const uiManager = this.modules.get('uiManager');
        if (uiManager && uiManager.updateServiceDetails) {
            uiManager.updateServiceDetails(serviceValue);
        }
        
        // Update progress
        this.updateProgress(1);
    }

    async handleDateChange(dateValue) {
        const uiManager = this.modules.get('uiManager');
        if (uiManager && uiManager.updateAvailableTimes) {
            await uiManager.updateAvailableTimes(dateValue);
        }
        
        // Update progress
        this.updateProgress(2);
    }

    handleAuthTabSwitch(tabElement) {
        const tabName = tabElement.dataset.tab;
        
        // Update tab styling
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        tabElement.classList.add('active');
        
        // Show corresponding form
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        
        const targetForm = document.getElementById(`${tabName}Form`);
        if (targetForm) {
            targetForm.classList.add('active');
        }
        
        console.log('📅 Auth tab switched to:', tabName);
    }

    async handlePaymentConfirmation() {
        const paymentModule = this.modules.get('payment');
        if (!paymentModule || !paymentModule.initialized) {
            console.log('📅 Payment processing not available, using fallback');
            this.handlePaymentFallback();
            return;
        }

        try {
            console.log('📅 Processing payment...');
            
            // Create payment intent
            const result = await paymentModule.stripe.confirmCardPayment(
                paymentModule.clientSecret,
                {
                    payment_method: {
                        card: paymentModule.card,
                        billing_details: {
                            name: document.getElementById('clientName').value,
                            email: document.getElementById('email').value
                        }
                    }
                }
            );

            if (result.error) {
                throw new Error(result.error.message);
            }

            // Payment successful
            this.handlePaymentSuccess(result.paymentIntent);
            
        } catch (error) {
            console.error('📅 Payment failed:', error);
            this.showErrorMessage('Payment failed: ' + error.message);
        }
    }

    handlePaymentFallback() {
        // Handle payment without Stripe
        this.showSuccessMessage('Booking confirmed! You can pay at your appointment or call to pay.');
        this.closeAllModals();
        this.completeBookingFlow();
    }

    handlePaymentSuccess(paymentIntent) {
        console.log('📅 Payment successful:', paymentIntent.id);
        
        // Update appointment with payment information
        const bookingData = window.pendingBookingData;
        if (bookingData) {
            bookingData.paymentStatus = 'completed';
            bookingData.paymentId = paymentIntent.id;
        }
        
        // Show success message
        this.showSuccessMessage('Payment successful! Your appointment is confirmed.');
        
        // Close modals and complete flow
        this.closeAllModals();
        this.completeBookingFlow();
        
        // Send confirmation email
        this.sendConfirmationEmail(bookingData);
    }

    async sendConfirmationEmail(bookingData) {
        const emailModule = this.modules.get('emailAutomation');
        if (emailModule && emailModule.triggerEvent) {
            emailModule.triggerEvent('appointment_confirmed', {
                ...bookingData,
                confirmationCode: this.generateConfirmationCode()
            });
        }
    }

    generateConfirmationCode() {
        return 'CR' + Date.now().toString().slice(-6) + Math.random().toString(36).substr(2, 3).toUpperCase();
    }

    completeBookingFlow() {
        // Reset form
        const form = document.getElementById('bookingForm');
        if (form) {
            form.reset();
        }

        // Reset progress
        this.updateProgress(0);
        
        // Clear pending data
        window.pendingBookingData = null;
        
        // Reset form handler
        const formHandler = this.modules.get('formHandler');
        if (formHandler && formHandler.reset) {
            formHandler.reset();
        }
        
        console.log('📅 Booking flow completed');
    }

    updateProgress(step) {
        const uiManager = this.modules.get('uiManager');
        if (uiManager && uiManager.updateProgress) {
            uiManager.updateProgress(step);
        }
    }

    closeAllModals() {
        const uiManager = this.modules.get('uiManager');
        if (uiManager && uiManager.closeAllModals) {
            uiManager.closeAllModals();
        }
    }

    showErrorMessage(message) {
        const uiManager = this.modules.get('uiManager');
        if (uiManager && uiManager.showNotification) {
            uiManager.showNotification(message, 'error');
        } else {
            alert(message); // Fallback
        }
    }

    showSuccessMessage(message) {
        const uiManager = this.modules.get('uiManager');
        if (uiManager && uiManager.showNotification) {
            uiManager.showNotification(message, 'success');
        } else {
            alert(message); // Fallback
        }
    }

    initializeFallbackMode() {
        console.log('📅 Initializing fallback mode');
        
        // Provide basic functionality without modules
        window.handleBookingSubmit = (event) => {
            event.preventDefault();
            alert('Booking system is temporarily unavailable. Please call (734) 421-2000 to book your appointment.');
        };
        
        this.initialized = true;
    }

    // Public API
    getModule(moduleName) {
        return this.modules.get(moduleName);
    }

    isInitialized() {
        return this.initialized;
    }

    getConfig() {
        return { ...this.config };
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('📅 Configuration updated:', this.config);
    }
}

// Create and initialize global instance
window.modularBookingSystem = new ModularBookingSystem();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => window.modularBookingSystem.initialize(), 100);
    });
} else {
    setTimeout(() => window.modularBookingSystem.initialize(), 100);
}

// Global functions for backward compatibility
window.handleBookingSubmit = function(event) {
    if (window.modularBookingSystem && window.modularBookingSystem.isInitialized()) {
        return window.modularBookingSystem.handleBookingSubmission(event);
    } else {
        // Fallback for legacy code
        event.preventDefault();
        console.warn('📅 Booking system not ready, using fallback');
        alert('Please wait for the booking system to load and try again.');
    }
};

console.log('📅 Modular Booking System loaded');