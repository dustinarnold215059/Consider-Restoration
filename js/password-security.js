// Secure Password Hashing Utility for Frontend
// Uses Web Crypto API for cryptographically secure password hashing

class PasswordSecurity {
    constructor() {
        this.saltRounds = 12;
    }

    // Generate a cryptographically secure salt
    async generateSalt() {
        const saltArray = new Uint8Array(16);
        crypto.getRandomValues(saltArray);
        return Array.from(saltArray, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // Hash password using PBKDF2 (Web Crypto API standard)
    async hashPassword(password, salt = null) {
        if (!salt) {
            salt = await this.generateSalt();
        }

        // Convert password and salt to ArrayBuffer
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);
        const saltBuffer = encoder.encode(salt);

        // Import password as key
        const key = await crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            { name: 'PBKDF2' },
            false,
            ['deriveBits']
        );

        // Derive key using PBKDF2 with SHA-256
        const derivedKey = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: saltBuffer,
                iterations: 100000, // 100k iterations (secure standard)
                hash: 'SHA-256'
            },
            key,
            256 // 256 bits output
        );

        // Convert to hex string
        const hashArray = new Uint8Array(derivedKey);
        const hashHex = Array.from(hashArray, byte => byte.toString(16).padStart(2, '0')).join('');

        // Return salt and hash combined (bcrypt-like format)
        return `$pbkdf2$${salt}$${hashHex}`;
    }

    // Verify password against hash
    async verifyPassword(password, hash) {
        try {
            // Parse the hash format: $pbkdf2$salt$hash
            const parts = hash.split('$');
            if (parts.length !== 4 || parts[0] !== '' || parts[1] !== 'pbkdf2') {
                return false;
            }

            const salt = parts[2];
            const storedHash = parts[3];

            // Hash the provided password with the stored salt
            const testHash = await this.hashPassword(password, salt);
            const testHashParts = testHash.split('$');
            const testHashValue = testHashParts[3];

            // Constant-time comparison to prevent timing attacks
            return this.constantTimeEqual(testHashValue, storedHash);
        } catch (error) {
            console.error('Password verification error:', error);
            return false;
        }
    }

    // Constant-time string comparison to prevent timing attacks
    constantTimeEqual(a, b) {
        if (a.length !== b.length) {
            return false;
        }

        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return result === 0;
    }

    // Legacy password migration helper
    async migrateFromPlaintext(plainPassword) {
        console.log('🔒 Migrating plaintext password to secure hash');
        return await this.hashPassword(plainPassword);
    }

    // Check if a hash is using the old insecure format
    isLegacyHash(hash) {
        if (!hash) return false;
        
        // In production, block any legacy hash patterns
        if (typeof EnvConfig !== 'undefined' && EnvConfig.isProduction()) {
            const legacyPatterns = ['admin', 'user', '123', 'secure'];
            if (legacyPatterns.some(pattern => hash.includes(pattern))) {
                if (typeof logger !== 'undefined') {
                    logger.error('🚫 Legacy hash pattern blocked in production');
                }
                return true; // Mark as legacy to force rejection
            }
        }
        
        // Standard legacy hash detection
        return hash && (
            hash.length < 32 ||
            !hash.startsWith('$pbkdf2$') && !hash.startsWith('$2b$')
        );
    }
}

// Create global instance
window.PasswordSecurity = new PasswordSecurity();

// Convenience functions
window.hashPassword = async (password) => {
    return await window.PasswordSecurity.hashPassword(password);
};

window.verifyPassword = async (password, hash) => {
    return await window.PasswordSecurity.verifyPassword(password, hash);
};

console.log('🔒 Secure password hashing system initialized');