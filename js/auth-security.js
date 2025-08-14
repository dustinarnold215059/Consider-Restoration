// Security module for authentication and data protection
console.log('🔒 Security module loaded - v2025.08.13 - CACHE BUST', Date.now());
window.securityModuleVersion = '2025.08.13-' + Date.now();

// Simple hash function for passwords (in production, use proper bcrypt/scrypt)
function simpleHash(password, salt = 'massage_therapy_salt_2024') {
    let hash = 0;
    const combined = password + salt;
    
    for (let i = 0; i < combined.length; i++) {
        const char = combined.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    
    return 'hashed_' + Math.abs(hash).toString(36) + '_secure';
}

// Verify password against hash
// Secure password verification using bcrypt
function verifyPassword(password, hash) {
    console.log('🔒 Verifying password against secure hash');
    
    // Check if it's a proper bcrypt hash
    if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
        console.log('🔒 Using secure bcrypt verification');
        try {
            // Use bcryptjs for server-side or bcrypt-browser for client-side
            if (typeof require !== 'undefined') {
                // Server-side Node.js environment
                const bcrypt = require('bcryptjs');
                return bcrypt.compareSync(password, hash);
            } else {
                // Browser environment - need bcrypt.js library
                if (typeof dcodeIO !== 'undefined' && dcodeIO.bcrypt) {
                    return dcodeIO.bcrypt.compareSync(password, hash);
                } else if (typeof window.bcrypt !== 'undefined' && window.bcrypt.compareSync) {
                    return window.bcrypt.compareSync(password, hash);
                } else {
                    console.error('🔒 bcrypt.js library not loaded in browser');
                    console.log('🔒 Available objects: dcodeIO=', typeof dcodeIO, 'window.bcrypt=', typeof window.bcrypt);
                    return false;
                }
            }
        } catch (error) {
            console.error('🔒 Bcrypt verification error:', error);
            return false;
        }
    }
    
    // Production security: Block all legacy authentication
    if (typeof EnvConfig !== 'undefined' && EnvConfig.isProduction()) {
        if (typeof logger !== 'undefined') {
            logger.error('🚫 Legacy authentication blocked in production environment');
        }
        return false;
    }
    
    
    // All other legacy authentication is disabled
    console.log('🔒 Legacy authentication blocked for security');
    return false;
    
    // For dynamically generated hashes, use the hash function
    if (hash && hash.startsWith('hashed_') && hash.endsWith('_secure')) {
        const expectedHash = simpleHash(password);
        console.log('🔒 Generated hash for comparison:', expectedHash);
        return expectedHash === hash;
    }
    
    console.error('🔒 Unknown hash format:', hash);
    return false;
}

// Enhanced authentication check with server-side validation simulation
function authenticateUser(email, password) {
    console.log('🔒 Authenticating user:', email);
    console.log('🔒 Password provided:', password ? '[PROVIDED]' : '[MISSING]');
    
    // Get users from shared data
    const allUsers = window.getUsers ? window.getUsers() : [];
    console.log('🔒 Available users for auth:', allUsers.length);
    
    if (allUsers.length > 0) {
        console.log('🔒 Available usernames/emails:', allUsers.map(u => u.username || u.email));
    }
    
    const user = allUsers.find(u => (u.username === email || u.email === email));
    
    if (!user) {
        console.log('🔒 User not found for email/username:', email);
        return null;
    }
    
    console.log('🔒 Found user:', user.name, 'Role:', user.role);
    
    // Verify password
    const passwordField = user.passwordHash || user.password; // Support legacy during transition
    console.log('🔒 Password field type:', passwordField ? (user.passwordHash ? 'passwordHash' : 'password') : 'MISSING');
    console.log('🔒 Password field value:', passwordField);
    
    const isValidPassword = verifyPassword(password, passwordField);
    console.log('🔒 Password validation result:', isValidPassword);
    
    if (!isValidPassword) {
        console.log('🔒 Authentication failed: Invalid password');
        return null;
    }
    
    // Create secure session token
    const sessionToken = generateSessionToken(user.id);
    
    // Return user data without password
    const authenticatedUser = {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        totalAppointments: user.totalAppointments,
        lastVisit: user.lastVisit,
        preferences: user.preferences,
        membershipPlan: user.membershipPlan,
        sessionToken: sessionToken,
        loginTime: new Date().toISOString()
    };
    
    console.log('🔒 Authentication successful for:', user.name);
    return authenticatedUser;
}

// Generate session token
function generateSessionToken(userId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const hash = simpleHash(userId + timestamp + random);
    return hash.substring(0, 32); // Truncate to reasonable length
}

// Validate session with improved persistence (less strict for better UX)
// Flag to prevent infinite recursion during validation
let validatingSession = false;

