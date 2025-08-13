// Booking System Module
export class BookingSystem {
    constructor() {
        this.currentStep = 1;
        this.maxSteps = 4;
        this.bookingData = {};
        this.selectedService = null;
        this.selectedDateTime = null;
        this.stripe = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        console.log('📅 Initializing Booking System...');
        
        try {
            await this.loadServices();
            await this.initializeStripe();
            this.setupEventListeners();
            this.initializeCalendar();
            this.setupFormValidation();
            this.initialized = true;
            
            console.log('✅ Booking System initialized successfully');
        } catch (error) {
            console.error('❌ Booking System initialization failed:', error);
        }
    }

    async loadServices() {
        try {
            // Load services from API or fallback to static data
            if (window.apiClient) {
                this.services = await window.apiClient.getServices();
            } else {
                this.services = this.getDefaultServices();
            }
            
            this.renderServiceSelection();
        } catch (error) {
            console.warn('Using default services:', error);
            this.services = this.getDefaultServices();
            this.renderServiceSelection();
        }
    }

    getDefaultServices() {
        return [
            {
                id: 1,
                name: 'Swedish Massage',
                duration: 60,
                price: 80,
                description: 'Relaxing full-body massage using long, flowing strokes'
            },
            {
                id: 2,
                name: 'Deep Tissue Massage',
                duration: 60,
                price: 90,
                description: 'Therapeutic massage targeting deeper muscle layers'
            },
            {
                id: 3,
                name: 'Hot Stone Massage',
                duration: 90,
                price: 120,
                description: 'Relaxing massage using heated stones'
            },
            {
                id: 4,
                name: 'Prenatal Massage',
                duration: 60,
                price: 85,
                description: 'Specialized massage for expecting mothers'
            },
            {
                id: 5,
                name: 'Applied Neurology',
                duration: 90,
                price: 110,
                description: 'Specialized technique for pain management'
            }
        ];
    }

    async initializeStripe() {
        if (window.Stripe) {
            const publishableKey = 'pk_test_your_stripe_key_here'; // Replace with actual key
            this.stripe = window.Stripe(publishableKey);
        } else {
            console.warn('Stripe not loaded, payment functionality disabled');
        }
    }

