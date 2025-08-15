// Universal Session Manager
// Works on ALL pages with role isolation
// Prevents admin/user session contamination

console.log('🔐 Universal Session Manager loading...');

class UniversalSessionManager {
    constructor() {
        this.currentUser = null;
        this.sessionKey = null;
        this.currentPage = window.location.pathname;
        
        // Initialize on all pages
        this.initialize();
    }
    
    getPageType() {
        const currentPage = this.currentPage;
        const isUserPortal = currentPage.includes('user-portal.html');
        const isAdminPage = currentPage.includes('admin.html');
        const isBookingPage = currentPage.includes('booking.html');
        const isIndexPage = currentPage.includes('index.html') || currentPage === '/';
        
        console.log('🔐 Page analysis:', currentPage);
        console.log('🔐 Is user portal:', isUserPortal);
        console.log('🔐 Is admin page:', isAdminPage);
        console.log('🔐 Is booking page:', isBookingPage);
        console.log('🔐 Is index page:', isIndexPage);
        
        return {
            isUserPortal,
            isAdminPage, 
            isBookingPage,
            isIndexPage,
            isPublicPage: !isUserPortal && !isAdminPage
        };
    }
    
    initialize() {
        console.log('🔐 Initializing universal session manager...');
        
        const pageType = this.getPageType();
        
        if (pageType.isAdminPage) {
            // Admin page - only load admin sessions, clear user data
            this.sessionKey = 'admin_session_data';
            this.clearUserSession();
            this.currentUser = this.loadAdminSession();
            console.log('🔐 Admin page - loaded admin session only');
        } else if (pageType.isUserPortal) {
            // User portal - only load user sessions, clear admin data
            this.sessionKey = 'user_session_data';
            this.clearAdminSession();
            this.currentUser = this.loadUserSession();
            console.log('🔐 User portal - loaded user session only');
        } else {
            // Public pages - load any valid session but don't clear others
            // This allows both users and admins to see proper navigation
            const adminSession = this.loadAdminSession();
            const userSession = this.loadUserSession();
            
            if (adminSession) {
                this.currentUser = adminSession;
                this.sessionKey = 'admin_session_data';
                console.log('🔐 Public page - admin session detected');
            } else if (userSession) {
                this.currentUser = userSession;
                this.sessionKey = 'user_session_data';
                console.log('🔐 Public page - user session detected');
            } else {
                this.currentUser = null;
                console.log('🔐 Public page - no sessions found');
            }
        }
        
        console.log('🔐 Current user:', this.currentUser ? `${this.currentUser.name} (${this.currentUser.role})` : 'None');
        
        // Update navigation for all pages
        setTimeout(() => this.updateNavigation(), 100);
    }
    
    loadAdminSession() {
        try {
            const sessionData = localStorage.getItem('admin_session_data');
            if (!sessionData) return null;
            
            const data = JSON.parse(sessionData);
            
            // Validate admin session
            if (data.role === 'admin' && data.email && data.name && data.loginTime) {
                // Check if session is still valid (7 days)
                const loginTime = new Date(data.loginTime);
                const now = new Date();
                const sessionAge = now - loginTime;
                const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
                
                if (sessionAge < maxAge) {
                    console.log('🔐 Valid admin session found');
                    return data;
                }
            }
            
            // Invalid session - clear it
            this.clearAdminSession();
            return null;
        } catch (error) {
            console.error('🔐 Error loading admin session:', error);
            this.clearAdminSession();
            return null;
        }
    }
    
    loadUserSession() {
        try {
            const sessionData = localStorage.getItem('user_session_data');
            if (!sessionData) return null;
            
            const data = JSON.parse(sessionData);
            
            // Validate user session
            if (data.role !== 'admin' && data.email && data.name && data.loginTime) {
                // Check if session is still valid (7 days)
                const loginTime = new Date(data.loginTime);
                const now = new Date();
                const sessionAge = now - loginTime;
                const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
                
                if (sessionAge < maxAge) {
                    console.log('🔐 Valid user session found');
                    return data;
                }
            }
            
            // Invalid session - clear it
            this.clearUserSession();
            return null;
        } catch (error) {
            console.error('🔐 Error loading user session:', error);
            this.clearUserSession();
            return null;
        }
    }
    
