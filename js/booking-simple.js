// Simplified booking page JavaScript - production version

// Global variables
let selectedService = null;
let selectedPrice = 0;
let selectedDate = null;
let selectedTime = null;
let pendingBookingData = null;
let currentUser = null;

// Available time slots
const timeSlots = {
    1: ['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM'], // Monday
    2: ['11:00 AM', '2:00 PM'], // Tuesday
    3: ['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'], // Wednesday
    4: ['12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'], // Thursday
    5: ['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'], // Friday
    6: [], // Saturday
    0: []  // Sunday
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check if all required DOM elements exist
    const requiredElements = ['service', 'date', 'time', 'totalPrice'];
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
        console.error('Missing required booking elements:', missingElements);
        return;
    }
    
    try {
        setupBasicBooking();
        setupDateInput();
        setupFormHandling();
        generateCalendar();
        autoPopulateService();
        
        // Setup authentication event listeners
        setTimeout(() => {
            setupAuthEventListeners();
        }, 100);
    } catch (error) {
        console.error('Booking initialization error:', error);
    }
});


function setupBasicBooking() {
    // Service selection
    const serviceSelect = document.getElementById('service');
    if (serviceSelect) {
        serviceSelect.addEventListener('change', function() {
            const selectedOption = this.options[this.selectedIndex];
            selectedService = this.value;
            selectedPrice = selectedOption.dataset ? selectedOption.dataset.price : 0;
            updatePrice();
        });
    }
    
    // Date selection
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            selectedDate = this.value;
            updateAvailableTimes();
        });
    }
    
    // Time selection
    const timeSelect = document.getElementById('time');
    if (timeSelect) {
        timeSelect.addEventListener('change', function() {
            selectedTime = this.value;
        });
    }
}

function setupDateInput() {
    const dateInput = document.getElementById('date');
    if (!dateInput) return;
    
    // Set minimum date to today
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayString = `${year}-${month}-${day}`;
    
    dateInput.min = todayString;
    
    // Set maximum date to 3 months from now
    const maxDate = new Date(today);
    maxDate.setMonth(maxDate.getMonth() + 3);
    dateInput.max = maxDate.toISOString().split('T')[0];
    
    // Add event listener if not already added
    if (!dateInput.hasAttribute('data-listener-added')) {
        dateInput.addEventListener('change', function() {
            selectedDate = this.value;
            updateAvailableTimes();
        });
        dateInput.setAttribute('data-listener-added', 'true');
    }
}

function updateAvailableTimes() {
    const timeSelect = document.getElementById('time');
    if (!timeSelect || !selectedDate) return;
    
    // Clear existing options
    timeSelect.innerHTML = '<option value="">Select a time</option>';
    
    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const date = new Date(selectedDate + 'T00:00:00');
    const dayOfWeek = date.getDay();
    
    // Get available times for this day
    const availableTimes = timeSlots[dayOfWeek] || [];
    
    // Get booked times for this date
    const bookedTimes = getBookedTimesForDate(selectedDate);
    
    // Add time options (excluding booked times)
    availableTimes.forEach(time => {
        const isBooked = bookedTimes.includes(time);
        
        const option = document.createElement('option');
        option.value = time;
        option.textContent = isBooked ? `${time} (Unavailable)` : time;
        option.disabled = isBooked;
        option.style.color = isBooked ? '#999' : '';
        
        timeSelect.appendChild(option);
    });
    
    // Show message if no times available
    if (availableTimes.length === bookedTimes.length && availableTimes.length > 0) {
        const noTimesOption = document.createElement('option');
        noTimesOption.value = '';
        noTimesOption.textContent = 'No times available for this date';
        noTimesOption.disabled = true;
        noTimesOption.style.color = '#dc3545';
        timeSelect.appendChild(noTimesOption);
    }
}

function getBookedTimesForDate(date) {
    // Get appointments from shared data
    const appointments = window.sharedAppointments || [];
    
    // Filter appointments for the specific date and confirmed/pending status
    const bookedTimes = appointments
        .filter(appointment => 
            appointment.date === date && 
            (appointment.status === 'confirmed' || appointment.status === 'pending')
        )
        .map(appointment => appointment.time);
    
    return bookedTimes;
}

