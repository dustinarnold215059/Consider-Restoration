module.exports = (sequelize, DataTypes) => {
    const Service = sequelize.define('Service', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        slug: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        shortDescription: {
            type: DataTypes.STRING(255)
        },
        basePrice: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        priceRange: {
            type: DataTypes.STRING // e.g., "$100-150" for variable pricing
        },
        duration: {
            type: DataTypes.INTEGER, // in minutes
            allowNull: false
        },
        category: {
            type: DataTypes.ENUM(
                'massage',
                'bodywork',
                'consultation',
                'training',
                'specialty'
            ),
            defaultValue: 'massage'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        bookingEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        image: {
            type: DataTypes.STRING
        },
        images: {
            type: DataTypes.JSON // Array of image URLs
        },
        benefits: {
            type: DataTypes.JSON // Array of benefit strings
        },
        contraindications: {
            type: DataTypes.JSON // Array of contraindication strings
        },
        preparationInstructions: {
            type: DataTypes.TEXT
        },
        aftercareInstructions: {
            type: DataTypes.TEXT
        },
        targetAudience: {
            type: DataTypes.JSON // Array of target audience strings
        },
        techniques: {
            type: DataTypes.JSON // Array of technique strings
        },
        equipment: {
            type: DataTypes.JSON // Array of equipment needed
        },
        roomRequirements: {
            type: DataTypes.STRING
        },
        maxBookingsPerDay: {
            type: DataTypes.INTEGER,
            defaultValue: 8
        },
        advanceBookingDays: {
            type: DataTypes.INTEGER,
            defaultValue: 30
        },
        cancellationPolicy: {
            type: DataTypes.TEXT
        },
        membershipDiscount: {
            type: DataTypes.JSON // { wellness: 15, 'restoration-plus': 20, 'therapeutic-elite': 25 }
        },
        seasonalPricing: {
            type: DataTypes.JSON // Seasonal price adjustments
        },
        addOns: {
            type: DataTypes.JSON // Available add-ons with prices
        },
        requiredIntakeForm: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        intakeFormQuestions: {
            type: DataTypes.JSON
        },
        popularityScore: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        averageRating: {
            type: DataTypes.DECIMAL(3, 2),
            defaultValue: 0
        },
        totalBookings: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        seoTitle: {
            type: DataTypes.STRING
        },
        seoDescription: {
            type: DataTypes.TEXT
        },
        seoKeywords: {
            type: DataTypes.JSON
        }
    }, {
        hooks: {
            beforeCreate: (service) => {
                if (!service.slug) {
                    service.slug = service.name.toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)/g, '');
                }
            },
            beforeUpdate: (service) => {
                if (service.changed('name') && !service.changed('slug')) {
                    service.slug = service.name.toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)/g, '');
                }
            }
        },
        indexes: [
            {
                fields: ['slug']
            },
            {
                fields: ['category']
            },
            {
                fields: ['isActive']
            },
            {
                fields: ['popularityScore']
            }
        ]
    });

    // Class methods
    Service.getPopularServices = async function(limit = 6) {
        return await this.findAll({
            where: { isActive: true, bookingEnabled: true },
            order: [['popularityScore', 'DESC'], ['averageRating', 'DESC']],
            limit
        });
    };

    Service.getServicesByCategory = async function(category) {
        return await this.findAll({
            where: { 
                category, 
                isActive: true, 
                bookingEnabled: true 
            },
            order: [['name', 'ASC']]
        });
    };

    // Instance methods
    Service.prototype.calculateMembershipPrice = function(membershipType) {
        if (!membershipType || membershipType === 'none' || !this.membershipDiscount) {
            return this.basePrice;
        }
        
        const discount = this.membershipDiscount[membershipType];
        if (!discount) {
            return this.basePrice;
        }
        
        const discountAmount = (this.basePrice * discount) / 100;
        return this.basePrice - discountAmount;
    };

    Service.prototype.isAvailableForBooking = function() {
        return this.isActive && this.bookingEnabled;
    };

    return Service;
};