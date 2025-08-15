// Navigation Handler for User Session
// Updates navigation elements based on login status
console.log('🚀 Navigation handler loaded');

function updateNavigationForUser() {
    console.log('🔄 Navigation update - SESSION PERSISTENCE DISABLED');
    
    const adminNavLink = document.getElementById('adminNavLink');
    const accountNavLink = document.getElementById('accountNavLink');
    
    // Check if navigation elements exist
    if (!adminNavLink || !accountNavLink) {
        console.log('❌ Navigation elements not found');
        console.log('adminNavLink:', !!adminNavLink, 'accountNavLink:', !!accountNavLink);
        return;
    }
    
    try {
        // Check for valid session with proper role isolation
        if (typeof window.secureSession === 'undefined') {
            console.log('⏳ SecureSession not ready, retrying in 100ms');
            setTimeout(updateNavigationForUser, 100);
            return;
        }
        
        const currentUser = window.secureSession.getCurrentUser();
        const isLoggedIn = window.secureSession.isLoggedIn();
        const isAdmin = window.secureSession.isAdmin();
        
        console.log('🔐 Current user check:', currentUser ? `${currentUser.name} (${currentUser.role})` : 'Not logged in');
        console.log('🔐 Is admin:', isAdmin);
        
        if (isLoggedIn && currentUser) {
            // User is logged in
            accountNavLink.textContent = 'My Account';
            accountNavLink.href = 'user-portal.html';
            
            if (isAdmin) {
                adminNavLink.classList.add('admin-authenticated');
                console.log('👑 Admin navigation shown for admin user');
            } else {
                adminNavLink.classList.remove('admin-authenticated');
                console.log('👤 Admin navigation hidden for regular user');
            }
        } else {
            // User is not logged in
            adminNavLink.classList.remove('admin-authenticated');
            accountNavLink.textContent = 'Login';
            accountNavLink.href = 'user-portal.html';
            console.log('🚪 Guest navigation - admin hidden, login shown');
        }
        
        /* DISABLED - Automatic session checking
        const currentUser = window.secureSession.getCurrentUser();
        const isLoggedIn = window.secureSession.isLoggedIn();
        const isAdmin = window.secureSession.isAdmin();
        
        console.log('🔐 Current user check:', currentUser ? currentUser.name : 'Not logged in');
        console.log('🔐 Is admin:', isAdmin);
        
        if (isLoggedIn && currentUser) {
            // User is logged in
            accountNavLink.textContent = 'My Account';
            accountNavLink.href = 'user-portal.html';
            
            if (isAdmin) {
                adminNavLink.classList.add('admin-authenticated');
                console.log('👑 Admin navigation shown for admin user');
            } else {
                adminNavLink.classList.remove('admin-authenticated');
                console.log('👤 Admin navigation hidden for regular user');
            }
        } else {
            // User is not logged in
            adminNavLink.classList.remove('admin-authenticated');
            accountNavLink.textContent = 'Login';
            accountNavLink.href = 'user-portal.html';
            console.log('🚪 Guest navigation - admin hidden, login shown');
        }
        */
    } catch (error) {
        console.error('❌ Error updating navigation:', error);
    }
}

// Initialize navigation update
function initializeNavigation() {
    console.log('🎯 Initializing navigation handler');
    
    // Update navigation on page load
    setTimeout(updateNavigationForUser, 200);
    
    // Listen for authentication events
    window.addEventListener('userAuthChanged', (event) => {
        console.log('🔄 User authentication changed, updating navigation');
        setTimeout(updateNavigationForUser, 100);
    });
    
    window.addEventListener('userLoggedOut', () => {
        console.log('🚪 User logged out, updating navigation');
        setTimeout(updateNavigationForUser, 100);
    });
    
    // Periodic refresh to catch any missed updates
    setInterval(updateNavigationForUser, 30000); // Every 30 seconds
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNavigation);
} else {
    // DOM already ready
    setTimeout(initializeNavigation, 100);
}

// Export for manual use
window.updateNavigationForUser = updateNavigationForUser;