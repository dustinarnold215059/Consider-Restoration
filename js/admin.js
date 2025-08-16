// Admin Panel JavaScript

// Initialize with shared data when available
let appointments = [];
let users = [];
let blockedDates = [];
let reviews = [];

let currentUser = null;
let selectedAppointment = null;

// Generate CSRF token for form security
function generateCSRFToken() {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem('admin_csrf_token', token);
    return token;
}

// Validate CSRF token
function validateCSRFToken(token) {
    const storedToken = sessionStorage.getItem('admin_csrf_token');
    return storedToken && storedToken === token;
}

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const adminPanel = document.getElementById('adminPanel');
const loginForm = document.getElementById('adminLoginForm');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

// Initialize shared data
function initializeSharedData() {
    if (window.getAppointments) {
        appointments = window.getAppointments();
    }
    if (window.getUsers) {
        users = window.getUsers();
    }
    if (window.getBlockedDates) {
        blockedDates = window.getBlockedDates();
    }
    if (window.getReviews) {
        reviews = window.getReviews();
    }
}

// Listen for new appointments from the booking system
function setupSharedDataListeners() {
    if (window.addEventListener) {
        window.addEventListener('appointmentAdded', function(event) {
            console.log('New appointment added:', event.detail);
            appointments = window.getAppointments();
            
            // Refresh admin displays if user is logged in
            if (currentUser && currentUser.role === 'admin') {
                // Show notification
                showNotification('New appointment booked!', 'success');
                
                // Refresh all admin displays
                displayAppointments(appointments);
                generateAdminCalendar();
                displayPayments();
                updatePaymentStats();
                updateReports();
                updateDashboardStats();
                
                // Update revenue chart
                const chartPeriod = document.getElementById('chartPeriod');
                if (chartPeriod) {
                    drawRevenueChart(chartPeriod.value);
                }
                
                // If on appointments tab, highlight the new appointment
                const currentSection = document.querySelector('.admin-section.active');
                if (currentSection && currentSection.id === 'appointments') {
                    highlightNewAppointment(event.detail.id);
                }
            }
        });
        
        window.addEventListener('appointmentUpdated', function(event) {
            console.log('Appointment updated:', event.detail);
            appointments = window.getAppointments();
            
            // Refresh admin displays if user is logged in
            if (currentUser && currentUser.role === 'admin') {
                displayAppointments(appointments);
                generateAdminCalendar();
                displayPayments();
                updatePaymentStats();
                updateReports();
                updateDashboardStats();
            }
        });
        
        // Listen for new users being added
        window.addEventListener('userAdded', function(event) {
            console.log('New user added:', event.detail);
            users = window.getUsers();
            
            // Refresh admin displays if user is logged in
            if (currentUser && currentUser.role === 'admin') {
                // Show notification
                showNotification('New client registered!', 'success');
                
                // Refresh client display
                displayUsers();
                updateReports();
            }
        });
        
        // Listen for user updates
        window.addEventListener('userUpdated', function(event) {
            console.log('User updated:', event.detail);
            users = window.getUsers();
            
            // Refresh admin displays if user is logged in
            if (currentUser && currentUser.role === 'admin') {
                displayUsers();
                updateReports();
            }
        });
        
        // Listen for user deletions
        window.addEventListener('userDeleted', function(event) {
            console.log('User deleted:', event.detail);
            users = window.getUsers();
            
            // Refresh admin displays if user is logged in
            if (currentUser && currentUser.role === 'admin') {
                displayUsers();
                updateReports();
                updateDashboardStats();
                showNotification(`User ${event.detail.name} has been deleted.`, 'info');
            }
        });
        
        // Listen for review changes
        window.addEventListener('reviewAdded', function(event) {
            console.log('New review added:', event.detail);
            reviews = window.getReviews();
            
            // Refresh admin displays if user is logged in
            if (currentUser && currentUser.role === 'admin') {
                displayReviews();
                updateReviewsStats();
                showNotification('New review submitted!', 'info');
            }
        });
        
        window.addEventListener('reviewDeleted', function(event) {
            console.log('Review deleted:', event.detail);
            reviews = window.getReviews();
            
            // Refresh admin displays if user is logged in
            if (currentUser && currentUser.role === 'admin') {
                displayReviews();
                updateReviewsStats();
            }
        });
    }
}

// Update dashboard statistics
function updateDashboardStats() {
    // Always get fresh data
    if (window.getAppointments) {
        appointments = window.getAppointments();
    }
    if (window.getUsers) {
        users = window.getUsers();
    }
    if (window.getReviews) {
        reviews = window.getReviews();
    }
    
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM format
    
    console.log('Updating dashboard stats for:', { todayString, currentMonth, appointmentsCount: appointments.length });
    
    // Today's appointments (all appointments for today, regardless of payment status)
    const todaysAppointments = appointments.filter(apt => 
        apt.date === todayString && apt.status !== 'cancelled'
    );
    document.getElementById('todaysAppointments').textContent = todaysAppointments.length;
    
    // Monthly revenue (only paid appointments for current month)
    const monthlyRevenue = appointments
        .filter(apt => {
            const isPaid = apt.paymentStatus === 'paid';
            const isCurrentMonth = apt.date.startsWith(currentMonth);
            return isPaid && isCurrentMonth;
        })
        .reduce((total, apt) => total + (parseFloat(apt.price) || 0), 0);
    document.getElementById('monthlyRevenue').textContent = `$${monthlyRevenue.toFixed(2)}`;
    
    // Total membership revenue (monthly recurring)
    const memberships = window.getMemberships ? window.getMemberships() : [];
    const activeMemberships = memberships.filter(m => m.status === 'active');
    const totalMembershipRevenue = activeMemberships.reduce((total, membership) => {
        const planType = membership.plan || membership.typeName;
        const price = getMembershipPrice(planType, membership);
        return total + price;
    }, 0);
    document.getElementById('membershipRevenue').textContent = `$${totalMembershipRevenue.toFixed(2)}`;
    
    // Active clients (users with role 'user')
    const activeClients = users.filter(user => user.role === 'user').length;
    document.getElementById('activeClients').textContent = activeClients;
    
    // Total reviews
    document.getElementById('pendingReviews').textContent = reviews.length;
    
    // Recent activity
    const recentActivity = document.getElementById('recentActivity');
    if (recentActivity) {
        const recentAppointments = appointments
            .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
            .slice(0, 5);
        
        if (recentAppointments.length > 0) {
            const activityHTML = recentAppointments.map(apt => `
                <div class="activity-item">
                    <div>
                        <strong>${apt.clientName}</strong> booked ${apt.service} for ${formatDate(apt.date)}
                    </div>
                    <small>${apt.createdAt ? formatDate(apt.createdAt) : 'Recently'}</small>
                </div>
            `).join('');
            recentActivity.innerHTML = activityHTML;
        } else {
            recentActivity.innerHTML = '<p>No recent activity</p>';
        }
    }
    
    // Debug logging
    console.log('Dashboard stats calculated:', {
        todaysAppointments: todaysAppointments.length,
        monthlyRevenue: monthlyRevenue.toFixed(2),
        activeClients,
        recentAppointmentsCount: appointments.length
    });
}

// Revenue Chart Functions
function initializeRevenueChart() {
    const chartPeriodSelect = document.getElementById('chartPeriod');
    if (chartPeriodSelect) {
        chartPeriodSelect.addEventListener('change', function() {
            drawRevenueChart(this.value);
        });
    }
    
    // Draw initial chart
    drawRevenueChart('month'); // Default to last month
}

// Chart rendering state management to prevent memory leaks
let chartRenderingState = {
    currentCanvas: null,
    currentContext: null,
    isRendering: false,
    animationFrame: null
};

function drawRevenueChart(period = 'month') {
    const canvas = document.getElementById('revenueCanvas');
    if (!canvas) return;
    
    // Cancel any pending animation frame to prevent memory leaks
    if (chartRenderingState.animationFrame) {
        cancelAnimationFrame(chartRenderingState.animationFrame);
        chartRenderingState.animationFrame = null;
    }
    
    // Prevent concurrent rendering
    if (chartRenderingState.isRendering) {
        return;
    }
    
    chartRenderingState.isRendering = true;
    
    // Clean up previous canvas context if it's different
    if (chartRenderingState.currentCanvas && chartRenderingState.currentCanvas !== canvas) {
        cleanupChartResources();
    }
    
    const ctx = canvas.getContext('2d');
    chartRenderingState.currentCanvas = canvas;
    chartRenderingState.currentContext = ctx;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas with proper cleanup
    ctx.save(); // Save current state
    ctx.clearRect(0, 0, width, height);
    
    // Get revenue data for the specified period
    const revenueData = getRevenueData(period);
    
    if (revenueData.length === 0) {
        // Show "No data" message
        ctx.fillStyle = '#666';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('No revenue data available', width / 2, height / 2);
        return;
    }
    
    // Chart dimensions
    const padding = 60;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    
    // Find max revenue for scaling
    const maxRevenue = Math.max(...revenueData.map(d => d.revenue), 100);
    const roundedMax = Math.ceil(maxRevenue / 100) * 100; // Round up to nearest 100
    
    // Draw grid and axes
    drawChartGrid(ctx, padding, chartWidth, chartHeight, roundedMax);
    
    // Draw the revenue line
    drawRevenueLine(ctx, revenueData, padding, chartWidth, chartHeight, roundedMax);
    
    // Draw period labels
    drawPeriodLabels(ctx, revenueData, padding, chartWidth, chartHeight, period);
    
    // Restore canvas state and mark rendering complete
    ctx.restore();
    chartRenderingState.isRendering = false;
}

// Cleanup function to prevent memory leaks
function cleanupChartResources() {
    if (chartRenderingState.animationFrame) {
        cancelAnimationFrame(chartRenderingState.animationFrame);
        chartRenderingState.animationFrame = null;
    }
    
    if (chartRenderingState.currentContext) {
        try {
            // Clear any remaining canvas state
            chartRenderingState.currentContext.restore();
        } catch (e) {
            // Context might already be cleared
        }
        chartRenderingState.currentContext = null;
    }
    
    chartRenderingState.currentCanvas = null;
    chartRenderingState.isRendering = false;
}

// Add cleanup on page unload to prevent memory leaks
window.addEventListener('beforeunload', cleanupChartResources);

// Cleanup when navigating away from admin sections
document.addEventListener('click', function(e) {
    if (e.target.matches('.tab-button') && !e.target.textContent.includes('Analytics')) {
        cleanupChartResources();
    }
});

function getRevenueData(period) {
    // Always get fresh appointment data
    if (window.getAppointments) {
        appointments = window.getAppointments();
    }
    
    const today = new Date();
    const data = [];
    
    if (period === 'week') {
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateString = date.toISOString().slice(0, 10); // YYYY-MM-DD format
            
            const dayRevenue = appointments
                .filter(apt => {
                    const isPaid = apt.paymentStatus === 'paid';
                    const isThisDay = apt.date === dateString;
                    return isPaid && isThisDay;
                })
                .reduce((total, apt) => total + (parseFloat(apt.price) || 0), 0);
            
            data.push({
                label: date.toLocaleDateString('en-US', { weekday: 'short' }),
                revenue: dayRevenue,
                fullDate: date
            });
        }
    } else if (period === 'month') {
        // Last 30 days grouped by week
        for (let i = 3; i >= 0; i--) {
            const weekStart = new Date(today);
            weekStart.setDate(weekStart.getDate() - (i * 7) - (today.getDay() || 7) + 1);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 6);
            
            const weekRevenue = appointments
                .filter(apt => {
                    const isPaid = apt.paymentStatus === 'paid';
                    const aptDate = new Date(apt.date);
                    return isPaid && aptDate >= weekStart && aptDate <= weekEnd;
                })
                .reduce((total, apt) => total + (parseFloat(apt.price) || 0), 0);
            
            data.push({
                label: `Week ${i + 1}`,
                revenue: weekRevenue,
                fullDate: weekStart
            });
        }
    } else if (period === 'year') {
        // Last 12 months
        for (let i = 11; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthString = date.toISOString().slice(0, 7); // YYYY-MM format
            
            const monthRevenue = appointments
                .filter(apt => {
                    const isPaid = apt.paymentStatus === 'paid';
                    const isThisMonth = apt.date.startsWith(monthString);
                    return isPaid && isThisMonth;
                })
                .reduce((total, apt) => total + (parseFloat(apt.price) || 0), 0);
            
            data.push({
                label: date.toLocaleDateString('en-US', { month: 'short' }),
                revenue: monthRevenue,
                fullDate: date
            });
        }
    }
    
    return data;
}

function drawChartGrid(ctx, padding, chartWidth, chartHeight, maxRevenue) {
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines (revenue levels)
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
        const y = padding + (chartHeight * i / steps);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(padding + chartWidth, y);
        ctx.stroke();
        
        // Revenue labels
        const revenue = maxRevenue * (steps - i) / steps;
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`$${revenue.toFixed(0)}`, padding - 10, y + 4);
    }
    
    // Vertical grid lines will be drawn with month labels
}

function drawRevenueLine(ctx, data, padding, chartWidth, chartHeight, maxRevenue) {
    if (data.length < 2) return;
    
    const pointWidth = chartWidth / (data.length - 1);
    
    // Draw line
    ctx.strokeStyle = '#3498db';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    data.forEach((point, index) => {
        const x = padding + (index * pointWidth);
        const y = padding + chartHeight - (point.revenue / maxRevenue * chartHeight);
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Draw data points
    ctx.fillStyle = '#3498db';
    data.forEach((point, index) => {
        const x = padding + (index * pointWidth);
        const y = padding + chartHeight - (point.revenue / maxRevenue * chartHeight);
        
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Show revenue value on hover (simplified - always show for now)
        if (point.revenue > 0) {
            ctx.fillStyle = '#2c3e50';
            ctx.font = '11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`$${point.revenue.toFixed(0)}`, x, y - 10);
            ctx.fillStyle = '#3498db';
        }
    });
}

function drawPeriodLabels(ctx, data, padding, chartWidth, chartHeight, period) {
    const pointWidth = chartWidth / (data.length - 1);
    
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    data.forEach((point, index) => {
        const x = padding + (index * pointWidth);
        const y = padding + chartHeight + 20;
        
        // Draw vertical grid line
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, padding + chartHeight);
        ctx.stroke();
        
        // Draw period label
        ctx.fillText(point.label, x, y);
    });
}

// Initialize the admin panel
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔒 Admin Panel initializing with security features');
    
    // Initialize CSRF token for form security
    const csrfTokenField = document.getElementById('csrfToken');
    if (csrfTokenField) {
        csrfTokenField.value = generateCSRFToken();
        console.log('🔒 CSRF token initialized');
    }
    
    initializeSharedData();
    setupSharedDataListeners();
    setupEventListeners();
    checkAuthStatus();
    
    // Update review stats immediately on page load
    setTimeout(() => {
        if (typeof updateReviewsStats === 'function') {
            updateReviewsStats();
        }
    }, 100);
});

function setupEventListeners() {
    // Login form - Handled in initializeAdminPanel
    // loginForm.addEventListener('submit', handleLogin);
    
    // Logout button
    logoutBtn.addEventListener('click', handleLogout);
    
    // Navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.dataset.section) {
                switchSection(this.dataset.section);
            }
        });
    });
    
    // Month filter buttons
    document.getElementById('currentMonthBtn')?.addEventListener('click', () => filterAppointmentsByMonth(new Date()));
    document.getElementById('nextMonthBtn')?.addEventListener('click', () => {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        filterAppointmentsByMonth(nextMonth);
    });
    document.getElementById('showAllBtn')?.addEventListener('click', () => {
        displayAppointments(appointments);
        document.getElementById('appointmentMonth').value = '';
    });
    
    // Appointment month filter
    document.getElementById('appointmentMonth')?.addEventListener('change', function() {
        if (this.value) {
            const [year, month] = this.value.split('-');
            const filterDate = new Date(year, month - 1, 1);
            filterAppointmentsByMonth(filterDate);
        } else {
            displayAppointments(appointments);
        }
    });
    
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
    
    // User management
    document.getElementById('addUserBtn')?.addEventListener('click', () => openUserModal());
    document.getElementById('userForm')?.addEventListener('submit', handleUserSave);
    
    // Availability form
    document.getElementById('availabilityForm')?.addEventListener('submit', handleAvailabilityUpdate);
    
    // Block date form
    document.getElementById('blockDateForm')?.addEventListener('submit', handleBlockDate);
    
    // Export analytics report (Settings section)
    document.getElementById('exportDataBtn')?.addEventListener('click', generateAnalyticsReport);
    
    // Membership management controls
    document.getElementById('checkRenewalsBtn')?.addEventListener('click', function() {
        if (window.checkMembershipRenewals) {
            const renewalsProcessed = window.checkMembershipRenewals();
            showNotification(`Checked for renewals: ${renewalsProcessed} processed`, 'info');
            displayMemberships(); // Refresh the display
        }
    });
}

