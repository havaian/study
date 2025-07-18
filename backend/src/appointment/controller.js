const Appointment = require('./model.js');
const User = require('../user/model.js');
const Payment = require('../payment/model.js');
const { validateAppointmentInput } = require('../utils/validators');
const { NotificationService } = require('../notification');
const emailService = require('../notification/emailService.js');

// Create a new appointment
exports.createAppointment = async (req, res) => {
    try {
        const studentId = req.user.id;

        const { teacherId, dateTime, type, shortDescription, notes, duration = 30 } = req.body;

        // Validate duration is a multiple of 15 minutes
        if (duration % 15 !== 0 || duration < 15 || duration > 120) {
            return res.status(400).json({
                message: 'Duration must be a multiple of 15 minutes (15, 30, 45, 60, etc.) and between 15-120 minutes'
            });
        }

        const appointmentData = {
            teacherId,
            dateTime,
            type,
            shortDescription,
            notes
        };

        const { error } = validateAppointmentInput(appointmentData);
        if (error) {
            // Send failure email to student
            const student = await User.findById(studentId);
            const teacher = await User.findById(teacherId);

            await emailService.sendAppointmentBookingFailed({
                student,
                teacher,
                dateTime,
                type,
                error: error.details[0].message
            });

            return res.status(400).json({ message: error.details[0].message });
        }

        // Verify that teacher exists
        const teacher = await User.findById(teacherId);
        if (!teacher || teacher.role !== 'teacher') {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        // Verify that student exists
        const student = await User.findById(studentId);
        if (!student || student.role !== 'student') {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Check appointment type is valid
        const validTypes = ['video', 'audio', 'chat'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ message: 'Invalid appointment type. Must be video, audio, or chat' });
        }

        // Calculate end time based on duration
        const appointmentDate = new Date(dateTime);
        const endTime = new Date(appointmentDate.getTime() + duration * 60000);

        // Check if the teacher is available for the entire duration
        const conflictingAppointment = await Appointment.findOne({
            teacher: teacherId,
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
            // Send failure email to student
            await emailService.sendAppointmentBookingFailed({
                student,
                teacher,
                dateTime,
                type,
                error: 'Teacher is not available at this time'
            });

            return res.status(409).json({ message: 'Teacher is not available at this time' });
        }

        // Check if teacher's working hours allow this appointment
        const dayOfWeek = appointmentDate.getDay(); // 0 is Sunday, 1 is Monday
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to 0-based (Monday = 0, Sunday = 6)

        const teacherAvailability = teacher.availability.find(a => a.dayOfWeek === dayIndex);

        if (!teacherAvailability || !teacherAvailability.isAvailable) {
            return res.status(400).json({ message: 'Teacher is not available on this day' });
        }

        // Check if appointment falls within teacher's working hours
        const appointmentHour = appointmentDate.getHours();
        const appointmentMinute = appointmentDate.getMinutes();
        const appointmentTime = appointmentHour * 60 + appointmentMinute;

        const endHour = endTime.getHours();
        const endMinute = endTime.getMinutes();
        const appointmentEndTime = endHour * 60 + endMinute;

        // Parse teacher's working hours
        let isWithinWorkingHours = false;

        // // Check each working time slot for the day
        // if (Array.isArray(teacherAvailability.timeSlots) && teacherAvailability.timeSlots.length > 0) {
        //     for (const slot of teacherAvailability.timeSlots) {
        //         const [startHour, startMinute] = slot.startTime.split(':').map(Number);
        //         const [endHour, endMinute] = slot.endTime.split(':').map(Number);

        //         const slotStartTime = startHour * 60 + startMinute;
        //         const slotEndTime = endHour * 60 + endMinute;

        //         // Check if appointment falls within this slot
        //         if (appointmentTime >= slotStartTime && appointmentEndTime <= slotEndTime) {
        //             isWithinWorkingHours = true;
        //             break;
        //         }
        //     }
        // } else {
        //     // Fallback to the old format if timeSlots is not available
        //     const [startHour, startMinute] = teacherAvailability.startTime.split(':').map(Number);
        //     const [endHour, endMinute] = teacherAvailability.endTime.split(':').map(Number);

        //     const workingStartTime = startHour * 60 + startMinute;
        //     const workingEndTime = endHour * 60 + endMinute;

        //     if (appointmentTime >= workingStartTime && appointmentEndTime <= workingEndTime) {
        //         isWithinWorkingHours = true;
        //     }
        // }

        // if (!isWithinWorkingHours) {
        //     return res.status(400).json({ message: 'Appointment time is outside teacher\'s working hours' });
        // }

        // Create new appointment with pending-teacher-confirmation status
        const appointment = new Appointment({
            student: studentId,
            teacher: teacherId,
            dateTime: appointmentDate,
            endTime: endTime,
            duration: duration,
            type,
            shortDescription,
            notes: notes || '',
            status: 'pending-teacher-confirmation',
            teacherConfirmationExpires: calculateTeacherConfirmationDeadline(teacher, appointmentDate)
        });

        await appointment.save();

        // Send confirmation emails
        await emailService.sendAppointmentBookedEmails({
            ...appointment.toObject(),
            student,
            teacher
        });

        res.status(201).json({
            message: 'Appointment created successfully, awaiting teacher confirmation',
            appointment
        });
    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({ message: 'An error occurred while creating the appointment' });
    }
};

// Helper function to calculate teacher confirmation deadline
function calculateTeacherConfirmationDeadline(teacher, appointmentDate) {
    // Get the day of the appointment
    const appointmentDay = appointmentDate.getDay(); // 0 is Sunday, 1 is Monday
    const dayIndex = appointmentDay === 0 ? 6 : appointmentDay - 1; // Convert to 0-based (Monday = 0, Sunday = 6)

    // Find teacher's working hours for this day
    const workingHours = teacher.availability.find(a => a.dayOfWeek === dayIndex);

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

// Get all appointments for a student
exports.getStudentAppointments = async (req, res) => {
    try {
        const { studentId } = req.params || req.user.id;
        const { status, limit = 10, skip = 0, view = 'list' } = req.query;

        const query = { student: studentId };
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
            .populate('teacher', 'firstName lastName specializations profilePicture');

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
        console.error('Error fetching student appointments:', error);
        res.status(500).json({ message: 'An error occurred while fetching appointments' });
    }
};

// Get all appointments for a teacher
exports.getTeacherAppointments = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const { status, date, limit = 10, skip = 0, view = 'list' } = req.query;

        const query = { teacher: teacherId };
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
            .populate('student', 'firstName lastName profilePicture dateOfBirth');

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
        console.error('Error fetching teacher appointments:', error);
        res.status(500).json({ message: 'An error occurred while fetching appointments' });
    }
};

