const cron = require('node-cron');
const { startOfDay, endOfDay, subHours } = require('date-fns');
const Appointment = require('../appointment/model');
const Payment = require('../payment/model');
const { NotificationService } = require('../notification');

// Schedule job to run every hour to check and cancel unpaid appointments
const schedulePaymentExpirationChecks = () => {
    // Run every hour (at minute 0)
    cron.schedule('0 * * * *', async () => {
        try {
            console.log('Running payment expiration check job...');

            // Find appointments with pending payment status older than 24 hours
            const expirationTime = subHours(new Date(), 24); // 24 hour payment window

            const unpaidAppointments = await Appointment.find({
                status: 'pending-payment',
                createdAt: { $lt: expirationTime }
            }).populate('doctor patient');

            console.log(`Found ${unpaidAppointments.length} expired unpaid appointments`);

            // Cancel each expired appointment
            for (const appointment of unpaidAppointments) {
                // Update appointment status
                appointment.status = 'canceled';
                appointment.cancellationReason = 'Payment time limit exceeded';
                await appointment.save();

                // Update related payment if exists
                if (appointment.payment && appointment.payment.transactionId) {
                    const payment = await Payment.findById(appointment.payment.transactionId);
                    if (payment && payment.status === 'pending') {
                        payment.status = 'canceled';
                        await payment.save();
                    }
                }

                // Send notifications
                await NotificationService.sendAppointmentCancellationNotification(appointment, 'system');

                console.log(`Canceled appointment ${appointment._id} due to payment expiration`);
            }

            // Check for pending doctor confirmations that have expired
            const pendingConfirmationAppointments = await Appointment.find({
                status: 'pending-doctor-confirmation',
                doctorConfirmationExpires: { $lt: new Date() }
            }).populate('doctor patient');

            console.log(`Found ${pendingConfirmationAppointments.length} expired doctor confirmation appointments`);

            // Process each expired confirmation
            for (const appointment of pendingConfirmationAppointments) {
                // Update appointment status
                appointment.status = 'canceled';
                appointment.cancellationReason = 'Doctor did not confirm in time';
                await appointment.save();

                // Process refund if payment exists
                if (appointment.payment && appointment.payment.transactionId) {
                    const payment = await Payment.findById(appointment.payment.transactionId);
                    if (payment && payment.status !== 'refunded') {
                        payment.status = 'refunded';
                        await payment.save();

                        // Send refund notification
                        await NotificationService.sendPaymentRefundNotification(payment);
                    }
                }

                // Send cancellation notification
                await NotificationService.sendAppointmentCancellationNotification(appointment, 'system');

                console.log(`Canceled appointment ${appointment._id} due to expired doctor confirmation`);
            }

            console.log('Payment expiration check job completed');
        } catch (error) {
            console.error('Error in payment expiration check job:', error);
        }
    }, {
        timezone: 'Asia/Tashkent' // Adjust timezone as needed
    });
};

module.exports = schedulePaymentExpirationChecks;