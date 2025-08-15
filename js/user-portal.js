// User Portal JavaScript
console.log('🔍 DEBUG: user-portal.js starting to load...');

// Import user data from admin.js (simulated database)
let currentUser = null;

// Users are now managed securely through shared-data.js
// No hardcoded passwords in client-side code

// Sample appointments data (matches admin.js)
const appointments = [
    {
        id: 1,
        userId: 2,
        clientName: 'John Doe',
        email: 'john.doe@email.com',
        phone: '(555) 234-5678',
        service: 'Swedish Massage',
        date: '2024-01-15',
        time: '10:00 AM',
        price: 80,
        status: 'confirmed',
        notes: 'First time client, prefers light pressure'
    },
    {
        id: 2,
        userId: 3,
        clientName: 'Jane Smith',
        email: 'jane.smith@email.com',
        phone: '(555) 345-6789',
        service: 'Deep Tissue Massage',
        date: '2024-01-15',
        time: '2:00 PM',
        price: 90,
        status: 'confirmed',
        notes: 'Focus on neck and shoulders'
    },
    {
        id: 3,
        userId: 2,
        clientName: 'John Doe',
        email: 'john.doe@email.com',
        phone: '(555) 234-5678',
        service: 'Sports Massage',
        date: '2024-01-16',
        time: '11:00 AM',
        price: 85,
        status: 'pending',
        notes: 'Pre-marathon preparation'
    },
    {
        id: 4,
        userId: 3,
        clientName: 'Jane Smith',
        email: 'jane.smith@email.com',
        phone: '(555) 345-6789',
        service: 'Hot Stone Massage',
        date: '2024-01-17',
        time: '9:00 AM',
        price: 100,
        status: 'confirmed',
        notes: 'Relaxation session'
    },
    // Past appointments
    {
        id: 5,
        userId: 2,
        clientName: 'John Doe',
        email: 'john.doe@email.com',
        phone: '(555) 234-5678',
        service: 'Deep Tissue Massage',
        date: '2024-01-05',
        time: '2:00 PM',
        price: 90,
        status: 'completed',
        notes: 'Great session, felt much better'
    },
    {
        id: 6,
        userId: 3,
        clientName: 'Jane Smith',
        email: 'jane.smith@email.com',
        phone: '(555) 345-6789',
        service: 'Swedish Massage',
        date: '2024-01-03',
        time: '11:00 AM',
        price: 80,
        status: 'completed',
        notes: 'Very relaxing'
    },
    {
        id: 7,
        userId: 2,
        clientName: 'John Doe',
        email: 'john.doe@email.com',
        phone: '(555) 234-5678',
        service: 'Sports Massage',
        date: '2023-12-20',
        time: '10:00 AM',
        price: 85,
        status: 'completed',
        notes: 'Post-workout recovery'
    }
];

