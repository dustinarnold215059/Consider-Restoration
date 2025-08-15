// Cookie-Based Session Management System
// More reliable than localStorage for session persistence
console.log('🍪 Cookie Session Manager script loading...');

class CookieSessionManager {
    constructor() {
        this.initialized = false;
        this.currentUser = null;
        this.sessionCookieName = 'cr_session';
        this.userCookieName = 'cr_user';
    }

    initialize() {
        if (this.initialized) return;

        console.log('🍪 Cookie Session Manager initializing...');
        console.log('🍪 SESSION PERSISTENCE DISABLED - clearing all sessions');
        
        try {
            // RE-ENABLE SESSION RESTORATION with proper role isolation
            console.log('🍪 Checking for existing session with role isolation...');
            
            // Check current page to determine which session to load
            const currentPage = window.location.pathname;
            const isAdminPage = currentPage.includes('admin.html');
            const isUserPortal = currentPage.includes('user-portal.html');
            
            if (isAdminPage) {
                // On admin page - only load admin sessions
                this.clearUserSessionData();
                this.currentUser = this.validateAdminSession();
                console.log('🍪 Admin page - loaded admin session only');
            } else if (isUserPortal) {
                // On user portal - only load user sessions
                this.clearAdminSessionData();
                this.currentUser = this.validateUserSession();
                console.log('🍪 User portal - loaded user session only');
            } else {
                // On other pages - validate any existing session but don't auto-restore
                this.currentUser = this.validateCurrentSession();
                console.log('🍪 Other page - validated existing session');
            }
            
            this.initialized = true;
            
            console.log('✅ Cookie Session Manager initialized with role isolation');
            console.log('🔐 Current user:', this.currentUser ? `${this.currentUser.name} (${this.currentUser.role})` : 'Not logged in');
            
            // Update navigation to logged out state
            this.updateNavigation();
            
        } catch (error) {
            console.error('❌ Cookie Session Manager initialization failed:', error);
        }
    }

    // Cookie utility methods with localStorage fallback
    setCookie(name, value, days = 7) {
        // First try cookies
        try {
            // Skip cookies for file:// protocol
            if (location.protocol === 'file:') {
                console.log('🍪 File protocol detected, using localStorage fallback');
                return this.setLocalStorageFallback(name, value, days);
            }
            
            let expires = '';
            if (days) {
                const date = new Date();
                date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                expires = '; expires=' + date.toUTCString();
            }
            
            // Set cookie with security flags
            const secure = location.protocol === 'https:' ? '; Secure' : '';
            const sameSite = '; SameSite=Lax';
            
            const cookieString = `${name}=${encodeURIComponent(value)}${expires}; path=/${secure}${sameSite}`;
            document.cookie = cookieString;
            
            // Verify the cookie was set (but don't recursively call getCookie)
            const testValue = this.getCookieRaw(name);
            console.log('🍪 Cookie set:', name, '- Verification:', testValue ? 'SUCCESS' : 'FAILED');
            
            if (!testValue) {
                console.log('🍪 Cookie failed, falling back to localStorage');
                return this.setLocalStorageFallback(name, value, days);
            }
            
            return true;
        } catch (error) {
            console.error('🍪 Error setting cookie, using localStorage fallback:', error);
            return this.setLocalStorageFallback(name, value, days);
        }
    }

    getCookieRaw(name) {
        try {
            const nameEQ = name + '=';
            const ca = document.cookie.split(';');
            
            for (let i = 0; i < ca.length; i++) {
                let c = ca[i].trim();
                if (c.indexOf(nameEQ) === 0) {
                    return decodeURIComponent(c.substring(nameEQ.length, c.length));
                }
            }
            return null;
        } catch (error) {
            console.error('🍪 Error reading cookie:', error);
            return null;
        }
    }

    getCookie(name) {
        // Try cookies first
        if (location.protocol !== 'file:') {
            const cookieValue = this.getCookieRaw(name);
            if (cookieValue) {
                return cookieValue;
            }
        }
        
        // Fallback to localStorage
        return this.getLocalStorageFallback(name);
    }

    // localStorage fallback methods
    setLocalStorageFallback(name, value, days) {
        try {
            const item = {
                value: value,
                expires: days ? Date.now() + (days * 24 * 60 * 60 * 1000) : null
            };
            localStorage.setItem(`cr_cookie_${name}`, JSON.stringify(item));
            console.log('💾 localStorage fallback set:', name);
            return true;
        } catch (error) {
            console.error('💾 localStorage fallback failed:', error);
            return false;
        }
    }

    getLocalStorageFallback(name) {
        try {
            const itemStr = localStorage.getItem(`cr_cookie_${name}`);
            if (!itemStr) {
                return null;
            }
            
            const item = JSON.parse(itemStr);
            
            // Check expiration
            if (item.expires && Date.now() > item.expires) {
                localStorage.removeItem(`cr_cookie_${name}`);
                return null;
            }
            
            return item.value;
        } catch (error) {
            console.error('💾 Error reading localStorage fallback:', error);
            return null;
        }
    }

    deleteLocalStorageFallback(name) {
        try {
            localStorage.removeItem(`cr_cookie_${name}`);
            return true;
        } catch (error) {
            console.error('💾 Error deleting localStorage fallback:', error);
            return false;
        }
    }

    deleteCookie(name) {
        try {
            // Delete actual cookie
            if (location.protocol !== 'file:') {
                document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            }
            
            // Also delete localStorage fallback
            this.deleteLocalStorageFallback(name);
            
            return true;
        } catch (error) {
            console.error('🍪 Error deleting cookie:', error);
            return false;
        }
    }