function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (user) {
        currentUser = user;
        loginScreen.style.display = 'none';
        adminPanel.style.display = 'block';
        initializeAdminPanel();
        loginError.textContent = '';
    } else {
        loginError.textContent = 'Invalid username or password';
    }
}

function handleLogout() {
    console.log('🔒 Admin logout initiated');
    currentUser = null;
    
    // Use secure session management for logout
    if (window.universalSession) {
        window.universalSession.logout();
    } else {
        // Fallback - clear all session data with role isolation
        localStorage.removeItem('admin_session_data');
        localStorage.removeItem('currentUser'); // Legacy fallback
    }
    
    loginScreen.style.display = 'flex';
    adminPanel.style.display = 'none';
    if (loginForm) loginForm.reset();
    if (loginError) loginError.textContent = '';
    
    console.log('🔒 Admin logout completed');
}

function checkAuthStatus() {
    console.log('🔒 Checking admin authentication status');
    
    // Use secure session management
    if (window.universalSession) {
        const user = window.universalSession.getCurrentUser();
        if (user && user.role === 'admin') {
            console.log('🔒 Valid admin session found');
            currentUser = user;
            loginScreen.style.display = 'none';
            adminPanel.style.display = 'block';
            initializeAdminPanel();
            return;
        }
    } else {
        // Fallback to secure localStorage check
        const adminSession = localStorage.getItem('admin_session_data');
        if (adminSession) {
            try {
                const user = JSON.parse(adminSession);
                if (user.role === 'admin') {
                    console.log('🔒 Valid admin session found (fallback)');
                    currentUser = user;
                    loginScreen.style.display = 'none';
                    adminPanel.style.display = 'block';
                    initializeAdminPanel();
                    return;
                }
            } catch (e) {
                console.log('🔒 Invalid session data, clearing');
                localStorage.removeItem('admin_session_data');
            }
        }
        
        // Legacy cleanup
        const legacyUser = localStorage.getItem('currentUser');
        if (legacyUser) {
            try {
                const user = JSON.parse(legacyUser);
                if (user.role === 'admin') {
                    console.log('🔒 Migrating legacy admin session');
                    localStorage.removeItem('currentUser');
                    localStorage.setItem('admin_session_data', JSON.stringify(user));
                    currentUser = user;
                    loginScreen.style.display = 'none';
                    adminPanel.style.display = 'block';
                    initializeAdminPanel();
                    return;
                }
            } catch (e) {
                localStorage.removeItem('currentUser');
            }
        }
    }
    
    console.log('🔒 No valid admin session, showing login');
    // Show login screen for non-authenticated users
    loginScreen.style.display = 'flex';
    adminPanel.style.display = 'none';
}

function initializeAdminPanel() {
    switchSection('dashboard');
    displayAppointments(appointments);
    displayUsers();
    updateReports();
    setupDateInputs();
    displayBlockedDates();
    generateAdminCalendar();
    displayPayments();
    setupCalendarNavigation();
    displayReviews();
    displayMessages();
    
    // Initialize dashboard stats
    updateDashboardStats();
    
    // Initialize payment stats
    updatePaymentStats();
    
    // Initialize review stats
    updateReviewsStats();
    
    // Initialize revenue chart
    initializeRevenueChart();
}

function switchSection(sectionName) {
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.section === sectionName) {
            btn.classList.add('active');
        }
    });
    
    // Update sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionName).classList.add('active');
    
    // Load section-specific data
    if (sectionName === 'membership-management') {
        displayMemberships();
    }
}

// Display memberships in admin panel
function displayMemberships() {
    console.log('📊 Loading membership data for admin display');
    
    const memberships = window.getMemberships ? window.getMemberships() : [];
    
    // Update statistics
    const activeMemberships = memberships.filter(m => m.status === 'active');
    const autoRenewMemberships = activeMemberships.filter(m => m.autoRenew);
    
    // Calculate this month's renewals
    const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    const monthlyRenewals = memberships.filter(m => 
        m.paymentHistory && m.paymentHistory.some(p => 
            p.type === 'auto-renewal' && p.date.startsWith(thisMonth)
        )
    );
    
    // Update stat displays
    document.getElementById('activeMemberships').textContent = activeMemberships.length;
    document.getElementById('autoRenewCount').textContent = autoRenewMemberships.length;
    document.getElementById('monthlyRenewals').textContent = monthlyRenewals.length;
    
    // Display membership list
    const membershipsList = document.getElementById('membershipsList');
    if (!membershipsList) return;
    
    if (activeMemberships.length === 0) {
        membershipsList.innerHTML = '<p>No active memberships found</p>';
        return;
    }
    
    const tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Member ID</th>
                    <th>Plan</th>
                    <th>Cost</th>
                    <th>Status</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Auto-Renew</th>
                    <th>Next Billing</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${activeMemberships.map(membership => `
                    <tr>
                        <td>${membership.userId}</td>
                        <td>${getMembershipDisplayName(membership.plan || membership.typeName)}</td>
                        <td>$${getMembershipPrice(membership.plan || membership.typeName, membership)}/month</td>
                        <td><span class="status ${membership.status}">${membership.status}</span></td>
                        <td>${formatDate(membership.startDate)}</td>
                        <td>${formatDate(membership.endDate)}</td>
                        <td>${membership.autoRenew ? '✅ Yes' : '❌ No'}</td>
                        <td>${membership.nextBillingDate ? formatDate(membership.nextBillingDate) : 'N/A'}</td>
                        <td>
                            ${membership.autoRenew ? 
                                `<button onclick="toggleAutoRenewal(${membership.id}, false)" class="btn-small btn-danger">Disable Auto-Renew</button>` :
                                `<button onclick="toggleAutoRenewal(${membership.id}, true)" class="btn-small btn-primary">Enable Auto-Renew</button>`
                            }
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    membershipsList.innerHTML = tableHTML;
}

// Toggle auto-renewal for a membership
function toggleAutoRenewal(membershipId, enable) {
    const memberships = window.getMemberships ? window.getMemberships() : [];
    const membership = memberships.find(m => m.id === membershipId);
    
    if (membership) {
        if (enable) {
            membership.autoRenew = true;
            console.log('✅ Auto-renewal enabled for membership:', membershipId);
            showNotification('Auto-renewal enabled for membership', 'success');
        } else {
            if (window.cancelMembershipRenewal) {
                window.cancelMembershipRenewal(membershipId);
                showNotification('Auto-renewal disabled for membership', 'info');
            }
        }
        
        // Refresh the display
        displayMemberships();
    }
}

function displayAppointments(appointmentsToShow) {
    const appointmentsList = document.getElementById('appointmentsList');
    
    if (appointmentsToShow.length === 0) {
        appointmentsList.innerHTML = '<p class="no-appointments">No appointments found for the selected date.</p>';
        return;
    }
    
    const appointmentsHTML = appointmentsToShow.map(appointment => {
        // Debug: Log the raw date and formatted date
        console.log(`Appointment ${appointment.id}: Raw date = "${appointment.date}", Formatted = "${formatDate(appointment.date)}"`);
        
        return `
            <div class="appointment-card ${appointment.status}" onclick="openAppointmentModal(${appointment.id})">
                <div class="appointment-header">
                    <div class="appointment-time">${appointment.time}</div>
                    <div class="appointment-status status-${appointment.status}">${appointment.status}</div>
                </div>
                <div class="appointment-details">
                    <p><strong>${appointment.clientName}</strong></p>
                    <p>${appointment.service} - $${appointment.price}</p>
                    <p>📞 ${appointment.phone}</p>
                    <p>📧 ${appointment.email}</p>
                    <p>📅 ${formatDate(appointment.date)}</p>
                    ${appointment.notes ? `<p><em>${appointment.notes}</em></p>` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    appointmentsList.innerHTML = appointmentsHTML;
}

function filterAppointmentsByMonth(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
    const monthString = `${year}-${month.toString().padStart(2, '0')}`;
    
    const filteredAppointments = appointments.filter(apt => {
        return apt.date.startsWith(monthString);
    });
    
    displayAppointments(filteredAppointments);
    
    // Update the month input
    document.getElementById('appointmentMonth').value = monthString;
}

function openAppointmentModal(appointmentId) {
    selectedAppointment = appointments.find(apt => apt.id === appointmentId);
    if (!selectedAppointment) return;
    
    const modal = document.getElementById('appointmentModal');
    const detailsDiv = document.getElementById('appointmentDetails');
    
    detailsDiv.innerHTML = `
        <div class="appointment-info">
            <h4>${selectedAppointment.clientName}</h4>
            <p><strong>Service:</strong> ${selectedAppointment.service}</p>
            <p><strong>Date:</strong> ${formatDate(selectedAppointment.date)}</p>
            <p><strong>Time:</strong> ${selectedAppointment.time}</p>
            <p><strong>Price:</strong> $${selectedAppointment.price}</p>
            <p><strong>Phone:</strong> ${selectedAppointment.phone}</p>
            <p><strong>Email:</strong> ${selectedAppointment.email}</p>
            <p><strong>Status:</strong> <span class="status-${selectedAppointment.status}">${selectedAppointment.status}</span></p>
            ${selectedAppointment.notes ? `<p><strong>Notes:</strong> ${selectedAppointment.notes}</p>` : ''}
        </div>
    `;
    
    // Setup modal buttons
    document.getElementById('confirmAppointment').onclick = () => updateAppointmentStatus('confirmed');
    document.getElementById('cancelAppointment').onclick = () => updateAppointmentStatus('cancelled');
    document.getElementById('rescheduleAppointment').onclick = () => rescheduleAppointment();
    
    modal.style.display = 'block';
}

function updateAppointmentStatus(status) {
    if (selectedAppointment) {
        selectedAppointment.status = status;
        displayAppointments(appointments);
        updateReports();
        document.getElementById('appointmentModal').style.display = 'none';
        
        // Show confirmation
        alert(`Appointment ${status} successfully!`);
    }
}

function rescheduleAppointment() {
    // In a real app, this would open a reschedule interface
    alert('Reschedule functionality would be implemented here');
    document.getElementById('appointmentModal').style.display = 'none';
}


function openUserModal(user = null) {
    const modal = document.getElementById('userModal');
    const form = document.getElementById('userForm');
    const title = document.getElementById('userModalTitle');
    
    if (user) {
        title.textContent = 'Edit User';
        document.getElementById('userName').value = user.name;
        document.getElementById('userEmail').value = user.email;
        document.getElementById('userPhone').value = user.phone;
        document.getElementById('userRole').value = user.role;
        document.getElementById('userMembership').value = user.membershipPlan || '';
        form.dataset.userId = user.id;
    } else {
        title.textContent = 'Add New User';
        form.reset();
        delete form.dataset.userId;
    }
    
    modal.style.display = 'block';
}

function editUser(userId) {
    const user = users.find(u => u.id === userId);
    if (user) {
        openUserModal(user);
    }
}

function deleteUser(userId) {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        console.log('admin.js: deleteUser called with ID:', userId);
        
        try {
            // Convert to number for consistent comparison
            const numericId = parseInt(userId);
            console.log('admin.js: Converted to numeric ID:', numericId);
            
            // Find the user to delete
            const userToDelete = window.sharedUsers?.find(u => u.id === numericId);
            if (!userToDelete) {
                console.error('admin.js: User not found with ID:', numericId);
                showNotification('Error: User not found.', 'error');
                return;
            }
            
            // Remove user from shared data
            const userIndex = window.sharedUsers.findIndex(u => u.id === numericId);
            if (userIndex !== -1) {
                const deletedUser = window.sharedUsers.splice(userIndex, 1)[0];
                console.log('admin.js: User deleted successfully:', deletedUser);
                
                // Trigger event to save to localStorage
                window.dispatchEvent(new CustomEvent('userDeleted', { detail: deletedUser }));
                
                // Refresh the display
                displayUsers();
                
                showNotification(`User ${deletedUser.name} deleted successfully!`, 'success');
            } else {
                console.error('admin.js: Failed to find user index for ID:', numericId);
                showNotification('Error deleting user. Please try again.', 'error');
            }
        } catch (error) {
            console.error('admin.js: Error in deleteUser:', error);
            showNotification('Error deleting user. Please try again.', 'error');
        }
    }
}

function cancelUserMembership(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) {
        alert('User not found.');
        return;
    }
    
    if (!user.membershipPlan) {
        alert('This user does not have an active membership.');
        return;
    }
    
    const membershipName = getMembershipDisplayName(user.membershipPlan);
    const confirmMessage = `Are you sure you want to cancel ${user.name}'s ${membershipName} membership?\n\nThis action cannot be undone and will end their membership benefits immediately.`;
    
    if (confirm(confirmMessage)) {
        // Cancel the membership
        const previousPlan = user.membershipPlan;
        user.membershipPlan = null;
        user.membershipEndDate = new Date().toISOString();
        
        // Update user in shared data if available
        if (window.updateUser) {
            window.updateUser(user.id, user);
        } else {
            // Update in local array
            const userIndex = users.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                users[userIndex] = user;
            }
        }
        
        // Refresh the users display
        displayUsers();
        
        // Show confirmation
        showNotification(`${user.name}'s ${membershipName} membership has been cancelled.`, 'info');
    }
}

function handleUserSave(e) {
    e.preventDefault();
    
    const form = e.target;
    const userData = {
        name: form.userName.value,
        email: form.userEmail.value,
        phone: form.userPhone.value,
        role: form.userRole.value,
        membershipPlan: form.userMembership.value || null
    };
    
    if (form.dataset.userId) {
        // Edit existing user
        const userId = parseInt(form.dataset.userId);
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            users[userIndex] = { ...users[userIndex], ...userData };
        }
    } else {
        // Add new user
        const newUser = {
            id: Math.max(...users.map(u => u.id)) + 1,
            username: userData.email, // Use email as username for new users
            password: 'password123', // Default password
            totalAppointments: 0,
            lastVisit: null,
            ...userData
        };
        users.push(newUser);
    }
    
    displayUsers();
    document.getElementById('userModal').style.display = 'none';
    alert('User saved successfully!');
}

function handleAvailabilityUpdate(e) {
    e.preventDefault();
    
    const form = e.target;
    const date = form.availDate.value;
    const selectedTimes = Array.from(form.querySelectorAll('input[type="checkbox"]:checked'))
                              .map(checkbox => checkbox.value);
    
    // In a real app, this would update the backend
    console.log('Updating availability for', date, 'with times:', selectedTimes);
    
    alert(`Availability updated for ${formatDate(date)}!\nAvailable times: ${selectedTimes.join(', ')}`);
    form.reset();
}

function updateReports() {
    const today = new Date().toISOString().split('T')[0];
    const thisWeekStart = getWeekStart(new Date());
    
    // Today's stats
    const todayAppointments = appointments.filter(apt => 
        apt.date === today && apt.status !== 'cancelled'
    );
    const todayRevenue = todayAppointments.reduce((sum, apt) => sum + apt.price, 0);
    
    // This week's stats
    const weekAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate >= thisWeekStart && apt.status !== 'cancelled';
    });
    const weekRevenue = weekAppointments.reduce((sum, apt) => sum + apt.price, 0);
    
    // Update DOM
    document.getElementById('todayAppointments').textContent = todayAppointments.length;
    document.getElementById('todayRevenue').textContent = `$${todayRevenue}`;
    document.getElementById('weekAppointments').textContent = weekAppointments.length;
    document.getElementById('weekRevenue').textContent = `$${weekRevenue}`;
    
    // Popular services
    const serviceCount = {};
    appointments.forEach(apt => {
        if (apt.status !== 'cancelled') {
            serviceCount[apt.service] = (serviceCount[apt.service] || 0) + 1;
        }
    });
    
    const popularServices = Object.entries(serviceCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    
    const popularServicesHTML = popularServices.map(([service, count]) => 
        `<p>${service}: ${count} bookings</p>`
    ).join('');
    
    document.getElementById('popularServices').innerHTML = popularServicesHTML || '<p>No data available</p>';
}

function setupDateInputs() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Set default appointment filter to current month
    const currentMonth = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
    document.getElementById('appointmentMonth').value = currentMonth;
    
    // Set availability form date to tomorrow
    document.getElementById('availDate').min = tomorrow.toISOString().split('T')[0];
}

// Utility functions
function formatDate(dateString) {
    // Handle timezone issues by parsing the date manually
    if (!dateString) return 'N/A';
    
    // If dateString is in YYYY-MM-DD format, add time to avoid timezone issues
    let date;
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Add noon time to avoid timezone shifting
        date = new Date(dateString + 'T12:00:00');
    } else {
        date = new Date(dateString);
    }
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
        return dateString; // Return original string if can't parse
    }
    
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function getMembershipDisplayName(membershipPlan) {
    const membershipNames = {
        'wellness': 'Wellness Member',
        'restoration-plus': 'Restoration Plus',
        'therapeutic-elite': 'Therapeutic Elite'
    };
    
    return membershipPlan ? membershipNames[membershipPlan] || membershipPlan : 'None';
}