    updateNavigation() {
        // Update navigation elements based on current session
        const adminNavLink = document.getElementById('adminNavLink');
        const accountNavLink = document.getElementById('accountNavLink');
        
        if (!adminNavLink || !accountNavLink) {
            console.log('🔐 Navigation elements not found - retrying in 200ms');
            setTimeout(() => this.updateNavigation(), 200);
            return;
        }
        
        if (this.currentUser) {
            // User is logged in
            if (this.currentUser.role === 'admin') {
                // Admin user
                adminNavLink.classList.add('admin-authenticated');
                adminNavLink.style.display = 'block';
                accountNavLink.textContent = 'Admin Panel';
                accountNavLink.href = 'admin.html';
                console.log('🔐 Navigation updated for admin:', this.currentUser.name);
            } else {
                // Regular user
                adminNavLink.classList.remove('admin-authenticated');
                adminNavLink.style.display = 'none';
                accountNavLink.textContent = 'My Account';
                accountNavLink.href = 'user-portal.html';
                console.log('🔐 Navigation updated for user:', this.currentUser.name);
            }
        } else {
            // No user logged in
            adminNavLink.classList.remove('admin-authenticated');
            adminNavLink.style.display = 'none';
            accountNavLink.textContent = 'Login';
            accountNavLink.href = 'user-portal.html';
            console.log('🔐 Navigation updated for guest');
        }
    }

    saveSession(userData) {
        const pageType = this.getPageType();
        
        // Allow session saving on portal pages and during login flows
        if (!pageType.isUserPortal && !pageType.isAdminPage) {
            console.log('🔐 Public page - session save allowed for login flows');
        }
        
        try {
            const sessionData = {
                ...userData,
                loginTime: new Date().toISOString()
            };
            
            if (userData.role === 'admin') {
                localStorage.setItem('admin_session_data', JSON.stringify(sessionData));
                this.clearUserSession(); // Ensure no user session contamination
                console.log('🔐 Admin session saved');
            } else {
                localStorage.setItem('user_session_data', JSON.stringify(sessionData));
                this.clearAdminSession(); // Ensure no admin session contamination
                console.log('🔐 User session saved');
            }
            
            this.currentUser = sessionData;
            return true;
        } catch (error) {
            console.error('🔐 Error saving session:', error);
            return false;
        }
    }
    
    clearAdminSession() {
        localStorage.removeItem('admin_session_data');
        localStorage.removeItem('adminSessionToken');
        localStorage.removeItem('adminSession');
        localStorage.removeItem('isAdmin');
        console.log('🔐 Admin session cleared');
    }
    
    clearUserSession() {
        localStorage.removeItem('user_session_data');
        localStorage.removeItem('userSessionToken');
        localStorage.removeItem('userSession');
        localStorage.removeItem('isLoggedIn');
        console.log('🔐 User session cleared');
    }
    
    clearAllSessions() {
        this.clearAdminSession();
        this.clearUserSession();
        this.currentUser = null;
        console.log('🔐 All portal sessions cleared');
    }
    
    logout() {
        if (this.currentUser) {
            console.log('🔐 Logging out:', this.currentUser.name);
            
            if (this.currentUser.role === 'admin') {
                this.clearAdminSession();
            } else {
                this.clearUserSession();
            }
            
            this.currentUser = null;
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
    
    // For compatibility with existing code
    login(userData) {
        return this.saveSession(userData);
    }
}

// Create instance on ALL pages
window.universalSession = new UniversalSessionManager();

// Compatibility functions for all pages
window.getCurrentUser = () => window.universalSession.getCurrentUser();
window.isLoggedIn = () => window.universalSession.isLoggedIn();
window.isAdmin = () => window.universalSession.isAdmin();
window.loginUser = (userData) => window.universalSession.login(userData);
window.logoutUser = () => window.universalSession.logout();

// Keep legacy reference for existing code
window.portalSession = window.universalSession;

console.log('🔐 Universal Session Manager initialized for all pages');