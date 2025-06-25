const Joi = require('joi');

/**
 * Validate user registration input
 * @param {Object} data User data for validation
 * @returns {Object} Validation result
 */
exports.validateUserInput = (data) => {
    // Define base schema for common fields
    const baseSchema = {
        firstName: Joi.string().trim().min(2).max(50).required()
            .messages({
                'string.empty': 'First name is required',
                'string.min': 'First name must be at least 2 characters long',
                'string.max': 'First name cannot exceed 50 characters'
            }),

        lastName: Joi.string().trim().min(2).max(50).required()
            .messages({
                'string.empty': 'Last name is required',
                'string.min': 'Last name must be at least 2 characters long',
                'string.max': 'Last name cannot exceed 50 characters'
            }),

        email: Joi.string().trim().email().required()
            .messages({
                'string.empty': 'Email is required',
                'string.email': 'Please provide a valid email address'
            }),

        password: Joi.string().min(8).max(100).required()
            .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
            .messages({
                'string.empty': 'Password is required',
                'string.min': 'Password must be at least 8 characters long',
                'string.max': 'Password cannot exceed 100 characters',
                'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
            }),

        phone: Joi.string().trim().required()
            .pattern(new RegExp('^[+]?[0-9]{10,15}$'))
            .messages({
                'string.empty': 'Phone number is required',
                'string.pattern.base': 'Please provide a valid phone number'
            }),

        role: Joi.string().valid('patient', 'doctor').default('patient'),

        // Common optional fields
        address: Joi.object({
            street: Joi.string().trim().max(100).optional(),
            city: Joi.string().trim().max(50).optional(),
            state: Joi.string().trim().max(50).optional(),
            zipCode: Joi.string().trim().max(20).optional(),
            country: Joi.string().trim().max(50).optional()
        }).optional()
    };

    // Define patient-specific schema
    const patientSchema = {
        // Patient-specific required fields
        dateOfBirth: Joi.date().max('now').required()
            .messages({
                'date.base': 'Please provide a valid date of birth',
                'date.max': 'Date of birth cannot be in the future',
                'any.required': 'Date of birth is required for patients'
            }),

        gender: Joi.string().valid('male', 'female', 'other', 'prefer not to say').required()
            .messages({
                'any.only': 'Gender must be one of: male, female, other, prefer not to say',
                'any.required': 'Gender is required for patients'
            }),

        // Patient-specific optional fields
        medicalHistory: Joi.object({
            allergies: Joi.array().items(Joi.string()),
            chronicConditions: Joi.array().items(Joi.string()),
            currentMedications: Joi.array().items(Joi.string()),
            surgeries: Joi.array().items(Joi.object({
                procedure: Joi.string().required(),
                year: Joi.number().integer().min(1900).max(new Date().getFullYear()).required()
            }))
        }).optional(),

        emergencyContact: Joi.object({
            name: Joi.string().trim().min(2).max(100),
            relationship: Joi.string().trim().min(2).max(50),
            phone: Joi.string().trim().pattern(new RegExp('^[+]?[0-9]{10,15}$'))
        }).optional(),
    };

    // Define doctor-specific schema
    const doctorSchema = {
        // Doctor-specific required fields
        specializations: Joi.string().trim().required()
            .messages({
                'string.empty': 'Specialization is required for doctors'
            }),

        specializations: Joi.array().items(Joi.string().trim()).min(1).required()
            .messages({
                'array.min': 'At least one specializations is required for doctors'
            }),

        licenseNumber: Joi.string().trim().required()
            .messages({
                'string.empty': 'License number is required for doctors'
            }),

        experience: Joi.number().integer().min(0).required()
            .messages({
                'number.base': 'Experience must be a number',
                'number.integer': 'Experience must be an integer',
                'number.min': 'Experience cannot be negative',
                'any.required': 'Experience is required for doctors'
            }),

        consultationFee: Joi.number().positive().required()
            .messages({
                'number.base': 'Consultation fee must be a number',
                'number.positive': 'Consultation fee must be positive',
                'any.required': 'Consultation fee is required for doctors'
            }),

        // Doctor-specific optional fields
        bio: Joi.string().trim().max(500).optional()
            .messages({
                'string.max': 'Bio cannot exceed 500 characters'
            }),

        languages: Joi.array().items(Joi.string().trim()).optional(),

        education: Joi.array().items(
            Joi.object({
                degree: Joi.string().trim().required(),
                institution: Joi.string().trim().required(),
                year: Joi.number().integer().min(1900).max(new Date().getFullYear()).required()
            })
        ).optional(),
        
        certifications: Joi.array().items(
            Joi.object({
                name: Joi.string().trim().required(),
                issuer: Joi.string().trim().required(),
                year: Joi.number().integer().min(1900).max(new Date().getFullYear()).required()
            })
        ).optional(),
        
        availability: Joi.array().items(
            Joi.object({
                dayOfWeek: Joi.number().integer().min(0).max(6).required(),
                isAvailable: Joi.boolean().required(),
                startTime: Joi.string().optional(),
                endTime: Joi.string().optional()
            })
        ).optional()
    };

    // Choose schema based on role
    let schemaToUse;
    if (data.role === 'doctor') {
        schemaToUse = { ...baseSchema, ...doctorSchema };
    } else {
        // Patient role
        schemaToUse = { ...baseSchema, ...patientSchema };
    }

    // Create and return schema
    const schema = Joi.object(schemaToUse);
    return schema.validate(data, { abortEarly: false });
};

