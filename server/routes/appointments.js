const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { User, Service, Appointment, Payment, Waitlist } = require('../models');
const { sendAppointmentConfirmation, sendAppointmentReminder, sendCancellationConfirmation } = require('../services/emailService');
const router = express.Router();

// Create appointment
router.post('/create', [
    body('serviceId').isUUID().withMessage('Valid service ID required'),
    body('appointmentDate').isDate().withMessage('Valid appointment date required'),
    body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time required (HH:MM format)'),
    body('clientName').trim().isLength({ min: 2, max: 100 }).withMessage('Valid client name required'),
    body('clientEmail').isEmail().withMessage('Valid email required'),
    body('clientPhone').matches(/^[\+]?[1-9][\d]{0,15}$/).withMessage('Valid phone number required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const {
            serviceId,
            appointmentDate,
            startTime,
            endTime,
            clientName,
            clientEmail,
            clientPhone,
            notes,
            specialRequests,
            membershipSessionUsed
        } = req.body;

        // Get service details
        const service = await Service.findByPk(serviceId);
        if (!service) {
            return res.status(404).json({ error: 'Service not found' });
        }

        // Calculate end time if not provided
        let calculatedEndTime = endTime;
        if (!calculatedEndTime) {
            const startHour = parseInt(startTime.split(':')[0]);
            const startMinute = parseInt(startTime.split(':')[1]);
            const durationMinutes = service.duration || 60;
            
            const endHour = Math.floor((startMinute + durationMinutes) / 60) + startHour;
            const endMinute = (startMinute + durationMinutes) % 60;
            
            calculatedEndTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        }

        // Check for conflicts
        const conflictingAppointment = await Appointment.findOne({
            where: {
                appointmentDate,
                status: ['confirmed', 'pending'],
                [require('sequelize').Op.or]: [
                    {
                        startTime: { [require('sequelize').Op.between]: [startTime, calculatedEndTime] }
                    },
                    {
                        endTime: { [require('sequelize').Op.between]: [startTime, calculatedEndTime] }
                    },
                    {
                        [require('sequelize').Op.and]: [
                            { startTime: { [require('sequelize').Op.lte]: startTime } },
                            { endTime: { [require('sequelize').Op.gte]: calculatedEndTime } }
                        ]
                    }
                ]
            }
        });

        if (conflictingAppointment) {
            return res.status(400).json({
                error: 'Time slot not available',
                details: 'Another appointment is scheduled during this time'
            });
        }

        // Check if user is logged in
        let userId = null;
        let user = null;
        let basePrice = service.basePrice;
        let finalPrice = basePrice;

        if (req.user) {
            userId = req.user.id;
            user = await User.findByPk(userId);
            
            // Apply membership discount
            if (user.membershipType && user.membershipType !== 'none' && service.membershipDiscount) {
                const discount = service.membershipDiscount[user.membershipType] || 0;
                finalPrice = basePrice * (1 - discount / 100);
            }

            // Use membership session if requested
            if (membershipSessionUsed && user.membershipSessionsRemaining > 0) {
                finalPrice = 0; // Free session
                await user.update({
                    membershipSessionsRemaining: user.membershipSessionsRemaining - 1
                });
            }
        }

        // Create appointment
        const appointment = await Appointment.create({
            userId,
            serviceId,
            appointmentDate,
            startTime,
            endTime: calculatedEndTime,
            duration: service.duration || 60,
            status: 'pending',
            price: finalPrice,
            originalPrice: basePrice,
            clientName,
            clientEmail,
            clientPhone,
            notes,
            specialRequests,
            membershipSessionUsed: membershipSessionUsed || false,
            source: 'website'
        });

        // If it's a free session (membership), mark as confirmed
        if (finalPrice === 0) {
            await appointment.update({ status: 'confirmed' });
            
            // Send confirmation email
            try {
                await sendAppointmentConfirmation(appointment, user, service);
            } catch (emailError) {
                console.error('Failed to send confirmation email:', emailError);
            }
        }

        res.status(201).json({
            message: 'Appointment created successfully',
            appointment: {
                id: appointment.id,
                appointmentDate: appointment.appointmentDate,
                startTime: appointment.startTime,
                endTime: appointment.endTime,
                price: appointment.price,
                status: appointment.status,
                requiresPayment: finalPrice > 0
            }
        });

    } catch (error) {
        console.error('Appointment creation error:', error);
        res.status(500).json({
            error: 'Failed to create appointment'
        });
    }
});

