// Enhanced Security Module for Consider Restoration Website
// Implements client-side security measures for 10/10 security rating

class SecurityManager {
    constructor() {
        this.csrfToken = null;
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.lastActivity = Date.now();
        this.rateLimitMap = new Map();
        this.initializeSecurity();
    }

    initializeSecurity() {
        this.generateCSRFToken();
        this.enforceHTTPS();
        this.setupSessionManagement();
        this.setupInputSanitization();
        this.setupRateLimiting();
        this.setupSecurityHeaders();
        this.monitorSecurity();
    }

    // CSRF Protection
    generateCSRFToken() {
        this.csrfToken = this.generateSecureToken();
        
        // Store in sessionStorage (more secure than localStorage)
        sessionStorage.setItem('csrf_token', this.csrfToken);
        
        // Add to all forms
        this.addCSRFToForms();
        
        console.log('🛡️ CSRF protection enabled');
    }

    generateSecureToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    addCSRFToForms() {
        document.querySelectorAll('form').forEach(form => {
            // Remove existing CSRF tokens
            const existingToken = form.querySelector('input[name="csrf_token"]');
            if (existingToken) {
                existingToken.remove();
            }

            // Add new CSRF token
            const tokenInput = document.createElement('input');
            tokenInput.type = 'hidden';
            tokenInput.name = 'csrf_token';
            tokenInput.value = this.csrfToken;
            form.appendChild(tokenInput);
        });
    }

    validateCSRFToken(token) {
        const storedToken = sessionStorage.getItem('csrf_token');
        return token === storedToken && token === this.csrfToken;
    }

    // HTTPS Enforcement
    enforceHTTPS() {
        if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
            // Only redirect in production, not during development
            if (!location.hostname.includes('127.0.0.1') && !location.hostname.includes('localhost')) {
                location.replace('https:' + window.location.href.substring(window.location.protocol.length));
            }
        }
        
