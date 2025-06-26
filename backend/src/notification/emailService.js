const nodemailer = require('nodemailer');
const { format } = require('date-fns');

// Format currency amount
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS' }).format(amount);
};

// Format date and time
const formatDateTime = (date) => {
    return format(new Date(date), 'MMMM d, yyyy h:mm a');
};

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            }
        });
    }

    async sendEmail(options) {
        try {
            const mailOptions = {
                from: `"Online-study.com" <${process.env.SMTP_FROM_EMAIL}>`,
                to: options.to,
                subject: options.subject,
                text: options.text || '',
                html: options.html || ''
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('Email sent successfully:', info.messageId);
            return info;
        } catch (error) {
            console.error('Error sending email:', error);
            throw error;
        }
    }

    // Appointment booked - send to both teacher and student
    async sendAppointmentBookedEmails(appointment) {
        try {
            const { teacher, student, dateTime, type, payment } = appointment;

            // Email to student
            await this.sendEmail({
                to: student.email,
                subject: 'Appointment Confirmation - Online-study.com',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4a90e2;">Appointment Confirmed</h2>
                    <p>Your appointment with Dr. ${teacher.firstName} ${teacher.lastName} has been successfully booked.</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Appointment Details</h3>
                        <p><strong>Teacher:</strong> Dr. ${teacher.firstName} ${teacher.lastName}</p>
                        <p><strong>Specialization:</strong> ${teacher.specializations.join(', ')}</p>
                        <p><strong>Date & Time:</strong> ${formatDateTime(dateTime)}</p>
                        <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)} Lesson</p>
                        ${payment && payment.amount ? `<p><strong>Amount Paid:</strong> ${formatCurrency(payment.amount)}</p>` : ''}
                    </div>
                    
                    <p>Please make sure to join the lesson 5 minutes before the scheduled time.</p>
                    <p>You can view your appointment details and join the lesson by logging into your Online-study.com account.</p>
                </div>
                `
            });

            // Email to teacher
            await this.sendEmail({
                to: teacher.email,
                subject: 'New Appointment Scheduled - Online-study.com',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4a90e2;">New Appointment</h2>
                    <p>A new appointment has been scheduled.</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Appointment Details</h3>
                        <p><strong>Student:</strong> ${student.firstName} ${student.lastName}</p>
                        <p><strong>Date & Time:</strong> ${formatDateTime(dateTime)}</p>
                        <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)} Lesson</p>
                    </div>
                    
                    <p>Please log in to your Online-study.com account to view the complete appointment details.</p>
                </div>
                `
            });

            console.log('Appointment booking emails sent successfully');
            return true;
        } catch (error) {
            console.error('Error sending appointment booked emails:', error);
            return false;
        }
    }

    // Appointment booking failed - send to student
    async sendAppointmentBookingFailed(data) {
        try {
            const { student, teacher, dateTime, type, error } = data;

            await this.sendEmail({
                to: student.email,
                subject: 'Appointment Booking Failed - Online-study.com',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #e74c3c;">Appointment Booking Failed</h2>
                    <p>Unfortunately, we couldn't complete your appointment booking.</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Appointment Details</h3>
                        <p><strong>Teacher:</strong> Dr. ${teacher.firstName} ${teacher.lastName}</p>
                        <p><strong>Date & Time:</strong> ${formatDateTime(dateTime)}</p>
                        <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)} Lesson</p>
                        <p><strong>Reason:</strong> ${error}</p>
                    </div>
                    
                    <p>Please try booking again or contact our support if you need assistance.</p>
                </div>
                `
            });

            console.log('Appointment booking failed email sent');
            return true;
        } catch (error) {
            console.error('Error sending appointment booking failed email:', error);
            return false;
        }
    }

    // Appointment reminder - send to both teacher and student
    async sendAppointmentReminderEmails(appointment) {
        try {
            const { teacher, student, dateTime, type } = appointment;

            // Email to student
            await this.sendEmail({
                to: student.email,
                subject: 'Appointment Reminder - Online-study.com',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4a90e2;">Appointment Reminder</h2>
                    <p>This is a reminder about your upcoming appointment tomorrow.</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Appointment Details</h3>
                        <p><strong>Teacher:</strong> Dr. ${teacher.firstName} ${teacher.lastName}</p>
                        <p><strong>Date & Time:</strong> ${formatDateTime(dateTime)}</p>
                        <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)} Lesson</p>
                    </div>
                    
                    <p>Please make sure to join the lesson 5 minutes before the scheduled time.</p>
                </div>
                `
            });

            // Email to teacher
            await this.sendEmail({
                to: teacher.email,
                subject: 'Appointment Reminder - Online-study.com',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4a90e2;">Appointment Reminder</h2>
                    <p>This is a reminder about your upcoming appointment tomorrow.</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Appointment Details</h3>
                        <p><strong>Student:</strong> ${student.firstName} ${student.lastName}</p>
                        <p><strong>Date & Time:</strong> ${formatDateTime(dateTime)}</p>
                        <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)} Lesson</p>
                    </div>
                    
                    <p>Please make sure to join the lesson 5 minutes before the scheduled time.</p>
                </div>
                `
            });

            console.log('Appointment reminder emails sent successfully');
            return true;
        } catch (error) {
            console.error('Error sending appointment reminder emails:', error);
            return false;
        }
    }

    // Appointment cancelled - send to affected party
    async sendAppointmentCancelledEmails(appointment, cancelledBy) {
        try {
            const { teacher, student, dateTime, type } = appointment;

            // Email to student
            await this.sendEmail({
                to: student.email,
                subject: 'Appointment Cancelled - Online-study.com',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #e74c3c;">Appointment Cancelled</h2>
                    <p>The following appointment has been cancelled by ${cancelledBy}.</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Appointment Details</h3>
                        <p><strong>Teacher:</strong> Dr. ${teacher.firstName} ${teacher.lastName}</p>
                        <p><strong>Date & Time:</strong> ${formatDateTime(dateTime)}</p>
                        <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)} Lesson</p>
                    </div>
                    
                    <p>You can schedule a new appointment through our website.</p>
                </div>
                `
            });

            // Email to teacher
            await this.sendEmail({
                to: teacher.email,
                subject: 'Appointment Cancelled - Online-study.com',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #e74c3c;">Appointment Cancelled</h2>
                    <p>The following appointment has been cancelled by ${cancelledBy}.</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Appointment Details</h3>
                        <p><strong>Student:</strong> ${student.firstName} ${student.lastName}</p>
                        <p><strong>Date & Time:</strong> ${formatDateTime(dateTime)}</p>
                        <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)} Lesson</p>
                    </div>
                    
                    <p>The time slot is now available for other appointments.</p>
                </div>
                `
            });

            console.log('Appointment cancellation emails sent successfully');
            return true;
        } catch (error) {
            console.error('Error sending appointment cancellation emails:', error);
            return false;
        }
    }

    // Send confirmation to teacher about appointment being confirmed
    async sendAppointmentConfirmedEmails(appointment) {
        try {
            const { teacher, student, dateTime, type } = appointment;

            // Email to student
            await this.sendEmail({
                to: student.email,
                subject: 'Appointment Confirmed by Teacher - Online-study.com',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4a90e2;">Appointment Confirmed by Teacher</h2>
                    <p>Your appointment has been confirmed by Dr. ${teacher.firstName} ${teacher.lastName}.</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Appointment Details</h3>
                        <p><strong>Teacher:</strong> Dr. ${teacher.firstName} ${teacher.lastName}</p>
                        <p><strong>Date & Time:</strong> ${formatDateTime(dateTime)}</p>
                        <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)} Lesson</p>
                    </div>
                    
                    <p>Your appointment is now fully scheduled. You'll receive a reminder before the appointment time.</p>
                </div>
                `
            });

            // Email confirmation to teacher
            await this.sendEmail({
                to: teacher.email,
                subject: 'Appointment Confirmation Successful - Online-study.com',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4a90e2;">Appointment Confirmed</h2>
                    <p>You have successfully confirmed the appointment with ${student.firstName} ${student.lastName}.</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Appointment Details</h3>
                        <p><strong>Student:</strong> ${student.firstName} ${student.lastName}</p>
                        <p><strong>Date & Time:</strong> ${formatDateTime(dateTime)}</p>
                        <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)} Lesson</p>
                    </div>
                    
                    <p>The appointment is now scheduled in your calendar. You'll receive a reminder before the appointment time.</p>
                </div>
                `
            });

            console.log('Appointment confirmation emails sent successfully');
            return true;
        } catch (error) {
            console.error('Error sending appointment confirmation emails:', error);
            return false;
        }
    }

    // Send payment success email to student
    async sendPaymentSuccessEmail(paymentId, appointment) {
        try {
            const { student, teacher, dateTime, type } = appointment;

            await this.sendEmail({
                to: student.email,
                subject: 'Payment Successful - Online-study.com',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4a90e2;">Payment Successful</h2>
                    <p>Your payment for the appointment has been processed successfully.</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Appointment Details</h3>
                        <p><strong>Teacher:</strong> Dr. ${teacher.firstName} ${teacher.lastName}</p>
                        <p><strong>Date & Time:</strong> ${formatDateTime(dateTime)}</p>
                        <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)} Lesson</p>
                        <p><strong>Payment ID:</strong> ${paymentId}</p>
                    </div>
                    
                    <p>Your appointment is now awaiting teacher confirmation. You'll receive a notification once confirmed.</p>
                </div>
                `
            });

            console.log('Payment success email sent successfully');
            return true;
        } catch (error) {
            console.error('Error sending payment success email:', error);
            return false;
        }
    }

    // Send payment confirmation email
    async sendPaymentConfirmation(paymentId) {
        try {
            // Fetch payment information first
            const Payment = require('../payment/model');
            const payment = await Payment.findById(paymentId)
                .populate({
                    path: 'appointment',
                    populate: {
                        path: 'student teacher',
                        select: 'firstName lastName email specializations'
                    }
                });

            if (!payment || !payment.appointment) {
                throw new Error('Payment or appointment information not found');
            }

            const { student, teacher, dateTime, type } = payment.appointment;

            await this.sendEmail({
                to: student.email,
                subject: 'Payment Confirmation - Online-study.com',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4a90e2;">Payment Confirmation</h2>
                    <p>This is a confirmation of your payment for the following appointment:</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Payment Details</h3>
                        <p><strong>Payment ID:</strong> ${payment._id}</p>
                        <p><strong>Amount:</strong> ${formatCurrency(payment.amount)}</p>
                        <p><strong>Status:</strong> ${payment.status}</p>
                        <p><strong>Teacher:</strong> Dr. ${teacher.firstName} ${teacher.lastName}</p>
                        <p><strong>Date & Time:</strong> ${formatDateTime(dateTime)}</p>
                        <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)} Lesson</p>
                    </div>
                    
                    <p>Thank you for your payment. Your appointment is now confirmed.</p>
                </div>
                `
            });

            console.log('Payment confirmation email sent successfully');
            return true;
        } catch (error) {
            console.error('Error sending payment confirmation email:', error);
            return false;
        }
    }

    // Send payment refund notification
    async sendPaymentRefundNotification(payment) {
        try {
            await payment.populate({
                path: 'appointment',
                populate: {
                    path: 'student teacher',
                    select: 'firstName lastName email specializations'
                }
            });

            const { student, teacher, dateTime, type } = payment.appointment;

            await this.sendEmail({
                to: student.email,
                subject: 'Payment Refund - Online-study.com',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4a90e2;">Payment Refund</h2>
                    <p>Your payment has been refunded for the following cancelled appointment:</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Refund Details</h3>
                        <p><strong>Payment ID:</strong> ${payment._id}</p>
                        <p><strong>Amount:</strong> ${formatCurrency(payment.amount)}</p>
                        <p><strong>Teacher:</strong> Dr. ${teacher.firstName} ${teacher.lastName}</p>
                        <p><strong>Date & Time:</strong> ${formatDateTime(dateTime)}</p>
                        <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)} Lesson</p>
                    </div>
                    
                    <p>The refund will be processed according to your payment method's standard processing times.</p>
                    <p>If you have any questions about this refund, please contact our support team.</p>
                </div>
                `
            });

            console.log('Payment refund email sent successfully');
            return true;
        } catch (error) {
            console.error('Error sending payment refund email:', error);
            return false;
        }
    }

    // Send homework notification
    async sendHomeworkNotification(appointment) {
        try {
            await appointment.populate('student teacher');

            const { student, teacher, homeworks } = appointment;

            // Format homeworks for email
            let homeworksHtml = '';
            homeworks.forEach((homework, index) => {
                homeworksHtml += `
                <div style="border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 10px;">
                    <p><strong>Medication:</strong> ${homework.medication}</p>
                    <p><strong>Dosage:</strong> ${homework.dosage}</p>
                    <p><strong>Frequency:</strong> ${homework.frequency}</p>
                    <p><strong>Duration:</strong> ${homework.duration}</p>
                    ${homework.instructions ? `<p><strong>Instructions:</strong> ${homework.instructions}</p>` : ''}
                </div>
                `;
            });

            await this.sendEmail({
                to: student.email,
                subject: 'New Homeworks from Your Teacher - Online-study.com',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4a90e2;">New Homeworks</h2>
                    <p>Dr. ${teacher.firstName} ${teacher.lastName} has prescribed the following medication(s) after your lesson:</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        ${homeworksHtml}
                    </div>
                    
                    <p>You can view these homeworks at any time by logging into your Online-study.com account.</p>
                    <p><strong>Note:</strong> Always follow your teacher's instructions when taking medications.</p>
                </div>
                `
            });

            console.log('Homework notification email sent successfully');
            return true;
        } catch (error) {
            console.error('Error sending homework notification email:', error);
            return false;
        }
    }

    // Send follow-up notification
    async sendFollowUpNotification(followUpAppointment) {
        try {
            await followUpAppointment.populate('student teacher');

            const { student, teacher, dateTime, type, reasonForVisit } = followUpAppointment;

            await this.sendEmail({
                to: student.email,
                subject: 'Follow-up Appointment Recommended - Online-study.com',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4a90e2;">Follow-up Appointment</h2>
                    <p>Dr. ${teacher.firstName} ${teacher.lastName} has recommended a follow-up appointment:</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Appointment Details</h3>
                        <p><strong>Teacher:</strong> Dr. ${teacher.firstName} ${teacher.lastName}</p>
                        <p><strong>Date & Time:</strong> ${formatDateTime(dateTime)}</p>
                        <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)} Lesson</p>
                        <p><strong>Reason:</strong> ${reasonForVisit}</p>
                    </div>
                    
                    <p>This appointment requires payment confirmation. Please log in to your Online-study.com account to confirm and complete payment for this follow-up appointment.</p>
                </div>
                `
            });

            await this.sendEmail({
                to: teacher.email,
                subject: 'Follow-up Appointment Created - Online-study.com',
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #4a90e2;">Follow-up Appointment Created</h2>
                    <p>You have successfully created a follow-up appointment for ${student.firstName} ${student.lastName}:</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Appointment Details</h3>
                        <p><strong>Student:</strong> ${student.firstName} ${student.lastName}</p>
                        <p><strong>Date & Time:</strong> ${formatDateTime(dateTime)}</p>
                        <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)} Lesson</p>
                        <p><strong>Reason:</strong> ${reasonForVisit}</p>
                    </div>
                    
                    <p>The student has been notified and needs to confirm the appointment by completing payment.</p>
                </div>
                `
            });

            console.log('Follow-up notification emails sent successfully');
            return true;
        } catch (error) {
            console.error('Error sending follow-up notification emails:', error);
            return false;
        }
    }
}

// Create a singleton instance
const emailService = new EmailService();

module.exports = emailService;