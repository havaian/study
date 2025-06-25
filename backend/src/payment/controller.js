const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('./model');
const Appointment = require('../appointment/model');
const { NotificationService } = require('../notification');

/**
 * Create a checkout session for an appointment
 */
exports.createCheckoutSession = async (req, res) => {
    try {
        const { appointmentId } = req.body;

        if (!appointmentId) {
            return res.status(400).json({ message: 'Appointment ID is required' });
        }

        // Find appointment
        const appointment = await Appointment.findById(appointmentId)
            .populate('doctor', 'consultationFee firstName lastName email specializations')
            .populate('patient', 'firstName lastName email');

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Check if appointment already has a payment
        const existingPayment = await Payment.findOne({
            appointment: appointmentId,
            status: { $in: ['pending', 'succeeded'] }
        });

        if (existingPayment && existingPayment.status === 'succeeded') {
            return res.status(400).json({
                message: 'Payment already completed for this appointment',
                paymentId: existingPayment._id,
                status: existingPayment.status
            });
        }

        // Get consultation fee from doctor's profile
        const amount = appointment.doctor.consultationFee;
        const currency = 'uzs';

        // Format appointment date for display
        const appointmentDate = new Date(appointment.dateTime).toLocaleString();

        // Create a checkout session with Stripe
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: currency.toLowerCase(),
                        product_data: {
                            name: `Medical Consultation with Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
                            description: `${appointment.doctor.specializations} - ${appointmentDate}`
                        },
                        unit_amount: amount * 100, // Stripe uses smallest currency unit
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                appointmentId: appointment._id.toString(),
                patientId: appointment.patient._id.toString(),
                doctorId: appointment.doctor._id.toString(),
                appointmentDate: appointment.dateTime.toISOString()
            },
            customer_email: appointment.patient.email,
            mode: 'payment',
            success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL}/payment/cancel?session_id={CHECKOUT_SESSION_ID}`,
        });

        // Create or update payment record
        let payment = existingPayment;

        if (!payment) {
            payment = new Payment({
                appointment: appointment._id,
                patient: appointment.patient._id,
                doctor: appointment.doctor._id,
                amount,
                currency,
                stripeSessionId: session.id,
                checkoutUrl: session.url,
                status: 'pending'
            });
        } else {
            payment.stripeSessionId = session.id;
            payment.checkoutUrl = session.url;
        }

        await payment.save();

        // Update appointment with payment reference
        appointment.payment = {
            amount,
            status: 'pending',
            transactionId: payment._id
        };

        await appointment.save();

        res.status(200).json({
            paymentId: payment._id,
            checkoutUrl: session.url,
            status: 'pending'
        });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({
            message: 'Failed to create checkout session',
            error: error.message
        });
    }
};

/**
 * Handle webhook events from Stripe
 */
exports.handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutSessionCompleted(event.data.object);
                break;
            case 'checkout.session.expired':
                await handleCheckoutSessionExpired(event.data.object);
                break;
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Webhook handler error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Handle completed checkout session
 */
async function handleCheckoutSessionCompleted(session) {
    try {
        const payment = await Payment.findOne({ stripeSessionId: session.id });

        if (!payment) {
            console.error('Payment not found for session:', session.id);
            return;
        }

        // Update payment status
        payment.status = 'succeeded';
        payment.paidAt = new Date();
        await payment.save();

        // Update appointment payment status
        const appointment = await Appointment.findById(payment.appointment);
        if (appointment) {
            // Send success emails
            await NotificationService.sendPaymentSuccessEmail(payment._id, appointment);
            await NotificationService.sendDoctorAppointmentEmail(appointment);

            appointment.payment.status = 'completed';
            await appointment.save();

            // Send payment confirmation
            await NotificationService.sendPaymentConfirmation(payment._id);
        }
    } catch (error) {
        console.error('Error handling completed checkout session:', error);
        throw error;
    }
}

/**
 * Handle expired checkout session
 */
async function handleCheckoutSessionExpired(session) {
    try {
        const payment = await Payment.findOne({ stripeSessionId: session.id });

        if (!payment) {
            console.error('Payment not found for session:', session.id);
            return;
        }

        // Update payment status
        payment.status = 'failed';
        await payment.save();

        // Update appointment payment status
        const appointment = await Appointment.findById(payment.appointment);
        if (appointment) {
            await NotificationService.sendPaymentFailureEmail(payment._id, appointment);
        }
        if (appointment && appointment.payment.status === 'pending') {
            appointment.payment.status = 'pending';
            await appointment.save();
        }
    } catch (error) {
        console.error('Error handling expired checkout session:', error);
        throw error;
    }
}

/**
 * Verify payment session status
 */
exports.verifySessionStatus = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({ message: 'Session ID is required' });
        }

        // Find payment by session ID
        const payment = await Payment.findOne({ stripeSessionId: sessionId })
            .populate('appointment')
            .populate('patient', 'firstName lastName email')
            .populate('doctor', 'firstName lastName specializations');

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found for this session' });
        }

        // If payment is still pending, check with Stripe
        if (payment.status === 'pending') {
            try {
                const session = await stripe.checkout.sessions.retrieve(sessionId);

                if (session.payment_status === 'paid') {
                    payment.status = 'succeeded';
                    payment.paidAt = new Date();
                    await payment.save();

                    // Update appointment
                    const appointment = await Appointment.findById(payment.appointment);
                    if (appointment) {
                        appointment.payment.status = 'completed';
                        await appointment.save();
                    }
                }
            } catch (stripeError) {
                console.error('Error retrieving Stripe session:', stripeError);
            }
        }

        res.status(200).json({
            payment,
            success: payment.status === 'succeeded'
        });
    } catch (error) {
        console.error('Error verifying session status:', error);
        res.status(500).json({ message: 'Failed to verify payment session' });
    }
};

/**
 * Process a refund for a payment
 * @param {String} paymentId - Payment ID to refund
 * @returns {Promise<Object>} Updated payment object
 */
exports.processRefund = async (paymentId) => {
    try {
        const payment = await Payment.findById(paymentId);

        if (!payment) {
            throw new Error(`Payment with ID ${paymentId} not found`);
        }

        if (payment.status === 'refunded') {
            console.log(`Payment ${paymentId} is already refunded`);
            return payment;
        }

        if (payment.status !== 'succeeded') {
            console.log(`Payment ${paymentId} is not in succeeded status, current status: ${payment.status}`);
            return payment;
        }

        // If using Stripe, initiate Stripe refund
        if (payment.stripeSessionId) {
            try {
                const refund = await stripe.refunds.create({
                    payment_intent: payment.stripePaymentIntentId,
                    reason: 'requested_by_customer'
                });

                payment.refundId = refund.id;
            } catch (stripeError) {
                console.error('Error processing Stripe refund:', stripeError);
                // Continue with status update even if Stripe refund fails
                // This allows manual handling of refunds if needed
            }
        }

        // Update payment status
        payment.status = 'refunded';
        payment.refundedAt = new Date();
        await payment.save();

        // Find related appointment
        const appointment = await Appointment.findById(payment.appointment);
        if (appointment) {
            appointment.payment.status = 'refunded';
            await appointment.save();
        }

        // Send notification
        await NotificationService.sendPaymentRefundNotification(payment);

        console.log(`Successfully processed refund for payment ${paymentId}`);
        return payment;
    } catch (error) {
        console.error(`Error processing refund for payment ${paymentId}:`, error);
        throw error;
    }
};