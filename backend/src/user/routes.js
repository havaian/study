const express = require('express');
const router = express.Router();
const userController = require('./controller');
const { authenticateUser, authorizeRoles, preventTeacherRegistration, ensureTermsAccepted } = require('../auth');

/**
 * @route POST /api/users/register
 * @desc Register a new user (student or teacher)
 * @access Public
 */
router.post('/register', preventTeacherRegistration, ensureTermsAccepted, userController.registerUser);

/**
 * @route GET /api/users/verify/:token
 * @desc Verify user email
 * @access Public
 */
router.get('/verify/:token', userController.verifyEmail);

/**
 * @route POST /api/users/login
 * @desc Login user
 * @access Public
 */
router.post('/login', userController.loginUser);

/**
 * @route GET /api/users/me
 * @desc Get current user profile
 * @access Private
 */
router.get('/me', authenticateUser, userController.getCurrentUser);

/**
 * @route PATCH /api/users/me
 * @desc Update user profile
 * @access Private
 */
router.patch('/me', authenticateUser, userController.updateUserProfile);

/**
 * @route POST /api/users/change-password
 * @desc Change user password
 * @access Private
 */
router.post('/change-password', authenticateUser, userController.changePassword);

/**
 * @route POST /api/users/forgot-password
 * @desc Request password reset
 * @access Public
 */
router.post('/forgot-password', userController.forgotPassword);

/**
 * @route POST /api/users/reset-password/:token
 * @desc Reset password with token
 * @access Public
 */
router.post('/reset-password/:token', userController.resetPassword);

/**
 * @route GET /api/users/teachers
 * @desc Get all teachers with optional filters
 * @access Public
 */
router.get('/teachers', userController.getTeachers);

/**
 * @route GET /api/users/teachers/:id
 * @desc Get teacher by ID
 * @access Public
 */
router.get('/teachers/:id', userController.getTeacherById);

/**
 * @route POST /api/users/link-telegram
 * @desc Link Telegram account
 * @access Private
 */
router.post('/link-telegram', userController.linkTelegramAccount);

/**
 * @route POST /api/users/deactivate
 * @desc Deactivate user account
 * @access Private
 */
router.post('/deactivate', authenticateUser, userController.deactivateAccount);

module.exports = router;