const Appointment = require('./model.js');
const User = require('../user/model.js');
const Payment = require('../payment/model.js');
const { validateAppointmentInput } = require('../utils/validators');
const { NotificationService } = require('../notification');
const emailService = require('../notification/emailService.js');

// Create a new appointment
exports.createAppointment = async (req, res) => {
    try {
        const patientId = req.user.id;

        const { doctorId, dateTime, type, reasonForVisit, notes, duration = 30 } = req.body;

        // Validate duration is a multiple of 15 minutes
        if (duration % 15 !== 0 || duration < 15 || duration > 120) {
            return res.status(400).json({
                message: 'Duration must be a multiple of 15 minutes (15, 30, 45, 60, etc.) and between 15-120 minutes'
            });
        }

        const appointmentData = {
            doctorId,
            dateTime,
            type,
            reasonForVisit,
            notes,
            duration
        };

        const { error } = validateAppointmentInput(appointmentData);
        if (error) {
            // Send failure email to patient
            const patient = await User.findById(patientId);
            const doctor = await User.findById(doctorId);

            await emailService.sendAppointmentFailedEmail({
                patient,
                doctor,
                dateTime,
                type,
                error: error.details[0].message
            });

            return res.status(400).json({ message: error.details[0].message });
        }

        // Verify that doctor exists
        const doctor = await User.findById(doctorId);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Verify that patient exists
        const patient = await User.findById(patientId);
        if (!patient || patient.role !== 'patient') {
            return res.status(404).json({ message: 'Patient not found' });
        }

        // Check appointment type is valid
        const validTypes = ['video', 'audio', 'chat'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ message: 'Invalid appointment type. Must be video, audio, or chat' });
        }

        // Calculate end time based on duration
        const appointmentDate = new Date(dateTime);
        const endTime = new Date(appointmentDate.getTime() + duration * 60000);

        // Check if the doctor is available for the entire duration
        const conflictingAppointment = await Appointment.findOne({
            doctor: doctorId,
            $or: [
                // Case 1: New appointment starts during an existing appointment
                {
                    dateTime: { $lte: appointmentDate },
                    endTime: { $gt: appointmentDate }
                },
                // Case 2: New appointment ends during an existing appointment
                {
                    dateTime: { $lt: endTime },
                    endTime: { $gte: endTime }
                },
                // Case 3: New appointment completely contains an existing appointment
                {
                    dateTime: { $gte: appointmentDate },
                    endTime: { $lte: endTime }
                }
            ],
            status: 'scheduled'
        });

        if (conflictingAppointment) {
            // Send failure email to patient
            await emailService.sendAppointmentFailedEmail({
                patient,
                doctor,
                dateTime,
                type,
                error: 'Doctor is not available at this time'
            });

            return res.status(409).json({ message: 'Doctor is not available at this time' });
        }

        // Check if doctor's working hours allow this appointment
        const dayOfWeek = appointmentDate.getDay(); // 0 is Sunday, 1 is Monday
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to 0-based (Monday = 0, Sunday = 6)

        const doctorAvailability = doctor.availability.find(a => a.dayOfWeek === dayIndex);

        if (!doctorAvailability || !doctorAvailability.isAvailable) {
            return res.status(400).json({ message: 'Doctor is not available on this day' });
        }

        // Check if appointment falls within doctor's working hours
        const appointmentHour = appointmentDate.getHours();
        const appointmentMinute = appointmentDate.getMinutes();
        const appointmentTime = appointmentHour * 60 + appointmentMinute;

        const endHour = endTime.getHours();
        const endMinute = endTime.getMinutes();
        const appointmentEndTime = endHour * 60 + endMinute;

        // Parse doctor's working hours
        let isWithinWorkingHours = false;

        // Check each working time slot for the day
        if (Array.isArray(doctorAvailability.timeSlots) && doctorAvailability.timeSlots.length > 0) {
            for (const slot of doctorAvailability.timeSlots) {
                const [startHour, startMinute] = slot.startTime.split(':').map(Number);
                const [endHour, endMinute] = slot.endTime.split(':').map(Number);

                const slotStartTime = startHour * 60 + startMinute;
                const slotEndTime = endHour * 60 + endMinute;

                // Check if appointment falls within this slot
                if (appointmentTime >= slotStartTime && appointmentEndTime <= slotEndTime) {
                    isWithinWorkingHours = true;
                    break;
                }
            }
        } else {
            // Fallback to the old format if timeSlots is not available
            const [startHour, startMinute] = doctorAvailability.startTime.split(':').map(Number);
            const [endHour, endMinute] = doctorAvailability.endTime.split(':').map(Number);

            const workingStartTime = startHour * 60 + startMinute;
            const workingEndTime = endHour * 60 + endMinute;

            if (appointmentTime >= workingStartTime && appointmentEndTime <= workingEndTime) {
                isWithinWorkingHours = true;
            }
        }

        if (!isWithinWorkingHours) {
            return res.status(400).json({ message: 'Appointment time is outside doctor\'s working hours' });
        }

        // Create new appointment with pending-doctor-confirmation status
        const appointment = new Appointment({
            patient: patientId,
            doctor: doctorId,
            dateTime: appointmentDate,
            endTime: endTime,
            duration: duration,
            type,
            reasonForVisit,
            notes: notes || '',
            status: 'pending-doctor-confirmation',
            doctorConfirmationExpires: calculateDoctorConfirmationDeadline(doctor, appointmentDate)
        });

        await appointment.save();

        // Send confirmation emails
        await emailService.sendAppointmentBookedEmails({
            ...appointment.toObject(),
            patient,
            doctor
        });

        res.status(201).json({
            message: 'Appointment created successfully, awaiting doctor confirmation',
            appointment
        });
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ message: 'An error occurred while creating the appointment' });
    }
};

