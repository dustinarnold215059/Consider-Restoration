module.exports = (sequelize, DataTypes) => {
    const Payment = sequelize.define('Payment', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id'
            }
        },
        appointmentId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Appointments',
                key: 'id'
            }
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        currency: {
            type: DataTypes.STRING(3),
            allowNull: false,
            defaultValue: 'USD'
        },
        status: {
            type: DataTypes.ENUM('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded'),
            allowNull: false,
            defaultValue: 'pending'
        },
        paymentMethod: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        stripePaymentId: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        transactionId: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        metadata: {
            type: DataTypes.JSONB,
            allowNull: true
        },
        processedAt: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'payments',
        timestamps: true,
        underscored: true
    });

    return Payment;
};