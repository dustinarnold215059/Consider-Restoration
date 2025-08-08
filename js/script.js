// Initialize Stripe
const stripe = Stripe('pk_test_51234567890abcdef'); // Replace with your actual publishable key
const elements = stripe.elements();

// Available time slots based on Christopher's actual business hours
const timeSlots = {
    // Monday: 10:00 AM - 4:00 PM
    1: ['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM'],
    // Tuesday: By appointment only (limited)
    2: ['11:00 AM', '2:00 PM'],
    // Wednesday: 9:45 AM - 5:30 PM
    3: ['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'],
    // Thursday: 12:00 PM - 7:00 PM
    4: ['12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'],
    // Friday: 10:00 AM - 6:00 PM
    5: ['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'],
    // Saturday/Sunday: Closed
    6: [],
    0: []
};

// Dynamic availability data - generated based on Christopher's actual business hours
let availability = {};

let selectedService = null;
let selectedPrice = 0;
let selectedDate = null;
let selectedTime = null;

// DOM Elements (initialize as null, will be set when DOM is ready)
let serviceSelect = null;
const dateInput = document.getElementById('date');
const timeSelect = document.getElementById('time');
const totalPriceElement = document.getElementById('totalPrice');
const bookingForm = document.getElementById('bookingForm');
const paymentModal = document.getElementById('paymentModal');
const closeModal = document.querySelector('.close');

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Page loaded, initializing...');
    
    // Initialize serviceSelect (the only one that was null)
    serviceSelect = document.getElementById('service');
    console.log('📝 Service select initialized:', serviceSelect);
    
    setupEventListeners();
    setupDateInput();
    generateCalendar();
    setupPaymentElements();
    
    // Auto-populate service if coming from services page (with small delay to ensure elements are ready)
    setTimeout(() => {
        autoPopulateServiceFromURL();
    }, 100);
});

// Also try on window load as backup
window.addEventListener('load', function() {
    console.log('🌟 Window fully loaded, checking auto-populate again...');
    // Only run if we haven't already populated
    const serviceSelect = document.getElementById('service');
    if (serviceSelect && !serviceSelect.value) {
        autoPopulateServiceFromURL();
    }
});

function setupEventListeners() {
    // Service selection
    if (serviceSelect) {
        serviceSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            selectedService = this.value;
            selectedPrice = selectedOption.dataset.price || 0;
            updateTotalPrice();
        });
    }

    // Date selection from input field
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            selectedDate = this.value;
            updateAvailableTimes();
            
            // Update calendar visual selection to match input
            updateCalendarSelection();
            
            // Debug: Log the input change
            console.log(`Date input changed to: ${this.value}, selectedDate: ${selectedDate}`);
        });
    }

    // Time selection
    if (timeSelect) {
        timeSelect.addEventListener('change', function() {
            selectedTime = this.value;
        });
    }

    // Form submission
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (validateForm()) {
                // Check if user is logged in before proceeding
                if (checkUserAuthentication()) {
                    showPaymentModal();
                } else {
                    promptUserLogin();
                }
            }
        });
    }

    // Modal close
    if (closeModal && paymentModal) {
        closeModal.addEventListener('click', function() {
            paymentModal.style.display = 'none';
        });
    }

    // Close modal when clicking outside
    if (paymentModal) {
        window.addEventListener('click', function(e) {
            if (e.target === paymentModal) {
                paymentModal.style.display = 'none';
            }
        });
    }

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