function isDateFullyBooked(date) {
    // Get day of week
    const dateObj = new Date(date + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();
    
    // Get available times for this day
    const availableTimes = timeSlots[dayOfWeek] || [];
    
    // Get booked times
    const bookedTimes = getBookedTimesForDate(date);
    
    // Return true if all available times are booked
    return availableTimes.length > 0 && availableTimes.length === bookedTimes.length;
}

function createNewAppointment() {
    // Get form data
    const clientName = document.getElementById('clientName').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const notes = document.getElementById('notes') ? document.getElementById('notes').value : '';
    
    // Create appointment object
    const newAppointment = {
        id: generateAppointmentId(),
        userId: null, // Will be set when user authentication is implemented
        clientName: clientName,
        email: email,
        phone: phone,
        service: getServiceDisplayName(selectedService),
        date: selectedDate,
        time: selectedTime,
        price: parseInt(selectedPrice),
        status: 'confirmed', // Change to 'pending' if payment integration needed
        notes: notes,
        paymentStatus: 'confirmed', // Change to 'pending' if payment integration needed
        paymentMethod: 'Online Booking',
        transactionId: `txn_${Date.now()}`,
        createdAt: new Date().toISOString()
    };
    
    // Add to shared appointments using the helper function
    if (window.addAppointment) {
        window.addAppointment(newAppointment);
    } else {
        // Fallback if helper function not available
        window.sharedAppointments = window.sharedAppointments || [];
        window.sharedAppointments.push(newAppointment);
    }
    
    return newAppointment;
}

function generateAppointmentId() {
    const appointments = window.sharedAppointments || [];
    const maxId = appointments.length > 0 ? Math.max(...appointments.map(apt => apt.id)) : 0;
    return maxId + 1;
}

function getServiceDisplayName(serviceValue) {
    const serviceSelect = document.getElementById('service');
    if (serviceSelect) {
        const option = serviceSelect.querySelector(`option[value="${serviceValue}"]`);
        if (option) {
            return option.textContent.split(' - ')[0]; // Get just the service name part
        }
    }
    return serviceValue;
}

function resetBookingForm() {
    // Reset form fields
    const form = document.getElementById('bookingForm');
    if (form) {
        form.reset();
    }
    
    // Reset global variables
    selectedService = null;
    selectedPrice = 0;
    selectedDate = null;
    selectedTime = null;
    
    // Reset price display
    updatePrice();
    
    // Clear time options
    const timeSelect = document.getElementById('time');
    if (timeSelect) {
        timeSelect.innerHTML = '<option value="">Select a time</option>';
    }
    
    // Clear any visual feedback from auto-populate
    const serviceSelect = document.getElementById('service');
    if (serviceSelect) {
        serviceSelect.style.backgroundColor = '';
        serviceSelect.style.border = '';
    }
    
    // Regenerate calendar to show updated bookings
    setTimeout(() => {
        generateCalendar();
    }, 100);
}

function updatePrice() {
    const priceElement = document.getElementById('totalPrice');
    if (priceElement) {
        priceElement.textContent = selectedPrice || '0';
    }
}

function autoPopulateService() {
    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const serviceParam = urlParams.get('service');
    
    if (!serviceParam) {
        return;
    }
    
    // Find service dropdown
    const serviceSelect = document.getElementById('service');
    if (!serviceSelect) return;
    
    // Find matching option
    const targetOption = serviceSelect.querySelector(`option[value="${serviceParam}"]`);
    if (!targetOption) return;
    
    // Set the selection
    serviceSelect.value = serviceParam;
    selectedService = serviceParam;
    selectedPrice = targetOption.dataset.price || 0;
    
    // Update price display
    updatePrice();
    
    // Visual feedback
    serviceSelect.style.backgroundColor = '#e8f5e8';
    serviceSelect.style.border = '2px solid #27ae60';
    
    // Trigger change event
    serviceSelect.dispatchEvent(new Event('change'));
    
    // Show success notification
    showSuccessNotification(`Service selected: ${targetOption.textContent}`);
}

function showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 9999;
        font-weight: bold;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    notification.textContent = `✅ ${message}`;
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

function setupFormHandling() {
    const bookingForm = document.getElementById('bookingForm');
    if (!bookingForm) return;
    
    bookingForm.addEventListener('submit', function(e) {
        console.log('📝 Booking form submitted');
        e.preventDefault();
        
        console.log('🔍 Starting form validation');
        if (validateBookingForm()) {
            console.log('✅ Form validation passed');
            
            // Check if time slot is still available (double-check)
            const bookedTimes = getBookedTimesForDate(selectedDate);
            if (bookedTimes.includes(selectedTime)) {
                console.log('❌ Time slot no longer available');
                alert('Sorry, this time slot was just booked by another user. Please select a different time.');
                updateAvailableTimes(); // Refresh the time slots
                return;
            }
            
            console.log('✅ Time slot still available');
            
            // Store booking data and show login modal
            pendingBookingData = {
                clientName: document.getElementById('clientName').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                service: selectedService,
                date: selectedDate,
                time: selectedTime,
                price: selectedPrice,
                notes: document.getElementById('notes') ? document.getElementById('notes').value : ''
            };
            
            console.log('💾 Booking data stored:', pendingBookingData);
            console.log('🔓 Calling showLoginModal()');
            
            showLoginModal();
        } else {
            console.log('❌ Form validation failed');
        }
    });
}

function validateBookingForm() {
    const requiredFields = [
        { id: 'clientName', name: 'Name' },
        { id: 'email', name: 'Email' },
        { id: 'phone', name: 'Phone' },
        { id: 'service', name: 'Service' },
        { id: 'date', name: 'Date' },
        { id: 'time', name: 'Time' }
    ];
    
    let isValid = true;
    let errors = [];
    
    for (const field of requiredFields) {
        const element = document.getElementById(field.id);
        if (!element || !element.value.trim()) {
            isValid = false;
            errors.push(field.name + ' is required');
            
            // Add visual feedback
            if (element) {
                element.style.borderColor = '#e74c3c';
            }
        } else {
            // Remove error styling
            if (element) {
                element.style.borderColor = '';
            }
        }
    }
    
    if (!isValid) {
        alert('Please fill in all required fields:\n\n' + errors.join('\n'));
    }
    
    return isValid;
}

function generateCalendar() {
    const calendarElement = document.getElementById('calendar');
    if (!calendarElement) return;
    
    // Clear any existing content first
    calendarElement.innerHTML = '';
    
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Simple calendar for current month
    let calendarHTML = '<div class="calendar-simple">';
    calendarHTML += `<div class="calendar-header">${today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>`;
    calendarHTML += '<div class="calendar-grid">';
    
    // Add days of week headers
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    daysOfWeek.forEach(day => {
        calendarHTML += `<div class="calendar-day-header">${day}</div>`;
    });
    
    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dayOfWeek = date.getDay();
        const dateString = date.toISOString().split('T')[0];
        const isToday = day === today.getDate();
        const isPast = date < today;
        const hasAvailability = timeSlots[dayOfWeek] && timeSlots[dayOfWeek].length > 0;
        const isFullyBooked = hasAvailability && !isPast ? isDateFullyBooked(dateString) : false;
        
        let dayClass = 'calendar-day';
        if (isToday) dayClass += ' today';
        if (isPast) dayClass += ' past';
        if (hasAvailability && !isPast && !isFullyBooked) dayClass += ' available';
        if (isFullyBooked) dayClass += ' fully-booked';
        
        const clickHandler = (isPast || isFullyBooked) ? '' : `onclick="selectCalendarDate('${dateString}')"`;
        calendarHTML += `<div class="${dayClass}" data-date="${dateString}" ${clickHandler}>${day}</div>`;
    }
    
    calendarHTML += '</div></div>';
    
    // Add some basic styling
    calendarHTML += `
    <style>
    .calendar-simple {
        max-width: 300px;
        margin: 20px 0;
        font-family: Arial, sans-serif;
    }
    .calendar-header {
        text-align: center;
        font-weight: bold;
        margin-bottom: 10px;
        padding: 10px;
        background: #3A7D99;
        color: white;
        border-radius: 5px;
    }
    .calendar-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 2px;
    }
    .calendar-day-header {
        text-align: center;
        font-weight: bold;
        padding: 5px;
        background: #f5f5f5;
        font-size: 12px;
    }
    .calendar-day {
        text-align: center;
        padding: 8px 4px;
        border: 1px solid #ddd;
        cursor: pointer;
        min-height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .calendar-day.empty {
        border: none;
        cursor: default;
    }
    .calendar-day.past {
        background: #f5f5f5;
        color: #ccc;
        cursor: not-allowed;
    }
    .calendar-day.today {
        background: #3A7D99;
        color: white;
        font-weight: bold;
    }
    .calendar-day.available:hover {
        background: #e8f4fd;
    }
    .calendar-day.selected {
        background: #27ae60 !important;
        color: white !important;
    }
    .calendar-day.fully-booked {
        background: #f8d7da;
        color: #721c24;
        cursor: not-allowed;
        position: relative;
    }
    .calendar-day.fully-booked::after {
        content: '✕';
        position: absolute;
        top: 2px;
        right: 3px;
        font-size: 10px;
        color: #dc3545;
    }
    </style>`;
    
    calendarElement.innerHTML = calendarHTML;
    
    // Ensure date input is also working
    setupDateInput();
}

