const express = require('express');
const router = express.Router();
const LessonController = require('./controller');
const { authenticateUser, ensureAppointmentAccess } = require('../auth');

// Initialize controller
const lessonController = new LessonController();

/**
 * @route GET /api/lessons/:appointmentId/join
 * @desc Join a lesson session
 * @access Private (Student or Teacher involved in appointment)
 */
router.get(
    '/:appointmentId/join',
    authenticateUser,
    (req, res, next) => {
        // Log the appointment ID to help debug
        console.log(`Lesson join attempt for appointment: ${req.params.appointmentId}`);
        next();
    },
    lessonController.joinLesson
);

/**
 * @route POST /api/lessons/:appointmentId/end
 * @desc End a lesson
 * @access Private (Teachers only)
 */
router.post(
    '/:appointmentId/end',
    authenticateUser,
    lessonController.endLesson
);

/**
 * @route POST /api/lessons/:appointmentId/homeworks
 * @desc Add homeworks to a completed appointment
 * @access Private (Teachers only)
 */
router.post(
    '/:appointmentId/homeworks',
    authenticateUser,
    lessonController.addHomeworks
);

/**
 * @route POST /api/lessons/:appointmentId/follow-up
 * @desc Create a follow-up appointment
 * @access Private (Teachers only)
 */
router.post(
    '/:appointmentId/follow-up',
    authenticateUser,
    lessonController.createFollowUp
);

/**
 * @route GET /api/lessons/:appointmentId/status
 * @desc Get lesson status
 * @access Private (Student or Teacher involved in appointment)
 */
router.get(
    '/:appointmentId/status',
    authenticateUser,
    lessonController.getLessonStatus
);

/**
 * @route POST /api/lessons/:appointmentId/chat-log
 * @desc Save chat log from lesson
 * @access Private (Student or Teacher involved in appointment)
 */
router.post(
    '/:appointmentId/chat-log',
    authenticateUser,
    lessonController.saveChatLog
);

/**
 * @route POST /api/lessons/:appointmentId/exit
 * @desc Handle exit from lesson room
 * @access Private (Student or Teacher involved in appointment)
 */
router.post(
    '/:appointmentId/exit',
    authenticateUser,
    lessonController.handleRoomExit
);

module.exports = router;