// DOM Elements
const authScreen = document.getElementById('authScreen');
const userPortal = document.getElementById('userPortal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginError = document.getElementById('loginError');
const registerError = document.getElementById('registerError');
const logoutBtn = document.getElementById('logoutBtn');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 DEBUG: DOMContentLoaded fired');
    console.log('🔍 DEBUG: window.sharedAppointments:', window.sharedAppointments ? window.sharedAppointments.length : 'undefined');
    console.log('🔍 DEBUG: window.sharedUsers:', window.sharedUsers ? window.sharedUsers.length : 'undefined');

    // Simple session check - no complex waiting
    function checkAndRestoreSession() {
        let user = window.getCurrentUser ? window.getCurrentUser() : null;
        
        // Fallback: check localStorage directly if SimpleSessionManager fails
        if (!user) {
            console.log('🔐 SimpleSessionManager returned null, checking localStorage directly...');
            const storedUser = localStorage.getItem('currentUser');
            const isLoggedIn = localStorage.getItem('isLoggedIn');
            
            if (storedUser && isLoggedIn === 'true') {
                try {
                    user = JSON.parse(storedUser);
                    console.log('🔐 Direct localStorage session found:', user.name);
                    
                    // Basic validation
                    if (user.id && user.email) {
                        // Check if session is not too old (7 days)
                        if (user.loginTime) {
                            const loginTime = new Date(user.loginTime);
                            const now = new Date();
                            const sessionAge = now - loginTime;
                            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
                            
                            if (sessionAge > maxAge) {
                                console.log('🔐 Session expired, clearing...');
                                localStorage.removeItem('currentUser');
                                localStorage.removeItem('isLoggedIn');
                                user = null;
                            }
                        }
                    } else {
                        console.log('🔐 Invalid session data, clearing...');
                        localStorage.removeItem('currentUser');
                        localStorage.removeItem('isLoggedIn');
                        user = null;
                    }
                } catch (error) {
                    console.error('🔐 Error parsing session data:', error);
                    localStorage.removeItem('currentUser');
                    localStorage.removeItem('isLoggedIn');
                    user = null;
                }
            }
        }
        
        if (user) {
            console.log('🔐 Session restored for user:', user.name);
            currentUser = user;
            showUserPortal();
        } else {
            console.log('🔐 No valid session found, showing auth screen');
            showAuthScreen();
        }
    }

    // Start session check with minimal delay
    setTimeout(checkAndRestoreSession, 300);
    
    // Clear any stale data and ensure fresh data load
    if (window.loadFromStorage) {
        window.loadFromStorage();
        console.log('🔍 DEBUG: loadFromStorage called');
    }
    
    setupEventListeners();
    console.log('🔍 DEBUG: setupEventListeners called');
    
    checkAuthStatus();
    console.log('🔍 DEBUG: checkAuthStatus called');
    
    // Check URL parameters to determine which tab to show
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    
    if (action === 'register') {
        switchAuthTab('register');
    } else if (action === 'login') {
        switchAuthTab('login');
    }
    
    // Show a message if they came from booking
    if (sessionStorage.getItem('pendingBooking')) {
        setTimeout(() => {
            const message = document.createElement('div');
            message.className = 'booking-redirect-message';
            message.innerHTML = `
                <div style="background: #e8f4f8; padding: 1rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #3A7D99;">
                    <strong>🏥 Complete Your Booking</strong><br>
                    Please ${action === 'register' ? 'create an account' : 'login'} to finish booking your appointment. Your booking information has been saved.
                </div>
            `;
            
            const authScreen = document.getElementById('authScreen');
            if (authScreen) {
                authScreen.insertBefore(message, authScreen.firstChild);
            }
        }, 100);
    }
});

function setupEventListeners() {
    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchAuthTab(this.dataset.tab);
        });
    });
    
    // Forms
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    logoutBtn.addEventListener('click', handleLogout);
    
    // Profile form
    document.getElementById('profileForm')?.addEventListener('submit', handleProfileUpdate);
    
    // Modal close buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
    
    // View all history button
    document.getElementById('viewAllHistory')?.addEventListener('click', showHistory);
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
    loginError.textContent = '';
    registerError.textContent = '';
}

// Show user portal (logged in state)
function showUserPortal() {
    authScreen.style.display = 'none';
    userPortal.style.display = 'block';
    
    // Load user data and appointments
    updateAccountSummary();
    loadUserAppointments();
}

// Show authentication screen (not logged in state)
function showAuthScreen() {
    authScreen.style.display = 'flex';
    userPortal.style.display = 'none';
    
    // Initialize auth screen
    initializeAuthScreen();
}

