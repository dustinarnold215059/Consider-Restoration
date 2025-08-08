const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { User, Appointment, Service, Payment, GiftCertificate } = require('../models');
const { sendAppointmentConfirmation, sendGiftCertificate } = require('../services/emailService');
const router = express.Router();

// Create payment intent for appointment booking
router.post('/create-payment-intent', [
    body('appointmentId').isUUID().withMessage('Valid appointment ID required'),
    body('amount').isNumeric().withMessage('Valid amount required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { appointmentId, amount, paymentMethodId, membershipDiscount = 0 } = req.body;

        // Get appointment details
        const appointment = await Appointment.findByPk(appointmentId, {
            include: [
                { model: User, as: 'user' },
                { model: Service, as: 'service' }
            ]
        });

        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        // Calculate final amount (with membership discount if applicable)
        const baseAmount = parseFloat(amount) * 100; // Convert to cents
        const discountAmount = (baseAmount * membershipDiscount) / 100;
        const finalAmount = Math.round(baseAmount - discountAmount);

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: finalAmount,
            currency: 'usd',
            customer: appointment.user.stripeCustomerId,
            payment_method: paymentMethodId,
            confirmation_method: 'manual',
            confirm: true,
            description: `${appointment.service.name} - ${appointment.appointmentDate}`,
            metadata: {
                appointmentId: appointment.id,
                userId: appointment.userId,
                serviceId: appointment.serviceId,
                originalAmount: baseAmount.toString(),
                discountAmount: discountAmount.toString(),
                membershipDiscount: membershipDiscount.toString()
            }
        });

        // Handle the payment result
        if (paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_source_action') {
            return res.json({
                requiresAction: true,
                paymentIntent: {
                    id: paymentIntent.id,
                    client_secret: paymentIntent.client_secret
                }
            });
        } else if (paymentIntent.status === 'succeeded') {
            // Payment successful - update appointment and create payment record
            await appointment.update({ status: 'confirmed' });

            const payment = await Payment.create({
                appointmentId: appointment.id,
                userId: appointment.userId,
                amount: finalAmount / 100,
                originalAmount: baseAmount / 100,
                discountAmount: discountAmount / 100,
                currency: 'usd',
                status: 'completed',
                paymentMethod: 'card',
                stripePaymentIntentId: paymentIntent.id,
                metadata: {
                    membershipDiscount,
                    serviceName: appointment.service.name
                }
            });

            // Send confirmation email
            try {
                await sendAppointmentConfirmation(appointment, appointment.user, appointment.service);
            } catch (emailError) {
                console.error('Failed to send confirmation email:', emailError);
            }

            return res.json({
                success: true,
                paymentId: payment.id,
                appointmentId: appointment.id
            });
        } else {
            return res.status(400).json({
                error: 'Payment failed',
                details: paymentIntent.last_payment_error?.message
            });
        }

    } catch (error) {
        console.error('Payment intent creation error:', error);
        res.status(500).json({
            error: 'Failed to create payment intent',
            details: error.message
        });
    }
});

// Create payment intent for gift certificate
router.post('/create-gift-certificate-payment', [
    body('amount').isNumeric().withMessage('Valid amount required'),
    body('recipientName').notEmpty().withMessage('Recipient name required'),
    body('recipientEmail').isEmail().withMessage('Valid recipient email required')
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
            amount, 
            recipientName, 
            recipientEmail, 
            message, 
            deliveryDate,
            purchasedBy,
            paymentMethodId 
        } = req.body;

        const finalAmount = Math.round(parseFloat(amount) * 100); // Convert to cents

        // Create payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: finalAmount,
            currency: 'usd',
            payment_method: paymentMethodId,
            confirmation_method: 'manual',
            confirm: true,
            description: `Gift Certificate - $${amount} for ${recipientName}`,
            metadata: {
                type: 'gift_certificate',
                amount: amount.toString(),
                recipientName,
                recipientEmail,
                purchasedBy: purchasedBy || 'guest'
            }
        });

        // Handle the payment result
        if (paymentIntent.status === 'requires_action') {
            return res.json({
                requiresAction: true,
                paymentIntent: {
                    id: paymentIntent.id,
                    client_secret: paymentIntent.client_secret
                }
            });
        } else if (paymentIntent.status === 'succeeded') {
            // Create gift certificate
            const giftCertificate = await GiftCertificate.create({
                purchasedBy: purchasedBy || null,
                recipientName,
                recipientEmail,
                amount: parseFloat(amount),
                message,
                deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
                paymentIntentId: paymentIntent.id,
                purchasePrice: parseFloat(amount)
            });

            // Send gift certificate email
            try {
                const purchaser = purchasedBy ? await User.findByPk(purchasedBy) : null;
                await sendGiftCertificate(giftCertificate, null, purchaser);
                await giftCertificate.update({ isDelivered: true, deliveredAt: new Date() });
            } catch (emailError) {
                console.error('Failed to send gift certificate email:', emailError);
            }

            return res.json({
                success: true,
                giftCertificateId: giftCertificate.id,
                code: giftCertificate.code
            });
        } else {
            return res.status(400).json({
                error: 'Payment failed',
                details: paymentIntent.last_payment_error?.message
            });
        }

    } catch (error) {
        console.error('Gift certificate payment error:', error);
        res.status(500).json({
            error: 'Failed to process gift certificate payment',
            details: error.message
        });
    }
});

