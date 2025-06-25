const cron = require('node-cron');
const Appointment = require('../appointment/model');
const { NotificationService } = require('../notification');

// Schedule job to run every 5 minutes to check and end consultations that have reached their end time
const scheduleConsultationTerminator = () => {
    cron.schedule('*/5 * * * *', async () => {
        try {
            console.log('Running consultation auto-termination check...');

            const now = new Date();

            // Find active 'scheduled' appointments that have passed their end time
            const expiredConsultations = await Appointment.find({
                status: 'scheduled',
                endTime: { $lt: now }
            }).populate('doctor patient');

            console.log(`Found ${expiredConsultations.length} consultations to auto-terminate`);

            // Mark each as completed
            for (const appointment of expiredConsultations) {
                // Update appointment status
                appointment.status = 'completed';

                // Add automatic summary if none exists
                if (!appointment.consultationSummary) {
                    appointment.consultationSummary = 'This consultation was automatically marked as completed when its scheduled time ended.';
                }

                await appointment.save();

                // Send notifications to both patient and doctor
                await NotificationService.sendConsultationCompletedNotification(appointment);

                console.log(`Auto-completed consultation ${appointment._id} that ended at ${appointment.endTime}`);
            }

            console.log('Consultation auto-termination check completed');
        } catch (error) {
            console.error('Error in consultation auto-termination job:', error);
        }
    }, {
        timezone: 'Asia/Tashkent' // Adjust timezone as needed
    });
};

module.exports = scheduleConsultationTerminator;