/**
 * Production Logger Utility
 * Replaces console.log calls with proper logging for production
 */

// Production-safe console replacement
const ProductionConsole = {
    log: function(...args) {
        if (typeof logger !== 'undefined') {
            logger.debug(...args);
        } else if (typeof EnvConfig !== 'undefined' && EnvConfig.isDevelopment()) {
            console.log(...args);
        }
        // In production, suppress console.log
    },
    
    info: function(...args) {
        if (typeof logger !== 'undefined') {
            logger.info(...args);
        } else {
            console.info(...args);
        }
    },
    
    warn: function(...args) {
        if (typeof logger !== 'undefined') {
            logger.warn(...args);
        } else {
            console.warn(...args);
        }
    },
    
    error: function(...args) {
        if (typeof logger !== 'undefined') {
            logger.error(...args);
        } else {
            console.error(...args);
        }
    },
    
    debug: function(...args) {
        if (typeof logger !== 'undefined') {
            logger.debug(...args);
        } else if (typeof EnvConfig !== 'undefined' && EnvConfig.isDevelopment()) {
            console.log('[DEBUG]', ...args);
        }
        // In production, suppress debug logs
    }
};

// Only replace console in production environment
if (typeof window !== 'undefined') {
    // Check if we're in production
    const isProduction = typeof EnvConfig !== 'undefined' ? 
        EnvConfig.isProduction() : 
        (window.location.protocol === 'https:' && 
         !window.location.hostname.includes('localhost') &&
         !window.location.hostname.includes('127.0.0.1'));

    if (isProduction) {
        // Replace console methods in production
        window.console = Object.assign(window.console, ProductionConsole);
        
        // Add production console notice
        if (typeof logger !== 'undefined') {
            logger.info('🏭 Production logging active - console output minimized');
        }
    }
}

// Make available globally
window.ProductionConsole = ProductionConsole;