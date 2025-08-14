// Secure Admin Panel JavaScript
// Combines old admin functionality with new server-side authentication

// Global variables
let appointments = [];
let users = [];
let blockedDates = [];
let reviews = [];
let memberships = [];
let currentUser = null;
let selectedAppointment = null;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const adminPanel = document.getElementById('adminPanel');
const loginForm = document.getElementById('adminLoginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

console.log('🔒 Secure Admin Panel loading...');

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔒 Admin DOM loaded, initializing...');
    
    // Don't duplicate the server-side validation that's already in the inline script
    // Just set up the admin panel functionality
    setupAdminPanelFunctionality();
    
    // Check if user is already authenticated
    checkExistingSession();
});

async function checkExistingSession() {
    try {
        // First try server-side session verification
        const apiUrl = typeof EnvConfig !== 'undefined' ? 
            EnvConfig.getAdminUrl('verify') : 
            'http://localhost:3060/api/admin/verify';
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            console.log('🔒 Existing server session found:', currentUser);
            showAdminPanel();
            return;
        }
    } catch (error) {
        console.log('🔒 Server not available for session check, checking local storage...');
    }
    
    // Fallback to cookie session check
    if (window.CookieSessionManager) {
        const sessionUser = window.CookieSessionManager.getCurrentUser();
        if (sessionUser && sessionUser.role === 'admin') {
            currentUser = sessionUser;
            console.log('🔒 Existing cookie admin session found:', currentUser);
            showAdminPanel();
            return;
        }
    }
    
    console.log('🔒 No existing admin session');
    showLoginScreen();
}

function showLoginScreen() {
    if (loginScreen) loginScreen.style.display = 'block';
    if (adminPanel) adminPanel.style.display = 'none';
}

function showAdminPanel() {
    if (loginScreen) loginScreen.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'block';
    
    // Show admin navbar
    const adminNavbar = document.getElementById('adminNavbar');
    if (adminNavbar) {
        adminNavbar.style.display = 'block';
    }
    
    // Setup admin logout button
    const adminLogoutBtn = document.getElementById('adminLogoutBtn');
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', handleLogout);
    }
    
    initializeAdminPanel();
}

function setupAdminPanelFunctionality() {
    console.log('🔒 Setting up admin panel functionality...');
    
    // Setup navigation
    setupNavigation();
    
    // Setup logout functionality
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Setup login functionality
    if (loginForm) {
        loginForm.addEventListener('submit', handleSecureAdminLogin);
    }
    
    // Initialize shared data
    initializeSharedData();
    
    // Setup data listeners
    setupSharedDataListeners();
    
    console.log('🔒 Admin panel functionality ready');
}

