// Enhanced Error Handler and User Feedback System
// Provides graceful degradation, comprehensive error handling, and user-friendly feedback
console.log('🛡️ Enhanced Error Handler loading...');

class EnhancedErrorHandler {
    constructor() {
        this.errorLog = [];
        this.userNotifications = [];
        this.retryQueue = new Map();
        this.maxRetries = 3;
        this.retryDelay = 1000; // Start with 1 second
        
        this.config = {
            showTechnicalDetails: false, // Hide technical details from users
            enableRetryMechanism: true,
            enableOfflineSupport: true,
            enableErrorReporting: false, // Disabled for privacy
            maxErrorLogSize: 100
        };
        
        this.initialize();
        console.log('🛡️ Enhanced Error Handler initialized');
    }

    initialize() {
        this.setupGlobalErrorHandlers();
        this.setupPromiseRejectionHandler();
        this.setupNetworkErrorDetection();
        this.setupUserFeedbackSystem();
        this.setupRetryMechanism();
    }

    setupGlobalErrorHandlers() {
        // Catch all JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleJavaScriptError(event);
        });

        // Catch resource loading errors
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.handleResourceError(event);
            }
        }, true);

        // Handle console errors
        this.originalConsoleError = console.error;
        console.error = (...args) => {
            this.handleConsoleError(args);
            this.originalConsoleError.apply(console, args);
        };
    }

    setupPromiseRejectionHandler() {
        window.addEventListener('unhandledrejection', (event) => {
            this.handlePromiseRejection(event);
        });
    }

    setupNetworkErrorDetection() {
        // Monitor online/offline status
        window.addEventListener('online', () => {
            this.handleOnlineStatusChange(true);
        });

        window.addEventListener('offline', () => {
            this.handleOnlineStatusChange(false);
        });

        // Monitor fetch failures
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch.apply(window, args);
                if (!response.ok) {
                    this.handleNetworkError(args[0], response);
                }
                return response;
            } catch (error) {
                this.handleNetworkError(args[0], error);
                throw error;
            }
        };
    }

    setupUserFeedbackSystem() {
        // Create notification container
        this.createNotificationContainer();
        
        // Setup feedback collection
        this.setupFeedbackCollection();
    }

    setupRetryMechanism() {
        // Process retry queue periodically
        setInterval(() => {
            this.processRetryQueue();
        }, 5000); // Check every 5 seconds
    }

    // Error Handling Methods
    handleJavaScriptError(event) {
        // Filter out generic cross-origin "Script error." messages that provide no useful information
        if (event.message === 'Script error.' && 
            event.filename === '' && 
            event.lineno === 0 && 
            event.colno === 0) {
            // These are usually cross-origin errors or browser extensions
            // Skip logging them as they're not actionable
            return;
        }
        
        const error = {
            type: 'javascript',
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            stack: event.error ? event.error.stack : null,
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        this.logError(error);
        this.showUserFriendlyError(this.getJavaScriptErrorMessage(error));
        
        // Prevent default browser error handling for better UX
        event.preventDefault();
        return true;
    }

    handleResourceError(event) {
        const error = {
            type: 'resource',
            resource: event.target.tagName,
            source: event.target.src || event.target.href,
            timestamp: Date.now(),
            url: window.location.href
        };

        this.logError(error);
        
        // Handle specific resource types
        if (event.target.tagName === 'SCRIPT') {
            this.handleScriptLoadError(event.target);
        } else if (event.target.tagName === 'LINK') {
            this.handleStylesheetError(event.target);
        } else if (event.target.tagName === 'IMG') {
            this.handleImageError(event.target);
        }
    }

    handlePromiseRejection(event) {
        const error = {
            type: 'promise_rejection',
            reason: event.reason,
            message: event.reason ? event.reason.message : 'Unknown promise rejection',
            stack: event.reason ? event.reason.stack : null,
            timestamp: Date.now()
        };

        this.logError(error);
        
        // Show user-friendly message for critical promise rejections
        if (this.isCriticalPromiseRejection(event.reason)) {
            this.showUserFriendlyError('An unexpected error occurred. Please try again.');
        }

        // Prevent default handling
        event.preventDefault();
    }

    handleNetworkError(url, errorOrResponse) {
        const error = {
            type: 'network',
            url: url,
            status: errorOrResponse.status || 'unknown',
            statusText: errorOrResponse.statusText || 'Network Error',
            timestamp: Date.now()
        };

        this.logError(error);
        
        // Queue for retry if appropriate
        if (this.config.enableRetryMechanism && this.shouldRetry(error)) {
            this.queueForRetry(url, error);
        }
        
        // Show user-friendly network error message
        this.showNetworkErrorMessage(error);
    }

    handleConsoleError(args) {
        const error = {
            type: 'console',
            message: args.join(' '),
            timestamp: Date.now()
        };

        this.logError(error);
    }

    handleOnlineStatusChange(isOnline) {
        if (isOnline) {
            this.showSuccessMessage('Connection restored! Syncing data...');
            this.processRetryQueue();
        } else {
            this.showWarningMessage('You are offline. Some features may be limited.');
        }
    }

    // Resource Error Handlers
    handleScriptLoadError(scriptElement) {
        const scriptName = this.getScriptName(scriptElement.src);
        
        // Attempt to load fallback or show graceful degradation
        if (this.hasFallback(scriptName)) {
            this.loadFallbackScript(scriptName);
        } else {
            this.showWarningMessage(`Some features may not be available due to a loading error.`);
        }
    }

    handleStylesheetError(linkElement) {
        console.warn('🛡️ Stylesheet failed to load:', linkElement.href);
        // CSS errors are usually non-critical, just log them
    }

    handleImageError(imgElement) {
        // Replace with placeholder image
        imgElement.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2VlZSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSI+SW1hZ2UgVW5hdmFpbGFibGU8L3RleHQ+PC9zdmc+';
        imgElement.alt = 'Image unavailable';
    }

    // User Feedback System
    createNotificationContainer() {
        if (document.getElementById('error-notifications')) return;

        const container = document.createElement('div');
        container.id = 'error-notifications';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 400px;
        `;
        if (document.body) {
            document.body.appendChild(container);
        } else {
            console.warn('Document body not available for error handler');
        }
    }

    showUserFriendlyError(message, options = {}) {
        this.showNotification(message, 'error', {
            duration: options.duration || 8000,
            showRetry: options.showRetry || false,
            retryAction: options.retryAction
        });
    }

    showWarningMessage(message, duration = 6000) {
        this.showNotification(message, 'warning', { duration });
    }

    showSuccessMessage(message, duration = 4000) {
        this.showNotification(message, 'success', { duration });
    }

    showInfoMessage(message, duration = 5000) {
        this.showNotification(message, 'info', { duration });
    }

    showNotification(message, type = 'info', options = {}) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            position: relative;
        `;

        // Create notification content
        const content = document.createElement('div');
        content.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1; margin-right: 10px;">
                    <div style="font-weight: bold; margin-bottom: 4px;">${this.getNotificationTitle(type)}</div>
                    <div style="font-size: 14px; opacity: 0.9;">${message}</div>
                </div>
                <button class="notification-close" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">&times;</button>
            </div>
        `;

        // Add retry button if requested
        if (options.showRetry && options.retryAction) {
            const retryButton = document.createElement('button');
            retryButton.textContent = 'Retry';
            retryButton.style.cssText = `
                background: rgba(255,255,255,0.2);
                border: 1px solid rgba(255,255,255,0.3);
                color: white;
                padding: 6px 12px;
                border-radius: 4px;
                margin-top: 8px;
                cursor: pointer;
                font-size: 12px;
            `;
            retryButton.addEventListener('click', () => {
                options.retryAction();
                this.removeNotification(notification);
            });
            content.appendChild(retryButton);
        }

        notification.appendChild(content);

        // Add to container
        const container = document.getElementById('error-notifications');
        container.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);

        // Setup close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.removeNotification(notification);
        });

        // Auto-remove after duration
        if (options.duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification);
            }, options.duration);
        }

        // Track notification
        this.userNotifications.push({
            element: notification,
            type,
            message,
            timestamp: Date.now()
        });

        return notification;
    }

    removeNotification(notification) {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);

        // Remove from tracking
        this.userNotifications = this.userNotifications.filter(n => n.element !== notification);
    }

    getNotificationColor(type) {
        const colors = {
            error: '#dc3545',
            warning: '#ffc107',
            success: '#28a745',
            info: '#17a2b8'
        };
        return colors[type] || colors.info;
    }

    getNotificationTitle(type) {
        const titles = {
            error: 'Error',
            warning: 'Warning',
            success: 'Success',
            info: 'Information'
        };
        return titles[type] || 'Notice';
    }

    // Error Message Generation
    getJavaScriptErrorMessage(error) {
        // Map technical errors to user-friendly messages
        const message = error.message.toLowerCase();
        
        if (message.includes('network') || message.includes('fetch')) {
            return 'Unable to connect to the server. Please check your internet connection and try again.';
        }
        
        if (message.includes('permission') || message.includes('blocked')) {
            return 'Access was blocked by your browser. Please check your browser settings.';
        }
        
        if (message.includes('script') || message.includes('syntax')) {
            return 'A system error occurred. Please refresh the page and try again.';
        }
        
        if (message.includes('timeout')) {
            return 'The request took too long. Please try again.';
        }
        
        // Generic fallback
        return 'An unexpected error occurred. Please try refreshing the page.';
    }

    showNetworkErrorMessage(error) {
        if (error.status === 404) {
            this.showUserFriendlyError('The requested resource was not found. Please try again later.');
        } else if (error.status === 500) {
            this.showUserFriendlyError('Server error occurred. Please try again in a few minutes.');
        } else if (error.status === 403) {
            this.showUserFriendlyError('Access denied. Please check your permissions.');
        } else if (!navigator.onLine) {
            this.showWarningMessage('You appear to be offline. Please check your internet connection.');
        } else {
            this.showUserFriendlyError('Network error occurred. Please check your connection and try again.');
        }
    }

    // Retry Mechanism
    queueForRetry(operation, error) {
        const retryId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        this.retryQueue.set(retryId, {
            operation,
            error,
            attempts: 0,
            maxAttempts: this.maxRetries,
            nextRetry: Date.now() + this.retryDelay,
            exponentialBackoff: true
        });
        
        console.log('🛡️ Queued for retry:', operation);
    }

    async processRetryQueue() {
        if (!navigator.onLine) return; // Skip if offline
        
        const now = Date.now();
        
        for (const [retryId, retryItem] of this.retryQueue) {
            if (retryItem.nextRetry <= now) {
                try {
                    await this.executeRetry(retryItem);
                    this.retryQueue.delete(retryId);
                    console.log('🛡️ Retry successful:', retryItem.operation);
                } catch (error) {
                    retryItem.attempts++;
                    
                    if (retryItem.attempts >= retryItem.maxAttempts) {
                        this.retryQueue.delete(retryId);
                        console.log('🛡️ Retry failed permanently:', retryItem.operation);
                    } else {
                        // Exponential backoff
                        const delay = retryItem.exponentialBackoff ? 
                            this.retryDelay * Math.pow(2, retryItem.attempts) :
                            this.retryDelay;
                        retryItem.nextRetry = now + delay;
                        console.log('🛡️ Retry failed, will try again in', delay, 'ms');
                    }
                }
            }
        }
    }

    async executeRetry(retryItem) {
        // This would be implemented based on the specific operation type
        if (typeof retryItem.operation === 'string' && retryItem.operation.startsWith('http')) {
            // Retry network request
            const response = await fetch(retryItem.operation);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return response;
        }
        
        // Add other retry types as needed
        throw new Error('Unknown retry operation type');
    }

    // Utility Methods
    shouldRetry(error) {
        // Retry network errors but not client errors (4xx)
        if (error.type === 'network') {
            const status = parseInt(error.status);
            return !status || status >= 500 || status === 0; // Server errors or network failures
        }
        return false;
    }

    isCriticalPromiseRejection(reason) {
        if (!reason) return false;
        
        const message = reason.message || reason.toString();
        const criticalKeywords = ['auth', 'payment', 'security', 'critical', 'fatal'];
        
        return criticalKeywords.some(keyword => 
            message.toLowerCase().includes(keyword)
        );
    }

    getScriptName(src) {
        if (!src) return '';
        return src.split('/').pop().split('.')[0];
    }

    hasFallback(scriptName) {
        // Define scripts that have fallbacks
        const fallbacks = ['booking', 'payment', 'email'];
        return fallbacks.includes(scriptName);
    }

    loadFallbackScript(scriptName) {
        // Implement fallback loading logic
        console.log('🛡️ Loading fallback for:', scriptName);
        this.showInfoMessage(`Loading backup system for ${scriptName}...`);
    }

    setupFeedbackCollection() {
        // Add error reporting mechanism (optional)
        window.addEventListener('keydown', (event) => {
            // Ctrl+Shift+R for error report (optional)
            if (event.ctrlKey && event.shiftKey && event.key === 'R') {
                this.showErrorReport();
            }
        });
    }

    showErrorReport() {
        if (this.errorLog.length === 0) {
            this.showInfoMessage('No errors to report.');
            return;
        }

        const reportData = {
            errors: this.errorLog.slice(-10), // Last 10 errors
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString()
        };

        console.log('🛡️ Error Report:', reportData);
        this.showInfoMessage(`Generated error report with ${this.errorLog.length} errors. Check console for details.`);
    }

    logError(error) {
        // Add to error log
        this.errorLog.push({
            ...error,
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        });

        // Limit log size
        if (this.errorLog.length > this.config.maxErrorLogSize) {
            this.errorLog.shift();
        }

        // Use original console.error to avoid infinite recursion
        if (this.originalConsoleError) {
            this.originalConsoleError('🛡️ Error logged:', error);
        }
    }

    // Public API
    getErrorLog() {
        return [...this.errorLog];
    }

    clearErrorLog() {
        this.errorLog = [];
        console.log('🛡️ Error log cleared');
    }

    getConfig() {
        return { ...this.config };
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('🛡️ Configuration updated:', this.config);
    }
}

// Create global instance
window.enhancedErrorHandler = new EnhancedErrorHandler();

// Provide global error handling functions
window.showError = function(message, options) {
    window.enhancedErrorHandler.showUserFriendlyError(message, options);
};

window.showSuccess = function(message, duration) {
    window.enhancedErrorHandler.showSuccessMessage(message, duration);
};

window.showWarning = function(message, duration) {
    window.enhancedErrorHandler.showWarningMessage(message, duration);
};

window.showInfo = function(message, duration) {
    window.enhancedErrorHandler.showInfoMessage(message, duration);
};

console.log('🛡️ Enhanced Error Handler loaded and active');