const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/database');
require('dotenv').config();

// Get environment-specific configuration
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Initialize Sequelize with proper configuration
let sequelize;
if (dbConfig.use_env_variable) {
    // Use environment variable for database URL (PostgreSQL)
    if (process.env[dbConfig.use_env_variable]) {
        sequelize = new Sequelize(process.env[dbConfig.use_env_variable], {
            dialect: dbConfig.dialect,
            logging: dbConfig.logging,
            pool: dbConfig.pool,
            dialectOptions: dbConfig.dialectOptions || {}
        });
    } else {
        // Fallback to SQLite for local development if no DATABASE_URL is set
        console.warn('DATABASE_URL not found, falling back to SQLite for development');
        sequelize = new Sequelize({
            dialect: 'sqlite',
            storage: env === 'development' ? './dev-database.sqlite' : './database.sqlite',
            logging: env === 'development' ? console.log : false,
            pool: dbConfig.pool
        });
    }
} else {
    // Direct database configuration
    sequelize = new Sequelize(dbConfig);
}

// Import models
const User = require('./User')(sequelize, DataTypes);
const Appointment = require('./Appointment')(sequelize, DataTypes);
const Service = require('./Service')(sequelize, DataTypes);
const Payment = require('./Payment')(sequelize, DataTypes);
const GiftCertificate = require('./GiftCertificate')(sequelize, DataTypes);
const Waitlist = require('./Waitlist')(sequelize, DataTypes);
const BlockedDate = require('./BlockedDate')(sequelize, DataTypes);
const EmailTemplate = require('./EmailTemplate')(sequelize, DataTypes);
const Analytics = require('./Analytics')(sequelize, DataTypes);
const ContactMessage = require('./ContactMessage')(sequelize, DataTypes);

// Define associations
User.hasMany(Appointment, { foreignKey: 'userId', as: 'appointments' });
User.hasMany(Payment, { foreignKey: 'userId', as: 'payments' });
User.hasMany(GiftCertificate, { foreignKey: 'purchasedBy', as: 'purchasedCertificates' });
User.hasMany(GiftCertificate, { foreignKey: 'recipientId', as: 'receivedCertificates' });
User.hasMany(Waitlist, { foreignKey: 'userId', as: 'waitlistEntries' });

Appointment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Appointment.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });
Appointment.hasOne(Payment, { foreignKey: 'appointmentId', as: 'payment' });

Service.hasMany(Appointment, { foreignKey: 'serviceId', as: 'appointments' });

Payment.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Payment.belongsTo(Appointment, { foreignKey: 'appointmentId', as: 'appointment' });

GiftCertificate.belongsTo(User, { foreignKey: 'purchasedBy', as: 'purchaser' });
GiftCertificate.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });

Waitlist.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Waitlist.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });

module.exports = {
    sequelize,
    User,
    Appointment,
    Service,
    Payment,
    GiftCertificate,
    Waitlist,
    BlockedDate,
    EmailTemplate,
    Analytics,
    ContactMessage
};