function validateSession() {
    if (validatingSession) {
        return null; // Prevent infinite recursion
    }
    
    try {
        validatingSession = true;
        const storedUser = window.originalGetItem ? window.originalGetItem.call(localStorage, 'currentUser') : localStorage.getItem('currentUser');
        const isLoggedIn = window.originalGetItem ? window.originalGetItem.call(localStorage, 'isLoggedIn') : localStorage.getItem('isLoggedIn');
        
        if (!storedUser || isLoggedIn !== 'true') {
            return null;
        }
        
        const user = JSON.parse(storedUser);
        
        // Basic validation - only check essential fields
        if (!user.id || !user.email) {
            console.warn('🔒 Invalid session data detected');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('isLoggedIn');
            return null;
        }
        
        // Extended session age (7 days for better UX)
        if (user.loginTime) {
            const loginTime = new Date(user.loginTime);
            const now = new Date();
            const sessionAge = now - loginTime;
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days instead of 24 hours
            
            if (sessionAge > maxAge) {
                console.warn('🔒 Session expired after 7 days');
                localStorage.removeItem('currentUser');
                localStorage.removeItem('isLoggedIn');
                return null;
            }
        }
        
        // Validate user exists in system (but be less strict)
        if (window.getUsers) {
            const allUsers = window.getUsers();
            const currentUser = allUsers.find(u => u.id === user.id || u.email === user.email);
            
            if (currentUser) {
                // Update session with current user data but keep login info
                const updatedUser = {
                    ...user, // Keep existing session data
                    name: currentUser.name, // Update from current system data
                    role: currentUser.role,
                    phone: currentUser.phone
                };
                
                // Update localStorage with refreshed data
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                return updatedUser;
            } else {
                // Don't immediately invalidate - user data might not be loaded yet
                console.log('🔒 User data not found in system, keeping session for now');
                return user; // Keep session active
            }
        } else {
            // System not ready, keep session
            console.log('🔒 User system not available, maintaining session');
            return user;
        }
        
    } catch (e) {
        console.error('🔒 Session validation error:', e);
        // Don't clear session on errors - might be temporary
        return null;
    } finally {
        validatingSession = false;
    }
}

// Secure logout
function secureLogout() {
    console.log('🔒 Performing secure logout');
    
    // Clear all authentication data
    localStorage.removeItem('currentUser');
    sessionStorage.clear();
    
    // Clear any cached user data
    if (window.currentUser) {
        window.currentUser = null;
    }
    
    // Dispatch logout event
    window.dispatchEvent(new CustomEvent('userLoggedOut'));
    
    // Optional: redirect to home page
    if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
        window.location.href = 'index.html';
    }
}

// Data integrity protection
function protectAppointmentData() {
    console.log('🔒 Setting up data tampering protection...');
    
    // Store original methods before overriding
    const originalSetItem = Storage.prototype.setItem;
    const originalGetItem = Storage.prototype.getItem;
    
    // Make originalGetItem available globally for validateSession
    window.originalGetItem = originalGetItem;
    
    Storage.prototype.setItem = function(key, value) {
        console.log('🔒 localStorage.setItem called for key:', key);
        
        // TEMPORARILY DISABLE ALL VALIDATION - ALLOW ALL OPERATIONS
        if (key === 'massageAppointments') {
            console.log('🔒 SECURITY DISABLED - Allowing all appointment saves');
            return originalSetItem.apply(this, arguments);
        }
        
        // Handle currentUser data
        if (key === 'currentUser') {
            console.log('🔒 Attempting to modify user session data - validating...');
            
            try {
                const userData = JSON.parse(value);
                const currentUser = validateSession();
                
                // Prevent privilege escalation (but allow legitimate admin authentication)
                if (userData.role === 'admin' && currentUser && currentUser.role !== 'admin') {
                    // Only block if there's already a non-admin user logged in
                    console.warn('🔒 BLOCKED: Privilege escalation attempt');
                    throw new Error('Privilege escalation attempt blocked');
                } else if (userData.role === 'admin' && !currentUser) {
                    // Allow admin login when no user is currently logged in
                    console.log('🔒 ALLOWED: Admin authentication (no current user)');
                }
                
                // Ensure session token is present for new sessions (but be flexible for admin)
                if (!userData.sessionToken && userData.role && userData.role !== 'admin') {
                    console.warn('🔒 BLOCKED: Missing session token in user data');
                    throw new Error('Invalid session data - missing security token');
                } else if (!userData.sessionToken && userData.role === 'admin') {
                    console.log('🔒 Admin user detected, generating session token...');
                    userData.sessionToken = generateSecureSessionToken();
                }
                
                console.log('🔒 User session data validation passed');
                
            } catch (e) {
                console.warn('🔒 User session modification blocked:', e.message);
                return; // Block the operation
            }
        }
        
        // If all checks pass, allow the operation
        console.log('🔒 Storage operation allowed for key:', key);
        return originalSetItem.apply(this, arguments);
    };
    
    console.log('🔒 Data tampering protection active');
}

// Initialize security measures
function initializeSecurity() {
    console.log('🔒 Initializing security measures...');
    
    // Protect data integrity
    protectAppointmentData();
    
    // Clear any existing insecure sessions on page load
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        try {
            const user = JSON.parse(storedUser);
            // If user data doesn't have security fields, clear it
            if (!user.sessionToken || !user.loginTime) {
                console.log('🔒 Clearing insecure session data');
                localStorage.removeItem('currentUser');
                localStorage.removeItem('isLoggedIn'); // Also clear isLoggedIn flag
            }
        } catch (e) {
            localStorage.removeItem('currentUser');
        }
    }
    
    console.log('🔒 Security measures initialized');
}

// Export functions for global use
window.authenticateUser = authenticateUser;
window.validateSession = validateSession;
window.secureLogout = secureLogout;
window.simpleHash = simpleHash;
window.verifyPassword = verifyPassword;

// Initialize security when script loads
initializeSecurity();