async function handleLogin(e) {
    e.preventDefault();
    console.log('🔍 DEBUG handleLogin() called');
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Signing in...';
    submitBtn.disabled = true;
    
    try {
        let user = null;
        
        // Try secure server-side authentication first
        if (window.serverAvailable && window.authenticateUserSecure) {
            try {
                user = await window.authenticateUserSecure(email, password);
                console.log('🔗 Server authentication successful');
            } catch (error) {
                console.warn('🔗 Server auth failed, trying fallback:', error.message);
            }
        }
        
        // Fallback to client-side authentication if server not available
        if (!user && window.authenticateUser) {
            user = window.authenticateUser(email, password);
            console.log('🔒 Using fallback client-side authentication');
        }
        
        if (user) {
            currentUser = user;
            
            // Use SimpleSessionManager to handle login
            if (window.SimpleSessionManager) {
                window.SimpleSessionManager.login(user);
            } else {
                // Fallback to direct localStorage
                localStorage.setItem('currentUser', JSON.stringify(user));
                localStorage.setItem('isLoggedIn', 'true');
            }
            
            // Check if user is admin
            if (user.role === 'admin') {
                // Redirect admin to admin panel silently
                window.location.href = 'admin.html';
                return;
            } else {
                // Regular user - check if they came from booking page
                if (sessionStorage.getItem('pendingBooking')) {
                    // Redirect back to booking page to complete booking automatically
                    window.location.href = 'booking.html';
                } else {
                    // Show user portal
                    showUserPortal();
                }
            }
            
            loginError.textContent = '';
        } else {
            loginError.textContent = 'Invalid email or password';
        }
    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = 'Login failed. Please try again.';
    } finally {
        // Restore button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const phone = document.getElementById('registerPhone').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (password !== confirmPassword) {
        registerError.textContent = 'Passwords do not match';
        return;
    }
    
    // Get users from shared data system
    const allUsers = window.getUsers ? window.getUsers() : [];
    if (allUsers.find(u => u.email === email)) {
        registerError.textContent = 'An account with this email already exists';
        return;
    }
    
    // Create new user with secure password hash
    let passwordHash;
    try {
        if (typeof dcodeIO !== 'undefined' && dcodeIO.bcrypt) {
            // Generate secure bcrypt hash
            const salt = dcodeIO.bcrypt.genSaltSync(12);
            passwordHash = dcodeIO.bcrypt.hashSync(password, salt);
            console.log('🔒 Generated secure bcrypt hash for new user registration');
        } else {
            // Fallback to simpleHash (INSECURE)
            console.warn('🔒 bcrypt.js not available in user portal, using insecure fallback');
            passwordHash = window.simpleHash ? window.simpleHash(password) : 'hashed_' + password + '_secure';
        }
    } catch (error) {
        console.error('🔒 Password hashing error in user portal:', error);
        passwordHash = window.simpleHash ? window.simpleHash(password) : 'hashed_' + password + '_secure';
    }

    const newUserData = {
        username: email,
        passwordHash: passwordHash, // Use hashed password instead of plaintext
        name: name,
        email: email,
        phone: phone,
        role: 'user',
        totalAppointments: 0,
        lastVisit: new Date().toISOString(),
        preferences: ''
    };
    
    // Add to shared data system (which handles ID assignment and persistence)
    let newUser;
    if (window.addUser) {
        newUser = window.addUser(newUserData);
    } else {
        console.error('Shared data system not available for user registration');
        registerError.textContent = 'Registration system temporarily unavailable';
        return;
    }
    
    // Create secure session user object
    const sessionUser = {
        ...newUser,
        loginTime: new Date().toISOString(),
        sessionToken: window.generateSecureSessionToken ? window.generateSecureSessionToken() : `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 15)}`
    };
    
    currentUser = sessionUser;
    
    // Debug log to verify user creation
    console.log('New user registered:', newUser);
    console.log('Session user created:', sessionUser);
    console.log('All users after registration:', window.getUsers ? window.getUsers() : users);
    
    // Use SimpleSessionManager to handle login
    if (window.SimpleSessionManager) {
        window.SimpleSessionManager.login(sessionUser);
    } else {
        // Fallback to direct localStorage
        localStorage.setItem('currentUser', JSON.stringify(sessionUser));
        localStorage.setItem('isLoggedIn', 'true');
    }
    
    // Check if they came from booking page
    if (sessionStorage.getItem('pendingBooking')) {
        // Redirect back to booking page to complete booking automatically
        window.location.href = 'booking.html';
    } else {
        showUserPortal();
    }
    
    registerError.textContent = '';
}

function handleLogout() {
    currentUser = null;
    
    // Use SimpleSessionManager for logout
    if (window.SimpleSessionManager) {
        window.SimpleSessionManager.logout();
    } else if (window.secureLogout) {
        window.secureLogout();
    } else {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isLoggedIn');
    }
    
    authScreen.style.display = 'flex';
    userPortal.style.display = 'none';
    loginForm.reset();
    registerForm.reset();
}

