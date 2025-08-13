// Comprehensive Error Logging System
// Advanced error tracking, monitoring, and reporting for production environments

class ErrorLogger {
    constructor() {
        this.initialized = false;
        this.errorQueue = [];
        this.maxQueueSize = 100;
        this.logLevel = 'INFO'; // DEBUG, INFO, WARN, ERROR, FATAL
        this.sessionId = this.generateSessionId();
        this.userId = null;
        this.environment = this.detectEnvironment();
        this.errorCounts = {
            javascript: 0,
            network: 0,
            ui: 0,
            auth: 0,
            booking: 0,
            email: 0
        };
    }

    async initialize() {
        if (this.initialized) return;

        console.log('📊 Initializing Error Logger...');
        
        try {
            this.setupGlobalErrorHandlers();
            this.setupPerformanceMonitoring();
            this.setupNetworkMonitoring();
            this.startBatchProcessor();
            this.loadStoredErrors();
            this.initialized = true;
            
            this.info('Error logging system initialized', {
                sessionId: this.sessionId,
                environment: this.environment,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Error Logger initialization failed:', error);
        }
    }

    setupGlobalErrorHandlers() {
        // Catch JavaScript errors
        window.addEventListener('error', (event) => {
            this.logJavaScriptError({
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                error: event.error,
                stack: event.error?.stack,
                type: 'javascript_error'
            });
        });

        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.logJavaScriptError({
                message: 'Unhandled Promise Rejection: ' + event.reason,
                error: event.reason,
                stack: event.reason?.stack || 'No stack trace available',
                type: 'promise_rejection'
            });
        });

        // Catch resource loading errors
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.logResourceError({
                    tagName: event.target.tagName,
                    source: event.target.src || event.target.href,
                    type: 'resource_error'
                });
            }
        }, true);

        console.log('📊 Global error handlers configured');
    }

    setupPerformanceMonitoring() {
        // Monitor page load performance
        window.addEventListener('load', () => {
            setTimeout(() => {
                if (performance.timing) {
                    const timing = performance.timing;
                    const metrics = {
                        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                        loadComplete: timing.loadEventEnd - timing.navigationStart,
                        firstPaint: this.getFirstPaint(),
                        memoryUsage: this.getMemoryUsage()
                    };

                    this.logPerformance('page_load', metrics);
                }
            }, 0);
        });

        // Monitor long tasks
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                        if (entry.duration > 50) { // Tasks longer than 50ms
                            this.warn('Long task detected', {
                                duration: entry.duration,
                                startTime: entry.startTime,
                                name: entry.name
                            });
                        }
                    });
                });
                observer.observe({ entryTypes: ['longtask'] });
            } catch (error) {
                console.warn('Long task monitoring not supported');
            }
        }
    }

    setupNetworkMonitoring() {
        // Override fetch to monitor network requests
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const startTime = performance.now();
            const url = args[0];

            try {
                const response = await originalFetch(...args);
                const endTime = performance.now();
                
                // Log slow requests
                const duration = endTime - startTime;
                if (duration > 3000) { // Requests longer than 3 seconds
                    this.warn('Slow network request', {
                        url: url,
                        duration: duration,
                        status: response.status
                    });
                }

                // Log failed requests
                if (!response.ok) {
                    this.logNetworkError({
                        url: url,
                        status: response.status,
                        statusText: response.statusText,
                        duration: duration
                    });
                }

                return response;
            } catch (error) {
                const endTime = performance.now();
                this.logNetworkError({
                    url: url,
                    error: error.message,
                    duration: endTime - startTime
                });
                throw error;
            }
        };
    }

    // Logging methods by level
    debug(message, data = {}) {
        if (this.shouldLog('DEBUG')) {
            this.log('DEBUG', message, data);
        }
    }

    info(message, data = {}) {
        if (this.shouldLog('INFO')) {
            this.log('INFO', message, data);
        }
    }

    warn(message, data = {}) {
        if (this.shouldLog('WARN')) {
            this.log('WARN', message, data);
        }
    }

    error(message, data = {}) {
        if (this.shouldLog('ERROR')) {
            this.log('ERROR', message, data);
        }
    }

    fatal(message, data = {}) {
        if (this.shouldLog('FATAL')) {
            this.log('FATAL', message, data);
            // Fatal errors should be sent immediately
            this.sendErrorsToServer();
        }
    }

    // Core logging method
    log(level, message, data = {}) {
        const logEntry = {
            id: this.generateLogId(),
            timestamp: new Date().toISOString(),
            level: level,
            message: message,
            data: data,
            sessionId: this.sessionId,
            userId: this.userId,
            environment: this.environment,
            url: window.location.href,
            userAgent: navigator.userAgent,
            category: this.categorizeError(message, data)
        };

        // Add to queue
        this.errorQueue.push(logEntry);
        this.errorCounts[logEntry.category]++;

        // Maintain queue size
        if (this.errorQueue.length > this.maxQueueSize) {
            this.errorQueue.shift();
        }

        // Store in localStorage for persistence
        this.storeError(logEntry);

        // Console output with styling
        this.outputToConsole(logEntry);

        // Notify UI if needed
        this.notifyUI(logEntry);
    }

    // Specific error logging methods
    logJavaScriptError(errorData) {
        this.error('JavaScript Error', {
            ...errorData,
            category: 'javascript'
        });
        this.errorCounts.javascript++;
    }

    logNetworkError(errorData) {
        this.error('Network Error', {
            ...errorData,
            category: 'network'
        });
        this.errorCounts.network++;
    }

    logResourceError(errorData) {
        this.error('Resource Error', {
            ...errorData,
            category: 'ui'
        });
        this.errorCounts.ui++;
    }

    logAuthError(errorData) {
        this.error('Authentication Error', {
            ...errorData,
            category: 'auth'
        });
        this.errorCounts.auth++;
    }

    logBookingError(errorData) {
        this.error('Booking Error', {
            ...errorData,
            category: 'booking'
        });
        this.errorCounts.booking++;
    }

    logEmailError(errorData) {
        this.error('Email Error', {
            ...errorData,
            category: 'email'
        });
        this.errorCounts.email++;
    }

    logPerformance(type, metrics) {
        this.info('Performance Metrics', {
            type: type,
            metrics: metrics,
            category: 'performance'
        });
    }

    // User tracking
    setUserId(userId) {
        this.userId = userId;
        this.info('User identified', { userId: userId });
    }

    // Track session changes
    trackSessionChange(type, userData = null) {
        this.info('Session changed', {
            type: type, // login, logout, restore, expire
            userId: userData?.id,
            userRole: userData?.role,
            sessionId: this.sessionId
        });
    }

    setUserContext(context) {
        this.userContext = context;
    }

    // Utility methods
    shouldLog(level) {
        const levels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
        const currentLevelIndex = levels.indexOf(this.logLevel);
        const messageLevelIndex = levels.indexOf(level);
        return messageLevelIndex >= currentLevelIndex;
    }

    categorizeError(message, data) {
        const msgLower = message.toLowerCase();
        const dataStr = JSON.stringify(data).toLowerCase();

        if (msgLower.includes('auth') || msgLower.includes('login') || msgLower.includes('password')) {
            return 'auth';
        } else if (msgLower.includes('booking') || msgLower.includes('appointment')) {
            return 'booking';
        } else if (msgLower.includes('email') || msgLower.includes('mail')) {
            return 'email';
        } else if (msgLower.includes('network') || msgLower.includes('fetch') || msgLower.includes('request')) {
            return 'network';
        } else if (msgLower.includes('javascript') || msgLower.includes('script') || data.stack) {
            return 'javascript';
        } else if (msgLower.includes('performance') || msgLower.includes('slow')) {
            return 'performance';
        } else {
            return 'ui';
        }
    }

    outputToConsole(logEntry) {
        const colors = {
            DEBUG: '#6c757d',
            INFO: '#17a2b8',
            WARN: '#ffc107',
            ERROR: '#dc3545',
            FATAL: '#721c24'
        };

        const style = `color: ${colors[logEntry.level]}; font-weight: bold;`;
        
        console.groupCollapsed(`%c[${logEntry.level}] ${logEntry.message}`, style);
        console.log('Timestamp:', logEntry.timestamp);
        console.log('Session ID:', logEntry.sessionId);
        console.log('Category:', logEntry.category);
        console.log('Data:', logEntry.data);
        console.groupEnd();
    }

    notifyUI(logEntry) {
        // Dispatch custom event for UI components
        window.dispatchEvent(new CustomEvent('errorLogged', {
            detail: logEntry
        }));

        // Show critical errors to user
        if (logEntry.level === 'FATAL') {
            this.showUserNotification('A critical error occurred. Support has been notified.', 'error');
        }
    }

    showUserNotification(message, type = 'info') {
        // Create or update notification element
        let notification = document.getElementById('error-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'error-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'error' ? '#dc3545' : '#17a2b8'};
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                z-index: 10000;
                max-width: 300px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideIn 0.3s ease;
            `;
            document.body.appendChild(notification);
        }

        notification.textContent = message;
        notification.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    // Batch processing
    startBatchProcessor() {
        // Send errors to server every 30 seconds
        setInterval(() => {
            if (this.errorQueue.length > 0) {
                this.sendErrorsToServer();
            }
        }, 30000);

        // Send immediately if queue is full
        setInterval(() => {
            if (this.errorQueue.length >= this.maxQueueSize * 0.8) {
                this.sendErrorsToServer();
            }
        }, 5000);
    }

    async sendErrorsToServer() {
        if (this.errorQueue.length === 0) return;

        const errorsToSend = [...this.errorQueue];
        this.errorQueue = [];

        try {
            // Try to send via API client first
            if (window.apiClient && window.apiClient.token) {
                await window.apiClient.sendErrorLogs(errorsToSend);
            } else {
                // Fallback to direct fetch
                await fetch('/api/errors', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        sessionId: this.sessionId,
                        errors: errorsToSend
                    })
                });
            }

            console.log(`📊 Sent ${errorsToSend.length} error logs to server`);
        } catch (error) {
            console.warn('Failed to send error logs to server:', error);
            
            // Put errors back in queue if sending failed
            this.errorQueue.unshift(...errorsToSend);
            
            // Limit queue to prevent memory issues
            this.errorQueue = this.errorQueue.slice(0, this.maxQueueSize);
        }
    }

    // Local storage management
    storeError(logEntry) {
        try {
            const storedErrors = JSON.parse(localStorage.getItem('errorLogs') || '[]');
            storedErrors.push(logEntry);
            
            // Keep only last 50 errors in storage
            const recentErrors = storedErrors.slice(-50);
            localStorage.setItem('errorLogs', JSON.stringify(recentErrors));
        } catch (error) {
            console.warn('Failed to store error in localStorage:', error);
        }
    }

    loadStoredErrors() {
        try {
            const storedErrors = JSON.parse(localStorage.getItem('errorLogs') || '[]');
            
            // Add unsent errors to queue
            const unsentErrors = storedErrors.filter(error => 
                Date.now() - new Date(error.timestamp).getTime() < 86400000 // Last 24 hours
            );
            
            this.errorQueue.push(...unsentErrors);
            console.log(`📊 Loaded ${unsentErrors.length} stored errors`);
        } catch (error) {
            console.warn('Failed to load stored errors:', error);
        }
    }

    // Utility functions
    generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateLogId() {
        return 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    detectEnvironment() {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'development';
        } else if (window.location.hostname.includes('staging') || window.location.hostname.includes('test')) {
            return 'staging';
        } else {
            return 'production';
        }
    }

    getFirstPaint() {
        try {
            const paintEntries = performance.getEntriesByType('paint');
            const firstPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
            return firstPaint ? firstPaint.startTime : null;
        } catch (error) {
            return null;
        }
    }

    getMemoryUsage() {
        try {
            if (performance.memory) {
                return {
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                };
            }
        } catch (error) {
            return null;
        }
    }

    // Public API methods
    getErrorStats() {
        return {
            sessionId: this.sessionId,
            environment: this.environment,
            queueLength: this.errorQueue.length,
            errorCounts: { ...this.errorCounts },
            totalErrors: Object.values(this.errorCounts).reduce((a, b) => a + b, 0)
        };
    }

    getRecentErrors(limit = 20) {
        return this.errorQueue.slice(-limit);
    }

    clearErrorQueue() {
        this.errorQueue = [];
        this.errorCounts = {
            javascript: 0,
            network: 0,
            ui: 0,
            auth: 0,
            booking: 0,
            email: 0
        };
    }

    setLogLevel(level) {
        this.logLevel = level;
        this.info('Log level changed', { newLevel: level });
    }

    exportErrorLogs() {
        const data = {
            sessionId: this.sessionId,
            environment: this.environment,
            timestamp: new Date().toISOString(),
            errors: this.errorQueue,
            stats: this.getErrorStats()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `error-logs-${this.sessionId}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    destroy() {
        this.initialized = false;
        this.clearErrorQueue();
    }
}

// Create global instance
window.ErrorLogger = new ErrorLogger();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.ErrorLogger.initialize();
    });
} else {
    window.ErrorLogger.initialize();
}

// Convenience methods for other scripts
window.logError = (message, data) => window.ErrorLogger.error(message, data);
window.logWarn = (message, data) => window.ErrorLogger.warn(message, data);
window.logInfo = (message, data) => window.ErrorLogger.info(message, data);

// Export for ES6 modules
export { ErrorLogger };