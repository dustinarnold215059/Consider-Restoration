const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [2, 100]
            }
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true,
                is: /^[\+]?[1-9][\d]{0,15}$/
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                len: [6, 255]
            }
        },
        role: {
            type: DataTypes.ENUM('user', 'admin'),
            defaultValue: 'user'
        },
        preferences: {
            type: DataTypes.TEXT,
            defaultValue: ''
        },
        membershipType: {
            type: DataTypes.ENUM('none', 'wellness', 'restoration-plus', 'therapeutic-elite'),
            defaultValue: 'none'
        },
        membershipStatus: {
            type: DataTypes.ENUM('active', 'paused', 'cancelled'),
            defaultValue: 'active'
        },
        membershipStartDate: {
            type: DataTypes.DATE
        },
        membershipSessionsRemaining: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        loyaltyPoints: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        totalVisits: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        lastVisit: {
            type: DataTypes.DATE
        },
        emailVerified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        emailVerificationToken: {
            type: DataTypes.STRING
        },
        passwordResetToken: {
            type: DataTypes.STRING
        },
        passwordResetExpires: {
            type: DataTypes.DATE
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        profileImage: {
            type: DataTypes.STRING
        },
        dateOfBirth: {
            type: DataTypes.DATE
        },
        emergencyContact: {
            type: DataTypes.JSON
        },
        medicalNotes: {
            type: DataTypes.TEXT
        },
        marketingOptIn: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        reminderPreferences: {
            type: DataTypes.JSON,
            defaultValue: {
                email: true,
                sms: false,
                hours: 24
            }
        }
    }, {
        hooks: {
            beforeCreate: async (user) => {
                if (user.password) {
                    user.password = await bcrypt.hash(user.password, 12);
                }
            },
            beforeUpdate: async (user) => {
                if (user.changed('password')) {
                    user.password = await bcrypt.hash(user.password, 12);
                }
            }
        },
        indexes: [
            {
                fields: ['email']
            },
            {
                fields: ['role']
            },
            {
                fields: ['membershipType']
            }
        ]
    });

    // Instance methods
    User.prototype.validatePassword = async function(password) {
        return await bcrypt.compare(password, this.password);
    };

    User.prototype.toJSON = function() {
        const values = Object.assign({}, this.get());
        delete values.password;
        delete values.passwordResetToken;
        delete values.emailVerificationToken;
        return values;
    };

    User.prototype.generateAuthToken = function() {
        const jwt = require('jsonwebtoken');
        return jwt.sign(
            { 
                id: this.id, 
                email: this.email, 
                role: this.role 
            }, 
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
    };

    return User;
};