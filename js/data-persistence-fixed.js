// Fixed Data Persistence Manager
// Handles unified data persistence with robust fallback support
console.log('📊 Fixed Data Persistence Manager loading...');

class DataPersistenceManagerFixed {
    constructor() {
        this.serverAvailable = false;
        this.initialized = false;
        this.syncQueue = [];
        this.isSyncing = false;
        
        // Immediate initialization
        this.initializeSync();
        
        console.log('📊 Fixed Data Persistence Manager created');
    }

    async initializeSync() {
        try {
            // Check server availability immediately
            await this.checkServerStatus();
            
            // Set initialized flag
            this.initialized = true;
            
            console.log('📊 Fixed Data Persistence Manager ready. Server:', this.serverAvailable ? 'ONLINE' : 'OFFLINE');
            
            // Dispatch ready event
            window.dispatchEvent(new CustomEvent('dataPersistenceReady'));
            
        } catch (error) {
            console.error('📊 Data Persistence initialization failed:', error);
            this.serverAvailable = false;
            this.initialized = true; // Still mark as initialized for fallback mode
        }
    }

    async checkServerStatus() {
        // Skip server status check for file:// protocol (client-side only mode)
        if (window.location.protocol === 'file:') {
            this.serverAvailable = false;
            console.log('📊 Server status check skipped for file:// protocol - using client-side mode');
            return;
        }
        
        try {
            // Skip server checks when running on Vercel without backend
            if (window.location.hostname.includes('vercel.app')) {
                console.log('📊 Server health check skipped - running in client-side mode');
                this.serverAvailable = false;
                return;
            }
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
            
            const apiUrl = typeof EnvConfig !== 'undefined' ? 
                EnvConfig.getHealthUrl() : 
                'http://localhost:3060/health';
            
            const response = await fetch(apiUrl, {
                signal: controller.signal,
                headers: { 'Content-Type': 'application/json' }
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const health = await response.json();
                this.serverAvailable = health.status === 'healthy';
                console.log('📊 Server health check:', this.serverAvailable ? 'HEALTHY' : 'UNHEALTHY');
            } else {
                this.serverAvailable = false;
            }
        } catch (error) {
            console.log('📊 Server unavailable, using offline mode:', error.message);
            this.serverAvailable = false;
        }
        
        window.serverAvailable = this.serverAvailable;
        return this.serverAvailable;
    }

    // USERS DATA MANAGEMENT
    async getUsers() {
        console.log('📊 Getting users...');
        
        if (this.serverAvailable && window.apiClient?.token) {
            try {
                const response = await window.apiClient.getUsers();
                console.log('📊 Got users from server:', response.users?.length || 0);
                return response.users || [];
            } catch (error) {
                console.warn('📊 Server users fetch failed, using local fallback:', error);
            }
        }
        
        // Fallback to localStorage
        try {
            const stored = localStorage.getItem('massageUsers');
            const users = stored ? JSON.parse(stored) : this.getDefaultUsers();
            console.log('📊 Got users from localStorage:', users.length);
            return users;
        } catch (error) {
            console.error('📊 Error reading local users:', error);
            return this.getDefaultUsers();
        }
    }

    async addUser(userData) {
        console.log('📊 Adding user:', userData.email);
        
        const newUser = {
            id: this.generateId(),
            ...userData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (this.serverAvailable && window.apiClient?.token) {
            try {
                const response = await window.apiClient.register(userData);
                console.log('📊 User created on server:', response.user?.id);
                return response.user;
            } catch (error) {
                console.warn('📊 Server user creation failed, storing locally:', error);
            }
        }

        // Store locally
        const users = await this.getUsers();
        users.push(newUser);
        this.saveUsersLocally(users);
        
        console.log('📊 User created locally:', newUser.id);
        return newUser;
    }

    async updateUser(userId, updates) {
        console.log('📊 Updating user:', userId);
        
        if (this.serverAvailable && window.apiClient?.token) {
            try {
                const response = await window.apiClient.updateProfile(updates);
                console.log('📊 User updated on server');
                return response.user;
            } catch (error) {
                console.warn('📊 Server user update failed, storing locally:', error);
            }
        }

        // Update locally
        const users = await this.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            users[userIndex] = { ...users[userIndex], ...updates, updatedAt: new Date().toISOString() };
            this.saveUsersLocally(users);
            console.log('📊 User updated locally');
            return users[userIndex];
        }
        
        console.warn('📊 User not found for update:', userId);
        return null;
    }

    // APPOINTMENTS DATA MANAGEMENT
    async getAppointments(params = {}) {
        console.log('📊 Getting appointments with params:', params);
        
        if (this.serverAvailable && window.apiClient?.token) {
            try {
                const response = await window.apiClient.getAppointments(params);
                console.log('📊 Got appointments from server:', response.appointments?.length || 0);
                return response.appointments || [];
            } catch (error) {
                console.warn('📊 Server appointments fetch failed, using local fallback:', error);
            }
        }
        
        // Fallback to localStorage
        try {
            const stored = localStorage.getItem('massageAppointments');
            let appointments = stored ? JSON.parse(stored) : [];
            
            // Apply filters if provided
            if (params.userId) {
                appointments = appointments.filter(apt => apt.userId === params.userId);
            }
            if (params.status) {
                appointments = appointments.filter(apt => apt.status === params.status);
            }
            if (params.date) {
                appointments = appointments.filter(apt => apt.date === params.date);
            }
            
            console.log('📊 Got appointments from localStorage:', appointments.length);
            return appointments;
        } catch (error) {
            console.error('📊 Error reading local appointments:', error);
            return [];
        }
    }

    async createAppointment(appointmentData) {
        console.log('📊 Creating appointment:', appointmentData);
        
        const newAppointment = {
            id: this.generateId(),
            ...appointmentData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: appointmentData.status || 'pending'
        };

        if (this.serverAvailable && window.apiClient?.token) {
            try {
                const response = await window.apiClient.createAppointment(appointmentData);
                console.log('📊 Appointment created on server successfully');
                return response.appointment;
            } catch (error) {
                console.warn('📊 Server appointment creation failed, storing locally:', error);
            }
        }

        // Store locally
        const appointments = await this.getAppointments();
        appointments.push(newAppointment);
        this.saveAppointmentsLocally(appointments);
        
        console.log('📊 Appointment created locally:', newAppointment.id);
        return newAppointment;
    }

    async updateAppointment(appointmentId, updates) {
        console.log('📊 Updating appointment:', appointmentId);
        
        if (this.serverAvailable && window.apiClient?.token) {
            try {
                const response = await window.apiClient.updateAppointment(appointmentId, updates);
                console.log('📊 Appointment updated on server successfully');
                return response.appointment;
            } catch (error) {
                console.warn('📊 Server appointment update failed, storing locally:', error);
            }
        }

        // Update locally
        const appointments = await this.getAppointments();
        const aptIndex = appointments.findIndex(apt => apt.id === appointmentId);
        if (aptIndex !== -1) {
            appointments[aptIndex] = { 
                ...appointments[aptIndex], 
                ...updates, 
                updatedAt: new Date().toISOString() 
            };
            this.saveAppointmentsLocally(appointments);
            console.log('📊 Appointment updated locally:', appointmentId);
            return appointments[aptIndex];
        }
        
        console.warn('📊 Appointment not found for update:', appointmentId);
        return null;
    }

    // AUTHENTICATION
    async authenticateUser(email, password) {
        console.log('📊 Authenticating user:', email);
        
        if (this.serverAvailable) {
            try {
                const response = await window.apiClient.login(email, password);
                console.log('📊 Server authentication successful');
                return response.user;
            } catch (error) {
                console.warn('📊 Server auth failed, trying local fallback:', error);
            }
        }

        // Fallback to local authentication
        if (window.authenticateUser) {
            const user = window.authenticateUser(email, password);
            console.log('📊 Local authentication result:', user ? 'success' : 'failed');
            return user;
        }
        
        console.warn('📊 No authentication method available');
        return null;
    }

    async validateSession() {
        console.log('📊 Validating session...');
        
        if (this.serverAvailable) {
            try {
                const user = await window.apiClient.validateSession();
                console.log('📊 Server session validation:', user ? 'valid' : 'invalid');
                return user;
            } catch (error) {
                console.warn('📊 Server session validation failed, using local fallback');
            }
        }

        // Fallback to local session validation
        if (window.validateSession) {
            const user = window.validateSession();
            console.log('📊 Local session validation:', user ? 'valid' : 'invalid');
            return user;
        }
        
        console.warn('📊 No session validation method available');
        return null;
    }

    // HELPER METHODS
    saveUsersLocally(users) {
        try {
            localStorage.setItem('massageUsers', JSON.stringify(users));
            window.sharedUsers = users; // Update global reference
            console.log('📊 Users saved locally:', users.length);
        } catch (error) {
            console.error('📊 Failed to save users locally:', error);
        }
    }

    saveAppointmentsLocally(appointments) {
        try {
            localStorage.setItem('massageAppointments', JSON.stringify(appointments));
            window.sharedAppointments = appointments; // Update global reference
            console.log('📊 Appointments saved locally:', appointments.length);
        } catch (error) {
            console.error('📊 Failed to save appointments locally:', error);
        }
    }

    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getDefaultUsers() {
        // Return empty array instead of shared users to prevent circular dependency
        return [];
    }

    isReady() {
        return this.initialized;
    }

    getStatus() {
        return {
            initialized: this.initialized,
            serverAvailable: this.serverAvailable,
            queueSize: this.syncQueue.length
        };
    }
}

// Create global instance
console.log('📊 Creating global data persistence instance...');
window.dataPersistenceFixed = new DataPersistenceManagerFixed();
// Backward compatibility alias
window.dataPersistence = window.dataPersistenceFixed;

// Enhanced global functions with immediate availability
window.getUsers = async function() {
    try {
        if (!window.dataPersistenceFixed.isReady()) {
            console.log('📊 Data persistence not ready, waiting...');
            await new Promise(resolve => {
                if (window.dataPersistenceFixed.isReady()) {
                    resolve();
                } else {
                    window.addEventListener('dataPersistenceReady', resolve, { once: true });
                    // Fallback timeout
                    setTimeout(resolve, 2000);
                }
            });
        }
        return await window.dataPersistenceFixed.getUsers();
    } catch (error) {
        console.error('📊 getUsers error:', error);
        return [];
    }
};

window.addUser = async function(userData) {
    try {
        return await window.dataPersistenceFixed.addUser(userData);
    } catch (error) {
        console.error('📊 addUser error:', error);
        return null;
    }
};

window.updateUser = async function(userId, updates) {
    try {
        return await window.dataPersistenceFixed.updateUser(userId, updates);
    } catch (error) {
        console.error('📊 updateUser error:', error);
        return null;
    }
};

window.getAppointments = async function(params = {}) {
    try {
        if (!window.dataPersistenceFixed.isReady()) {
            console.log('📊 Data persistence not ready, waiting...');
            await new Promise(resolve => {
                if (window.dataPersistenceFixed.isReady()) {
                    resolve();
                } else {
                    window.addEventListener('dataPersistenceReady', resolve, { once: true });
                    // Fallback timeout
                    setTimeout(resolve, 2000);
                }
            });
        }
        return await window.dataPersistenceFixed.getAppointments(params);
    } catch (error) {
        console.error('📊 getAppointments error:', error);
        return [];
    }
};

window.addAppointment = async function(appointmentData) {
    try {
        return await window.dataPersistenceFixed.createAppointment(appointmentData);
    } catch (error) {
        console.error('📊 addAppointment error:', error);
        return null;
    }
};

window.updateAppointment = async function(appointmentId, updates) {
    try {
        return await window.dataPersistenceFixed.updateAppointment(appointmentId, updates);
    } catch (error) {
        console.error('📊 updateAppointment error:', error);
        return null;
    }
};

window.authenticateUserSecure = async function(email, password) {
    try {
        return await window.dataPersistenceFixed.authenticateUser(email, password);
    } catch (error) {
        console.error('📊 authenticateUserSecure error:', error);
        return null;
    }
};

window.validateSessionSecure = async function() {
    try {
        return await window.dataPersistenceFixed.validateSession();
    } catch (error) {
        console.error('📊 validateSessionSecure error:', error);
        return null;
    }
};

// Status check function
window.getDataPersistenceStatus = function() {
    return window.dataPersistenceFixed.getStatus();
};

console.log('📊 Fixed Data Persistence Manager loaded and ready');