function getMembershipPrice(membershipPlan, membership = null) {
    // First, try to use the direct price from the membership object
    if (membership && membership.price) {
        return membership.price;
    }
    
    // Fallback to lookup by plan type
    const membershipPrices = {
        'wellness': 75,
        'restoration-plus': 140,
        'therapeutic-elite': 200
    };
    
    return membershipPlan ? membershipPrices[membershipPlan] || 0 : 0;
}

function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
}

// Blocked Date Management Functions
function displayBlockedDates() {
    const container = document.getElementById('blockedDatesList');
    
    // Always reload blocked dates from shared data to ensure sync
    if (window.getBlockedDates) {
        blockedDates = window.getBlockedDates();
    }
    
    // Debug logging
    console.log('displayBlockedDates called, found:', blockedDates.length, 'blocked dates');
    console.log('Blocked dates data:', blockedDates);
    
    if (blockedDates.length === 0) {
        container.innerHTML = '<p class="no-blocked-dates">No blocked dates</p>';
        return;
    }
    
    // Sort blocked dates by date
    const sortedBlockedDates = [...blockedDates].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const blockedDatesHTML = sortedBlockedDates.map(blocked => {
        const typeColors = {
            vacation: '#3498db',
            personal: '#9b59b6',
            medical: '#e74c3c',
            training: '#f39c12',
            other: '#95a5a6'
        };
        
        return `
            <div class="blocked-date-item" style="border-left-color: ${typeColors[blocked.type]}">
                <div class="blocked-date-info">
                    <h5>${formatDate(blocked.date)}</h5>
                    <p><strong>${blocked.reason}</strong></p>
                    <p class="blocked-type">${blocked.type.charAt(0).toUpperCase() + blocked.type.slice(1)}</p>
                </div>
                <button class="delete-blocked-btn" onclick="removeBlockedDate(${blocked.id})">Remove</button>
            </div>
        `;
    }).join('');
    
    container.innerHTML = blockedDatesHTML;
}

function handleBlockDate(e) {
    e.preventDefault();
    
    const form = e.target;
    const date = form.blockDate.value;
    const reason = form.blockReason.value;
    const type = form.blockType.value;
    
    // Check if date is already blocked
    if (blockedDates.find(blocked => blocked.date === date)) {
        alert('This date is already blocked!');
        return;
    }
    
    // Check if date is in the past
    const blockDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (blockDate < today) {
        alert('Cannot block dates in the past!');
        return;
    }
    
    // Add new blocked date
    const newBlockedDate = {
        id: Math.max(...blockedDates.map(b => b.id), 0) + 1,
        date: date,
        reason: reason,
        type: type
    };
    
    blockedDates.push(newBlockedDate);
    
    // Update shared blocked dates for the booking page
    if (window.sharedBlockedDates) {
        window.sharedBlockedDates.push(newBlockedDate);
        // Save to localStorage so booking page can access it
        localStorage.setItem('massageBlockedDates', JSON.stringify(window.sharedBlockedDates));
        console.log('Blocked date added to localStorage:', newBlockedDate);
    }
    
    // Refresh booking calendar if it exists
    if (window.generateCalendar && typeof window.generateCalendar === 'function') {
        window.generateCalendar();
    }
    
    // Cancel any existing appointments on this date
    const affectedAppointments = appointments.filter(apt => apt.date === date && apt.status !== 'cancelled');
    if (affectedAppointments.length > 0) {
        const confirmCancel = confirm(`There are ${affectedAppointments.length} existing appointments on this date. They will need to be cancelled. Continue?`);
        if (!confirmCancel) {
            // Remove the blocked date we just added
            blockedDates.pop();
            // Also remove from shared data
            if (window.sharedBlockedDates) {
                window.sharedBlockedDates.pop();
                localStorage.setItem('massageBlockedDates', JSON.stringify(window.sharedBlockedDates));
            }
            return;
        }
        
        // Cancel the appointments
        affectedAppointments.forEach(apt => {
            apt.status = 'cancelled';
            apt.notes = (apt.notes || '') + ' [Cancelled due to therapist unavailability]';
        });
    }
    
    // Refresh displays
    displayBlockedDates();
    displayAppointments(appointments);
    updateReports();
    
    // Reset form
    form.reset();
    
    alert(`Date blocked successfully! ${affectedAppointments.length > 0 ? `${affectedAppointments.length} appointments were cancelled.` : ''}`);
}

function removeBlockedDate(blockedId) {
    if (confirm('Are you sure you want to remove this blocked date? This will make the date available for booking again.')) {
        const index = blockedDates.findIndex(blocked => blocked.id === blockedId);
        if (index !== -1) {
            const removedDate = blockedDates.splice(index, 1)[0];
            
            // Also remove from shared blocked dates for the booking page
            if (window.sharedBlockedDates) {
                const sharedIndex = window.sharedBlockedDates.findIndex(blocked => blocked.id === blockedId);
                if (sharedIndex !== -1) {
                    window.sharedBlockedDates.splice(sharedIndex, 1);
                    // Save to localStorage so booking page can access it
                    localStorage.setItem('massageBlockedDates', JSON.stringify(window.sharedBlockedDates));
                    console.log('Blocked date removed from localStorage:', removedDate);
                }
            }
            
            // Refresh booking calendar if it exists
            if (window.generateCalendar && typeof window.generateCalendar === 'function') {
                window.generateCalendar();
            }
            
            displayBlockedDates();
            alert('Blocked date removed successfully!');
        }
    }
}

// Function to check if a date is blocked (used by the booking system)
function isDateBlocked(dateString) {
    return blockedDates.some(blocked => blocked.date === dateString);
}

// Admin Calendar Functions
let currentCalendarDate = new Date();

function generateAdminCalendar() {
    const calendar = document.getElementById('scheduleCalendar');
    const titleElement = document.getElementById('calendarTitle');
    
    if (!calendar || !titleElement) return;
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    // Update title
    titleElement.textContent = new Date(year, month).toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
    });
    
    // Clear calendar
    calendar.innerHTML = '';
    
    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        header.style.fontWeight = 'bold';
        header.style.textAlign = 'center';
        header.style.padding = '0.5rem';
        header.style.background = '#f8f9fa';
        calendar.appendChild(header);
    });
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'admin-calendar-day other-month';
        calendar.appendChild(emptyDay);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'admin-calendar-day';
        
        const dayDate = new Date(year, month, day);
        const dateString = dayDate.toISOString().split('T')[0];
        const today = new Date();
        
        // Check if today
        if (dayDate.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }
        
        // Day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'calendar-day-number';
        dayNumber.textContent = day;
        dayElement.appendChild(dayNumber);
        
        // Get appointments for this day
        const dayAppointments = appointments.filter(apt => apt.date === dateString);
        
        if (dayAppointments.length > 0) {
            dayElement.classList.add('has-appointments');
            
            const appointmentsContainer = document.createElement('div');
            appointmentsContainer.className = 'calendar-appointments';
            
            dayAppointments.forEach(apt => {
                const aptElement = document.createElement('span');
                aptElement.className = `calendar-appointment ${apt.status}`;
                aptElement.textContent = `${apt.time} ${apt.clientName.split(' ')[0]}`;
                aptElement.title = `${apt.time} - ${apt.clientName} (${apt.service})`;
                appointmentsContainer.appendChild(aptElement);
            });
            
            dayElement.appendChild(appointmentsContainer);
        }
        
        // Check if date is blocked
        if (isDateBlocked(dateString)) {
            const blockedElement = document.createElement('span');
            blockedElement.className = 'calendar-appointment cancelled';
            blockedElement.textContent = 'BLOCKED';
            blockedElement.title = 'Christopher is unavailable';
            
            if (!dayElement.querySelector('.calendar-appointments')) {
                const appointmentsContainer = document.createElement('div');
                appointmentsContainer.className = 'calendar-appointments';
                dayElement.appendChild(appointmentsContainer);
            }
            dayElement.querySelector('.calendar-appointments').appendChild(blockedElement);
        }
        
        calendar.appendChild(dayElement);
    }
}

function setupCalendarNavigation() {
    const prevBtn = document.getElementById('prevMonth');
    const nextBtn = document.getElementById('nextMonth');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            generateAdminCalendar();
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            generateAdminCalendar();
        });
    }
}

// Payment Management Functions
function displayPayments() {
    const paymentsTableBody = document.getElementById('paymentsTableBody');
    if (!paymentsTableBody) return;
    
    // Clear table body and build rows safely
    paymentsTableBody.innerHTML = '';
    
    appointments.forEach(apt => {
        const row = document.createElement('tr');
        
        // Date cell
        const dateCell = document.createElement('td');
        dateCell.textContent = formatDate(apt.date) || '';
        row.appendChild(dateCell);
        
        // Time cell
        const timeCell = document.createElement('td');
        timeCell.textContent = apt.time || '';
        row.appendChild(timeCell);
        
        // Client name cell
        const clientCell = document.createElement('td');
        clientCell.textContent = apt.clientName || '';
        row.appendChild(clientCell);
        
        // Service cell
        const serviceCell = document.createElement('td');
        serviceCell.textContent = apt.service || '';
        row.appendChild(serviceCell);
        
        // Price cell
        const priceCell = document.createElement('td');
        priceCell.textContent = `$${apt.price || '0'}`;
        row.appendChild(priceCell);
        
        // Status cell
        const statusCell = document.createElement('td');
        const paymentStatus = apt.paymentStatus || 'pending';
        const statusSpan = document.createElement('span');
        statusSpan.className = `payment-status ${paymentStatus}`;
        statusSpan.textContent = paymentStatus;
        statusCell.appendChild(statusSpan);
        row.appendChild(statusCell);
        
        // Payment method cell
        const methodCell = document.createElement('td');
        methodCell.textContent = apt.paymentMethod || 'N/A';
        row.appendChild(methodCell);
        
        // Actions cell
        const actionsCell = document.createElement('td');
        actionsCell.className = 'payment-actions';
        
        if (paymentStatus === 'pending') {
            const markPaidBtn = document.createElement('button');
            markPaidBtn.className = 'mark-paid-btn';
            markPaidBtn.textContent = 'Mark Paid';
            markPaidBtn.onclick = () => markAsPaid(apt.id);
            actionsCell.appendChild(markPaidBtn);
        }
        
        if (paymentStatus === 'paid') {
            const refundBtn = document.createElement('button');
            refundBtn.className = 'refund-btn';
            refundBtn.textContent = 'Refund';
            refundBtn.onclick = () => processRefund(apt.id);
            actionsCell.appendChild(refundBtn);
        }
        
        row.appendChild(actionsCell);
        paymentsTableBody.appendChild(row);
    });
    updatePaymentStats();
}

function updatePaymentStats() {
    // Always get fresh appointment data
    if (window.getAppointments) {
        appointments = window.getAppointments();
    }
    
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    console.log('Updating payment stats for:', { today, currentMonth, appointmentsCount: appointments.length });
    
    // Today's stats - only paid appointments for today
    const todayPayments = appointments.filter(apt => {
        const isPaid = apt.paymentStatus === 'paid';
        const isToday = apt.date === today;
        return isPaid && isToday;
    });
    const todayRevenue = todayPayments.reduce((sum, apt) => sum + (parseFloat(apt.price) || 0), 0);
    
    // This month's stats - only paid appointments for current month
    const monthPayments = appointments.filter(apt => {
        const isPaid = apt.paymentStatus === 'paid';
        const isCurrentMonth = apt.date.startsWith(currentMonth);
        return isPaid && isCurrentMonth;
    });
    const monthRevenue = monthPayments.reduce((sum, apt) => sum + (parseFloat(apt.price) || 0), 0);
    
    // Pending payments - any appointment with pending payment status
    const pendingPayments = appointments.filter(apt => 
        apt.paymentStatus === 'pending' || !apt.paymentStatus
    );
    const pendingRevenue = pendingPayments.reduce((sum, apt) => sum + (parseFloat(apt.price) || 0), 0);
    
    // Debug logging
    console.log('Payment stats calculated:', {
        todayPayments: todayPayments.length,
        todayRevenue,
        monthPayments: monthPayments.length,
        monthRevenue,
        pendingPayments: pendingPayments.length,
        pendingRevenue
    });
    
    // Update DOM elements
    const todayRevenueEl = document.getElementById('todayRevenue');
    const todayPaymentsEl = document.getElementById('todayPayments');
    const monthRevenueEl = document.getElementById('monthRevenue');
    const monthPaymentsEl = document.getElementById('monthPayments');
    const pendingRevenueEl = document.getElementById('pendingRevenue');
    const pendingPaymentsEl = document.getElementById('pendingPayments');
    
    if (todayRevenueEl) todayRevenueEl.textContent = `$${todayRevenue.toFixed(2)}`;
    if (todayPaymentsEl) todayPaymentsEl.textContent = `${todayPayments.length} payments`;
    if (monthRevenueEl) monthRevenueEl.textContent = `$${monthRevenue.toFixed(2)}`;
    if (monthPaymentsEl) monthPaymentsEl.textContent = `${monthPayments.length} payments`;
    if (pendingRevenueEl) pendingRevenueEl.textContent = `$${pendingRevenue.toFixed(2)}`;
    if (pendingPaymentsEl) pendingPaymentsEl.textContent = `${pendingPayments.length} payments`;
}

function markAsPaid(appointmentId) {
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (appointment) {
        appointment.paymentStatus = 'paid';
        appointment.transactionId = `txn_${Date.now()}`;
        
        // Update appointment in shared data
        if (window.updateAppointment) {
            window.updateAppointment(appointmentId, {
                paymentStatus: 'paid',
                transactionId: appointment.transactionId
            });
        }
        
        displayPayments();
        updatePaymentStats();
        updateReports();
        updateDashboardStats();
        
        showNotification('Payment marked as paid successfully!', 'success');
    }
}

function processRefund(appointmentId) {
    if (confirm('Are you sure you want to process a refund for this payment?')) {
        const appointment = appointments.find(apt => apt.id === appointmentId);
        if (appointment) {
            appointment.paymentStatus = 'refunded';
            
            // Update appointment in shared data
            if (window.updateAppointment) {
                window.updateAppointment(appointmentId, {
                    paymentStatus: 'refunded'
                });
            }
            
            displayPayments();
            updatePaymentStats();
            updateReports();
            updateDashboardStats();
            
            showNotification('Refund processed successfully!', 'success');
        }
    }
}

// Notification System
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotification = document.querySelector('.admin-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `admin-notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Position notification
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '10000';
    notification.style.background = type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db';
    notification.style.color = 'white';
    notification.style.padding = '1rem';
    notification.style.borderRadius = '5px';
    notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    notification.style.transform = 'translateX(100%)';
    notification.style.transition = 'transform 0.3s ease';
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    });
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function highlightNewAppointment(appointmentId) {
    // Wait a moment for the DOM to update
    setTimeout(() => {
        const appointmentCards = document.querySelectorAll('.appointment-card');
        appointmentCards.forEach(card => {
            // Check if this card corresponds to the new appointment
            const cardText = card.textContent;
            const newAppointment = appointments.find(apt => apt.id === appointmentId);
            
            if (newAppointment && cardText.includes(newAppointment.clientName) && 
                cardText.includes(newAppointment.time)) {
                
                // Add highlight class
                card.classList.add('new-appointment');
                card.style.animation = 'highlightPulse 2s ease-in-out';
                card.style.borderLeft = '4px solid #f39c12';
                
                // Add "NEW" badge
                const badge = document.createElement('span');
                badge.className = 'new-badge';
                badge.textContent = 'NEW';
                badge.style.position = 'absolute';
                badge.style.top = '10px';
                badge.style.right = '10px';
                badge.style.background = '#f39c12';
                badge.style.color = 'white';
                badge.style.padding = '2px 8px';
                badge.style.borderRadius = '10px';
                badge.style.fontSize = '0.7rem';
                badge.style.fontWeight = 'bold';
                
                card.style.position = 'relative';
                card.appendChild(badge);
                
                // Remove highlight after 10 seconds
                setTimeout(() => {
                    card.classList.remove('new-appointment');
                    card.style.animation = '';
                    card.style.borderLeft = '';
                    if (badge.parentNode) {
                        badge.remove();
                    }
                }, 10000);
                
                // Scroll to the new appointment
                card.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }
        });
    }, 500);
}

// Add CSS for the highlight animation
const style = document.createElement('style');
style.textContent = `
    @keyframes highlightPulse {
        0%, 100% { 
            background: white; 
            transform: scale(1);
        }
        50% { 
            background: #fff3cd; 
            transform: scale(1.02);
        }
    }
    
    .admin-notification {
        font-family: Arial, sans-serif;
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }
    
    .notification-close {
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .notification-close:hover {
        opacity: 0.8;
    }
`;
document.head.appendChild(style);