// Helper function to calculate doctor confirmation deadline
function calculateDoctorConfirmationDeadline(doctor, appointmentDate) {
    // Get the day of the appointment
    const appointmentDay = appointmentDate.getDay(); // 0 is Sunday, 1 is Monday
    const dayIndex = appointmentDay === 0 ? 6 : appointmentDay - 1; // Convert to 0-based (Monday = 0, Sunday = 6)

    // Find doctor's working hours for this day
    const workingHours = doctor.availability.find(a => a.dayOfWeek === dayIndex);

    if (!workingHours || !workingHours.isAvailable) {
        // Fallback: If no working hours defined, set deadline to 1 hour from now
        return new Date(Date.now() + 60 * 60 * 1000);
    }

    // Get first time slot for the day or use the default startTime
    let startTime;
    if (Array.isArray(workingHours.timeSlots) && workingHours.timeSlots.length > 0) {
        startTime = workingHours.timeSlots[0].startTime;
    } else {
        startTime = workingHours.startTime;
    }

    const [hours, minutes] = startTime.split(':').map(Number);

    // Create a deadline Date object for the appointment day
    const deadline = new Date(appointmentDate);
    deadline.setHours(hours + 1, minutes, 0, 0); // 1 hour after start of working day

    // If appointment is within 24 hours, set deadline to 1 hour from now
    const now = new Date();
    if (appointmentDate - now < 24 * 60 * 60 * 1000) {
        return new Date(now.getTime() + 60 * 60 * 1000);
    }

    return deadline;
}

// Get all appointments for a patient
exports.getPatientAppointments = async (req, res) => {
    try {
        const { patientId } = req.params || req.user.id;
        const { status, limit = 10, skip = 0, view = 'list' } = req.query;

        const query = { patient: patientId };
        if (status) {
            query.status = status;
        }

        // Additional date filtering for calendar view
        if (view === 'calendar') {
            const { startDate, endDate } = req.query;
            if (startDate && endDate) {
                query.dateTime = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }
        }

        const appointments = await Appointment.find(query)
            .sort({ dateTime: view === 'calendar' ? 1 : -1 }) // Ascending for calendar, descending for list
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .populate('doctor', 'firstName lastName specializations profilePicture');

        const total = await Appointment.countDocuments(query);

        res.status(200).json({
            appointments,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip)
            }
        });
    } catch (error) {
        console.error('Error fetching patient appointments:', error);
        res.status(500).json({ message: 'An error occurred while fetching appointments' });
    }
};

