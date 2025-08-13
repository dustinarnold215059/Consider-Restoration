// Data Persistence Manager
// Handles unified data persistence with backend API and localStorage fallback
console.log('📊 Data Persistence Manager loading...');

class DataPersistenceManager {
    constructor() {
        this.serverAvailable = false;
        this.initializationPromise = this.initialize();
        this.syncQueue = [];
        this.isSyncing = false;
        
        console.log('📊 Data Persistence Manager initialized');
    }

    async initialize() {
        try {
            // Check server availability
            await this.checkServerStatus();
            
            // If server is available, attempt to sync local data to server
            if (this.serverAvailable) {
                await this.syncLocalDataToServer();
            }
            
            console.log('📊 Data Persistence Manager ready. Server:', this.serverAvailable ? 'ONLINE' : 'OFFLINE');
            return true;
        } catch (error) {
            console.error('📊 Data Persistence Manager initialization failed:', error);
            this.serverAvailable = false;
            return false;
        }
    }

    async checkServerStatus() {
        try {
            const response = await fetch('http://localhost:3060/health', {
                timeout: 3000,
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (response.ok) {
                const health = await response.json();
                this.serverAvailable = health.status === 'healthy';
                console.log('📊 Server health check:', this.serverAvailable ? 'HEALTHY' : 'UNHEALTHY');
            } else {
                this.serverAvailable = false;
            }
        } catch (error) {
            console.log('📊 Server unavailable, using offline mode');
            this.serverAvailable = false;
        }
        
        window.serverAvailable = this.serverAvailable;
        return this.serverAvailable;
    }

    // USERS DATA MANAGEMENT
    async getUsers() {
        if (this.serverAvailable && window.apiClient?.token) {
            try {
                const response = await window.apiClient.getUsers();
                return response.users || [];
            } catch (error) {
                console.warn('📊 Server users fetch failed, using local fallback:', error);
            }
        }
        
        // Fallback to localStorage
        try {
            const stored = localStorage.getItem('massageUsers');
            return stored ? JSON.parse(stored) : this.getDefaultUsers();
        } catch (error) {
            console.error('📊 Error reading local users:', error);
            return this.getDefaultUsers();
        }
    }

    async addUser(userData) {
        const newUser = {
            id: this.generateId(),
            ...userData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (this.serverAvailable && window.apiClient?.token) {
            try {
                const response = await window.apiClient.register(userData);
                return response.user;
            } catch (error) {
                console.warn('📊 Server user creation failed, storing locally:', error);
                this.queueSync('createUser', newUser);
            }
        }

        // Store locally
        const users = await this.getUsers();
        users.push(newUser);
        this.saveUsersLocally(users);
        
        return newUser;
    }

    async updateUser(userId, updates) {
        if (this.serverAvailable && window.apiClient?.token) {
            try {
                const response = await window.apiClient.updateProfile(updates);
                return response.user;
            } catch (error) {
                console.warn('📊 Server user update failed, storing locally:', error);
                this.queueSync('updateUser', { userId, updates });
            }
        }

        // Update locally
        const users = await this.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            users[userIndex] = { ...users[userIndex], ...updates, updatedAt: new Date().toISOString() };
            this.saveUsersLocally(users);
            return users[userIndex];
        }
        
        return null;
    }

    // APPOINTMENTS DATA MANAGEMENT
    async getAppointments(params = {}) {
        if (this.serverAvailable && window.apiClient?.token) {
            try {
                const response = await window.apiClient.getAppointments(params);
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
            
            return appointments;
        } catch (error) {
            console.error('📊 Error reading local appointments:', error);
            return [];
        }
    }

    async createAppointment(appointmentData) {
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
                this.queueSync('createAppointment', newAppointment);
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
        if (this.serverAvailable && window.apiClient?.token) {
            try {
                const response = await window.apiClient.updateAppointment(appointmentId, updates);
                console.log('📊 Appointment updated on server successfully');
                return response.appointment;
            } catch (error) {
                console.warn('📊 Server appointment update failed, storing locally:', error);
                this.queueSync('updateAppointment', { appointmentId, updates });
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
        
        return null;
    }

    async cancelAppointment(appointmentId, reason) {
        return await this.updateAppointment(appointmentId, { 
            status: 'cancelled', 
            cancellationReason: reason,
            cancelledAt: new Date().toISOString()
        });
    }

    // SYNC OPERATIONS
    queueSync(operation, data) {
        this.syncQueue.push({
            id: this.generateId(),
            operation,
            data,
            timestamp: new Date().toISOString(),
            retries: 0
        });
        
        console.log('📊 Queued for sync:', operation, data);
        this.processSyncQueue();
    }

    async processSyncQueue() {
        if (this.isSyncing || !this.serverAvailable || this.syncQueue.length === 0) {
            return;
        }

        this.isSyncing = true;
        console.log('📊 Processing sync queue:', this.syncQueue.length, 'items');

        while (this.syncQueue.length > 0 && this.serverAvailable) {
            const syncItem = this.syncQueue.shift();
            
            try {
                await this.executeSyncOperation(syncItem);
                console.log('📊 Sync completed:', syncItem.operation);
            } catch (error) {
                console.error('📊 Sync failed:', syncItem.operation, error);
                
                syncItem.retries = (syncItem.retries || 0) + 1;
                if (syncItem.retries < 3) {
                    this.syncQueue.push(syncItem); // Re-queue for retry
                }
            }
        }

        this.isSyncing = false;
    }

    async executeSyncOperation(syncItem) {
        const { operation, data } = syncItem;

        switch (operation) {
            case 'createUser':
                await window.apiClient.register(data);
                break;
            case 'updateUser':
                await window.apiClient.updateProfile(data.updates);
                break;
            case 'createAppointment':
                await window.apiClient.createAppointment(data);
                break;
            case 'updateAppointment':
                await window.apiClient.updateAppointment(data.appointmentId, data.updates);
                break;
            default:
                console.warn('📊 Unknown sync operation:', operation);
        }
    }

    async syncLocalDataToServer() {
        if (!this.serverAvailable || !window.apiClient?.token) {
            return;
        }

        try {
            console.log('📊 Starting local-to-server data sync...');
            
            // Sync users (if any were created offline)
            const localUsers = JSON.parse(localStorage.getItem('massageUsers') || '[]');
            const serverUsers = await this.getUsers();
            
            // Find users that exist locally but not on server
            const usersToSync = localUsers.filter(localUser => 
                !serverUsers.find(serverUser => serverUser.email === localUser.email)
            );
            
            for (const user of usersToSync) {
                try {
                    await window.apiClient.register(user);
                    console.log('📊 Synced user to server:', user.email);
                } catch (error) {
                    console.warn('📊 Failed to sync user:', user.email, error);
                }
            }

            // Sync appointments (if any were created offline)
            const localAppointments = JSON.parse(localStorage.getItem('massageAppointments') || '[]');
            for (const appointment of localAppointments) {
                try {
                    // Check if appointment exists on server
                    const serverAppointments = await this.getAppointments({ userId: appointment.userId });
                    const exists = serverAppointments.find(apt => 
                        apt.appointmentDate === appointment.date && 
                        apt.startTime === appointment.time &&
                        apt.userId === appointment.userId
                    );

                    if (!exists) {
                        await window.apiClient.createAppointment(appointment);
                        console.log('📊 Synced appointment to server:', appointment.id);
                    }
                } catch (error) {
                    console.warn('📊 Failed to sync appointment:', appointment.id, error);
                }
            }

            console.log('📊 Local-to-server sync completed');
        } catch (error) {
            console.error('📊 Data sync failed:', error);
        }
    }

    // HELPER METHODS
    saveUsersLocally(users) {
        try {
            localStorage.setItem('massageUsers', JSON.stringify(users));
            window.sharedUsers = users; // Update global reference
        } catch (error) {
            console.error('📊 Failed to save users locally:', error);
        }
    }

    saveAppointmentsLocally(appointments) {
        try {
            localStorage.setItem('massageAppointments', JSON.stringify(appointments));
            window.sharedAppointments = appointments; // Update global reference
        } catch (error) {
            console.error('📊 Failed to save appointments locally:', error);
        }
    }

    generateId() {
        return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getDefaultUsers() {
        return window.sharedUsers || [];
    }

    // AUTHENTICATION INTEGRATION
    async authenticateUser(email, password) {
        if (this.serverAvailable) {
            try {
                const response = await window.apiClient.login(email, password);
                return response.user;
            } catch (error) {
                console.warn('📊 Server auth failed, trying local fallback:', error);
            }
        }

        // Fallback to local authentication
        return window.authenticateUser ? window.authenticateUser(email, password) : null;
    }

    async validateSession() {
        if (this.serverAvailable) {
            try {
                return await window.apiClient.validateSession();
            } catch (error) {
                console.warn('📊 Server session validation failed, using local fallback');
            }
        }

        // Fallback to local session validation
        return window.validateSession ? window.validateSession() : null;
    }
}

// Create global instance
window.dataPersistence = new DataPersistenceManager();

// Enhanced global functions that use the persistence manager
window.getUsers = async function() {
    await window.dataPersistence.initializationPromise;
    return await window.dataPersistence.getUsers();
};

window.addUser = async function(userData) {
    await window.dataPersistence.initializationPromise;
    return await window.dataPersistence.addUser(userData);
};

window.updateUser = async function(userId, updates) {
    await window.dataPersistence.initializationPromise;
    return await window.dataPersistence.updateUser(userId, updates);
};

window.getAppointments = async function(params = {}) {
    await window.dataPersistence.initializationPromise;
    return await window.dataPersistence.getAppointments(params);
};

window.addAppointment = async function(appointmentData) {
    await window.dataPersistence.initializationPromise;
    return await window.dataPersistence.createAppointment(appointmentData);
};

window.updateAppointment = async function(appointmentId, updates) {
    await window.dataPersistence.initializationPromise;
    return await window.dataPersistence.updateAppointment(appointmentId, updates);
};

window.cancelAppointmentSecure = async function(appointmentId, reason) {
    await window.dataPersistence.initializationPromise;
    return await window.dataPersistence.cancelAppointment(appointmentId, reason);
};

window.authenticateUserSecure = async function(email, password) {
    await window.dataPersistence.initializationPromise;
    return await window.dataPersistence.authenticateUser(email, password);
};

window.validateSessionSecure = async function() {
    await window.dataPersistence.initializationPromise;
    return await window.dataPersistence.validateSession();
};

// Periodic server status check and sync
setInterval(async () => {
    if (window.dataPersistence) {
        const wasOnline = window.dataPersistence.serverAvailable;
        await window.dataPersistence.checkServerStatus();
        
        // If we just came back online, sync queued data
        if (!wasOnline && window.dataPersistence.serverAvailable) {
            console.log('📊 Server came back online, processing sync queue...');
            await window.dataPersistence.processSyncQueue();
        }
    }
}, 30000); // Check every 30 seconds

console.log('📊 Data Persistence Manager loaded and ready');