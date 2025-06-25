const { format } = require('date-fns');

// Format currency amount
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS' }).format(amount);
};

// Format date and time
const formatDateTime = (date) => {
  return format(new Date(date), 'MMMM d, yyyy h:mm a');
};

exports.appointmentBookedPatient = (appointment) => {
  const { doctor, dateTime, type, payment } = appointment;

  return {
    subject: 'Appointment Confirmation - E-polyclinic.uz',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4a90e2;">Appointment Confirmed</h2>
        <p>Your appointment has been successfully booked.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Appointment Details</h3>
          <p><strong>Doctor:</strong> Dr. ${doctor.firstName} ${doctor.lastName}</p>
          <p><strong>Specialization:</strong> ${doctor.specializations.join(', ')}</p>
          <p><strong>Date & Time:</strong> ${formatDateTime(dateTime)}</p>
          <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)} Consultation</p>
          <p><strong>Amount Paid:</strong> ${formatCurrency(payment.amount)}</p>
        </div>
        
        <p>Please make sure to join the consultation 5 minutes before the scheduled time.</p>
        <p>You can view your appointment details and join the consultation by logging into your E-polyclinic.uz account.</p>
      </div>
    `
  };
};

exports.appointmentBookedDoctor = (appointment) => {
  const { patient, dateTime, type } = appointment;

  return {
    subject: 'New Appointment Scheduled - E-polyclinic.uz',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4a90e2;">New Appointment</h2>
        <p>A new appointment has been scheduled.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Appointment Details</h3>
          <p><strong>Patient:</strong> ${patient.firstName} ${patient.lastName}</p>
          <p><strong>Date & Time:</strong> ${formatDateTime(dateTime)}</p>
          <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)} Consultation</p>
        </div>
        
        <p>Please log in to your E-polyclinic.uz account to view the complete appointment details.</p>
      </div>
    `
  };
};

exports.appointmentBookingFailed = (data) => {
  const { doctor, dateTime, type, error } = data;

  return {
    subject: 'Appointment Booking Failed - E-polyclinic.uz',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">Appointment Booking Failed</h2>
        <p>Unfortunately, we couldn't complete your appointment booking.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Appointment Details</h3>
          <p><strong>Doctor:</strong> Dr. ${doctor.firstName} ${doctor.lastName}</p>
          <p><strong>Date & Time:</strong> ${formatDateTime(dateTime)}</p>
          <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)} Consultation</p>
          <p><strong>Reason:</strong> ${error}</p>
        </div>
        
        <p>Please try booking again or contact our support if you need assistance.</p>
      </div>
    `
  };
};

exports.appointmentReminder = (appointment) => {
  const { doctor, patient, dateTime, type } = appointment;
  const isDoctor = Boolean(doctor.email);

  return {
    subject: 'Appointment Reminder - E-polyclinic.uz',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4a90e2;">Appointment Reminder</h2>
        <p>This is a reminder about your upcoming appointment tomorrow.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Appointment Details</h3>
          ${isDoctor
        ? `<p><strong>Patient:</strong> ${patient.firstName} ${patient.lastName}</p>`
        : `<p><strong>Doctor:</strong> Dr. ${doctor.firstName} ${doctor.lastName}</p>`
      }
          <p><strong>Date & Time:</strong> ${formatDateTime(dateTime)}</p>
          <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)} Consultation</p>
        </div>
        
        <p>Please make sure to join the consultation 5 minutes before the scheduled time.</p>
      </div>
    `
  };
};

exports.appointmentCancelled = (appointment, cancelledBy) => {
  const { doctor, patient, dateTime, type } = appointment;
  const isDoctor = Boolean(doctor.email);

  return {
    subject: 'Appointment Cancelled - E-polyclinic.uz',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">Appointment Cancelled</h2>
        <p>The following appointment has been cancelled by ${cancelledBy}.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Appointment Details</h3>
          ${isDoctor
        ? `<p><strong>Patient:</strong> ${patient.firstName} ${patient.lastName}</p>`
        : `<p><strong>Doctor:</strong> Dr. ${doctor.firstName} ${doctor.lastName}</p>`
      }
          <p><strong>Date & Time:</strong> ${formatDateTime(dateTime)}</p>
          <p><strong>Type:</strong> ${type.charAt(0).toUpperCase() + type.slice(1)} Consultation</p>
        </div>
        
        ${isDoctor
        ? '<p>The time slot is now available for other appointments.</p>'
        : '<p>You can schedule a new appointment through our website.</p>'
      }
      </div>
    `
  };
};