// Get all appointments for a doctor
exports.getDoctorAppointments = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { status, date, limit = 10, skip = 0, view = 'list' } = req.query;

        const query = { doctor: doctorId };
        if (status) {
            query.status = status;
        }

        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);

            query.dateTime = {
                $gte: startDate,
                $lte: endDate
            };
        }

        // Additional date filtering for calendar view
        if (view === 'calendar') {
            const { startDate, endDate } = req.query;
            if (startDate && endDate) {
                query.dateTime = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }
        }

        const appointments = await Appointment.find(query)
            .sort({ dateTime: view === 'calendar' ? 1 : -1 }) // Ascending for calendar, descending for list
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .populate('patient', 'firstName lastName profilePicture dateOfBirth');

        const total = await Appointment.countDocuments(query);

        res.status(200).json({
            appointments,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip)
            }
        });
    } catch (error) {
        console.error('Error fetching doctor appointments:', error);
        res.status(500).json({ message: 'An error occurred while fetching appointments' });
    }
};

// Doctor confirms appointment
exports.confirmAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const doctorId = req.user.id;

        const appointment = await Appointment.findById(id)
            .populate('patient')
            .populate('doctor');

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Verify doctor is assigned to this appointment
        if (appointment.doctor._id.toString() !== doctorId) {
            return res.status(403).json({ message: 'You are not authorized to confirm this appointment' });
        }

        // Check appointment status
        if (appointment.status !== 'pending-doctor-confirmation') {
            return res.status(400).json({ message: `Cannot confirm appointment with status "${appointment.status}"` });
        }

        // Check confirmation deadline
        if (appointment.doctorConfirmationExpires && new Date() > new Date(appointment.doctorConfirmationExpires)) {
            // Auto-cancel appointment if deadline passed
            appointment.status = 'canceled';
            appointment.cancellationReason = 'Doctor did not confirm in time';
            await appointment.save();

            // Refund payment if any
            if (appointment.payment && appointment.payment.transactionId) {
                const payment = await Payment.findById(appointment.payment.transactionId);
                if (payment && payment.status !== 'refunded') {
                    payment.status = 'refunded';
                    await payment.save();
                }
            }

            // Notify patient
            await NotificationService.sendAppointmentCancellationNotification(appointment, 'system');

            return res.status(400).json({
                message: 'Confirmation deadline has passed. Appointment has been automatically canceled.'
            });
        }

        // Update status to scheduled
        appointment.status = 'scheduled';
        await appointment.save();

        // Notify patient of confirmed appointment
        await NotificationService.sendAppointmentConfirmedNotification(appointment);

        res.status(200).json({
            message: 'Appointment confirmed successfully',
            appointment
        });
    } catch (error) {
        console.error('Error confirming appointment:', error);
        res.status(500).json({ message: 'An error occurred while confirming the appointment' });
    }
};

