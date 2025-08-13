// API Client for secure server-side communication
if (typeof logger !== 'undefined') {
    logger.debug('🔗 API Client loaded');
}

class APIClient {
    constructor() {
        // Use environment configuration for URLs
        this.baseURL = typeof EnvConfig !== 'undefined' ? 
            EnvConfig.getApiUrl() : 
            this.getFallbackApiUrl();
        
        this.token = localStorage.getItem('authToken');
        
        if (typeof logger !== 'undefined') {
            logger.info('🔗 API Client initialized with base URL:', this.baseURL);
        }
    }
    
    // Fallback URL detection if EnvConfig is not available
    getFallbackApiUrl() {
        if (window.location.hostname === 'localhost' || 
            window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3060/api';
        }
        
        if (window.location.hostname.includes('staging.') || 
            window.location.hostname.includes('dev.')) {
            return 'https://api-staging.considerrestoration.com/api';
        }
        
        return 'https://api.considerrestoration.com/api';
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('authToken', token);
        } else {
            localStorage.removeItem('authToken');
        }
    }

    // Make authenticated request
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add auth token if available
        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        console.log('🔗 Making API request to:', endpoint);
        
        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('🔗 API request failed:', error);
            
            // If token is invalid, clear it
            if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                this.setToken(null);
                localStorage.removeItem('currentUser');
            }
            
            throw error;
        }
    }

    // Authentication methods
    async login(email, password) {
        console.log('🔗 Attempting server-side login for:', email);
        
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (response.token) {
            this.setToken(response.token);
            
            // Store user data securely (without password)
            localStorage.setItem('currentUser', JSON.stringify({
                ...response.user,
                loginTime: new Date().toISOString(),
                serverAuth: true // Mark as server-authenticated
            }));
        }

        return response;
    }

    async register(userData) {
        console.log('🔗 Attempting server-side registration');
        
        const response = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });

        if (response.token) {
            this.setToken(response.token);
            localStorage.setItem('currentUser', JSON.stringify({
                ...response.user,
                loginTime: new Date().toISOString(),
                serverAuth: true
            }));
        }

        return response;
    }

    async logout() {
        console.log('🔗 Performing server-side logout');
        
        try {
            await this.request('/auth/logout', {
                method: 'POST'
            });
        } catch (error) {
            console.warn('Server logout failed, proceeding with local cleanup');
        }

        this.setToken(null);
        localStorage.removeItem('currentUser');
        
        // Clear any cached data
        localStorage.removeItem('massageAppointments');
        localStorage.removeItem('massageUsers');
        sessionStorage.clear();
    }

    async getProfile() {
        return await this.request('/auth/profile');
    }

    async updateProfile(profileData) {
        return await this.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    async changePassword(currentPassword, newPassword) {
        return await this.request('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword })
        });
    }

    // Appointment methods
    async getAppointments(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/appointments${queryString ? '?' + queryString : ''}`);
    }

    async createAppointment(appointmentData) {
        return await this.request('/appointments', {
            method: 'POST',
            body: JSON.stringify(appointmentData)
        });
    }

    async updateAppointment(appointmentId, updates) {
        return await this.request(`/appointments/${appointmentId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    }

    async cancelAppointment(appointmentId, reason) {
        return await this.request(`/appointments/${appointmentId}/cancel`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        });
    }

    // Payment methods
    async createPaymentIntent(appointmentId, amount) {
        return await this.request('/payments/create-payment-intent', {
            method: 'POST',
            body: JSON.stringify({ appointmentId, amount })
        });
    }

    async confirmPayment(paymentIntentId) {
        return await this.request('/payments/confirm-payment', {
            method: 'POST',
            body: JSON.stringify({ paymentIntentId })
        });
    }

    async getPaymentHistory(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/payments/history${queryString ? '?' + queryString : ''}`);
    }

    // Validate current session with server
    async validateSession() {
        try {
            const storedUser = localStorage.getItem('currentUser');
            if (!storedUser) return null;

            const userData = JSON.parse(storedUser);
            
            // If not server-authenticated, return null
            if (!userData.serverAuth) {
                console.log('🔗 Legacy client-side auth detected, clearing...');
                localStorage.removeItem('currentUser');
                return null;
            }

            // Check if token exists
            if (!this.token) {
                console.log('🔗 No auth token found');
                localStorage.removeItem('currentUser');
                return null;
            }

            // Validate with server
            const profile = await this.getProfile();
            
            // Update stored user data with fresh server data
            const updatedUser = {
                ...profile.user,
                loginTime: userData.loginTime,
                serverAuth: true
            };
            
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            return updatedUser;

        } catch (error) {
            console.log('🔗 Session validation failed:', error.message);
            localStorage.removeItem('currentUser');
            this.setToken(null);
            return null;
        }
    }

    // Admin methods
    async getUsers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return await this.request(`/auth/admin/users${queryString ? '?' + queryString : ''}`);
    }

    // Health check
    async healthCheck() {
        // Skip health checks for file:// protocol (client-side only mode)
        if (window.location.protocol === 'file:') {
            console.log('🔗 Health check skipped for file:// protocol');
            return { status: 'offline', message: 'Client-side mode' };
        }
        
        try {
            const response = await fetch(`${this.baseURL.replace('/api', '')}/health`);
            return await response.json();
        } catch (error) {
            console.log('🔗 Health check failed (expected in client-side mode):', error.message);
            return { status: 'offline', error: error.message };
        }
    }
}

// Create global API client instance
window.apiClient = new APIClient();

// Enhanced authentication function that uses server-side auth
window.authenticateUserSecure = async function(email, password) {
    try {
        console.log('🔗 Using secure server-side authentication');
        const response = await window.apiClient.login(email, password);
        return response.user;
    } catch (error) {
        console.error('🔗 Server authentication failed:', error);
        return null;
    }
};

// Enhanced session validation
window.validateSessionSecure = async function() {
    try {
        return await window.apiClient.validateSession();
    } catch (error) {
        console.error('🔗 Server session validation failed:', error);
        return null;
    }
};

// Enhanced logout
window.secureLogoutEnhanced = async function() {
    try {
        await window.apiClient.logout();
        window.dispatchEvent(new CustomEvent('userLoggedOut'));
    } catch (error) {
        console.error('🔗 Secure logout failed:', error);
    }
};

// Fallback detection - if server is not available, use client-side auth
window.checkServerAvailability = async function() {
    try {
        const health = await window.apiClient.healthCheck();
        const isAvailable = health.status === 'ok';
        
        console.log('🔗 Server availability:', isAvailable ? 'ONLINE' : 'OFFLINE');
        
        // Store server status
        window.serverAvailable = isAvailable;
        
        return isAvailable;
    } catch (error) {
        console.log('🔗 Server not available, will use client-side fallback');
        window.serverAvailable = false;
        return false;
    }
};

// Enhanced user data getter that tries server first
window.getUsersSecure = async function() {
    if (window.serverAvailable && window.apiClient.token) {
        try {
            const response = await window.apiClient.getUsers();
            return response.users;
        } catch (error) {
            console.warn('🔗 Failed to get users from server, using fallback');
        }
    }
    
    // Fallback to client-side data
    return window.getUsers ? window.getUsers() : [];
};

// Initialize server availability check
window.checkServerAvailability();

console.log('🔗 Secure API client ready');