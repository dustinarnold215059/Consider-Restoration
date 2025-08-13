// Security Configuration Module
// Handles environment-specific security settings and validation

const crypto = require('crypto');
require('dotenv').config();

class SecurityConfig {
    constructor() {
        this.environment = process.env.NODE_ENV || 'development';
        this.validateConfiguration();
    }

    validateConfiguration() {
        const requiredVars = [
            'SESSION_SECRET',
            'JWT_SECRET',
            'BCRYPT_ROUNDS'
        ];

        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            console.error('🔴 CRITICAL: Missing required environment variables:', missingVars);
            
            if (this.environment === 'production') {
                throw new Error(`Missing critical environment variables: ${missingVars.join(', ')}`);
            } else {
                console.warn('⚠️ Using development defaults for missing variables');
                this.setDevelopmentDefaults(missingVars);
            }
        }

        this.validateSecurityRequirements();
    }

    setDevelopmentDefaults(missingVars) {
        const defaults = {
            SESSION_SECRET: 'dev_session_secret_' + crypto.randomBytes(16).toString('hex'),
            JWT_SECRET: 'dev_jwt_secret_' + crypto.randomBytes(32).toString('hex'),
            BCRYPT_ROUNDS: '12'
        };

        missingVars.forEach(varName => {
            if (defaults[varName]) {
                process.env[varName] = defaults[varName];
                console.warn(`⚠️ Set development default for ${varName}`);
            }
        });
    }

    validateSecurityRequirements() {
        // Validate SESSION_SECRET strength
        const sessionSecret = process.env.SESSION_SECRET;
        if (sessionSecret.length < 32) {
            if (this.environment === 'production') {
                throw new Error('SESSION_SECRET must be at least 32 characters in production');
            } else {
                console.warn('⚠️ SESSION_SECRET should be at least 32 characters');
            }
        }

        // Validate JWT_SECRET strength
        const jwtSecret = process.env.JWT_SECRET;
        if (jwtSecret.length < 32) {
            if (this.environment === 'production') {
                throw new Error('JWT_SECRET must be at least 32 characters in production');
            } else {
                console.warn('⚠️ JWT_SECRET should be at least 32 characters');
            }
        }

        // Validate bcrypt rounds
        const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS);
        if (bcryptRounds < 10) {
            throw new Error('BCRYPT_ROUNDS must be at least 10 for security');
        }

        console.log('✅ Security configuration validated');
    }

    getSecurityConfig() {
        return {
            // Session Configuration
            session: {
                secret: process.env.SESSION_SECRET,
                resave: false,
                saveUninitialized: false,
                cookie: {
                    secure: this.environment === 'production', // HTTPS only in production
                    httpOnly: true, // Prevent XSS
                    maxAge: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30') * 60 * 1000,
                    sameSite: 'strict' // CSRF protection
                },
                name: 'sessionId' // Hide default session name
            },

            // JWT Configuration
            jwt: {
                secret: process.env.JWT_SECRET,
                expiresIn: '24h',
                issuer: 'consider-restoration',
                audience: 'massage-therapy-app'
            },

            // Password Hashing
            bcrypt: {
                rounds: parseInt(process.env.BCRYPT_ROUNDS || '12')
            },

            // Rate Limiting
            rateLimit: {
                windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
                max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
                message: 'Too many requests from this IP, please try again later.',
                standardHeaders: true,
                legacyHeaders: false
            },

            // Authentication Rate Limiting (stricter)
            authRateLimit: {
                windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
                max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5'),
                message: 'Too many authentication attempts, please try again later.',
                standardHeaders: true,
                legacyHeaders: false,
                skipSuccessfulRequests: true
            },

            // CORS Configuration
            cors: {
                origin: this.getAllowedOrigins(),
                credentials: true,
                methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
            },

            // Security Headers (Helmet configuration)
            helmet: {
                contentSecurityPolicy: {
                    directives: {
                        defaultSrc: ["'self'"],
                        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                        fontSrc: ["'self'", "https://fonts.gstatic.com"],
                        scriptSrc: this.getScriptSources(),
                        connectSrc: this.getConnectSources(),
                        frameSrc: ["https://js.stripe.com"],
                        imgSrc: ["'self'", "data:", "https:"],
                        objectSrc: ["'none'"],
                        mediaSrc: ["'self'"],
                        childSrc: ["'none'"]
                    },
                },
                crossOriginEmbedderPolicy: false, // Disable for Stripe compatibility
                hsts: {
                    maxAge: 31536000, // 1 year
                    includeSubDomains: true,
                    preload: true
                }
            },

            // Database Security
            database: {
                ssl: this.environment === 'production',
                dialectOptions: this.environment === 'production' ? {
                    ssl: {
                        require: true,
                        rejectUnauthorized: false
                    }
                } : {},
                logging: this.environment !== 'production' ? console.log : false
            }
        };
    }

    getAllowedOrigins() {
        const origins = process.env.ALLOWED_ORIGINS || 'http://localhost:3050';
        return origins.split(',').map(origin => origin.trim());
    }

    getScriptSources() {
        const baseSources = ["'self'"];
        
        if (this.environment === 'development') {
            baseSources.push("'unsafe-eval'"); // Allow eval in development for debugging
        }
        
        return baseSources.concat([
            "https://js.stripe.com",
            "https://www.googletagmanager.com",
            "https://cdn.jsdelivr.net" // For bcryptjs CDN
        ]);
    }

    getConnectSources() {
        const baseSources = ["'self'"];
        
        return baseSources.concat([
            "https://api.stripe.com",
            "https://api.sendgrid.com"
        ]);
    }

    // Generate secure secrets for development (should be manually set for production)
    generateSecureSecrets() {
        return {
            sessionSecret: crypto.randomBytes(32).toString('hex'),
            jwtSecret: crypto.randomBytes(32).toString('hex'),
            encryptionKey: crypto.randomBytes(32).toString('hex'),
            adminSetupToken: crypto.randomBytes(16).toString('hex')
        };
    }

    // Validate admin setup
    validateAdminSetup() {
        const adminToken = process.env.ADMIN_SETUP_TOKEN;
        
        if (!adminToken || adminToken === 'GENERATE_SECURE_ADMIN_SETUP_TOKEN') {
            if (this.environment === 'production') {
                throw new Error('ADMIN_SETUP_TOKEN must be set to a secure value in production');
            } else {
                console.warn('⚠️ ADMIN_SETUP_TOKEN not set, using development default');
                process.env.ADMIN_SETUP_TOKEN = crypto.randomBytes(16).toString('hex');
            }
        }
    }

    // Security audit logging
    logSecurityEvent(event, details = {}) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            event,
            environment: this.environment,
            ...details
        };

        console.log('🔒 SECURITY EVENT:', JSON.stringify(logEntry));
        
        // In production, you would send this to a security monitoring service
        // Example: await securityMonitoring.logEvent(logEntry);
    }

    // Check if running in secure environment
    isSecureEnvironment() {
        if (this.environment === 'production') {
            const requiredProductionVars = [
                'DATABASE_URL',
                'SESSION_SECRET',
                'JWT_SECRET',
                'SENDGRID_API_KEY'
            ];

            const missingProdVars = requiredProductionVars.filter(
                varName => !process.env[varName] || 
                process.env[varName].includes('placeholder') ||
                process.env[varName].includes('development')
            );

            if (missingProdVars.length > 0) {
                throw new Error(`Production deployment blocked: Missing or placeholder values for: ${missingProdVars.join(', ')}`);
            }
        }

        return this.environment === 'production';
    }
}

// Create singleton instance
const securityConfig = new SecurityConfig();

module.exports = {
    SecurityConfig,
    securityConfig,
    getSecurityConfig: () => securityConfig.getSecurityConfig(),
    validateSecurity: () => securityConfig.validateSecurityRequirements(),
    isSecure: () => securityConfig.isSecureEnvironment(),
    logSecurityEvent: (event, details) => securityConfig.logSecurityEvent(event, details),
    generateSecrets: () => securityConfig.generateSecureSecrets()
};