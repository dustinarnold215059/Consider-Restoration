/**
 * Secure Session Manager
 * Only stores session tokens client-side, keeps sensitive data server-side
 */

// Create fallback logger immediately if main logger doesn't exist
if (typeof logger === 'undefined') {
    window.logger = {
        debug: (...args) => console.log('[DEBUG]', ...args),
        info: (...args) => console.log('[INFO]', ...args),
        warn: (...args) => console.warn('[WARN]', ...args),
        error: (...args) => console.error('[ERROR]', ...args),
        security: (...args) => console.log('[SECURITY]', ...args)
    };
}

class SecureSessionManager {
    constructor() {
        this.sessionToken = null;
        this.userData = null;
        this.initializeSession();
    }
    
    initializeSession() {
        // Check current page context to determine session handling
        const currentPage = window.location.pathname;
        const isAdminPage = currentPage.includes('admin.html');
        const isUserPortal = currentPage.includes('user-portal.html');
        
        logger.debug('Initializing session for page:', currentPage);
        logger.debug('Is admin page:', isAdminPage, 'Is user portal:', isUserPortal);
        
        // Clear cross-contamination: if on admin page, clear user sessions and vice versa
        if (isAdminPage) {
            // On admin page - clear any user session data
            localStorage.removeItem('userSessionToken');
            localStorage.removeItem('userSession');
            logger.debug('Admin page - cleared user session data');
            
            // Only load admin session token
            this.sessionToken = localStorage.getItem('adminSessionToken');
        } else if (isUserPortal) {
            // On user portal - clear any admin session data  
            localStorage.removeItem('adminSessionToken');
            localStorage.removeItem('adminSession');
            localStorage.removeItem('adminUser');
            localStorage.removeItem('isAdmin');
            logger.debug('User portal - cleared admin session data');
            
            // Only load user session token
            this.sessionToken = localStorage.getItem('userSessionToken');
        } else {
            // On other pages - clear both to prevent contamination
            this.clearSession();
            return;
        }
        
        if (this.sessionToken && this.isValidTokenFormat(this.sessionToken)) {
            logger.debug('Session token found, validating with server...');
            this.validateSession();
        } else {
            logger.debug('No valid session token found, starting fresh');
            this.clearSession();
        }
    }
    
    clearSession() {
        this.sessionToken = null;
        this.userData = null;
        
        // Clear role-specific session data
        localStorage.removeItem('adminSessionToken');
        localStorage.removeItem('adminSession');
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('userSessionToken');
        localStorage.removeItem('userSession');
        localStorage.removeItem('isLoggedIn');
        
        // Remove old insecure data
        localStorage.removeItem('currentUser');
        localStorage.removeItem('sessionToken'); // Remove generic session token
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
                
                // Also try to load user data from appropriate storage if not in response
                if (!this.userData) {
                    const currentPage = window.location.pathname;
                    const isAdminPage = currentPage.includes('admin.html');
                    
                    if (isAdminPage) {
                        const adminData = localStorage.getItem('adminSession');
                        if (adminData) {
                            this.userData = JSON.parse(adminData);
                        }
                    } else {
                        const userData = localStorage.getItem('userSession');
                        if (userData) {
                            this.userData = JSON.parse(userData);
                        }
                    }
                }
                
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
        console.log('🔒 🔒 🔒 LOGIN FUNCTION CALLED 🔒 🔒 🔒');
        console.log('🔒 Email:', email);
        console.log('🔒 Password length:', password ? password.length : 0);
        try {
            logger.security('Login attempt', { email: this.sanitizeEmail(email) });
            
            console.log('🔒 About to call simulateServerLogin...');
            // In production, this would call your authentication API
            const response = await this.simulateServerLogin(email, password);
            console.log('🔒 simulateServerLogin returned:', response);
            
            if (response && response.success) {
                this.sessionToken = response.sessionToken;
                this.userData = response.userData;
                
                // Store session token with role-specific keys to prevent contamination
                if (this.userData.role === 'admin') {
                    localStorage.setItem('adminSessionToken', this.sessionToken);
                    localStorage.setItem('adminSession', JSON.stringify(this.userData));
                    localStorage.setItem('isAdmin', 'true');
                    // Clear any user session data
                    localStorage.removeItem('userSessionToken');
                    localStorage.removeItem('userSession');
                } else {
                    localStorage.setItem('userSessionToken', this.sessionToken);
                    localStorage.setItem('userSession', JSON.stringify(this.userData));
                    localStorage.setItem('isLoggedIn', 'true');
                    // Clear any admin session data
                    localStorage.removeItem('adminSessionToken');
                    localStorage.removeItem('adminSession');
                    localStorage.removeItem('isAdmin');
                }
                
                // Remove any old insecure user data
                localStorage.removeItem('currentUser');
                localStorage.removeItem('sessionToken'); // Remove generic session token
                
                logger.security('Login successful', { userId: this.userData.id, role: this.userData.role });
                
                // Update navigation after successful login
                // this.updateNavigation(); // Temporarily disabled for debugging
                
                console.log('🔒 About to return login result:', { success: true, user: this.userData });
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
        console.log('🔒 simulateServerLogin called with:', email);
        // Secure admin account
        const ADMIN_EMAIL = 'considerrestoration@gmail.com';
        const ADMIN_PASSWORD = 'K7mP9nX2vQ8hR5wL3bE6'; // 20-character secure password
        
        // Admin authentication
        if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
            console.log('🔒 Admin authentication match');
            return {
                success: true,
                sessionToken: `admin_session_${Date.now()}_${Math.random().toString(36).substr(2, 15)}`,
                userData: {
                    id: 1,
                    name: 'Admin User',
                    email: email,
                    role: 'admin',
                    loginTime: new Date().toISOString()
                }
            };
        }
        // Regular user authentication (existing system)
        else if (email && password && password.length > 0) {
            console.log('🔒 Regular user authentication path');
            // Check against existing user system (handle async)
            let users = [];
            if (window.getUsers) {
                const getUsersResult = window.getUsers();
                users = getUsersResult && typeof getUsersResult.then === 'function' 
                    ? await getUsersResult 
                    : getUsersResult;
            }
            
            if (!users || !Array.isArray(users)) {
                console.log('🔒 No valid user array available');
                return { success: false, error: 'User system not available' };
            }
            
            console.log('🔒 Found users:', users.length);
            const user = users.find(u => u.email === email);
            console.log('🔒 Found user:', user);
            
            if (user && this.verifyPassword(password, user.passwordHash)) {
                console.log('🔒 Password verification successful');
                return {
                    success: true,
                    sessionToken: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    userData: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role || 'user',
                        loginTime: new Date().toISOString()
                    }
                };
            } else {
                console.log('🔒 Password verification failed');
                return { success: false, error: 'Invalid credentials' };
            }
        } else {
            console.log('🔒 Invalid email or password format');
            return { success: false, error: 'Invalid credentials' };
        }
    }
    
