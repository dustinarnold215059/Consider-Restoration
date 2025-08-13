// Secure User Portal JavaScript
// Combines old user portal functionality with new server-side authentication

console.log('🔒 Secure User Portal loading...');

// Global variables
let currentUser = null;
let appointments = [];

// DOM Elements
const authScreen = document.getElementById('authScreen');
const userPortal = document.getElementById('userPortal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const logoutBtn = document.getElementById('logoutBtn');

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔒 User Portal DOM loaded, initializing...');
    setupUserPortalFunctionality();
    checkExistingSession();
});

async function checkExistingSession() {
    // Wait for CookieSessionManager to be available
    let attempts = 0;
    while (!window.CookieSessionManager && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (!window.CookieSessionManager) {
        console.error('❌ CookieSessionManager not available after waiting');
    } else {
        console.log('✅ CookieSessionManager is available');
    }
    
    try {
        // First try server-side session verification
        const apiUrl = typeof EnvConfig !== 'undefined' ? 
            EnvConfig.getAuthUrl('verify') : 
            'http://localhost:3060/api/auth/verify';
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            console.log('🔒 Existing server session found:', currentUser);
            showUserPortal();
            return;
        }
    } catch (error) {
        console.log('🔒 Server not available for session check, checking local storage...');
    }
    
    // Fallback to cookie session check
    if (window.CookieSessionManager) {
        const sessionUser = window.CookieSessionManager.getCurrentUser();
        if (sessionUser && sessionUser.role !== 'admin') {
            currentUser = sessionUser;
            console.log('🔒 Existing cookie user session found:', currentUser);
            showUserPortal();
            return;
        }
    }
    
    console.log('🔒 No existing user session');
    showAuthScreen();
}

function setupUserPortalFunctionality() {
    console.log('🔒 Setting up user portal functionality...');
    
    // Setup auth forms
    if (loginForm) {
        loginForm.addEventListener('submit', handleSecureLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleSecureRegister);
    }
    
    // Setup logout functionality
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Setup auth tabs
    setupAuthTabs();
    
    console.log('🔒 User portal functionality ready');
}

function setupAuthTabs() {
    const authTabs = document.querySelectorAll('.auth-tab');
    authTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            switchAuthTab(targetTab);
        });
    });
}

function switchAuthTab(tabName) {
    // Update tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update forms
    document.querySelectorAll('.auth-form').forEach(form => {
        form.classList.remove('active');
    });
    document.getElementById(`${tabName}Form`).classList.add('active');
    
    // Clear errors
    if (loginError) loginError.textContent = '';
    if (registerError) registerError.textContent = '';
}

