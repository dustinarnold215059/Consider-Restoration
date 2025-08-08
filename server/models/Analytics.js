module.exports = (sequelize, DataTypes) => {
    const Analytics = sequelize.define('Analytics', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        eventType: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        eventData: {
            type: DataTypes.JSONB,
            allowNull: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Users',
                key: 'id'
            }
        },
        sessionId: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        ipAddress: {
            type: DataTypes.INET,
            allowNull: true
        },
        userAgent: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        timestamp: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'analytics',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                fields: ['event_type', 'timestamp']
            },
            {
                fields: ['user_id']
            },
            {
                fields: ['timestamp']
            }
        ]
    });

    return Analytics;
};