    renderServiceSelection() {
        const container = document.getElementById('serviceSelection');
        if (!container) return;

        container.innerHTML = `
            <div class="services-grid">
                ${this.services.map(service => `
                    <div class="service-card" data-service-id="${service.id}">
                        <div class="service-header">
                            <h3 class="service-name">${service.name}</h3>
                            <div class="service-price">$${service.price}</div>
                        </div>
                        <div class="service-details">
                            <div class="service-duration">${service.duration} minutes</div>
                            <div class="service-description">${service.description}</div>
                        </div>
                        <button class="select-service-btn" data-service-id="${service.id}">
                            Select Service
                        </button>
                    </div>
                `).join('')}
            </div>
        `;

        // Add click handlers for service selection
        container.querySelectorAll('.select-service-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const serviceId = parseInt(e.target.dataset.serviceId);
                this.selectService(serviceId);
            });
        });
    }

    selectService(serviceId) {
        this.selectedService = this.services.find(s => s.id === serviceId);
        this.bookingData.serviceId = serviceId;
        this.bookingData.service = this.selectedService.name;
        this.bookingData.price = this.selectedService.price;
        this.bookingData.duration = this.selectedService.duration;

        console.log('✅ Service selected:', this.selectedService.name);
        this.nextStep();
    }

    initializeCalendar() {
        const calendar = document.getElementById('bookingCalendar');
        if (!calendar) return;

        this.renderCalendar();
    }

    renderCalendar() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const calendar = document.getElementById('bookingCalendar');
        if (!calendar) return;

        // Generate calendar HTML
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

        let calendarHTML = `
            <div class="calendar-header">
                <button id="prevMonth" class="calendar-nav">‹</button>
                <h3 class="calendar-title">${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
                <button id="nextMonth" class="calendar-nav">›</button>
            </div>
            <div class="calendar-grid">
                <div class="calendar-weekdays">
                    <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                </div>
                <div class="calendar-days">
        `;

        // Empty cells for days before month starts
        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarHTML += '<div class="calendar-day empty"></div>';
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentYear, currentMonth, day);
            const isToday = date.toDateString() === now.toDateString();
            const isPast = date < now;
            const isAvailable = this.isDateAvailable(date);

            calendarHTML += `
                <div class="calendar-day ${isToday ? 'today' : ''} ${isPast ? 'past' : ''} ${isAvailable ? 'available' : 'unavailable'}" 
                     data-date="${date.toISOString().split('T')[0]}">
                    <span class="day-number">${day}</span>
                    ${isAvailable ? '<div class="availability-indicator"></div>' : ''}
                </div>
            `;
        }

        calendarHTML += '</div></div>';

        // Time slots section
        calendarHTML += `
            <div class="time-slots-section" id="timeSlots" style="display: none;">
                <h4>Available Times</h4>
                <div class="time-slots-grid" id="timeSlotsGrid">
                    <!-- Time slots will be populated when a date is selected -->
                </div>
            </div>
        `;

        calendar.innerHTML = calendarHTML;

        // Add event listeners
        this.setupCalendarEvents();
    }

    isDateAvailable(date) {
        // Check if date is not in the past and not a weekend (for demo)
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        if (date < now) return false;
        
        const dayOfWeek = date.getDay();
        return dayOfWeek !== 0 && dayOfWeek !== 6; // Not Sunday or Saturday
    }

    setupCalendarEvents() {
        // Date selection
        document.querySelectorAll('.calendar-day.available').forEach(day => {
            day.addEventListener('click', (e) => {
                const selectedDate = e.currentTarget.dataset.date;
                this.selectDate(selectedDate);
            });
        });

        // Calendar navigation
        const prevBtn = document.getElementById('prevMonth');
        const nextBtn = document.getElementById('nextMonth');
        
        if (prevBtn) prevBtn.addEventListener('click', () => this.previousMonth());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextMonth());
    }

    selectDate(dateString) {
        // Remove previous selection
        document.querySelectorAll('.calendar-day.selected').forEach(day => {
            day.classList.remove('selected');
        });

        // Add selection to clicked date
        const selectedDay = document.querySelector(`[data-date="${dateString}"]`);
        if (selectedDay) {
            selectedDay.classList.add('selected');
        }

        this.bookingData.date = dateString;
        this.loadAvailableTimeSlots(dateString);
    }

    async loadAvailableTimeSlots(date) {
        const timeSlotsSection = document.getElementById('timeSlots');
        const timeSlotsGrid = document.getElementById('timeSlotsGrid');
        
        if (!timeSlotsSection || !timeSlotsGrid) return;

        try {
            // Show loading state
            timeSlotsGrid.innerHTML = '<div class="loading">Loading available times...</div>';
            timeSlotsSection.style.display = 'block';

            // Get available time slots (from API or generate default)
            let availableSlots;
            if (window.apiClient) {
                availableSlots = await window.apiClient.getAvailableSlots(date);
            } else {
                availableSlots = this.getDefaultTimeSlots(date);
            }

            // Render time slots
            timeSlotsGrid.innerHTML = availableSlots.map(slot => `
                <button class="time-slot" data-time="${slot.time}" ${slot.available ? '' : 'disabled'}>
                    ${slot.time}
                </button>
            `).join('');

            // Add click handlers
            timeSlotsGrid.querySelectorAll('.time-slot:not([disabled])').forEach(slot => {
                slot.addEventListener('click', (e) => {
                    this.selectTimeSlot(e.target.dataset.time);
                });
            });

        } catch (error) {
            console.error('Failed to load time slots:', error);
            timeSlotsGrid.innerHTML = '<div class="error">Failed to load available times</div>';
        }
    }

    getDefaultTimeSlots(date) {
        const slots = [
            '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
            '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'
        ];

        return slots.map(time => ({
            time,
            available: Math.random() > 0.3 // 70% chance of being available
        }));
    }

    selectTimeSlot(time) {
        // Remove previous selection
        document.querySelectorAll('.time-slot.selected').forEach(slot => {
            slot.classList.remove('selected');
        });

        // Add selection to clicked time
        const selectedSlot = document.querySelector(`[data-time="${time}"]`);
        if (selectedSlot) {
            selectedSlot.classList.add('selected');
        }

        this.bookingData.time = time;
        this.selectedDateTime = `${this.bookingData.date} ${time}`;

        console.log('✅ Date and time selected:', this.selectedDateTime);
        
        // Enable next step
        this.enableNextStep();
    }

    setupEventListeners() {
        // Step navigation
        document.querySelectorAll('.next-step').forEach(btn => {
            btn.addEventListener('click', () => this.nextStep());
        });

        document.querySelectorAll('.prev-step').forEach(btn => {
            btn.addEventListener('click', () => this.previousStep());
        });

        // Form submission
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) {
            bookingForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }
    }

    setupFormValidation() {
        const form = document.getElementById('clientInfoForm');
        if (!form) return;

        const inputs = form.querySelectorAll('input[required]');
        inputs.forEach(input => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => this.clearFieldError(input));
        });
    }

    validateField(field) {
        const value = field.value.trim();
        const fieldName = field.name;
        let isValid = true;
        let errorMessage = '';

        switch (fieldName) {
            case 'name':
                if (value.length < 2) {
                    isValid = false;
                    errorMessage = 'Name must be at least 2 characters';
                }
                break;
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid email address';
                }
                break;
            case 'phone':
                const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
                if (!phoneRegex.test(value.replace(/\D/g, ''))) {
                    isValid = false;
                    errorMessage = 'Please enter a valid phone number';
                }
                break;
        }

        this.showFieldError(field, isValid ? '' : errorMessage);
        return isValid;
    }

    showFieldError(field, message) {
        const errorElement = field.parentNode.querySelector('.field-error');
        if (errorElement) {
            errorElement.textContent = message;
            field.classList.toggle('error', !!message);
        }
    }

    clearFieldError(field) {
        this.showFieldError(field, '');
    }

    nextStep() {
        if (this.currentStep < this.maxSteps) {
            this.hideStep(this.currentStep);
            this.currentStep++;
            this.showStep(this.currentStep);
            this.updateProgressBar();
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.hideStep(this.currentStep);
            this.currentStep--;
            this.showStep(this.currentStep);
            this.updateProgressBar();
        }
    }

    hideStep(stepNumber) {
        const step = document.querySelector(`.booking-step[data-step="${stepNumber}"]`);
        if (step) {
            step.classList.remove('active');
            step.style.display = 'none';
        }
    }

    showStep(stepNumber) {
        const step = document.querySelector(`.booking-step[data-step="${stepNumber}"]`);
        if (step) {
            step.style.display = 'block';
            setTimeout(() => step.classList.add('active'), 50);
        }
    }

    updateProgressBar() {
        const progressBar = document.querySelector('.booking-progress-bar');
        if (progressBar) {
            const progress = (this.currentStep / this.maxSteps) * 100;
            progressBar.style.width = `${progress}%`;
        }

        // Update step indicators
        document.querySelectorAll('.step-indicator').forEach((indicator, index) => {
            indicator.classList.toggle('active', index < this.currentStep);
            indicator.classList.toggle('current', index === this.currentStep - 1);
        });
    }

    enableNextStep() {
        const nextBtn = document.querySelector('.next-step:not([disabled])');
        if (nextBtn) {
            nextBtn.disabled = false;
            nextBtn.classList.add('enabled');
        }
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        console.log('📝 Processing booking submission...');
        
        try {
            // Collect form data
            const formData = new FormData(e.target);
            this.bookingData = {
                ...this.bookingData,
                ...Object.fromEntries(formData.entries())
            };

            // Validate booking data
            if (!this.validateBookingData()) {
                return;
            }

            // Process payment if Stripe is available
            if (this.stripe && this.bookingData.price > 0) {
                await this.processPayment();
            } else {
                await this.submitBooking();
            }

        } catch (error) {
            console.error('Booking submission failed:', error);
            this.showError('Failed to process booking. Please try again.');
        }
    }

    validateBookingData() {
        const required = ['service', 'date', 'time', 'name', 'email', 'phone'];
        const missing = required.filter(field => !this.bookingData[field]);

        if (missing.length > 0) {
            this.showError(`Missing required fields: ${missing.join(', ')}`);
            return false;
        }

        return true;
    }

    async processPayment() {
        console.log('💳 Processing payment...');
        
        try {
            // Create payment intent
            const paymentIntent = await window.apiClient.createPaymentIntent(
                this.bookingData.serviceId,
                this.bookingData.price
            );

            if (paymentIntent.requiresAction) {
                // Handle 3D Secure or other authentication
                const { error } = await this.stripe.confirmCardPayment(
                    paymentIntent.paymentIntent.client_secret
                );

                if (error) {
                    throw new Error(error.message);
                }
            }

            await this.submitBooking();
            
        } catch (error) {
            console.error('Payment processing failed:', error);
            this.showError('Payment failed: ' + error.message);
        }
    }

    async submitBooking() {
        console.log('📅 Submitting booking...');
        
        try {
            let response;
            
            if (window.apiClient) {
                response = await window.apiClient.createAppointment(this.bookingData);
            } else {
                // Fallback to client-side booking
                response = this.createClientSideBooking();
            }

            if (response.success !== false) {
                this.showBookingConfirmation(response);
            } else {
                throw new Error(response.error || 'Booking failed');
            }

        } catch (error) {
            console.error('Booking submission failed:', error);
            this.showError('Failed to create booking: ' + error.message);
        }
    }

    createClientSideBooking() {
        // Fallback booking creation for offline functionality
        const booking = {
            id: Date.now(),
            ...this.bookingData,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        // Store locally
        const bookings = JSON.parse(localStorage.getItem('pendingBookings') || '[]');
        bookings.push(booking);
        localStorage.setItem('pendingBookings', JSON.stringify(bookings));

        return { success: true, booking };
    }

    showBookingConfirmation(response) {
        const confirmation = document.getElementById('bookingConfirmation');
        if (confirmation) {
            confirmation.innerHTML = `
                <div class="confirmation-success">
                    <div class="success-icon">✅</div>
                    <h3>Booking Confirmed!</h3>
                    <div class="booking-details">
                        <p><strong>Service:</strong> ${this.bookingData.service}</p>
                        <p><strong>Date:</strong> ${new Date(this.bookingData.date).toLocaleDateString()}</p>
                        <p><strong>Time:</strong> ${this.bookingData.time}</p>
                        <p><strong>Client:</strong> ${this.bookingData.name}</p>
                        <p><strong>Email:</strong> ${this.bookingData.email}</p>
                    </div>
                    <p class="confirmation-note">
                        You will receive a confirmation email shortly.
                    </p>
                </div>
            `;
            
            this.nextStep(); // Move to confirmation step
        }
    }

    showError(message) {
        const errorElement = document.getElementById('bookingError');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        } else {
            alert(message); // Fallback
        }
    }

    previousMonth() {
        // Implementation for calendar navigation
        console.log('Previous month clicked');
    }

    nextMonth() {
        // Implementation for calendar navigation
        console.log('Next month clicked');
    }

    destroy() {
        this.initialized = false;
        // Clean up event listeners and intervals
    }
}

// Export for use in booking page
window.BookingSystem = BookingSystem;