/**
 * Validate appointment input
 * @param {Object} data Appointment data for validation
 * @returns {Object} Validation result
 */
exports.validateAppointmentInput = (data) => {
    const schema = Joi.object({
        // Remove patientId from validation schema completely
        doctorId: Joi.string().required()
            .messages({
                'string.empty': 'Doctor ID is required',
                'any.required': 'Doctor ID is required'
            }),

        dateTime: Joi.date().greater('now').required()
            .messages({
                'date.base': 'Please provide a valid date and time',
                'date.greater': 'Appointment date must be in the future',
                'any.required': 'Appointment date and time are required'
            }),

        type: Joi.string().valid('video', 'chat', 'voice').required()
            .messages({
                'any.only': 'Consultation type must be one of: video, chat, voice',
                'any.required': 'Consultation type is required'
            }),

        reasonForVisit: Joi.string().trim().min(5).max(500).required()
            .messages({
                'string.empty': 'Reason for visit is required',
                'string.min': 'Reason for visit must be at least 5 characters long',
                'string.max': 'Reason for visit cannot exceed 500 characters',
                'any.required': 'Reason for visit is required'
            }),

        notes: Joi.string().trim().max(1000).optional()
            .messages({
                'string.max': 'Notes cannot exceed 1000 characters'
            })
    });

    return schema.validate(data, { abortEarly: false });
};

/**
 * Validate prescription input
 * @param {Object} data Prescription data for validation
 * @returns {Object} Validation result
 */
exports.validatePrescriptionInput = (data) => {
    const prescriptionSchema = Joi.object({
        medication: Joi.string().trim().required()
            .messages({
                'string.empty': 'Medication name is required',
                'any.required': 'Medication name is required'
            }),

        dosage: Joi.string().trim().required()
            .messages({
                'string.empty': 'Dosage is required',
                'any.required': 'Dosage is required'
            }),

        frequency: Joi.string().trim().required()
            .messages({
                'string.empty': 'Frequency is required',
                'any.required': 'Frequency is required'
            }),

        duration: Joi.string().trim().required()
            .messages({
                'string.empty': 'Duration is required',
                'any.required': 'Duration is required'
            }),

        instructions: Joi.string().trim().max(500).optional()
            .messages({
                'string.max': 'Instructions cannot exceed 500 characters'
            })
    });

    const schema = Joi.object({
        prescriptions: Joi.array().items(prescriptionSchema).min(1).required()
            .messages({
                'array.min': 'At least one prescription is required',
                'any.required': 'Prescriptions are required'
            })
    });

    return schema.validate(data, { abortEarly: false });
};

