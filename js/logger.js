/**
 * Production-Safe Logging System
 * Automatically adjusts logging levels based on environment
 */

class Logger {
    constructor() {
        // Detect environment - production vs development
        this.isProduction = this.detectProduction();
        this.logLevel = this.isProduction ? 'ERROR' : 'DEBUG';
        
        // Log levels hierarchy: ERROR > WARN > INFO > DEBUG
        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3
        };
        
        this.currentLevel = this.levels[this.logLevel];
        
        if (!this.isProduction) {
            console.log(`🔧 Logger initialized - Environment: ${this.isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}, Level: ${this.logLevel}`);
        }
    }
    
    detectProduction() {
        // Multiple ways to detect production environment
        return (
            window.location.protocol === 'https:' ||
            window.location.hostname !== 'localhost' ||
            window.location.hostname !== '127.0.0.1' ||
            !window.location.hostname.includes('file://') ||
            window.location.hostname.includes('considerrestoration.com')
        );
    }
    
    shouldLog(level) {
        return this.levels[level] <= this.currentLevel;
    }
    
    error(...args) {
        if (this && this.shouldLog && this.shouldLog('ERROR')) {
            console.error('❌', ...args);
        } else if (console.error) {
            console.error('❌', ...args);
        }
    }
    
    warn(...args) {
        if (this && this.shouldLog && this.shouldLog('WARN')) {
            console.warn('⚠️', ...args);
        } else if (console.warn) {
            console.warn('⚠️', ...args);
        }
    }
    
    info(...args) {
        if (this && this.shouldLog && this.shouldLog('INFO')) {
            console.info('ℹ️', ...args);
        } else if (console.info) {
            console.info('ℹ️', ...args);
        }
    }
    
    debug(...args) {
        if (this && this.shouldLog && this.shouldLog('DEBUG')) {
            console.log('🔧', ...args);
        } else if (console.log) {
            console.log('🔧', ...args);
        }
    }
    
    // Special methods for security-sensitive logging
    security(message, details = null) {
        // Security events always logged but sanitized in production
        if (this && this.isProduction) {
            console.warn('🔒 Security Event:', message);
        } else {
            console.warn('🔒 Security Event:', message, details);
        }
    }
    
    // Sanitized user data logging - removes sensitive info
    user(message, userData = null) {
        if (this && this.shouldLog && this.shouldLog('INFO')) {
            if (this.isProduction && userData) {
                // Remove sensitive data in production
                const sanitized = this.sanitizeUserData(userData);
                console.info('👤', message, sanitized);
            } else {
                console.info('👤', message, userData);
            }
        }
    }
    
    sanitizeUserData(data) {
        if (!data || typeof data !== 'object') return data;
        
        const sanitized = { ...data };
        
        // Remove sensitive fields
        const sensitiveFields = ['password', 'hash', 'token', 'secret', 'key', 'credential'];
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });
        
        // Partially mask email and phone
        if (sanitized.email) {
            const [local, domain] = sanitized.email.split('@');
            sanitized.email = `${local.substring(0, 2)}***@${domain}`;
        }
        
        if (sanitized.phone) {
            sanitized.phone = `***-***-${sanitized.phone.slice(-4)}`;
        }
        
        return sanitized;
    }
    
    // Force logging level (for testing)
    setLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.logLevel = level;
            this.currentLevel = this.levels[level];
            this.debug(`Log level changed to: ${level}`);
        }
    }
}

// Create global logger instance
window.logger = new Logger();

// Backward compatibility - replace console methods in production
if (window.logger.isProduction) {
    // Override console methods to prevent accidental logging in production
    const originalConsole = { ...console };
    
    console.log = (...args) => {
        // Only allow if explicitly using logger
        if (args[0] && args[0].toString().includes('🔧')) {
            originalConsole.log(...args);
        }
    };
    
    console.info = (...args) => {
        if (args[0] && (args[0].toString().includes('ℹ️') || args[0].toString().includes('👤'))) {
            originalConsole.info(...args);
        }
    };
    
    // Keep error and warn logging
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
}