function setupDateInput() {
    if (!dateInput) {
        console.warn('Date input element not found');
        return;
    }
    
    // Set minimum date to today - allow same-day booking
    const today = new Date();
    
    // Use local date formatting to avoid timezone issues
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${day}`;
    
    dateInput.min = todayString;
    
    // Set maximum date to 3 months from now
    const maxDate = new Date(today);
    maxDate.setMonth(maxDate.getMonth() + 3);
    dateInput.max = maxDate.toISOString().split('T')[0];
}

function updateAvailableTimes() {
    // Clear existing options
    timeSelect.innerHTML = '<option value="">Select a time</option>';
    
    if (!selectedDate) return;
    
    const availableTimes = availability[selectedDate] || [];
    
    if (availableTimes.length === 0) {
        timeSelect.innerHTML = '<option value="">No times available</option>';
        return;
    }
    
    availableTimes.forEach(time => {
        const option = document.createElement('option');
        option.value = time;
        option.textContent = time;
        timeSelect.appendChild(option);
    });
}

function updateCalendarSelection() {
    // Remove all previous selections
    document.querySelectorAll('.calendar-day.selected').forEach(el => {
        el.classList.remove('selected');
    });
    
    // Find and select the calendar day that matches selectedDate
    if (selectedDate) {
        const matchingDay = document.querySelector(`[data-date="${selectedDate}"]`);
        if (matchingDay) {
            matchingDay.classList.add('selected');
        }
    }
}

function updateTotalPrice() {
    console.log('💰 updateTotalPrice called - selectedPrice:', selectedPrice);
    
    // Find the price element directly to be safe
    const priceElement = document.getElementById('totalPrice');
    if (priceElement) {
        priceElement.textContent = selectedPrice;
        console.log('✅ Price updated to:', selectedPrice);
    } else {
        console.error('❌ Cannot find element with id="totalPrice"');
    }
}

function validateForm() {
    const requiredFields = ['clientName', 'email', 'phone', 'service', 'date', 'time'];
    let isValid = true;
    let errorMessage = '';

    for (const field of requiredFields) {
        const element = document.getElementById(field);
        if (!element.value.trim()) {
            isValid = false;
            errorMessage += `${field.charAt(0).toUpperCase() + field.slice(1)} is required.\n`;
        }
    }

    // Validate email format
    const email = document.getElementById('email').value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
        isValid = false;
        errorMessage += 'Please enter a valid email address.\n';
    }

    // Validate phone format
    const phone = document.getElementById('phone').value;
    const phoneRegex = /^[\d\s\-\(\)\+]+$/;
    if (phone && !phoneRegex.test(phone)) {
        isValid = false;
        errorMessage += 'Please enter a valid phone number.\n';
    }

    if (!isValid) {
        alert(errorMessage);
    }

    return isValid;
}

function generateCalendar() {
    const calendar = document.getElementById('calendar');
    const today = new Date();
    
    // Clear existing calendar
    calendar.innerHTML = '';
    
    // Generate today plus next 30 days
    for (let i = 0; i <= 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        // Create date string in local timezone to avoid timezone issues
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        const dayOfWeek = date.getDay();
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        // Simple display - just the day number like before
        dayElement.textContent = date.getDate();
        
        // Add data attribute for debugging
        dayElement.setAttribute('data-date', dateString);
        
        // Skip weekends (business closed)
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            dayElement.classList.add('closed');
            dayElement.title = dayOfWeek === 0 ? 'Closed on Sundays' : 'Closed on Saturdays';
        } else if (isDateBlocked(dateString)) {
            // Date is blocked by admin
            dayElement.classList.add('blocked');
            dayElement.title = 'Christopher is unavailable on this date';
        } else {
            // Check if this date has available times
            const availableTimes = availability[dateString] || [];
            
            if (availableTimes.length > 0) {
                // Day has some available time slots
                dayElement.classList.add('available');
                
                // Special note for Tuesday (appointment only)
                if (dayOfWeek === 2) {
                    dayElement.title = `${availableTimes.length} appointment slots available (by appointment only)`;
                    dayElement.classList.add('appointment-only');
                } else {
                    dayElement.title = `${availableTimes.length} time slots available`;
                }
                
                dayElement.addEventListener('click', function() {
                    // Remove previous selection
                    document.querySelectorAll('.calendar-day.selected').forEach(el => {
                        el.classList.remove('selected');
                    });
                    
                    // Select this day
                    dayElement.classList.add('selected');
                    dateInput.value = dateString;
                    selectedDate = dateString;
                    
                    // Debug: Log the selected date for verification
                    const clickedDate = new Date(dateString);
                    console.log(`=== CALENDAR CLICK DEBUG ===`);
                    console.log(`Clicked day number: ${date.getDate()}`);
                    console.log(`Date string created: ${dateString}`);
                    console.log(`Date input field value: ${dateInput.value}`);
                    console.log(`Parsed clicked date: ${clickedDate.toDateString()}`);
                    console.log(`Today is: ${new Date().toDateString()}`);
                    console.log(`============================`);
                    
                    updateAvailableTimes();
                });
            } else {
                // Day is fully booked but not closed
                dayElement.classList.add('fully-booked');
                dayElement.title = 'Fully booked - no available times';
            }
        }
        
        calendar.appendChild(dayElement);
    }
}

function setupPaymentElements() {
    // Create card element
    const card = elements.create('card', {
        style: {
            base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                    color: '#aab7c4',
                },
            },
        },
    });

    card.mount('#card-element');

    // Handle real-time validation errors from the card Element
    card.on('change', ({error}) => {
        const displayError = document.getElementById('card-errors');
        if (error) {
            displayError.textContent = error.message;
        } else {
            displayError.textContent = '';
        }
    });

    // Handle form submission
    const submitButton = document.getElementById('submit-payment');
    submitButton.addEventListener('click', function(e) {
        e.preventDefault();
        handlePayment(card);
    });
}

function showPaymentModal() {
    paymentModal.style.display = 'block';
}

async function handlePayment(card) {
    const submitButton = document.getElementById('submit-payment');
    const cardErrors = document.getElementById('card-errors');
    
    // Disable the submit button to prevent multiple submissions
    submitButton.disabled = true;
    submitButton.textContent = 'Processing...';

    // Get form data
    const formData = {
        clientName: document.getElementById('clientName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        service: selectedService,
        date: selectedDate,
        time: selectedTime,
        notes: document.getElementById('notes').value,
        amount: selectedPrice * 100 // Stripe expects amount in cents
    };

    try {
        // In a real application, you would:
        // 1. Send booking data to your server
        // 2. Create a payment intent on your server
        // 3. Confirm the payment with Stripe
        
        // For demo purposes, we'll simulate the process
        console.log('Booking Data:', formData);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Get the logged-in user info
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        // Create new appointment in shared data
        const newAppointment = {
            userId: currentUser ? currentUser.id : null,
            clientName: currentUser ? currentUser.name : formData.clientName,
            email: currentUser ? currentUser.email : formData.email,
            phone: currentUser ? currentUser.phone : formData.phone,
            service: getServiceName(selectedService),
            date: selectedDate,
            time: selectedTime,
            price: selectedPrice,
            status: 'confirmed',
            notes: formData.notes || '',
            paymentStatus: 'paid', // Assuming payment was successful
            paymentMethod: 'Credit Card',
            transactionId: `txn_${Date.now()}`
        };
        
        // Add to shared appointments
        window.addAppointment(newAppointment);
        
        // Update availability by removing this time slot
        if (availability[selectedDate]) {
            const timeIndex = availability[selectedDate].indexOf(selectedTime);
            if (timeIndex !== -1) {
                availability[selectedDate].splice(timeIndex, 1);
            }
        }
        
        // Regenerate calendar to show updated availability
        generateCalendar();
        
        // Show success message in UI instead of alert
        showBookingConfirmation({
            service: getServiceName(selectedService),
            date: selectedDate,
            time: selectedTime,
            price: selectedPrice,
            email: formData.email
        });
        
        // Reset form and close modal
        bookingForm.reset();
        paymentModal.style.display = 'none';
        selectedService = null;
        selectedPrice = 0;
        selectedDate = null;
        selectedTime = null;
        updateTotalPrice();
        
    } catch (error) {
        cardErrors.textContent = 'Payment failed. Please try again.';
        console.error('Payment error:', error);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Pay Now';
    }
}

function getServiceName(serviceValue) {
    const serviceNames = {
        'mindful-start': 'Mindful Start',
        'integrated-massage': 'Integrated Massage',
        'thai-stretch': 'Thai-Stretch Fusion',
        'applied-neurology': 'Applied Neurology Consultation',
        'prenatal': 'Prenatal Massage',
        'neurology-training': 'Applied Neurology Training'
    };
    return serviceNames[serviceValue] || serviceValue;
}

// Simulate realistic booking scenarios with existing appointments
function generateSampleAvailability() {
    const today = new Date();
    const sampleAvailability = {};
    
    for (let i = 0; i <= 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        // Use same date formatting as calendar generation
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        const dayOfWeek = date.getDay();
        
        // Skip weekends (Christopher is closed Saturday/Sunday)
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;
        
        // Check if date is blocked by admin
        if (isDateBlocked(dateString)) {
            // Date is completely blocked - no availability
            sampleAvailability[dateString] = [];
            continue;
        }
        
        // Get available time slots for this day of week
        let availableTimes = [...(timeSlots[dayOfWeek] || [])];
        
        // For today only, remove times that have already passed
        if (i === 0) { // Today
            const currentHour = today.getHours();
            const currentMinute = today.getMinutes();
            const currentTime = currentHour * 60 + currentMinute;
            
            availableTimes = availableTimes.filter(timeSlot => {
                const slotMinutes = convertToMinutes(timeSlot);
                // Allow booking if the time slot is at least 1 hour from now
                return slotMinutes > (currentTime + 60);
            });
        }
        
        // Check for existing appointments on this date and remove those specific times
        const existingAppointments = getExistingAppointmentsForDate(dateString);
        existingAppointments.forEach(appointment => {
            const timeIndex = availableTimes.indexOf(appointment.time);
            if (timeIndex !== -1) {
                availableTimes.splice(timeIndex, 1);
            }
        });
        
        // No random simulation - only show actual available times based on real appointments
        
        // Sort available times
        availableTimes.sort((a, b) => {
            const timeA = convertToMinutes(a);
            const timeB = convertToMinutes(b);
            return timeA - timeB;
        });
        
        // Always add the date with whatever times are available (even if empty)
        // This ensures the calendar shows all business days, not just days with availability
        sampleAvailability[dateString] = availableTimes;
    }
    
    // Merge with existing availability
    Object.assign(availability, sampleAvailability);
}

// Get existing appointments for a specific date (from shared data)
function getExistingAppointmentsForDate(dateString) {
    // Get appointments from shared data if available
    const sharedAppointments = window.getAppointments ? window.getAppointments() : [];
    
    // Convert to the format expected by availability system
    const existingBookings = sharedAppointments
        .filter(apt => apt.date === dateString && apt.status !== 'cancelled')
        .map(apt => ({ date: apt.date, time: apt.time }));
    
    return existingBookings;
}

// Check if a date is blocked by admin (Christopher unavailable)
function isDateBlocked(dateString) {
    // Debug: Check if function is available
    console.log('🔍 isDateBlocked called for:', dateString);
    console.log('🔍 window.getBlockedDates available:', !!window.getBlockedDates);
    
    // Get blocked dates from shared data if available
    const sharedBlockedDates = window.getBlockedDates ? window.getBlockedDates() : [];
    console.log('🔍 Retrieved blocked dates:', sharedBlockedDates.length, 'dates');
    
    // Debug logging for blocked dates check
    if (sharedBlockedDates.length > 0) {
        console.log('🔍 Available blocked dates:', sharedBlockedDates.map(b => b.date));
    }
    
    const isBlocked = sharedBlockedDates.some(blocked => blocked.date === dateString);
    if (isBlocked) {
        console.log('🚫 Date', dateString, 'is BLOCKED');
    } else {
        console.log('✅ Date', dateString, 'is available');
    }
    
    return isBlocked;
}

// Helper function to convert time strings to minutes for sorting
function convertToMinutes(timeStr) {
    const [time, period] = timeStr.split(' ');
    let [hours, minutes = '0'] = time.split(':');
    hours = parseInt(hours);
    minutes = parseInt(minutes);
    
    if (period === 'PM' && hours !== 12) {
        hours += 12;
    } else if (period === 'AM' && hours === 12) {
        hours = 0;
    }
    
    return hours * 60 + minutes;
}

// Add functions for automatic booking and success display
function showBookingConfirmation(bookingDetails) {
    // Create a temporary success message overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    `;
    
    const messageBox = document.createElement('div');
    messageBox.style.cssText = `
        background: white;
        padding: 2rem;
        border-radius: 15px;
        text-align: center;
        max-width: 400px;
        margin: 1rem;
    `;
    
    messageBox.innerHTML = `
        <div style="color: #27ae60; font-size: 3rem; margin-bottom: 1rem;">✓</div>
        <h2 style="color: #2F4F4F; margin-bottom: 1rem;">Booking Confirmed!</h2>
        <div style="margin-bottom: 1.5rem; color: #666;">
            <p><strong>Service:</strong> ${bookingDetails.service}</p>
            <p><strong>Date:</strong> ${bookingDetails.date}</p>
            <p><strong>Time:</strong> ${bookingDetails.time}</p>
            <p><strong>Total:</strong> $${bookingDetails.price}</p>
        </div>
        <p style="color: #666; font-size: 0.9rem;">
            A confirmation email has been sent to ${bookingDetails.email}
        </p>
    `;
    
    overlay.appendChild(messageBox);
    document.body.appendChild(overlay);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        document.body.removeChild(overlay);
    }, 4000);
    
    // Remove on click
    overlay.addEventListener('click', () => {
        if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
        }
    });
}

