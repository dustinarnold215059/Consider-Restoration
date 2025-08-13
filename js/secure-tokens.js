// Secure Token Generation using Web Crypto API
// Replaces predictable Math.random() with cryptographically secure tokens

class SecureTokenGenerator {
    constructor() {
        this.isAvailable = typeof crypto !== 'undefined' && crypto.getRandomValues;
        if (!this.isAvailable) {
            console.warn('🔒 Web Crypto API not available, falling back to less secure tokens');
        }
    }

    // Generate cryptographically secure session token
    generateSessionToken() {
        if (this.isAvailable) {
            // Use crypto.getRandomValues for secure randomness
            const array = new Uint8Array(32); // 256 bits of entropy
            crypto.getRandomValues(array);
            
            // Convert to base64url (URL-safe base64)
            const base64 = btoa(String.fromCharCode.apply(null, array))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
            
            return `secure_${Date.now()}_${base64}`;
        } else {
            // Fallback for environments without crypto (should not happen in modern browsers)
            console.warn('🔒 Using fallback token generation - less secure');
            return `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 15)}`;
        }
    }

    // Generate secure API key or similar
    generateApiKey(length = 32) {
        if (this.isAvailable) {
            const array = new Uint8Array(length);
            crypto.getRandomValues(array);
            
            return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
        } else {
            // Fallback
            let result = '';
            const chars = '0123456789abcdef';
            for (let i = 0; i < length * 2; i++) {
                result += chars[Math.floor(Math.random() * chars.length)];
            }
            return result;
        }
    }

    // Generate secure random ID
    generateSecureId() {
        if (this.isAvailable) {
            const array = new Uint8Array(16); // 128 bits
            crypto.getRandomValues(array);
            
            // Format as UUID-like string
            const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
            return `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}-${hex.substr(16, 4)}-${hex.substr(20, 12)}`;
        } else {
            // Fallback UUID v4-like
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                const r = Math.random() * 16 | 0;
                const v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    }

    // Validate token format
    isSecureToken(token) {
        if (!token) return false;
        
        // Check if it's our secure format
        return token.startsWith('secure_') && token.length > 50;
    }

    // Generate CSRF token
    generateCSRFToken() {
        return this.generateSessionToken();
    }
}

// Create global instance
window.SecureTokenGenerator = new SecureTokenGenerator();

// Convenience functions for backward compatibility
window.generateSecureSessionToken = () => {
    return window.SecureTokenGenerator.generateSessionToken();
};

window.generateSecureId = () => {
    return window.SecureTokenGenerator.generateSecureId();
};

console.log('🔒 Secure token generation system initialized');