// Teacher confirms appointment
exports.confirmAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const teacherId = req.user.id;

        const appointment = await Appointment.findById(id)
            .populate('student')
            .populate('teacher');

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Verify teacher is assigned to this appointment
        if (appointment.teacher._id.toString() !== teacherId.toString()) {
            return res.status(403).json({ message: 'You are not authorized to confirm this appointment' });
        }

        // Check appointment status
        if (appointment.status !== 'pending-teacher-confirmation') {
            return res.status(400).json({ message: `Cannot confirm appointment with status "${appointment.status}"` });
        }

        // Check confirmation deadline
        if (appointment.teacherConfirmationExpires && new Date() > new Date(appointment.teacherConfirmationExpires)) {
            // Auto-cancel appointment if deadline passed
            appointment.status = 'canceled';
            appointment.cancellationReason = 'Teacher did not confirm in time';
            await appointment.save();

            // Refund payment if any
            if (appointment.payment && appointment.payment.transactionId) {
                const payment = await Payment.findById(appointment.payment.transactionId);
                if (payment && payment.status !== 'refunded') {
                    payment.status = 'refunded';
                    await payment.save();
                }
            }

            // Notify student
            await NotificationService.sendAppointmentCancellationNotification(appointment, 'system');

            return res.status(400).json({
                message: 'Confirmation deadline has passed. Appointment has been automatically canceled.'
            });
        }

        // Update status to scheduled
        appointment.status = 'scheduled';
        await appointment.save();

        // Notify student of confirmed appointment
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
        const { status, lessonSummary, cancellationReason } = req.body;

        const appointment = await Appointment.findById(id)
            .populate('student')
            .populate('teacher');

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Validate status transition
        const validTransitions = {
            'pending-teacher-confirmation': ['scheduled', 'canceled'],
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

        if (status === 'completed' && lessonSummary) {
            appointment.lessonSummary = lessonSummary;
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
            const cancelledBy = req.user.role === 'teacher' ? 'teacher' : 'student';
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
            .populate('teacher', 'firstName lastName specializations profilePicture email phone')
            .populate('student', 'firstName lastName profilePicture dateOfBirth email phone');

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        res.status(200).json({ appointment });
    } catch (error) {
        console.error('Error fetching appointment details:', error);
        res.status(500).json({ message: 'An error occurred while fetching appointment details' });
    }
};

