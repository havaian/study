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
    authorizeRoles(['patient', 'admin']),
    appointmentController.createAppointment
);

/**
 * @route GET /api/appointments/patient/:patientId
 * @desc Get all appointments for a patient
 * @access Private (Patient must be the owner or Admin)
 */
router.get(
    '/patient/:patientId',
    authenticateUser,
    authorizeRoles(['patient', 'admin']),
    ensureOwnership('patientId'),
    appointmentController.getPatientAppointments
);

/**
 * @route GET /api/appointments/patient/:patientId/pending-followups
 * @desc Get pending follow-up appointments for a patient
 * @access Private (Patient must be the owner or Admin)
 */
router.get(
    '/patient/:patientId/pending-followups',
    authenticateUser,
    authorizeRoles(['patient', 'admin']),
    ensureOwnership('patientId'),
    appointmentController.getPendingFollowUps
);

/**
 * @route GET /api/appointments/doctor/:doctorId
 * @desc Get all appointments for a doctor
 * @access Private (Doctor must be the owner or Admin)
 */
router.get(
    '/doctor/:doctorId',
    authenticateUser,
    authorizeRoles(['doctor', 'admin']),
    ensureOwnership('doctorId'),
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
    authorizeRoles(['doctor']),
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
    authorizeRoles(['doctor']),
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
    authorizeRoles(['doctor']),
    appointmentController.scheduleFollowUp
);

/**
 * @route GET /api/appointments/availability/:doctorId
 * @desc Get doctor's availability slots
 * @access Public (no authentication needed for viewing availability)
 */
router.get(
    '/availability/:doctorId',
    appointmentController.getDoctorAvailability
);

/**
 * @route GET /api/appointments/pending-confirmation/doctor/:doctorId
 * @desc Get appointments pending doctor confirmation
 * @access Private (Doctor must be the owner or Admin)
 */
router.get(
    '/pending-confirmation/doctor/:doctorId',
    authenticateUser,
    authorizeRoles(['doctor', 'admin']),
    ensureOwnership('doctorId'),
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
    authorizeRoles(['doctor']),
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