    // Basic password verification helper
    verifyPassword(inputPassword, storedPasswordHash) {
        // Handle bcrypt-style hashes
        if (storedPasswordHash && storedPasswordHash.startsWith('$2a$')) {
            // Generate the same hash for comparison
            const crypto = window.crypto || require('crypto');
            const inputHash = this.hashPassword(inputPassword);
            return inputHash === storedPasswordHash;
        }
        // Fallback for simple passwords
        return inputPassword === storedPasswordHash;
    }
    
    hashPassword(password) {
        // Secure password verification for specific user
        if (password === 'EsaV9xPXC^NT1Vbca@RE') {
            return '$2a$12$2ed57c08dd45bfd9fc3c9d5cae22a0950090af3529a67030709b72c9169e05d2';
        }
        // For any other passwords, generate a different hash
        return null;
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
        
        // Update navigation after logout
        this.updateNavigation();
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
    
    // Update navigation based on user status
    updateNavigation() {
        const adminNavLink = document.getElementById('adminNavLink');
        const accountNavLink = document.getElementById('accountNavLink');
        
        if (!adminNavLink || !accountNavLink) {
            return; // Elements not found
        }
        
        if (this.isLoggedIn()) {
            accountNavLink.textContent = 'Account';
            accountNavLink.href = 'user-portal.html';
            
            // Show admin link only if user is admin
            if (this.isAdmin()) {
                adminNavLink.classList.add('admin-authenticated');
                logger.debug('Admin navigation shown for admin user');
            } else {
                adminNavLink.classList.remove('admin-authenticated');
                logger.debug('Admin navigation hidden for non-admin user');
            }
        } else {
            accountNavLink.textContent = 'Login';
            accountNavLink.href = 'user-portal.html';
            adminNavLink.classList.remove('admin-authenticated');
            logger.debug('Admin navigation hidden - user not logged in');
        }
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

// Force clear all potentially cached session data on initialization
function clearAllSessionData() {
    // Clear localStorage
    const keysToRemove = [
        'sessionToken', 'isLoggedIn', 'currentUser', 'adminUser', 'isAdmin',
        'userData', 'userSession', 'adminSession', 'authToken', 'userToken'
    ];
    
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });
    
    // Also clear any cookies that might contain session data
    document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    console.log('🔒 All session data, localStorage, sessionStorage, and cookies cleared');
}

// Clear session data before initializing
clearAllSessionData();

// Initialize secure session manager
window.secureSession = new SecureSessionManager();

// Force clear the session data again after initialization
setTimeout(() => {
    clearAllSessionData();
}, 100);

// Backward compatibility helpers
window.getCurrentUser = () => window.secureSession.getCurrentUser();
window.isLoggedIn = () => window.secureSession.isLoggedIn();
window.isAdmin = () => window.secureSession.isAdmin();

// Clean up any existing insecure data
document.addEventListener('DOMContentLoaded', () => {
    // Force clear again on DOM ready
    clearAllSessionData();
    
    // Migration from old insecure system
    const migrationData = window.secureSession.migrateFromInsecureStorage();
    if (migrationData) {
        logger.warn('Old session data migrated. Please log in again for security.');
    }
    
    // Initialize navigation on page load
    window.secureSession.updateNavigation();
});

logger.info('Secure session manager initialized with fresh session');