/**
 * Environment Configuration Utility
 * Handles development vs production URL configuration and environment detection
 */

class EnvironmentConfig {
    constructor() {
        this.environment = this.detectEnvironment();
        this.config = this.loadConfiguration();
    }

    detectEnvironment() {
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        const port = window.location.port;

        // Development environment detection
        if (hostname === 'localhost' || 
            hostname === '127.0.0.1' || 
            hostname.includes('.local') ||
            protocol === 'file:' ||
            port === '8080' || 
            port === '3000' || 
            port === '5500') {
            return 'development';
        }

        // Staging environment detection
        if (hostname.includes('staging.') || 
            hostname.includes('test.') || 
            hostname.includes('dev.')) {
            return 'staging';
        }

        // Production environment
        return 'production';
    }

    loadConfiguration() {
        const configs = {
            development: {
                apiBaseUrl: 'http://localhost:3060/api',
                websiteUrl: 'http://localhost:8080',
                stripePublishableKey: 'pk_test_51234567890abcdef', // Development Stripe key
                enableLogging: true,
                enableDetailedErrors: true,
                corsEnabled: true
            },
            staging: {
                apiBaseUrl: 'https://api-staging.considerrestoration.com/api',
                websiteUrl: 'https://staging.considerrestoration.com',
                stripePublishableKey: 'pk_test_staging_key_here', // Staging Stripe key
                enableLogging: true,
                enableDetailedErrors: true,
                corsEnabled: true
            },
            production: {
                apiBaseUrl: 'https://consider-restoration.vercel.app/api',
                websiteUrl: 'https://consider-restoration.vercel.app',
                stripePublishableKey: 'pk_live_production_key_here', // Production Stripe key
                enableLogging: false,
                enableDetailedErrors: false,
                corsEnabled: false
            }
        };

        return configs[this.environment] || configs.production;
    }

    // URL builders
    getApiUrl(endpoint = '') {
        const baseUrl = this.config.apiBaseUrl.replace(/\/$/, ''); // Remove trailing slash
        const cleanEndpoint = endpoint.replace(/^\//, ''); // Remove leading slash
        return cleanEndpoint ? `${baseUrl}/${cleanEndpoint}` : baseUrl;
    }

    getWebsiteUrl(path = '') {
        const baseUrl = this.config.websiteUrl.replace(/\/$/, ''); // Remove trailing slash
        const cleanPath = path.replace(/^\//, ''); // Remove leading slash
        return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
    }

    // Specific API endpoints
    getAuthUrl(action = '') {
        return this.getApiUrl(`auth/${action}`);
    }

    getAdminUrl(action = '') {
        return this.getApiUrl(`admin/${action}`);
    }

    getUserUrl(action = '') {
        return this.getApiUrl(`users/${action}`);
    }

    getBookingUrl(action = '') {
        return this.getApiUrl(`appointments/${action}`);
    }

    getContactUrl(action = '') {
        return this.getApiUrl(`contact/${action}`);
    }

    getHealthUrl() {
        return this.getApiUrl('health');
    }

    // Configuration getters
    getStripeKey() {
        return this.config.stripePublishableKey;
    }

    isLoggingEnabled() {
        return this.config.enableLogging;
    }

    areDetailedErrorsEnabled() {
        return this.config.enableDetailedErrors;
    }

    isCorsEnabled() {
        return this.config.corsEnabled;
    }

    isDevelopment() {
        return this.environment === 'development';
    }

    isStaging() {
        return this.environment === 'staging';
    }

    isProduction() {
        return this.environment === 'production';
    }

    // Override configuration (for testing or dynamic configuration)
    setApiBaseUrl(url) {
        this.config.apiBaseUrl = url;
        if (typeof logger !== 'undefined') {
            logger.warn(`API base URL overridden to: ${url}`);
        }
    }

    setStripeKey(key) {
        this.config.stripePublishableKey = key;
        if (typeof logger !== 'undefined') {
            logger.info('Stripe publishable key updated');
        }
    }

    // Debug information
    getDebugInfo() {
        return {
            environment: this.environment,
            hostname: window.location.hostname,
            protocol: window.location.protocol,
            port: window.location.port,
            apiBaseUrl: this.config.apiBaseUrl,
            websiteUrl: this.config.websiteUrl,
            loggingEnabled: this.config.enableLogging,
            detailedErrors: this.config.enableDetailedErrors
        };
    }

    // Method to validate configuration
    validateConfiguration() {
        const issues = [];

        if (!this.config.apiBaseUrl) {
            issues.push('Missing API base URL');
        }

        if (!this.config.websiteUrl) {
            issues.push('Missing website URL');
        }

        if (!this.config.stripePublishableKey || this.config.stripePublishableKey.includes('placeholder')) {
            issues.push('Invalid or placeholder Stripe key');
        }

        if (this.isProduction() && this.config.stripePublishableKey.includes('test')) {
            issues.push('Test Stripe key detected in production environment');
        }

        if (issues.length > 0 && typeof logger !== 'undefined') {
            logger.warn('Configuration validation issues:', issues);
        }

        return issues;
    }
}

// Create global instance
const EnvConfig = new EnvironmentConfig();

// Make it available globally
window.EnvConfig = EnvConfig;

// Log environment information in development
if (EnvConfig.isDevelopment() && typeof logger !== 'undefined') {
    logger.info('Environment configuration loaded:', EnvConfig.getDebugInfo());
    
    const validationIssues = EnvConfig.validateConfiguration();
    if (validationIssues.length > 0) {
        logger.warn('Configuration validation failed:', validationIssues);
    }
}

// For backward compatibility, also expose commonly used URLs
window.API_BASE_URL = EnvConfig.getApiUrl();
window.WEBSITE_BASE_URL = EnvConfig.getWebsiteUrl();