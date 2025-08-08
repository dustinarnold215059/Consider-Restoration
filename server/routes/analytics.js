const express = require('express');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { User, Service, Appointment, Payment, GiftCertificate, Waitlist } = require('../models');
const { Op } = require('sequelize');
const router = express.Router();

// Admin: Get dashboard analytics
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { period = '30' } = req.query; // days
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        // Revenue metrics
        const totalRevenue = await Payment.sum('amount', {
            where: {
                status: 'completed',
                createdAt: { [Op.gte]: startDate }
            }
        });

        const previousPeriodStart = new Date(startDate);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - parseInt(period));
        
        const previousRevenue = await Payment.sum('amount', {
            where: {
                status: 'completed',
                createdAt: { [Op.between]: [previousPeriodStart, startDate] }
            }
        });

        const revenueGrowth = previousRevenue ? ((totalRevenue - previousRevenue) / previousRevenue * 100) : 0;

        // Appointment metrics
        const totalAppointments = await Appointment.count({
            where: {
                createdAt: { [Op.gte]: startDate },
                status: { [Op.in]: ['confirmed', 'completed'] }
            }
        });

        const previousAppointments = await Appointment.count({
            where: {
                createdAt: { [Op.between]: [previousPeriodStart, startDate] },
                status: { [Op.in]: ['confirmed', 'completed'] }
            }
        });

        const appointmentGrowth = previousAppointments ? ((totalAppointments - previousAppointments) / previousAppointments * 100) : 0;

        // New clients
        const newClients = await User.count({
            where: {
                createdAt: { [Op.gte]: startDate },
                role: 'user'
            }
        });

        const previousNewClients = await User.count({
            where: {
                createdAt: { [Op.between]: [previousPeriodStart, startDate] },
                role: 'user'
            }
        });

        const clientGrowth = previousNewClients ? ((newClients - previousNewClients) / previousNewClients * 100) : 0;

        // Average appointment value
        const avgAppointmentValue = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

        // Cancellation rate
        const cancelledAppointments = await Appointment.count({
            where: {
                createdAt: { [Op.gte]: startDate },
                status: 'cancelled'
            }
        });

        const totalAppointmentsIncludingCancelled = totalAppointments + cancelledAppointments;
        const cancellationRate = totalAppointmentsIncludingCancelled > 0 ? (cancelledAppointments / totalAppointmentsIncludingCancelled * 100) : 0;

        res.json({
            metrics: {
                totalRevenue: totalRevenue || 0,
                revenueGrowth,
                totalAppointments,
                appointmentGrowth,
                newClients,
                clientGrowth,
                avgAppointmentValue,
                cancellationRate
            },
            period: parseInt(period)
        });

    } catch (error) {
        console.error('Dashboard analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
    }
});

// Admin: Get revenue analytics
router.get('/revenue', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { period = '30', groupBy = 'day' } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        let dateFormat;
        let grouping;

        switch (groupBy) {
            case 'day':
                dateFormat = '%Y-%m-%d';
                grouping = 'DATE(createdAt)';
                break;
            case 'week':
                dateFormat = '%Y-%u';
                grouping = 'YEAR(createdAt), WEEK(createdAt)';
                break;
            case 'month':
                dateFormat = '%Y-%m';
                grouping = 'YEAR(createdAt), MONTH(createdAt)';
                break;
            default:
                dateFormat = '%Y-%m-%d';
                grouping = 'DATE(createdAt)';
        }

        const revenueData = await Payment.findAll({
            where: {
                status: 'completed',
                createdAt: { [Op.gte]: startDate }
            },
            attributes: [
                [require('sequelize').fn('DATE_FORMAT', require('sequelize').col('createdAt'), dateFormat), 'date'],
                [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'revenue'],
                [require('sequelize').fn('COUNT', '*'), 'transactions']
            ],
            group: [require('sequelize').literal(grouping)],
            order: [[require('sequelize').literal('date'), 'ASC']],
            raw: true
        });

        // Revenue by service
        const revenueByService = await Payment.findAll({
            where: {
                status: 'completed',
                createdAt: { [Op.gte]: startDate }
            },
            include: [{
                model: Appointment,
                as: 'appointment',
                include: [{ model: Service, as: 'service' }]
            }],
            attributes: [
                [require('sequelize').fn('SUM', require('sequelize').col('amount')), 'revenue'],
                [require('sequelize').fn('COUNT', '*'), 'count']
            ],
            group: ['appointment.service.id', 'appointment.service.name'],
            order: [[require('sequelize').literal('revenue'), 'DESC']],
            raw: true
        });

        res.json({
            chartData: revenueData.map(item => ({
                date: item.date,
                revenue: parseFloat(item.revenue || 0),
                transactions: parseInt(item.transactions || 0)
            })),
            serviceBreakdown: revenueByService.map(item => ({
                serviceName: item['appointment.service.name'],
                revenue: parseFloat(item.revenue || 0),
                count: parseInt(item.count || 0)
            }))
        });

    } catch (error) {
        console.error('Revenue analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch revenue analytics' });
    }
});

