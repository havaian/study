const express = require('express');
const router = express.Router();
const specializationController = require('./controller');

/**
 * @route GET /api/specializations
 * @desc Get all active specializations
 * @access Public
 */
router.get('/', specializationController.getActiveSpecializations);

/**
 * @route GET /api/specializations/:id
 * @desc Get specializations by ID
 * @access Public
 */
router.get('/:id', specializationController.getSpecializationById);

/**
 * @route GET /api/specializations/:id/teachers
 * @desc Get teachers by specializations
 * @access Public
 */
router.get('/:id/teachers', specializationController.getTeachersBySpecialization);

module.exports = router;