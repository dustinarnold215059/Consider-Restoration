#!/usr/bin/env node

/**
 * Security Secrets Generator
 * Generates cryptographically secure secrets for production deployment
 * 
 * Usage: node scripts/generate-secrets.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 Security Secrets Generator');
console.log('============================\n');

/**
 * Generate cryptographically secure random string
 */
function generateSecureSecret(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate all required secrets
 */
function generateAllSecrets() {
    const secrets = {
        SESSION_SECRET: generateSecureSecret(32),
        JWT_SECRET: generateSecureSecret(32),
        ENCRYPTION_KEY: generateSecureSecret(32),
        ADMIN_SETUP_TOKEN: generateSecureSecret(16),
        HEALTH_CHECK_SECRET: generateSecureSecret(16),
        MONITORING_API_KEY: generateSecureSecret(24)
    };

    return secrets;
}

/**
 * Display secrets in a secure format
 */
function displaySecrets(secrets) {
    console.log('Generated Secrets (KEEP SECURE!)');
    console.log('================================\n');
    
    Object.entries(secrets).forEach(([key, value]) => {
        console.log(`${key}=${value}`);
    });
    
    console.log('\n⚠️  SECURITY WARNINGS:');
    console.log('• Store these secrets securely (password manager, vault, etc.)');
    console.log('• Never commit secrets to version control');
    console.log('• Use different secrets for each environment');
    console.log('• Rotate secrets regularly');
    console.log('• Limit access to production secrets');
}

/**
 * Save secrets to a secure file
 */
function saveSecretsToFile(secrets) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `secrets-${timestamp}.env`;
    const filepath = path.join(__dirname, '..', 'secrets', filename);
    
    // Create secrets directory if it doesn't exist
    const secretsDir = path.dirname(filepath);
    if (!fs.existsSync(secretsDir)) {
        fs.mkdirSync(secretsDir, { recursive: true });
    }
    
    // Generate .env content
    const envContent = Object.entries(secrets)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    
    const fullContent = `# Generated Secrets - ${new Date().toISOString()}
# SECURITY WARNING: Keep this file secure and never commit to version control!
# Use these values in your production .env file

${envContent}

# Additional production configuration needed:
# DATABASE_URL=postgresql://username:password@host:port/database
# SENDGRID_API_KEY=your_sendgrid_api_key
# STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
# STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
# STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
# ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
`;
    
    try {
        fs.writeFileSync(filepath, fullContent, { mode: 0o600 }); // Owner read/write only
        console.log(`\n✅ Secrets saved to: ${filepath}`);
        console.log('📁 File permissions set to 600 (owner read/write only)');
    } catch (error) {
        console.error(`\n❌ Failed to save secrets file: ${error.message}`);
    }
}

/**
 * Generate password hash for admin user
 */
async function generateAdminPasswordHash() {
    const bcrypt = require('bcryptjs');
    const password = process.argv[2] || 'admin123';
    
    console.log('\n🔑 Admin Password Hash Generator');
    console.log('================================');
    
    try {
        const hash = await bcrypt.hash(password, 12);
        console.log(`Password: ${password}`);
        console.log(`Bcrypt Hash: ${hash}`);
        console.log('\n⚠️  Change the default password immediately after first login!');
        return hash;
    } catch (error) {
        console.error('Failed to generate password hash:', error.message);
        return null;
    }
}

/**
 * Validate existing environment variables
 */
function validateExistingSecrets() {
    console.log('\n🔍 Environment Validation');
    console.log('========================');
    
    const requiredVars = [
        'SESSION_SECRET',
        'JWT_SECRET',
        'DATABASE_URL',
        'SENDGRID_API_KEY'
    ];
    
    const warnings = [];
    const errors = [];
    
    requiredVars.forEach(varName => {
        const value = process.env[varName];
        
        if (!value) {
            errors.push(`Missing: ${varName}`);
        } else if (value.includes('placeholder') || value.includes('development') || value.includes('REPLACE')) {
            warnings.push(`Placeholder value: ${varName}`);
        } else if (varName.includes('SECRET') && value.length < 32) {
            warnings.push(`Weak secret: ${varName} (should be at least 32 chars)`);
        }
    });
    
    if (errors.length > 0) {
        console.log('❌ ERRORS:');
        errors.forEach(error => console.log(`   ${error}`));
    }
    
    if (warnings.length > 0) {
        console.log('⚠️  WARNINGS:');
        warnings.forEach(warning => console.log(`   ${warning}`));
    }
    
    if (errors.length === 0 && warnings.length === 0) {
        console.log('✅ All required environment variables are properly configured');
    }
    
    return { errors, warnings };
}

/**
 * Main function
 */
async function main() {
    try {
        // Generate new secrets
        const secrets = generateAllSecrets();
        displaySecrets(secrets);
        
        // Save to file
        saveSecretsToFile(secrets);
        
        // Generate admin password hash
        await generateAdminPasswordHash();
        
        // Validate existing environment
        const validation = validateExistingSecrets();
        
        console.log('\n📋 Next Steps:');
        console.log('=============');
        console.log('1. Copy the generated secrets to your production .env file');
        console.log('2. Set your production database URL and other service keys');
        console.log('3. Ensure .env files are in .gitignore');
        console.log('4. Set proper file permissions (600) on production .env');
        console.log('5. Use a proper secrets management service for real production');
        console.log('6. Test the configuration in a staging environment first');
        
        if (validation.errors.length > 0) {
            console.log('\n🔴 CRITICAL: Fix the errors above before deploying to production!');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('\n❌ Error generating secrets:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = {
    generateSecureSecret,
    generateAllSecrets,
    generateAdminPasswordHash,
    validateExistingSecrets
};