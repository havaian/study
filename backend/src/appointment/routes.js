const express = require('express');
const router = express.Router();
const appointmentController = require('./controller');
const { authenticateUser, authorizeRoles, ensureOwnership } = require('../auth');
// Import multer configuration for file uploads
const upload = require('../utils/multerConfig');

/**
 * @route POST /api/appointments
 * @desc Create a new appointment
 * @access Private (Patients only - uses authenticated user ID)
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
 * @access Private (Patient must be the owner or Admin)
 */
router.get(
    '/student/:studentId',
    authenticateUser,
    authorizeRoles(['student', 'admin']),
    ensureOwnership('studentId'),
    appointmentController.getPatientAppointments
);

/**
 * @route GET /api/appointments/student/:studentId/pending-followups
 * @desc Get pending follow-up appointments for a student
 * @access Private (Patient must be the owner or Admin)
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
 * @access Private (Doctor must be the owner or Admin)
 */
router.get(
    '/teacher/:teacherId',
    authenticateUser,
    authorizeRoles(['teacher', 'admin']),
    ensureOwnership('teacherId'),
    appointmentController.getDoctorAppointments
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
 * @access Private (Doctor, Patient or Admin - only for their own appointments)
 */
router.patch(
    '/:id/status',
    authenticateUser,
    appointmentController.updateAppointmentStatus
);

/**
 * @route POST /api/appointments/:id/confirm
 * @desc Doctor confirms appointment
 * @access Private (Doctors only - only for their appointments)
 */
router.post(
    '/:id/confirm',
    authenticateUser,
    authorizeRoles(['teacher']),
    appointmentController.confirmAppointment
);

/**
 * @route PATCH /api/appointments/:id/prescriptions
 * @desc Add/update prescriptions for an appointment
 * @access Private (Doctors only - only for their appointments)
 */
router.patch(
    '/:id/prescriptions',
    authenticateUser,
    authorizeRoles(['teacher']),
    appointmentController.updatePrescriptions
);

/**
 * @route POST /api/appointments/:id/documents
 * @desc Upload medical documents for an appointment
 * @access Private (Patients and Doctors - only for their appointments)
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
 * @access Private (Doctors only - only for their appointments)
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
    appointmentController.getDoctorAvailability
);

/**
 * @route GET /api/appointments/pending-confirmation/teacher/:teacherId
 * @desc Get appointments pending teacher confirmation
 * @access Private (Doctor must be the owner or Admin)
 */
router.get(
    '/pending-confirmation/teacher/:teacherId',
    authenticateUser,
    authorizeRoles(['teacher', 'admin']),
    ensureOwnership('teacherId'),
    appointmentController.getPendingConfirmations
);

/**
 * @route PATCH /api/appointments/:id/consultation-results
 * @desc Update consultation results (summary, prescriptions, follow-up)
 * @access Private (Doctors only - only for their appointments)
 */
router.patch(
    '/:id/consultation-results',
    authenticateUser,
    authorizeRoles(['teacher']),
    appointmentController.updateConsultationResults
);

/**
 * @route POST /api/appointments/:id/documents
 * @desc Upload medical documents for an appointment
 * @access Private (Patients and Doctors - only for their appointments)
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