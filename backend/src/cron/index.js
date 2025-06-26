const scheduleAppointmentReminders = require('./appointmentReminders');
const schedulePaymentExpirationChecks = require('./paymentExpirations');
const scheduleLessonTerminator = require('./lessonTerminator');
const scheduleJwtSecretRotation = require('./jwtSecretRotation');

/**
 * Initialize all cron jobs
 */
const initializeCronJobs = () => {
    console.log('Initializing cron jobs...');

    // Schedule appointment reminders
    scheduleAppointmentReminders();
    console.log('✅ Appointment reminder job scheduled');

    // Schedule payment expiration checks
    schedulePaymentExpirationChecks();
    console.log('✅ Payment expiration check job scheduled');

    // Schedule lesson auto-termination
    scheduleLessonTerminator();
    console.log('✅ Lesson auto-termination job scheduled');

    // Schedule JWT secret rotation
    scheduleJwtSecretRotation();
    console.log('✅ JWT secret rotation job scheduled');

    console.log('✅ Cron jobs initialized successfully');
};

module.exports = initializeCronJobs;