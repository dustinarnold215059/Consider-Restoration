/**
 * Conditional Logging Utility
 * Provides production-safe logging with different log levels
 */

class Logger {
    constructor() {
        this.isDevelopment = this.detectDevelopment();
        this.logLevel = this.getLogLevel();
        this.logLevels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3,
            TRACE: 4
        };
    }

    detectDevelopment() {
        // Check if we're in development
        const hostname = window.location.hostname;
        return hostname === 'localhost' || 
               hostname === '127.0.0.1' || 
               hostname.includes('localhost') ||
               window.location.protocol === 'file:' ||
               window.location.search.includes('debug=true');
    }

    getLogLevel() {
        // Get log level from URL parameter or localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const urlLogLevel = urlParams.get('logLevel');
        
        if (urlLogLevel) {
            return urlLogLevel.toUpperCase();
        }

        try {
            const storedLogLevel = localStorage.getItem('logLevel');
            if (storedLogLevel) {
                return storedLogLevel.toUpperCase();
            }
        } catch (e) {
            // localStorage might not be available
        }

        // Default levels
        return this.isDevelopment ? 'DEBUG' : 'WARN';
    }

    shouldLog(level) {
        if (!this.isDevelopment && level !== 'ERROR' && level !== 'WARN') {
            return false;
        }

        const currentLevelNumber = this.logLevels[this.logLevel] || 0;
        const messageLevelNumber = this.logLevels[level] || 0;
        
        return messageLevelNumber <= currentLevelNumber;
    }

    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString().substr(11, 12);
        const prefix = `[${timestamp}] ${level}:`;
        
        if (typeof message === 'string') {
            return [prefix + ' ' + message, ...args];
        }
        return [prefix, message, ...args];
    }

    error(message, ...args) {
        if (this.shouldLog('ERROR')) {
            console.error(...this.formatMessage('ERROR', message, ...args));
        }
    }

    warn(message, ...args) {
        if (this.shouldLog('WARN')) {
            console.warn(...this.formatMessage('WARN', message, ...args));
        }
    }

    info(message, ...args) {
        if (this.shouldLog('INFO')) {
            console.info(...this.formatMessage('INFO', message, ...args));
        }
    }

    debug(message, ...args) {
        if (this.shouldLog('DEBUG')) {
            console.log(...this.formatMessage('DEBUG', message, ...args));
        }
    }

    trace(message, ...args) {
        if (this.shouldLog('TRACE')) {
            console.log(...this.formatMessage('TRACE', message, ...args));
        }
    }

    // Convenience method that acts like console.log but respects logging rules
    log(message, ...args) {
        this.debug(message, ...args);
    }

    // Method to temporarily enable all logging for debugging
    enableDebugMode() {
        this.logLevel = 'TRACE';
        this.info('Debug mode enabled - all logging active');
    }

    // Method to set log level
    setLogLevel(level) {
        level = level.toUpperCase();
        if (this.logLevels.hasOwnProperty(level)) {
            this.logLevel = level;
            try {
                localStorage.setItem('logLevel', level);
            } catch (e) {
                // Ignore if localStorage is not available
            }
            this.info(`Log level set to ${level}`);
        } else {
            this.warn(`Invalid log level: ${level}`);
        }
    }

    // Method to get current configuration
    getConfig() {
        return {
            isDevelopment: this.isDevelopment,
            logLevel: this.logLevel,
            hostname: window.location.hostname
        };
    }
}

// Create global instance
const logger = new Logger();

// Make it available globally
window.logger = logger;

// Optionally replace console.log calls (uncomment if desired)
// const originalConsoleLog = console.log;
// console.log = function(...args) {
//     logger.debug(...args);
// };

// For development convenience, also expose as Log
window.Log = logger;