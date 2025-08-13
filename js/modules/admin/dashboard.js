// Admin Dashboard Module
export class AdminDashboard {
    constructor() {
        this.charts = {};
        this.stats = {};
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        console.log('🔧 Initializing Admin Dashboard...');
        
        try {
            await this.loadDashboardData();
            this.initializeCharts();
            this.setupEventListeners();
            this.startAutoRefresh();
            this.initialized = true;
            
            console.log('✅ Admin Dashboard initialized successfully');
        } catch (error) {
            console.error('❌ Admin Dashboard initialization failed:', error);
        }
    }

    async loadDashboardData() {
        try {
            // Use API client if available, otherwise fallback
            if (window.apiClient && window.apiClient.token) {
                const [appointments, payments, users] = await Promise.all([
                    window.apiClient.getAppointments({ status: 'confirmed' }),
                    window.apiClient.getPaymentHistory({ limit: 100 }),
                    window.apiClient.getUsers({ limit: 50 })
                ]);

                this.stats = this.calculateStats(appointments, payments, users);
            } else {
                // Fallback to client-side data
                this.loadFallbackData();
            }
        } catch (error) {
            console.warn('Server data unavailable, using fallback');
            this.loadFallbackData();
        }
    }

    loadFallbackData() {
        const appointments = window.getAppointments ? window.getAppointments() : [];
        const users = window.getUsers ? window.getUsers() : [];
        
        this.stats = this.calculateStats(appointments, [], users);
    }

    calculateStats(appointments, payments, users) {
        const today = new Date();
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        return {
            todayAppointments: appointments.filter(apt => 
                new Date(apt.date).toDateString() === today.toDateString()
            ).length,
            
            monthlyRevenue: payments.reduce((sum, payment) => 
                new Date(payment.createdAt) >= thisMonth ? sum + payment.amount : sum, 0
            ),
            
            activeClients: users.filter(user => 
                user.role === 'user' && user.isActive !== false
            ).length,
            
            pendingReviews: appointments.filter(apt => 
                apt.status === 'completed' && !apt.reviewRequested
            ).length,
            
            monthlyAppointments: appointments.filter(apt => 
                new Date(apt.date) >= thisMonth
            ).length,
            
            popularServices: this.getPopularServices(appointments)
        };
    }

    getPopularServices(appointments) {
        const serviceCount = {};
        appointments.forEach(apt => {
            serviceCount[apt.service] = (serviceCount[apt.service] || 0) + 1;
        });

        return Object.entries(serviceCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([service, count]) => ({ service, count }));
    }

    initializeCharts() {
        this.createRevenueChart();
        this.createAppointmentsChart();
        this.updateStatCards();
    }

