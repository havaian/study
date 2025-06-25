const express = require('express');
const router = express.Router();
const adminController = require('./controller');
const { authenticateUser, authorizeRoles } = require('../auth');

// Apply authentication and admin role authorization to all routes
router.use(authenticateUser, authorizeRoles(['admin']));

/**
 * @route GET /api/admin/users
 * @desc Get all users with pagination and filtering
 * @access Private (Admin only)
 */
router.get('/users', adminController.getAllUsers);

/**
 * @route GET /api/admin/users/:id
 * @desc Get user by ID (admin view with more details)
 * @access Private (Admin only)
 */
router.get('/users/:id', adminController.getUserById);

/**
 * @route PATCH /api/admin/users/:id
 * @desc Update user details (admin can update any user)
 * @access Private (Admin only)
 */
router.patch('/users/:id', adminController.updateUser);

/**
 * @route PATCH /api/admin/users/:id/status
 * @desc Activate/deactivate user account
 * @access Private (Admin only)
 */
router.patch('/users/:id/status', adminController.updateUserStatus);

/**
 * @route PATCH /api/admin/users/:id/verify
 * @desc Manually verify a user (useful for doctors verification)
 * @access Private (Admin only)
 */
router.patch('/users/:id/verify', adminController.verifyUser);

/**
 * @route GET /api/admin/appointments
 * @desc Get all appointments with pagination and filtering
 * @access Private (Admin only)
 */
router.get('/appointments', adminController.getAllAppointments);

/**
 * @route GET /api/admin/appointments/:id
 * @desc Get appointment by ID (admin view with more details)
 * @access Private (Admin only)
 */
router.get('/appointments/:id', adminController.getAppointmentById);

/**
 * @route PATCH /api/admin/appointments/:id
 * @desc Update appointment details
 * @access Private (Admin only)
 */
router.patch('/appointments/:id', adminController.updateAppointment);

/**
 * @route GET /api/admin/payments
 * @desc Get all payments with pagination and filtering
 * @access Private (Admin only)
 */
router.get('/payments', adminController.getAllPayments);

/**
 * @route GET /api/admin/dashboard
 * @desc Get dashboard statistics
 * @access Private (Admin only)
 */
router.get('/dashboard', adminController.getDashboardStats);

/**
 * @route GET /api/admin/system-health
 * @desc Get system health status (MongoDB, Redis, etc.)
 * @access Private (Admin only)
 */
router.get('/system-health', adminController.getSystemHealth);

/**
 * @route POST /api/admin/specializations
 * @desc Create a new medical specializations
 * @access Private (Admin only)
 */
router.post('/specializations', adminController.createSpecialization);

/**
 * @route GET /api/admin/specializations
 * @desc Get all specializations
 * @access Private (Admin only)
 */
router.get('/specializations', adminController.getAllSpecializations);

/**
 * @route PATCH /api/admin/specializations/:id
 * @desc Update a specializations
 * @access Private (Admin only)
 */
router.patch('/specializations/:id', adminController.updateSpecialization);

/**
 * @route DELETE /api/admin/specializations/:id
 * @desc Delete a specializations
 * @access Private (Admin only)
 */
router.delete('/specializations/:id', adminController.deleteSpecialization);

module.exports = router;