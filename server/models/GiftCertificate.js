module.exports = (sequelize, DataTypes) => {
    const GiftCertificate = sequelize.define('GiftCertificate', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        code: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        purchasedBy: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id'
            }
        },
        recipientId: {
            type: DataTypes.UUID,
            references: {
                model: 'Users',
                key: 'id'
            }
        },
        recipientName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        recipientEmail: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isEmail: true
            }
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: 10.00
            }
        },
        originalAmount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        balance: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM('amount', 'service', 'package'),
            defaultValue: 'amount'
        },
        serviceId: {
            type: DataTypes.UUID,
            references: {
                model: 'Services',
                key: 'id'
            }
        },
        packageDetails: {
            type: DataTypes.JSON // For package gift certificates
        },
        status: {
            type: DataTypes.ENUM('active', 'partially_used', 'fully_used', 'expired', 'cancelled'),
            defaultValue: 'active'
        },
        purchaseDate: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        expirationDate: {
            type: DataTypes.DATE,
            allowNull: false
        },
        activationDate: {
            type: DataTypes.DATE
        },
        firstUsedDate: {
            type: DataTypes.DATE
        },
        lastUsedDate: {
            type: DataTypes.DATE
        },
        message: {
            type: DataTypes.TEXT
        },
        deliveryMethod: {
            type: DataTypes.ENUM('email', 'print', 'both'),
            defaultValue: 'email'
        },
        deliveryDate: {
            type: DataTypes.DATE
        },
        isDelivered: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        deliveredAt: {
            type: DataTypes.DATE
        },
        printDesign: {
            type: DataTypes.STRING // Path to print design template
        },
        restrictions: {
            type: DataTypes.JSON // Any usage restrictions
        },
        purchasePrice: {
            type: DataTypes.DECIMAL(10, 2) // Actual amount paid (for promotions)
        },
        paymentIntentId: {
            type: DataTypes.STRING // Stripe payment intent ID
        },
        refundAmount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        },
        refundDate: {
            type: DataTypes.DATE
        },
        refundReason: {
            type: DataTypes.STRING
        },
        usageHistory: {
            type: DataTypes.JSON,
            defaultValue: []
        },
        notes: {
            type: DataTypes.TEXT
        },
        isGift: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        occasion: {
            type: DataTypes.STRING // Birthday, Anniversary, Holiday, etc.
        },
        customization: {
            type: DataTypes.JSON // Custom colors, fonts, etc.
        }
    }, {
        hooks: {
            beforeCreate: (certificate) => {
                // Generate unique certificate code
                if (!certificate.code) {
                    certificate.code = 'GC-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
                }
                
                // Set initial balance
                certificate.balance = certificate.amount;
                certificate.originalAmount = certificate.amount;
                
                // Set expiration date (1 year from purchase)
                if (!certificate.expirationDate) {
                    const expirationDate = new Date();
                    expirationDate.setFullYear(expirationDate.getFullYear() + 1);
                    certificate.expirationDate = expirationDate;
                }
            }
        },
        indexes: [
            {
                fields: ['code'],
                unique: true
            },
            {
                fields: ['purchasedBy']
            },
            {
                fields: ['recipientId']
            },
            {
                fields: ['status']
            },
            {
                fields: ['expirationDate']
            }
        ],
        validate: {
            balanceNotExceedAmount() {
                if (this.balance > this.amount) {
                    throw new Error('Balance cannot exceed original amount');
                }
            }
        }
    });

    // Instance methods
    GiftCertificate.prototype.canBeUsed = function() {
        const now = new Date();
        return this.status === 'active' && 
               this.balance > 0 && 
               this.expirationDate > now;
    };

    GiftCertificate.prototype.isExpired = function() {
        return new Date() > this.expirationDate;
    };

    GiftCertificate.prototype.useAmount = function(amount) {
        if (!this.canBeUsed()) {
            throw new Error('Gift certificate cannot be used');
        }
        
        if (amount > this.balance) {
            throw new Error('Insufficient balance on gift certificate');
        }
        
        this.balance -= amount;
        
        // Track usage
        const usage = {
            date: new Date(),
            amount: amount,
            balanceAfter: this.balance
        };
        
        if (!this.usageHistory) {
            this.usageHistory = [];
        }
        this.usageHistory.push(usage);
        
        // Update status
        if (this.balance === 0) {
            this.status = 'fully_used';
        } else if (this.balance < this.originalAmount) {
            this.status = 'partially_used';
        }
        
        // Update usage dates
        if (!this.firstUsedDate) {
            this.firstUsedDate = new Date();
        }
        this.lastUsedDate = new Date();
        
        return this.balance;
    };

    GiftCertificate.prototype.getRemainingValue = function() {
        return this.canBeUsed() ? this.balance : 0;
    };

    // Class methods
    GiftCertificate.findByCode = async function(code) {
        return await this.findOne({
            where: { code: code.toUpperCase() },
            include: [
                { model: sequelize.models.User, as: 'purchaser' },
                { model: sequelize.models.User, as: 'recipient' }
            ]
        });
    };

    GiftCertificate.getExpiringSoon = async function(days = 30) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        
        return await this.findAll({
            where: {
                status: ['active', 'partially_used'],
                expirationDate: {
                    [sequelize.Op.between]: [new Date(), futureDate]
                }
            },
            include: [
                { model: sequelize.models.User, as: 'purchaser' },
                { model: sequelize.models.User, as: 'recipient' }
            ]
        });
    };

    return GiftCertificate;
};