function processAutomaticBooking() {
    // Check if we have all required booking information
    if (selectedService && selectedDate && selectedTime && selectedPrice > 0) {
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        
        if (currentUser && validateForm()) {
            // Show loading indicator
            showLoadingIndicator('Processing your booking...');
            
            // Process the booking automatically
            handleAutomaticPayment();
        }
    }
}

function showLoadingIndicator(message) {
    const overlay = document.createElement('div');
    overlay.id = 'booking-loading';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9998;
    `;
    
    const messageBox = document.createElement('div');
    messageBox.style.cssText = `
        background: white;
        padding: 2rem;
        border-radius: 15px;
        text-align: center;
        max-width: 300px;
        margin: 1rem;
    `;
    
    messageBox.innerHTML = `
        <div style="color: #3A7D99; font-size: 2rem; margin-bottom: 1rem;">
            <div class="spinner" style="
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #3A7D99;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto;
            "></div>
        </div>
        <p style="color: #2F4F4F; margin: 0; font-weight: 500;">${message}</p>
    `;
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
    
    overlay.appendChild(messageBox);
    document.body.appendChild(overlay);
}

function hideLoadingIndicator() {
    const overlay = document.getElementById('booking-loading');
    if (overlay && document.body.contains(overlay)) {
        document.body.removeChild(overlay);
    }
}

async function handleAutomaticPayment() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    const formData = {
        clientName: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone,
        service: selectedService,
        date: selectedDate,
        time: selectedTime,
        notes: document.getElementById('notes').value,
        amount: selectedPrice * 100
    };

    try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Create new appointment
        const newAppointment = {
            userId: currentUser.id,
            clientName: currentUser.name,
            email: currentUser.email,
            phone: currentUser.phone,
            service: getServiceName(selectedService),
            date: selectedDate,
            time: selectedTime,
            price: selectedPrice,
            status: 'confirmed',
            notes: formData.notes || '',
            paymentStatus: 'paid',
            paymentMethod: 'Credit Card',
            transactionId: `txn_${Date.now()}`
        };
        
        // Add to shared appointments
        window.addAppointment(newAppointment);
        
        // Update availability
        if (availability[selectedDate]) {
            const timeIndex = availability[selectedDate].indexOf(selectedTime);
            if (timeIndex !== -1) {
                availability[selectedDate].splice(timeIndex, 1);
            }
        }
        
        // Regenerate calendar
        generateCalendar();
        
        // Show success message
        showBookingConfirmation({
            service: getServiceName(selectedService),
            date: selectedDate,
            time: selectedTime,
            price: selectedPrice,
            email: formData.email
        });
        
        // Reset form
        bookingForm.reset();
        selectedService = null;
        selectedPrice = 0;
        selectedDate = null;
        selectedTime = null;
        updateTotalPrice();
        
        // Clear booking data from storage
        sessionStorage.removeItem('pendingBooking');
        
        // Hide loading indicator
        hideLoadingIndicator();
        
    } catch (error) {
        console.error('Automatic booking error:', error);
        
        // Hide loading indicator and show error
        hideLoadingIndicator();
        showBookingConfirmation({
            service: 'Booking Error',
            date: '',
            time: '',
            price: 0,
            email: 'There was an issue processing your booking. Please try again.'
        });
    }
}

// Generate sample availability on page load
generateSampleAvailability();

// Listen for appointment changes and refresh calendar
if (window.addEventListener) {
    window.addEventListener('appointmentAdded', function(event) {
        console.log('New appointment detected, refreshing calendar...');
        // Regenerate availability and calendar
        generateSampleAvailability();
        generateCalendar();
    });
}

// Authentication and Login Functions
function checkUserAuthentication() {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        try {
            const user = JSON.parse(currentUser);
            return user && user.role === 'user'; // Only regular users, not admin
        } catch (e) {
            localStorage.removeItem('currentUser');
            return false;
        }
    }
    return false;
}

function promptUserLogin() {
    // Store the current booking form data before showing modal
    storeBookingFormData();
    
    // Show the custom login modal
    document.getElementById('loginPromptModal').style.display = 'block';
}

function closeLoginPrompt() {
    document.getElementById('loginPromptModal').style.display = 'none';
}

function goToLogin() {
    closeLoginPrompt();
    // Add a URL parameter to indicate they should login (not register)
    window.location.href = 'user-portal.html?action=login';
}

function goToRegister() {
    closeLoginPrompt();
    // Add a URL parameter to indicate they should register (not login)
    window.location.href = 'user-portal.html?action=register';
}

function storeBookingFormData() {
    const bookingData = {
        service: selectedService,
        price: selectedPrice,
        date: selectedDate,
        time: selectedTime,
        clientName: document.getElementById('clientName').value,
        email: document.getElementById('email').value,
        phone: document.getElementById('phone').value,
        notes: document.getElementById('notes').value
    };
    
    // Store in sessionStorage so it persists during the session but not longer
    sessionStorage.setItem('pendingBooking', JSON.stringify(bookingData));
}

function restoreBookingFormData() {
    const pendingBooking = sessionStorage.getItem('pendingBooking');
    if (pendingBooking) {
        try {
            const bookingData = JSON.parse(pendingBooking);
            
            // Restore form fields
            if (bookingData.service) {
                document.getElementById('service').value = bookingData.service;
                selectedService = bookingData.service;
                selectedPrice = bookingData.price;
                updateTotalPrice();
            }
            
            if (bookingData.date) {
                document.getElementById('date').value = bookingData.date;
                selectedDate = bookingData.date;
                updateAvailableTimes();
            }
            
            if (bookingData.time) {
                // Wait a moment for time options to populate
                setTimeout(() => {
                    document.getElementById('time').value = bookingData.time;
                    selectedTime = bookingData.time;
                }, 100);
            }
            
            document.getElementById('clientName').value = bookingData.clientName || '';
            document.getElementById('email').value = bookingData.email || '';
            document.getElementById('phone').value = bookingData.phone || '';
            document.getElementById('notes').value = bookingData.notes || '';
            
            // Clear the stored data
            sessionStorage.removeItem('pendingBooking');
            
            // Auto-submit the booking if user is logged in
            if (checkUserAuthentication()) {
                setTimeout(() => {
                    processAutomaticBooking();
                }, 1000);
            }
            
        } catch (e) {
            sessionStorage.removeItem('pendingBooking');
        }
    }
}

// Check for pending booking data and user info when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait a moment for other initialization to complete
    setTimeout(() => {
        restoreBookingFormData();
        populateUserInfo();
    }, 500);
});

function populateUserInfo() {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        try {
            const user = JSON.parse(currentUser);
            if (user.role === 'user') {
                // Pre-populate form with user information
                document.getElementById('clientName').value = user.name || '';
                document.getElementById('email').value = user.email || '';
                document.getElementById('phone').value = user.phone || '';
                
                // Make fields read-only since they're logged in
                document.getElementById('clientName').setAttribute('readonly', true);
                document.getElementById('email').setAttribute('readonly', true);
                document.getElementById('phone').setAttribute('readonly', true);
                
                // Add a note about being logged in
                addLoggedInNote();
            }
        } catch (e) {
            localStorage.removeItem('currentUser');
        }
    }
}

function addLoggedInNote() {
    const nameField = document.getElementById('clientName');
    const existingNote = document.querySelector('.logged-in-note');
    
    if (!existingNote) {
        const note = document.createElement('div');
        note.className = 'logged-in-note';
        note.innerHTML = '✓ You are logged in. <a href="user-portal.html">View your account</a> | <a href="#" onclick="logoutAndClearForm()">Logout</a>';
        note.style.cssText = 'color: #27ae60; font-size: 0.9rem; margin-top: 0.5rem; font-weight: bold;';
        nameField.parentNode.insertBefore(note, nameField.nextSibling);
    }
}

function logoutAndClearForm() {
    localStorage.removeItem('currentUser');
    
    // Clear and enable form fields
    document.getElementById('clientName').value = '';
    document.getElementById('email').value = '';
    document.getElementById('phone').value = '';
    
    document.getElementById('clientName').removeAttribute('readonly');
    document.getElementById('email').removeAttribute('readonly');
    document.getElementById('phone').removeAttribute('readonly');
    
    // Remove the logged in note
    const note = document.querySelector('.logged-in-note');
    if (note) {
        note.remove();
    }
    
    // Dispatch event to update navigation
    window.dispatchEvent(new CustomEvent('userAuthChanged'));
    
    // User logged out - no alert needed
}

// Auto-populate service selection from URL parameters
function autoPopulateServiceFromURL() {
    console.log('🔍 Auto-populate function called');
    
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const serviceParam = urlParams.get('service');
    
    console.log('📋 URL parameters:', urlParams.toString());
    console.log('🎯 Service parameter:', serviceParam);
    console.log('📝 Service select element:', serviceSelect);
    
    if (serviceParam) {
        // Wait for service select to be available
        const waitForServiceSelect = () => {
            const serviceSelectElement = document.getElementById('service');
            console.log('🔄 Checking for service select element:', serviceSelectElement);
            
            if (serviceSelectElement) {
                // Find the matching option in the service dropdown
                const serviceOption = serviceSelectElement.querySelector(`option[value="${serviceParam}"]`);
                console.log('🎯 Found service option:', serviceOption);
                
                if (serviceOption) {
                    // Set the service selection
                    serviceSelectElement.value = serviceParam;
                    
                    // Update the selected service and price variables
                    selectedService = serviceParam;
                    selectedPrice = serviceOption.dataset.price || 0;
                    
                    console.log('✅ Service auto-populated:', selectedService, 'Price:', selectedPrice);
                    
                    // Make it visually obvious that it worked
                    serviceSelectElement.style.backgroundColor = '#90EE90';
                    serviceSelectElement.style.border = '3px solid #32CD32';
                    serviceSelectElement.style.fontSize = '16px';
                    
                    // Show confirmation popup
                    setTimeout(() => {
                        alert(`🎉 Service Auto-Selected!\n\n${serviceOption.textContent}\n\nYou can now continue with your booking.`);
                    }, 1000);
                    
                    // Update the total price display
                    if (typeof updateTotalPrice === 'function') {
                        updateTotalPrice();
                    }
                    
                    // Trigger change event to ensure all handlers are called
                    serviceSelectElement.dispatchEvent(new Event('change'));
                    
                    // Scroll to the booking form to highlight the pre-selection
                    setTimeout(() => {
                        serviceSelectElement.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center' 
                        });
                        
                        // Add a subtle highlight effect to show the pre-selected service
                        serviceSelectElement.classList.add('service-preselected');
                        
                        // Remove highlight after a few seconds with fade effect
                        setTimeout(() => {
                            serviceSelectElement.classList.remove('service-preselected');
                            serviceSelectElement.classList.add('service-preselected-fade');
                            
                            // Remove fade class after transition completes
                            setTimeout(() => {
                                serviceSelectElement.classList.remove('service-preselected-fade');
                            }, 2000);
                        }, 3000);
                    }, 500);
                    
                    // Track the auto-population event for analytics
                    if (typeof gtag !== 'undefined') {
                        gtag('event', 'service_preselected', {
                            event_category: 'Booking',
                            event_label: serviceParam,
                            value: selectedPrice
                        });
                    }
                    
                    // Show a subtle notification that the service was pre-selected
                    showServicePreselectedNotification(serviceOption.textContent);
                } else {
                    console.warn(`❌ Service "${serviceParam}" not found in dropdown options`);
                    // List all available options for debugging
                    const allOptions = serviceSelectElement.querySelectorAll('option');
                    console.log('📋 Available service options:', Array.from(allOptions).map(opt => opt.value));
                }
            } else {
                console.log('⏳ Service select not ready, retrying in 100ms...');
                setTimeout(waitForServiceSelect, 100);
            }
        };
        
        waitForServiceSelect();
    } else {
        console.log('ℹ️ No service parameter in URL');
    }
}

// Show notification that service was pre-selected
function showServicePreselectedNotification(serviceName) {
    // Create notification element
    const notification = document.createElement('div');
    notification.id = 'service-preselected-notification';
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: #3A7D99;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 9999;
        font-size: 0.9rem;
        max-width: 300px;
        opacity: 0;
        transform: translateX(100px);
        transition: all 0.3s ease;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 1.2rem;">✓</span>
            <div>
                <strong>Service Pre-selected</strong><br>
                <small>${serviceName}</small>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100px)';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}