    createRevenueChart() {
        const canvas = document.getElementById('revenueCanvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Simple chart implementation (replace with Chart.js if needed)
        this.drawSimpleChart(ctx, this.generateRevenueData());
    }

    createAppointmentsChart() {
        const container = document.getElementById('appointmentsChart');
        if (!container) return;

        // Create appointments chart
        const data = this.generateAppointmentsData();
        this.renderAppointmentsChart(container, data);
    }

    drawSimpleChart(ctx, data) {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const margin = 40;
        const chartWidth = width - 2 * margin;
        const chartHeight = height - 2 * margin;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Set styles
        ctx.strokeStyle = '#3A7D99';
        ctx.lineWidth = 2;
        ctx.font = '12px Arial';
        ctx.fillStyle = '#666';

        // Draw axes
        ctx.beginPath();
        ctx.moveTo(margin, margin);
        ctx.lineTo(margin, height - margin);
        ctx.lineTo(width - margin, height - margin);
        ctx.stroke();

        // Draw data points
        const maxValue = Math.max(...data.values);
        const points = data.values.map((value, index) => ({
            x: margin + (chartWidth * index) / (data.values.length - 1),
            y: height - margin - (chartHeight * value) / maxValue
        }));

        // Draw line
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.forEach(point => ctx.lineTo(point.x, point.y));
        ctx.stroke();

        // Draw points
        points.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = '#3A7D99';
            ctx.fill();
        });
    }

    generateRevenueData() {
        // Generate sample revenue data for the chart
        const days = 7;
        const labels = [];
        const values = [];

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            values.push(Math.floor(Math.random() * 500) + 100);
        }

        return { labels, values };
    }

    generateAppointmentsData() {
        return {
            confirmed: this.stats.monthlyAppointments || 0,
            pending: Math.floor((this.stats.monthlyAppointments || 0) * 0.2),
            cancelled: Math.floor((this.stats.monthlyAppointments || 0) * 0.1)
        };
    }

    renderAppointmentsChart(container, data) {
        container.innerHTML = `
            <div class="appointments-breakdown">
                <div class="breakdown-item confirmed">
                    <span class="count">${data.confirmed}</span>
                    <span class="label">Confirmed</span>
                </div>
                <div class="breakdown-item pending">
                    <span class="count">${data.pending}</span>
                    <span class="label">Pending</span>
                </div>
                <div class="breakdown-item cancelled">
                    <span class="count">${data.cancelled}</span>
                    <span class="label">Cancelled</span>
                </div>
            </div>
        `;
    }

    updateStatCards() {
        // Update dashboard stat cards
        this.updateElement('todaysAppointments', this.stats.todayAppointments);
        this.updateElement('monthlyRevenue', `$${this.stats.monthlyRevenue || 0}`);
        this.updateElement('activeClients', this.stats.activeClients);
        this.updateElement('pendingReviews', this.stats.pendingReviews);

        // Update recent activity
        this.updateRecentActivity();
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            element.classList.add('updated');
            setTimeout(() => element.classList.remove('updated'), 1000);
        }
    }

    updateRecentActivity() {
        const container = document.getElementById('recentActivity');
        if (!container) return;

        const activities = this.generateRecentActivities();
        
        container.innerHTML = activities.map(activity => `
            <div class="activity-item ${activity.type}">
                <div class="activity-icon">${activity.icon}</div>
                <div class="activity-details">
                    <div class="activity-text">${activity.text}</div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            </div>
        `).join('');
    }

    generateRecentActivities() {
        return [
            {
                type: 'appointment',
                icon: '📅',
                text: 'New appointment booked by John Doe',
                time: '2 minutes ago'
            },
            {
                type: 'payment',
                icon: '💳',
                text: 'Payment of $90 received',
                time: '15 minutes ago'
            },
            {
                type: 'review',
                icon: '⭐',
                text: 'New 5-star review posted',
                time: '1 hour ago'
            },
            {
                type: 'user',
                icon: '👤',
                text: 'New user registration',
                time: '2 hours ago'
            }
        ];
    }

    setupEventListeners() {
        // Chart period selector
        const periodSelect = document.getElementById('chartPeriod');
        if (periodSelect) {
            periodSelect.addEventListener('change', (e) => {
                this.updateChartPeriod(e.target.value);
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshDashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
    }

    async updateChartPeriod(period) {
        console.log(`🔄 Updating charts for period: ${period}`);
        // Implement period-specific data loading
        await this.loadDashboardData();
        this.initializeCharts();
    }

    async refresh() {
        console.log('🔄 Refreshing dashboard data...');
        const refreshBtn = document.getElementById('refreshDashboard');
        
        if (refreshBtn) {
            refreshBtn.disabled = true;
            refreshBtn.textContent = 'Refreshing...';
        }

        try {
            await this.loadDashboardData();
            this.updateStatCards();
            this.initializeCharts();
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.textContent = 'Refresh';
            }
        }
    }

    startAutoRefresh() {
        // Auto-refresh every 5 minutes
        setInterval(() => {
            this.loadDashboardData().then(() => {
                this.updateStatCards();
            }).catch(error => {
                console.warn('Auto-refresh failed:', error);
            });
        }, 5 * 60 * 1000);
    }

    destroy() {
        this.initialized = false;
        // Clear any intervals or event listeners
    }
}

// Export for use in admin panel
window.AdminDashboard = AdminDashboard;