// Admin: Get service analytics
router.get('/services', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        // Most popular services
        const servicePopularity = await Appointment.findAll({
            where: {
                createdAt: { [Op.gte]: startDate },
                status: { [Op.in]: ['confirmed', 'completed'] }
            },
            include: [{ model: Service, as: 'service' }],
            attributes: [
                [require('sequelize').fn('COUNT', '*'), 'bookings'],
                [require('sequelize').fn('AVG', require('sequelize').col('price')), 'avgPrice']
            ],
            group: ['serviceId', 'service.id', 'service.name'],
            order: [[require('sequelize').literal('bookings'), 'DESC']],
            raw: true
        });

        // Service conversion from waitlist
        const waitlistConversion = await Waitlist.findAll({
            where: {
                createdAt: { [Op.gte]: startDate }
            },
            include: [{ model: Service, as: 'service' }],
            attributes: [
                [require('sequelize').fn('COUNT', '*'), 'waitlistEntries'],
                [require('sequelize').fn('SUM', require('sequelize').literal("CASE WHEN status = 'booked' THEN 1 ELSE 0 END")), 'conversions']
            ],
            group: ['serviceId', 'service.id', 'service.name'],
            raw: true
        });

        // Service cancellation rates
        const serviceCancellations = await Appointment.findAll({
            where: {
                createdAt: { [Op.gte]: startDate }
            },
            include: [{ model: Service, as: 'service' }],
            attributes: [
                [require('sequelize').fn('COUNT', '*'), 'totalBookings'],
                [require('sequelize').fn('SUM', require('sequelize').literal("CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END")), 'cancellations']
            ],
            group: ['serviceId', 'service.id', 'service.name'],
            raw: true
        });

        res.json({
            popularity: servicePopularity.map(item => ({
                serviceName: item['service.name'],
                bookings: parseInt(item.bookings || 0),
                avgPrice: parseFloat(item.avgPrice || 0)
            })),
            waitlistConversion: waitlistConversion.map(item => ({
                serviceName: item['service.name'],
                waitlistEntries: parseInt(item.waitlistEntries || 0),
                conversions: parseInt(item.conversions || 0),
                conversionRate: item.waitlistEntries > 0 ? (item.conversions / item.waitlistEntries * 100) : 0
            })),
            cancellationRates: serviceCancellations.map(item => ({
                serviceName: item['service.name'],
                totalBookings: parseInt(item.totalBookings || 0),
                cancellations: parseInt(item.cancellations || 0),
                cancellationRate: item.totalBookings > 0 ? (item.cancellations / item.totalBookings * 100) : 0
            }))
        });

    } catch (error) {
        console.error('Service analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch service analytics' });
    }
});

// Admin: Get client analytics
router.get('/clients', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        // Client retention metrics
        const clientRetention = await User.findAll({
            where: {
                role: 'user',
                createdAt: { [Op.lte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // At least 30 days old
            },
            attributes: [
                'id',
                'name',
                'email',
                'createdAt',
                'lastVisit',
                'totalVisits',
                'membershipType'
            ],
            include: [{
                model: Appointment,
                as: 'appointments',
                where: {
                    createdAt: { [Op.gte]: startDate },
                    status: { [Op.in]: ['confirmed', 'completed'] }
                },
                required: false
            }]
        });

        // New vs returning client bookings
        const newClientBookings = await Appointment.count({
            where: {
                createdAt: { [Op.gte]: startDate },
                status: { [Op.in]: ['confirmed', 'completed'] }
            },
            include: [{
                model: User,
                as: 'user',
                where: {
                    createdAt: { [Op.gte]: startDate }
                }
            }]
        });

        const totalBookings = await Appointment.count({
            where: {
                createdAt: { [Op.gte]: startDate },
                status: { [Op.in]: ['confirmed', 'completed'] }
            }
        });

        const returningClientBookings = totalBookings - newClientBookings;

        // Client lifetime value
        const clientLTV = await User.findAll({
            where: { role: 'user' },
            include: [{
                model: Payment,
                as: 'payments',
                where: { status: 'completed' },
                required: false
            }],
            attributes: [
                'id',
                'name',
                'email',
                'membershipType',
                'createdAt'
            ]
        });

        const ltvData = clientLTV.map(client => {
            const totalSpent = client.payments ? client.payments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0) : 0;
            const daysSinceRegistration = Math.floor((new Date() - new Date(client.createdAt)) / (1000 * 60 * 60 * 24));
            const avgMonthlySpend = daysSinceRegistration > 0 ? (totalSpent / daysSinceRegistration) * 30 : 0;

            return {
                clientId: client.id,
                name: client.name,
                email: client.email,
                membershipType: client.membershipType,
                totalSpent,
                daysSinceRegistration,
                avgMonthlySpend
            };
        });

        // Top clients by spend
        const topClients = ltvData
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 10);

        res.json({
            retentionRate: clientRetention.length > 0 ? 
                (clientRetention.filter(client => client.appointments && client.appointments.length > 0).length / clientRetention.length * 100) : 0,
            newVsReturning: {
                newClientBookings,
                returningClientBookings,
                newClientPercentage: totalBookings > 0 ? (newClientBookings / totalBookings * 100) : 0
            },
            averageLTV: ltvData.length > 0 ? ltvData.reduce((sum, client) => sum + client.totalSpent, 0) / ltvData.length : 0,
            topClients
        });

    } catch (error) {
        console.error('Client analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch client analytics' });
    }
});