    validateCurrentSession() {
        try {
            const sessionData = this.getCookie(this.sessionCookieName);
            const userData = this.getCookie(this.userCookieName);
            
            if (!sessionData || !userData || sessionData !== 'active') {
                return null;
            }
            
            const user = JSON.parse(userData);
            
            // Basic validation - check essential fields
            if (!user.id || !user.email || !user.name) {
                console.warn('🔐 Invalid session data in cookies');
                this.clearSession();
                return null;
            }
            
            // Check session age (7 days max)
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
            
            console.log('🍪 Valid session found in cookies');
            return user;
            
        } catch (error) {
            console.error('🔐 Session validation error:', error);
            this.clearSession();
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

    login(userData) {
        console.log('🔐 Logging in user:', userData.name);
        
        try {
            // Create session data
            const sessionUser = {
                ...userData,
                loginTime: new Date().toISOString()
            };

            // Store in cookies
            const userDataStored = this.setCookie(this.userCookieName, JSON.stringify(sessionUser), 7);
            const sessionStored = this.setCookie(this.sessionCookieName, 'active', 7);
            
            if (!userDataStored || !sessionStored) {
                throw new Error('Failed to store session in cookies');
            }
            
            // Update internal state
            this.currentUser = sessionUser;
            
            // Update navigation
            this.updateNavigation();
            
            // Dispatch event
            window.dispatchEvent(new CustomEvent('userAuthChanged', {
                detail: { user: this.currentUser }
            }));
            
            console.log('✅ User logged in successfully with cookies');
            return true;
            
        } catch (error) {
            console.error('❌ Login failed:', error);
            return false;
        }
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
        // Delete cookies
        this.deleteCookie(this.sessionCookieName);
        this.deleteCookie(this.userCookieName);
        
        // Clear internal state
        this.currentUser = null;
        
        // Update navigation
        this.updateNavigation();
        
        console.log('🍪 Session cleared from cookies');
    }

    clearAllSessionData() {
        // Clear all possible session-related storage
        const keysToRemove = [
            'sessionToken', 'isLoggedIn', 'currentUser', 'adminUser', 'isAdmin',
            'userData', 'userSession', 'adminSession', 'authToken', 'userToken',
            'adminSessionToken', 'userSessionToken',
            'cr_session', 'cr_user', 'cr_cookie_cr_session', 'cr_cookie_cr_user'
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
            this.deleteCookie(key);
        });
        
        // Clear all cookies
        document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        
        console.log('🍪 All session data completely cleared');
    }

    clearUserSessionData() {
        // Clear only user session data
        const userKeys = ['userSessionToken', 'userSession', 'isLoggedIn'];
        userKeys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
            this.deleteCookie(key);
        });
        console.log('🍪 User session data cleared');
    }

    clearAdminSessionData() {
        // Clear only admin session data
        const adminKeys = ['adminSessionToken', 'adminSession', 'isAdmin', 'adminUser'];
        adminKeys.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
            this.deleteCookie(key);
        });
        console.log('🍪 Admin session data cleared');
    }

    validateAdminSession() {
        try {
            const adminData = localStorage.getItem('adminSession');
            const adminToken = localStorage.getItem('adminSessionToken');
            
            if (!adminData || !adminToken) {
                return null;
            }
            
            const user = JSON.parse(adminData);
            
            if (!user.id || !user.email || !user.name || user.role !== 'admin') {
                console.warn('🔐 Invalid admin session data');
                this.clearAdminSessionData();
                return null;
            }
            
            console.log('🍪 Valid admin session found');
            return user;
        } catch (error) {
            console.error('🔐 Admin session validation error:', error);
            this.clearAdminSessionData();
            return null;
        }
    }

    validateUserSession() {
        try {
            const userData = localStorage.getItem('userSession');
            const userToken = localStorage.getItem('userSessionToken');
            
            if (!userData || !userToken) {
                return null;
            }
            
            const user = JSON.parse(userData);
            
            if (!user.id || !user.email || !user.name || user.role === 'admin') {
                console.warn('🔐 Invalid user session data');
                this.clearUserSessionData();
                return null;
            }
            
            console.log('🍪 Valid user session found');
            return user;
        } catch (error) {
            console.error('🔐 User session validation error:', error);
            this.clearUserSessionData();
            return null;
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

    // Refresh session (check if still valid)
    refreshSession() {
        const previousUser = this.currentUser;
        this.currentUser = this.validateCurrentSession();
        
        // If session state changed, update navigation
        if ((previousUser === null) !== (this.currentUser === null)) {
            this.updateNavigation();
        }
        
        return this.currentUser;
    }
}

// Create global instance
window.CookieSessionManager = new CookieSessionManager();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.CookieSessionManager.initialize();
    });
} else {
    // DOM already ready
    setTimeout(() => {
        window.CookieSessionManager.initialize();
    }, 50);
}

// Global convenience functions
window.getCurrentUser = () => window.CookieSessionManager.getCurrentUser();
window.isLoggedIn = () => window.CookieSessionManager.isLoggedIn();
window.isAdmin = () => window.CookieSessionManager.isAdmin();
window.loginUser = (userData) => window.CookieSessionManager.login(userData);
window.logoutUser = () => window.CookieSessionManager.logout();
window.refreshUserSession = () => window.CookieSessionManager.refreshSession();

// RE-ENABLED - Periodic session refresh with role isolation
setInterval(() => {
    if (window.CookieSessionManager.initialized) {
        console.log('🍪 Periodic session refresh with role isolation');
        window.CookieSessionManager.refreshSession();
    }
}, 5 * 60 * 1000);

console.log('🍪 Periodic session refresh ENABLED with role isolation');

// Export removed for browser compatibility
// Use window.CookieSessionManager to access the instance