// Get user's appointments
router.get('/my-appointments', authenticateToken, async (req, res) => {
    try {
        const { status, upcoming = true } = req.query;
        const where = { userId: req.user.id };

        if (status) {
            where.status = status;
        }

        if (upcoming === 'true') {
            where.appointmentDate = {
                [require('sequelize').Op.gte]: new Date()
            };
        }

        const appointments = await Appointment.findAll({
            where,
            include: [
                { model: Service, as: 'service' },
                { model: Payment, as: 'payment' }
            ],
            order: [['appointmentDate', 'ASC'], ['startTime', 'ASC']]
        });

        res.json({ appointments });

    } catch (error) {
        console.error('User appointments fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch appointments'
        });
    }
});

// Cancel appointment
router.put('/:appointmentId/cancel', async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { reason } = req.body;

        const appointment = await Appointment.findByPk(appointmentId, {
            include: [
                { model: User, as: 'user' },
                { model: Service, as: 'service' }
            ]
        });

        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        // Check permission
        if (req.user && req.user.role !== 'admin' && appointment.userId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to cancel this appointment' });
        }

        // Calculate cancellation policy
        const appointmentDateTime = new Date(`${appointment.appointmentDate}T${appointment.startTime}`);
        const hoursUntilAppointment = (appointmentDateTime - new Date()) / (1000 * 60 * 60);
        
        let refundEligible = false;
        let refundPercentage = 0;

        if (hoursUntilAppointment >= 48) {
            refundEligible = true;
            refundPercentage = 100;
        } else if (hoursUntilAppointment >= 24) {
            refundEligible = true;
            refundPercentage = 50;
        }

        await appointment.update({
            status: 'cancelled',
            cancellationReason: reason,
            cancelledAt: new Date(),
            refundEligible,
            refundPercentage
        });

        // Send cancellation email
        try {
            await sendCancellationConfirmation(appointment, appointment.user, appointment.service);
        } catch (emailError) {
            console.error('Failed to send cancellation email:', emailError);
        }

        // Check waitlist for this slot
        const waitlistEntries = await Waitlist.getActiveWaitlist(
            appointment.serviceId, 
            appointment.appointmentDate
        );

        res.json({
            message: 'Appointment cancelled successfully',
            refundEligible,
            refundPercentage,
            waitlistToNotify: waitlistEntries.length
        });

    } catch (error) {
        console.error('Appointment cancellation error:', error);
        res.status(500).json({
            error: 'Failed to cancel appointment'
        });
    }
});