// Update appointment status
exports.updateAppointmentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, consultationSummary, cancellationReason } = req.body;

        const appointment = await Appointment.findById(id)
            .populate('patient')
            .populate('doctor');

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Validate status transition
        const validTransitions = {
            'pending-doctor-confirmation': ['scheduled', 'canceled'],
            'pending-payment': ['scheduled', 'canceled'],
            'scheduled': ['completed', 'canceled', 'no-show'],
            'completed': [],
            'canceled': [],
            'no-show': []
        };

        if (!validTransitions[appointment.status].includes(status)) {
            return res.status(400).json({
                message: `Cannot change status from ${appointment.status} to ${status}`
            });
        }

        const oldStatus = appointment.status;
        appointment.status = status;

        if (status === 'completed' && consultationSummary) {
            appointment.consultationSummary = consultationSummary;
        }

        if (status === 'canceled' && cancellationReason) {
            appointment.cancellationReason = cancellationReason;
        }

        await appointment.save();

        // Automatic payment refund for canceled appointments
        if (status === 'canceled' && appointment.payment && appointment.payment.transactionId) {
            const payment = await Payment.findById(appointment.payment.transactionId);
            if (payment && payment.status !== 'refunded') {
                payment.status = 'refunded';
                await payment.save();

                // Add refund notification logic here
                await NotificationService.sendPaymentRefundNotification(payment);
            }
        }

        // Send cancellation emails if appointment was canceled
        if (status === 'canceled' && oldStatus === 'scheduled') {
            const cancelledBy = req.user.role === 'doctor' ? 'doctor' : 'patient';
            await emailService.sendAppointmentCancelledEmails(appointment, cancelledBy);
        }

        res.status(200).json({
            message: 'Appointment status updated successfully',
            appointment
        });
    } catch (error) {
        console.error('Error updating appointment status:', error);
        res.status(500).json({ message: 'An error occurred while updating appointment status' });
    }
};

// Get a specific appointment by ID
exports.getAppointmentById = async (req, res) => {
    try {
        const { id } = req.params;

        const appointment = await Appointment.findById(id)
            .populate('doctor', 'firstName lastName specializations profilePicture email phone')
            .populate('patient', 'firstName lastName profilePicture dateOfBirth email phone');

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        res.status(200).json({ appointment });
    } catch (error) {
        console.error('Error fetching appointment details:', error);
        res.status(500).json({ message: 'An error occurred while fetching appointment details' });
    }
};

// Add/update prescriptions for an appointment
exports.updatePrescriptions = async (req, res) => {
    try {
        const { id } = req.params;
        const { prescriptions } = req.body;

        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Only allow doctors to update prescriptions for completed appointments
        if (appointment.status !== 'completed') {
            return res.status(400).json({
                message: 'Prescriptions can only be added to completed appointments'
            });
        }

        // Validate doctor is assigned to this appointment
        if (req.user.role === 'doctor' && appointment.doctor.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You are not authorized to update prescriptions for this appointment' });
        }

        // Add new prescriptions (preserve existing ones)
        const existingPrescriptions = appointment.prescriptions || [];
        appointment.prescriptions = [...existingPrescriptions, ...prescriptions];

        await appointment.save();

        // Notify patient about new prescriptions
        await NotificationService.sendPrescriptionNotification(appointment);

        res.status(200).json({
            message: 'Prescriptions updated successfully',
            appointment
        });
    } catch (error) {
        console.error('Error updating prescriptions:', error);
        res.status(500).json({ message: 'An error occurred while updating prescriptions' });
    }
};

// Schedule a follow-up appointment
exports.scheduleFollowUp = async (req, res) => {
    try {
        const { id } = req.params;
        const { followUpDate, notes, duration = 30 } = req.body;

        // Validate duration is a multiple of 15 minutes
        if (duration % 15 !== 0 || duration < 15 || duration > 120) {
            return res.status(400).json({
                message: 'Duration must be a multiple of 15 minutes (15, 30, 45, 60, etc.) and between 15-120 minutes'
            });
        }

        const appointment = await Appointment.findById(id)
            .populate('doctor')
            .populate('patient');

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Update follow-up information
        appointment.followUp = {
            recommended: true,
            date: new Date(followUpDate),
            notes: notes || ''
        };

        await appointment.save();

        // Calculate end time
        const followUpDateObj = new Date(followUpDate);
        const endTime = new Date(followUpDateObj.getTime() + duration * 60000);

        // Create a new appointment for the follow-up with pending-payment status
        const followUpAppointment = new Appointment({
            patient: appointment.patient._id,
            doctor: appointment.doctor._id,
            dateTime: followUpDateObj,
            endTime: endTime,
            duration: duration,
            type: appointment.type,
            reasonForVisit: `Follow-up to appointment on ${appointment.dateTime.toLocaleDateString()} - ${notes || 'No notes provided'}`,
            status: 'pending-payment',
            payment: {
                amount: appointment.doctor.consultationFee,
                status: 'pending'
            }
        });

        await followUpAppointment.save();

        // Notify about follow-up
        await NotificationService.sendFollowUpNotification(followUpAppointment);

        res.status(200).json({
            message: 'Follow-up scheduled successfully',
            followUpAppointment
        });
    } catch (error) {
        console.error('Error scheduling follow-up:', error);
        res.status(500).json({ message: 'An error occurred while scheduling follow-up' });
    }
};

