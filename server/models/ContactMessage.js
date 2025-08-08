module.exports = (sequelize, DataTypes) => {
    const ContactMessage = sequelize.define('ContactMessage', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        subject: {
            type: DataTypes.STRING(50),
            allowNull: false
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('new', 'read', 'replied'),
            allowNull: false,
            defaultValue: 'new'
        },
        ipAddress: {
            type: DataTypes.STRING(45),
            allowNull: true
        }
    }, {
        tableName: 'contact_messages',
        timestamps: true,
        underscored: true
    });

    return ContactMessage;
};