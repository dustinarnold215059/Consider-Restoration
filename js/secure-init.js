// Secure initialization script - Load this first
console.log('🔒 Initializing secure environment...');

// Enhanced admin page protection
function protectAdminAccess() {
    if (window.location.pathname.includes('admin.html')) {
        // Check for valid admin session
        const currentUser = window.validateSession ? window.validateSession() : null;
        
        if (!currentUser) {
            console.log('🔒 No valid session found for admin page');
            return; // Let normal admin login handle this
        }
        
        if (currentUser.role !== 'admin') {
            console.warn('🔒 Non-admin user attempted to access admin page');
            alert('Access denied. This page is for administrators only.');
            window.location.href = 'index.html';
            return;
        }
        
        console.log('🔒 Valid admin session confirmed');
    }
}

// Detect and prevent console manipulation attempts
function detectConsoleManipulation() {
    // Monitor for suspicious localStorage operations
    let suspiciousActivity = 0;
    
    const originalConsoleLog = console.log;
    console.log = function(...args) {
        const message = args.join(' ');
        
        // Detect attempts to manipulate authentication
        if (message.includes('currentUser') && message.includes('role') && message.includes('admin')) {
            suspiciousActivity++;
            if (suspiciousActivity > 3) {
                console.warn('🔒 Suspicious activity detected');
                if (window.secureLogout) {
                    window.secureLogout();
                }
            }
        }
        
        return originalConsoleLog.apply(console, args);
    };
    
    // Detect DevTools usage attempts for manipulation
    let devtools = false;
    const threshold = 160;
    
    const detectDevTools = () => {
        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold) {
            if (!devtools) {
                devtools = true;
                console.log('🔒 Developer tools detected - Security measures active');
            }
        } else {
            devtools = false;
        }
    };
    
    // Check periodically (less frequent to avoid performance impact)
    setInterval(detectDevTools, 5000);
}

// Initialize security measures
function initializeSecurePage() {
    console.log('🔒 Page security initialized');
    
    // Protect admin access
    protectAdminAccess();
    
    // Monitor for manipulation attempts
    detectConsoleManipulation();
    
    // Validate existing sessions on page load
    const currentUser = window.validateSession ? window.validateSession() : null;
    if (currentUser) {
        console.log('🔒 Valid session found for user:', currentUser.name);
    }
}

// Run security initialization
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure other scripts load first
    setTimeout(initializeSecurePage, 100);
});

console.log('🔒 Secure initialization script loaded');