// Global function for calendar date selection
window.selectCalendarDate = function(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    
    // Don't allow past dates
    if (date < today) {
        return;
    }
    
    // Update the date input
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.value = dateString;
        selectedDate = dateString;
        
        // Trigger change event
        dateInput.dispatchEvent(new Event('change'));
        
        // Update calendar visual selection
        document.querySelectorAll('.calendar-day').forEach(day => {
            day.classList.remove('selected');
        });
        document.querySelector(`[data-date="${dateString}"]`).classList.add('selected');
    }
};

// Login Modal Functions
function showLoginModal() {
    console.log('🚀 showLoginModal() called');
    
    const modal = document.getElementById('loginModal');
    if (!modal) {
        console.error('❌ Login modal element not found!');
        alert('Login modal not found. Please check the page setup.');
        return;
    }
    
    console.log('✅ Login modal element found');
    
    // Show booking preview
    displayBookingPreview();
    
    // Pre-fill register form with booking data
    if (pendingBookingData) {
        const registerName = document.getElementById('registerName');
        const registerEmail = document.getElementById('registerEmail');
        const registerPhone = document.getElementById('registerPhone');
        
        if (registerName) registerName.value = pendingBookingData.clientName;
        if (registerEmail) registerEmail.value = pendingBookingData.email;
        if (registerPhone) registerPhone.value = pendingBookingData.phone;
    }
    
    console.log('🎨 Showing modal with emergency approach');
    modal.classList.add('show');
    
    // Force body scroll lock to prevent background scrolling
    document.body.style.overflow = 'hidden';
    
    // Ensure modal content is scrolled to top
    setTimeout(() => {
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.scrollTop = 0;
        }
    }, 50);
    
    console.log('✅ Login modal should now be visible');
    
    // Close modal when clicking outside
    modal.onclick = function(event) {
        if (event.target === modal) {
            closeLoginModal();
        }
    };
}

