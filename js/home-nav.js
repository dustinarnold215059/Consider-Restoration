// Ultra-lightweight navigation for home page only
// No complex session management to prevent performance issues

(function() {
    'use strict';
    
    console.log('🏠 Home navigation script loaded');

    function updateHomeNavigation() {
        try {
            const adminNavLink = document.getElementById('adminNavLink');
            const accountNavLink = document.getElementById('accountNavLink');
            
            if (!adminNavLink || !accountNavLink) return;
            
            // Simple check for current user
            const storedUser = localStorage.getItem('currentUser');
            const isLoggedIn = localStorage.getItem('isLoggedIn');
            
            if (storedUser && isLoggedIn === 'true') {
                try {
                    const user = JSON.parse(storedUser);
                    
                    if (user.role === 'admin') {
                        adminNavLink.style.display = 'block';
                        accountNavLink.textContent = 'My Account';
                        accountNavLink.href = 'user-portal.html';
                    } else {
                        adminNavLink.style.display = 'none';
                        accountNavLink.textContent = 'My Account';
                        accountNavLink.href = 'user-portal.html';
                    }
                } catch (error) {
                    // Invalid data
                    adminNavLink.style.display = 'none';
                    accountNavLink.textContent = 'Login';
                    accountNavLink.href = 'user-portal.html';
                }
            } else {
                // Not logged in
                adminNavLink.style.display = 'none';
                accountNavLink.textContent = 'Login';
                accountNavLink.href = 'user-portal.html';
            }
        } catch (error) {
            console.error('Home navigation error:', error);
        }
    }

    // Simple initialization
    function initialize() {
        updateHomeNavigation();
        
        // Listen for auth changes
        window.addEventListener('userAuthChanged', updateHomeNavigation);
        window.addEventListener('storage', function(e) {
            if (e.key === 'currentUser' || e.key === 'isLoggedIn') {
                updateHomeNavigation();
            }
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    console.log('🏠 Home navigation initialized');
})();