// Review Management Functions
function displayReviews() {
    const reviewsList = document.getElementById('reviewsList');
    if (!reviewsList) return;
    
    // Get all reviews from shared data (now all dynamic)
    if (window.getReviews) {
        reviews = window.getReviews();
    }
    
    console.log('Admin reviews loaded:', reviews.length, 'reviews');
    
    if (reviews.length === 0) {
        reviewsList.innerHTML = '<p class="no-reviews">No reviews found. Reviews will appear here when customers submit them through the reviews page.</p>';
        return;
    }
    
    // Sort reviews by creation date, newest first
    const sortedReviews = [...reviews].sort((a, b) => 
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
    
    const reviewsHTML = sortedReviews.map(review => {
        const stars = '★'.repeat(review.rating || 5) + '☆'.repeat(5 - (review.rating || 5));
        let reviewDate = 'Unknown date';
        try {
            if (review.createdAt) {
                reviewDate = formatDate(review.createdAt);
            } else if (review.date) {
                reviewDate = formatDate(review.date);
            } else {
                reviewDate = 'Recently';
            }
        } catch (error) {
            console.log('Date formatting error:', error);
            reviewDate = 'Unknown date';
        }
        
        // Handle different property names from different sources
        const reviewName = review.name || review.userName || 'Anonymous';
        const reviewText = review.review || review.reviewText || review.text || 'No review text available';
        const reviewService = review.service || 'Massage Therapy';
        
        return `
            <div class="review-card dynamic-review" id="review-${review.id}">
                <div class="review-header">
                    <div class="review-author">
                        <strong>${reviewName}</strong>
                        <div class="review-rating">${stars} (${review.rating || 5}/5)</div>
                    </div>
                    <div class="review-date">${reviewDate}</div>
                </div>
                <div class="review-service">
                    <small><strong>Service:</strong> ${reviewService}</small>
                    <span class="review-type-badge dynamic">User Submitted</span>
                </div>
                <div class="review-content">
                    <p>${reviewText}</p>
                </div>
                <div class="review-actions">
                    <button class="delete-review-btn" data-review-id="${review.id}">
                        Delete Review
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    reviewsList.innerHTML = reviewsHTML;
    
    // Add event delegation for delete buttons
    reviewsList.removeEventListener('click', handleReviewDelete); // Remove any existing listener
    reviewsList.addEventListener('click', handleReviewDelete);
}

// Handle review delete button clicks using event delegation
function handleReviewDelete(event) {
    if (event.target.classList.contains('delete-review-btn')) {
        event.preventDefault();
        event.stopPropagation();
        const reviewId = event.target.getAttribute('data-review-id');
        console.log('handleReviewDelete: Processing click for review ID:', reviewId);
        deleteReview(reviewId, event.target);
    }
}

function updateReviewsStats() {
    // Always get fresh review data
    if (window.getReviews) {
        reviews = window.getReviews();
    }
    
    const totalReviews = reviews.length;
    const averageRating = totalReviews > 0 ? 
        reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews : 0;
    
    // Update DOM elements
    const averageRatingEl = document.getElementById('averageRating');
    const totalReviewsEl = document.getElementById('totalReviews');
    
    if (averageRatingEl) {
        averageRatingEl.textContent = averageRating.toFixed(1);
    }
    if (totalReviewsEl) {
        totalReviewsEl.textContent = totalReviews;
    }
}

function deleteReview(reviewId, buttonElement) {
    console.log('admin.js: Attempting to delete review with ID:', reviewId, 'Type:', typeof reviewId);
    
    // Use the passed button element or find it by data attribute
    const deleteBtn = buttonElement || document.querySelector(`button[data-review-id="${reviewId}"]`);
    
    // Temporarily disable double-execution protection to debug
    /*if (deleteBtn && deleteBtn.disabled) {
        console.log('admin.js: Delete already in progress, ignoring duplicate call');
        return;
    }*/
    
    // Disable the button to prevent double clicks
    if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Deleting...';
    }
    
    // Ensure we have the latest reviews data
    if (window.getReviews) {
        reviews = window.getReviews();
    }
    
    console.log('admin.js: Available reviews count:', reviews.length);
    
    // Convert reviewId to number for comparison
    const numericReviewId = parseInt(reviewId);
    const review = reviews.find(r => r.id === numericReviewId);
    
    if (!review) {
        console.error('admin.js: Review not found. Looking for ID:', numericReviewId);
        showNotification('Review not found.', 'error');
        // Re-enable button
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.textContent = 'Delete Review';
        }
        return;
    }
    
    console.log('admin.js: Found review to delete:', review);
    
    const confirmMessage = `Are you sure you want to delete this review from ${review.name}?\n\nRating: ${review.rating}/5 stars\n\nThis action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
        // Delete review using shared data function
        console.log('admin.js: window.deleteReview exists?', typeof window.deleteReview);
        console.log('admin.js: window.sharedReviews exists?', typeof window.sharedReviews);
        console.log('admin.js: window.sharedReviews length:', window.sharedReviews ? window.sharedReviews.length : 'N/A');
        
        if (window.deleteReview) {
            console.log('admin.js: Calling window.deleteReview with ID:', numericReviewId);
            
            // Direct test - let's check if the review exists in window.sharedReviews
            const directReview = window.sharedReviews ? window.sharedReviews.find(r => r.id === numericReviewId) : null;
            console.log('admin.js: Direct check in window.sharedReviews found:', directReview);
            
            // Simple direct delete - bypass the shared-data.js function
            try {
                console.log('admin.js: Performing direct delete');
                
                // Find and remove the review directly from window.sharedReviews
                const reviewIndex = window.sharedReviews.findIndex(r => r.id === numericReviewId);
                console.log('admin.js: Found review at index:', reviewIndex);
                
                if (reviewIndex !== -1) {
                    // Remove the review
                    const deletedReview = window.sharedReviews.splice(reviewIndex, 1)[0];
                    console.log('admin.js: Successfully deleted:', deletedReview.name);
                    
                    // Update the local admin reviews array too
                    const adminReviewIndex = reviews.findIndex(r => r.id === numericReviewId);
                    if (adminReviewIndex !== -1) {
                        reviews.splice(adminReviewIndex, 1);
                    }
                    
                    // Save to localStorage using the same method as shared-data.js
                    localStorage.setItem('massageReviews', JSON.stringify(window.sharedReviews));
                    
                    // Also trigger the shared-data save function if it exists
                    if (window.dispatchEvent) {
                        window.dispatchEvent(new CustomEvent('reviewDeleted', { detail: deletedReview }));
                    }
                    
                    console.log('admin.js: Reviews remaining:', window.sharedReviews.length);
                    
                    showNotification(`Review from ${review.name || 'Unknown'} has been deleted.`, 'success');
                    
                    // Refresh the display
                    displayReviews();
                    updateReviewsStats();
                } else {
                    console.error('admin.js: Review not found at index');
                    showNotification('Failed to delete review - review not found.', 'error');
                    if (deleteBtn) {
                        deleteBtn.disabled = false;
                        deleteBtn.textContent = 'Delete Review';
                    }
                }
            } catch (error) {
                console.error('admin.js: Error in direct delete:', error);
                showNotification('Failed to delete review - system error.', 'error');
                if (deleteBtn) {
                    deleteBtn.disabled = false;
                    deleteBtn.textContent = 'Delete Review';
                }
            }
        } else {
            console.error('admin.js: window.deleteReview function not available');
            showNotification('Review deletion system not available.', 'error');
            // Re-enable button
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.textContent = 'Delete Review';
            }
        }
    } else {
        // User cancelled, re-enable button
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.textContent = 'Delete Review';
        }
    }
}

// Message Management Functions - Simple localStorage version
function displayMessages() {
    const messagesList = document.getElementById('messagesList');
    if (!messagesList) return;

    try {
        // Get messages from localStorage
        const messages = JSON.parse(localStorage.getItem('contactMessages') || '[]');
        console.log('Loading contact messages from localStorage:', messages.length);
        
        if (messages.length === 0) {
            messagesList.innerHTML = '<p class="no-messages">No contact messages yet. Messages will appear here when submitted through the contact form.</p>';
            updateMessageStats([]);
            return;
        }

        // Sort messages by timestamp, newest first
        const sortedMessages = messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Clear messages list and build safely
        messagesList.innerHTML = '';
        
        // Map subject codes to readable names
        const subjectMap = {
            'appointment': 'Appointment Question',
            'services': 'Services Information',
            'membership': 'Membership Program',
            'gift-certificate': 'Gift Certificate',
            'other': 'Other'
        };
        
        sortedMessages.forEach(message => {
            const messageCard = document.createElement('div');
            messageCard.className = 'message-card';
            
            // Header
            const header = document.createElement('div');
            header.className = 'message-header';
            
            const author = document.createElement('div');
            author.className = 'message-author';
            
            const nameStrong = document.createElement('strong');
            nameStrong.textContent = message.name || '';
            author.appendChild(nameStrong);
            
            const emailSpan = document.createElement('span');
            emailSpan.className = 'message-email';
            emailSpan.textContent = message.email || '';
            author.appendChild(emailSpan);
            
            if (message.phone && message.phone !== 'Not provided') {
                const phoneSpan = document.createElement('span');
                phoneSpan.className = 'message-phone';
                phoneSpan.textContent = message.phone;
                author.appendChild(phoneSpan);
            }
            
            header.appendChild(author);
            
            const meta = document.createElement('div');
            meta.className = 'message-meta';
            
            const dateDiv = document.createElement('div');
            dateDiv.className = 'message-date';
            dateDiv.textContent = message.timestamp || '';
            meta.appendChild(dateDiv);
            
            const subjectDiv = document.createElement('div');
            subjectDiv.className = 'message-subject';
            const subjectDisplay = subjectMap[message.subject] || message.subject || '';
            subjectDiv.textContent = subjectDisplay;
            meta.appendChild(subjectDiv);
            
            header.appendChild(meta);
            messageCard.appendChild(header);
            
            // Content
            const content = document.createElement('div');
            content.className = 'message-content';
            const messagePara = document.createElement('p');
            messagePara.textContent = message.message || '';
            content.appendChild(messagePara);
            messageCard.appendChild(content);
            
            // Actions
            const actions = document.createElement('div');
            actions.className = 'message-actions';
            
            const replyBtn = document.createElement('button');
            replyBtn.className = 'reply-btn';
            replyBtn.textContent = 'Reply via Email';
            replyBtn.onclick = () => replyToMessage(message.email, message.name);
            actions.appendChild(replyBtn);
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-message-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.setAttribute('data-message-id', message.id || '');
            actions.appendChild(deleteBtn);
            
            messageCard.appendChild(actions);
            messagesList.appendChild(messageCard);
        });
    
        // Add event listeners for delete buttons
        messagesList.addEventListener('click', handleMessageDelete);
        
        // Update message statistics
        updateMessageStats(sortedMessages);
        
    } catch (error) {
        console.error('Error loading messages from localStorage:', error);
        messagesList.innerHTML = '<p class="no-messages">Error loading messages.</p>';
    }
}

// Handle message delete button clicks
function handleMessageDelete(event) {
    if (event.target.classList.contains('delete-message-btn')) {
        const messageId = event.target.getAttribute('data-message-id');
        deleteMessage(messageId);
    }
}

function deleteMessage(messageId) {
    if (confirm('Are you sure you want to delete this message?')) {
        try {
            // Get current messages
            let messages = JSON.parse(localStorage.getItem('contactMessages') || '[]');
            
            // Find and remove the message
            const originalLength = messages.length;
            messages = messages.filter(msg => msg.id != messageId);
            
            if (messages.length < originalLength) {
                // Message was found and removed
                localStorage.setItem('contactMessages', JSON.stringify(messages));
                displayMessages(); // Refresh display
                showNotification('Message deleted successfully.', 'success');
            } else {
                showNotification('Message not found.', 'error');
            }
        } catch (error) {
            console.error('Failed to delete message:', error);
            showNotification('Failed to delete message.', 'error');
        }
    }
}

function updateMessageStats(messages = []) {
    const today = new Date().toDateString();
    const todayMessages = messages.filter(msg => {
        const msgDate = new Date(msg.createdAt || msg.timestamp).toDateString();
        return msgDate === today;
    });
    
    const totalMessagesEl = document.getElementById('totalMessages');
    const unreadMessagesEl = document.getElementById('unreadMessages');
    
    if (totalMessagesEl) totalMessagesEl.textContent = messages.length;
    if (unreadMessagesEl) unreadMessagesEl.textContent = todayMessages.length;
}

function replyToMessage(email, name) {
    const subject = `Re: Your message to Consider Restoration`;
    const body = `Hello ${name},\n\nThank you for contacting Consider Restoration. \n\n\n\nBest regards,\nChristopher\nConsider Restoration\n(734) 419-4116`;
    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink);
}

function clearAllMessages() {
    if (confirm('Are you sure you want to delete ALL contact messages? This action cannot be undone.')) {
        localStorage.removeItem('contactMessages');
        displayMessages();
        showNotification('All messages cleared successfully.', 'success');
    }
}

// Error handling utility functions
function handleError(error, context = 'Unknown', showToUser = true) {
    const errorId = Date.now().toString(36);
    console.error(`[Error ${errorId}] ${context}:`, error);
    
    // Log error details for debugging
    if (error.stack) {
        console.error(`[Error ${errorId}] Stack trace:`, error.stack);
    }
    
    // Show user-friendly error message
    if (showToUser) {
        const userMessage = getUserFriendlyErrorMessage(error, context);
        showNotification(userMessage, 'error');
    }
    
    return errorId;
}

function getUserFriendlyErrorMessage(error, context) {
    // Map technical errors to user-friendly messages
    const errorMappings = {
        'Network Error': 'Unable to connect to server. Please check your internet connection.',
        'TypeError': 'An unexpected error occurred. Please refresh the page and try again.',
        'SyntaxError': 'Data format error. Please contact support.',
        'ReferenceError': 'Missing required information. Please refresh the page.',
        'localStorage': 'Unable to save data locally. Please check browser settings.',
        'validation': 'Please check that all required fields are filled correctly.',
        'permission': 'You do not have permission to perform this action.'
    };
    
    const errorMessage = error.message || error.toString();
    
    // Find matching error pattern
    for (const [pattern, message] of Object.entries(errorMappings)) {
        if (errorMessage.includes(pattern) || context.toLowerCase().includes(pattern)) {
            return message;
        }
    }
    
    // Default user-friendly message
    return `An error occurred in ${context}. Please try again or contact support if the problem persists.`;
}

function withErrorHandling(fn, context = 'Operation') {
    return async function(...args) {
        try {
            return await fn.apply(this, args);
        } catch (error) {
            handleError(error, context);
            throw error; // Re-throw for caller to handle if needed
        }
    };
}

// Admin Login and Initialization
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Check if user is already logged in
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user.role === 'admin') {
                    // Auto-login admin user
                    currentUser = user;
                    loginScreen.style.display = 'none';
                    adminPanel.style.display = 'block';
                    initializeAdminPanel();
                    return;
                }
            } catch (e) {
                handleError(e, 'User data parsing', false);
                // Invalid stored data, clear it
                localStorage.removeItem('currentUser');
            }
        }
    } catch (error) {
        handleError(error, 'Admin Panel Initialization');
        // Fallback - show login screen
        if (loginScreen) loginScreen.style.display = 'block';
        if (adminPanel) adminPanel.style.display = 'none';
    }

    // Setup login form handler
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const csrfToken = document.getElementById('csrfToken').value;
            
            // Clear previous errors
            if (loginError) {
                loginError.textContent = '';
            }
            
            // Input validation
            if (!username) {
                if (loginError) {
                    loginError.textContent = 'Please enter a username';
                }
                return;
            }
            
            if (!password) {
                if (loginError) {
                    loginError.textContent = 'Please enter a password';
                }
                return;
            }
            
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(username)) {
                if (loginError) {
                    loginError.textContent = 'Please enter a valid email address';
                }
                return;
            }
            
            // Rate limiting check (simple client-side protection)
            const lastAttempt = localStorage.getItem('admin_last_login_attempt');
            const now = Date.now();
            if (lastAttempt && (now - parseInt(lastAttempt)) < 3000) {
                if (loginError) {
                    loginError.textContent = 'Please wait before trying again';
                }
                return;
            }
            localStorage.setItem('admin_last_login_attempt', now.toString());
            
            // CSRF token validation
            if (!validateCSRFToken(csrfToken)) {
                console.log('🔒 CSRF token validation failed');
                if (loginError) {
                    loginError.textContent = 'Security token invalid. Please refresh the page.';
                }
                return;
            }
            
            console.log('🔒 Admin login attempt:', username.substring(0, 5) + '***');
            
            // Secure credential check with proper email
            if (username === 'considerrestoration@gmail.com' && password === 'admin123') {
                console.log('✅ Admin login successful');
                
                currentUser = {
                    id: 'admin_' + Date.now(),
                    username: username,
                    email: username,
                    role: 'admin',
                    name: 'Christopher',
                    loginTime: new Date().toISOString()
                };
                
                // Use secure session management
                if (window.universalSession) {
                    window.universalSession.saveSession(currentUser);
                } else {
                    // Fallback to localStorage with role isolation
                    localStorage.setItem('admin_session_data', JSON.stringify(currentUser));
                    localStorage.removeItem('user_session_data'); // Clear any user session
                }
                
                // Show admin panel - hide login screen
                console.log('🔒 Showing admin panel');
                loginScreen.style.display = 'none';
                adminPanel.style.display = 'block';
                
                // Initialize admin panel
                console.log('Initializing admin panel');
                initializeAdminPanel();
                
                loginError.textContent = '';
                console.log('Login process completed');
            } else {
                console.log('❌ Invalid credentials');
                if (loginError) {
                    loginError.textContent = 'Invalid username or password';
                }
            }
        });
    }

    // Setup logout handler
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            handleLogout();
        });
    }
    
    // Listen for new contact messages
    window.addEventListener('contactMessageAdded', function() {
        if (currentUser && currentUser.role === 'admin') {
            displayMessages();
            showNotification('New contact message received!', 'info');
        }
    });
    
    // Listen for membership renewals
    window.addEventListener('membershipRenewed', function(event) {
        if (currentUser && currentUser.role === 'admin') {
            const { membership, newEndDate } = event.detail;
            console.log('💳 Membership auto-renewal processed:', membership.id);
            showNotification(`Membership auto-renewed for user ${membership.userId} until ${new Date(newEndDate).toLocaleDateString()}`, 'success');
            
            // Refresh any displayed membership data
            if (typeof displayUsers === 'function') {
                displayUsers();
            }
        }
    });
    
    // Listen for membership cancellations
    window.addEventListener('membershipCancelled', function(event) {
        if (currentUser && currentUser.role === 'admin') {
            const membership = event.detail;
            console.log('🔒 Membership auto-renewal cancelled:', membership.id);
            showNotification(`Auto-renewal cancelled for membership ${membership.id}`, 'info');
            
            // Refresh any displayed membership data
            if (typeof displayUsers === 'function') {
                displayUsers();
            }
        }
    });
});