// Confirm payment intent
router.post('/confirm-payment', [
    body('paymentIntentId').notEmpty().withMessage('Payment intent ID required')
], async (req, res) => {
    try {
        const { paymentIntentId } = req.body;

        const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);

        if (paymentIntent.status === 'succeeded') {
            res.json({ success: true });
        } else {
            res.status(400).json({
                error: 'Payment confirmation failed',
                status: paymentIntent.status
            });
        }

    } catch (error) {
        console.error('Payment confirmation error:', error);
        res.status(500).json({
            error: 'Failed to confirm payment',
            details: error.message
        });
    }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                await handlePaymentSuccess(paymentIntent);
                break;

            case 'payment_intent.payment_failed':
                const failedPayment = event.data.object;
                await handlePaymentFailure(failedPayment);
                break;

            case 'customer.subscription.created':
                const subscription = event.data.object;
                await handleSubscriptionCreated(subscription);
                break;

            case 'customer.subscription.updated':
                const updatedSubscription = event.data.object;
                await handleSubscriptionUpdated(updatedSubscription);
                break;

            case 'invoice.payment_succeeded':
                const invoice = event.data.object;
                await handleInvoicePaymentSucceeded(invoice);
                break;

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        res.json({ received: true });

    } catch (error) {
        console.error('Webhook handler error:', error);
        res.status(500).json({ error: 'Webhook handler failed' });
    }
});

// Get payment history for user
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const { rows: payments, count } = await Payment.findAndCountAll({
            where: { userId: req.user.id },
            include: [
                { 
                    model: Appointment, 
                    as: 'appointment',
                    include: [{ model: Service, as: 'service' }]
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            payments,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit),
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Payment history error:', error);
        res.status(500).json({ error: 'Failed to fetch payment history' });
    }
});

// Refund payment (admin only)
router.post('/refund/:paymentId', authenticateToken, async (req, res) => {
    try {
        // Add admin check
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { paymentId } = req.params;
        const { amount, reason } = req.body;

        const payment = await Payment.findByPk(paymentId);
        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Create refund in Stripe
        const refund = await stripe.refunds.create({
            payment_intent: payment.stripePaymentIntentId,
            amount: amount ? Math.round(amount * 100) : undefined, // Partial or full refund
            reason: reason || 'requested_by_customer'
        });

        // Update payment record
        await payment.update({
            status: refund.amount === payment.amount * 100 ? 'refunded' : 'partially_refunded',
            refundAmount: (payment.refundAmount || 0) + (refund.amount / 100),
            refundDate: new Date(),
            refundReason: reason
        });

        res.json({
            success: true,
            refund: {
                id: refund.id,
                amount: refund.amount / 100,
                status: refund.status
            }
        });

    } catch (error) {
        console.error('Refund error:', error);
        res.status(500).json({
            error: 'Failed to process refund',
            details: error.message
        });
    }
});

// Helper functions for webhook handlers
async function handlePaymentSuccess(paymentIntent) {
    const { appointmentId, userId } = paymentIntent.metadata;

    if (appointmentId) {
        // Update appointment status
        await Appointment.update(
            { status: 'confirmed' },
            { where: { id: appointmentId } }
        );

        // Update payment record if exists
        await Payment.update(
            { status: 'completed' },
            { where: { stripePaymentIntentId: paymentIntent.id } }
        );
    }
}

async function handlePaymentFailure(paymentIntent) {
    const { appointmentId } = paymentIntent.metadata;

    if (appointmentId) {
        // Update appointment status
        await Appointment.update(
            { status: 'pending' },
            { where: { id: appointmentId } }
        );

        // Update payment record
        await Payment.update(
            { 
                status: 'failed',
                failureReason: paymentIntent.last_payment_error?.message
            },
            { where: { stripePaymentIntentId: paymentIntent.id } }
        );
    }
}

async function handleSubscriptionCreated(subscription) {
    // Handle membership subscription creation
    const customerId = subscription.customer;
    
    // Find user by Stripe customer ID
    const user = await User.findOne({ 
        where: { stripeCustomerId: customerId } 
    });

    if (user) {
        await user.update({
            membershipType: 'wellness', // Default, update based on subscription
            membershipStatus: 'active',
            membershipStartDate: new Date()
        });
    }
}

async function handleSubscriptionUpdated(subscription) {
    // Handle membership subscription updates
    const customerId = subscription.customer;
    
    const user = await User.findOne({ 
        where: { stripeCustomerId: customerId } 
    });

    if (user) {
        const membershipStatus = subscription.status === 'active' ? 'active' : 
                                subscription.status === 'canceled' ? 'cancelled' : 'paused';

        await user.update({ membershipStatus });
    }
}

async function handleInvoicePaymentSucceeded(invoice) {
    // Handle recurring membership payments
    const customerId = invoice.customer;
    
    const user = await User.findOne({ 
        where: { stripeCustomerId: customerId } 
    });

    if (user && user.membershipType !== 'none') {
        // Add monthly sessions based on membership type
        const sessionsToAdd = {
            'wellness': 1,
            'restoration-plus': 2,
            'therapeutic-elite': 3
        };

        const sessions = sessionsToAdd[user.membershipType] || 0;
        
        await user.update({
            membershipSessionsRemaining: user.membershipSessionsRemaining + sessions
        });
    }
}

module.exports = router;