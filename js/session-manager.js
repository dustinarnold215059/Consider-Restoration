// Session Management System
// Ensures consistent user session persistence across all pages

class SessionManager {
    constructor() {
        this.initialized = false;
        this.currentUser = null;
        this.checkInterval = null;
        this.validating = false; // Prevent recursion
    }

    async initialize() {
        if (this.initialized) return;

        console.log('🔐 Initializing Session Manager...');
        
        try {
            // Wait for shared data to be available
            await this.waitForSharedData();
            
            // Check current session
            this.currentUser = this.validateCurrentSession();
            
            // Set up session monitoring
            this.setupSessionMonitoring();
            
            // Set up navigation event handlers
            this.setupNavigationHandlers();
            
            this.initialized = true;
            console.log('✅ Session Manager initialized');
            
            // Notify other components about current session state
            this.notifySessionState();
            
        } catch (error) {
            console.error('❌ Session Manager initialization failed:', error);
        }
    }

    async waitForSharedData() {
        let attempts = 0;
        while (!window.getUsers && attempts < 20) { // Reduced from 50 to 20
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        // Don't fail if shared data isn't available - just continue
        if (!window.getUsers) {
            console.log('🔐 Shared data not available, SessionManager will work without it');
        }
    }

    validateCurrentSession() {
        // Prevent recursion
        if (this.validating) {
            return this.currentUser;
        }
        
        this.validating = true;
        
        try {
            const storedUser = localStorage.getItem('currentUser');
            const isLoggedIn = localStorage.getItem('isLoggedIn');
            
            if (!storedUser || isLoggedIn !== 'true') {
                console.log('🔐 No valid session found');
                return null;
            }
            
            const user = JSON.parse(storedUser);
            console.log('🔐 Validating session for user:', user.name);
            
            // Basic validation checks
            if (!user.id || !user.email) {
                console.warn('🔐 Invalid user data in session');
                this.clearSession();
                return null;
            }
            
            // Check session age (extend to 7 days for better UX)
            if (user.loginTime) {
                const loginTime = new Date(user.loginTime);
                const now = new Date();
                const sessionAge = now - loginTime;
                const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
                
                if (sessionAge > maxAge) {
                    console.warn('🔐 Session expired after 7 days');
                    this.clearSession();
                    return null;
                }
            }
            
            // Verify user still exists in system (but don't be too strict)
            if (window.getUsers) {
                const allUsers = window.getUsers();
                const currentUser = allUsers.find(u => u.id === user.id || u.email === user.email);
                
                if (currentUser) {
                    // Update session with any new user data
                    const updatedUser = {
                        ...user,
                        name: currentUser.name, // Update name in case it changed
                        role: currentUser.role  // Update role in case it changed
                    };
                    
                    // Save updated session
                    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                    console.log('✅ Session validated and updated for:', updatedUser.name);
                    return updatedUser;
                } else {
                    console.log('🔐 User not found in system, but keeping session for offline use');
                    // Don't clear session if user data isn't available (could be offline)
                    return user;
                }
            } else {
                console.log('🔐 User validation system not available, keeping session');
                return user;
            }
            
        } catch (error) {
            console.error('🔐 Session validation error:', error);
            // Don't clear session on parse errors - might be temporary
            return null;
        } finally {
            this.validating = false;
        }
    }

    setupSessionMonitoring() {
        // Check session every 5 minutes
        this.checkInterval = setInterval(() => {
            const validUser = this.validateCurrentSession();
            
            if (validUser !== this.currentUser) {
                this.currentUser = validUser;
                this.notifySessionState();
            }
        }, 5 * 60 * 1000);

        // Listen for storage changes from other tabs
        window.addEventListener('storage', (e) => {
            if (e.key === 'currentUser' || e.key === 'isLoggedIn') {
                console.log('🔐 Session changed in another tab');
                setTimeout(() => {
                    this.currentUser = this.validateCurrentSession();
                    this.notifySessionState();
                }, 100);
            }
        });
    }

    setupNavigationHandlers() {
        // Listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                // Page became visible - refresh session
                this.currentUser = this.validateCurrentSession();
                this.notifySessionState();
            }
        });

        // Listen for focus events
        window.addEventListener('focus', () => {
            this.currentUser = this.validateCurrentSession();
            this.notifySessionState();
        });

        // Ensure session is maintained on page load
        window.addEventListener('load', () => {
            this.currentUser = this.validateCurrentSession();
            this.notifySessionState();
        });
    }

    notifySessionState() {
        // Update navigation in all components
        window.dispatchEvent(new CustomEvent('userAuthChanged', {
            detail: { user: this.currentUser }
        }));

        // Update navigation elements if they exist
        this.updateNavigationElements();
        
        console.log('🔐 Session state notified:', this.currentUser ? this.currentUser.name : 'Not logged in');
    }

    updateNavigationElements() {
        // Update navigation in index page
        const adminNavLink = document.getElementById('adminNavLink');
        const accountNavLink = document.getElementById('accountNavLink');
        
        if (adminNavLink && accountNavLink) {
            if (this.currentUser) {
                if (this.currentUser.role === 'admin') {
                    adminNavLink.style.display = 'block';
                    accountNavLink.textContent = 'My Account';
                    accountNavLink.href = 'user-portal.html';
                } else {
                    adminNavLink.style.display = 'none';
                    accountNavLink.textContent = 'My Account';
                    accountNavLink.href = 'user-portal.html';
                }
            } else {
                adminNavLink.style.display = 'none';
                accountNavLink.textContent = 'Login';
                accountNavLink.href = 'user-portal.html';
            }
        }

        // Update other navigation elements
        const userGreeting = document.getElementById('userGreeting');
        if (userGreeting) {
            if (this.currentUser) {
                userGreeting.textContent = `Welcome back, ${this.currentUser.name}!`;
                userGreeting.style.display = 'block';
            } else {
                userGreeting.style.display = 'none';
            }
        }
    }

    // Public methods
    getCurrentUser() {
        if (!this.currentUser) {
            this.currentUser = this.validateCurrentSession();
        }
        return this.currentUser;
    }

    isLoggedIn() {
        return this.getCurrentUser() !== null;
    }

    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.role === 'admin';
    }

    login(userData) {
        console.log('🔐 Logging in user:', userData.name);
        
        // Create session with extended data
        const sessionUser = {
            ...userData,
            loginTime: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };

        // Store session
        localStorage.setItem('currentUser', JSON.stringify(sessionUser));
        localStorage.setItem('isLoggedIn', 'true');
        
        // Update internal state
        this.currentUser = sessionUser;
        
        // Track session change
        if (window.ErrorLogger) {
            window.ErrorLogger.trackSessionChange('login', sessionUser);
            window.ErrorLogger.setUserId(sessionUser.id);
        }
        
        // Notify all components
        this.notifySessionState();
        
        console.log('✅ User logged in successfully:', sessionUser.name);
    }

    logout() {
        console.log('🔐 Logging out user:', this.currentUser?.name);
        
        this.clearSession();
        
        // Dispatch logout event
        window.dispatchEvent(new CustomEvent('userLoggedOut'));
        
        // Redirect if on protected page
        if (this.isProtectedPage()) {
            window.location.href = 'index.html';
        }
    }

    clearSession() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isLoggedIn');
        this.currentUser = null;
        this.notifySessionState();
    }

    updateLastActivity() {
        if (this.currentUser) {
            this.currentUser.lastActivity = new Date().toISOString();
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        }
    }

    extendSession() {
        if (this.currentUser) {
            this.currentUser.loginTime = new Date().toISOString();
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            console.log('🔐 Session extended for user:', this.currentUser.name);
        }
    }

    isProtectedPage() {
        const protectedPages = ['/admin.html', '/user-portal.html'];
        const currentPath = window.location.pathname;
        return protectedPages.some(page => currentPath.endsWith(page));
    }

    // Admin-specific methods
    requireAdmin() {
        if (!this.isAdmin()) {
            console.warn('🔐 Admin access required');
            this.showAccessDenied();
            return false;
        }
        return true;
    }

    requireLogin() {
        if (!this.isLoggedIn()) {
            console.warn('🔐 Login required');
            this.redirectToLogin();
            return false;
        }
        return true;
    }

    showAccessDenied() {
        alert('Access denied. Admin privileges required.');
        window.location.href = 'index.html';
    }

    redirectToLogin() {
        const currentPage = window.location.pathname + window.location.search;
        sessionStorage.setItem('redirectAfterLogin', currentPage);
        window.location.href = 'user-portal.html';
    }

    handlePostLoginRedirect() {
        const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
        if (redirectUrl) {
            sessionStorage.removeItem('redirectAfterLogin');
            window.location.href = redirectUrl;
        }
    }

    destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        this.initialized = false;
        this.currentUser = null;
    }
}

// Create global instance
window.SessionManager = new SessionManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.SessionManager.initialize();
    });
} else {
    window.SessionManager.initialize();
}

// Convenience global functions
window.getCurrentUser = () => window.SessionManager.getCurrentUser();
window.isLoggedIn = () => window.SessionManager.isLoggedIn();
window.isAdmin = () => window.SessionManager.isAdmin();
window.requireLogin = () => window.SessionManager.requireLogin();
window.requireAdmin = () => window.SessionManager.requireAdmin();

export { SessionManager };