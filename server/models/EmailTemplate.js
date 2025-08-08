module.exports = (sequelize, DataTypes) => {
    const EmailTemplate = sequelize.define('EmailTemplate', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true
        },
        subject: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        htmlBody: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        textBody: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        variables: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: []
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        category: {
            type: DataTypes.ENUM('appointment', 'user', 'system', 'marketing'),
            allowNull: false,
            defaultValue: 'system'
        }
    }, {
        tableName: 'email_templates',
        timestamps: true,
        underscored: true
    });

    return EmailTemplate;
};