/**
 * Validate doctor availability input
 * @param {Object} data Availability data for validation
 * @returns {Object} Validation result
 */
exports.validateAvailabilityInput = (data) => {
    const availabilityItemSchema = Joi.object({
        dayOfWeek: Joi.number().integer().min(0).max(6).required()
            .messages({
                'number.base': 'Day of week must be a number',
                'number.integer': 'Day of week must be an integer',
                'number.min': 'Day of week must be between 0 (Sunday) and 6 (Saturday)',
                'number.max': 'Day of week must be between 0 (Sunday) and 6 (Saturday)',
                'any.required': 'Day of week is required'
            }),

        isAvailable: Joi.boolean().required()
            .messages({
                'boolean.base': 'Availability status must be a boolean',
                'any.required': 'Availability status is required'
            }),

        startTime: Joi.when('isAvailable', {
            is: true,
            then: Joi.string().pattern(new RegExp('^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')).required()
                .messages({
                    'string.pattern.base': 'Start time must be in format HH:MM (24-hour)',
                    'any.required': 'Start time is required when available is true'
                }),
            otherwise: Joi.string().optional()
        }),

        endTime: Joi.when('isAvailable', {
            is: true,
            then: Joi.string().pattern(new RegExp('^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$')).required()
                .messages({
                    'string.pattern.base': 'End time must be in format HH:MM (24-hour)',
                    'any.required': 'End time is required when available is true'
                }),
            otherwise: Joi.string().optional()
        })
    }).custom((value, helpers) => {
        if (value.isAvailable) {
            // Check if end time is after start time
            const [startHour, startMinute] = value.startTime.split(':').map(Number);
            const [endHour, endMinute] = value.endTime.split(':').map(Number);

            const startMinutes = startHour * 60 + startMinute;
            const endMinutes = endHour * 60 + endMinute;

            if (endMinutes <= startMinutes) {
                return helpers.error('custom.timeRange', { message: 'End time must be after start time' });
            }
        }

        return value;
    });

    const schema = Joi.object({
        availability: Joi.array().items(availabilityItemSchema).min(7).max(7).required()
            .messages({
                'array.min': 'Availability must be specified for all 7 days of the week',
                'array.max': 'Availability must be specified for all 7 days of the week',
                'any.required': 'Availability is required'
            })
    }).custom((value, helpers) => {
        // Check if all days of the week are covered
        const daysOfWeek = value.availability.map(item => item.dayOfWeek);

        // Check for duplicates
        const uniqueDays = [...new Set(daysOfWeek)];
        if (uniqueDays.length !== 7) {
            return helpers.error('custom.daysOfWeek', {
                message: 'Availability must include each day of the week (0-6) exactly once'
            });
        }

        // Check if all days (0-6) are included
        for (let i = 0; i <= 6; i++) {
            if (!daysOfWeek.includes(i)) {
                return helpers.error('custom.missingDay', {
                    message: `Availability for day ${i} is missing`
                });
            }
        }

        return value;
    });

    return schema.validate(data, { abortEarly: false });
};

/**
 * Validate consultation summary input
 * @param {Object} data Summary data for validation
 * @returns {Object} Validation result
 */
exports.validateConsultationSummaryInput = (data) => {
    const schema = Joi.object({
        consultationSummary: Joi.string().trim().min(10).max(2000).required()
            .messages({
                'string.empty': 'Consultation summary is required',
                'string.min': 'Consultation summary must be at least 10 characters long',
                'string.max': 'Consultation summary cannot exceed 2000 characters',
                'any.required': 'Consultation summary is required'
            })
    });

    return schema.validate(data, { abortEarly: false });
};

/**
 * Validate follow-up input
 * @param {Object} data Follow-up data for validation
 * @returns {Object} Validation result
 */
exports.validateFollowUpInput = (data) => {
    const schema = Joi.object({
        followUpDate: Joi.date().greater('now').required()
            .messages({
                'date.base': 'Please provide a valid follow-up date',
                'date.greater': 'Follow-up date must be in the future',
                'any.required': 'Follow-up date is required'
            })
    });

    return schema.validate(data, { abortEarly: false });
};