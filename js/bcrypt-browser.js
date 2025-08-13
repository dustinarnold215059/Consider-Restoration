// Browser-compatible bcrypt implementation for password verification
// Uses a minimal bcrypt.js library for frontend

// Import bcrypt.js from CDN (add this to HTML head)
// <script src="https://cdn.jsdelivr.net/npm/bcryptjs@2.4.3/dist/bcrypt.min.js"></script>

class BcryptBrowser {
    constructor() {
        this.isAvailable = typeof window.dcodeIO !== 'undefined' && window.dcodeIO.bcrypt;
        if (!this.isAvailable) {
            console.warn('🔒 bcrypt.js not loaded, falling back to legacy verification');
        }
    }

    // Verify password against bcrypt hash
    async verifyPassword(password, hash) {
        try {
            // If bcrypt.js is available, use it
            if (this.isAvailable) {
                return window.dcodeIO.bcrypt.compareSync(password, hash);
            }
            
            // Fallback: check if it's a bcrypt hash format
            if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
                // This is a real bcrypt hash but we can't verify it in browser without bcrypt.js
                console.error('🔒 Cannot verify bcrypt hash without bcrypt.js library');
                return false;
            }
            
            // Legacy verification for old insecure hashes (to be removed)
            return this.verifyLegacyPassword(password, hash);
            
        } catch (error) {
            console.error('🔒 Password verification error:', error);
            return false;
        }
    }

    // Legacy verification (INSECURE - for migration only)
    verifyLegacyPassword(password, hash) {
        console.warn('🔒 Using legacy password verification - INSECURE');
        
        // Handle our old fake hashes
        if (hash === 'hashed_admin123_secure') {
            return password === 'admin123';
        }
        
        if (hash === 'hashed_user123_secure') {
            return password === 'user123';
        }
        
        // Direct plaintext comparison (very insecure)
        if (hash === 'admin123' || hash === 'user123') {
            return password === hash;
        }
        
        return false;
    }

    // Generate bcrypt hash (requires bcrypt.js)
    async hashPassword(password, rounds = 12) {
        if (!this.isAvailable) {
            throw new Error('bcrypt.js library not available for hashing');
        }
        
        const salt = window.dcodeIO.bcrypt.genSaltSync(rounds);
        return window.dcodeIO.bcrypt.hashSync(password, salt);
    }

    // Check if hash is in secure bcrypt format
    isSecureHash(hash) {
        return hash && (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$'));
    }

    // Check if hash is legacy/insecure
    isLegacyHash(hash) {
        return !this.isSecureHash(hash);
    }
}

// Initialize browser bcrypt
window.BcryptBrowser = new BcryptBrowser();

// Convenience functions
window.verifyPasswordSecure = async (password, hash) => {
    return await window.BcryptBrowser.verifyPassword(password, hash);
};

window.hashPasswordSecure = async (password, rounds = 12) => {
    return await window.BcryptBrowser.hashPassword(password, rounds);
};

console.log('🔒 Browser bcrypt verification system initialized');