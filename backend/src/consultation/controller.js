const Appointment = require('../appointment/model');
const User = require('../user/model');
const JitsiUtils = require('../utils/jitsiUtils');
const { NotificationService } = require('../notification');

/**
 * Controller for handling consultation-related operations
 */
class ConsultationController {
    /**
     * Initialize consultation controller
     */
    constructor() {
        // No need for webRTCService with Jitsi integration
    }

    /**
     * Join a consultation session
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    joinConsultation = async (req, res) => {
        try {
            const { appointmentId } = req.params;
            const userId = req.user.id;

            if (!appointmentId) {
                return res.status(400).json({ message: 'Appointment ID is required' });
            }

            // Find appointment
            const appointment = await Appointment.findById(appointmentId)
                .populate('doctor', 'firstName lastName profilePicture specializations email')
                .populate('patient', 'firstName lastName profilePicture dateOfBirth email');

            if (!appointment) {
                return res.status(404).json({ message: 'Appointment not found' });
            }

            // Check if user is involved in the appointment
            const isDoctor = req.user.role === 'doctor' && appointment.doctor._id.toString() === userId.toString();
            const isPatient = req.user.role === 'patient' && appointment.patient._id.toString() === userId.toString();

            if (!isDoctor && !isPatient) {
                return res.status(403).json({ message: 'You are not authorized to join this consultation' });
            }

            // Check if appointment is scheduled or in progress
            if (appointment.status !== 'scheduled') {
                return res.status(400).json({
                    message: `Cannot join consultation with status "${appointment.status}"`,
                    status: appointment.status
                });
            }

            // Check if appointment time is valid (not too early, not too late)
            const now = new Date();
            const appointmentTime = new Date(appointment.dateTime);
            const timeDiffMinutes = (appointmentTime - now) / (1000 * 60);

            // Can join 5 minutes before scheduled time
            if (timeDiffMinutes > 5) {
                return res.status(400).json({
                    message: 'Consultation is not ready yet',
                    startsInMinutes: Math.floor(timeDiffMinutes)
                });
            }

            // Cannot join 30 minutes after scheduled time
            if (timeDiffMinutes < -30) {
                return res.status(400).json({ message: 'Consultation time has expired' });
            }

            // Check if consultation has already ended (endTime has passed)
            if (appointment.endTime && now > appointment.endTime) {
                return res.status(400).json({ message: 'Consultation has already ended' });
            }

            // User info for Jitsi token
            const userInfo = {
                id: userId,
                name: isDoctor ?
                    `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}` :
                    `${appointment.patient.firstName} ${appointment.patient.lastName}`,
                avatar: isDoctor ? appointment.doctor.profilePicture : appointment.patient.profilePicture,
                email: isDoctor ? appointment.doctor.email : appointment.patient.email,
                role: isDoctor ? 'doctor' : 'patient'
            };

            // Generate Jitsi configuration
            const jitsiConfig = JitsiUtils.getJitsiConfig(appointmentId, userInfo);

            // Add custom configuration for participant limits - maximum of 2 participants
            jitsiConfig.interfaceConfigOverwrite = {
                ...jitsiConfig.interfaceConfigOverwrite,
                MAXIMUM_ZOOMING_COEFFICIENT: 1.0,
                DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
                SHOW_JITSI_WATERMARK: false,
                ENFORCE_NOTIFICATION_AUTO_DISMISS_TIMEOUT: 15000,
                // Set maximum number of participants
                MAX_PARTICIPANTS: 2,
                // Don't allow external API manipulation to override this
                ALLOW_MULTIPLE_AUDIO_INPUT: false,
                HIDE_INVITE_MORE_HEADER: true,
                DISABLE_FOCUS_INDICATOR: false,
                DISABLE_VIDEO_BACKGROUND: false,
                // Disable the Lobby feature (waiting room)
                ENABLE_LOBBY: false,
                // Disable the Breakout Rooms feature
                ENABLE_BREAKOUT_ROOMS: false
            };

            // Add participant limits to the token's context
            jitsiConfig.jwt = JitsiUtils.generateJitsiToken(jitsiConfig.roomName, userInfo, {
                maxParticipants: 2,
                allowedParticipants: [
                    appointment.doctor._id.toString(),
                    appointment.patient._id.toString()
                ]
            });

            // Prepare response with consultation info
            res.status(200).json({
                message: 'Joined consultation successfully',
                consultation: {
                    appointmentId: appointment._id,
                    type: appointment.type,
                    doctor: {
                        id: appointment.doctor._id,
                        name: `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
                        profilePicture: appointment.doctor.profilePicture,
                        specializations: appointment.doctor.specializations
                    },
                    patient: {
                        id: appointment.patient._id,
                        name: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
                        profilePicture: appointment.patient.profilePicture,
                        dateOfBirth: appointment.patient.dateOfBirth
                    },
                    dateTime: appointment.dateTime,
                    endTime: appointment.endTime,
                    reasonForVisit: appointment.reasonForVisit,
                    userRole: isDoctor ? 'doctor' : 'patient',
                    jitsi: jitsiConfig
                }
            });
        } catch (error) {
            console.error('Error joining consultation:', error);
            res.status(500).json({ message: 'An error occurred while joining the consultation' });
        }
    };

    /**
     * End a consultation (doctor only)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    endConsultation = async (req, res) => {
        try {
            const { appointmentId } = req.params;
            const { consultationSummary, chatLog } = req.body;

            if (!appointmentId) {
                return res.status(400).json({ message: 'Appointment ID is required' });
            }

            // Find appointment
            const appointment = await Appointment.findById(appointmentId);

            if (!appointment) {
                return res.status(404).json({ message: 'Appointment not found' });
            }

            // Only doctor or admin can end consultation
            if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Only doctors can end consultations' });
            }

            // Doctor must be assigned to the appointment
            if (req.user.role === 'doctor' && appointment.doctor.toString() !== req.user.id) {
                return res.status(403).json({ message: 'You are not the doctor for this appointment' });
            }

            // Update appointment status
            appointment.status = 'completed';

            // Add consultation summary if provided
            if (consultationSummary) {
                appointment.consultationSummary = consultationSummary;
            }

            // Save chat log if provided
            if (chatLog && Array.isArray(chatLog) && chatLog.length > 0) {
                appointment.chatLog = chatLog;
            }

            await appointment.save();

            // Send completion notification
            await NotificationService.sendAppointmentCompletionNotification(appointment);

            res.status(200).json({
                message: 'Consultation ended successfully',
                appointment
            });
        } catch (error) {
            console.error('Error ending consultation:', error);
            res.status(500).json({ message: 'An error occurred while ending the consultation' });
        }
    };

    /**
     * Add prescriptions to a completed appointment
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    addPrescriptions = async (req, res) => {
        try {
            const { appointmentId } = req.params;
            const { prescriptions } = req.body;

            if (!appointmentId) {
                return res.status(400).json({ message: 'Appointment ID is required' });
            }

            if (!prescriptions || !Array.isArray(prescriptions) || prescriptions.length === 0) {
                return res.status(400).json({ message: 'Valid prescriptions array is required' });
            }

            // Find appointment
            const appointment = await Appointment.findById(appointmentId);

            if (!appointment) {
                return res.status(404).json({ message: 'Appointment not found' });
            }

            // Only doctor or admin can add prescriptions
            if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Only doctors can add prescriptions' });
            }

            // Doctor must be assigned to the appointment
            if (req.user.role === 'doctor' && appointment.doctor.toString() !== req.user.id) {
                return res.status(403).json({ message: 'You are not the doctor for this appointment' });
            }

            // Validate prescription data
            const validPrescriptions = prescriptions.filter(prescription => {
                return prescription.medication && prescription.dosage && prescription.frequency && prescription.duration;
            });

            if (validPrescriptions.length === 0) {
                return res.status(400).json({ message: 'No valid prescriptions provided' });
            }

            // Add prescriptions to appointment
            appointment.prescriptions = validPrescriptions;
            await appointment.save();

            // Send prescription notification
            await NotificationService.sendPrescriptionNotification(appointment);

            res.status(200).json({
                message: 'Prescriptions added successfully',
                prescriptions: appointment.prescriptions
            });
        } catch (error) {
            console.error('Error adding prescriptions:', error);
            res.status(500).json({ message: 'An error occurred while adding prescriptions' });
        }
    };

    /**
     * Create a follow-up appointment
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    createFollowUp = async (req, res) => {
        try {
            const { appointmentId } = req.params;
            const { followUpDate, notes } = req.body;

            if (!appointmentId) {
                return res.status(400).json({ message: 'Appointment ID is required' });
            }

            if (!followUpDate) {
                return res.status(400).json({ message: 'Follow-up date is required' });
            }

            // Validate follow-up date (must be in the future)
            const followUpDateObj = new Date(followUpDate);
            const now = new Date();
            if (followUpDateObj <= now) {
                return res.status(400).json({ message: 'Follow-up date must be in the future' });
            }

            // Find the original appointment
            const originalAppointment = await Appointment.findById(appointmentId)
                .populate('doctor', 'firstName lastName consultationFee')
                .populate('patient', 'firstName lastName');

            if (!originalAppointment) {
                return res.status(404).json({ message: 'Original appointment not found' });
            }

            // Only doctor or admin can create follow-up
            if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Only doctors can create follow-up appointments' });
            }

            // Doctor must be assigned to the appointment
            if (req.user.role === 'doctor' && originalAppointment.doctor._id.toString() !== req.user.id) {
                return res.status(403).json({ message: 'You are not the doctor for this appointment' });
            }

            // Update original appointment with follow-up recommendation
            originalAppointment.followUp = {
                recommended: true,
                date: followUpDateObj,
                notes: notes || ''
            };
            await originalAppointment.save();

            // Create new follow-up appointment with 'pending-payment' status
            const followUpAppointment = new Appointment({
                patient: originalAppointment.patient._id,
                doctor: originalAppointment.doctor._id,
                dateTime: followUpDateObj,
                type: originalAppointment.type,
                reasonForVisit: `Follow-up to appointment on ${new Date(originalAppointment.dateTime).toLocaleDateString()} - ${notes || 'No notes provided'}`,
                status: 'pending-payment', // Special status for follow-ups pending payment
                payment: {
                    amount: originalAppointment.doctor.consultationFee,
                    status: 'pending'
                }
            });

            await followUpAppointment.save();

            // Notify patient about follow-up
            await NotificationService.sendFollowUpNotification(followUpAppointment);

            res.status(201).json({
                message: 'Follow-up appointment created successfully',
                followUpAppointment
            });
        } catch (error) {
            console.error('Error creating follow-up appointment:', error);
            res.status(500).json({ message: 'An error occurred while creating follow-up appointment' });
        }
    };

    /**
     * Get consultation status
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    getConsultationStatus = async (req, res) => {
        try {
            const { appointmentId } = req.params;

            if (!appointmentId) {
                return res.status(400).json({ message: 'Appointment ID is required' });
            }

            // Find appointment
            const appointment = await Appointment.findById(appointmentId);

            if (!appointment) {
                return res.status(404).json({ message: 'Appointment not found' });
            }

            res.status(200).json({
                appointmentId,
                status: appointment.status,
                isActive: appointment.status === 'scheduled',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error getting consultation status:', error);
            res.status(500).json({ message: 'An error occurred while checking consultation status' });
        }
    };

    /**
     * Save chat log from consultation
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    saveChatLog = async (req, res) => {
        try {
            const { appointmentId } = req.params;
            const { chatLog } = req.body;

            if (!appointmentId) {
                return res.status(400).json({ message: 'Appointment ID is required' });
            }

            if (!chatLog || !Array.isArray(chatLog)) {
                return res.status(400).json({ message: 'Valid chat log array is required' });
            }

            // Find appointment
            const appointment = await Appointment.findById(appointmentId);

            if (!appointment) {
                return res.status(404).json({ message: 'Appointment not found' });
            }

            // Check if user is involved in the appointment
            const isDoctor = req.user.role === 'doctor' && appointment.doctor.toString() === req.user.id;
            const isPatient = req.user.role === 'patient' && appointment.patient.toString() === req.user.id;

            if (!isDoctor && !isPatient && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'You are not authorized to save chat logs for this appointment' });
            }

            // Save chat log
            appointment.chatLog = chatLog;
            await appointment.save();

            res.status(200).json({
                message: 'Chat log saved successfully'
            });
        } catch (error) {
            console.error('Error saving chat log:', error);
            res.status(500).json({ message: 'An error occurred while saving chat log' });
        }
    };

    /**
     * Handle consultation room exit
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
    */
    handleRoomExit = async (req, res) => {
        try {
            const { appointmentId, userId } = req.body;

            if (!appointmentId || !userId) {
                return res.status(400).json({ message: 'Appointment ID and User ID are required' });
            }

            // Find appointment
            const appointment = await Appointment.findById(appointmentId);

            if (!appointment) {
                return res.status(404).json({ message: 'Appointment not found' });
            }

            // Only process for scheduled appointments
            if (appointment.status !== 'scheduled') {
                return res.status(200).json({
                    message: 'Appointment is not in scheduled status',
                    status: appointment.status
                });
            }

            // Track participant exit in the appointment metadata
            if (!appointment.participantStatus) {
                appointment.participantStatus = {};
            }

            // Record exit time
            appointment.participantStatus[userId] = {
                exitTime: new Date(),
                status: 'left'
            };

            // Check if both participants have left
            const doctorId = appointment.doctor.toString();
            const patientId = appointment.patient.toString();

            const bothParticipantsLeft =
                appointment.participantStatus[doctorId]?.status === 'left' &&
                appointment.participantStatus[patientId]?.status === 'left';

            // If both have left and at least 10 minutes have passed since appointment start time
            const appointmentStartTime = new Date(appointment.dateTime);
            const now = new Date();
            const minutesSinceStart = (now - appointmentStartTime) / (1000 * 60);

            if (bothParticipantsLeft && minutesSinceStart >= 10) {
                // Auto-complete the appointment
                appointment.status = 'completed';

                // Add default consultation summary if none exists
                if (!appointment.consultationSummary) {
                    appointment.consultationSummary = 'This consultation was automatically marked as completed when both participants left the session.';
                }

                // Send notification
                await NotificationService.sendConsultationCompletedNotification(appointment);

                console.log(`Auto-completed consultation ${appointment._id} after both participants left the room`);
            }

            await appointment.save();

            res.status(200).json({
                message: 'Room exit recorded successfully',
                bothLeft: bothParticipantsLeft,
                appointmentStatus: appointment.status
            });
        } catch (error) {
            console.error('Error handling room exit:', error);
            res.status(500).json({ message: 'An error occurred while processing room exit' });
        }
    }

    /**
     * Update consultation summary and add new prescriptions
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
    */
    updateConsultationResults = async (req, res) => {
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
    }
}

module.exports = ConsultationController;