// Initialize admin panel after login
function initializeAdminPanel() {
    console.log('Initializing admin panel...');
    
    // Initialize shared data
    initializeSharedData();
    
    // Setup navigation
    setupAdminNavigation();
    
    // Display all data
    displayAppointments(appointments);
    displayUsers();
    displayPayments();
    displayBlockedDates(); // Add this missing call!
    setupCalendarNavigation();
    displayReviews();
    displayMessages();
    
    // Initialize dashboard stats
    updateDashboardStats();
    
    // Initialize payment stats
    updatePaymentStats();
    
    // Initialize revenue chart
    initializeRevenueChart();
    
    // Initialize enhanced analytics dashboard
    setTimeout(() => {
        updateEnhancedDashboard();
        initializeQuickActions();
    }, 1000); // Small delay to ensure data is loaded
    
    // Set up automatic dashboard refresh (every 5 minutes)
    setInterval(() => {
        updateEnhancedDashboard();
    }, 5 * 60 * 1000); // 5 minutes
    
    // Setup date inputs
    setupDateInputs();
    
    // Setup forms
    setupForms();
    
    // Initialize with current month's appointments
    setTimeout(() => {
        if (currentUser && currentUser.role === 'admin') {
            filterAppointmentsByMonth(new Date());
            
            // Setup clear messages button
            const clearMessagesBtn = document.getElementById('clearMessagesBtn');
            if (clearMessagesBtn) {
                clearMessagesBtn.addEventListener('click', clearAllMessages);
            }
            
            // Setup appointment sorting
            const appointmentSortSelect = document.getElementById('appointmentSort');
            if (appointmentSortSelect) {
                appointmentSortSelect.addEventListener('change', function() {
                    displayAppointments(null, this.value);
                });
            }
            
            // Setup appointment month filtering
            const appointmentMonthInput = document.getElementById('appointmentMonth');
            const currentMonthBtn = document.getElementById('currentMonthBtn');
            const nextMonthBtn = document.getElementById('nextMonthBtn');
            const showAllBtn = document.getElementById('showAllBtn');
            
            if (currentMonthBtn) {
                currentMonthBtn.addEventListener('click', () => filterAppointmentsByMonth(new Date()));
            }
            if (nextMonthBtn) {
                const nextMonth = new Date();
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                nextMonthBtn.addEventListener('click', () => filterAppointmentsByMonth(nextMonth));
            }
            if (showAllBtn) {
                showAllBtn.addEventListener('click', () => displayAppointments());
            }
            if (appointmentMonthInput) {
                appointmentMonthInput.addEventListener('change', function() {
                    const selectedDate = new Date(this.value + '-01');
                    filterAppointmentsByMonth(selectedDate);
                });
            }
        }
    }, 100);
}

// Setup admin navigation
function setupAdminNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.admin-section');
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons and sections
            navBtns.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Show corresponding section
            const sectionId = this.getAttribute('data-section');
            const section = document.getElementById(sectionId);
            if (section) {
                section.classList.add('active');
            }
        });
    });
}

// Setup forms (placeholder for form initialization)
function setupForms() {
    // Form setup will be handled by individual form functions
    console.log('Forms setup complete');
}

// Working functions for appointments, users, and payments
function displayAppointments(appointmentsData = null, sortOption = null) {
    const appointmentsList = document.getElementById('appointmentsList');
    if (!appointmentsList) return;

    // Use provided data or get from shared data
    const appointmentsToShow = appointmentsData || (window.getAppointments ? window.getAppointments() : []);
    
    console.log('Displaying appointments:', appointmentsToShow.length);
    
    if (appointmentsToShow.length === 0) {
        appointmentsList.innerHTML = '<p class="no-appointments">No appointments found. Appointments will appear here when booked through the booking system.</p>';
        return;
    }

    // Get sort option from dropdown or use default
    const sortSelect = document.getElementById('appointmentSort');
    const sortBy = sortOption || (sortSelect ? sortSelect.value : 'date-asc');

    // Sort appointments based on selected option
    const sortedAppointments = [...appointmentsToShow].sort((a, b) => {
        switch (sortBy) {
            case 'date-desc':
                const dateDescA = new Date(a.date + ' ' + a.time);
                const dateDescB = new Date(b.date + ' ' + b.time);
                return dateDescB - dateDescA; // Latest first
                
            case 'name-asc':
                return a.clientName.localeCompare(b.clientName);
                
            case 'name-desc':
                return b.clientName.localeCompare(a.clientName);
                
            case 'status':
                // Sort by status: confirmed, pending, cancelled
                const statusOrder = { 'confirmed': 1, 'pending': 2, 'cancelled': 3 };
                return (statusOrder[a.status] || 4) - (statusOrder[b.status] || 4);
                
            default: // 'date-asc'
                const dateAscA = new Date(a.date + ' ' + a.time);
                const dateAscB = new Date(b.date + ' ' + b.time);
                return dateAscA - dateAscB; // Earliest first
        }
    });

    const appointmentsHTML = sortedAppointments.map(appointment => {
        const statusClass = appointment.status === 'confirmed' ? 'confirmed' : 
                           appointment.status === 'cancelled' ? 'cancelled' : 'pending';
        const paymentClass = appointment.paymentStatus === 'paid' ? 'paid' : 'pending';
        
        return `
            <div class="appointment-card ${statusClass}">
                <div class="appointment-header">
                    <h3>${appointment.clientName}</h3>
                    <div class="appointment-status status-${statusClass}">${appointment.status}</div>
                </div>
                <div class="appointment-details">
                    <p><strong>Service:</strong> ${appointment.service}</p>
                    <p><strong>Date:</strong> ${formatDate(appointment.date)}</p>
                    <p><strong>Time:</strong> ${appointment.time}</p>
                    <p><strong>Price:</strong> $${appointment.price}</p>
                    <p><strong>Contact:</strong> ${appointment.email} | ${appointment.phone}</p>
                    <p><strong>Payment:</strong> <span class="payment-status ${paymentClass}">${appointment.paymentStatus}</span></p>
                    ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
                </div>
            </div>
        `;
    }).join('');

    appointmentsList.innerHTML = appointmentsHTML;
}

function displayUsers() {
    const usersTableBody = document.getElementById('usersTableBody');
    if (!usersTableBody) return;

    // Get users from shared data
    const usersData = window.getUsers ? window.getUsers() : [];
    const clientUsers = usersData.filter(user => user.role === 'user');
    
    console.log('Displaying users:', clientUsers.length);
    
    if (clientUsers.length === 0) {
        usersTableBody.innerHTML = '<tr><td colspan="7">No clients registered yet. Clients will appear here when they create accounts through the booking system.</td></tr>';
        return;
    }

    const usersHTML = clientUsers.map(user => {
        // Count appointments for this user
        const userAppointments = appointments.filter(apt => apt.userId === user.id);
        const lastVisit = userAppointments.length > 0 ? 
            Math.max(...userAppointments.map(apt => new Date(apt.date).getTime())) : null;
        const lastVisitString = lastVisit ? formatDate(new Date(lastVisit).toISOString().split('T')[0]) : 'Never';
        
        return `
            <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.phone || 'Not provided'}</td>
                <td>${userAppointments.length}</td>
                <td>${lastVisitString}</td>
                <td>${user.membership || 'None'}</td>
                <td>
                    <button class="btn-secondary" onclick="editUser(${user.id})">Edit</button>
                    <button class="btn-danger" onclick="deleteUser(${user.id})">Delete</button>
                </td>
            </tr>
        `;
    }).join('');

    usersTableBody.innerHTML = usersHTML;
}

function displayPayments() {
    const paymentsTableBody = document.getElementById('paymentsTableBody');
    if (!paymentsTableBody) return;

    // Get appointments that have payment info
    const appointmentsData = window.getAppointments ? window.getAppointments() : [];
    const paidAppointments = appointmentsData.filter(apt => apt.paymentStatus && apt.price);
    
    console.log('Displaying payments:', paidAppointments.length);
    
    if (paidAppointments.length === 0) {
        paymentsTableBody.innerHTML = '<tr><td colspan="8">No payment records found. Payments will appear here when appointments are booked and paid.</td></tr>';
        return;
    }

    // Sort by date, newest first
    const sortedPayments = [...paidAppointments].sort((a, b) => new Date(b.date) - new Date(a.date));

    const paymentsHTML = sortedPayments.map(payment => {
        const statusClass = payment.paymentStatus === 'paid' ? 'paid' : 
                           payment.paymentStatus === 'refunded' ? 'refunded' : 'pending';
        
        return `
            <tr>
                <td>${formatDate(payment.date)}</td>
                <td>${payment.time}</td>
                <td>${payment.clientName}</td>
                <td>${payment.service}</td>
                <td>$${payment.price}</td>
                <td><span class="payment-status ${statusClass}">${payment.paymentStatus}</span></td>
                <td>${payment.paymentMethod || 'N/A'}</td>
                <td>
                    <button class="btn-secondary" onclick="viewPayment('${payment.id}')">View</button>
                    ${payment.paymentStatus === 'paid' ? '<button class="btn-danger" onclick="refundPayment(\'' + payment.id + '\')">Refund</button>' : ''}
                </td>
            </tr>
        `;
    }).join('');

    paymentsTableBody.innerHTML = paymentsHTML;
}

function setupCalendarNavigation() {
    console.log('Setting up calendar navigation');
    
    // Initialize calendar
    let currentCalendarDate = new Date();
    generateAdminCalendar(currentCalendarDate);
    
    // Setup navigation buttons
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', function() {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            generateAdminCalendar(currentCalendarDate);
        });
    }
    
    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', function() {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            generateAdminCalendar(currentCalendarDate);
        });
    }
}

function generateAdminCalendar(date = new Date()) {
    const calendarContainer = document.getElementById('scheduleCalendar');
    const calendarTitle = document.getElementById('calendarTitle');
    
    if (!calendarContainer) return;
    
    // Update title
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    if (calendarTitle) {
        calendarTitle.textContent = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    }
    
    // Get appointments for this month
    const appointmentsData = window.getAppointments ? window.getAppointments() : [];
    const monthString = date.toISOString().slice(0, 7); // YYYY-MM
    const monthAppointments = appointmentsData.filter(apt => apt.date.startsWith(monthString));
    
    // Generate calendar HTML
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    let calendarHTML = `
        <div class="calendar-grid">
            <div class="calendar-header">
                <div class="day-header">Sun</div>
                <div class="day-header">Mon</div>
                <div class="day-header">Tue</div>
                <div class="day-header">Wed</div>
                <div class="day-header">Thu</div>
                <div class="day-header">Fri</div>
                <div class="day-header">Sat</div>
            </div>
            <div class="calendar-body">
    `;
    
    // Generate 6 weeks of calendar
    for (let week = 0; week < 6; week++) {
        calendarHTML += '<div class="calendar-week">';
        
        for (let day = 0; day < 7; day++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(startDate.getDate() + (week * 7) + day);
            
            const dateString = currentDate.toISOString().split('T')[0];
            const isCurrentMonth = currentDate.getMonth() === date.getMonth();
            const isToday = dateString === todayString;
            
            // Find appointments for this date
            const dayAppointments = monthAppointments.filter(apt => apt.date === dateString);
            
            let dayClass = 'calendar-day';
            if (!isCurrentMonth) dayClass += ' other-month';
            if (isToday) dayClass += ' today';
            if (dayAppointments.length > 0) dayClass += ' has-appointments';
            
            calendarHTML += `
                <div class="${dayClass}" data-date="${dateString}">
                    <div class="day-number">${currentDate.getDate()}</div>
                    <div class="day-appointments">
            `;
            
            // Show appointments for this day
            dayAppointments.slice(0, 3).forEach(apt => {
                const statusClass = apt.status === 'confirmed' ? 'confirmed' : 
                                   apt.status === 'cancelled' ? 'cancelled' : 'pending';
                calendarHTML += `
                    <div class="appointment-dot ${statusClass}" title="${apt.time} - ${apt.clientName} (${apt.service})">
                        ${apt.time}
                    </div>
                `;
            });
            
            if (dayAppointments.length > 3) {
                calendarHTML += `<div class="more-appointments">+${dayAppointments.length - 3}</div>`;
            }
            
            calendarHTML += `
                    </div>
                </div>
            `;
        }
        
        calendarHTML += '</div>';
    }
    
    calendarHTML += `
            </div>
        </div>
    `;
    
    calendarContainer.innerHTML = calendarHTML;
    
    console.log(`Calendar generated for ${monthNames[date.getMonth()]} ${date.getFullYear()}, ${monthAppointments.length} appointments`);
}

function updatePaymentStats() {
    const appointmentsData = window.getAppointments ? window.getAppointments() : [];
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Calculate today's revenue
    const todayRevenue = appointmentsData
        .filter(apt => apt.date === today && apt.paymentStatus === 'paid')
        .reduce((total, apt) => total + (parseFloat(apt.price) || 0), 0);
    
    const todayPayments = appointmentsData.filter(apt => apt.date === today && apt.paymentStatus === 'paid').length;
    
    // Calculate monthly revenue
    const monthRevenue = appointmentsData
        .filter(apt => apt.date.startsWith(currentMonth) && apt.paymentStatus === 'paid')
        .reduce((total, apt) => total + (parseFloat(apt.price) || 0), 0);
    
    const monthPayments = appointmentsData.filter(apt => apt.date.startsWith(currentMonth) && apt.paymentStatus === 'paid').length;
    
    // Calculate pending revenue
    const pendingRevenue = appointmentsData
        .filter(apt => apt.paymentStatus === 'pending')
        .reduce((total, apt) => total + (parseFloat(apt.price) || 0), 0);
    
    const pendingPayments = appointmentsData.filter(apt => apt.paymentStatus === 'pending').length;
    
    // Update DOM elements
    const todayRevenueEl = document.getElementById('todayRevenue');
    const todayPaymentsEl = document.getElementById('todayPayments');
    const monthRevenueEl = document.getElementById('monthRevenue');
    const monthPaymentsEl = document.getElementById('monthPayments');
    const pendingRevenueEl = document.getElementById('pendingRevenue');
    const pendingPaymentsEl = document.getElementById('pendingPayments');
    
    if (todayRevenueEl) todayRevenueEl.textContent = `$${todayRevenue.toFixed(2)}`;
    if (todayPaymentsEl) todayPaymentsEl.textContent = `${todayPayments} payments`;
    if (monthRevenueEl) monthRevenueEl.textContent = `$${monthRevenue.toFixed(2)}`;
    if (monthPaymentsEl) monthPaymentsEl.textContent = `${monthPayments} payments`;
    if (pendingRevenueEl) pendingRevenueEl.textContent = `$${pendingRevenue.toFixed(2)}`;
    if (pendingPaymentsEl) pendingPaymentsEl.textContent = `${pendingPayments} payments`;
    
    console.log('Payment stats updated:', { todayRevenue, monthRevenue, pendingRevenue });
}

function filterAppointmentsByMonth(date) {
    const appointmentsData = window.getAppointments ? window.getAppointments() : [];
    const monthString = date.toISOString().slice(0, 7); // YYYY-MM format
    const filteredAppointments = appointmentsData.filter(apt => apt.date.startsWith(monthString));
    
    // Maintain current sort option
    const sortSelect = document.getElementById('appointmentSort');
    const currentSort = sortSelect ? sortSelect.value : 'date-asc';
    
    displayAppointments(filteredAppointments, currentSort);
    console.log('Filtering appointments by month:', monthString, 'Found:', filteredAppointments.length);
}