exports.getPendingFollowUps = async (req, res) => {
    try {
        const { patientId } = req.params;

        // Find all pending-payment follow-up appointments for the patient
        const appointments = await Appointment.find({
            patient: patientId,
            status: 'pending-payment',
            reasonForVisit: { $regex: 'Follow-up to appointment on', $options: 'i' }
        })
            .populate('doctor', 'firstName lastName specializations profilePicture email')
            .sort({ dateTime: 1 });

        res.status(200).json({
            appointments,
            pagination: {
                total: appointments.length,
                limit: appointments.length,
                skip: 0
            }
        });
    } catch (error) {
        console.error('Error fetching pending follow-ups:', error);
        res.status(500).json({ message: 'An error occurred while fetching pending follow-ups' });
    }
};

// Get doctor's availability slots
exports.getDoctorAvailability = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ message: 'Date parameter is required' });
        }

        // Get doctor's working hours
        const doctor = await User.findById(doctorId);
        if (!doctor || doctor.role !== 'doctor') {
            return res.status(404).json({ message: 'Doctor not found' });
        }

        // Parse date and get working hours for that day of week
        const requestedDate = new Date(date);
        const dayOfWeek = requestedDate.getDay(); // 0 is Sunday, 1 is Monday, etc.
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to 0-based (Monday = 0, Sunday = 6)

        const dayAvailability = doctor.availability.find(a => a.dayOfWeek === dayIndex);
        if (!dayAvailability || !dayAvailability.isAvailable) {
            return res.status(200).json({
                message: 'Doctor is not available on this day',
                availableSlots: []
            });
        }

        let availableSlots = [];

        // Check if the doctor has time slots defined
        if (Array.isArray(dayAvailability.timeSlots) && dayAvailability.timeSlots.length > 0) {
            // For each time slot, generate available appointment slots
            for (const timeSlot of dayAvailability.timeSlots) {
                const slots = await generateTimeSlots(
                    requestedDate,
                    timeSlot.startTime,
                    timeSlot.endTime,
                    doctorId
                );
                availableSlots = [...availableSlots, ...slots];
            }
        } else {
            // Fallback to old format
            availableSlots = await generateTimeSlots(
                requestedDate,
                dayAvailability.startTime,
                dayAvailability.endTime,
                doctorId
            );
        }

        res.status(200).json({
            availableSlots,
            workingHours: Array.isArray(dayAvailability.timeSlots) ?
                dayAvailability.timeSlots :
                { start: dayAvailability.startTime, end: dayAvailability.endTime }
        });
    } catch (error) {
        console.error('Error fetching doctor availability:', error);
        res.status(500).json({ message: 'An error occurred while fetching doctor availability' });
    }
};