function closeLoginModal() {
    console.log('🚪 Closing login modal');
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.remove('show');
        // Restore body scrolling
        document.body.style.overflow = '';
    }
}

// Emergency function to make modal visible if it's off-screen
function repositionModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        // Force show the modal using the emergency approach
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.scrollTop = 0;
        }
        
        console.log('📍 Modal forced to show using emergency approach');
        alert('Modal should now be visible! If you still can\'t see it, try refreshing the page.');
    }
}

// Make repositioning function available globally for emergency use
window.repositionModal = repositionModal;

function displayBookingPreview() {
    const preview = document.getElementById('bookingPreview');
    if (!preview || !pendingBookingData) return;
    
    const serviceDisplayName = getServiceDisplayName(pendingBookingData.service);
    const dateObj = new Date(pendingBookingData.date + 'T00:00:00');
    const formattedDate = dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    preview.innerHTML = `
        <h4>Your Booking Details:</h4>
        <div class="booking-detail">
            <span>Service:</span>
            <span>${serviceDisplayName}</span>
        </div>
        <div class="booking-detail">
            <span>Date:</span>
            <span>${formattedDate}</span>
        </div>
        <div class="booking-detail">
            <span>Time:</span>
            <span>${pendingBookingData.time}</span>
        </div>
        <div class="booking-detail">
            <span>Total:</span>
            <span>$${pendingBookingData.price}</span>
        </div>
    `;
}

function showLoginTab() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    
    // Update tab buttons
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => tab.classList.remove('active'));
    tabs[0].classList.add('active');
}