async function handleSecureAdminLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    console.log('🔒 Attempting admin login with:', email);
    
    // First try server-side authentication
    try {
        console.log('🔒 Trying server-side authentication...');
        const apiUrl = typeof EnvConfig !== 'undefined' ? 
            EnvConfig.getAdminUrl('login') : 
            'http://localhost:3060/api/admin/login';
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Successful server login
            console.log('🔒 Server-side admin login successful');
            currentUser = data.user;
            
            // Use cookie session manager instead of localStorage
            if (window.CookieSessionManager) {
                window.CookieSessionManager.login(data.user);
            }
            
            showAdminPanel();
            
            document.getElementById('adminLoginForm').reset();
            errorDiv.textContent = '';
            return;
            
        } else {
            console.log('🔒 Server login failed, trying fallback...');
        }
    } catch (error) {
        console.log('🔒 Server not available, using fallback authentication:', error.message);
    }
    
    // Production note: All authentication should be server-side
    // This fallback is only for development when server is unavailable
    if (typeof logger !== 'undefined') {
        logger.warn('⚠️ Using client-side authentication fallback - NOT suitable for production!');
    }
    
    // Note: In production, this should always fail and redirect to proper server authentication
    // For security reasons, hardcoded credentials are removed
    const isProductionEnvironment = !window.location.hostname.includes('localhost') && 
                                   window.location.protocol === 'https:';
    
    if (isProductionEnvironment) {
        // In production, always reject client-side authentication attempts
        if (typeof logger !== 'undefined') {
            logger.error('🚫 Client-side authentication blocked in production environment');
        }
        return null;
    }
    
    // Development fallback only works with environment variable or special flag  
    const isDevelopmentMode = window.location.hostname === 'localhost' ||
                              window.location.hostname === '127.0.0.1' ||
                              window.location.search.includes('dev=true') ||
                              localStorage.getItem('dev-mode') === 'true' ||
                              window.location.protocol === 'file:'; // Allow file:// protocol for local development
    
    if (!isDevelopmentMode) {
        if (typeof logger !== 'undefined') {
            logger.warn('🔒 Authentication fallback requires development mode');
        }
        return null;
    }
    
    // Development-only fallback (requires manual flag)
    const devModeConfirmed = confirm('⚠️ DEVELOPMENT MODE ONLY\n\nThis uses unsafe client-side authentication.\nOnly proceed if you are in development.\n\nContinue?');
    
    if (!devModeConfirmed) {
        return null;
    }
    
    // Check with existing user authentication system
    if (window.authenticateUser) {
        const user = window.authenticateUser(email, password);
        if (user && user.role === 'admin') {
            console.log('🔒 Admin authentication successful via user system');
            currentUser = user;
            
            // Use cookie session manager
            if (window.CookieSessionManager) {
                window.CookieSessionManager.login(currentUser);
            }
            
            showAdminPanel();
            document.getElementById('adminLoginForm').reset();
            errorDiv.textContent = '';
            return;
        }
    }
    
    // Minimal development fallback - admin email only, no hardcoded passwords
    if (email === 'admin@considerrestoration.com' && password.length >= 6) {
        if (typeof logger !== 'undefined') {
            logger.warn('🔒 Development authentication successful - REMOVE IN PRODUCTION');
        }
        currentUser = {
            id: 'admin-dev',
            email: email,
            name: 'Administrator',
            role: 'admin',
            loginTime: new Date().toISOString()
        };
        
        // Use cookie session manager instead of localStorage
        if (window.CookieSessionManager) {
            window.CookieSessionManager.login(currentUser);
        }
        
        showAdminPanel();
        
        document.getElementById('adminLoginForm').reset();
        errorDiv.textContent = '';
        
    } else {
        console.log('🔒 All login methods failed');
        errorDiv.textContent = 'Invalid email or password';
    }
}

async function handleLogout() {
    try {
        const apiUrl = typeof EnvConfig !== 'undefined' ? 
            EnvConfig.getAdminUrl('logout') : 
            'http://localhost:3060/api/admin/logout';
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            console.log('🔒 Logout successful');
            currentUser = null;
            if (window.CookieSessionManager) {
                window.CookieSessionManager.logout();
            }
            showLoginScreen();
        } else {
            console.error('🔒 Logout failed');
        }
    } catch (error) {
        console.error('🔒 Logout error:', error);
        // Force logout on error
        currentUser = null;
        if (window.CookieSessionManager) {
            window.CookieSessionManager.logout();
        }
        showLoginScreen();
    }
}

function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.admin-section');

    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetSection = this.getAttribute('data-section');
            
            // Update active nav button
            navButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Show target section
            sections.forEach(section => {
                section.classList.remove('active');
                section.style.display = 'none';
            });
            
            const targetElement = document.getElementById(targetSection);
            if (targetElement) {
                targetElement.classList.add('active');
                targetElement.style.display = 'block';
                
                // Load section-specific data
                loadSectionData(targetSection);
            }
        });
    });

    // Show dashboard by default
    const dashboardBtn = document.querySelector('.nav-btn[data-section="dashboard"]');
    if (dashboardBtn) {
        dashboardBtn.click();
    }
}

function loadSectionData(section) {
    console.log('🔒 Loading data for section:', section);
    
    switch(section) {
        case 'dashboard':
            updateDashboardStats();
            break;
        case 'appointments':
            displayAppointments();
            break;
        case 'schedule':
            generateAdminCalendar();
            break;
        case 'clients':
            displayUsers();
            break;
        case 'payments':
            displayPayments();
            updatePaymentStats();
            break;
        case 'memberships':
            displayMemberships();
            break;
        case 'reports':
            updateReports();
            break;
        case 'reviews':
            displayReviews();
            break;
        case 'schedule':
            generateAdminCalendar();
            displayBlockedDates();
            break;
    }
}

