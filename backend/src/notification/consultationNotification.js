/**
 * Send notification when a consultation is automatically completed
 * @param {Object} appointment - Appointment object with populated student and teacher
 */
exports.sendConsultationCompletedNotification = async (appointment) => {
    try {
        if (!appointment) {
            console.error('Error: No appointment provided for consultation completed notification');
            return;
        }

        // Make sure student and teacher are populated
        const student = appointment.student;
        const teacher = appointment.teacher;

        if (!student || !teacher) {
            console.error('Error: Patient or teacher not populated in appointment for notification');
            return;
        }

        // Send email to student
        await emailService.sendEmail({
            to: student.email,
            subject: 'Your Consultation Has Ended - Online-study',
            text: `Your consultation with Dr. ${teacher.firstName} ${teacher.lastName} has ended. 
            If you need to schedule a follow-up appointment, please visit our website.`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4a90e2;">Consultation Ended</h2>
              <p>Dear ${student.firstName} ${student.lastName},</p>
              <p>Your consultation with Dr. ${teacher.firstName} ${teacher.lastName} has ended.</p>
              <p><strong>Date:</strong> ${new Date(appointment.dateTime).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${new Date(appointment.dateTime).toLocaleTimeString()} - ${new Date(appointment.endTime).toLocaleTimeString()}</p>
              <p>If you need to schedule a follow-up appointment, please visit our website.</p>
              <p>Thank you for choosing Online-study for your healthcare needs.</p>
            </div>
            `
        });

        // Send email to teacher
        await emailService.sendEmail({
            to: teacher.email,
            subject: 'Consultation Completed - Online-study',
            text: `Your consultation with ${student.firstName} ${student.lastName} has ended. 
            Please complete your consultation summary if you haven't already done so.`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4a90e2;">Consultation Completed</h2>
              <p>Dear Dr. ${teacher.firstName} ${teacher.lastName},</p>
              <p>Your consultation with ${student.firstName} ${student.lastName} has ended.</p>
              <p><strong>Date:</strong> ${new Date(appointment.dateTime).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${new Date(appointment.dateTime).toLocaleTimeString()} - ${new Date(appointment.endTime).toLocaleTimeString()}</p>
              <p>Please complete your consultation summary and add any necessary prescriptions or follow-up recommendations.</p>
              <p>Thank you for your dedication to student care.</p>
            </div>
            `
        });

        // Send Telegram notification if user has linked account
        if (student.telegramId) {
            const { telegramBot } = require('../bot/index');
            if (telegramBot) {
                await telegramBot.telegram.sendMessage(
                    student.telegramId,
                    `Your consultation with Dr. ${teacher.firstName} ${teacher.lastName} has ended.`
                );
            }
        }

        if (teacher.telegramId) {
            const { telegramBot } = require('../bot/index');
            if (telegramBot) {
                await telegramBot.telegram.sendMessage(
                    teacher.telegramId,
                    `Your consultation with ${student.firstName} ${student.lastName} has ended. Please complete your consultation summary.`
                );
            }
        }

    } catch (error) {
        console.error('Error sending consultation completed notification:', error);
    }
};