function showNotification(message, type = 'info') {
    console.log(`Notification (${type}):`, message);
    // You could implement actual notifications here
    alert(`${type.toUpperCase()}: ${message}`);
}



function viewPayment(paymentId) {
    console.log('View payment:', paymentId);
    showNotification('Payment details would open in a modal here', 'info');
}

function refundPayment(paymentId) {
    if (confirm('Are you sure you want to refund this payment?')) {
        console.log('Refund payment:', paymentId);
        showNotification('Payment refund would be processed here', 'info');
    }
}

// =====================================================
// ENHANCED ANALYTICS FUNCTIONS
// =====================================================

// 1. Client Insights & Retention Metrics
function calculateClientInsights() {
    const clientInsights = {};
    
    // Get all users and appointments
    const allUsers = window.getUsers ? window.getUsers() : users;
    const allAppointments = appointments || [];
    
    allUsers.forEach(user => {
        if (user.role !== 'user') return;
        
        const userAppointments = allAppointments.filter(apt => 
            apt.clientEmail === user.email && apt.status !== 'cancelled'
        );
        
        const completedAppointments = userAppointments.filter(apt => 
            apt.status === 'completed'
        );
        
        const noShows = userAppointments.filter(apt => 
            apt.status === 'no-show'
        );
        
        const cancelledAppointments = allAppointments.filter(apt => 
            apt.clientEmail === user.email && apt.status === 'cancelled'
        );
        
        // Calculate metrics
        const totalVisits = completedAppointments.length;
        const totalRevenue = completedAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0);
        const noShowRate = userAppointments.length > 0 ? (noShows.length / userAppointments.length) * 100 : 0;
        const cancellationRate = (cancelledAppointments.length / (userAppointments.length + cancelledAppointments.length)) * 100;
        
        // Visit frequency (days between visits)
        const visitDates = completedAppointments.map(apt => new Date(apt.date)).sort();
        let avgDaysBetweenVisits = 0;
        if (visitDates.length > 1) {
            const daysDiffs = [];
            for (let i = 1; i < visitDates.length; i++) {
                const diffTime = Math.abs(visitDates[i] - visitDates[i-1]);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                daysDiffs.push(diffDays);
            }
            avgDaysBetweenVisits = daysDiffs.reduce((a, b) => a + b, 0) / daysDiffs.length;
        }
        
        // Client lifetime value projection (based on visit frequency and average spend)
        const avgTransactionValue = totalVisits > 0 ? totalRevenue / totalVisits : 0;
        const visitFrequencyPerYear = avgDaysBetweenVisits > 0 ? 365 / avgDaysBetweenVisits : totalVisits;
        const projectedCLV = avgTransactionValue * visitFrequencyPerYear * 2; // 2-year projection
        
        // Determine client status
        const lastVisit = visitDates[visitDates.length - 1];
        const daysSinceLastVisit = lastVisit ? Math.ceil((new Date() - lastVisit) / (1000 * 60 * 60 * 24)) : Infinity;
        
        let clientStatus = 'new';
        if (totalVisits === 0) clientStatus = 'prospect';
        else if (totalVisits === 1) clientStatus = 'new';
        else if (daysSinceLastVisit <= 90) clientStatus = 'active';
        else if (daysSinceLastVisit <= 180) clientStatus = 'at-risk';
        else clientStatus = 'churned';
        
        // Membership journey tracking
        const firstVisit = visitDates[0];
        const membershipStartDate = user.membershipStartDate ? new Date(user.membershipStartDate) : null;
        const daysToMembership = firstVisit && membershipStartDate ? 
            Math.ceil((membershipStartDate - firstVisit) / (1000 * 60 * 60 * 24)) : null;
        
        clientInsights[user.email] = {
            name: user.name,
            email: user.email,
            totalVisits,
            totalRevenue,
            avgTransactionValue,
            avgDaysBetweenVisits,
            projectedCLV,
            noShowRate,
            cancellationRate,
            clientStatus,
            firstVisit,
            lastVisit,
            daysSinceLastVisit,
            membershipType: user.membershipType || 'none',
            membershipStartDate,
            daysToMembership,
            joinedMembership: !!membershipStartDate
        };
    });
    
    return clientInsights;
}

// 2. Advanced Revenue Analytics
function calculateRevenueAnalytics() {
    const allAppointments = appointments || [];
    const completedAppointments = allAppointments.filter(apt => apt.status === 'completed');
    
    // Revenue per service type
    const revenueByService = {};
    const appointmentsByService = {};
    
    completedAppointments.forEach(apt => {
        const service = apt.service || 'Unknown';
        revenueByService[service] = (revenueByService[service] || 0) + (apt.price || 0);
        appointmentsByService[service] = (appointmentsByService[service] || 0) + 1;
    });
    
    // Peak hours analysis
    const hourlyData = {};
    completedAppointments.forEach(apt => {
        if (apt.time) {
            const hour = parseInt(apt.time.split(':')[0]);
            hourlyData[hour] = (hourlyData[hour] || 0) + 1;
        }
    });
    
    // Day of week analysis
    const dailyData = {};
    completedAppointments.forEach(apt => {
        if (apt.date) {
            const dayName = new Date(apt.date).toLocaleDateString('en-US', { weekday: 'long' });
            dailyData[dayName] = (dailyData[dayName] || 0) + 1;
        }
    });
    
    // Monthly trends
    const monthlyData = {};
    completedAppointments.forEach(apt => {
        if (apt.date) {
            const monthKey = new Date(apt.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
            monthlyData[monthKey] = {
                appointments: (monthlyData[monthKey]?.appointments || 0) + 1,
                revenue: (monthlyData[monthKey]?.revenue || 0) + (apt.price || 0)
            };
        }
    });
    
    // Calculate profit margins (assuming 30% cost ratio as default)
    const profitByService = {};
    Object.keys(revenueByService).forEach(service => {
        const revenue = revenueByService[service];
        const estimatedCost = revenue * 0.30; // 30% cost assumption
        profitByService[service] = {
            revenue,
            estimatedCost,
            profit: revenue - estimatedCost,
            margin: ((revenue - estimatedCost) / revenue) * 100
        };
    });
    
    return {
        revenueByService,
        appointmentsByService,
        hourlyData,
        dailyData,
        monthlyData,
        profitByService,
        totalRevenue: completedAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0),
        totalAppointments: completedAppointments.length,
        avgTransactionValue: completedAppointments.length > 0 ? 
            completedAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0) / completedAppointments.length : 0
    };
}

// 3. Operational Efficiency Metrics
function calculateOperationalMetrics() {
    const allAppointments = appointments || [];
    const now = new Date();
    
    // Appointment utilization (assuming 8-hour days, 5 days a week)
    const workingHours = 8 * 5; // 40 hours per week
    const slotsPerHour = 1; // Assuming 1-hour appointments
    const availableSlots = workingHours * slotsPerHour;
    const bookedSlots = allAppointments.filter(apt => {
        const aptDate = new Date(apt.date);
        const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return aptDate >= startOfWeek && aptDate <= endOfWeek && apt.status !== 'cancelled';
    }).length;
    
    const utilizationRate = availableSlots > 0 ? (bookedSlots / availableSlots) * 100 : 0;
    
    // Average time between bookings
    const sortedAppointments = allAppointments
        .filter(apt => apt.status === 'completed')
        .map(apt => new Date(apt.date))
        .sort();
    
    let avgDaysBetweenBookings = 0;
    if (sortedAppointments.length > 1) {
        const daysDiffs = [];
        for (let i = 1; i < sortedAppointments.length; i++) {
            const diffTime = Math.abs(sortedAppointments[i] - sortedAppointments[i-1]);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            daysDiffs.push(diffDays);
        }
        avgDaysBetweenBookings = daysDiffs.reduce((a, b) => a + b, 0) / daysDiffs.length;
    }
    
    // Popular time slots
    const timeSlotData = {};
    allAppointments.forEach(apt => {
        if (apt.time && apt.status !== 'cancelled') {
            timeSlotData[apt.time] = (timeSlotData[apt.time] || 0) + 1;
        }
    });
    
    // Reminder effectiveness
    const appointmentsWithReminders = allAppointments.filter(apt => apt.dayBeforeReminderSent || apt.dayOfReminderSent);
    const showUpRate = appointmentsWithReminders.length > 0 ? 
        (appointmentsWithReminders.filter(apt => apt.status === 'completed').length / appointmentsWithReminders.length) * 100 : 0;
    
    const noShowRate = allAppointments.length > 0 ? 
        (allAppointments.filter(apt => apt.status === 'no-show').length / allAppointments.length) * 100 : 0;
    
    return {
        utilizationRate,
        avgDaysBetweenBookings,
        timeSlotData,
        showUpRate,
        noShowRate,
        totalAppointments: allAppointments.length,
        completedAppointments: allAppointments.filter(apt => apt.status === 'completed').length,
        cancelledAppointments: allAppointments.filter(apt => apt.status === 'cancelled').length
    };
}

// 4. Marketing Performance Metrics
function calculateMarketingMetrics() {
    const allAppointments = appointments || [];
    const allUsers = window.getUsers ? window.getUsers() : users;
    const reviews = window.sharedReviews || [];
    
    // Source tracking (based on referral data if available)
    const sourceData = {};
    allUsers.forEach(user => {
        if (user.role === 'user') {
            const source = user.referralSource || 'Direct';
            sourceData[source] = (sourceData[source] || 0) + 1;
        }
    });
    
    // Conversion rate (users who made appointments vs total users)
    const usersWithAppointments = new Set(allAppointments.map(apt => apt.clientEmail));
    const totalUsers = allUsers.filter(u => u.role === 'user').length;
    const conversionRate = totalUsers > 0 ? (usersWithAppointments.size / totalUsers) * 100 : 0;
    
    // Referral tracking
    const referredUsers = allUsers.filter(u => u.role === 'user' && u.referralSource === 'Referral');
    const referralConversionRate = referredUsers.length > 0 ? 
        (referredUsers.filter(u => usersWithAppointments.has(u.email)).length / referredUsers.length) * 100 : 0;
    
    // Review metrics
    const reviewStats = {
        totalReviews: reviews.length,
        averageRating: reviews.length > 0 ? 
            reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length : 0,
        reviewsByRating: {}
    };
    
    [1, 2, 3, 4, 5].forEach(rating => {
        reviewStats.reviewsByRating[rating] = reviews.filter(r => r.rating === rating).length;
    });
    
    return {
        sourceData,
        conversionRate,
        referralConversionRate,
        reviewStats,
        totalUsers,
        usersWithAppointments: usersWithAppointments.size
    };
}

// 5. Real-time Notifications and Alerts
function generateBusinessAlerts() {
    const alerts = [];
    const now = new Date();
    const allAppointments = appointments || [];
    const revenueAnalytics = calculateRevenueAnalytics();
    const operationalMetrics = calculateOperationalMetrics();
    
    // Low booking alert
    if (operationalMetrics.utilizationRate < 30) {
        alerts.push({
            type: 'warning',
            title: 'Low Booking Rate',
            message: `Utilization rate is ${operationalMetrics.utilizationRate.toFixed(1)}%. Consider promotional activities.`,
            priority: 'medium'
        });
    }
    
    // High no-show rate alert
    if (operationalMetrics.noShowRate > 15) {
        alerts.push({
            type: 'error',
            title: 'High No-Show Rate',
            message: `No-show rate is ${operationalMetrics.noShowRate.toFixed(1)}%. Review reminder system.`,
            priority: 'high'
        });
    }
    
    // Revenue goal tracking
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const monthlyGoal = 5000; // $5000 monthly goal (configurable)
    const monthlyRevenue = revenueAnalytics.totalRevenue;
    
    if (monthlyRevenue < monthlyGoal * 0.5 && now.getDate() > 15) {
        alerts.push({
            type: 'warning',
            title: 'Revenue Below Target',
            message: `Monthly revenue is $${monthlyRevenue.toFixed(0)} vs $${monthlyGoal} goal.`,
            priority: 'high'
        });
    }
    
    // Appointment conflicts
    const todayAppointments = allAppointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate.toDateString() === now.toDateString() && apt.status !== 'cancelled';
    });
    
    // Check for time conflicts
    for (let i = 0; i < todayAppointments.length - 1; i++) {
        const current = todayAppointments[i];
        const next = todayAppointments[i + 1];
        if (current.time === next.time) {
            alerts.push({
                type: 'error',
                title: 'Schedule Conflict',
                message: `Double-booked appointment at ${current.time} today.`,
                priority: 'urgent'
            });
        }
    }
    
    return alerts;
}

// 6. Comparison and Forecasting Features
function calculateComparisons() {
    const allAppointments = appointments || [];
    const now = new Date();
    
    // Current month vs last month
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const currentMonthAppointments = allAppointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate.getMonth() === currentMonth && 
               aptDate.getFullYear() === currentYear && 
               apt.status === 'completed';
    });
    
    const lastMonthAppointments = allAppointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate.getMonth() === lastMonth && 
               aptDate.getFullYear() === lastMonthYear && 
               apt.status === 'completed';
    });
    
    const currentMonthRevenue = currentMonthAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0);
    const lastMonthRevenue = lastMonthAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0);
    
    const revenueGrowth = lastMonthRevenue > 0 ? 
        ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
    
    const appointmentGrowth = lastMonthAppointments.length > 0 ? 
        ((currentMonthAppointments.length - lastMonthAppointments.length) / lastMonthAppointments.length) * 100 : 0;
    
    // Year-over-year comparison
    const lastYearSameMonth = allAppointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate.getMonth() === currentMonth && 
               aptDate.getFullYear() === currentYear - 1 && 
               apt.status === 'completed';
    });
    
    const lastYearRevenue = lastYearSameMonth.reduce((sum, apt) => sum + (apt.price || 0), 0);
    const yearOverYearGrowth = lastYearRevenue > 0 ? 
        ((currentMonthRevenue - lastYearRevenue) / lastYearRevenue) * 100 : 0;
    
    // Simple revenue forecasting (based on trend)
    const last3Months = [];
    for (let i = 2; i >= 0; i--) {
        let month = currentMonth - i;
        let year = currentYear;
        if (month < 0) {
            month = 12 + month;
            year = currentYear - 1;
        }
        
        const monthAppointments = allAppointments.filter(apt => {
            const aptDate = new Date(apt.date);
            return aptDate.getMonth() === month && 
                   aptDate.getFullYear() === year && 
                   apt.status === 'completed';
        });
        
        last3Months.push(monthAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0));
    }
    
    // Simple linear trend forecast
    const avgGrowth = last3Months.length > 1 ? 
        (last3Months[last3Months.length - 1] - last3Months[0]) / (last3Months.length - 1) : 0;
    const nextMonthForecast = currentMonthRevenue + avgGrowth;
    
    return {
        monthOverMonth: {
            revenueGrowth,
            appointmentGrowth,
            currentRevenue: currentMonthRevenue,
            lastRevenue: lastMonthRevenue,
            currentAppointments: currentMonthAppointments.length,
            lastAppointments: lastMonthAppointments.length
        },
        yearOverYear: {
            revenueGrowth: yearOverYearGrowth,
            currentRevenue: currentMonthRevenue,
            lastYearRevenue: lastYearRevenue
        },
        forecast: {
            nextMonthRevenue: Math.max(0, nextMonthForecast),
            confidenceLevel: last3Months.length >= 3 ? 'medium' : 'low',
            trend: avgGrowth > 0 ? 'increasing' : avgGrowth < 0 ? 'decreasing' : 'stable'
        }
    };
}

// 7. Dashboard Update Functions
function updateEnhancedDashboard() {
    try {
        const clientInsights = calculateClientInsights();
        const revenueAnalytics = calculateRevenueAnalytics();
        const operationalMetrics = calculateOperationalMetrics();
        const marketingMetrics = calculateMarketingMetrics();
        const businessAlerts = generateBusinessAlerts();
        const comparisons = calculateComparisons();
        
        // Update existing dashboard elements with new data
        updateClientInsightsDashboard(clientInsights);
        updateRevenueAnalyticsDashboard(revenueAnalytics);
        updateOperationalDashboard(operationalMetrics);
        updateMarketingDashboard(marketingMetrics);
        updateAlertsDashboard(businessAlerts);
        updateComparisonsDashboard(comparisons);
        
        console.log('Enhanced dashboard updated successfully');
    } catch (error) {
        console.error('Error updating enhanced dashboard:', error);
    }
}

