const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { User, Service, Waitlist, Appointment } = require('../models');
const { sendEmail } = require('../services/emailService');
const router = express.Router();

// Join waitlist
router.post('/join', [
    body('serviceId').isUUID().withMessage('Valid service ID required'),
    body('preferredDate').isDate().withMessage('Valid preferred date required'),
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
            preferredDate,
            preferredTimeStart,
            preferredTimeEnd,
            clientName,
            clientEmail,
            clientPhone,
            notes,
            flexibleDates,
            flexibleTimes,
            maxWaitDays,
            notificationPreferences,
            automaticBooking,
            medicalReasons,
            specialRequests
        } = req.body;

        // Check if service exists
        const service = await Service.findByPk(serviceId);
        if (!service) {
            return res.status(404).json({ error: 'Service not found' });
        }

        // Check if user is logged in
        let userId = null;
        let membershipType = 'none';
        
        if (req.user) {
            userId = req.user.id;
            const user = await User.findByPk(userId);
            membershipType = user.membershipType;
        }

        // Check if user is already on waitlist for this service/date
        const existingEntry = await Waitlist.findOne({
            where: {
                clientEmail,
                serviceId,
                preferredDate,
                status: 'active'
            }
        });

        if (existingEntry) {
            return res.status(400).json({
                error: 'You are already on the waitlist for this service and date'
            });
        }

        // Create waitlist entry
        const waitlistEntry = await Waitlist.create({
            userId,
            serviceId,
            preferredDate,
            preferredTimeStart,
            preferredTimeEnd,
            clientName,
            clientEmail,
            clientPhone,
            notes,
            flexibleDates: flexibleDates || [],
            flexibleTimes: flexibleTimes !== false,
            maxWaitDays: maxWaitDays || 30,
            notificationPreferences: notificationPreferences || { email: true, sms: false, phone: false },
            automaticBooking: automaticBooking || false,
            membershipType,
            medicalReasons: medicalReasons || false,
            specialRequests,
            source: 'website'
        });

        // Send confirmation email
        try {
            await sendEmail({
                to: clientEmail,
                subject: 'Waitlist Confirmation - Consider Restoration',
                html: `
                    <h2>You've been added to our waitlist!</h2>
                    <p>Hello ${clientName},</p>
                    <p>Thank you for joining our waitlist. Here are the details:</p>
                    <ul>
                        <li><strong>Service:</strong> ${service.name}</li>
                        <li><strong>Preferred Date:</strong> ${new Date(preferredDate).toLocaleDateString()}</li>
                        <li><strong>Position:</strong> We'll notify you as soon as a slot becomes available</li>
                    </ul>
                    <p>We'll contact you via ${notificationPreferences?.email ? 'email' : ''}${notificationPreferences?.sms ? ' and SMS' : ''} when an appointment becomes available.</p>
                    <p>Best regards,<br>Consider Restoration Team</p>
                `
            });
        } catch (emailError) {
            console.error('Failed to send waitlist confirmation:', emailError);
        }

        res.status(201).json({
            message: 'Successfully added to waitlist',
            waitlistEntry: {
                id: waitlistEntry.id,
                position: await getWaitlistPosition(waitlistEntry),
                estimatedNotificationDate: await getEstimatedNotificationDate(waitlistEntry)
            }
        });

    } catch (error) {
        console.error('Waitlist join error:', error);
        res.status(500).json({
            error: 'Failed to join waitlist'
        });
    }
});

// Get user's waitlist entries
router.get('/my-entries', authenticateToken, async (req, res) => {
    try {
        const entries = await Waitlist.findAll({
            where: { userId: req.user.id },
            include: [
                { model: Service, as: 'service' }
            ],
            order: [['createdAt', 'DESC']]
        });

        const entriesWithPosition = await Promise.all(
            entries.map(async (entry) => ({
                ...entry.toJSON(),
                position: await getWaitlistPosition(entry),
                estimatedDate: await getEstimatedNotificationDate(entry)
            }))
        );

        res.json({ entries: entriesWithPosition });

    } catch (error) {
        console.error('Waitlist entries fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch waitlist entries'
        });
    }
});

// Cancel waitlist entry
router.delete('/:entryId', async (req, res) => {
    try {
        const { entryId } = req.params;
        
        const entry = await Waitlist.findByPk(entryId);
        if (!entry) {
            return res.status(404).json({ error: 'Waitlist entry not found' });
        }

        // Check permission (user can cancel their own entries, admins can cancel any)
        if (req.user && req.user.role !== 'admin' && entry.userId !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to cancel this entry' });
        }

        await entry.update({ status: 'cancelled' });

        // Send cancellation confirmation
        try {
            await sendEmail({
                to: entry.clientEmail,
                subject: 'Waitlist Entry Cancelled - Consider Restoration',
                html: `
                    <h2>Waitlist Entry Cancelled</h2>
                    <p>Hello ${entry.clientName},</p>
                    <p>Your waitlist entry has been cancelled as requested.</p>
                    <p>If you'd like to rejoin the waitlist or book an appointment, please visit our website or call (734) 419-4116.</p>
                    <p>Best regards,<br>Consider Restoration Team</p>
                `
            });
        } catch (emailError) {
            console.error('Failed to send cancellation email:', emailError);
        }

        res.json({ message: 'Waitlist entry cancelled successfully' });

    } catch (error) {
        console.error('Waitlist cancellation error:', error);
        res.status(500).json({
            error: 'Failed to cancel waitlist entry'
        });
    }
});

