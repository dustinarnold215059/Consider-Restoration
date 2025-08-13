// Navigation Handler for User Session
// Updates navigation elements based on login status
console.log('🚀 Navigation handler loaded');

function updateNavigationForUser() {
    console.log('🔄 Updating navigation for user session');
    
    const adminNavLink = document.getElementById('adminNavLink');
    const accountNavLink = document.getElementById('accountNavLink');
    
    // Check if CookieSessionManager is available
    if (typeof window.CookieSessionManager === 'undefined') {
        console.log('⏳ CookieSessionManager not ready, retrying in 100ms');
        setTimeout(updateNavigationForUser, 100);
        return;
    }
    
    // Check if navigation elements exist
    if (!adminNavLink || !accountNavLink) {
        console.log('❌ Navigation elements not found');
        console.log('adminNavLink:', !!adminNavLink, 'accountNavLink:', !!accountNavLink);
        return;
    }
    
    try {
        const currentUser = window.CookieSessionManager.getCurrentUser();
        console.log('🔐 Current user check:', currentUser ? currentUser.name : 'Not logged in');
        
        if (currentUser) {
            // User is logged in
            if (currentUser.role === 'admin') {
                adminNavLink.style.display = 'block';
                accountNavLink.textContent = 'My Account';
                console.log('👑 Admin navigation updated');
            } else {
                adminNavLink.style.display = 'none';
                accountNavLink.textContent = 'My Account';
                console.log('👤 User navigation updated');
            }
        } else {
            // User is not logged in
            adminNavLink.style.display = 'none';
            accountNavLink.textContent = 'Login';
            console.log('🚪 Guest navigation updated');
        }
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