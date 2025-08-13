const { Sequelize } = require('sequelize');
const { getSecurityConfig } = require('./security');
require('dotenv').config();

// Get security configuration
const securityConfig = getSecurityConfig();
const environment = process.env.NODE_ENV || 'development';

// Helper function to determine database dialect from URL
function getDatabaseDialect(url) {
  if (!url) return 'sqlite';
  if (url.startsWith('sqlite:')) return 'sqlite';
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) return 'postgres';
  if (url.startsWith('mysql://')) return 'mysql';
  return 'sqlite'; // Default fallback
}

// Helper function to get database configuration
function getDatabaseConfig(env) {
  const databaseUrl = process.env.DATABASE_URL;
  const dialect = getDatabaseDialect(databaseUrl);
  
  const baseConfig = {
    use_env_variable: 'DATABASE_URL',
    dialect: dialect,
    logging: securityConfig.database.logging,
    pool: {
      max: env === 'production' ? 20 : 5,
      min: env === 'production' ? 5 : 0,
      acquire: env === 'production' ? 60000 : 30000,
      idle: 10000
    }
  };

  // Add SSL configuration for production PostgreSQL
  if (env === 'production' && dialect === 'postgres') {
    baseConfig.dialectOptions = securityConfig.database.dialectOptions;
  }

  // For SQLite, remove use_env_variable and set storage directly
  if (dialect === 'sqlite') {
    delete baseConfig.use_env_variable;
    baseConfig.storage = databaseUrl ? databaseUrl.replace('sqlite:', '') : './dev-database.sqlite';
  }

  return baseConfig;
}

const config = {
  development: getDatabaseConfig('development'),
  test: {
    ...getDatabaseConfig('test'),
    logging: false // Always disable logging in tests
  },
  production: getDatabaseConfig('production')
};

// Validate configuration
if (environment === 'production') {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required in production');
  }
  
  if (process.env.DATABASE_URL.includes('placeholder') || 
      process.env.DATABASE_URL.includes('development')) {
    throw new Error('Production DATABASE_URL cannot contain placeholder or development values');
  }
  
  console.log('✅ Production database configuration validated');
} else {
  console.log(`📊 Database configuration loaded for ${environment} environment`);
}

module.exports = config;