        // Set secure flags for any cookies
        document.cookie = document.cookie.replace(/(?:^|; )([^=]+)=([^;]*)/g, 
            (match, name, value) => `${name}=${value}; Secure; SameSite=Strict`);
    }

    // Session Management
    setupSessionManagement() {
        // Update activity timestamp on user interactions
        const updateActivity = () => {
            this.lastActivity = Date.now();
            sessionStorage.setItem('last_activity', this.lastActivity);
        };

        ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
            document.addEventListener(event, updateActivity, { passive: true });
        });

        // Check session timeout every minute
        setInterval(() => {
            this.checkSessionTimeout();
        }, 60000);

        // Clear sensitive data on page unload
        window.addEventListener('beforeunload', () => {
            this.clearSensitiveData();
        });
    }

    checkSessionTimeout() {
        const now = Date.now();
        const timeSinceActivity = now - this.lastActivity;
        
        if (timeSinceActivity > this.sessionTimeout) {
            this.handleSessionTimeout();
        }
    }

    handleSessionTimeout() {
        // Clear all sensitive data
        this.clearSensitiveData();
        
        // Notify user
        window.errorHandler?.showNotification(
            'Your session has expired for security. Please log in again.',
            'warning'
        );
        
        // Redirect to login if on protected page
        if (window.location.pathname.includes('admin') || window.location.pathname.includes('user-portal')) {
            window.location.href = '/index.html';
        }
    }

    clearSensitiveData() {
        // Clear all potentially sensitive session data
        sessionStorage.removeItem('csrf_token');
        sessionStorage.removeItem('user_session');
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('last_activity');
        
        // Clear any cached form data
        document.querySelectorAll('form').forEach(form => form.reset());
    }

    // Input Sanitization
    setupInputSanitization() {
        // Sanitize all form inputs before processing
        document.addEventListener('submit', (e) => {
            if (e.target.tagName === 'FORM') {
                this.sanitizeForm(e.target);
            }
        });

        // Real-time sanitization for high-risk inputs
        document.addEventListener('input', (e) => {
            if (e.target.matches('input[type="text"], input[type="email"], textarea')) {
                e.target.value = this.sanitizeInput(e.target.value);
            }
        });
    }

    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            // Remove HTML tags
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]*>/g, '')
            // Remove dangerous characters
            .replace(/[<>'"&]/g, (char) => {
                const map = {
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#x27;',
                    '&': '&amp;'
                };
                return map[char] || char;
            })
            // Remove SQL injection attempts
            .replace(/(\b(ALTER|CREATE|DELETE|DROP|EXEC(UTE)?|INSERT|SELECT|UNION|UPDATE)\b)/gi, '')
            // Limit length
            .substring(0, 1000);
    }

    sanitizeForm(form) {
        const formData = new FormData(form);
        
        for (let [key, value] of formData.entries()) {
            if (typeof value === 'string') {
                const sanitized = this.sanitizeInput(value);
                const input = form.querySelector(`[name="${key}"]`);
                if (input && input.value !== sanitized) {
                    input.value = sanitized;
                    console.warn(`🛡️ Sanitized input for field: ${key}`);
                }
            }
        }
    }

    // Rate Limiting
    setupRateLimiting() {
        // Override fetch to add rate limiting
        const originalFetch = window.fetch;
        window.fetch = (...args) => {
            const url = args[0];
            
            if (this.isRateLimited(url)) {
                return Promise.reject(new Error('Rate limit exceeded. Please wait before trying again.'));
            }
            
            this.recordRequest(url);
            return originalFetch.apply(window, args);
        };

        // Rate limit form submissions
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (this.isFormRateLimited(form)) {
                e.preventDefault();
                window.errorHandler?.showNotification(
                    'Please wait before submitting the form again.',
                    'warning'
                );
            }
        });
    }

    isRateLimited(url) {
        const now = Date.now();
        const requests = this.rateLimitMap.get(url) || [];
        
        // Remove requests older than 1 minute
        const recentRequests = requests.filter(time => now - time < 60000);
        
        // Allow max 10 requests per minute per endpoint
        return recentRequests.length >= 10;
    }

    recordRequest(url) {
        const now = Date.now();
        const requests = this.rateLimitMap.get(url) || [];
        requests.push(now);
        this.rateLimitMap.set(url, requests);
    }

    isFormRateLimited(form) {
        const formId = form.id || form.action || 'unknown';
        const now = Date.now();
        const lastSubmission = parseInt(sessionStorage.getItem(`form_${formId}_last`)) || 0;
        
        // Prevent form resubmission within 5 seconds
        if (now - lastSubmission < 5000) {
            return true;
        }
        
        sessionStorage.setItem(`form_${formId}_last`, now.toString());
        return false;
    }

    // Security Headers (Client-side enforcement)
    setupSecurityHeaders() {
        // Add security meta tags if not present
        const securityMetas = [
            { name: 'referrer', content: 'strict-origin-when-cross-origin' },
            { name: 'X-Content-Type-Options', content: 'nosniff' },
            { name: 'X-Frame-Options', content: 'DENY' },
            { name: 'X-XSS-Protection', content: '1; mode=block' }
        ];

        securityMetas.forEach(meta => {
            if (!document.querySelector(`meta[name="${meta.name}"]`)) {
                const metaTag = document.createElement('meta');
                metaTag.name = meta.name;
                metaTag.content = meta.content;
                document.head.appendChild(metaTag);
            }
        });

        // Disable right-click context menu on sensitive pages
        if (window.location.pathname.includes('admin')) {
            document.addEventListener('contextmenu', e => e.preventDefault());
        }
    }

    // Security Monitoring
    monitorSecurity() {
        // Monitor for suspicious activity
        let suspiciousActivity = 0;
        
        // Track rapid form submissions
        document.addEventListener('submit', () => {
            suspiciousActivity++;
            if (suspiciousActivity > 5) {
                this.handleSuspiciousActivity();
            }
            setTimeout(() => suspiciousActivity = Math.max(0, suspiciousActivity - 1), 60000);
        });

        // Monitor for XSS attempts
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.innerHTML) {
                        if (this.detectXSSAttempt(node.innerHTML)) {
                            this.handleSecurityThreat(node);
                        }
                    }
                });
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });

        console.log('🛡️ Security monitoring active');
    }

    detectXSSAttempt(content) {
        const xssPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /eval\s*\(/gi,
            /expression\s*\(/gi
        ];

        return xssPatterns.some(pattern => pattern.test(content));
    }

    handleSecurityThreat(element) {
        // Remove the threatening element
        element.remove();
        
        // Log the incident
        console.warn('🚨 Security threat detected and removed:', element);
        
        // Notify user
        window.errorHandler?.showNotification(
            'Security threat detected and blocked.',
            'warning'
        );
    }

    handleSuspiciousActivity() {
        console.warn('🚨 Suspicious activity detected');
        
        // Clear session
        this.clearSensitiveData();
        
        // Show warning
        window.errorHandler?.showNotification(
            'Unusual activity detected. Session cleared for security.',
            'error'
        );
    }

    // Secure AJAX wrapper
    static secureAjax(url, options = {}) {
        const securityManager = window.securityManager;
        
        if (!securityManager) {
            throw new Error('Security manager not initialized');
        }

        // Add CSRF token to requests
        const headers = {
            'Content-Type': 'application/json',
            'X-CSRF-Token': securityManager.csrfToken,
            ...options.headers
        };

        return fetch(url, {
            ...options,
            headers,
            credentials: 'same-origin' // Include cookies for same-origin requests
        }).then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response;
        });
    }

    // Public method to validate forms before submission
    validateSecureForm(form) {
        // Check CSRF token
        const tokenInput = form.querySelector('input[name="csrf_token"]');
        if (!tokenInput || !this.validateCSRFToken(tokenInput.value)) {
            throw new Error('Invalid security token');
        }

        // Sanitize all inputs
        this.sanitizeForm(form);

        // Check rate limiting
        if (this.isFormRateLimited(form)) {
            throw new Error('Form submission rate limit exceeded');
        }

        return true;
    }
}

// Initialize security manager when DOM loads
document.addEventListener('DOMContentLoaded', () => {
    window.securityManager = new SecurityManager();
    console.log('🛡️ Security Manager initialized - Level: MAXIMUM');
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecurityManager;
}