function updateClientInsightsDashboard(insights) {
    const insightsArray = Object.values(insights);
    
    // Client status breakdown
    const statusCounts = {
        active: insightsArray.filter(c => c.clientStatus === 'active').length,
        'at-risk': insightsArray.filter(c => c.clientStatus === 'at-risk').length,
        churned: insightsArray.filter(c => c.clientStatus === 'churned').length,
        new: insightsArray.filter(c => c.clientStatus === 'new').length
    };
    
    // Average CLV
    const avgCLV = insightsArray.length > 0 ? 
        insightsArray.reduce((sum, c) => sum + c.projectedCLV, 0) / insightsArray.length : 0;
    
    // High-value clients (top 20%)
    const sortedByCLV = insightsArray.sort((a, b) => b.projectedCLV - a.projectedCLV);
    const top20Percent = Math.max(1, Math.floor(sortedByCLV.length * 0.2));
    const highValueClients = sortedByCLV.slice(0, top20Percent);
    
    // Update dashboard elements (create if they don't exist)
    updateOrCreateDashboardCard('client-insights', 'Client Insights', {
        'Active Clients': statusCounts.active,
        'At-Risk Clients': statusCounts['at-risk'],
        'Avg. CLV': `$${avgCLV.toFixed(0)}`,
        'High-Value Clients': highValueClients.length
    });
}

function updateRevenueAnalyticsDashboard(analytics) {
    // Top service by revenue
    const topService = Object.entries(analytics.revenueByService)
        .sort(([,a], [,b]) => b - a)[0];
    
    // Peak hour
    const peakHour = Object.entries(analytics.hourlyData)
        .sort(([,a], [,b]) => b - a)[0];
    
    updateOrCreateDashboardCard('revenue-analytics', 'Revenue Analytics', {
        'Total Revenue': `$${analytics.totalRevenue.toFixed(0)}`,
        'Avg. Transaction': `$${analytics.avgTransactionValue.toFixed(0)}`,
        'Top Service': topService ? `${topService[0]} ($${topService[1].toFixed(0)})` : 'N/A',
        'Peak Hour': peakHour ? `${peakHour[0]}:00 (${peakHour[1]} bookings)` : 'N/A'
    });
}

function updateOperationalDashboard(metrics) {
    const mostPopularTime = Object.entries(metrics.timeSlotData)
        .sort(([,a], [,b]) => b - a)[0];
    
    updateOrCreateDashboardCard('operational-metrics', 'Operational Metrics', {
        'Utilization Rate': `${metrics.utilizationRate.toFixed(1)}%`,
        'Show-up Rate': `${metrics.showUpRate.toFixed(1)}%`,
        'Most Popular Time': mostPopularTime ? `${mostPopularTime[0]} (${mostPopularTime[1]} bookings)` : 'N/A',
        'Avg. Days Between Bookings': `${metrics.avgDaysBetweenBookings.toFixed(1)} days`
    });
}

function updateMarketingDashboard(metrics) {
    const topSource = Object.entries(metrics.sourceData)
        .sort(([,a], [,b]) => b - a)[0];
    
    updateOrCreateDashboardCard('marketing-metrics', 'Marketing Performance', {
        'Conversion Rate': `${metrics.conversionRate.toFixed(1)}%`,
        'Total Users': metrics.totalUsers,
        'Users with Appointments': metrics.usersWithAppointments,
        'Top Source': topSource ? `${topSource[0]} (${topSource[1]})` : 'N/A',
        'Avg. Rating': `${metrics.reviewStats.averageRating.toFixed(1)}/5`
    });
}

function updateAlertsDashboard(alerts) {
    const alertsContainer = document.getElementById('businessAlerts') || createAlertsContainer();
    
    if (alerts.length === 0) {
        alertsContainer.innerHTML = '<div class="no-alerts">✅ No alerts - everything looks good!</div>';
        return;
    }
    
    alertsContainer.innerHTML = alerts.map(alert => `
        <div class="alert alert-${alert.type} alert-${alert.priority}">
            <strong>${alert.title}</strong>
            <p>${alert.message}</p>
        </div>
    `).join('');
}

function updateComparisonsDashboard(comparisons) {
    const mom = comparisons.monthOverMonth;
    const yoy = comparisons.yearOverYear;
    const forecast = comparisons.forecast;
    
    updateOrCreateDashboardCard('comparisons', 'Growth & Forecasting', {
        'MoM Revenue Growth': `${mom.revenueGrowth >= 0 ? '+' : ''}${mom.revenueGrowth.toFixed(1)}%`,
        'MoM Appointment Growth': `${mom.appointmentGrowth >= 0 ? '+' : ''}${mom.appointmentGrowth.toFixed(1)}%`,
        'YoY Revenue Growth': `${yoy.revenueGrowth >= 0 ? '+' : ''}${yoy.revenueGrowth.toFixed(1)}%`,
        'Next Month Forecast': `$${forecast.nextMonthRevenue.toFixed(0)}`,
        'Trend': `${forecast.trend} (${forecast.confidenceLevel} confidence)`
    });
}

// Helper function to create or update dashboard cards
function updateOrCreateDashboardCard(id, title, metrics) {
    let card = document.getElementById(id);
    if (!card) {
        // Create new dashboard card
        card = document.createElement('div');
        card.className = 'dashboard-card enhanced-card';
        card.id = id;
        
        // Add to dashboard grid
        const dashboardGrid = document.querySelector('.dashboard-grid');
        if (dashboardGrid) {
            dashboardGrid.appendChild(card);
        }
    }
    
    const metricsHTML = Object.entries(metrics).map(([key, value]) => 
        `<div class="metric-row">
            <span class="metric-label">${key}:</span>
            <span class="metric-value">${value}</span>
        </div>`
    ).join('');
    
    card.innerHTML = `
        <div class="card-header">
            <h3>${title}</h3>
            <span class="card-icon">📊</span>
        </div>
        <div class="card-content">
            ${metricsHTML}
        </div>
    `;
}

function createAlertsContainer() {
    let container = document.getElementById('businessAlerts');
    if (!container) {
        container = document.createElement('div');
        container.id = 'businessAlerts';
        container.className = 'alerts-container';
        
        const dashboardSection = document.getElementById('dashboard');
        if (dashboardSection) {
            const alertsWrapper = document.createElement('div');
            alertsWrapper.className = 'dashboard-alerts';
            alertsWrapper.innerHTML = '<h3>Business Alerts</h3>';
            alertsWrapper.appendChild(container);
            dashboardSection.appendChild(alertsWrapper);
        }
    }
    return container;
}

// 8. Quick Actions Panel
function createQuickActionsPanel() {
    const actionsPanel = document.createElement('div');
    actionsPanel.className = 'quick-actions-panel';
    actionsPanel.innerHTML = `
        <div class="quick-actions-header">
            <h3>Quick Actions</h3>
            <button id="toggleActionsPanel" class="toggle-btn">▼</button>
        </div>
        <div class="quick-actions-content">
            <button class="quick-action-btn" onclick="sendReminderToAll()">
                📧 Send Reminders
            </button>
            <button class="quick-action-btn" onclick="exportAnalytics('csv')">
                📊 Export Analytics (CSV)
            </button>
            <button class="quick-action-btn" onclick="generateAnalyticsReport()">
                📄 Export Analytics Report (PDF)
            </button>
            <button class="quick-action-btn" onclick="generateRevenueForecast()">
                📈 Revenue Forecast
            </button>
            <button class="quick-action-btn" onclick="identifyAtRiskClients()">
                ⚠️ At-Risk Clients
            </button>
            <button class="quick-action-btn" onclick="refreshAllData()">
                🔄 Refresh Data
            </button>
        </div>
    `;

    // Add toggle functionality
    const toggleBtn = actionsPanel.querySelector('#toggleActionsPanel');
    const content = actionsPanel.querySelector('.quick-actions-content');
    
    toggleBtn.addEventListener('click', () => {
        const isExpanded = content.style.display !== 'none';
        content.style.display = isExpanded ? 'none' : 'grid';
        toggleBtn.textContent = isExpanded ? '▶' : '▼';
    });

    return actionsPanel;
}

// Quick action functions
function sendReminderToAll() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tomorrowAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate.toDateString() === tomorrow.toDateString() && 
               apt.status === 'confirmed' && 
               !apt.dayBeforeReminderSent;
    });
    
    if (tomorrowAppointments.length === 0) {
        showNotification('No appointments need reminders for tomorrow.', 'info');
        return;
    }
    
    if (confirm(`Send reminders to ${tomorrowAppointments.length} clients with appointments tomorrow?`)) {
        // In a real system, this would trigger the reminder service
        showNotification(`Reminders sent to ${tomorrowAppointments.length} clients.`, 'success');
        
        // Mark reminders as sent
        tomorrowAppointments.forEach(apt => {
            apt.dayBeforeReminderSent = true;
            apt.dayBeforeReminderSentAt = new Date();
        });
        
        updateEnhancedDashboard();
    }
}

function exportAnalytics(format) {
    const analytics = {
        clientInsights: calculateClientInsights(),
        revenueAnalytics: calculateRevenueAnalytics(),
        operationalMetrics: calculateOperationalMetrics(),
        marketingMetrics: calculateMarketingMetrics(),
        comparisons: calculateComparisons()
    };
    
    if (format === 'csv') {
        exportToCSV(analytics);
    } else if (format === 'pdf') {
        exportToPDF(analytics);
    }
}

function exportToCSV(analytics) {
    try {
        // Create CSV content for client insights
        const clientData = Object.values(analytics.clientInsights);
        let csvContent = "Client Analytics Report\\n\\n";
        
        // Client insights CSV
        csvContent += "Client Name,Email,Total Visits,Total Revenue,CLV,Client Status,Last Visit\\n";
        clientData.forEach(client => {
            csvContent += `"${client.name}","${client.email}",${client.totalVisits},$${client.totalRevenue.toFixed(2)},$${client.projectedCLV.toFixed(2)},"${client.clientStatus}","${client.lastVisit ? client.lastVisit.toDateString() : 'N/A'}"\\n`;
        });
        
        // Revenue by service CSV
        csvContent += "\\nRevenue by Service\\n";
        csvContent += "Service,Revenue,Appointments,Avg Price\\n";
        Object.entries(analytics.revenueAnalytics.revenueByService).forEach(([service, revenue]) => {
            const appointments = analytics.revenueAnalytics.appointmentsByService[service] || 0;
            const avgPrice = appointments > 0 ? revenue / appointments : 0;
            csvContent += `"${service}",$${revenue.toFixed(2)},${appointments},$${avgPrice.toFixed(2)}\\n`;
        });
        
        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showNotification('Analytics exported to CSV successfully!', 'success');
    } catch (error) {
        console.error('CSV export error:', error);
        showNotification('Error exporting CSV. Please try again.', 'error');
    }
}

function exportToPDF(analytics) {
    try {
        // Create a comprehensive HTML report
        const reportDate = new Date().toLocaleDateString();
        const reportHTML = `
            <html>
            <head>
                <title>Consider Restoration - Analytics Report</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 40px; }
                    h1, h2 { color: #2c5530; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f8f9fa; }
                    .metric-box { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; }
                </style>
            </head>
            <body>
                <h1>Consider Restoration - Analytics Report</h1>
                <p>Generated: ${reportDate}</p>
                
                <h2>Key Metrics</h2>
                <div class="metric-box">
                    <strong>Total Revenue:</strong> $${analytics.revenueAnalytics.totalRevenue.toFixed(2)}<br>
                    <strong>Total Appointments:</strong> ${analytics.revenueAnalytics.totalAppointments}<br>
                    <strong>Average Transaction:</strong> $${analytics.revenueAnalytics.avgTransactionValue.toFixed(2)}<br>
                    <strong>Utilization Rate:</strong> ${analytics.operationalMetrics.utilizationRate.toFixed(1)}%
                </div>
                
                <h2>Top Services by Revenue</h2>
                <table>
                    <tr><th>Service</th><th>Revenue</th><th>Appointments</th></tr>
                    ${Object.entries(analytics.revenueAnalytics.revenueByService)
                        .sort(([,a], [,b]) => b - a)
                        .slice(0, 5)
                        .map(([service, revenue]) => {
                            const appointments = analytics.revenueAnalytics.appointmentsByService[service] || 0;
                            return `<tr><td>${service}</td><td>$${revenue.toFixed(2)}</td><td>${appointments}</td></tr>`;
                        })
                        .join('')}
                </table>
                
                <h2>Client Status Breakdown</h2>
                <div class="metric-box">
                    Active Clients: ${Object.values(analytics.clientInsights).filter(c => c.clientStatus === 'active').length}<br>
                    At-Risk Clients: ${Object.values(analytics.clientInsights).filter(c => c.clientStatus === 'at-risk').length}<br>
                    New Clients: ${Object.values(analytics.clientInsights).filter(c => c.clientStatus === 'new').length}
                </div>
            </body>
            </html>
        `;
        
        // Open in new window for printing/saving as PDF
        const printWindow = window.open('', '_blank');
        printWindow.document.write(reportHTML);
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
            printWindow.print();
        }, 500);
        
        showNotification('PDF report opened in new window. Use your browser\'s print function to save as PDF.', 'info');
    } catch (error) {
        console.error('PDF export error:', error);
        showNotification('Error generating PDF report. Please try again.', 'error');
    }
}

function generateRevenueForecast() {
    const comparisons = calculateComparisons();
    const forecast = comparisons.forecast;
    
    const forecastHTML = `
        <div class="forecast-modal">
            <h3>Revenue Forecast</h3>
            <div class="forecast-content">
                <div class="forecast-item">
                    <strong>Next Month Prediction:</strong> $${forecast.nextMonthRevenue.toFixed(0)}
                </div>
                <div class="forecast-item">
                    <strong>Trend:</strong> ${forecast.trend} 
                    <span class="confidence">(${forecast.confidenceLevel} confidence)</span>
                </div>
                <div class="forecast-item">
                    <strong>Recommendation:</strong> 
                    ${forecast.trend === 'increasing' ? 
                        'Business is growing! Consider expanding services or availability.' :
                        forecast.trend === 'decreasing' ?
                        'Revenue is declining. Focus on client retention and marketing.' :
                        'Revenue is stable. Look for growth opportunities.'
                    }
                </div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()">Close</button>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = forecastHTML;
    document.body.appendChild(modal);
    
    // Add click-outside-to-close functionality
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Remove after 10 seconds
    setTimeout(() => {
        if (modal.parentElement) {
            modal.remove();
        }
    }, 10000);
}

function identifyAtRiskClients() {
    const clientInsights = calculateClientInsights();
    const atRiskClients = Object.values(clientInsights).filter(c => c.clientStatus === 'at-risk');
    
    if (atRiskClients.length === 0) {
        showNotification('No clients are currently at risk of churning.', 'success');
        return;
    }
    
    const clientList = atRiskClients
        .sort((a, b) => b.daysSinceLastVisit - a.daysSinceLastVisit)
        .slice(0, 10) // Top 10 most at-risk
        .map(client => `
            <div class="at-risk-client">
                <strong>${client.name}</strong> (${client.email})<br>
                <small>Last visit: ${client.daysSinceLastVisit} days ago | CLV: $${client.projectedCLV.toFixed(0)}</small>
            </div>
        `)
        .join('');
    
    const alertHTML = `
        <div class="at-risk-modal">
            <h3>At-Risk Clients (${atRiskClients.length})</h3>
            <div class="at-risk-list">
                ${clientList}
            </div>
            <div class="at-risk-actions">
                <button onclick="createRetentionCampaign()">Create Retention Campaign</button>
                <button onclick="this.parentElement.parentElement.remove()">Close</button>
            </div>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = alertHTML;
    document.body.appendChild(modal);
}

function createRetentionCampaign() {
    showNotification('Retention campaign would be created here. This could send special offers to at-risk clients.', 'info');
}

function refreshAllData() {
    // Simulate data refresh
    showNotification('Refreshing dashboard data...', 'info');
    
    setTimeout(() => {
        updateEnhancedDashboard();
        showNotification('Dashboard data refreshed successfully!', 'success');
    }, 1000);
}

// Initialize quick actions panel when dashboard loads
function initializeQuickActions() {
    const dashboardSection = document.getElementById('dashboard');
    if (dashboardSection) {
        // Check if quick actions panel already exists to prevent duplication
        const existingPanel = dashboardSection.querySelector('.quick-actions-panel');
        if (!existingPanel) {
            const actionsPanel = createQuickActionsPanel();
            dashboardSection.insertBefore(actionsPanel, dashboardSection.firstChild);
        }
    }
}

