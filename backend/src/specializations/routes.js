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
 * @route GET /api/specializations/:id/doctors
 * @desc Get doctors by specializations
 * @access Public
 */
router.get('/:id/doctors', specializationController.getDoctorsBySpecialization);

module.exports = router;