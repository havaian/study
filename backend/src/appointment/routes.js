const express = require('express');
const router = express.Router();
const appointmentController = require('./controller');
const { authenticateUser, authorizeRoles, ensureOwnership } = require('../auth');
// Import multer configuration for file uploads
const upload = require('../utils/multerConfig');

/**
 * @route POST /api/appointments
 * @desc Create a new appointment
 * @access Private (Students only - uses authenticated user ID)
 */
router.post(
    '/',
    authenticateUser,
    authorizeRoles(['student', 'admin']),
    appointmentController.createAppointment
);

/**
 * @route GET /api/appointments/student/:studentId
 * @desc Get all appointments for a student
 * @access Private (Student must be the owner or Admin)
 */
router.get(
    '/student/:studentId',
    authenticateUser,
    authorizeRoles(['student', 'admin']),
    ensureOwnership('studentId'),
    appointmentController.getStudentAppointments
);

/**
 * @route GET /api/appointments/student/:studentId/pending-followups
 * @desc Get pending follow-up appointments for a student
 * @access Private (Student must be the owner or Admin)
 */
router.get(
    '/student/:studentId/pending-followups',
    authenticateUser,
    authorizeRoles(['student', 'admin']),
    ensureOwnership('studentId'),
    appointmentController.getPendingFollowUps
);

/**
 * @route GET /api/appointments/teacher/:teacherId
 * @desc Get all appointments for a teacher
 * @access Private (Teacher must be the owner or Admin)
 */
router.get(
    '/teacher/:teacherId',
    authenticateUser,
    authorizeRoles(['teacher', 'admin']),
    ensureOwnership('teacherId'),
    appointmentController.getTeacherAppointments
);

/**
 * @route GET /api/appointments/calendar
 * @desc Get appointments in calendar format
 * @access Private
 */
router.get(
    '/calendar',
    authenticateUser,
    appointmentController.getCalendarAppointments
);

/**
 * @route GET /api/appointments/:id
 * @desc Get a specific appointment by ID
 * @access Private (Only involved parties or Admin)
 */
router.get(
    '/:id',
    authenticateUser,
    appointmentController.getAppointmentById
);

/**
 * @route PATCH /api/appointments/:id/status
 * @desc Update appointment status
 * @access Private (Teacher, Student or Admin - only for their own appointments)
 */
router.patch(
    '/:id/status',
    authenticateUser,
    appointmentController.updateAppointmentStatus
);

/**
 * @route POST /api/appointments/:id/confirm
 * @desc Teacher confirms appointment
 * @access Private (Teachers only - only for their appointments)
 */
router.post(
    '/:id/confirm',
    authenticateUser,
    authorizeRoles(['teacher']),
    appointmentController.confirmAppointment
);

/**
 * @route PATCH /api/appointments/:id/homeworks
 * @desc Add/update homeworks for an appointment
 * @access Private (Teachers only - only for their appointments)
 */
router.patch(
    '/:id/homeworks',
    authenticateUser,
    authorizeRoles(['teacher']),
    appointmentController.updateHomeworks
);

/**
 * @route POST /api/appointments/:id/documents
 * @desc Upload educational documents for an appointment
 * @access Private (Students and Teachers - only for their appointments)
 */
router.post(
    '/:id/documents',
    authenticateUser,
    appointmentController.uploadDocument
);

/**
 * @route GET /api/appointments/:id/documents
 * @desc Get documents for an appointment
 * @access Private (Only involved parties or Admin)
 */
router.get(
    '/:id/documents',
    authenticateUser,
    appointmentController.getDocuments
);

/**
 * @route POST /api/appointments/:id/follow-up
 * @desc Schedule a follow-up appointment
 * @access Private (Teachers only - only for their appointments)
 */
router.post(
    '/:id/follow-up',
    authenticateUser,
    authorizeRoles(['teacher']),
    appointmentController.scheduleFollowUp
);

/**
 * @route GET /api/appointments/availability/:teacherId
 * @desc Get teacher's availability slots
 * @access Public (no authentication needed for viewing availability)
 */
router.get(
    '/availability/:teacherId',
    appointmentController.getTeacherAvailability
);

/**
 * @route GET /api/appointments/pending-confirmation/teacher/:teacherId
 * @desc Get appointments pending teacher confirmation
 * @access Private (Teacher must be the owner or Admin)
 */
router.get(
    '/pending-confirmation/teacher/:teacherId',
    authenticateUser,
    authorizeRoles(['teacher', 'admin']),
    ensureOwnership('teacherId'),
    appointmentController.getPendingConfirmations
);

/**
 * @route PATCH /api/appointments/:id/lesson-results
 * @desc Update lesson results (summary, homeworks, follow-up)
 * @access Private (Teachers only - only for their appointments)
 */
router.patch(
    '/:id/lesson-results',
    authenticateUser,
    authorizeRoles(['teacher']),
    appointmentController.updateLessonResults
);

/**
 * @route POST /api/appointments/:id/documents
 * @desc Upload educational documents for an appointment
 * @access Private (Students and Teachers - only for their appointments)
 */
router.post(
    '/:id/documents',
    authenticateUser,
    upload.single('document'), // Use multer middleware for file upload
    appointmentController.uploadDocument
);

/**
 * @route GET /api/appointments/:id/documents
 * @desc Get documents for an appointment
 * @access Private (Only involved parties or Admin)
 */
router.get(
    '/:id/documents',
    authenticateUser,
    appointmentController.getDocuments
);

/**
 * @route GET /api/appointments/calendar
 * @desc Get appointments in calendar format
 * @access Private
 */
router.get(
    '/calendar',
    authenticateUser,
    appointmentController.getCalendarAppointments
);

module.exports = router;