// Admin: Get appointment analytics
router.get('/appointments', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        // Appointment trends by day of week
        const appointmentsByDay = await Appointment.findAll({
            where: {
                createdAt: { [Op.gte]: startDate },
                status: { [Op.in]: ['confirmed', 'completed'] }
            },
            attributes: [
                [require('sequelize').fn('DAYNAME', require('sequelize').col('appointmentDate')), 'dayOfWeek'],
                [require('sequelize').fn('COUNT', '*'), 'count']
            ],
            group: [require('sequelize').fn('DAYNAME', require('sequelize').col('appointmentDate'))],
            raw: true
        });

        // Appointment trends by hour
        const appointmentsByHour = await Appointment.findAll({
            where: {
                createdAt: { [Op.gte]: startDate },
                status: { [Op.in]: ['confirmed', 'completed'] }
            },
            attributes: [
                [require('sequelize').fn('HOUR', require('sequelize').col('startTime')), 'hour'],
                [require('sequelize').fn('COUNT', '*'), 'count']
            ],
            group: [require('sequelize').fn('HOUR', require('sequelize').col('startTime'))],
            order: [[require('sequelize').literal('hour'), 'ASC']],
            raw: true
        });

        // Booking source analysis
        const bookingSources = await Appointment.findAll({
            where: {
                createdAt: { [Op.gte]: startDate }
            },
            attributes: [
                'source',
                [require('sequelize').fn('COUNT', '*'), 'count'],
                [require('sequelize').fn('AVG', require('sequelize').col('price')), 'avgValue']
            ],
            group: ['source'],
            raw: true
        });

        // Lead time analysis (time between booking and appointment)
        const leadTimeData = await Appointment.findAll({
            where: {
                createdAt: { [Op.gte]: startDate },
                status: { [Op.in]: ['confirmed', 'completed'] }
            },
            attributes: [
                'createdAt',
                'appointmentDate'
            ],
            raw: true
        });

        const leadTimes = leadTimeData.map(apt => {
            const bookingDate = new Date(apt.createdAt);
            const appointmentDate = new Date(apt.appointmentDate);
            return Math.floor((appointmentDate - bookingDate) / (1000 * 60 * 60 * 24));
        });

        const avgLeadTime = leadTimes.length > 0 ? leadTimes.reduce((sum, days) => sum + days, 0) / leadTimes.length : 0;

        res.json({
            dayOfWeekTrends: appointmentsByDay.map(item => ({
                day: item.dayOfWeek,
                count: parseInt(item.count || 0)
            })),
            hourlyTrends: appointmentsByHour.map(item => ({
                hour: parseInt(item.hour),
                count: parseInt(item.count || 0)
            })),
            bookingSources: bookingSources.map(item => ({
                source: item.source || 'unknown',
                count: parseInt(item.count || 0),
                avgValue: parseFloat(item.avgValue || 0)
            })),
            averageLeadTime: Math.round(avgLeadTime * 10) / 10
        });

    } catch (error) {
        console.error('Appointment analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch appointment analytics' });
    }
});

// Admin: Export analytics data
router.get('/export', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { type = 'appointments', period = '30' } = req.query;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(period));

        let data = [];
        let filename = '';

        switch (type) {
            case 'appointments':
                data = await Appointment.findAll({
                    where: { createdAt: { [Op.gte]: startDate } },
                    include: [
                        { model: User, as: 'user' },
                        { model: Service, as: 'service' }
                    ],
                    order: [['createdAt', 'DESC']]
                });
                filename = `appointments_${new Date().toISOString().split('T')[0]}.json`;
                break;

            case 'payments':
                data = await Payment.findAll({
                    where: { createdAt: { [Op.gte]: startDate } },
                    include: [{
                        model: Appointment,
                        as: 'appointment',
                        include: [
                            { model: User, as: 'user' },
                            { model: Service, as: 'service' }
                        ]
                    }],
                    order: [['createdAt', 'DESC']]
                });
                filename = `payments_${new Date().toISOString().split('T')[0]}.json`;
                break;

            case 'users':
                data = await User.findAll({
                    where: { createdAt: { [Op.gte]: startDate } },
                    attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires'] },
                    order: [['createdAt', 'DESC']]
                });
                filename = `users_${new Date().toISOString().split('T')[0]}.json`;
                break;

            default:
                return res.status(400).json({ error: 'Invalid export type' });
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json(data);

    } catch (error) {
        console.error('Analytics export error:', error);
        res.status(500).json({ error: 'Failed to export analytics data' });
    }
});

module.exports = router;