const cron = require('node-cron');
const Appointment = require('../appointment/model');
const { NotificationService } = require('../notification');

// Schedule job to run every 5 minutes to check and end lessons that have reached their end time
const scheduleLessonTerminator = () => {
    cron.schedule('*/5 * * * *', async () => {
        try {
            console.log('Running lesson auto-termination check...');

            const now = new Date();

            // Find active 'scheduled' appointments that have passed their end time
            const expiredLessons = await Appointment.find({
                status: 'scheduled',
                endTime: { $lt: now }
            }).populate('teacher student');

            console.log(`Found ${expiredLessons.length} lessons to auto-terminate`);

            // Mark each as completed
            for (const appointment of expiredLessons) {
                // Update appointment status
                appointment.status = 'completed';

                // Add automatic summary if none exists
                if (!appointment.lessonSummary) {
                    appointment.lessonSummary = 'This lesson was automatically marked as completed when its scheduled time ended.';
                }

                await appointment.save();

                // Send notifications to both student and teacher
                await NotificationService.sendLessonCompletedNotification(appointment);

                console.log(`Auto-completed lesson ${appointment._id} that ended at ${appointment.endTime}`);
            }

            console.log('Lesson auto-termination check completed');
        } catch (error) {
            console.error('Error in lesson auto-termination job:', error);
        }
    }, {
        timezone: 'Asia/Tashkent' // Adjust timezone as needed
    });
};

module.exports = scheduleLessonTerminator;