function showRegisterTab() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    
    // Update tab buttons
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => tab.classList.remove('active'));
    tabs[1].classList.add('active');
}

function fillDemoLogin(email, password) {
    document.getElementById('loginEmail').value = email;
    document.getElementById('loginPassword').value = password;
    showLoginTab();
}

// Authentication Functions
function authenticateUser(email, password) {
    const users = window.sharedUsers || [];
    const user = users.find(u => u.username === email && u.password === password);
    
    if (user) {
        currentUser = user;
        return { success: true, user: user };
    }
    
    return { success: false, message: 'Invalid email or password.' };
}

function registerUser(userData) {
    const users = window.sharedUsers || [];
    
    // Check if user already exists
    if (users.find(u => u.username === userData.email)) {
        return { success: false, message: 'An account with this email already exists.' };
    }
    
    // Create new user
    const newUser = {
        id: Math.max(...users.map(u => u.id), 0) + 1,
        username: userData.email,
        password: userData.password,
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        role: 'user',
        totalAppointments: 0,
        lastVisit: null
    };
    
    // Add user using helper function or fallback
    if (window.addUser) {
        window.addUser(newUser);
    } else {
        users.push(newUser);
        window.sharedUsers = users;
    }
    
    currentUser = newUser;
    return { success: true, user: newUser };
}

function completeBookingAfterAuth() {
    if (!pendingBookingData || !currentUser) return;
    
    // Final check - ensure time slot is still available
    const bookedTimes = getBookedTimesForDate(pendingBookingData.date);
    if (bookedTimes.includes(pendingBookingData.time)) {
        alert('Sorry, this time slot was just booked by another user. Please select a different time.');
        closeLoginModal();
        updateAvailableTimes();
        return;
    }
    
    // Create the appointment with user information
    const newAppointment = {
        id: generateAppointmentId(),
        userId: currentUser.id,
        clientName: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone,
        service: getServiceDisplayName(pendingBookingData.service),
        date: pendingBookingData.date,
        time: pendingBookingData.time,
        price: parseInt(pendingBookingData.price),
        status: 'confirmed',
        notes: pendingBookingData.notes || '',
        paymentStatus: 'confirmed',
        paymentMethod: 'Online Booking',
        transactionId: `txn_${Date.now()}`,
        createdAt: new Date().toISOString()
    };
    
    // Add to shared appointments
    if (window.addAppointment) {
        window.addAppointment(newAppointment);
    } else {
        window.sharedAppointments = window.sharedAppointments || [];
        window.sharedAppointments.push(newAppointment);
    }
    
    // Update user's appointment count
    currentUser.totalAppointments++;
    currentUser.lastVisit = new Date().toISOString();
    
    // Close modal and show success
    closeLoginModal();
    
    alert(`Booking confirmed!\n\nWelcome ${currentUser.name}!\n\n` + 
          `Service: ${newAppointment.service}\n` +
          `Date: ${pendingBookingData.date}\n` +
          `Time: ${pendingBookingData.time}\n` +
          `Price: $${pendingBookingData.price}\n\n` +
          `Appointment ID: ${newAppointment.id}`);
    
    // Clear form and reset
    resetBookingForm();
    pendingBookingData = null;
}

// Authentication event listeners are now initialized from main DOMContentLoaded

function setupAuthEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            const result = authenticateUser(email, password);
            
            if (result.success) {
                completeBookingAfterAuth();
            } else {
                alert(result.message);
            }
        });
    }
    
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (password !== confirmPassword) {
                alert('Passwords do not match.');
                return;
            }
            
            const userData = {
                name: document.getElementById('registerName').value,
                email: document.getElementById('registerEmail').value,
                phone: document.getElementById('registerPhone').value,
                password: password
            };
            
            const result = registerUser(userData);
            
            if (result.success) {
                completeBookingAfterAuth();
            } else {
                alert(result.message);
            }
        });
    }
}

// Debug function for console testing (production simplified)
window.debugBooking = function() {
    return {
        selectedService,
        selectedPrice,
        selectedDate,
        selectedTime,
        currentUser,
        pendingBookingData,
        hasCalendar: document.getElementById('calendar') && document.getElementById('calendar').innerHTML.length > 0,
        hasService: document.getElementById('service') && document.getElementById('service').options.length > 1,
        urlService: new URLSearchParams(window.location.search).get('service')
    };
};