// Reschedule appointment
router.put('/:appointmentId/reschedule', [
    body('newDate').isDate().withMessage('Valid new date required'),
    body('newStartTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { appointmentId } = req.params;
        const { newDate, newStartTime, newEndTime } = req.body;

        const appointment = await Appointment.findByPk(appointmentId, {
            include: [{ model: Service, as: 'service' }]
        });

        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        // Check permission
        if (req.user && req.user.role !== 'admin' && appointment.userId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to reschedule this appointment' });
        }

        // Calculate new end time if not provided
        let calculatedEndTime = newEndTime;
        if (!calculatedEndTime) {
            const startHour = parseInt(newStartTime.split(':')[0]);
            const startMinute = parseInt(newStartTime.split(':')[1]);
            const durationMinutes = appointment.duration || 60;
            
            const endHour = Math.floor((startMinute + durationMinutes) / 60) + startHour;
            const endMinute = (startMinute + durationMinutes) % 60;
            
            calculatedEndTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
        }

        // Check for conflicts at new time
        const conflictingAppointment = await Appointment.findOne({
            where: {
                id: { [require('sequelize').Op.ne]: appointmentId },
                appointmentDate: newDate,
                status: ['confirmed', 'pending'],
                [require('sequelize').Op.or]: [
                    {
                        startTime: { [require('sequelize').Op.between]: [newStartTime, calculatedEndTime] }
                    },
                    {
                        endTime: { [require('sequelize').Op.between]: [newStartTime, calculatedEndTime] }
                    }
                ]
            }
        });

        if (conflictingAppointment) {
            return res.status(400).json({
                error: 'New time slot not available'
            });
        }

        // Update appointment
        await appointment.update({
            appointmentDate: newDate,
            startTime: newStartTime,
            endTime: calculatedEndTime,
            rescheduledAt: new Date()
        });

        res.json({
            message: 'Appointment rescheduled successfully',
            appointment: {
                id: appointment.id,
                appointmentDate: appointment.appointmentDate,
                startTime: appointment.startTime,
                endTime: appointment.endTime
            }
        });

    } catch (error) {
        console.error('Appointment reschedule error:', error);
        res.status(500).json({
            error: 'Failed to reschedule appointment'
        });
    }
});

// Admin: Get all appointments
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            status, 
            date, 
            serviceId,
            userId 
        } = req.query;
        
        const offset = (page - 1) * limit;
        const where = {};

        if (status) where.status = status;
        if (date) where.appointmentDate = date;
        if (serviceId) where.serviceId = serviceId;
        if (userId) where.userId = userId;

        const { rows: appointments, count } = await Appointment.findAndCountAll({
            where,
            include: [
                { model: User, as: 'user' },
                { model: Service, as: 'service' },
                { model: Payment, as: 'payment' }
            ],
            order: [['appointmentDate', 'ASC'], ['startTime', 'ASC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            appointments,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Admin appointments fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch appointments'
        });
    }
});

// Get available time slots
router.get('/available-slots', async (req, res) => {
    try {
        const { date, serviceId } = req.query;

        if (!date) {
            return res.status(400).json({ error: 'Date parameter required' });
        }

        // Get service to determine duration
        let duration = 60; // Default 1 hour
        if (serviceId) {
            const service = await Service.findByPk(serviceId);
            if (service) {
                duration = service.duration || 60;
            }
        }

        // Get existing appointments for the date
        const existingAppointments = await Appointment.findAll({
            where: {
                appointmentDate: date,
                status: ['confirmed', 'pending']
            },
            attributes: ['startTime', 'endTime']
        });

        // Generate available slots (9 AM to 6 PM, assuming business hours)
        const businessStart = 9; // 9 AM
        const businessEnd = 18; // 6 PM
        const slotDuration = duration; // minutes
        const availableSlots = [];

        for (let hour = businessStart; hour < businessEnd; hour++) {
            for (let minute = 0; minute < 60; minute += slotDuration) {
                const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                const endMinute = minute + slotDuration;
                const endHour = hour + Math.floor(endMinute / 60);
                const adjustedEndMinute = endMinute % 60;
                const endTime = `${endHour.toString().padStart(2, '0')}:${adjustedEndMinute.toString().padStart(2, '0')}`;

                // Check if this slot conflicts with existing appointments
                const hasConflict = existingAppointments.some(apt => {
                    return (startTime >= apt.startTime && startTime < apt.endTime) ||
                           (endTime > apt.startTime && endTime <= apt.endTime) ||
                           (startTime <= apt.startTime && endTime >= apt.endTime);
                });

                if (!hasConflict && endHour <= businessEnd) {
                    availableSlots.push({
                        startTime,
                        endTime,
                        duration: slotDuration
                    });
                }
            }
        }

        res.json({ availableSlots });

    } catch (error) {
        console.error('Available slots error:', error);
        res.status(500).json({
            error: 'Failed to fetch available slots'
        });
    }
});

module.exports = router;