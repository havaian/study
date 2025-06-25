const cron = require('node-cron');
const { startOfDay, endOfDay, addDays } = require('date-fns');
const Appointment = require('../appointment/model');
const emailService = require('../notification/emailService');

// Schedule job to run every day at 9:00 AM
const scheduleAppointmentReminders = () => {
    cron.schedule('0 9 * * *', async () => {
        try {
            console.log('Running appointment reminder job...');

            // Get appointments for tomorrow
            const tomorrow = addDays(new Date(), 1);
            const startOfTomorrow = startOfDay(tomorrow);
            const endOfTomorrow = endOfDay(tomorrow);

            const appointments = await Appointment.find({
                dateTime: {
                    $gte: startOfTomorrow,
                    $lte: endOfTomorrow
                },
                status: 'scheduled'
            }).populate('doctor patient');

            console.log(`Found ${appointments.length} appointments for tomorrow`);

            // Send reminders for each appointment
            for (const appointment of appointments) {
                await emailService.sendAppointmentReminderEmails(appointment);
            }

            console.log('Appointment reminder job completed');
        } catch (error) {
            console.error('Error in appointment reminder job:', error);
        }
    }, {
        timezone: 'Asia/Tashkent' // Adjust timezone as needed
    });
};

module.exports = scheduleAppointmentReminders;