module.exports = (sequelize, DataTypes) => {
    const Waitlist = sequelize.define('Waitlist', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id'
            }
        },
        serviceId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: {
                model: 'Services',
                key: 'id'
            }
        },
        preferredDate: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        preferredTimeStart: {
            type: DataTypes.TIME
        },
        preferredTimeEnd: {
            type: DataTypes.TIME
        },
        flexibleDates: {
            type: DataTypes.JSON, // Array of alternative dates
            defaultValue: []
        },
        flexibleTimes: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        priority: {
            type: DataTypes.ENUM('standard', 'high', 'urgent'),
            defaultValue: 'standard'
        },
        status: {
            type: DataTypes.ENUM('active', 'notified', 'booked', 'expired', 'cancelled'),
            defaultValue: 'active'
        },
        clientName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        clientEmail: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                isEmail: true
            }
        },
        clientPhone: {
            type: DataTypes.STRING,
            allowNull: false
        },
        notes: {
            type: DataTypes.TEXT
        },
        notificationPreferences: {
            type: DataTypes.JSON,
            defaultValue: {
                email: true,
                sms: false,
                phone: false
            }
        },
        maxWaitDays: {
            type: DataTypes.INTEGER,
            defaultValue: 30 // Maximum days to wait
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        notifiedAt: {
            type: DataTypes.DATE
        },
        notificationsSent: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        lastNotificationAt: {
            type: DataTypes.DATE
        },
        availableSlotOffered: {
            type: DataTypes.JSON // Details of the slot offered
        },
        offerExpiresAt: {
            type: DataTypes.DATE
        },
        responseDeadline: {
            type: DataTypes.DATE
        },
        automaticBooking: {
            type: DataTypes.BOOLEAN,
            defaultValue: false // If true, automatically book when slot becomes available
        },
        membershipType: {
            type: DataTypes.ENUM('none', 'wellness', 'restoration-plus', 'therapeutic-elite'),
            defaultValue: 'none'
        },
        isRecurring: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        recurringPattern: {
            type: DataTypes.JSON // For recurring waitlist requests
        },
        tags: {
            type: DataTypes.JSON,
            defaultValue: [] // Tags like 'first-time', 'vip', 'medical'
        },
        source: {
            type: DataTypes.STRING,
            defaultValue: 'website' // website, phone, walk-in, referral
        },
        referralSource: {
            type: DataTypes.STRING
        },
        specialRequests: {
            type: DataTypes.TEXT
        },
        medicalReasons: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        urgencyLevel: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            validate: {
                min: 1,
                max: 10
            }
        }
    }, {
        hooks: {
            beforeCreate: (waitlist) => {
                // Set expiration date
                if (!waitlist.expiresAt) {
                    const expirationDate = new Date();
                    expirationDate.setDate(expirationDate.getDate() + (waitlist.maxWaitDays || 30));
                    waitlist.expiresAt = expirationDate;
                }
                
                // Set priority based on membership and medical reasons
                if (waitlist.medicalReasons) {
                    waitlist.priority = 'urgent';
                    waitlist.urgencyLevel = Math.min(waitlist.urgencyLevel + 3, 10);
                } else if (waitlist.membershipType !== 'none') {
                    waitlist.priority = 'high';
                    waitlist.urgencyLevel = Math.min(waitlist.urgencyLevel + 2, 10);
                }
            }
        },
        indexes: [
            {
                fields: ['userId']
            },
            {
                fields: ['serviceId']
            },
            {
                fields: ['preferredDate']
            },
            {
                fields: ['status']
            },
            {
                fields: ['priority']
            },
            {
                fields: ['expiresAt']
            },
            {
                fields: ['membershipType']
            }
        ]
    });

    // Instance methods
    Waitlist.prototype.isExpired = function() {
        return new Date() > this.expiresAt;
    };

    Waitlist.prototype.canBeNotified = function() {
        return this.status === 'active' && !this.isExpired();
    };

    Waitlist.prototype.calculatePriorityScore = function() {
        let score = 0;
        
        // Base urgency level
        score += this.urgencyLevel * 10;
        
        // Priority multiplier
        const priorityMultipliers = {
            'urgent': 3,
            'high': 2,
            'standard': 1
        };
        score *= priorityMultipliers[this.priority] || 1;
        
        // Membership bonus
        const membershipBonus = {
            'therapeutic-elite': 50,
            'restoration-plus': 30,
            'wellness': 20,
            'none': 0
        };
        score += membershipBonus[this.membershipType] || 0;
        
        // Time waiting bonus (1 point per day)
        const daysWaiting = Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
        score += daysWaiting;
        
        // Medical reasons bonus
        if (this.medicalReasons) {
            score += 100;
        }
        
        return score;
    };

    Waitlist.prototype.markAsNotified = async function(slotDetails, offerExpirationHours = 2) {
        const offerExpiration = new Date();
        offerExpiration.setHours(offerExpiration.getHours() + offerExpirationHours);
        
        await this.update({
            status: 'notified',
            notifiedAt: new Date(),
            notificationsSent: this.notificationsSent + 1,
            lastNotificationAt: new Date(),
            availableSlotOffered: slotDetails,
            offerExpiresAt: offerExpiration,
            responseDeadline: offerExpiration
        });
    };

    // Class methods
    Waitlist.getActiveWaitlist = async function(serviceId = null, date = null) {
        const where = {
            status: 'active',
            expiresAt: {
                [sequelize.Op.gt]: new Date()
            }
        };
        
        if (serviceId) {
            where.serviceId = serviceId;
        }
        
        if (date) {
            where[sequelize.Op.or] = [
                { preferredDate: date },
                { flexibleDates: { [sequelize.Op.contains]: [date] } }
            ];
        }
        
        const waitlistEntries = await this.findAll({
            where,
            include: [
                { model: sequelize.models.User, as: 'user' },
                { model: sequelize.models.Service, as: 'service' }
            ],
            order: [['priority', 'DESC'], ['createdAt', 'ASC']]
        });
        
        // Sort by priority score
        return waitlistEntries.sort((a, b) => b.calculatePriorityScore() - a.calculatePriorityScore());
    };

    Waitlist.findExpired = async function() {
        return await this.findAll({
            where: {
                status: 'active',
                expiresAt: {
                    [sequelize.Op.lt]: new Date()
                }
            },
            include: [
                { model: sequelize.models.User, as: 'user' },
                { model: sequelize.models.Service, as: 'service' }
            ]
        });
    };

    Waitlist.findExpiredOffers = async function() {
        return await this.findAll({
            where: {
                status: 'notified',
                offerExpiresAt: {
                    [sequelize.Op.lt]: new Date()
                }
            },
            include: [
                { model: sequelize.models.User, as: 'user' },
                { model: sequelize.models.Service, as: 'service' }
            ]
        });
    };

    Waitlist.getStatistics = async function() {
        const total = await this.count({ where: { status: 'active' } });
        const urgent = await this.count({ where: { status: 'active', priority: 'urgent' } });
        const high = await this.count({ where: { status: 'active', priority: 'high' } });
        const medical = await this.count({ where: { status: 'active', medicalReasons: true } });
        const members = await this.count({ 
            where: { 
                status: 'active', 
                membershipType: { [sequelize.Op.ne]: 'none' } 
            } 
        });
        
        return {
            total,
            urgent,
            high,
            medical,
            members,
            standard: total - urgent - high
        };
    };

    return Waitlist;
};