module.exports = (sequelize, DataTypes) => {
    const Appointment = sequelize.define('Appointment', {
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
        appointmentDate: {
            type: DataTypes.DATE,
            allowNull: false
        },
        startTime: {
            type: DataTypes.TIME,
            allowNull: false
        },
        endTime: {
            type: DataTypes.TIME,
            allowNull: false
        },
        duration: {
            type: DataTypes.INTEGER, // in minutes
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM(
                'pending', 
                'confirmed', 
                'in-progress', 
                'completed', 
                'cancelled', 
                'no-show'
            ),
            defaultValue: 'pending'
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        notes: {
            type: DataTypes.TEXT
        },
        privateNotes: {
            type: DataTypes.TEXT // Only visible to admin
        },
        cancellationReason: {
            type: DataTypes.STRING
        },
        cancelledAt: {
            type: DataTypes.DATE
        },
        cancelledBy: {
            type: DataTypes.UUID
        },
        dayBeforeReminderSent: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        dayBeforeReminderSentAt: {
            type: DataTypes.DATE
        },
        dayOfReminderSent: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        dayOfReminderSentAt: {
            type: DataTypes.DATE
        },
        followUpSent: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        followUpSentAt: {
            type: DataTypes.DATE
        },
        clientName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        clientEmail: {
            type: DataTypes.STRING,
            allowNull: false
        },
        clientPhone: {
            type: DataTypes.STRING,
            allowNull: false
        },
        isRecurring: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        recurringPattern: {
            type: DataTypes.JSON // { frequency: 'weekly', interval: 1, endDate: '2024-12-31' }
        },
        parentAppointmentId: {
            type: DataTypes.UUID,
            references: {
                model: 'Appointments',
                key: 'id'
            }
        },
        roomNumber: {
            type: DataTypes.STRING
        },
        specialRequests: {
            type: DataTypes.TEXT
        },
        arrivalTime: {
            type: DataTypes.DATE
        },
        completedAt: {
            type: DataTypes.DATE
        },
        rating: {
            type: DataTypes.INTEGER,
            validate: {
                min: 1,
                max: 5
            }
        },
        review: {
            type: DataTypes.TEXT
        },
        reviewDate: {
            type: DataTypes.DATE
        }
    }, {
        indexes: [
            {
                fields: ['userId']
            },
            {
                fields: ['serviceId']
            },
            {
                fields: ['appointmentDate']
            },
            {
                fields: ['status']
            },
            {
                fields: ['appointmentDate', 'startTime']
            }
        ],
        validate: {
            endTimeAfterStartTime() {
                if (this.startTime && this.endTime && this.startTime >= this.endTime) {
                    throw new Error('End time must be after start time');
                }
            },
            futureDateForNewAppointments() {
                if (this.isNewRecord && this.appointmentDate < new Date()) {
                    throw new Error('Appointment date must be in the future');
                }
            }
        }
    });

    // Instance methods
    Appointment.prototype.canBeCancelled = function() {
        const now = new Date();
        const appointmentDateTime = new Date(this.appointmentDate);
        const hoursDifference = (appointmentDateTime - now) / (1000 * 60 * 60);
        
        return hoursDifference >= 24 && ['pending', 'confirmed'].includes(this.status);
    };

    Appointment.prototype.isUpcoming = function() {
        return this.appointmentDate > new Date() && ['pending', 'confirmed'].includes(this.status);
    };

    Appointment.prototype.needsDayBeforeReminder = function() {
        if (this.dayBeforeReminderSent || !this.isUpcoming()) {
            return false;
        }
        
        const now = new Date();
        const appointmentDateTime = new Date(`${this.appointmentDate} ${this.startTime}`);
        const hoursDifference = (appointmentDateTime - now) / (1000 * 60 * 60);
        
        // Send day before reminder when appointment is 20-28 hours away
        return hoursDifference <= 28 && hoursDifference >= 20;
    };

    Appointment.prototype.needsDayOfReminder = function() {
        if (this.dayOfReminderSent || !this.isUpcoming()) {
            return false;
        }
        
        const now = new Date();
        const appointmentDateTime = new Date(`${this.appointmentDate} ${this.startTime}`);
        const hoursDifference = (appointmentDateTime - now) / (1000 * 60 * 60);
        
        // Send day-of reminder when appointment is 3-5 hours away
        return hoursDifference <= 5 && hoursDifference >= 3;
    };

    return Appointment;
};