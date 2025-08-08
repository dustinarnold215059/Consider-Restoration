module.exports = (sequelize, DataTypes) => {
    const BlockedDate = sequelize.define('BlockedDate', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        reason: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM('vacation', 'personal', 'medical', 'training', 'other'),
            allowNull: false,
            defaultValue: 'personal'
        },
        isFullDay: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        startTime: {
            type: DataTypes.TIME,
            allowNull: true
        },
        endTime: {
            type: DataTypes.TIME,
            allowNull: true
        }
    }, {
        tableName: 'blocked_dates',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                unique: false,
                fields: ['date']
            }
        ]
    });

    return BlockedDate;
};