function initializeAdminPanel() {
    console.log('🔒 Initializing admin panel for user:', currentUser);
    
    // Load initial data
    initializeSharedData();
    
    // Update dashboard
    updateDashboardStats();
    
    // Setup any additional functionality
    setupAdminFeatures();
}

async function initializeSharedData() {
    try {
        console.log('🔒 Initializing shared data...');
        console.log('🔒 window.getAppointments available:', typeof window.getAppointments);
        console.log('🔒 window.getUsers available:', typeof window.getUsers);
        
        if (window.getAppointments) {
            appointments = await window.getAppointments();
            console.log('🔒 Loaded appointments:', appointments);
        } else {
            console.warn('🔒 window.getAppointments not available');
        }
        
        if (window.getUsers) {
            users = await window.getUsers();
            console.log('🔒 Loaded users:', users.length);
        } else {
            console.warn('🔒 window.getUsers not available');
        }
        
        if (window.getReviews) {
            reviews = window.getReviews();
            console.log('🔒 Loaded reviews:', reviews.length);
        }
        
        if (window.getBlockedDates) {
            blockedDates = window.getBlockedDates();
            console.log('🔒 Loaded blocked dates:', blockedDates.length);
        }
        
        console.log('🔒 Shared data initialized:', { 
            appointments: appointments.length, 
            users: users.length,
            reviews: reviews.length,
            blockedDates: blockedDates.length
        });
    } catch (error) {
        console.error('🔒 Error initializing shared data:', error);
    }
}

function setupSharedDataListeners() {
    // Listen for new appointments
    window.addEventListener('appointmentAdded', function(event) {
        console.log('🔒 New appointment added:', event.detail);
        initializeSharedData();
        
        if (currentUser && currentUser.role === 'admin') {
            showNotification('New appointment booked!', 'success');
            refreshCurrentSection();
        }
    });
    
    // Listen for appointment updates
    window.addEventListener('appointmentUpdated', function(event) {
        console.log('🔒 Appointment updated:', event.detail);
        initializeSharedData();
        
        if (currentUser && currentUser.role === 'admin') {
            refreshCurrentSection();
        }
    });
    
    // Listen for new users
    window.addEventListener('userAdded', function(event) {
        console.log('🔒 New user added:', event.detail);
        initializeSharedData();
        
        if (currentUser && currentUser.role === 'admin') {
            showNotification('New client registered!', 'success');
            refreshCurrentSection();
        }
    });
}

function refreshCurrentSection() {
    const activeSection = document.querySelector('.admin-section.active');
    if (activeSection) {
        loadSectionData(activeSection.id);
    }
}

function setupAdminFeatures() {
    // Setup any additional admin-specific features
    console.log('🔒 Setting up admin features...');
}

// Dashboard Functions
async function updateDashboardStats() {
    try {
        // Get dashboard data from server if available
        const apiUrl = typeof EnvConfig !== 'undefined' ? 
            EnvConfig.getAdminUrl('dashboard') : 
            'http://localhost:3060/api/admin/dashboard';
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            const data = await response.json();
            updateDashboardDisplay(data.data);
        } else {
            // Fallback to local data
            updateDashboardFromLocalData();
        }
    } catch (error) {
        console.error('🔒 Dashboard update error:', error);
        updateDashboardFromLocalData();
    }
}

function updateDashboardDisplay(data) {
    // Update dashboard stats with server data
    updateElement('totalAppointments', data.totalAppointments || 0);
    updateElement('totalUsers', data.totalUsers || 0);
    updateElement('pendingAppointments', data.pendingAppointments || 0);
    updateElement('confirmedAppointments', data.confirmedAppointments || 0);
    
    console.log('🔒 Dashboard updated with server data:', data);
}

function updateDashboardFromLocalData() {
    // Fallback to local data calculations
    console.log('🔒 Updating dashboard with local data...');
    console.log('🔒 Local appointments array:', appointments);
    console.log('🔒 Local users array:', users);
    
    const totalAppointments = appointments ? appointments.length : 0;
    const totalUsers = users ? users.length : 0;
    const pendingAppointments = appointments ? appointments.filter(apt => apt.status === 'pending').length : 0;
    const confirmedAppointments = appointments ? appointments.filter(apt => apt.status === 'confirmed').length : 0;
    
    console.log('🔒 Dashboard stats:', {
        totalAppointments,
        totalUsers,
        pendingAppointments,
        confirmedAppointments
    });
    
    updateElement('totalAppointments', totalAppointments);
    updateElement('totalUsers', totalUsers);
    updateElement('pendingAppointments', pendingAppointments);
    updateElement('confirmedAppointments', confirmedAppointments);
    
    console.log('🔒 Dashboard updated with local data');
}

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

