const { redisClient } = require('../utils/redisClient');

/**
 * Initialize email queue consumer
 * @param {Object} rabbitChannel - RabbitMQ channel
 * @param {Object} emailTransporter - Nodemailer transporter
 */
async function initializeEmailConsumer(rabbitChannel, emailTransporter) {
    try {
        // Make sure queue exists
        await rabbitChannel.assertQueue('email_notifications', { durable: true });

        console.log('Email consumer initialized, listening for messages...');

        // Consume messages from the queue
        rabbitChannel.consume('email_notifications', async (msg) => {
            if (!msg) return;

            try {
                const emailData = JSON.parse(msg.content.toString());
                console.log(`Processing email to: ${emailData.to}, subject: ${emailData.subject}`);

                // Send the email
                const mailOptions = {
                    from: `"E-polyclinic.uz" <${process.env.SMTP_FROM_EMAIL}>`,
                    to: emailData.to,
                    subject: emailData.subject,
                    text: emailData.text || '',
                    html: emailData.html || ''
                };

                const info = await emailTransporter.sendMail(mailOptions);
                console.log(`Email sent successfully: ${info.messageId}`);

                // Acknowledge message
                rabbitChannel.ack(msg);
            } catch (error) {
                console.error('Error sending queued email:', error);

                // Only retry if it's not a permanent error
                const isPermanentError =
                    error.message.includes('no recipients defined') ||
                    error.message.includes('authentication failed');

                channel.nack(msg, false, !isPermanentError);
            }
        });
    } catch (error) {
        console.error('Failed to initialize email consumer:', error);
    }
}

module.exports = { initializeEmailConsumer };