async function handleSecureLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    console.log('🔒 Attempting user login with:', email);
    
    // Clear any previous errors
    if (loginError) loginError.textContent = '';
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Signing in...';
    submitBtn.disabled = true;
    
    // Add timeout for the entire login process
    const loginTimeout = setTimeout(() => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        if (loginError) loginError.textContent = 'Login timeout - please try again';
        console.error('🔒 Login process timed out');
    }, 10000); // 10 second timeout
    
    try {
        // First try server-side authentication
        console.log('🔒 Trying server-side user authentication...');
        
        const apiUrl = typeof EnvConfig !== 'undefined' ? 
            EnvConfig.getAuthUrl('login') : 
            'http://localhost:3060/api/auth/login';
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            const data = await response.json();
            
            if (data.user.role === 'admin') {
                // Redirect admin to admin panel
                console.log('🔒 Admin user detected, redirecting to admin panel');
                window.location.href = 'admin.html';
                return;
            }
            
            // Successful user login
            console.log('🔒 Server-side user login successful');
            currentUser = data.user;
            
            // Use cookie session manager instead of localStorage
            if (window.CookieSessionManager) {
                window.CookieSessionManager.login(data.user);
            }
            
            // Check for pending booking
            if (sessionStorage.getItem('pendingBooking')) {
                window.location.href = 'booking.html';
            } else {
                showUserPortal();
            }
            
            clearTimeout(loginTimeout);
            loginForm.reset();
            if (loginError) loginError.textContent = '';
            return;
        } else {
            console.log('🔒 Server login failed, trying fallback...');
        }
    } catch (error) {
        console.log('🔒 Server not available, using fallback authentication:', error.message);
    }
    
    // Fallback to client-side authentication (for development)
    console.log('🔒 Using fallback client-side user authentication...');
    
    try {
        // Use the existing authentication functions
        let user = null;
        
        if (window.authenticateUser) {
            user = window.authenticateUser(email, password);
        }
        
        if (user) {
            console.log('🔒 Fallback user login successful');
            currentUser = user;
            
            if (user.role === 'admin') {
                window.location.href = 'admin.html';
                return;
            }
            
            // Use cookie session manager instead of localStorage
            if (window.CookieSessionManager) {
                window.CookieSessionManager.login(user);
            }
            
            if (sessionStorage.getItem('pendingBooking')) {
                window.location.href = 'booking.html';
            } else {
                showUserPortal();
            }
            
            clearTimeout(loginTimeout);
            loginForm.reset();
            if (loginError) loginError.textContent = '';
        } else {
            if (loginError) loginError.textContent = 'Invalid email or password';
        }
    } catch (error) {
        console.error('🔒 Fallback login error:', error);
        if (loginError) loginError.textContent = 'Login failed. Please try again.';
    } finally {
        // Clear timeout and restore button state
        clearTimeout(loginTimeout);
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

async function handleSecureRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    console.log('🔒 Attempting user registration with:', email);
    
    // Validate passwords match
    if (password !== confirmPassword) {
        if (registerError) registerError.textContent = 'Passwords do not match';
        return;
    }
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Creating Account...';
    submitBtn.disabled = true;
    
    try {
        // First try server-side registration
        console.log('🔒 Trying server-side user registration...');
        
        const apiUrl = typeof EnvConfig !== 'undefined' ? 
            EnvConfig.getAuthUrl('register') : 
            'http://localhost:3060/api/auth/register';
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, phone, password })
        });

        if (response.ok) {
            const data = await response.json();
            
            // Successful registration
            console.log('🔒 Server-side user registration successful');
            currentUser = data.user;
            
            // Use cookie session manager instead of localStorage
            if (window.CookieSessionManager) {
                window.CookieSessionManager.login(data.user);
            }
            
            showUserPortal();
            
            registerForm.reset();
            if (registerError) registerError.textContent = '';
            return;
        } else {
            const errorData = await response.json();
            if (registerError) registerError.textContent = errorData.message || 'Registration failed';
            return;
        }
    } catch (error) {
        console.log('🔒 Server not available, using fallback registration:', error.message);
    }
    
    // Fallback to client-side registration
    console.log('🔒 Using fallback client-side user registration...');
    
    try {
        const userData = { name, email, phone, password };
        
        if (window.addUser) {
            const newUser = await window.addUser(userData);
            
            if (newUser) {
                console.log('🔒 Fallback user registration successful');
                currentUser = newUser;
                
                // Use cookie session manager instead of localStorage
                if (window.CookieSessionManager) {
                    window.CookieSessionManager.login(newUser);
                }
                
                showUserPortal();
                
                registerForm.reset();
                if (registerError) registerError.textContent = '';
            } else {
                if (registerError) registerError.textContent = 'Registration failed. Email may already exist.';
            }
        } else {
            if (registerError) registerError.textContent = 'Registration system not available';
        }
    } catch (error) {
        console.error('🔒 Fallback registration error:', error);
        if (registerError) registerError.textContent = 'Registration failed. Please try again.';
    } finally {
        // Restore button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

async function handleLogout() {
    try {
        // Try server-side logout
        const apiUrl = typeof EnvConfig !== 'undefined' ? 
            EnvConfig.getAuthUrl('logout') : 
            'http://localhost:3060/api/auth/logout';
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });

        console.log('🔒 Server logout attempted');
    } catch (error) {
        console.log('🔒 Server logout failed, proceeding with local logout');
    }
    
    // Always clear local session
    currentUser = null;
    sessionStorage.removeItem('pendingBooking');
    
    // Clear cookie session manager if available
    if (window.CookieSessionManager) {
        window.CookieSessionManager.logout();
    }
    
    showAuthScreen();
    console.log('🔒 User logout completed');
}

function showUserPortal() {
    if (authScreen) authScreen.style.display = 'none';
    if (userPortal) userPortal.style.display = 'block';
    
    // Update user name display
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay && currentUser) {
        userNameDisplay.textContent = currentUser.name || currentUser.email;
    }
    
    // Load user data
    updateAccountSummary();
    loadUserAppointments();
}

function showAuthScreen() {
    if (authScreen) authScreen.style.display = 'flex';
    if (userPortal) userPortal.style.display = 'none';
}