// Add/update homeworks for an appointment
exports.updateHomeworks = async (req, res) => {
    try {
        const { id } = req.params;
        const { homeworks } = req.body;

        const appointment = await Appointment.findById(id);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Only allow teachers to update homeworks for completed appointments
        if (appointment.status !== 'completed') {
            return res.status(400).json({
                message: 'Homeworks can only be added to completed appointments'
            });
        }

        // Validate teacher is assigned to this appointment
        if (req.user.role === 'teacher' && appointment.teacher.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You are not authorized to update homeworks for this appointment' });
        }

        // Add new homeworks (preserve existing ones)
        const existingHomeworks = appointment.homeworks || [];
        appointment.homeworks = [...existingHomeworks, ...homeworks];

        await appointment.save();

        // Notify student about new homeworks
        await NotificationService.sendHomeworkNotification(appointment);

        res.status(200).json({
            message: 'Homeworks updated successfully',
            appointment
        });
    } catch (error) {
        console.error('Error updating homeworks:', error);
        res.status(500).json({ message: 'An error occurred while updating homeworks' });
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
            .populate('teacher')
            .populate('student');

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
            student: appointment.student._id,
            teacher: appointment.teacher._id,
            dateTime: followUpDateObj,
            endTime: endTime,
            duration: duration,
            type: appointment.type,
            shortDescription: `Follow-up to appointment on ${appointment.dateTime.toLocaleDateString()} - ${notes || 'No notes provided'}`,
            status: 'pending-payment',
            payment: {
                amount: appointment.teacher.lessonFee,
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
        const { studentId } = req.params;

        // Find all pending-payment follow-up appointments for the student
        const appointments = await Appointment.find({
            student: studentId,
            status: 'pending-payment',
            shortDescription: { $regex: 'Follow-up to appointment on', $options: 'i' }
        })
            .populate('teacher', 'firstName lastName specializations profilePicture email')
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

// Get teacher's availability slots
exports.getTeacherAvailability = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ message: 'Date parameter is required' });
        }

        // Get teacher's working hours
        const teacher = await User.findById(teacherId);
        if (!teacher || teacher.role !== 'teacher') {
            return res.status(404).json({ message: 'Teacher not found' });
        }

        // Parse the date exactly as received from frontend (YYYY-MM-DD)
        // Don't add timezone offset, just parse as-is
        const requestedDate = new Date(date + 'T00:00:00.000Z');

        // Get the day of the week (0 = Sunday, 1 = Monday, etc.)
        const dayOfWeek = requestedDate.getUTCDay();
        
        // Convert to backend's day indexing: Monday=1, Tuesday=2, ..., Sunday=7
        const dayIndex = dayOfWeek === 0 ? 7 : dayOfWeek;

        console.log(`Requested date: ${date}, Day of week: ${dayOfWeek}, Day index: ${dayIndex}`);

        const dayAvailability = teacher.availability.find(a => a.dayOfWeek === dayIndex);
        if (!dayAvailability || !dayAvailability.isAvailable) {
            return res.status(200).json({
                message: 'Teacher is not available on this day',
                availableSlots: []
            });
        }

        let availableSlots = [];

        // Check if the teacher has time slots defined
        if (Array.isArray(dayAvailability.timeSlots) && dayAvailability.timeSlots.length > 0) {
            // For each time slot, generate available appointment slots
            for (const timeSlot of dayAvailability.timeSlots) {
                const slots = await generateTimeSlots(
                    requestedDate,
                    timeSlot.startTime,
                    timeSlot.endTime,
                    teacherId
                );
                availableSlots = [...availableSlots, ...slots];
            }
        } else {
            // Fallback to old format
            availableSlots = await generateTimeSlots(
                requestedDate,
                dayAvailability.startTime,
                dayAvailability.endTime,
                teacherId
            );
        }

        res.status(200).json({
            availableSlots,
            workingHours: Array.isArray(dayAvailability.timeSlots) ?
                dayAvailability.timeSlots :
                { start: dayAvailability.startTime, end: dayAvailability.endTime }
        });
    } catch (error) {
        console.error('Error fetching teacher availability:', error);
        res.status(500).json({ message: 'An error occurred while fetching teacher availability' });
    }
};

