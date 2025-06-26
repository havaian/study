const Appointment = require('../appointment/model');
const User = require('../user/model');
const JitsiUtils = require('../utils/jitsiUtils');
const { NotificationService } = require('../notification');

/**
 * Controller for handling lesson-related operations
 */
class LessonController {
    /**
     * Initialize lesson controller
     */
    constructor() {
        // No need for webRTCService with Jitsi integration
    }

    /**
     * Join a lesson session
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    joinLesson = async (req, res) => {
        try {
            const { appointmentId } = req.params;
            const userId = req.user.id;

            if (!appointmentId) {
                return res.status(400).json({ message: 'Appointment ID is required' });
            }

            // Find appointment
            const appointment = await Appointment.findById(appointmentId)
                .populate('teacher', 'firstName lastName profilePicture specializations email')
                .populate('student', 'firstName lastName profilePicture dateOfBirth email');

            if (!appointment) {
                return res.status(404).json({ message: 'Appointment not found' });
            }

            // Check if user is involved in the appointment
            const isTeacher = req.user.role === 'teacher' && appointment.teacher._id.toString() === userId.toString();
            const isStudent = req.user.role === 'student' && appointment.student._id.toString() === userId.toString();

            if (!isTeacher && !isStudent) {
                return res.status(403).json({ message: 'You are not authorized to join this lesson' });
            }

            // Check if appointment is scheduled or in progress
            if (appointment.status !== 'scheduled') {
                return res.status(400).json({
                    message: `Cannot join lesson with status "${appointment.status}"`,
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
                    message: 'Lesson is not ready yet',
                    startsInMinutes: Math.floor(timeDiffMinutes)
                });
            }

            // Cannot join 30 minutes after scheduled time
            if (timeDiffMinutes < -30) {
                return res.status(400).json({ message: 'Lesson time has expired' });
            }

            // Check if lesson has already ended (endTime has passed)
            if (appointment.endTime && now > appointment.endTime) {
                return res.status(400).json({ message: 'Lesson has already ended' });
            }

            // User info for Jitsi token
            const userInfo = {
                id: userId,
                name: isTeacher ?
                    `Dr. ${appointment.teacher.firstName} ${appointment.teacher.lastName}` :
                    `${appointment.student.firstName} ${appointment.student.lastName}`,
                avatar: isTeacher ? appointment.teacher.profilePicture : appointment.student.profilePicture,
                email: isTeacher ? appointment.teacher.email : appointment.student.email,
                role: isTeacher ? 'teacher' : 'student'
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
                    appointment.teacher._id.toString(),
                    appointment.student._id.toString()
                ]
            });

            // Prepare response with lesson info
            res.status(200).json({
                message: 'Joined lesson successfully',
                lesson: {
                    appointmentId: appointment._id,
                    type: appointment.type,
                    teacher: {
                        id: appointment.teacher._id,
                        name: `Dr. ${appointment.teacher.firstName} ${appointment.teacher.lastName}`,
                        profilePicture: appointment.teacher.profilePicture,
                        specializations: appointment.teacher.specializations
                    },
                    student: {
                        id: appointment.student._id,
                        name: `${appointment.student.firstName} ${appointment.student.lastName}`,
                        profilePicture: appointment.student.profilePicture,
                        dateOfBirth: appointment.student.dateOfBirth
                    },
                    dateTime: appointment.dateTime,
                    endTime: appointment.endTime,
                    reasonForVisit: appointment.reasonForVisit,
                    userRole: isTeacher ? 'teacher' : 'student',
                    jitsi: jitsiConfig
                }
            });
        } catch (error) {
            console.error('Error joining lesson:', error);
            res.status(500).json({ message: 'An error occurred while joining the lesson' });
        }
    };

    /**
     * End a lesson (teacher only)
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    endLesson = async (req, res) => {
        try {
            const { appointmentId } = req.params;
            const { lessonSummary, chatLog } = req.body;

            if (!appointmentId) {
                return res.status(400).json({ message: 'Appointment ID is required' });
            }

            // Find appointment
            const appointment = await Appointment.findById(appointmentId);

            if (!appointment) {
                return res.status(404).json({ message: 'Appointment not found' });
            }

            // Only teacher or admin can end lesson
            if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Only teachers can end lessons' });
            }

            // Teacher must be assigned to the appointment
            if (req.user.role === 'teacher' && appointment.teacher.toString() !== req.user.id) {
                return res.status(403).json({ message: 'You are not the teacher for this appointment' });
            }

            // Update appointment status
            appointment.status = 'completed';

            // Add lesson summary if provided
            if (lessonSummary) {
                appointment.lessonSummary = lessonSummary;
            }

            // Save chat log if provided
            if (chatLog && Array.isArray(chatLog) && chatLog.length > 0) {
                appointment.chatLog = chatLog;
            }

            await appointment.save();

            // Send completion notification
            await NotificationService.sendAppointmentCompletionNotification(appointment);

            res.status(200).json({
                message: 'Lesson ended successfully',
                appointment
            });
        } catch (error) {
            console.error('Error ending lesson:', error);
            res.status(500).json({ message: 'An error occurred while ending the lesson' });
        }
    };

    /**
     * Add homeworks to a completed appointment
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    addHomeworks = async (req, res) => {
        try {
            const { appointmentId } = req.params;
            const { homeworks } = req.body;

            if (!appointmentId) {
                return res.status(400).json({ message: 'Appointment ID is required' });
            }

            if (!homeworks || !Array.isArray(homeworks) || homeworks.length === 0) {
                return res.status(400).json({ message: 'Valid homeworks array is required' });
            }

            // Find appointment
            const appointment = await Appointment.findById(appointmentId);

            if (!appointment) {
                return res.status(404).json({ message: 'Appointment not found' });
            }

            // Only teacher or admin can add homeworks
            if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Only teachers can add homeworks' });
            }

            // Teacher must be assigned to the appointment
            if (req.user.role === 'teacher' && appointment.teacher.toString() !== req.user.id) {
                return res.status(403).json({ message: 'You are not the teacher for this appointment' });
            }

            // Validate homework data
            const validHomeworks = homeworks.filter(homework => {
                return homework.medication && homework.dosage && homework.frequency && homework.duration;
            });

            if (validHomeworks.length === 0) {
                return res.status(400).json({ message: 'No valid homeworks provided' });
            }

            // Add homeworks to appointment
            appointment.homeworks = validHomeworks;
            await appointment.save();

            // Send homework notification
            await NotificationService.sendHomeworkNotification(appointment);

            res.status(200).json({
                message: 'Homeworks added successfully',
                homeworks: appointment.homeworks
            });
        } catch (error) {
            console.error('Error adding homeworks:', error);
            res.status(500).json({ message: 'An error occurred while adding homeworks' });
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
                .populate('teacher', 'firstName lastName lessonFee')
                .populate('student', 'firstName lastName');

            if (!originalAppointment) {
                return res.status(404).json({ message: 'Original appointment not found' });
            }

            // Only teacher or admin can create follow-up
            if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Only teachers can create follow-up appointments' });
            }

            // Teacher must be assigned to the appointment
            if (req.user.role === 'teacher' && originalAppointment.teacher._id.toString() !== req.user.id.toString()) {
                return res.status(403).json({ message: 'You are not the teacher for this appointment' });
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
                student: originalAppointment.student._id,
                teacher: originalAppointment.teacher._id,
                dateTime: followUpDateObj,
                type: originalAppointment.type,
                reasonForVisit: `Follow-up to appointment on ${new Date(originalAppointment.dateTime).toLocaleDateString()} - ${notes || 'No notes provided'}`,
                status: 'pending-payment', // Special status for follow-ups pending payment
                payment: {
                    amount: originalAppointment.teacher.lessonFee,
                    status: 'pending'
                }
            });

            await followUpAppointment.save();

            // Notify student about follow-up
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
     * Get lesson status
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     */
    getLessonStatus = async (req, res) => {
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
            console.error('Error getting lesson status:', error);
            res.status(500).json({ message: 'An error occurred while checking lesson status' });
        }
    };

    /**
     * Save chat log from lesson
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
            const isTeacher = req.user.role === 'teacher' && appointment.teacher.toString() === req.user.id;
            const isStudent = req.user.role === 'student' && appointment.student.toString() === req.user.id;

            if (!isTeacher && !isStudent && req.user.role !== 'admin') {
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
     * Handle lesson room exit
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
            const teacherId = appointment.teacher.toString();
            const studentId = appointment.student.toString();

            const bothParticipantsLeft =
                appointment.participantStatus[teacherId]?.status === 'left' &&
                appointment.participantStatus[studentId]?.status === 'left';

            // If both have left and at least 10 minutes have passed since appointment start time
            const appointmentStartTime = new Date(appointment.dateTime);
            const now = new Date();
            const minutesSinceStart = (now - appointmentStartTime) / (1000 * 60);

            if (bothParticipantsLeft && minutesSinceStart >= 10) {
                // Auto-complete the appointment
                appointment.status = 'completed';

                // Add default lesson summary if none exists
                if (!appointment.lessonSummary) {
                    appointment.lessonSummary = 'This lesson was automatically marked as completed when both participants left the session.';
                }

                // Send notification
                await NotificationService.sendLessonCompletedNotification(appointment);

                console.log(`Auto-completed lesson ${appointment._id} after both participants left the room`);
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
     * Update lesson summary and add new homeworks
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
    */
    updateLessonResults = async (req, res) => {
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
                        reasonForVisit: `Follow-up to appointment on ${appointment.dateTime.toLocaleDateString()} - ${followUp.notes || 'No notes provided'}`,
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
    }
}

module.exports = LessonController;