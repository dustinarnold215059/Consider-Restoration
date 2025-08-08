// Global Error Handler for Consider Restoration Website
// Provides comprehensive error handling and user-friendly error messages

class ErrorHandler {
    constructor() {
        this.initializeGlobalHandlers();
        this.errorLog = [];
    }

    initializeGlobalHandlers() {
        // Handle JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'JavaScript Error',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'Unhandled Promise Rejection',
                message: event.reason?.message || event.reason,
                stack: event.reason?.stack
            });
        });

        // Handle network errors
        window.addEventListener('online', () => {
            this.hideNetworkError();
            this.showNotification('Connection restored', 'success');
        });

        window.addEventListener('offline', () => {
            this.showNetworkError();
        });
    }

    handleError(errorInfo) {
        // Log error details
        console.error('Error caught by global handler:', errorInfo);
        
        // Store error for potential reporting
        this.errorLog.push({
            ...errorInfo,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent
        });

        // Show user-friendly error message
        this.showUserFriendlyError(errorInfo);

        // Prevent default browser error handling for non-critical errors
        if (this.isNonCriticalError(errorInfo)) {
            return true;
        }
    }

    isNonCriticalError(errorInfo) {
        const nonCriticalPatterns = [
            'Non-Error promise rejection captured',
            'ResizeObserver loop limit exceeded',
            'Script error',
            'Network request failed'
        ];

        return nonCriticalPatterns.some(pattern => 
            errorInfo.message?.includes(pattern)
        );
    }

    showUserFriendlyError(errorInfo) {
        const errorContainer = this.getOrCreateErrorContainer();
        
        let userMessage = 'Something went wrong. Please try refreshing the page.';
        
        // Customize message based on error type
        if (errorInfo.message?.includes('network') || errorInfo.message?.includes('fetch')) {
            userMessage = 'Connection issue detected. Please check your internet connection and try again.';
        } else if (errorInfo.message?.includes('booking') || errorInfo.message?.includes('appointment')) {
            userMessage = 'There was an issue with the booking system. Please try again or contact us directly.';
        } else if (errorInfo.message?.includes('payment') || errorInfo.message?.includes('stripe')) {
            userMessage = 'Payment processing error. Your card was not charged. Please try again.';
        }

        errorContainer.innerHTML = `
            <div class="error-notification" style="
                background: #f8d7da;
                color: #721c24;
                padding: 1rem;
                border-radius: 8px;
                border: 1px solid #f5c6cb;
                margin: 1rem 0;
                display: flex;
                align-items: center;
                justify-content: space-between;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">
                <div>
                    <strong>⚠️ Error:</strong> ${userMessage}
                    <div style="font-size: 0.9em; margin-top: 0.5rem; opacity: 0.8;">
                        If this persists, please contact us at (555) 123-4567
                    </div>
                </div>
                <button onclick="this.parentElement.remove()" style="
                    background: none;
                    border: none;
                    font-size: 1.2rem;
                    cursor: pointer;
                    color: #721c24;
                    padding: 0.25rem;
                ">×</button>
            </div>
        `;

        // Auto-remove after 8 seconds
        setTimeout(() => {
            const notification = errorContainer.querySelector('.error-notification');
            if (notification) {
                notification.remove();
            }
        }, 8000);
    }

    showNetworkError() {
        const errorContainer = this.getOrCreateErrorContainer();
        errorContainer.innerHTML = `
            <div class="network-error" style="
                background: #fff3cd;
                color: #856404;
                padding: 1rem;
                border-radius: 8px;
                border: 1px solid #ffeaa7;
                margin: 1rem 0;
                text-align: center;
            ">
                <strong>📡 No Internet Connection</strong>
                <div style="font-size: 0.9em; margin-top: 0.5rem;">
                    Some features may not work properly. Please check your connection.
                </div>
            </div>
        `;
    }

    hideNetworkError() {
        const errorContainer = document.getElementById('global-error-container');
        if (errorContainer) {
            const networkError = errorContainer.querySelector('.network-error');
            if (networkError) {
                networkError.remove();
            }
        }
    }

    showNotification(message, type = 'info') {
        const container = this.getOrCreateErrorContainer();
        
        const colors = {
            success: { bg: '#d4edda', text: '#155724', border: '#c3e6cb' },
            info: { bg: '#d1ecf1', text: '#0c5460', border: '#bee5eb' },
            warning: { bg: '#fff3cd', text: '#856404', border: '#ffeaa7' },
            error: { bg: '#f8d7da', text: '#721c24', border: '#f5c6cb' }
        };

        const color = colors[type] || colors.info;

        const notification = document.createElement('div');
        notification.className = 'global-notification';
        notification.style.cssText = `
            background: ${color.bg};
            color: ${color.text};
            padding: 1rem;
            border-radius: 8px;
            border: 1px solid ${color.border};
            margin: 1rem 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
        `;

        notification.innerHTML = `
            <div>${message}</div>
            <button onclick="this.parentElement.remove()" style="
                background: none;
                border: none;
                font-size: 1.2rem;
                cursor: pointer;
                color: ${color.text};
            ">×</button>
        `;

        container.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    getOrCreateErrorContainer() {
        let container = document.getElementById('global-error-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'global-error-container';
            container.style.cssText = `
                position: fixed;
                top: 80px;
                right: 20px;
                z-index: 9999;
                max-width: 400px;
                width: 100%;
            `;
            document.body.appendChild(container);
        }
        return container;
    }

    // Wrap async functions with error handling
    static wrapAsync(fn) {
        return async function(...args) {
            try {
                return await fn.apply(this, args);
            } catch (error) {
                window.errorHandler?.handleError({
                    type: 'Async Function Error',
                    message: error.message,
                    stack: error.stack,
                    function: fn.name
                });
                throw error;
            }
        };
    }

    // Enhanced fetch with error handling
    static async safeFetch(url, options = {}) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return response;
        } catch (error) {
            window.errorHandler?.showNotification(
                `Failed to connect to server. Please try again.`,
                'error'
            );
            throw error;
        }
    }

    // Get error report for debugging
    getErrorReport() {
        return {
            errors: this.errorLog.slice(-50), // Last 50 errors
            timestamp: new Date().toISOString(),
            page: window.location.href,
            userAgent: navigator.userAgent
        };
    }

    // Clear error log
    clearErrorLog() {
        this.errorLog = [];
    }
}

// Initialize global error handler
window.errorHandler = new ErrorHandler();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}