async function updateAccountSummary() {
    console.log('🔒 Updating account summary...');
    
    try {
        // Get user appointments
        let userAppointments = [];
        
        if (window.getAppointments) {
            const allAppointments = await window.getAppointments();
            userAppointments = allAppointments.filter(apt => 
                apt.userId === currentUser.id || 
                apt.email === currentUser.email
            );
        }
        
        // Update stats
        const totalVisits = userAppointments.filter(apt => apt.status === 'completed').length;
        const upcomingAppointments = userAppointments.filter(apt => 
            apt.status === 'confirmed' && new Date(apt.date) > new Date()
        );
        
        // Update UI elements
        updateElement('totalVisits', totalVisits);
        
        if (upcomingAppointments.length > 0) {
            const nextApt = upcomingAppointments[0];
            updateElement('nextAppointment', `${nextApt.date} at ${nextApt.time}`);
        } else {
            updateElement('nextAppointment', 'None scheduled');
        }
        
        // Find favorite service
        const services = userAppointments.map(apt => apt.service);
        const serviceCounts = {};
        services.forEach(service => {
            serviceCounts[service] = (serviceCounts[service] || 0) + 1;
        });
        
        const favoriteService = Object.keys(serviceCounts).reduce((a, b) => 
            serviceCounts[a] > serviceCounts[b] ? a : b, 'None'
        );
        
        updateElement('favoriteService', serviceCounts[favoriteService] ? favoriteService : 'None');
        
    } catch (error) {
        console.error('🔒 Error updating account summary:', error);
    }
}

async function loadUserAppointments() {
    console.log('🔒 Loading user appointments...');
    
    try {
        if (window.getAppointments) {
            const allAppointments = await window.getAppointments();
            const userAppointments = allAppointments.filter(apt => 
                apt.userId === currentUser.id || 
                apt.email === currentUser.email
            );
            
            displayUpcomingAppointments(userAppointments);
            displayRecentAppointments(userAppointments);
        }
    } catch (error) {
        console.error('🔒 Error loading appointments:', error);
    }
}

function displayUpcomingAppointments(appointments) {
    const upcomingContainer = document.getElementById('upcomingAppointments');
    if (!upcomingContainer) return;
    
    const upcoming = appointments.filter(apt => 
        apt.status === 'confirmed' && new Date(apt.date) > new Date()
    ).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (upcoming.length === 0) {
        upcomingContainer.innerHTML = '<p>No upcoming appointments</p>';
        return;
    }
    
    upcomingContainer.innerHTML = upcoming.map(apt => `
        <div class="appointment-card">
            <div class="appointment-info">
                <h4>${apt.service}</h4>
                <p><strong>Date:</strong> ${apt.date}</p>
                <p><strong>Time:</strong> ${apt.time}</p>
            </div>
            <div class="appointment-actions">
                <button onclick="viewAppointment('${apt.id}')" class="btn-small">View</button>
                <button onclick="rescheduleAppointment('${apt.id}')" class="btn-small">Reschedule</button>
            </div>
        </div>
    `).join('');
}

function displayRecentAppointments(appointments) {
    const historyContainer = document.getElementById('appointmentHistory');
    if (!historyContainer) return;
    
    const recent = appointments.filter(apt => 
        apt.status === 'completed'
    ).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    
    if (recent.length === 0) {
        historyContainer.innerHTML = '<p>No appointment history</p>';
        return;
    }
    
    historyContainer.innerHTML = recent.map(apt => `
        <div class="appointment-card">
            <div class="appointment-info">
                <h4>${apt.service}</h4>
                <p><strong>Date:</strong> ${apt.date}</p>
                <p><strong>Status:</strong> ${apt.status}</p>
            </div>
            <div class="appointment-actions">
                <button onclick="viewAppointment('${apt.id}')" class="btn-small">View</button>
                <button onclick="rebookService('${apt.service}')" class="btn-small">Book Again</button>
            </div>
        </div>
    `).join('');
}

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

// Global functions for button handlers
window.viewAppointment = function(id) {
    console.log('🔒 View appointment:', id);
    // Implement appointment viewing logic
};

window.rescheduleAppointment = function(id) {
    console.log('🔒 Reschedule appointment:', id);
    // Redirect to booking page with reschedule info
    sessionStorage.setItem('rescheduleAppointment', id);
    window.location.href = 'booking.html';
};

window.rebookService = function(service) {
    console.log('🔒 Rebook service:', service);
    // Redirect to booking page with pre-selected service
    sessionStorage.setItem('selectedService', service);
    window.location.href = 'booking.html';
};

window.showProfile = function() {
    console.log('🔒 Show profile modal');
    // Implement profile modal logic
};

window.showHistory = function() {
    console.log('🔒 Show full history modal');
    // Implement history modal logic
};

console.log('🔒 Secure User Portal loaded successfully');