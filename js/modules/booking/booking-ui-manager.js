// Booking UI Manager Module
// Handles UI interactions, modals, and visual feedback
console.log('🎨 Booking UI Manager loading...');

class BookingUIManager {
    constructor() {
        this.activeModal = null;
        this.modalStack = [];
        this.animationDuration = 300;
        
        this.initialize();
        console.log('🎨 BookingUIManager initialized');
    }

    initialize() {
        this.setupModalEventListeners();
        this.setupFormEnhancements();
        this.setupResponsiveHandlers();
    }

    setupModalEventListeners() {
        // Close modal when clicking overlay
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal')) {
                this.closeModal(event.target);
            }
        });

        // Close modal with escape key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && this.activeModal) {
                this.closeModal(this.activeModal);
            }
        });

        // Handle close buttons
        document.addEventListener('click', (event) => {
            if (event.target.matches('.modal-close, .close')) {
                const modal = event.target.closest('.modal');
                if (modal) {
                    this.closeModal(modal);
                }
            }
        });
    }

    setupFormEnhancements() {
        // Real-time validation feedback
        document.addEventListener('input', (event) => {
            if (event.target.matches('#clientName, #email, #phone')) {
                this.validateFieldRealTime(event.target);
            }
        });

        // Service selection enhancements
        const serviceSelect = document.getElementById('service');
        if (serviceSelect) {
            serviceSelect.addEventListener('change', (event) => {
                this.updateServiceDetails(event.target.value);
            });
        }

        // Date selection validation
        const dateInput = document.getElementById('date');
        if (dateInput) {
            dateInput.addEventListener('change', (event) => {
                this.updateAvailableTimes(event.target.value);
            });
        }
    }

    setupResponsiveHandlers() {
        // Handle viewport changes
        window.addEventListener('resize', this.debounce(() => {
            this.adjustModalSizing();
        }, 250));

        // Handle orientation changes on mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.adjustModalSizing(), 100);
        });
    }

    // Modal Management
    showModal(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error('🎨 Modal not found:', modalId);
            return false;
        }

        // Close current modal if different
        if (this.activeModal && this.activeModal !== modal) {
            this.closeModal(this.activeModal, { immediate: true });
        }

        // Add to stack
        this.modalStack.push(modal);
        this.activeModal = modal;

        // Apply options
        if (options.className) {
            modal.classList.add(options.className);
        }

        // Show modal with animation
        modal.style.display = 'block';
        modal.classList.add('show');

        // Focus management
        this.manageFocus(modal);

        // Trigger show event
        modal.dispatchEvent(new CustomEvent('modalShown', { detail: options }));

        console.log('🎨 Modal shown:', modalId);
        return true;
    }

    closeModal(modal, options = {}) {
        if (!modal || !modal.classList.contains('show')) {
            return;
        }

        // Remove from stack
        const index = this.modalStack.indexOf(modal);
        if (index > -1) {
            this.modalStack.splice(index, 1);
        }

        // Update active modal
        this.activeModal = this.modalStack[this.modalStack.length - 1] || null;

        // Hide modal
        if (options.immediate) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        } else {
            modal.classList.remove('show');
            setTimeout(() => {
                if (!modal.classList.contains('show')) {
                    modal.style.display = 'none';
                }
            }, this.animationDuration);
        }

        // Trigger close event
        modal.dispatchEvent(new CustomEvent('modalClosed'));

        console.log('🎨 Modal closed:', modal.id);
    }

    closeAllModals() {
        this.modalStack.forEach(modal => {
            this.closeModal(modal, { immediate: true });
        });
        this.modalStack = [];
        this.activeModal = null;
    }

    manageFocus(modal) {
        // Find first focusable element
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }

        // Trap focus within modal
        modal.addEventListener('keydown', (event) => {
            if (event.key === 'Tab') {
                this.trapFocus(event, focusableElements);
            }
        });
    }

    trapFocus(event, focusableElements) {
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
            if (document.activeElement === firstElement) {
                lastElement.focus();
                event.preventDefault();
            }
        } else {
            if (document.activeElement === lastElement) {
                firstElement.focus();
                event.preventDefault();
            }
        }
    }

    adjustModalSizing() {
        if (!this.activeModal) return;

        const modal = this.activeModal;
        const modalContent = modal.querySelector('.modal-content');
        
        if (modalContent) {
            const viewportHeight = window.innerHeight;
            const maxHeight = viewportHeight * 0.9; // 90% of viewport
            
            modalContent.style.maxHeight = `${maxHeight}px`;
            modalContent.style.overflowY = 'auto';
        }
    }

    // Form Enhancement Methods
    validateFieldRealTime(field) {
        // Clear previous validation
        field.classList.remove('error', 'valid');
        
        const errorElement = document.getElementById(`${field.id}-error`);
        if (errorElement) {
            errorElement.style.display = 'none';
        }

        // Skip validation if field is empty
        if (!field.value.trim()) {
            return;
        }

        // Validate based on field type
        let isValid = false;
        let message = '';

        switch (field.id) {
            case 'clientName':
                isValid = /^[a-zA-Z\s'-]+$/.test(field.value) && field.value.length >= 2;
                message = 'Please enter a valid name';
                break;
            case 'email':
                isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value);
                message = 'Please enter a valid email address';
                break;
            case 'phone':
                isValid = /^[\d\s\-\(\)\+\.]+$/.test(field.value) && field.value.replace(/\D/g, '').length >= 10;
                message = 'Please enter a valid phone number';
                break;
        }

        // Apply validation styling
        if (isValid) {
            field.classList.add('valid');
        } else {
            field.classList.add('error');
            if (errorElement) {
                errorElement.textContent = message;
                errorElement.style.display = 'block';
            }
        }
    }

    updateServiceDetails(serviceValue) {
        if (!serviceValue) return;

        const serviceDetails = this.getServiceDetails(serviceValue);
        
        // Update price display
        const totalPriceElement = document.getElementById('totalPrice');
        if (totalPriceElement && serviceDetails.price) {
            totalPriceElement.textContent = serviceDetails.price;
        }

        // Update service description
        const serviceDescElement = document.getElementById('serviceDescription');
        if (serviceDescElement && serviceDetails.description) {
            serviceDescElement.textContent = serviceDetails.description;
        }

        // Update duration display
        const durationElement = document.getElementById('serviceDuration');
        if (durationElement && serviceDetails.duration) {
            durationElement.textContent = `${serviceDetails.duration} minutes`;
        }

        console.log('🎨 Service details updated:', serviceValue);
    }

    getServiceDetails(serviceValue) {
        const services = {
            'swedish': {
                price: '80',
                duration: '60',
                description: 'Relaxing full-body massage using long, flowing strokes'
            },
            'deep-tissue': {
                price: '90',
                duration: '60',
                description: 'Focused pressure to release chronic muscle tension'
            },
            'hot-stone': {
                price: '100',
                duration: '75',
                description: 'Soothing massage with heated stones for deep relaxation'
            },
            'sports': {
                price: '85',
                duration: '60',
                description: 'Targeted massage for athletic performance and recovery'
            },
            'prenatal': {
                price: '85',
                duration: '60',
                description: 'Gentle massage specially designed for expectant mothers'
            }
        };

        return services[serviceValue] || { price: '80', duration: '60', description: '' };
    }

    async updateAvailableTimes(selectedDate) {
        if (!selectedDate) return;

        const timeSelect = document.getElementById('time');
        if (!timeSelect) return;

        try {
            // Show loading state
            timeSelect.innerHTML = '<option value="">Loading available times...</option>';
            timeSelect.disabled = true;

            // Get available times (mock implementation)
            const availableTimes = await this.fetchAvailableTimes(selectedDate);
            
            // Clear and populate time options
            timeSelect.innerHTML = '<option value="">Select a time</option>';
            
            availableTimes.forEach(time => {
                const option = document.createElement('option');
                option.value = time.value;
                option.textContent = time.display;
                timeSelect.appendChild(option);
            });

            timeSelect.disabled = false;
            console.log('🎨 Available times updated for:', selectedDate);

        } catch (error) {
            console.error('🎨 Error updating available times:', error);
            timeSelect.innerHTML = '<option value="">Error loading times</option>';
        }
    }

    async fetchAvailableTimes(date) {
        // Mock implementation - replace with actual API call
        return new Promise(resolve => {
            setTimeout(() => {
                const times = [
                    { value: '10:00', display: '10:00 AM' },
                    { value: '11:00', display: '11:00 AM' },
                    { value: '14:00', display: '2:00 PM' },
                    { value: '15:00', display: '3:00 PM' },
                    { value: '16:00', display: '4:00 PM' }
                ];
                resolve(times);
            }, 500);
        });
    }

    // Loading and Progress Indicators
    showLoadingSpinner(element, message = 'Loading...') {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) return;

        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.innerHTML = `
            <div class="spinner"></div>
            <div class="loading-message">${message}</div>
        `;
        
        element.appendChild(spinner);
        return spinner;
    }

    hideLoadingSpinner(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }
        
        if (!element) return;

        const spinner = element.querySelector('.loading-spinner');
        if (spinner) {
            spinner.remove();
        }
    }

    // Progress Bar
    showProgressBar(steps, currentStep = 0) {
        let progressBar = document.getElementById('booking-progress');
        
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.id = 'booking-progress';
            progressBar.className = 'progress-bar-container';
            
            const form = document.querySelector('.booking-form');
            if (form) {
                form.insertBefore(progressBar, form.firstChild);
            }
        }

        const progressHTML = steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const className = isActive ? 'active' : (isCompleted ? 'completed' : '');
            
            return `
                <div class="progress-step ${className}">
                    <div class="step-number">${index + 1}</div>
                    <div class="step-label">${step}</div>
                </div>
            `;
        }).join('');

        progressBar.innerHTML = `
            <div class="progress-steps">
                ${progressHTML}
            </div>
        `;
    }

    updateProgress(currentStep) {
        const steps = document.querySelectorAll('.progress-step');
        steps.forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index === currentStep) {
                step.classList.add('active');
            } else if (index < currentStep) {
                step.classList.add('completed');
            }
        });
    }

    // Utility Methods
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Notification System
    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Show with animation
        setTimeout(() => notification.classList.add('show'), 10);

        // Auto-hide
        const hideNotification = () => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        };

        // Hide on close button click
        notification.querySelector('.notification-close').addEventListener('click', hideNotification);

        // Auto-hide after duration
        if (duration > 0) {
            setTimeout(hideNotification, duration);
        }

        return notification;
    }

    // Accessibility Enhancements
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.position = 'absolute';
        announcement.style.left = '-10000px';
        announcement.style.width = '1px';
        announcement.style.height = '1px';
        announcement.style.overflow = 'hidden';
        
        document.body.appendChild(announcement);
        announcement.textContent = message;
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }
}

// Create global instance
window.bookingUIManager = new BookingUIManager();

// Global utility functions
window.showBookingModal = function(modalId, options) {
    return window.bookingUIManager.showModal(modalId, options);
};

window.closeBookingModal = function(modalId) {
    const modal = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
    if (modal) {
        window.bookingUIManager.closeModal(modal);
    }
};

console.log('🎨 Booking UI Manager module loaded');