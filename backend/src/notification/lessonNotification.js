/**
 * Send notification when a lesson is automatically completed
 * @param {Object} appointment - Appointment object with populated student and teacher
 */
exports.sendLessonCompletedNotification = async (appointment) => {
    try {
        if (!appointment) {
            console.error('Error: No appointment provided for lesson completed notification');
            return;
        }

        // Make sure student and teacher are populated
        const student = appointment.student;
        const teacher = appointment.teacher;

        if (!student || !teacher) {
            console.error('Error: Student or teacher not populated in appointment for notification');
            return;
        }

        // Send email to student
        await emailService.sendEmail({
            to: student.email,
            subject: 'Your Lesson Has Ended - E-Study',
            text: `Your lesson with ${teacher.firstName} ${teacher.lastName} has ended. 
            If you need to schedule a follow-up appointment, please visit our website.`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4a90e2;">Lesson Ended</h2>
              <p>Dear ${student.firstName} ${student.lastName},</p>
              <p>Your lesson with ${teacher.firstName} ${teacher.lastName} has ended.</p>
              <p><strong>Date:</strong> ${new Date(appointment.dateTime).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${new Date(appointment.dateTime).toLocaleTimeString()} - ${new Date(appointment.endTime).toLocaleTimeString()}</p>
              <p>If you need to schedule a follow-up appointment, please visit our website.</p>
              <p>Thank you for choosing E-Study for your education needs.</p>
            </div>
            `
        });

        // Send email to teacher
        await emailService.sendEmail({
            to: teacher.email,
            subject: 'Lesson Completed - E-Study',
            text: `Your lesson with ${student.firstName} ${student.lastName} has ended. 
            Please complete your lesson summary if you haven't already done so.`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4a90e2;">Lesson Completed</h2>
              <p>Dear ${teacher.firstName} ${teacher.lastName},</p>
              <p>Your lesson with ${student.firstName} ${student.lastName} has ended.</p>
              <p><strong>Date:</strong> ${new Date(appointment.dateTime).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${new Date(appointment.dateTime).toLocaleTimeString()} - ${new Date(appointment.endTime).toLocaleTimeString()}</p>
              <p>Please complete your lesson summary and add any necessary homeworks or follow-up recommendations.</p>
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
                    `Your lesson with ${teacher.firstName} ${teacher.lastName} has ended.`
                );
            }
        }

        if (teacher.telegramId) {
            const { telegramBot } = require('../bot/index');
            if (telegramBot) {
                await telegramBot.telegram.sendMessage(
                    teacher.telegramId,
                    `Your lesson with ${student.firstName} ${student.lastName} has ended. Please complete your lesson summary.`
                );
            }
        }

    } catch (error) {
        console.error('Error sending lesson completed notification:', error);
    }
};