async function checkAuthStatus() {
    try {
        let user = null;
        
        // Try secure server-side session validation first
        if (window.serverAvailable && window.validateSessionSecure) {
            try {
                user = await window.validateSessionSecure();
                console.log('🔗 Server session validation successful');
            } catch (error) {
                console.warn('🔗 Server session validation failed:', error.message);
            }
        }
        
        // Fallback to client-side validation if server not available
        if (!user && window.validateSession) {
            user = window.validateSession();
            console.log('🔒 Using fallback client-side session validation');
        }
        
        if (user && user.role === 'user') {
            // User is logged in, show portal directly
            currentUser = user;
            showUserPortal();
            return;
        } else if (user && user.role === 'admin') {
            // Admin user, redirect to admin panel
            window.location.href = 'admin.html';
            return;
        }
        
        // No valid user found, show login screen
        authScreen.style.display = 'flex';
        userPortal.style.display = 'none';
        
    } catch (error) {
        console.error('Auth status check error:', error);
        authScreen.style.display = 'flex';
        userPortal.style.display = 'none';
    }
}

function showUserPortal() {
    console.log('🔍 DEBUG showUserPortal() called');
    authScreen.style.display = 'none';
    userPortal.style.display = 'block';
    initializePortal();
}

function initializePortal() {
    console.log('🔍 DEBUG initializePortal() called');
    console.log('Current user in initializePortal:', currentUser);
    
    // Update user name display
    document.getElementById('userNameDisplay').textContent = currentUser.name;
    
    // Load portal data
    console.log('🔍 About to call loadUpcomingAppointments...');
    loadUpcomingAppointments();
    loadRecentAppointments();
    updateAccountSummary();
}