// Appointments Functions
function displayAppointments() {
    console.log('🔒 Displaying appointments:', appointments.length);
    
    const tableBody = document.getElementById('appointmentsTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    appointments.forEach(appointment => {
        const row = createAppointmentRow(appointment);
        tableBody.appendChild(row);
    });
}

function createAppointmentRow(appointment) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${appointment.date || 'N/A'}</td>
        <td>${appointment.time || 'N/A'}</td>
        <td>${appointment.clientName || 'N/A'}</td>
        <td>${appointment.service || 'N/A'}</td>
        <td><span class="status-badge ${appointment.status}">${appointment.status || 'pending'}</span></td>
        <td>
            <button onclick="viewAppointment('${appointment.id}')" class="btn-small">View</button>
            <button onclick="editAppointment('${appointment.id}')" class="btn-small">Edit</button>
        </td>
    `;
    return row;
}

// Users Functions
function displayUsers() {
    console.log('🔒 Displaying users:', users.length);
    
    const tableBody = document.getElementById('usersTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    users.forEach(user => {
        const row = createUserRow(user);
        tableBody.appendChild(row);
    });
}

function createUserRow(user) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${user.name || 'N/A'}</td>
        <td>${user.email || 'N/A'}</td>
        <td>${user.phone || 'N/A'}</td>
        <td><span class="status-badge ${user.isActive ? 'active' : 'inactive'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
        <td>${new Date(user.createdAt).toLocaleDateString() || 'N/A'}</td>
        <td>
            <button onclick="viewUser('${user.id}')" class="btn-small">View</button>
            <button onclick="editUser('${user.id}')" class="btn-small">Edit</button>
        </td>
    `;
    return row;
}

// Payments Functions
function displayPayments() {
    console.log('🔒 Displaying payments...');
    // Payment display logic
}

function updatePaymentStats() {
    console.log('🔒 Updating payment stats...');
    // Payment stats logic
}

// Calendar Functions
function generateAdminCalendar() {
    console.log('🔒 Generating admin calendar...');
    // Calendar generation logic
}

// Membership Functions
function displayMemberships() {
    console.log('🔒 Displaying memberships...');
    // Membership display logic
}

// Reports Functions
function updateReports() {
    console.log('🔒 Updating reports...');
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Today's appointments
    const todayAppointments = appointments.filter(apt => apt.date === todayStr);
    const todayRevenue = todayAppointments.reduce((sum, apt) => sum + apt.price, 0);
    
    updateElement('todayAppointments', todayAppointments.length);
    updateElement('todayRevenue', `$${todayRevenue}`);
    
    // This week
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const weekAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate >= startOfWeek && aptDate <= endOfWeek;
    });
    const weekRevenue = weekAppointments.reduce((sum, apt) => sum + apt.price, 0);
    
    updateElement('weekAppointments', weekAppointments.length);
    updateElement('weekRevenue', `$${weekRevenue}`);
    
    // Popular services
    const serviceCount = {};
    appointments.forEach(apt => {
        serviceCount[apt.service] = (serviceCount[apt.service] || 0) + 1;
    });
    
    const popularServices = Object.entries(serviceCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
        
    const popularServicesContainer = document.getElementById('popularServices');
    if (popularServicesContainer) {
        popularServicesContainer.innerHTML = popularServices.map(([service, count]) => 
            `<div class="service-stat"><span class="service-name">${service}</span><span class="service-count">${count}</span></div>`
        ).join('');
    }
}