/**
 * Get appointments pending teacher confirmation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getPendingConfirmations = async (req, res) => {
    try {
        const { teacherId } = req.params;
        const { limit = 10, skip = 0 } = req.query;

        // Find appointments that are pending teacher confirmation for this teacher
        const query = {
            teacher: teacherId,
            status: 'pending-teacher-confirmation',
            // Only include appointments that haven't expired yet
            teacherConfirmationExpires: { $gt: new Date() }
        };

        const appointments = await Appointment.find(query)
            .sort({ teacherConfirmationExpires: 1 }) // Sort by expiration time (most urgent first)
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .populate('student', 'firstName lastName profilePicture dateOfBirth email phone')
            .populate('teacher', 'firstName lastName specializations');

        const total = await Appointment.countDocuments(query);

        // Calculate time remaining for each appointment
        const appointmentsWithTimeRemaining = appointments.map(appointment => {
            const now = new Date();
            const expiresAt = new Date(appointment.teacherConfirmationExpires);
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
async function generateTimeSlots(date, startTimeStr, endTimeStr, teacherId) {
    console.log(`Generating slots for date: ${date}, start: ${startTimeStr}, end: ${endTimeStr}`);
    
    // Parse start and end times
    const [startHour, startMinute] = startTimeStr.split(':').map(Number);
    const [endHour, endMinute] = endTimeStr.split(':').map(Number);

    // Create times in UTC for the requested date
    const startTime = new Date(date);
    startTime.setUTCHours(startHour, startMinute, 0, 0);

    const endTime = new Date(date);
    endTime.setUTCHours(endHour, endMinute, 0, 0);

    console.log(`Start time: ${startTime.toISOString()}, End time: ${endTime.toISOString()}`);

    // Generate slots at 30-minute intervals
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

        currentSlot.setMinutes(currentSlot.getMinutes() + 30); // Move to next 30-min interval
    }

    // Get current time in UTC+5 and convert to UTC for comparison
    const nowUTC5 = new Date();
    nowUTC5.setHours(nowUTC5.getHours() + 5); // Add 5 hours to get UTC+5
    const nowUTC = new Date(nowUTC5.getTime() - (5 * 60 * 60 * 1000)); // Convert back to UTC

    console.log(`Current time UTC+5: ${nowUTC5.toISOString()}, Current time UTC: ${nowUTC.toISOString()}`);

    // Remove slots that already have appointments
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const bookedAppointments = await Appointment.find({
        teacher: teacherId,
        dateTime: {
            $gte: startOfDay,
            $lt: endOfDay
        },
        status: { $in: ['scheduled', 'pending-teacher-confirmation'] }
    });

    console.log(`Found ${bookedAppointments.length} booked appointments for this day`);

    // Filter out past slots and conflicting slots
    const futureSlots = slots.filter(slot => {
        // Check if slot is in the future
        const isPastSlot = slot.start <= nowUTC;
        
        if (isPastSlot) {
            console.log(`Filtering out past slot: ${slot.start.toISOString()}`);
            return false;
        }

        // Check for conflicts with existing appointments
        const hasConflict = bookedAppointments.some(appointment => {
            const apptStart = new Date(appointment.dateTime);
            const apptEnd = appointment.endTime || new Date(apptStart.getTime() + (appointment.duration || 30) * 60000);

            // Check if there's an overlap
            return (
                (slot.start < apptEnd && slot.end > apptStart) || // Slot overlaps with appointment
                (apptStart < slot.end && apptEnd > slot.start)    // Appointment overlaps with slot
            );
        });

        if (hasConflict) {
            console.log(`Filtering out conflicting slot: ${slot.start.toISOString()}`);
        }

        return !hasConflict;
    });

    console.log(`Generated ${slots.length} total slots, ${futureSlots.length} future slots`);
    return futureSlots;
}

// Clean up expired pending appointments
exports.cleanupExpiredAppointments = async () => {
    try {
        // Find appointments past their confirmation deadline
        const expiredAppointments = await Appointment.find({
            status: 'pending-teacher-confirmation',
            teacherConfirmationExpires: { $lt: new Date() }
        }).populate('student').populate('teacher');

        for (const appointment of expiredAppointments) {
            // Update status to canceled
            appointment.status = 'canceled';
            appointment.cancellationReason = 'Teacher did not confirm in time';
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
 * Update lesson summary and add new homeworks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateLessonResults = async (req, res) => {
    try {
        const { id } = req.params;
        const { lessonSummary, homeworks, followUp } = req.body;
        const teacherId = req.user.id;

        // Find the appointment
        const appointment = await Appointment.findById(id)
            .populate('student', 'firstName lastName email telegramId')
            .populate('teacher', 'firstName lastName email telegramId');

        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        // Verify teacher is assigned to this appointment
        if (appointment.teacher._id.toString() !== teacherId.toString()) {
            return res.status(403).json({ message: 'You are not authorized to update this lesson' });
        }

        // Verify appointment is completed
        if (appointment.status !== 'completed') {
            return res.status(400).json({ message: 'Can only update completed lessons' });
        }

        // Update lesson summary if provided
        if (lessonSummary) {
            appointment.lessonSummary = lessonSummary;
        }

        // Add new homeworks if provided (don't replace existing ones)
        if (homeworks && Array.isArray(homeworks) && homeworks.length > 0) {
            // Filter out invalid homeworks
            const validHomeworks = homeworks.filter(homework => {
                return homework.medication && homework.dosage &&
                    homework.frequency && homework.duration;
            });

            // Add timestamp to each new homework
            const timestampedHomeworks = validHomeworks.map(homework => ({
                ...homework,
                createdAt: Date.now()
            }));

            // If appointment already has homeworks, append new ones
            if (appointment.homeworks && Array.isArray(appointment.homeworks)) {
                appointment.homeworks = [...appointment.homeworks, ...timestampedHomeworks];
            } else {
                appointment.homeworks = timestampedHomeworks;
            }

            // Send homework notification
            if (timestampedHomeworks.length > 0) {
                await NotificationService.sendHomeworkNotification(appointment);
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
                    student: appointment.student._id,
                    teacher: appointment.teacher._id,
                    dateTime: followUpDateObj,
                    endTime: endTime,
                    duration: duration,
                    type: appointment.type,
                    shortDescription: `Follow-up to appointment on ${appointment.dateTime.toLocaleDateString()} - ${followUp.notes || 'No notes provided'}`,
                    status: 'pending-payment',
                    payment: {
                        amount: appointment.teacher.lessonFee,
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
            message: 'Lesson results updated successfully',
            appointment
        });

    } catch (error) {
        console.error('Error updating lesson results:', error);
        res.status(500).json({ message: 'An error occurred while updating lesson results' });
    }
};

/**
 * Upload educational documents for an appointment
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

        // Determine who is uploading (student or teacher)
        const isTeacher = req.user.role === 'teacher' && appointment.teacher.toString() === userId;
        const isStudent = req.user.role === 'student' && appointment.student.toString() === userId;

        if (!isTeacher && !isStudent) {
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
            uploadedBy: isTeacher ? 'teacher' : 'student',
            uploadedAt: Date.now()
        };

        if (!appointment.documents) {
            appointment.documents = [];
        }

        appointment.documents.push(document);
        await appointment.save();

        // Notify the other party about the new document
        const recipient = isTeacher ? appointment.student : appointment.teacher;
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
        const isTeacher = req.user.role === 'teacher' && appointment.teacher.toString() === userId;
        const isStudent = req.user.role === 'student' && appointment.student.toString() === userId;

        if (!isTeacher && !isStudent && req.user.role !== 'admin') {
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

        if (userRole === 'teacher') {
            query.teacher = userId;
        } else if (userRole === 'student') {
            query.student = userId;
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
            .populate('teacher', 'firstName lastName specializations')
            .populate('student', 'firstName lastName')
            .sort({ dateTime: 1 });

        // Format appointments for calendar view
        const calendarEvents = appointments.map(appointment => {
            const eventColor = getStatusColor(appointment.status);

            return {
                id: appointment._id,
                title: userRole === 'teacher'
                    ? `${appointment.student.firstName} ${appointment.student.lastName}`
                    : `${appointment.teacher.firstName} ${appointment.teacher.lastName}`,
                start: appointment.dateTime,
                end: appointment.endTime,
                backgroundColor: eventColor,
                borderColor: eventColor,
                extendedProps: {
                    status: appointment.status,
                    type: appointment.type,
                    shortDescription: appointment.shortDescription,
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
                case 'pending-teacher-confirmation':
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