// Admin: Get all waitlist entries
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            status = 'active', 
            serviceId, 
            priority,
            membershipType,
            medicalReasons 
        } = req.query;
        
        const offset = (page - 1) * limit;
        const where = { status };

        if (serviceId) where.serviceId = serviceId;
        if (priority) where.priority = priority;
        if (membershipType) where.membershipType = membershipType;
        if (medicalReasons === 'true') where.medicalReasons = true;

        const { rows: entries, count } = await Waitlist.findAndCountAll({
            where,
            include: [
                { model: User, as: 'user' },
                { model: Service, as: 'service' }
            ],
            order: [['priority', 'DESC'], ['createdAt', 'ASC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        // Add priority scores and positions
        const entriesWithDetails = await Promise.all(
            entries.map(async (entry) => ({
                ...entry.toJSON(),
                priorityScore: entry.calculatePriorityScore(),
                position: await getWaitlistPosition(entry),
                estimatedDate: await getEstimatedNotificationDate(entry)
            }))
        );

        res.json({
            entries: entriesWithDetails,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Admin waitlist fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch waitlist entries'
        });
    }
});

// Admin: Notify waitlist about available slot
router.post('/admin/notify/:entryId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { entryId } = req.params;
        const { appointmentDate, startTime, endTime, responseDeadlineHours = 2 } = req.body;

        const entry = await Waitlist.findByPk(entryId, {
            include: [
                { model: User, as: 'user' },
                { model: Service, as: 'service' }
            ]
        });

        if (!entry) {
            return res.status(404).json({ error: 'Waitlist entry not found' });
        }

        if (!entry.canBeNotified()) {
            return res.status(400).json({ error: 'Entry cannot be notified' });
        }

        const slotDetails = {
            appointmentDate,
            startTime,
            endTime,
            service: entry.service.name,
            price: entry.service.basePrice
        };

        // Mark as notified
        await entry.markAsNotified(slotDetails, responseDeadlineHours);

        // Send notification email
        const responseDeadline = new Date();
        responseDeadline.setHours(responseDeadline.getHours() + responseDeadlineHours);

        await sendEmail({
            to: entry.clientEmail,
            subject: 'Appointment Available - Consider Restoration',
            html: `
                <h2>🎉 Great News! An Appointment Slot is Available</h2>
                <p>Hello ${entry.clientName},</p>
                <p>We have an available appointment slot that matches your waitlist request:</p>
                
                <div style="background: #f0f8ff; padding: 20px; border-left: 4px solid #3A7D99; margin: 20px 0;">
                    <h3>Available Appointment</h3>
                    <p><strong>Service:</strong> ${slotDetails.service}</p>
                    <p><strong>Date:</strong> ${new Date(appointmentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
                    <p><strong>Price:</strong> $${slotDetails.price}</p>
                </div>
                
                <p><strong>⏰ This offer expires at ${responseDeadline.toLocaleString()}</strong></p>
                
                <p>To book this appointment, please:</p>
                <ol>
                    <li>Reply to this email within ${responseDeadlineHours} hours, OR</li>
                    <li>Call us at (734) 419-4116, OR</li>
                    <li>Visit our website to book online</li>
                </ol>
                
                <p>If you don't respond by the deadline, this slot will be offered to the next person on the waitlist.</p>
                
                <p>We look forward to seeing you!</p>
                <p>Best regards,<br>Consider Restoration Team</p>
            `
        });

        res.json({
            message: 'Waitlist entry notified successfully',
            responseDeadline: responseDeadline
        });

    } catch (error) {
        console.error('Waitlist notification error:', error);
        res.status(500).json({
            error: 'Failed to notify waitlist entry'
        });
    }
});

// Admin: Get waitlist statistics
router.get('/admin/statistics', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const stats = await Waitlist.getStatistics();
        
        // Get statistics by service
        const serviceStats = await Waitlist.findAll({
            where: { status: 'active' },
            include: [{ model: Service, as: 'service' }],
            attributes: [
                'serviceId',
                [require('sequelize').fn('COUNT', '*'), 'count']
            ],
            group: ['serviceId', 'service.id', 'service.name'],
            raw: false
        });

        // Get average wait time
        const completedEntries = await Waitlist.findAll({
            where: { status: 'booked' },
            attributes: ['createdAt', 'updatedAt']
        });

        const averageWaitTime = completedEntries.length > 0 
            ? completedEntries.reduce((sum, entry) => {
                const waitTime = new Date(entry.updatedAt) - new Date(entry.createdAt);
                return sum + waitTime;
            }, 0) / completedEntries.length / (1000 * 60 * 60 * 24) // Convert to days
            : 0;

        res.json({
            ...stats,
            averageWaitTimeDays: Math.round(averageWaitTime * 10) / 10,
            byService: serviceStats.map(stat => ({
                serviceId: stat.serviceId,
                serviceName: stat.service.name,
                count: parseInt(stat.get('count'))
            }))
        });

    } catch (error) {
        console.error('Waitlist statistics error:', error);
        res.status(500).json({
            error: 'Failed to fetch waitlist statistics'
        });
    }
});

// Helper functions
async function getWaitlistPosition(entry) {
    const higherPriorityEntries = await Waitlist.findAll({
        where: {
            serviceId: entry.serviceId,
            status: 'active',
            createdAt: { [require('sequelize').Op.lte]: entry.createdAt }
        }
    });

    // Sort by priority score
    const sortedEntries = higherPriorityEntries
        .sort((a, b) => b.calculatePriorityScore() - a.calculatePriorityScore())
        .map(e => e.id);

    return sortedEntries.indexOf(entry.id) + 1;
}

async function getEstimatedNotificationDate(entry) {
    // Simple estimation based on historical data and current position
    const position = await getWaitlistPosition(entry);
    const averageSlotsPerWeek = 10; // Estimate based on service capacity
    
    const estimatedWeeks = Math.ceil(position / averageSlotsPerWeek);
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + (estimatedWeeks * 7));
    
    return estimatedDate;
}

module.exports = router;