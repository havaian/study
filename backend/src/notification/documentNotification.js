/**
 * Send notification when a document is uploaded
 * @param {Object} appointment - Appointment object
 * @param {Object} document - Document object
 * @param {Object} recipient - User to notify
 */
exports.sendDocumentUploadNotification = async (appointment, document, recipient) => {
    try {
        if (!appointment || !document || !recipient) {
            console.error('Error: Missing data for document upload notification');
            return;
        }

        // Get uploader information
        const uploader = document.uploadedBy === 'doctor' ? appointment.doctor : appointment.patient;

        // Make sure we have the populated objects
        let uploaderName, recipientEmail;

        if (typeof uploader === 'object') {
            uploaderName = document.uploadedBy === 'doctor' ?
                `Dr. ${uploader.firstName} ${uploader.lastName}` :
                `${uploader.firstName} ${uploader.lastName}`;
        } else {
            // Fetch user data if not populated
            const User = require('../user/model');
            const uploaderUser = await User.findById(uploader);
            uploaderName = document.uploadedBy === 'doctor' ?
                `Dr. ${uploaderUser.firstName} ${uploaderUser.lastName}` :
                `${uploaderUser.firstName} ${uploaderUser.lastName}`;
        }

        if (typeof recipient === 'object' && recipient.email) {
            recipientEmail = recipient.email;
        } else {
            // Fetch user data if not populated
            const User = require('../user/model');
            const recipientUser = await User.findById(recipient);
            recipientEmail = recipientUser.email;
        }

        // Send email notification
        await emailService.sendEmail({
            to: recipientEmail,
            subject: 'New Document Uploaded - E-Polyclinic',
            text: `${uploaderName} has uploaded a new document for your appointment scheduled on ${new Date(appointment.dateTime).toLocaleDateString()}.
            Document name: ${document.name}
            Please log in to your account to view the document.`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #4a90e2;">New Document Uploaded</h2>
              <p>${uploaderName} has uploaded a new document for your appointment scheduled on ${new Date(appointment.dateTime).toLocaleDateString()}.</p>
              <p><strong>Document name:</strong> ${document.name}</p>
              <p>Please log in to your account to view the document.</p>
            </div>
            `
        });

        // Send Telegram notification if user has linked account
        if (typeof recipient === 'object' && recipient.telegramId) {
            const { telegramBot } = require('../bot/index');
            if (telegramBot) {
                await telegramBot.telegram.sendMessage(
                    recipient.telegramId,
                    `${uploaderName} has uploaded a new document (${document.name}) for your appointment on ${new Date(appointment.dateTime).toLocaleDateString()}.`
                );
            }
        }

    } catch (error) {
        console.error('Error sending document upload notification:', error);
    }
};