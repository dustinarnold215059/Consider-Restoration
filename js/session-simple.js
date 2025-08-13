// Simple Session Management - No complex monitoring to prevent performance issues
// Lightweight version to fix page responsiveness

class SimpleSessionManager {
    constructor() {
        this.initialized = false;
        this.currentUser = null;
    }

    initialize() {
        if (this.initialized) return;

        console.log('🔐 Initializing Simple Session Manager...');
        
        try {
            // Just check current session without complex monitoring
            this.currentUser = this.validateCurrentSession();
            this.initialized = true;
            
            console.log('✅ Simple Session Manager initialized');
            console.log('🔐 Current user:', this.currentUser ? this.currentUser.name : 'Not logged in');
            
            // Single event to update navigation
            this.updateNavigation();
            
        } catch (error) {
            console.error('❌ Simple Session Manager initialization failed:', error);
        }
    }

    validateCurrentSession() {
        try {
            const storedUser = localStorage.getItem('currentUser');
            const isLoggedIn = localStorage.getItem('isLoggedIn');
            
            if (!storedUser || isLoggedIn !== 'true') {
                return null;
            }
            
            const user = JSON.parse(storedUser);
            
            // Basic validation - only check essential fields
            if (!user.id || !user.email) {
                console.warn('🔐 Invalid session data');
                this.clearSession();
                return null;
            }
            
            // Check session age (7 days)
            if (user.loginTime) {
                const loginTime = new Date(user.loginTime);
                const now = new Date();
                const sessionAge = now - loginTime;
                const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
                
                if (sessionAge > maxAge) {
                    console.warn('🔐 Session expired');
                    this.clearSession();
                    return null;
                }
            }
            
            return user;
            
        } catch (error) {
            console.error('🔐 Session validation error:', error);
            return null;
        }
    }

    updateNavigation() {
        // Update navigation elements
        const adminNavLink = document.getElementById('adminNavLink');
        const accountNavLink = document.getElementById('accountNavLink');
        
        // Retry if elements not found yet
        if (!adminNavLink || !accountNavLink) {
            setTimeout(() => this.updateNavigation(), 100);
            return;
        }
        
        if (this.currentUser) {
            if (this.currentUser.role === 'admin') {
                adminNavLink.style.display = 'block';
                accountNavLink.textContent = 'My Account';
            } else {
                adminNavLink.style.display = 'none';
                accountNavLink.textContent = 'My Account';
            }
            console.log('🔐 Navigation updated for logged in user:', this.currentUser.name);
        } else {
            adminNavLink.style.display = 'none';
            accountNavLink.textContent = 'Login';
            console.log('🔐 Navigation updated for logged out user');
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    }

    login(userData) {
        console.log('🔐 Logging in user:', userData.name);
        
        // Create session
        const sessionUser = {
            ...userData,
            loginTime: new Date().toISOString()
        };

        // Store session
        localStorage.setItem('currentUser', JSON.stringify(sessionUser));
        localStorage.setItem('isLoggedIn', 'true');
        
        // Update internal state
        this.currentUser = sessionUser;
        
        // Update navigation
        this.updateNavigation();
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('userAuthChanged', {
            detail: { user: this.currentUser }
        }));
        
        console.log('✅ User logged in successfully');
    }

    logout() {
        console.log('🔐 Logging out user');
        
        this.clearSession();
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('userLoggedOut'));
        
        // Redirect if needed
        if (window.location.pathname.includes('admin.html') || 
            window.location.pathname.includes('user-portal.html')) {
            window.location.href = 'index.html';
        }
    }

    clearSession() {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('isLoggedIn');
        this.currentUser = null;
        this.updateNavigation();
    }
}

// Create global instance
window.SimpleSessionManager = new SimpleSessionManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.SimpleSessionManager.initialize();
    });
} else {
    // DOM already ready
    setTimeout(() => {
        window.SimpleSessionManager.initialize();
    }, 100);
}

// Convenience global functions
window.getCurrentUser = () => window.SimpleSessionManager.getCurrentUser();
window.isLoggedIn = () => window.SimpleSessionManager.isLoggedIn();
window.isAdmin = () => window.SimpleSessionManager.isAdmin();

export { SimpleSessionManager };