// Secure Admin Panel JavaScript
console.log('🔒 Admin Panel loading...');

// Global variables
let currentUser = null;
let appointments = [];
let users = [];
let reviews = [];
let memberships = [];

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const adminPanel = document.getElementById('adminPanel');
const loginForm = document.getElementById('adminLoginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔒 Admin DOM loaded, initializing...');
    
    setupAdminLogin();
    setupNavigation();
    checkExistingSession();
});

// Setup admin login
function setupAdminLogin() {
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleAdminLogin();
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            handleLogout();
        });
    }
}

// Handle admin login
function handleAdminLogin() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    console.log('🔒 Attempting admin login with:', username);
    
    // Clear previous errors
    if (loginError) {
        loginError.textContent = '';
    }
    
    // Simple credential check
    if (username === 'considerrestoration@gmail.com' && password === 'admin123') {
        console.log('✅ Admin login successful');
        
        // Create admin user
        currentUser = {
            id: 'admin_' + Date.now(),
            email: username,
            name: 'Christopher',
            role: 'admin',
            loginTime: new Date().toISOString()
        };
        
        // Save session
        if (window.universalSession) {
            window.universalSession.saveSession(currentUser);
        }
        
        // Show admin panel
        showAdminPanel();
        
        // Load data
        loadAdminData();
        
    } else {
        console.log('❌ Invalid credentials');
        if (loginError) {
            loginError.textContent = 'Invalid username or password';
        }
    }
}

// Check existing session
function checkExistingSession() {
    if (window.universalSession) {
        const user = window.universalSession.getCurrentUser();
        if (user && user.role === 'admin') {
            currentUser = user;
            showAdminPanel();
            loadAdminData();
        }
    }
}

// Show admin panel
function showAdminPanel() {
    if (loginScreen) loginScreen.style.display = 'none';
    if (adminPanel) adminPanel.style.display = 'block';
    
    // Update admin name
    const adminNameEl = document.getElementById('adminName');
    if (adminNameEl && currentUser) {
        adminNameEl.textContent = currentUser.name || 'Admin';
    }
}

// Handle logout
function handleLogout() {
    currentUser = null;
    
    if (window.universalSession) {
        window.universalSession.logout();
    }
    
    if (adminPanel) adminPanel.style.display = 'none';
    if (loginScreen) loginScreen.style.display = 'block';
    
    // Clear form
    if (loginForm) loginForm.reset();
    if (loginError) loginError.textContent = '';
}

// Setup navigation
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            showSection(section);
            
            // Update active button
            navButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

// Show specific section
function showSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const selectedSection = document.getElementById(sectionName);
    if (selectedSection) {
        selectedSection.classList.add('active');
    }
    
    // Load section data
    loadSectionData(sectionName);
}

// Load admin data
function loadAdminData() {
    console.log('📊 Loading admin data...');
    
    // Initialize shared data
    if (window.getAppointments) appointments = window.getAppointments();
    if (window.getUsers) users = window.getUsers();
    if (window.getReviews) reviews = window.getReviews();
    if (window.getMemberships) memberships = window.getMemberships();
    
    // Update dashboard stats
    updateDashboardStats();
    loadRecentActivity();
}

// Update dashboard statistics
function updateDashboardStats() {
    const totalAppointmentsEl = document.getElementById('totalAppointments');
    const totalUsersEl = document.getElementById('totalUsers');
    const totalReviewsEl = document.getElementById('totalReviews');
    const activeMembershipsEl = document.getElementById('activeMemberships');
    
    if (totalAppointmentsEl) {
        totalAppointmentsEl.textContent = appointments.length;
    }
    
    if (totalUsersEl) {
        totalUsersEl.textContent = users.length;
    }
    
    if (totalReviewsEl) {
        totalReviewsEl.textContent = reviews.length;
    }
    
    if (activeMembershipsEl) {
        const activeMemberships = memberships.filter(m => m.status === 'active');
        activeMembershipsEl.textContent = activeMemberships.length;
    }
}

