/**
 * Send notification when a consultation is automatically completed
 * @param {Object} appointment - Appointment object with populated patient and doctor
 */
exports.sendConsultationCompletedNotification = async (appointment) => {
    try {
        if (!appointment) {
            console.error('Error: No appointment provided for consultation completed notification');
            return;
        }

        // Make sure patient and doctor are populated
        const patient = appointment.patient;
        const doctor = appointment.doctor;

        if (!patient || !doctor) {
            console.error('Error: Patient or doctor not populated in appointment for notification');
            return;
        }

        // Send email to patient
        await emailService.sendEmail({
            to: patient.email,
            subject: 'Your Consultation Has Ended - E-Polyclinic',
            text: `Your consultation with Dr. ${doctor.firstName} ${doctor.lastName} has ended. 
            If you need to schedule a follow-up appointment, please visit our website.`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4a90e2;">Consultation Ended</h2>
              <p>Dear ${patient.firstName} ${patient.lastName},</p>
              <p>Your consultation with Dr. ${doctor.firstName} ${doctor.lastName} has ended.</p>
              <p><strong>Date:</strong> ${new Date(appointment.dateTime).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${new Date(appointment.dateTime).toLocaleTimeString()} - ${new Date(appointment.endTime).toLocaleTimeString()}</p>
              <p>If you need to schedule a follow-up appointment, please visit our website.</p>
              <p>Thank you for choosing E-Polyclinic for your healthcare needs.</p>
            </div>
            `
        });

        // Send email to doctor
        await emailService.sendEmail({
            to: doctor.email,
            subject: 'Consultation Completed - E-Polyclinic',
            text: `Your consultation with ${patient.firstName} ${patient.lastName} has ended. 
            Please complete your consultation summary if you haven't already done so.`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4a90e2;">Consultation Completed</h2>
              <p>Dear Dr. ${doctor.firstName} ${doctor.lastName},</p>
              <p>Your consultation with ${patient.firstName} ${patient.lastName} has ended.</p>
              <p><strong>Date:</strong> ${new Date(appointment.dateTime).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${new Date(appointment.dateTime).toLocaleTimeString()} - ${new Date(appointment.endTime).toLocaleTimeString()}</p>
              <p>Please complete your consultation summary and add any necessary prescriptions or follow-up recommendations.</p>
              <p>Thank you for your dedication to patient care.</p>
            </div>
            `
        });

        // Send Telegram notification if user has linked account
        if (patient.telegramId) {
            const { telegramBot } = require('../bot/index');
            if (telegramBot) {
                await telegramBot.telegram.sendMessage(
                    patient.telegramId,
                    `Your consultation with Dr. ${doctor.firstName} ${doctor.lastName} has ended.`
                );
            }
        }

        if (doctor.telegramId) {
            const { telegramBot } = require('../bot/index');
            if (telegramBot) {
                await telegramBot.telegram.sendMessage(
                    doctor.telegramId,
                    `Your consultation with ${patient.firstName} ${patient.lastName} has ended. Please complete your consultation summary.`
                );
            }
        }

    } catch (error) {
        console.error('Error sending consultation completed notification:', error);
    }
};