/**
 * Get appointments pending doctor confirmation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getPendingConfirmations = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { limit = 10, skip = 0 } = req.query;

        // Find appointments that are pending doctor confirmation for this doctor
        const query = {
            doctor: doctorId,
            status: 'pending-doctor-confirmation',
            // Only include appointments that haven't expired yet
            doctorConfirmationExpires: { $gt: new Date() }
        };

        const appointments = await Appointment.find(query)
            .sort({ doctorConfirmationExpires: 1 }) // Sort by expiration time (most urgent first)
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .populate('patient', 'firstName lastName profilePicture dateOfBirth email phone')
            .populate('doctor', 'firstName lastName specializations');

        const total = await Appointment.countDocuments(query);

        // Calculate time remaining for each appointment
        const appointmentsWithTimeRemaining = appointments.map(appointment => {
            const now = new Date();
            const expiresAt = new Date(appointment.doctorConfirmationExpires);
            const timeRemainingMs = expiresAt - now;
            const timeRemainingHours = Math.max(0, Math.floor(timeRemainingMs / (1000 * 60 * 60)));
            const timeRemainingMinutes = Math.max(0, Math.floor((timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60)));

            return {
                ...appointment.toObject(),
                timeRemaining: {
                    hours: timeRemainingHours,
                    minutes: timeRemainingMinutes,
                    totalMinutes: Math.max(0, Math.floor(timeRemainingMs / (1000 * 60)))
                }
            };
        });

        res.status(200).json({
            success: true,
            appointments: appointmentsWithTimeRemaining,
            pagination: {
                total,
                limit: parseInt(limit),
                skip: parseInt(skip),
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching pending confirmations:', error);
        res.status(500).json({ 
            success: false,
            message: 'An error occurred while fetching pending confirmations',
            error: error.message 
        });
    }
};

// Helper function to generate time slots
async function generateTimeSlots(date, startTimeStr, endTimeStr, doctorId) {
    // Parse start and end times
    const [startHour, startMinute] = startTimeStr.split(':').map(Number);
    const [endHour, endMinute] = endTimeStr.split(':').map(Number);

    const startTime = new Date(date);
    startTime.setHours(startHour, startMinute, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(endHour, endMinute, 0, 0);

    // Generate slots at 15-minute intervals
    const slots = [];
    let currentSlot = new Date(startTime);

    while (currentSlot < endTime) {
        const slotEnd = new Date(currentSlot);
        slotEnd.setMinutes(slotEnd.getMinutes() + 30); // Default 30-min slots

        if (slotEnd <= endTime) {
            slots.push({
                start: new Date(currentSlot),
                end: new Date(slotEnd)
            });
        }

        currentSlot.setMinutes(currentSlot.getMinutes() + 15); // Move to next 15-min interval
    }

    // Remove slots that already have appointments
    const bookedAppointments = await Appointment.find({
        doctor: doctorId,
        dateTime: {
            $gte: new Date(date.setHours(0, 0, 0, 0)),
            $lt: new Date(date.setHours(23, 59, 59, 999))
        },
        status: { $in: ['scheduled', 'pending-doctor-confirmation'] }
    });

    // Check for conflicts with each potential slot
    return slots.filter(slot => {
        return !bookedAppointments.some(appointment => {
            const apptStart = new Date(appointment.dateTime);
            const apptEnd = appointment.endTime ||
                new Date(apptStart.getTime() + (appointment.duration || 30) * 60000);

            // Check if there's an overlap
            return (
                (slot.start < apptEnd && slot.end > apptStart) || // Slot overlaps with appointment
                (apptStart < slot.end && apptEnd > slot.start)    // Appointment overlaps with slot
            );
        });
    });
}

// Clean up expired pending appointments
exports.cleanupExpiredAppointments = async () => {
    try {
        // Find appointments past their confirmation deadline
        const expiredAppointments = await Appointment.find({
            status: 'pending-doctor-confirmation',
            doctorConfirmationExpires: { $lt: new Date() }
        }).populate('patient').populate('doctor');

        for (const appointment of expiredAppointments) {
            // Update status to canceled
            appointment.status = 'canceled';
            appointment.cancellationReason = 'Doctor did not confirm in time';
            await appointment.save();

            // Process refund if payment exists
            if (appointment.payment && appointment.payment.transactionId) {
                const payment = await Payment.findById(appointment.payment.transactionId);
                if (payment && payment.status !== 'refunded') {
                    payment.status = 'refunded';
                    await payment.save();
                    await NotificationService.sendPaymentRefundNotification(payment);
                }
            }

            // Notify users
            await NotificationService.sendAppointmentCancellationNotification(appointment, 'system');
        }

        console.log(`Cleaned up ${expiredAppointments.length} expired pending appointments`);
    } catch (error) {
        console.error('Error cleaning up expired appointments:', error);
    }
};

/**
 * Update consultation summary and add new prescriptions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateConsultationResults = async (req, res) => {
    try {
        const { id } = req.params;
        const { consultationSummary, prescriptions, followUp } = req.body;
        const doctorId = req.user.id;

        // Find the appointment
        const appointment = await Appointment.findById(id)
            .populate('patient', 'firstName lastName email telegramId')
            .populate('doctor', 'firstName lastName email telegramId');

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Verify doctor is assigned to this appointment
        if (appointment.doctor._id.toString() !== doctorId) {
            return res.status(403).json({ message: 'You are not authorized to update this consultation' });
        }

        // Verify appointment is completed
        if (appointment.status !== 'completed') {
            return res.status(400).json({ message: 'Can only update completed consultations' });
        }

        // Update consultation summary if provided
        if (consultationSummary) {
            appointment.consultationSummary = consultationSummary;
        }

        // Add new prescriptions if provided (don't replace existing ones)
        if (prescriptions && Array.isArray(prescriptions) && prescriptions.length > 0) {
            // Filter out invalid prescriptions
            const validPrescriptions = prescriptions.filter(prescription => {
                return prescription.medication && prescription.dosage &&
                    prescription.frequency && prescription.duration;
            });

            // Add timestamp to each new prescription
            const timestampedPrescriptions = validPrescriptions.map(prescription => ({
                ...prescription,
                createdAt: Date.now()
            }));

            // If appointment already has prescriptions, append new ones
            if (appointment.prescriptions && Array.isArray(appointment.prescriptions)) {
                appointment.prescriptions = [...appointment.prescriptions, ...timestampedPrescriptions];
            } else {
                appointment.prescriptions = timestampedPrescriptions;
            }

            // Send prescription notification
            if (timestampedPrescriptions.length > 0) {
                await NotificationService.sendPrescriptionNotification(appointment);
            }
        }

        // Update follow-up recommendation if provided
        if (followUp && followUp.recommended) {
            appointment.followUp = {
                recommended: true,
                date: new Date(followUp.date),
                notes: followUp.notes || ''
            };

            // If creating a follow-up appointment was requested
            if (followUp.createAppointment) {
                // Calculate end time
                const followUpDateObj = new Date(followUp.date);
                const duration = followUp.duration || 30;
                const endTime = new Date(followUpDateObj.getTime() + duration * 60000);

                // Create a new appointment for the follow-up with pending-payment status
                const followUpAppointment = new Appointment({
                    patient: appointment.patient._id,
                    doctor: appointment.doctor._id,
                    dateTime: followUpDateObj,
                    endTime: endTime,
                    duration: duration,
                    type: appointment.type,
                    reasonForVisit: `Follow-up to appointment on ${appointment.dateTime.toLocaleDateString()} - ${followUp.notes || 'No notes provided'}`,
                    status: 'pending-payment',
                    payment: {
                        amount: appointment.doctor.consultationFee,
                        status: 'pending'
                    }
                });

                await followUpAppointment.save();

                // Notify about follow-up
                await NotificationService.sendFollowUpNotification(followUpAppointment);
            }
        }

        // Save changes
        await appointment.save();

        res.status(200).json({
            message: 'Consultation results updated successfully',
            appointment
        });

    } catch (error) {
        console.error('Error updating consultation results:', error);
        res.status(500).json({ message: 'An error occurred while updating consultation results' });
    }
};

/**
 * Upload medical documents for an appointment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.uploadDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Find appointment
        const appointment = await Appointment.findById(id);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Determine who is uploading (patient or doctor)
        const isDoctor = req.user.role === 'doctor' && appointment.doctor.toString() === userId;
        const isPatient = req.user.role === 'patient' && appointment.patient.toString() === userId;

        if (!isDoctor && !isPatient) {
            // Remove uploaded file if user is not authorized
            if (req.file && req.file.path) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(403).json({ message: 'You are not authorized to upload documents for this appointment' });
        }

        // Add document to appointment
        const document = {
            name: req.file.originalname,
            fileUrl: `/uploads/documents/${req.file.filename}`,
            fileType: req.file.mimetype,
            uploadedBy: isDoctor ? 'doctor' : 'patient',
            uploadedAt: Date.now()
        };

        if (!appointment.documents) {
            appointment.documents = [];
        }

        appointment.documents.push(document);
        await appointment.save();

        // Notify the other party about the new document
        const recipient = isDoctor ? appointment.patient : appointment.doctor;
        await NotificationService.sendDocumentUploadNotification(appointment, document, recipient);

        res.status(201).json({
            message: 'Document uploaded successfully',
            document
        });
    } catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({ message: 'An error occurred while uploading document' });
    }
};

/**
 * Get documents for an appointment
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getDocuments = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Find appointment
        const appointment = await Appointment.findById(id);

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Verify user is involved in the appointment
        const isDoctor = req.user.role === 'doctor' && appointment.doctor.toString() === userId;
        const isPatient = req.user.role === 'patient' && appointment.patient.toString() === userId;

        if (!isDoctor && !isPatient && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'You are not authorized to access documents for this appointment' });
        }

        // Return documents
        res.status(200).json({
            documents: appointment.documents || []
        });
    } catch (error) {
        console.error('Error fetching documents:', error);
        res.status(500).json({ message: 'An error occurred while fetching documents' });
    }
};

/**
 * Get appointments in calendar format
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCalendarAppointments = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { startDate, endDate, view = 'month' } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start date and end date are required for calendar view' });
        }

        // Set up query based on user role
        const query = {};

        if (userRole === 'doctor') {
            query.doctor = userId;
        } else if (userRole === 'patient') {
            query.patient = userId;
        } else if (userRole !== 'admin') {
            return res.status(403).json({ message: 'Unauthorized access to calendar' });
        }

        // Add date range to query
        query.dateTime = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };

        // Get appointments
        const appointments = await Appointment.find(query)
            .populate('doctor', 'firstName lastName specializations')
            .populate('patient', 'firstName lastName')
            .sort({ dateTime: 1 });

        // Format appointments for calendar view
        const calendarEvents = appointments.map(appointment => {
            const eventColor = getStatusColor(appointment.status);

            return {
                id: appointment._id,
                title: userRole === 'doctor'
                    ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
                    : `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
                start: appointment.dateTime,
                end: appointment.endTime,
                backgroundColor: eventColor,
                borderColor: eventColor,
                extendedProps: {
                    status: appointment.status,
                    type: appointment.type,
                    reasonForVisit: appointment.reasonForVisit,
                    appointmentId: appointment._id
                }
            };
        });

        // Helper function to get color based on status
        function getStatusColor(status) {
            switch (status) {
                case 'scheduled':
                    return '#4a90e2'; // Blue
                case 'completed':
                    return '#2ecc71'; // Green
                case 'canceled':
                    return '#e74c3c'; // Red
                case 'pending-payment':
                    return '#f39c12'; // Orange
                case 'pending-doctor-confirmation':
                    return '#9b59b6'; // Purple
                case 'no-show':
                    return '#95a5a6'; // Gray
                default:
                    return '#3498db'; // Default blue
            }
        }

        res.status(200).json({
            calendarEvents,
            totalAppointments: appointments.length,
            dateRange: {
                start: startDate,
                end: endDate
            }
        });
    } catch (error) {
        console.error('Error fetching calendar appointments:', error);
        res.status(500).json({ message: 'An error occurred while fetching calendar appointments' });
    }
};