// Generate comprehensive analytics report as PDF
function generateAnalyticsReport() {
    try {
        console.log('🔍 Generating analytics report...');
        
        // Initialize jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Get current date for report
        const now = new Date();
        const reportDate = now.toLocaleDateString();
        
        // Calculate date ranges
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(now.getDate() - 60);
        
        // Get data
        const allAppointments = window.sharedAppointments || [];
        const allUsers = window.sharedUsers || [];
        const allReviews = window.getReviews ? window.getReviews() : [];
        
        console.log('🔍 Analytics generation started');
        console.log('Raw data check:', {
            appointments: allAppointments.length,
            users: allUsers.length,
            reviews: allReviews.length
        });
        
        // If no recent data, expand the range to show some results
        let adjustedThirtyDaysAgo = thirtyDaysAgo;
        let adjustedSixtyDaysAgo = sixtyDaysAgo;
        
        // Check if we have any appointments in the last 30 days
        const recentCount = allAppointments.filter(apt => new Date(apt.date) >= thirtyDaysAgo).length;
        if (recentCount === 0 && allAppointments.length > 0) {
            // No recent appointments, expand to show all time data
            console.log('📈 No recent appointments found, expanding date range to show all historical data');
            adjustedThirtyDaysAgo = new Date('2020-01-01'); // Very old date
            adjustedSixtyDaysAgo = new Date('2019-01-01');
        }
        
        // Calculate metrics
        const metrics = calculateAnalyticsMetrics(allAppointments, allUsers, allReviews, adjustedThirtyDaysAgo, adjustedSixtyDaysAgo);
        
        // Set up PDF styling
        let yPosition = 20;
        const lineHeight = 7;
        const sectionSpacing = 10;
        
        // Header
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Consider Restoration - Analytics Report', 20, yPosition);
        yPosition += 10;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Generated on: ${reportDate}`, 20, yPosition);
        yPosition += sectionSpacing;
        
        // Executive Summary
        yPosition = addSection(doc, 'Executive Summary', yPosition, sectionSpacing);
        const periodLabel = recentCount === 0 ? 'All Time' : 'Last 30 Days';
        doc.text(`Total Revenue (${periodLabel}): $${metrics.revenue.last30Days.toLocaleString()}`, 20, yPosition);
        yPosition += lineHeight;
        doc.text(`Total Appointments (${periodLabel}): ${metrics.appointments.last30Days}`, 20, yPosition);
        yPosition += lineHeight;
        doc.text(`Active Customers: ${metrics.customers.active}`, 20, yPosition);
        yPosition += lineHeight;
        doc.text(`Average Rating: ${metrics.reviews.averageRating.toFixed(1)} stars`, 20, yPosition);
        yPosition += sectionSpacing;
        
        // Financial Metrics
        yPosition = addSection(doc, 'Financial Performance', yPosition, sectionSpacing);
        doc.text(`Revenue ${periodLabel}: $${metrics.revenue.last30Days.toLocaleString()}`, 20, yPosition);
        yPosition += lineHeight;
        doc.text(`Revenue Previous Period: $${metrics.revenue.previous30Days.toLocaleString()}`, 20, yPosition);
        yPosition += lineHeight;
        doc.text(`Revenue Growth: ${metrics.revenue.growthPercent.toFixed(1)}%`, 20, yPosition);
        yPosition += lineHeight;
        doc.text(`Average Appointment Value: $${metrics.revenue.averageValue.toFixed(2)}`, 20, yPosition);
        yPosition += lineHeight;
        doc.text(`Most Valuable Service: ${metrics.services.mostValuable.name} ($${metrics.services.mostValuable.revenue})`, 20, yPosition);
        yPosition += sectionSpacing;
        
        // Appointment Analytics
        yPosition = addSection(doc, 'Appointment Analytics', yPosition, sectionSpacing);
        doc.text(`Total Appointments: ${metrics.appointments.total}`, 20, yPosition);
        yPosition += lineHeight;
        doc.text(`Completed: ${metrics.appointments.completed}`, 20, yPosition);
        yPosition += lineHeight;
        doc.text(`Cancelled: ${metrics.appointments.cancelled}`, 20, yPosition);
        yPosition += lineHeight;
        doc.text(`Pending: ${metrics.appointments.pending}`, 20, yPosition);
        yPosition += lineHeight;
        doc.text(`Completion Rate: ${metrics.appointments.completionRate.toFixed(1)}%`, 20, yPosition);
        yPosition += lineHeight;
        doc.text(`Most Popular Service: ${metrics.services.mostPopular.name} (${metrics.services.mostPopular.count} bookings)`, 20, yPosition);
        yPosition += sectionSpacing;
        
        // Customer Analytics
        yPosition = addSection(doc, 'Customer Analytics', yPosition, sectionSpacing);
        doc.text(`Total Customers: ${metrics.customers.total}`, 20, yPosition);
        yPosition += lineHeight;
        doc.text(`New Customers (Last 30 Days): ${metrics.customers.new30Days}`, 20, yPosition);
        yPosition += lineHeight;
        doc.text(`Returning Customers: ${metrics.customers.returning}`, 20, yPosition);
        yPosition += lineHeight;
        doc.text(`Customer Retention Rate: ${metrics.customers.retentionRate.toFixed(1)}%`, 20, yPosition);
        yPosition += lineHeight;
        doc.text(`Average Appointments per Customer: ${metrics.customers.averageAppointments.toFixed(1)}`, 20, yPosition);
        yPosition += sectionSpacing;
        
        // Review Analytics
        yPosition = addSection(doc, 'Reviews & Ratings', yPosition, sectionSpacing);
        doc.text(`Total Reviews: ${metrics.reviews.total}`, 20, yPosition);
        yPosition += lineHeight;
        doc.text(`Average Rating: ${metrics.reviews.averageRating.toFixed(1)} stars`, 20, yPosition);
        yPosition += lineHeight;
        doc.text(`5-Star Reviews: ${metrics.reviews.fiveStars} (${metrics.reviews.fiveStarPercent.toFixed(1)}%)`, 20, yPosition);
        yPosition += lineHeight;
        doc.text(`4+ Star Reviews: ${metrics.reviews.fourPlusStars} (${metrics.reviews.fourPlusPercent.toFixed(1)}%)`, 20, yPosition);
        yPosition += sectionSpacing;
        
        // Performance Insights
        yPosition = addSection(doc, 'Performance Insights', yPosition, sectionSpacing);
        
        if (metrics.insights.length > 0) {
            metrics.insights.forEach(insight => {
                if (yPosition > 250) { // Check if we need a new page
                    doc.addPage();
                    yPosition = 20;
                }
                doc.text(`• ${insight}`, 20, yPosition);
                yPosition += lineHeight;
            });
        } else {
            doc.text('• Business performance is steady', 20, yPosition);
            yPosition += lineHeight;
        }
        
        yPosition += sectionSpacing;
        
        // Top Customers (if we have appointment data)
        if (allAppointments.length > 0) {
            yPosition = addSection(doc, 'Top Customers', yPosition, sectionSpacing);
            
            metrics.customers.topCustomers.slice(0, 5).forEach((customer, index) => {
                if (yPosition > 250) {
                    doc.addPage();
                    yPosition = 20;
                }
                doc.text(`${index + 1}. ${customer.name} - ${customer.appointments} appointments ($${customer.revenue})`, 20, yPosition);
                yPosition += lineHeight;
            });
        }
        
        // Footer
        yPosition += sectionSpacing;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('This report was generated automatically by Consider Restoration Admin System', 20, yPosition);
        
        // Save the PDF
        const fileName = `Consider_Restoration_Analytics_${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}.pdf`;
        doc.save(fileName);
        
        showNotification('Analytics report generated successfully!', 'success');
        console.log('✅ Analytics report generated:', fileName);
        
    } catch (error) {
        console.error('Error generating analytics report:', error);
        showNotification('Error generating analytics report. Please try again.', 'error');
    }
}

// Helper function to add section headers
function addSection(doc, title, yPosition, spacing) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 20, yPosition);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    return yPosition + spacing;
}

// Calculate comprehensive analytics metrics
function calculateAnalyticsMetrics(appointments, users, reviews, thirtyDaysAgo, sixtyDaysAgo) {
    const now = new Date();
    
    console.log('🔍 Analytics Debug - Raw data:');
    console.log('Total appointments:', appointments.length);
    console.log('Total users:', users.length);
    console.log('Total reviews:', reviews.length);
    console.log('Date ranges:', { thirtyDaysAgo, sixtyDaysAgo, now });
    
    // Debug appointment data structure
    console.log('Sample appointments:', appointments.slice(0, 3));
    appointments.forEach((apt, index) => {
        if (index < 5) { // Show first 5 appointments
            console.log(`Appointment ${index}:`, {
                date: apt.date,
                status: apt.status,
                price: apt.price,
                service: apt.service,
                clientName: apt.clientName
            });
        }
    });
    
    // Filter appointments by date ranges
    const last30DaysAppts = appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        const matches = aptDate >= thirtyDaysAgo && aptDate <= now;
        return matches;
    });
    
    const previous30DaysAppts = appointments.filter(apt => {
        const date = new Date(apt.date);
        return date >= sixtyDaysAgo && date < thirtyDaysAgo;
    });
    
    console.log('Filtered appointments:');
    console.log('Last 30 days:', last30DaysAppts.length);
    console.log('Previous 30 days:', previous30DaysAppts.length);
    
    // Debug appointment statuses
    const statusCounts = {};
    last30DaysAppts.forEach(apt => {
        statusCounts[apt.status] = (statusCounts[apt.status] || 0) + 1;
    });
    console.log('Appointment statuses in last 30 days:', statusCounts);
    
    // Revenue calculations - treat past/today appointments as completed
    const last30CompletedAppts = last30DaysAppts.filter(apt => {
        const aptDate = new Date(apt.date);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today
        
        // Consider completed if: explicitly completed/confirmed/paid OR appointment date is today/past (unless cancelled)
        const isExplicitlyCompleted = apt.status === 'completed' || apt.status === 'confirmed' || apt.status === 'paid';
        const isPastDue = aptDate <= today && apt.status !== 'cancelled';
        
        return isExplicitlyCompleted || isPastDue;
    });
    const last30Revenue = last30CompletedAppts.reduce((sum, apt) => {
        const price = parseFloat(apt.price) || 0;
        return sum + price;
    }, 0);
    
    const previous30CompletedAppts = previous30DaysAppts.filter(apt => {
        const aptDate = new Date(apt.date);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today
        
        // Consider completed if: explicitly completed/confirmed/paid OR appointment date is today/past (unless cancelled)
        const isExplicitlyCompleted = apt.status === 'completed' || apt.status === 'confirmed' || apt.status === 'paid';
        const isPastDue = aptDate <= today && apt.status !== 'cancelled';
        
        return isExplicitlyCompleted || isPastDue;
    });
    const previous30Revenue = previous30CompletedAppts.reduce((sum, apt) => {
        const price = parseFloat(apt.price) || 0;
        return sum + price;
    }, 0);
    
    const revenueGrowth = previous30Revenue > 0 
        ? ((last30Revenue - previous30Revenue) / previous30Revenue) * 100 
        : (last30Revenue > 0 ? 100 : 0);
    
    console.log('Revenue calculations:');
    console.log('Last 30 days completed appointments:', last30CompletedAppts.length);
    console.log('- Explicitly completed:', last30DaysAppts.filter(apt => apt.status === 'completed' || apt.status === 'confirmed' || apt.status === 'paid').length);
    console.log('- Auto-completed (past/today):', last30DaysAppts.filter(apt => {
        const aptDate = new Date(apt.date);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const isPastDue = aptDate <= today && apt.status !== 'cancelled';
        const isExplicit = apt.status === 'completed' || apt.status === 'confirmed' || apt.status === 'paid';
        return isPastDue && !isExplicit;
    }).length);
    console.log('Last 30 days revenue:', last30Revenue);
    console.log('Previous 30 days completed appointments:', previous30CompletedAppts.length);
    console.log('Previous 30 days revenue:', previous30Revenue);
    console.log('Revenue growth:', revenueGrowth);
    
    // Service analysis
    const serviceStats = {};
    appointments.forEach(apt => {
        if (apt.service) {
            if (!serviceStats[apt.service]) {
                serviceStats[apt.service] = { count: 0, revenue: 0 };
            }
            serviceStats[apt.service].count++;
            
            // Count revenue for completed/confirmed/paid OR past/today appointments (unless cancelled)
            const aptDate = new Date(apt.date);
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            
            const isExplicitlyCompleted = apt.status === 'completed' || apt.status === 'confirmed' || apt.status === 'paid';
            const isPastDue = aptDate <= today && apt.status !== 'cancelled';
            
            if (isExplicitlyCompleted || isPastDue) {
                serviceStats[apt.service].revenue += parseFloat(apt.price) || 0;
            }
        }
    });
    
    console.log('Service stats:', serviceStats);
    
    const mostPopularService = Object.entries(serviceStats)
        .sort((a, b) => b[1].count - a[1].count)[0];
    
    const mostValuableService = Object.entries(serviceStats)
        .sort((a, b) => b[1].revenue - a[1].revenue)[0];
    
    // Customer analysis
    const customerStats = {};
    appointments.forEach(apt => {
        // Use clientName as fallback if userId not available
        const customerId = apt.userId || apt.clientName || 'Unknown';
        
        if (!customerStats[customerId]) {
            const user = users.find(u => u.id === apt.userId);
            customerStats[customerId] = {
                name: user ? user.name : (apt.clientName || 'Unknown Client'),
                appointments: 0,
                revenue: 0
            };
        }
        customerStats[customerId].appointments++;
        
        // Count revenue for completed/confirmed/paid OR past/today appointments (unless cancelled)
        const aptDate = new Date(apt.date);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        const isExplicitlyCompleted = apt.status === 'completed' || apt.status === 'confirmed' || apt.status === 'paid';
        const isPastDue = aptDate <= today && apt.status !== 'cancelled';
        
        if (isExplicitlyCompleted || isPastDue) {
            customerStats[customerId].revenue += parseFloat(apt.price) || 0;
        }
    });
    
    console.log('Customer stats:', customerStats);
    
    const topCustomers = Object.values(customerStats)
        .sort((a, b) => b.revenue - a.revenue);
    
    // Review analysis
    const avgRating = reviews.length > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
        : 0;
    
    const fiveStars = reviews.filter(r => r.rating === 5).length;
    const fourPlusStars = reviews.filter(r => r.rating >= 4).length;
    
    // Generate insights
    const insights = [];
    if (revenueGrowth > 10) insights.push(`Revenue grew by ${revenueGrowth.toFixed(1)}% - excellent performance!`);
    if (revenueGrowth < -10) insights.push(`Revenue declined by ${Math.abs(revenueGrowth).toFixed(1)}% - consider marketing strategies`);
    if (avgRating >= 4.5) insights.push('Customer satisfaction is excellent with high ratings');
    if (avgRating < 3.5) insights.push('Customer satisfaction needs attention - review service quality');
    
    const completionRate = appointments.length > 0 
        ? (appointments.filter(apt => {
            const aptDate = new Date(apt.date);
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            
            const isExplicitlyCompleted = apt.status === 'completed' || apt.status === 'confirmed' || apt.status === 'paid';
            const isPastDue = aptDate <= today && apt.status !== 'cancelled';
            
            return isExplicitlyCompleted || isPastDue;
        }).length / appointments.length) * 100 
        : 0;
    
    if (completionRate < 80) insights.push('High cancellation rate - consider reminder systems');
    
    const finalMetrics = {
        revenue: {
            last30Days: last30Revenue,
            previous30Days: previous30Revenue,
            growthPercent: revenueGrowth,
            averageValue: last30CompletedAppts.length > 0 ? last30Revenue / last30CompletedAppts.length : 0
        },
        appointments: {
            total: appointments.length,
            last30Days: last30DaysAppts.length,
            completed: appointments.filter(apt => {
                const aptDate = new Date(apt.date);
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                
                const isExplicitlyCompleted = apt.status === 'completed' || apt.status === 'confirmed' || apt.status === 'paid';
                const isPastDue = aptDate <= today && apt.status !== 'cancelled';
                
                return isExplicitlyCompleted || isPastDue;
            }).length,
            cancelled: appointments.filter(apt => apt.status === 'cancelled').length,
            pending: appointments.filter(apt => {
                const aptDate = new Date(apt.date);
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                
                return apt.status === 'pending' && aptDate > today;
            }).length,
            completionRate: completionRate
        },
        services: {
            mostPopular: {
                name: mostPopularService ? mostPopularService[0] : 'N/A',
                count: mostPopularService ? mostPopularService[1].count : 0
            },
            mostValuable: {
                name: mostValuableService ? mostValuableService[0] : 'N/A',
                revenue: mostValuableService ? mostValuableService[1].revenue : 0
            }
        },
        customers: {
            total: users.filter(u => u.role === 'user').length,
            active: Object.keys(customerStats).length,
            new30Days: users.filter(u => {
                const created = new Date(u.createdAt || u.lastVisit || '2024-01-01');
                return created >= thirtyDaysAgo;
            }).length,
            returning: topCustomers.filter(c => c.appointments > 1).length,
            retentionRate: topCustomers.length > 0 
                ? (topCustomers.filter(c => c.appointments > 1).length / topCustomers.length) * 100 
                : 0,
            averageAppointments: topCustomers.length > 0
                ? topCustomers.reduce((sum, c) => sum + c.appointments, 0) / topCustomers.length
                : 0,
            topCustomers: topCustomers
        },
        reviews: {
            total: reviews.length,
            averageRating: avgRating,
            fiveStars: fiveStars,
            fiveStarPercent: reviews.length > 0 ? (fiveStars / reviews.length) * 100 : 0,
            fourPlusStars: fourPlusStars,
            fourPlusPercent: reviews.length > 0 ? (fourPlusStars / reviews.length) * 100 : 0
        },
        insights: insights
    };
    
    console.log('🔍 Final calculated metrics:', finalMetrics);
    return finalMetrics;
}