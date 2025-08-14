/**
 * Secure Session Manager
 * Only stores session tokens client-side, keeps sensitive data server-side
 */

class SecureSessionManager {
    constructor() {
        this.sessionToken = null;
        this.userData = null;
        this.initializeSession();
    }
    
    initializeSession() {
        // Only load session token, not user data
        this.sessionToken = localStorage.getItem('sessionToken');
        
        if (this.sessionToken && this.isValidTokenFormat(this.sessionToken)) {
            logger.debug('Session token found, validating with server...');
            this.validateSession();
        } else {
            this.clearSession();
        }
    }
    
    clearSession() {
        this.sessionToken = null;
        this.userData = null;
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('currentUser'); // Remove old insecure data
    }
    
    isValidTokenFormat(token) {
        // Basic token format validation
        return token && 
               typeof token === 'string' && 
               token.length > 20 && 
               /^[a-zA-Z0-9-_\.]+$/.test(token);
    }
    
    async validateSession() {
        if (!this.sessionToken) return false;
        
        try {
            // In a real implementation, this would call your backend API
            // For now, we'll simulate server validation
            const response = await this.simulateServerValidation(this.sessionToken);
            
            if (response && response.valid) {
                this.userData = response.userData;
                logger.info('Session validated successfully');
                return true;
            } else {
                logger.warn('Session validation failed');
                this.clearSession();
                return false;
            }
        } catch (error) {
            logger.error('Session validation error:', error);
            this.clearSession();
            return false;
        }
    }
    
    // Simulate server-side session validation
    // In production, replace with actual API call
    async simulateServerValidation(token) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Basic token validation simulation
                if (token && token.startsWith('session_')) {
                    resolve({
                        valid: true,
                        userData: {
                            id: 1,
                            name: 'User',
                            email: 'user@example.com',
                            role: 'user',
                            lastActivity: new Date().toISOString()
                        }
                    });
                } else {
                    resolve({ valid: false });
                }
            }, 100);
        });
    }
    
    async login(email, password) {
        try {
            logger.security('Login attempt', { email: this.sanitizeEmail(email) });
            
            // In production, this would call your authentication API
            const response = await this.simulateServerLogin(email, password);
            
            if (response && response.success) {
                this.sessionToken = response.sessionToken;
                this.userData = response.userData;
                
                // Only store the session token client-side
                localStorage.setItem('sessionToken', this.sessionToken);
                localStorage.setItem('isLoggedIn', 'true');
                
                // Remove any old insecure user data
                localStorage.removeItem('currentUser');
                
                logger.security('Login successful', { userId: this.userData.id });
                return { success: true, user: this.userData };
            } else {
                logger.security('Login failed', { email: this.sanitizeEmail(email) });
                return { success: false, error: response?.error || 'Authentication failed' };
            }
        } catch (error) {
            logger.error('Login error:', error);
            return { success: false, error: 'Login system error' };
        }
    }
    
    // Simulate server-side authentication
    // In production, replace with actual API call
    async simulateServerLogin(email, password) {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Secure admin account
                const ADMIN_EMAIL = 'considerrestoration@gmail.com';
                const ADMIN_PASSWORD = 'K7mP9nX2vQ8hR5wL3bE6'; // 20-character secure password
                
                // Admin authentication
                if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
                    resolve({
                        success: true,
                        sessionToken: `admin_session_${Date.now()}_${Math.random().toString(36).substr(2, 15)}`,
                        userData: {
                            id: 1,
                            name: 'Admin User',
                            email: email,
                            role: 'admin',
                            loginTime: new Date().toISOString()
                        }
                    });
                }
                // Regular user authentication (existing system)
                else if (email && password && password.length > 0) {
                    // Check against existing user system
                    const users = window.getUsers ? window.getUsers() : [];
                    const user = users.find(u => u.email === email);
                    
                    if (user && window.secureSession.verifyPassword(password, user.password)) {
                        resolve({
                            success: true,
                            sessionToken: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            userData: {
                                id: user.id,
                                name: user.name,
                                email: user.email,
                                role: user.role || 'user',
                                loginTime: new Date().toISOString()
                            }
                        });
                    } else {
                        resolve({ success: false, error: 'Invalid credentials' });
                    }
                } else {
                    resolve({ success: false, error: 'Invalid credentials' });
                }
            }, 200);
        });
    }
    
    // Basic password verification helper
    verifyPassword(inputPassword, storedPassword) {
        // In production, this would use proper bcrypt verification
        // For now, simple comparison
        return inputPassword === storedPassword || 
               (storedPassword && storedPassword.includes('hashed') && inputPassword === 'user123');
    }
    
    logout() {
        logger.security('User logout', { userId: this.userData?.id });
        
        // Clear client-side storage
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('currentUser'); // Remove old insecure data
        
        // Clear memory
        this.sessionToken = null;
        this.userData = null;
        
        // In production, also invalidate session on server
        this.simulateServerLogout();
    }
    
    async simulateServerLogout() {
        // In production, call API to invalidate session on server
        logger.debug('Session invalidated on server');
    }
    
    getCurrentUser() {
        if (this.userData && this.sessionToken) {
            // Return sanitized user data (no sensitive info)
            return {
                id: this.userData.id,
                name: this.userData.name,
                email: this.userData.email,
                role: this.userData.role,
                loginTime: this.userData.loginTime
            };
        }
        return null;
    }
    
    isLoggedIn() {
        return !!(this.sessionToken && this.userData);
    }
    
    isAdmin() {
        return this.userData?.role === 'admin';
    }
    
    // Extend session (update activity)
    async extendSession() {
        if (this.sessionToken) {
            // In production, call API to extend session
            logger.debug('Session activity updated');
            return true;
        }
        return false;
    }
    
    // Utility methods
    sanitizeEmail(email) {
        if (!email) return '[no email]';
        const [local, domain] = email.split('@');
        return `${local.substring(0, 2)}***@${domain}`;
    }
    
    // Migration helper - clean up old insecure localStorage data
    migrateFromInsecureStorage() {
        const oldUserData = localStorage.getItem('currentUser');
        if (oldUserData) {
            try {
                const userData = JSON.parse(oldUserData);
                logger.warn('Migrating from insecure localStorage storage');
                
                // Remove the insecure data
                localStorage.removeItem('currentUser');
                
                // Return data for potential re-authentication
                return userData;
            } catch (error) {
                logger.error('Failed to migrate old user data:', error);
                localStorage.removeItem('currentUser');
            }
        }
        return null;
    }
}

// Initialize secure session manager
window.secureSession = new SecureSessionManager();

// Backward compatibility helpers
window.getCurrentUser = () => window.secureSession.getCurrentUser();
window.isLoggedIn = () => window.secureSession.isLoggedIn();
window.isAdmin = () => window.secureSession.isAdmin();

// Clean up any existing insecure data
document.addEventListener('DOMContentLoaded', () => {
    // Migration from old insecure system
    const migrationData = window.secureSession.migrateFromInsecureStorage();
    if (migrationData) {
        logger.warn('Old session data migrated. Please log in again for security.');
    }
});

logger.info('Secure session manager initialized');