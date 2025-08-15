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
    
    // Clear any old session data that might be interfering
    localStorage.removeItem('currentUser');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('isAdmin');
    
    // Don't clear sessionToken and isLoggedIn here as they may be needed for session restoration
    // localStorage.removeItem('sessionToken');
    // localStorage.removeItem('isLoggedIn');
    
    // Clear any cached user data variables
    currentUser = null;
    
    // Clear secure session manager state only if we're starting fresh
    if (window.secureSession && !localStorage.getItem('sessionToken')) {
        window.secureSession.logout();
    }
    
    setupUserPortalFunctionality();
    // Delay profile form setup to ensure DOM is fully loaded
    setTimeout(setupProfileForm, 100);
    checkExistingSession();
});

async function checkExistingSession() {
    // Wait for UniversalSession to be available
    let attempts = 0;
    while (!window.universalSession && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (!window.universalSession) {
        console.log('🔒 Universal session manager not available - showing auth screen');
        showAuthScreen();
        return;
    }
    
    try {
        // Check for existing session using universal session manager
        console.log('🔒 Checking for existing user session via universal manager');
        
        const sessionUser = window.universalSession.getCurrentUser();
        const isLoggedIn = window.universalSession.isLoggedIn();
        
        console.log('🔒 Universal session check - isLoggedIn:', isLoggedIn);
        console.log('🔒 Universal session check - sessionUser:', sessionUser);
        
        if (isLoggedIn && sessionUser) {
            // Check if this is an admin user - redirect to admin panel
            if (sessionUser.role === 'admin') {
                console.log('🔒 Admin user detected in universal session, redirecting to admin panel');
                window.location.href = 'admin.html';
                return;
            } else {
                // Regular user - show user portal
                console.log('🔒 Regular user session found in universal, showing user portal');
                currentUser = sessionUser;
                showUserPortal(sessionUser);
                return;
            }
        }
        
        // No valid session - show auth screen
        console.log('🔒 No valid session found in universal - showing auth screen');
        showAuthScreen();
        
        /* COMMENTED OUT - Automatic session restoration disabled
        // Check if user is already logged in via secure session
        const sessionUser = window.secureSession.getCurrentUser();
        const isLoggedIn = window.secureSession.isLoggedIn();
        
        console.log('🔒 Session check - isLoggedIn:', isLoggedIn);
        console.log('🔒 Session check - sessionUser:', sessionUser);
        
        if (isLoggedIn && sessionUser) {
            // Check if this is an admin user - redirect to admin panel
            if (sessionUser.role === 'admin') {
                console.log('🔒 Admin user detected in session, redirecting to admin panel');
                window.location.href = 'admin.html';
                return;
            } else {
                // Regular user - show user portal
                console.log('🔒 Regular user session found, showing user portal');
                currentUser = sessionUser;
                showUserPortal(sessionUser);
                return;
            }
        }
        
        // No valid session - show auth screen
        console.log('🔒 No valid session found - showing auth screen');
        showAuthScreen();
        */
    } catch (error) {
        console.error('🔒 Session check error:', error);
        showAuthScreen();
    }
}

function setupUserPortalFunctionality() {
    console.log('🔒 Setting up user portal functionality...');
    
    // Setup auth forms
    if (loginForm) {
        console.log('🔒 Attaching login form event listener');
        loginForm.addEventListener('submit', handleSecureLogin);
        
        // Add button click listener as backup
        const loginButton = loginForm.querySelector('button[type="submit"]');
        if (loginButton) {
            console.log('🔒 Adding backup button click listener');
            loginButton.addEventListener('click', (e) => {
                console.log('🔒 Login button clicked!');
                if (!e.defaultPrevented) {
                    handleSecureLogin(e);
                }
            });
        }
    } else {
        console.error('🔒 Login form not found!');
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
    console.log('🔒 Password length:', password ? password.length : 0);
    console.log('🔒 Form event triggered correctly');
    
    // Clear any previous errors
    if (loginError) loginError.textContent = '';
    
    // Show loading state
    let submitBtn = event.target.querySelector('button[type="submit"]');
    if (!submitBtn) {
        // Try to find submit button in the form
        submitBtn = document.querySelector('#loginForm button[type="submit"]');
    }
    if (!submitBtn) {
        // Try to find any button in the login form
        submitBtn = document.querySelector('#loginForm button');
    }
    
    let originalText = 'Login';
    
    if (submitBtn) {
        originalText = submitBtn.textContent;
        submitBtn.textContent = 'Signing in...';
        submitBtn.disabled = true;
        console.log('🔒 Submit button found and updated');
    } else {
        console.warn('🔒 Submit button not found anywhere');
    }
    
    // Add timeout for the entire login process
    const loginTimeout = setTimeout(() => {
        if (submitBtn) {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
        if (loginError) loginError.textContent = 'Login timeout - please try again';
        console.error('🔒 Login process timed out');
    }, 10000); // 10 second timeout
    
    try {
        // Use secure session manager for authentication
        console.log('🔒 Trying secure session authentication...');
        
        // Check if secure session manager is available
        if (!window.secureSession) {
            throw new Error('Secure session manager not available');
        }
        
        // Clear any existing session first
        console.log('🔒 Clearing any existing session...');
        window.secureSession.logout();
        
        console.log('🔒 About to call secureSession.login...');
        const loginResult = await window.secureSession.login(email, password);
        console.log('🔒 Login call completed, result:', loginResult);
        
        console.log('🔒 Login result received:', loginResult);
        console.log('🔒 Login result success property:', loginResult.success);
        console.log('🔒 Login result user property:', loginResult.user);
        
        if (loginResult && loginResult.success) {
            console.log('🔒 Login successful:', loginResult.user);
            if (loginResult.user) {
                console.log('🔒 User role from login:', loginResult.user.role);
                console.log('🔒 User name from login:', loginResult.user.name);
            } else {
                console.error('🔒 No user data in login result');
            }
            
            // Clear timeout and restore button
            clearTimeout(loginTimeout);
            if (submitBtn) {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
            
            // Save session using universal manager
            if (window.universalSession) {
                const sessionSaved = window.universalSession.saveSession(loginResult.user);
                console.log('🔒 Universal session saved:', sessionSaved);
            }
            
            if (loginResult.user.role === 'admin') {
                // Redirect admin to admin panel
                console.log('🔒 Admin user detected, redirecting to admin panel');
                window.location.href = 'admin.html';
                return;
            } else {
                // Regular user - show user portal
                console.log('🔒 Regular user login - showing user portal');
                console.log('🔒 About to call showUserPortal with:', loginResult.user);
                
                // Ensure currentUser is set correctly
                currentUser = loginResult.user;
                console.log('🔒 Set currentUser to:', currentUser);
                
                showUserPortal(loginResult.user);
                return;
            }
        } else {
            // Login failed
            console.log('🔒 Login failed:', loginResult.error);
            if (loginError) loginError.textContent = loginResult.error || 'Invalid email or password';
        }
    } catch (error) {
        console.error('🔒 Login error caught:', error);
        console.error('🔒 Error message:', error.message);
        console.error('🔒 Error stack:', error.stack);
        if (loginError) loginError.textContent = 'Login system error - please try again';
    } finally {
        // Clear timeout and restore button state
        clearTimeout(loginTimeout);
        if (submitBtn) {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
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
            // Session managed by secure session manager
            
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
                // Session managed by secure session manager
                
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
    
    // Clear universal session
    if (window.universalSession) {
        window.universalSession.logout();
        console.log('🔒 Universal session cleared');
    }
    
    // Always clear local session
    currentUser = null;
    sessionStorage.removeItem('pendingBooking');
    
    // Clear secure session manager if available
    if (window.secureSession) {
        window.secureSession.logout();
    }
    
    showAuthScreen();
    console.log('🔒 User logout completed');
}

function showUserPortal(user = null) {
    console.log('🔒 showUserPortal called with user:', user);
    
    if (user) {
        currentUser = user;
        console.log('🔒 currentUser set to:', currentUser);
    }
    
    // If no user provided, try to get current user from secure session
    if (!currentUser && window.secureSession) {
        const sessionUser = window.secureSession.getCurrentUser();
        if (sessionUser) {
            currentUser = sessionUser;
            console.log('🔒 Retrieved user from secure session:', currentUser);
        }
    }
    
    console.log('🔒 Current user before display:', currentUser);
    
    if (authScreen) authScreen.style.display = 'none';
    if (userPortal) userPortal.style.display = 'block';
    
    // Update user name display with proper validation
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay && currentUser) {
        console.log('🔒 Setting user name display:', currentUser);
        console.log('🔒 User role:', currentUser.role);
        console.log('🔒 User name:', currentUser.name);
        console.log('🔒 User email:', currentUser.email);
        
        // Ensure we're using the actual user's name, not any cached admin data
        let displayName = '';
        if (currentUser.name && currentUser.name.trim() !== '' && currentUser.name !== 'Admin User') {
            displayName = currentUser.name.trim();
        } else if (currentUser.email && currentUser.email.trim() !== '') {
            displayName = currentUser.email.split('@')[0]; // Use email username part
        } else {
            displayName = 'User';
        }
        
        console.log('🔒 Final display name:', displayName);
        userNameDisplay.textContent = displayName;
    } else if (userNameDisplay) {
        console.warn('🔒 No current user found for name display');
        userNameDisplay.textContent = 'User';
    }
    
    // Load user data
    updateAccountSummary();
    loadUserAppointments();
    
    // Listen for membership changes
    window.addEventListener('membershipAdded', () => {
        console.log('🔒 Membership added event received, updating display');
        setTimeout(updateMembershipStatus, 100);
    });
    
    window.addEventListener('membershipUpdated', () => {
        console.log('🔒 Membership updated event received, updating display');
        setTimeout(updateMembershipStatus, 100);
    });
    
    window.addEventListener('userUpdated', (event) => {
        if (event.detail && event.detail.id === currentUser.id) {
            console.log('🔒 Current user updated, refreshing data');
            currentUser = event.detail;
            setTimeout(updateMembershipStatus, 100);
        }
    });
    
    window.addEventListener('membershipCancelled', () => {
        console.log('🔒 Membership cancelled event received, updating display');
        setTimeout(updateMembershipStatus, 100);
    });
    
    window.addEventListener('membershipReactivated', () => {
        console.log('🔒 Membership reactivated event received, updating display');
        setTimeout(updateMembershipStatus, 100);
    });
    
    // Listen for new appointments (prevent duplicate listeners)
    if (!window.appointmentAddedListenerAdded) {
        window.addEventListener('appointmentAdded', (event) => {
            console.log('🔒 New appointment added, refreshing appointments display');
            console.log('🔒 New appointment details:', event.detail);
            setTimeout(() => {
                loadUserAppointments();
                updateAccountSummary();
            }, 100);
        });
        window.appointmentAddedListenerAdded = true;
    }
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
        
        // Update membership status
        updateMembershipStatus();
        
    } catch (error) {
        console.error('🔒 Error updating account summary:', error);
    }
}

async function loadUserAppointments() {
    console.log('🔒 Loading user appointments...');
    console.log('🔒 Current user for appointment filtering:', currentUser);
    
    try {
        if (window.getAppointments) {
            const allAppointments = await window.getAppointments();
            console.log('🔒 Total appointments in system:', allAppointments.length);
            console.log('🔒 All appointments:', allAppointments);
            
            const userAppointments = allAppointments.filter(apt => {
                const matchesUserId = apt.userId === currentUser.id;
                const matchesEmail = apt.email === currentUser.email;
                console.log(`🔒 Appointment ${apt.id}: userId match=${matchesUserId}, email match=${matchesEmail}`);
                console.log(`🔒   apt.userId=${apt.userId}, currentUser.id=${currentUser.id}`);
                console.log(`🔒   apt.email=${apt.email}, currentUser.email=${currentUser.email}`);
                return matchesUserId || matchesEmail;
            });
            
            console.log('🔒 Filtered user appointments:', userAppointments.length, userAppointments);
            
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
    
    // Remove duplicates by ID before filtering
    const uniqueAppointments = appointments.filter((apt, index, self) => 
        index === self.findIndex(a => a.id === apt.id)
    );
    
    const upcoming = uniqueAppointments.filter(apt => 
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
    console.log('🔒 Show profile modal - function called!');
    
    if (!currentUser) {
        console.error('❌ No current user available');
        alert('Please log in to view your profile.');
        return;
    }
    
    console.log('✅ Current user found:', currentUser);
    
    // Get the profile modal
    const profileModal = document.getElementById('profileModal');
    if (!profileModal) {
        console.error('❌ Profile modal not found');
        alert('Profile modal not available.');
        return;
    }
    
    console.log('✅ Profile modal found, populating data...');
    
    // Populate form with current user data
    const nameField = document.getElementById('profileName');
    const emailField = document.getElementById('profileEmail');
    const phoneField = document.getElementById('profilePhone');
    const preferencesField = document.getElementById('profilePreferences');
    
    if (nameField) nameField.value = (currentUser.firstName + ' ' + currentUser.lastName).trim() || currentUser.name || '';
    if (emailField) emailField.value = currentUser.email || '';
    if (phoneField) phoneField.value = currentUser.phone || '';
    if (preferencesField) preferencesField.value = currentUser.preferences || '';
    
    console.log('✅ Form fields populated');
    
    // Show the modal
    profileModal.style.display = 'block';
    console.log('✅ Modal displayed');
    
    // Setup close functionality (only once per modal show)
    setupModalCloseHandlers(profileModal);
};

function setupModalCloseHandlers(modal) {
    // Remove any existing close handlers to prevent duplicates
    const closeButtons = modal.querySelectorAll('.close');
    closeButtons.forEach(btn => {
        // Remove existing event listeners by cloning the node
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        // Add new event listener
        newBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    });
    
    // Handle clicking outside modal (use event delegation to avoid conflicts)
    const handleOutsideClick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.removeEventListener('click', handleOutsideClick);
        }
    };
    
    // Add the event listener for this specific modal instance
    setTimeout(() => {
        document.addEventListener('click', handleOutsideClick);
    }, 100); // Small delay to prevent immediate closure
}

window.showHistory = function() {
    console.log('🔒 Show full history modal');
    // Implement history modal logic
};

function setupProfileForm() {
    console.log('🔧 Setting up profile form...');
    const profileForm = document.getElementById('profileForm');
    if (!profileForm) {
        console.error('❌ Profile form not found');
        // Try again after a delay
        setTimeout(setupProfileForm, 500);
        return;
    }
    
    console.log('✅ Profile form found, adding event listener');
    
    // Remove any existing event listeners
    const newForm = profileForm.cloneNode(true);
    profileForm.parentNode.replaceChild(newForm, profileForm);
    
    // Add event listener to the new form
    newForm.addEventListener('submit', function(e) {
        console.log('🔥 Profile form submitted!');
        e.preventDefault();
        
        if (!currentUser) {
            console.error('❌ No current user for profile update');
            alert('No user session found. Please log in again.');
            return;
        }
        
        console.log('✅ Processing profile update for user:', currentUser.id);
        
        // Get form data
        const formData = new FormData(newForm);
        const updatedData = {
            name: formData.get('name'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            preferences: formData.get('preferences')
        };
        
        // Split name into first and last name
        const nameParts = updatedData.name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Update current user object
        currentUser.firstName = firstName;
        currentUser.lastName = lastName;
        currentUser.name = updatedData.name;
        currentUser.email = updatedData.email;
        currentUser.phone = updatedData.phone;
        currentUser.preferences = updatedData.preferences;
        
        // Update in shared data if available
        if (window.updateUser) {
            try {
                window.updateUser(currentUser.id, currentUser);
                console.log('✅ Profile updated in shared data');
            } catch (error) {
                console.error('Error updating user in shared data:', error);
            }
        }
        
        // Update session
        if (window.universalSession) {
            window.universalSession.saveSession(currentUser);
            console.log('✅ Profile updated in session');
        }
        
        // Update display
        updateUserDisplay();
        
        // Close modal
        const profileModal = document.getElementById('profileModal');
        if (profileModal) {
            profileModal.style.display = 'none';
        }
        
        // Show success message
        alert('Profile updated successfully!');
        
        console.log('✅ Profile update completed successfully');
    });
}

// Update membership status display
function updateMembershipStatus() {
    try {
        if (!currentUser) {
            console.log('🔒 No current user for membership check');
            return;
        }
        
        console.log('🔒 Checking membership status for user:', currentUser.id);
        
        // Check membership records using getUserMemberships function
        if (window.getUserMemberships) {
            const userMemberships = window.getUserMemberships(currentUser.id);
            console.log('🔒 Found membership records:', userMemberships);
            
            // Find any membership (active or cancelled)
            const membership = userMemberships.find(m => m.status === 'active' || m.status === 'cancelled');
            
            if (membership) {
                console.log('🔒 Membership found:', membership.typeName, 'Status:', membership.status);
                
                if (membership.status === 'active') {
                    updateElement('membershipStatus', membership.typeName);
                    updateMembershipCard('#d4edda', '2px solid #28a745');
                    showMembershipManagement(membership);
                } else if (membership.status === 'cancelled') {
                    updateElement('membershipStatus', 'Cancelled');
                    updateMembershipCard('#fff3cd', '2px solid #ffc107');
                    showMembershipManagement(membership);
                } else {
                    updateElement('membershipStatus', 'None');
                    updateMembershipCard('', '');
                    hideMembershipManagement();
                }
                return;
            }
        }
        
        // Check if user has membership data in their profile (fallback)
        if (currentUser.membershipPlan && currentUser.membershipStatus === 'active') {
            console.log('🔒 Found membership in user profile:', currentUser.membershipPlan);
            const membershipNames = {
                'wellness': 'Wellness Member',
                'restoration-plus': 'Restoration Plus',
                'therapeutic-elite': 'Therapeutic Elite'
            };
            const displayName = membershipNames[currentUser.membershipPlan] || currentUser.membershipPlan;
            updateElement('membershipStatus', displayName);
            updateMembershipCard('#d4edda', '2px solid #28a745');
            return;
        }
        
        // No membership found
        console.log('🔒 No membership found');
        updateElement('membershipStatus', 'None');
        updateMembershipCard('', '');
        hideMembershipManagement();
        
    } catch (error) {
        console.error('🔒 Error updating membership status:', error);
        updateElement('membershipStatus', 'Error loading');
    }
}

// Helper function to update membership card styling
function updateMembershipCard(background, border) {
    const membershipCard = document.querySelector('.membership-card');
    if (membershipCard) {
        membershipCard.style.background = background;
        membershipCard.style.border = border;
    }
}

// Show membership management section
function showMembershipManagement(membership) {
    const membershipSection = document.getElementById('membershipSection');
    const membershipDetails = document.getElementById('membershipDetails');
    
    if (membershipSection && membershipDetails) {
        membershipSection.style.display = 'block';
        
        const isActive = membership.status === 'active';
        const isCancelled = membership.status === 'cancelled';
        
        let statusDisplay = isActive ? 
            '<span style="color: #28a745; font-weight: bold;">Active ✅</span>' :
            '<span style="color: #ffc107; font-weight: bold;">Cancelled ⚠️</span>';
        
        let actionButtons = '';
        if (isActive) {
            actionButtons = `
                <button onclick="showCancelMembershipModal(${membership.id})" class="btn-danger" style="margin-top: 1rem;">
                    Cancel Membership
                </button>
            `;
        } else if (isCancelled) {
            actionButtons = `
                <button onclick="handleMembershipReactivation(${membership.id})" class="btn-primary" style="margin-top: 1rem;">
                    Reactivate Membership
                </button>
                <a href="membership.html" class="btn-secondary" style="margin-top: 1rem; margin-left: 0.5rem;">
                    Choose New Plan
                </a>
            `;
        }
        
        let remainingInfo = '';
        if (membership.remainingSessions && membership.remainingSessions > 0) {
            remainingInfo = `<p><strong>Remaining Sessions:</strong> ${membership.remainingSessions}</p>`;
        }
        
        membershipDetails.innerHTML = `
            <div class="membership-info" style="background: #f8f9fa; padding: 1.5rem; border-radius: 8px; border: 1px solid #e9ecef;">
                <h4 style="margin-top: 0; color: #2c3e50;">${membership.typeName}</h4>
                <p><strong>Status:</strong> ${statusDisplay}</p>
                <p><strong>Price:</strong> $${membership.price}/month</p>
                <p><strong>Sessions Included:</strong> ${membership.sessionsIncluded} per month</p>
                <p><strong>Sessions Used:</strong> ${membership.sessionsUsed || 0}</p>
                ${remainingInfo}
                <p><strong>Start Date:</strong> ${membership.startDate}</p>
                <p><strong>End Date:</strong> ${membership.endDate}</p>
                ${membership.cancelDate ? `<p><strong>Cancelled Date:</strong> ${membership.cancelDate}</p>` : ''}
                <p><strong>Auto-Renew:</strong> ${membership.autoRenew ? 'Yes' : 'No'}</p>
                ${actionButtons}
            </div>
        `;
    }
}

// Hide membership management section
function hideMembershipManagement() {
    const membershipSection = document.getElementById('membershipSection');
    if (membershipSection) {
        membershipSection.style.display = 'none';
    }
}

// Show cancel membership modal
function showCancelMembershipModal(membershipId) {
    const modal = document.getElementById('membershipCancelModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Store membership ID for later use
        modal.dataset.membershipId = membershipId;
        
        // Setup modal close functionality
        setupMembershipCancelModal();
    }
}

// Setup membership cancel modal functionality
function setupMembershipCancelModal() {
    const modal = document.getElementById('membershipCancelModal');
    const confirmBtn = document.getElementById('confirmCancelBtn');
    const keepBtn = document.getElementById('keepMembershipBtn');
    const closeBtn = modal.querySelector('.close');
    
    // Close modal function
    const closeModal = () => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        
        // Reset form
        document.getElementById('cancellationReason').value = '';
        document.getElementById('cancellationComments').value = '';
    };
    
    // Event listeners
    closeBtn.onclick = closeModal;
    keepBtn.onclick = closeModal;
    
    // Close when clicking outside
    modal.onclick = (event) => {
        if (event.target === modal) {
            closeModal();
        }
    };
    
    // Confirm cancellation
    confirmBtn.onclick = () => {
        const membershipId = modal.dataset.membershipId;
        const reason = document.getElementById('cancellationReason').value;
        const comments = document.getElementById('cancellationComments').value;
        
        if (window.cancelMembership) {
            const result = window.cancelMembership(membershipId, reason, comments);
            if (result) {
                console.log('🔒 Membership cancelled successfully');
                closeModal();
                
                // Show success message
                alert('Your membership has been cancelled successfully. You can still use your remaining sessions until the end of your billing period.');
                
                // Refresh membership display
                setTimeout(updateMembershipStatus, 100);
            } else {
                alert('Failed to cancel membership. Please try again.');
            }
        }
    };
}

// Reactivate membership function (for user portal)
function handleMembershipReactivation(membershipId) {
    if (confirm('Are you sure you want to reactivate your membership? Billing will resume next month.')) {
        if (window.reactivateMembership) {
            const result = window.reactivateMembership(membershipId);
            if (result) {
                console.log('🔒 Membership reactivated successfully');
                alert('Your membership has been reactivated! Billing will resume and you have full member benefits.');
                setTimeout(updateMembershipStatus, 100);
            } else {
                alert('Failed to reactivate membership. Please try again.');
            }
        }
    }
}

// Make function globally available
window.handleMembershipReactivation = handleMembershipReactivation;

// Make function globally available
window.showCancelMembershipModal = showCancelMembershipModal;

console.log('🔒 Secure User Portal loaded successfully');