function loadUpcomingAppointments() {
    const container = document.getElementById('upcomingAppointments');
    const today = new Date();
    
    // Use shared appointments data instead of local array
    const allAppointments = window.sharedAppointments || appointments;
    console.log('🔍 DEBUG loadUpcomingAppointments()');
    console.log('Current user:', currentUser);
    console.log('Current user ID:', currentUser?.id);
    console.log('Total appointments in system:', allAppointments.length);
    console.log('Today date:', today);
    console.log('All appointments:', allAppointments);
    
    const upcomingAppts = allAppointments.filter(apt => {
        const matches = apt.userId === currentUser.id && 
               new Date(apt.date) >= today &&
               apt.status !== 'cancelled';
        if (matches) {
            console.log('Found upcoming appointment:', apt);
        }
        return matches;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (upcomingAppts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📅</div>
                <p>No upcoming appointments</p>
                <a href="booking.html" class="btn-secondary">Book An Appointment</a>
            </div>
        `;
        return;
    }
    
    const appointmentsHTML = upcomingAppts.map(apt => `
        <div class="appointment-item ${apt.status}" onclick="openAppointmentDetails(${apt.id})">
            <div class="appointment-info">
                <h4>${apt.service}</h4>
                <p>${formatDate(apt.date)} at ${apt.time}</p>
                <p>$${apt.price}</p>
            </div>
            <div class="appointment-status status-${apt.status}">${apt.status}</div>
        </div>
    `).join('');
    
    container.innerHTML = appointmentsHTML;
}

function loadRecentAppointments() {
    const container = document.getElementById('appointmentHistory');
    
    // Use shared appointments data instead of local array
    const allAppointments = window.sharedAppointments || appointments;
    console.log('Loading recent appointments for user:', currentUser.id);
    
    const recentAppts = allAppointments.filter(apt => {
        const matches = apt.userId === currentUser.id;
        if (matches) {
            console.log('Found user appointment:', apt);
        }
        return matches;
    }).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
    
    if (recentAppts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <p>No appointment history</p>
            </div>
        `;
        return;
    }
    
    const appointmentsHTML = recentAppts.map(apt => {
        const isPast = new Date(apt.date) < new Date();
        return `
            <div class="appointment-item ${isPast ? 'past' : ''} ${apt.status}" onclick="openAppointmentDetails(${apt.id})">
                <div class="appointment-info">
                    <h4>${apt.service}</h4>
                    <p>${formatDate(apt.date)} at ${apt.time}</p>
                    <p>$${apt.price}</p>
                </div>
                <div class="appointment-status status-${apt.status}">${apt.status}</div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = appointmentsHTML;
}

function updateAccountSummary() {
    // Use shared appointments data instead of local array
    const allAppointments = window.sharedAppointments || appointments;
    const userAppointments = allAppointments.filter(apt => apt.userId === currentUser.id);
    console.log('Updating account summary for user:', currentUser.id);
    console.log('User appointments found:', userAppointments.length);
    
    // Total visits (completed appointments)
    const totalVisits = userAppointments.filter(apt => apt.status === 'completed').length;
    const totalVisitsEl = document.getElementById('totalVisits');
    if (totalVisitsEl) {
        totalVisitsEl.textContent = totalVisits;
    } else {
        console.warn('totalVisits element not found');
    }
    
    // Favorite service
    const serviceCount = {};
    userAppointments.forEach(apt => {
        serviceCount[apt.service] = (serviceCount[apt.service] || 0) + 1;
    });
    
    const favoriteService = Object.entries(serviceCount)
        .sort((a, b) => b[1] - a[1])[0];
    
    const favoriteServiceEl = document.getElementById('favoriteService');
    if (favoriteServiceEl) {
        favoriteServiceEl.textContent = favoriteService ? favoriteService[0].replace(' Massage', '') : '-';
    } else {
        console.warn('favoriteService element not found');
    }
    
    // Next appointment
    const nextApt = allAppointments.find(apt => 
        apt.userId === currentUser.id && 
        new Date(apt.date) >= new Date() &&
        apt.status !== 'cancelled'
    );
    
    const nextAppointmentEl = document.getElementById('nextAppointment');
    if (nextAppointmentEl) {
        nextAppointmentEl.textContent = nextApt ? formatDate(nextApt.date, true) : 'None scheduled';
    } else {
        console.warn('nextAppointment element not found');
    }
    
    // Membership status
    const membershipStatusEl = document.getElementById('membershipStatus');
    if (membershipStatusEl) {
        const membershipStatus = getMembershipDisplayName(currentUser.membershipPlan);
        const membershipCard = membershipStatusEl.closest('.membership-card');
        
        if (currentUser.membershipPlan) {
            // User has active membership - show status with cancel button
            membershipStatusEl.innerHTML = `
                <div class="membership-info">
                    <div class="membership-name">${membershipStatus}</div>
                    <button class="cancel-membership-btn" onclick="cancelMembership()">Cancel Plan</button>
                </div>
            `;
        } else {
            // No membership - show "None" with join link
            membershipStatusEl.innerHTML = `
                <div class="membership-info">
                    <div class="membership-name">None</div>
                    <a href="membership.html" class="join-membership-link">Join Now</a>
                </div>
            `;
        }
        
        // Add styling based on membership status
        if (membershipCard) {
            membershipCard.classList.remove('no-membership', 'has-membership');
            membershipCard.classList.add(currentUser.membershipPlan ? 'has-membership' : 'no-membership');
        }
    } else {
        console.warn('membershipStatus element not found');
    }
}

function showProfile() {
    const modal = document.getElementById('profileModal');
    const form = document.getElementById('profileForm');
    
    // Populate form with current user data
    document.getElementById('profileName').value = currentUser.name;
    document.getElementById('profileEmail').value = currentUser.email;
    document.getElementById('profilePhone').value = currentUser.phone;
    document.getElementById('profilePreferences').value = currentUser.preferences || '';
    
    modal.style.display = 'block';
}

function handleProfileUpdate(e) {
    e.preventDefault();
    
    // Update current user data
    currentUser.name = document.getElementById('profileName').value;
    currentUser.email = document.getElementById('profileEmail').value;
    currentUser.phone = document.getElementById('profilePhone').value;
    currentUser.preferences = document.getElementById('profilePreferences').value;
    
    // Update the user in the shared data system
    if (window.updateUser) {
        window.updateUser(currentUser.id, currentUser);
    }
    
    // Update display
    document.getElementById('userNameDisplay').textContent = currentUser.name;
    
    // Close modal
    document.getElementById('profileModal').style.display = 'none';
    
    // Profile updated - show brief visual feedback
    showTemporaryMessage('Profile updated successfully!', 'success');
}

function showHistory() {
    const modal = document.getElementById('historyModal');
    const container = document.getElementById('fullHistory');
    
    // Use shared appointments data instead of local array
    const allAppointments = window.sharedAppointments || appointments;
    const userAppointments = allAppointments.filter(apt => apt.userId === currentUser.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    console.log('Loading full history for user:', currentUser.id);
    console.log('User appointments found:', userAppointments.length);
    
    if (userAppointments.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <p>No appointment history found</p>
            </div>
        `;
    } else {
        // Group by year and month
        const groupedAppts = groupAppointmentsByMonth(userAppointments);
        
        const historyHTML = Object.entries(groupedAppts).map(([monthYear, appts]) => `
            <div class="history-group">
                <h4>${monthYear}</h4>
                ${appts.map(apt => `
                    <div class="appointment-item ${apt.status}" onclick="openAppointmentDetails(${apt.id})">
                        <div class="appointment-info">
                            <h4>${apt.service}</h4>
                            <p>${formatDate(apt.date)} at ${apt.time}</p>
                            <p>$${apt.price}</p>
                            ${apt.notes ? `<p><em>${apt.notes}</em></p>` : ''}
                        </div>
                        <div class="appointment-status status-${apt.status}">${apt.status}</div>
                    </div>
                `).join('')}
            </div>
        `).join('');
        
        container.innerHTML = historyHTML;
    }
    
    modal.style.display = 'block';
}

function openAppointmentDetails(appointmentId) {
    // Use shared appointments data instead of local array
    const allAppointments = window.sharedAppointments || appointments;
    const appointment = allAppointments.find(apt => apt.id === appointmentId);
    console.log('Opening appointment details for ID:', appointmentId);
    console.log('Found appointment:', appointment);
    if (!appointment) return;
    
    const modal = document.getElementById('appointmentModal');
    const detailsDiv = document.getElementById('appointmentDetails');
    
    const canModify = new Date(appointment.date) >= new Date() && appointment.status !== 'cancelled';
    
    detailsDiv.innerHTML = `
        <div class="appointment-info">
            <h4>${appointment.service}</h4>
            <p><strong>Date:</strong> ${formatDate(appointment.date)}</p>
            <p><strong>Time:</strong> ${appointment.time}</p>
            <p><strong>Price:</strong> $${appointment.price}</p>
            <p><strong>Status:</strong> <span class="status-${appointment.status}">${appointment.status}</span></p>
            ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
        </div>
    `;
    
    // Show/hide action buttons based on appointment status and date
    const rescheduleBtn = document.getElementById('rescheduleBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    if (canModify) {
        rescheduleBtn.style.display = 'inline-block';
        cancelBtn.style.display = 'inline-block';
        rescheduleBtn.onclick = () => rescheduleAppointment(appointmentId);
        cancelBtn.onclick = () => cancelAppointment(appointmentId);
    } else {
        rescheduleBtn.style.display = 'none';
        cancelBtn.style.display = 'none';
    }
    
    modal.style.display = 'block';
}

function rescheduleAppointment(appointmentId) {
    // Close modal and redirect to booking page for reschedule
    document.getElementById('appointmentModal').style.display = 'none';
    window.location.href = 'booking.html';
}

function cancelAppointment(appointmentId) {
    if (confirm('Are you sure you want to cancel this appointment?')) {
        // Use shared appointments data and update function
        const allAppointments = window.sharedAppointments || appointments;
        const appointment = allAppointments.find(apt => apt.id === appointmentId);
        if (appointment) {
            // Update using shared data system if available
            if (window.updateAppointment) {
                window.updateAppointment(appointmentId, { status: 'cancelled' });
            } else {
                appointment.status = 'cancelled';
            }
            console.log('Cancelled appointment:', appointmentId);
            // Show brief confirmation instead of alert
            showTemporaryMessage('Appointment cancelled successfully. Confirmation email sent.', 'success');
            
            // Refresh the portal data
            loadUpcomingAppointments();
            loadRecentAppointments();
            updateAccountSummary();
            
            document.getElementById('appointmentModal').style.display = 'none';
        }
    }
}

// Utility functions
function formatDate(dateString, short = false) {
    // Parse date string as local date to avoid timezone issues
    const [year, month, day] = dateString.split('-');
    const date = new Date(year, month - 1, day); // month is 0-indexed
    
    const options = short ? 
        { month: 'short', day: 'numeric' } :
        { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    
    return date.toLocaleDateString('en-US', options);
}

function getMembershipDisplayName(membershipPlan) {
    const membershipNames = {
        'wellness': 'Wellness Member',
        'restoration-plus': 'Restoration Plus',
        'therapeutic-elite': 'Therapeutic Elite'
    };
    
    return membershipPlan ? membershipNames[membershipPlan] || membershipPlan : 'None';
}

function cancelMembership() {
    if (!currentUser || !currentUser.membershipPlan) {
        alert('No active membership to cancel.');
        return;
    }
    
    const membershipName = getMembershipDisplayName(currentUser.membershipPlan);
    const confirmMessage = `Are you sure you want to cancel your ${membershipName} membership?\n\nThis will stop automatic renewals. Your current membership will remain active until the end of your billing period.`;
    
    if (confirm(confirmMessage)) {
        // Find and cancel the user's membership auto-renewal
        const memberships = window.getMemberships ? window.getMemberships() : [];
        const userMembership = memberships.find(m => m.userId === currentUser.id && m.status === 'active');
        
        if (userMembership && window.cancelMembershipRenewal) {
            // Cancel auto-renewal but keep membership active until end date
            const success = window.cancelMembershipRenewal(userMembership.id);
            
            if (success) {
                console.log('🔒 Auto-renewal cancelled for user membership');
                
                // Update user's auto-renewal status
                currentUser.autoRenew = false;
                currentUser.membershipCancellationDate = new Date().toISOString();
                
                // Update in shared data if available
                if (window.updateUser) {
                    window.updateUser(currentUser.id, currentUser);
                } else {
                    // Update in local storage
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                }
                
                // Refresh the display
                updateAccountSummary();
                
                // Show confirmation message
                showTemporaryMessage(`Auto-renewal cancelled for your ${membershipName} membership. Your membership will remain active until ${new Date(userMembership.endDate).toLocaleDateString()}.`, 'success');
            } else {
                showTemporaryMessage('Failed to cancel membership. Please try again or contact support.', 'error');
            }
        } else {
            // Fallback for legacy memberships without auto-renewal
            const previousPlan = currentUser.membershipPlan;
            currentUser.membershipPlan = null;
            currentUser.membershipEndDate = new Date().toISOString();
            
            // Update in shared data if available
            if (window.updateUser) {
                window.updateUser(currentUser.id, currentUser);
            } else {
                // Update in local storage
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
            }
            
            // Refresh the display
            updateAccountSummary();
        
        // Show confirmation message
        showTemporaryMessage(`Your ${membershipName} membership has been cancelled. Thank you for being a member!`, 'info');
    }
}

function groupAppointmentsByMonth(appointments) {
    const grouped = {};
    
    appointments.forEach(apt => {
        const date = new Date(apt.date);
        const monthYear = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        
        if (!grouped[monthYear]) {
            grouped[monthYear] = [];
        }
        grouped[monthYear].push(apt);
    });
    
    return grouped;
}

// Helper function to show temporary messages instead of alerts
function showTemporaryMessage(message, type = 'info') {
    const messageEl = document.createElement('div');
    messageEl.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#d4edda' : '#d1ecf1'};
        color: ${type === 'success' ? '#155724' : '#0c5460'};
        border: 1px solid ${type === 'success' ? '#c3e6cb' : '#bee5eb'};
        border-radius: 8px;
        padding: 1rem 1.5rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-weight: 500;
        max-width: 300px;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    messageEl.textContent = message;
    
    document.body.appendChild(messageEl);
    
    // Slide in
    setTimeout(() => {
        messageEl.style.transform = 'translateX(0)';
    }, 100);
    
    // Slide out and remove
    setTimeout(() => {
        messageEl.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (document.body.contains(messageEl)) {
                document.body.removeChild(messageEl);
            }
        }, 300);
    }, 3000);
}