// Load recent activity
function loadRecentActivity() {
    const container = document.getElementById('recentActivity');
    if (!container) return;
    
    const recentItems = [];
    
    // Add recent appointments
    appointments.slice(-5).forEach(apt => {
        recentItems.push({
            type: 'appointment',
            text: `New appointment: ${apt.name} - ${apt.service}`,
            date: apt.date
        });
    });
    
    // Add recent reviews
    reviews.slice(-3).forEach(review => {
        recentItems.push({
            type: 'review',
            text: `New review: ${review.name} - ${review.rating} stars`,
            date: review.date
        });
    });
    
    // Sort by date
    recentItems.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (recentItems.length === 0) {
        container.innerHTML = '<p>No recent activity</p>';
        return;
    }
    
    container.innerHTML = recentItems.slice(0, 10).map(item => `
        <div class="activity-item">
            <span class="activity-type">${item.type}</span>
            <span class="activity-text">${item.text}</span>
            <span class="activity-date">${formatDate(item.date)}</span>
        </div>
    `).join('');
}

// Load section-specific data
function loadSectionData(sectionName) {
    switch(sectionName) {
        case 'appointments':
            loadAppointments();
            break;
        case 'users':
            loadUsers();
            break;
        case 'reviews':
            loadReviews();
            break;
        case 'contact':
            loadContactMessages();
            break;
    }
}

// Load appointments
function loadAppointments() {
    const container = document.getElementById('appointmentsList');
    if (!container) return;
    
    if (appointments.length === 0) {
        container.innerHTML = '<p>No appointments found</p>';
        return;
    }
    
    container.innerHTML = appointments.map(apt => `
        <div class="data-item">
            <div class="item-info">
                <strong>${apt.name}</strong>
                <span>${apt.email}</span>
                <span>${apt.service}</span>
                <span>${formatDate(apt.date)} at ${apt.time}</span>
                <span class="status ${apt.status}">${apt.status}</span>
            </div>
        </div>
    `).join('');
}

// Load users
function loadUsers() {
    const container = document.getElementById('usersList');
    if (!container) return;
    
    if (users.length === 0) {
        container.innerHTML = '<p>No users found</p>';
        return;
    }
    
    container.innerHTML = users.map(user => `
        <div class="data-item">
            <div class="item-info">
                <strong>${user.firstName} ${user.lastName}</strong>
                <span>${user.email}</span>
                <span>${user.phone}</span>
                <span>Registered: ${formatDate(user.registrationDate)}</span>
            </div>
        </div>
    `).join('');
}

// Load reviews
function loadReviews() {
    const container = document.getElementById('reviewsList');
    if (!container) return;
    
    if (reviews.length === 0) {
        container.innerHTML = '<p>No reviews found</p>';
        return;
    }
    
    container.innerHTML = reviews.map(review => `
        <div class="data-item">
            <div class="item-info">
                <strong>${review.name}</strong>
                <div class="rating">${'⭐'.repeat(review.rating)}</div>
                <p>${review.comment}</p>
                <span>${formatDate(review.date)}</span>
            </div>
        </div>
    `).join('');
}

// Load contact messages
function loadContactMessages() {
    const container = document.getElementById('contactList');
    if (!container) return;
    
    const messages = window.getContactMessages ? window.getContactMessages() : [];
    
    if (messages.length === 0) {
        container.innerHTML = '<p>No contact messages found</p>';
        return;
    }
    
    container.innerHTML = messages.map(msg => `
        <div class="data-item">
            <div class="item-info">
                <strong>${msg.name}</strong>
                <span>${msg.email}</span>
                <span>Subject: ${msg.subject}</span>
                <p>${msg.message}</p>
                <span>${formatDate(msg.timestamp)}</span>
            </div>
        </div>
    `).join('');
}

// Export data function
function exportData(type) {
    let data = [];
    let filename = '';
    
    switch(type) {
        case 'appointments':
            data = appointments;
            filename = 'appointments.json';
            break;
        case 'users':
            data = users;
            filename = 'users.json';
            break;
        case 'reviews':
            data = reviews;
            filename = 'reviews.json';
            break;
        case 'contact':
            data = window.getContactMessages ? window.getContactMessages() : [];
            filename = 'contact-messages.json';
            break;
    }
    
    if (data.length === 0) {
        alert('No data to export');
        return;
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// Utility function to format dates
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}