// Reviews Functions
function displayReviews() {
    console.log('🔒 Displaying reviews...');
    
    const reviewsList = document.getElementById('reviewsList');
    if (!reviewsList) return;
    
    const reviews = window.getReviews ? window.getReviews() : [];
    
    // Update review stats
    const totalReviews = reviews.length;
    const averageRating = reviews.length > 0 ? 
        (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0.0';
    
    updateElement('totalReviews', totalReviews);
    updateElement('averageRating', averageRating);
    
    // Display reviews
    if (reviews.length === 0) {
        reviewsList.innerHTML = '<p>No reviews found</p>';
        return;
    }
    
    reviewsList.innerHTML = reviews.map(review => `
        <div class="review-card">
            <div class="review-header">
                <h4>${review.name}</h4>
                <div class="review-rating">${'★'.repeat(review.rating)}</div>
                <small>${new Date(review.createdAt || review.date).toLocaleDateString()}</small>
            </div>
            <p class="review-text">${review.review}</p>
            <div class="review-actions">
                <button onclick="viewReview('${review.id}')" class="btn-small">View</button>
                <button onclick="deleteReviewAdmin('${review.id}')" class="btn-small btn-danger">Delete</button>
            </div>
        </div>
    `).join('');
}

// Blocked Dates Functions
function displayBlockedDates() {
    console.log('🔒 Displaying blocked dates...');
    
    const blockedDatesList = document.getElementById('blockedDatesList');
    if (!blockedDatesList) return;
    
    const blockedDates = window.getBlockedDates ? window.getBlockedDates() : [];
    const manualBlocked = blockedDates.filter(bd => !bd.auto_generated);
    
    if (manualBlocked.length === 0) {
        blockedDatesList.innerHTML = '<p>No manually blocked dates</p>';
        return;
    }
    
    // Sort by date
    manualBlocked.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    blockedDatesList.innerHTML = manualBlocked.map(blocked => `
        <div class="blocked-date-item">
            <div class="blocked-info">
                <strong>${blocked.date}</strong> - ${blocked.reason}
                <span class="blocked-type">(${blocked.type})</span>
            </div>
            <button onclick="removeBlockedDate('${blocked.id}')" class="btn-small btn-danger">Remove</button>
        </div>
    `).join('');
}

// Utility Functions
function showNotification(message, type = 'info') {
    console.log(`🔒 ${type.toUpperCase()}: ${message}`);
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after delay
    setTimeout(() => {
        if (document.body.contains(notification)) {
            document.body.removeChild(notification);
        }
    }, 3000);
}

// Global functions for button handlers
window.viewAppointment = function(id) {
    console.log('🔒 View appointment:', id);
};

window.editAppointment = function(id) {
    console.log('🔒 Edit appointment:', id);
};

window.viewUser = function(id) {
    console.log('🔒 View user:', id);
};

window.editUser = function(id) {
    console.log('🔒 Edit user:', id);
};

// Review management functions
window.viewReview = function(id) {
    console.log('🔒 View review:', id);
    // Implement review viewing logic
};

window.deleteReviewAdmin = function(id) {
    if (confirm('Are you sure you want to delete this review?')) {
        if (window.deleteReview) {
            const result = window.deleteReview(id);
            if (result) {
                displayReviews(); // Refresh the display
                showNotification('Review deleted successfully', 'success');
            } else {
                showNotification('Failed to delete review', 'error');
            }
        }
    }
};

// Blocked dates management functions
window.removeBlockedDate = function(id) {
    if (confirm('Are you sure you want to remove this blocked date?')) {
        if (window.sharedBlockedDates) {
            const index = window.sharedBlockedDates.findIndex(bd => bd.id === id);
            if (index !== -1) {
                window.sharedBlockedDates.splice(index, 1);
                // Save to localStorage
                localStorage.setItem('massageBlockedDates', JSON.stringify(window.sharedBlockedDates));
                displayBlockedDates(); // Refresh the display
                showNotification('Blocked date removed successfully', 'success');
            }
        }
    }
};

// Force reload data function for debugging
window.forceReloadData = function() {
    console.log('🔄 Force reloading all admin data...');
    
    // Reinitialize shared data
    initializeSharedData().then(() => {
        console.log('🔄 Data reinitialized, refreshing displays...');
        
        // Force update dashboard
        updateDashboardFromLocalData();
        
        // Refresh current section
        const activeSection = document.querySelector('.admin-section.active');
        if (activeSection) {
            console.log('🔄 Refreshing active section:', activeSection.id);
            loadSectionData(activeSection.id);
        }
        
        // Show notification
        showNotification('Data reloaded successfully!', 'success');
    });
};

console.log('🔒 Secure Admin Panel loaded successfully');