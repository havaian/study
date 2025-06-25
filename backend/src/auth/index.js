const jwt = require('jsonwebtoken');
const User = require('../user/model');
const Appointment = require('../appointment/model');
const { safeEncodeText, sanitizeInput } = require('../utils/textUtils');

/**
 * Middleware to authenticate user based on JWT token
 */
exports.authenticateUser = async (req, res, next) => {
    try {
        let token;

        // Check if token exists in headers
        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            // Extract token from Bearer
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies && req.cookies.token) {
            // Or get it from cookies
            token = req.cookies.token;
        }

        // Check token exists
        if (!token) {
            return res.status(401).json({
                message: 'You are not logged in. Please log in to get access.'
            });
        }

        // First verify with default secret to get user ID
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (defaultError) {
            // If default fails, token may be using personal secret
            // Find the user by ID in token
            try {
                // Extract payload without verification first
                const unverifiedPayload = jwt.decode(token);
                if (!unverifiedPayload || !unverifiedPayload.id) {
                    throw new Error('Invalid token format');
                }

                // Get user's personal secret
                const user = await User.findById(unverifiedPayload.id, 'jwtSecret');
                if (!user || !user.jwtSecret) {
                    throw new Error('User not found or no JWT secret');
                }

                // Try to verify with user's personal secret
                decoded = jwt.verify(token, user.jwtSecret);
            } catch (personalError) {
                // Both verification methods failed
                return res.status(401).json({
                    message: 'Invalid token. Please log in again.'
                });
            }
        }

        // Find user by id
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                message: 'The user belonging to this token no longer exists.'
            });
        }

        // Verify that user has confirmed their email
        if (!user.isVerified) {
            return res.status(401).json({
                message: 'Please verify your email before accessing this resource.'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({
                message: 'This account has been deactivated. Please contact support.'
            });
        }

        // Check token expiration
        const tokenIssuedAt = new Date((decoded.iat || 0) * 1000);
        const tokenExpiresAt = new Date((decoded.exp || 0) * 1000);
        const now = new Date();

        // If token is expired
        if (now >= tokenExpiresAt) {
            return res.status(401).json({
                message: 'Your token has expired. Please log in again.'
            });
        }

        // If personal JWT secret was rotated after token was issued
        if (user.jwtSecretCreatedAt && tokenIssuedAt < user.jwtSecretCreatedAt) {
            return res.status(401).json({
                message: 'Your session has expired due to security changes. Please log in again.'
            });
        }

        // Add user to request object
        req.user = {
            id: user._id,
            role: user.role
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                message: 'Invalid token. Please log in again.'
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: 'Your token has expired. Please log in again.'
            });
        }

        console.error('Authentication error:', error);
        return res.status(500).json({
            message: 'An error occurred during authentication.'
        });
    }
};

/**
 * Middleware to authorize based on user roles
 * @param {Array} roles Array of allowed roles
 */
exports.authorizeRoles = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: 'You must be logged in to access this resource.'
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Role '${req.user.role}' is not authorized to access this resource.`
            });
        }

        next();
    };
};

/**
 * Middleware to ensure a user can only access their own resources
 * @param {String} paramIdField Request parameter field containing the resource owner ID
 */
exports.ensureOwnership = (paramIdField) => {
    return (req, res, next) => {
        const resourceOwnerId = req.params[paramIdField];

        // Admin can access any resource
        if (req.user.role === 'admin') {
            return next();
        }

        // For other roles, check if user is the owner
        if (req.user.id.toString() !== resourceOwnerId) {
            return res.status(403).json({
                message: 'You are not authorized to access this resource.'
            });
        }

        next();
    };
};

/**
 * Middleware to handle appointment access
 * Only the involved patient, doctor, or an admin can access appointment details
 */
exports.ensureAppointmentAccess = async (req, res, next) => {
    try {
        const appointmentId = req.params.id;

        // Admin can access any appointment
        if (req.user.role === 'admin') {
            return next();
        }

        const appointment = await Appointment.findById(appointmentId);

        if (!appointment) {
            return res.status(404).json({
                message: 'Appointment not found.'
            });
        }

        // Check if user is involved in the appointment
        const userId = req.user.id.toString();
        const isDoctor = req.user.role === 'doctor' && appointment.doctor.toString() === userId;
        const isPatient = req.user.role === 'patient' && appointment.patient.toString() === userId;

        if (!isDoctor && !isPatient) {
            return res.status(403).json({
                message: 'You are not authorized to access this appointment.'
            });
        }

        next();
    } catch (error) {
        console.error('Appointment access error:', error);
        return res.status(500).json({
            message: 'An error occurred while checking appointment access.'
        });
    }
};

/**
 * Middleware to verify Telegram bot webhook
 */
exports.verifyTelegramWebhook = (req, res, next) => {
    try {
        const { secret } = req.query;

        // Check if secret matches configured value
        if (!secret || secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
            return res.status(403).json({
                message: 'Unauthorized webhook request'
            });
        }

        next();
    } catch (error) {
        console.error('Telegram webhook verification error:', error);
        return res.status(500).json({
            message: 'An error occurred during webhook verification.'
        });
    }
};

/**
 * Middleware to verify content for inappropriate patterns
 * Checks for contact information sharing attempts
 */
exports.contentFilter = (req, res, next) => {
    try {
        const { text, message } = req.body;

        const contentToCheck = text || message || '';

        if (!contentToCheck) {
            return next();
        }

        // Patterns to detect: phone numbers, emails, telegram usernames, etc.
        const patterns = [
            /\+\d{10,15}/g, // Phone numbers with country code
            /\b\d{9,11}\b/g, // Phone numbers without formatting
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, // Emails
            /\@[A-Za-z0-9_]{5,}/g, // Telegram usernames
            /\bt\.me\/[A-Za-z0-9_]+\b/g, // Telegram links
            /telegram\.\w+/gi, // Telegram domain references
            /\bwhatsapp\b/gi, // WhatsApp references
            /\bviber\b/gi, // Viber references
            /\bsignal\b/gi, // Signal references
            /\binstagram\b/gi, // Instagram references
            /\bfacebook\b/gi, // Facebook references
            /\bmessenger\b/gi // Messenger references
        ];

        // Check if any pattern matches
        let violation = false;
        let matches = [];

        for (const pattern of patterns) {
            const match = contentToCheck.match(pattern);
            if (match) {
                violation = true;
                matches = [...matches, ...match];
            }
        }

        if (violation) {
            // Get user from request
            const userId = req.user?.id;

            if (!userId) {
                return res.status(400).json({
                    message: 'Content contains prohibited information. Please remove contact details or external communication platforms references.'
                });
            }

            // Log violation
            logContentViolation(userId, matches, contentToCheck);

            // Return error
            return res.status(400).json({
                message: 'For your safety and privacy, sharing contact information or references to external communication platforms is not allowed. Please communicate through the platform.'
            });
        }

        next();
    } catch (error) {
        console.error('Content filter error:', error);
        next(); // Allow the request to continue in case of filter error
    }
};

/**
 * Log content violation for user
 * @param {String} userId User ID
 * @param {Array} matches Array of matched patterns
 * @param {String} content Original content
 */
async function logContentViolation(userId, matches, content) {
    try {
        // Get user
        const user = await User.findById(userId);

        if (!user) {
            console.error('Content violation: User not found', userId);
            return;
        }

        // Initialize violations counter if not exists
        if (!user.contentViolations) {
            user.contentViolations = [];
        }

        // Add new violation
        user.contentViolations.push({
            timestamp: Date.now(),
            matches: matches,
            contentExcerpt: content.substring(0, 100) // Store only first 100 chars
        });

        // Apply penalties based on number of violations
        const violationCount = user.contentViolations.length;

        if (violationCount >= 10) {
            // Permanent ban
            user.isActive = false;
            user.banReason = 'Multiple content policy violations';
        } else if (violationCount >= 5) {
            // Temporary ban - 7 days
            user.isSuspended = true;
            user.suspensionEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            user.suspensionReason = 'Repeated content policy violations';
        } else if (violationCount >= 3) {
            // Warning
            user.hasWarning = true;
            user.warningMessage = 'You have violated our content policy multiple times. Further violations may result in suspension.';
        }

        await user.save();

    } catch (error) {
        console.error('Error logging content violation:', error);
    }
}

/**
 * Middleware to check if a user is a doctor and registered by admin
 * Only admin can register doctors - rejects direct doctor registrations
 */
exports.preventDoctorRegistration = (req, res, next) => {
    // If user is trying to register as a doctor
    if (req.body.role === 'doctor') {
        // Only allow if the request is from an admin
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                message: 'Doctor registration is only available through administrators. Please contact the clinic to register as a doctor.'
            });
        }
    }

    next();
};

/**
 * Middleware to check if a user is a doctor and registered by admin
 * Only admin can register doctors - rejects direct doctor registrations
 */
exports.preventDoctorRegistration = (req, res, next) => {
    // If user is trying to register as a doctor
    if (req.body.role === 'doctor') {
        // Only allow if the request is from an admin
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                message: 'Doctor registration is only available through administrators. Please contact the clinic to register as a doctor.'
            });
        }
    }

    next();
};

/**
 * Middleware to ensure terms are accepted during registration
 */
exports.ensureTermsAccepted = (req, res, next) => {
    // If it's a registration request
    if (req.path.includes('/register') && req.method === 'POST') {
        // Check if terms and privacy policy are accepted
        const { termsAccepted, privacyPolicyAccepted } = req.body;

        if (!termsAccepted || !privacyPolicyAccepted) {
            return res.status(400).json({
                message: 'You must accept the Terms of Service and Privacy Policy to register.'
            });
        }
    }

    next();
};

/**
 * Middleware to restrict chat during active video/audio consultations
 */
exports.restrictChatDuringCall = async (req, res, next) => {
    try {
        // Only apply to chat message creation
        if (req.path.includes('/messages') && req.method === 'POST') {
            const { conversationId } = req.body;

            if (!conversationId) {
                return next();
            }

            // Get the conversation to check if it's related to an appointment
            const Conversation = require('../chat/model').Conversation;
            const conversation = await Conversation.findById(conversationId);

            if (!conversation || !conversation.appointment) {
                return next();
            }

            // Get the appointment to check its type and status
            const Appointment = require('../appointment/model');
            const appointment = await Appointment.findById(conversation.appointment);

            if (!appointment) {
                return next();
            }

            // If appointment is active and is a video or audio consultation, restrict chat
            if (appointment.status === 'scheduled' &&
                (appointment.type === 'video' || appointment.type === 'audio')) {

                const now = new Date();
                const appointmentTime = new Date(appointment.dateTime);
                const appointmentEndTime = appointment.endTime ||
                    new Date(appointmentTime.getTime() + (appointment.duration || 30) * 60000);

                // Check if we're currently within the appointment time
                if (now >= appointmentTime && now <= appointmentEndTime) {
                    return res.status(403).json({
                        message: 'Chat is restricted during active video or audio consultations. Please use the consultation interface for communication.'
                    });
                }
            }
        }

        next();
    } catch (error) {
        console.error('Error in restrictChatDuringCall middleware:', error);
        next(); // Allow the request to continue in case of error
    }
};

/**
 * Middleware to properly handle text encoding/decoding
 * This prevents unicode conversion issues
 */
exports.handleTextEncoding = (req, res, next) => {
    // Check if request has a body
    if (req.body) {
        // Process text fields that commonly have encoding issues
        const fieldsToProcess = ['bio', 'reasonForVisit', 'consultationSummary', 'notes', 'text', 'comment'];

        for (const field of fieldsToProcess) {
            if (req.body[field] && typeof req.body[field] === 'string') {
                // Sanitize and encode text
                req.body[field] = safeEncodeText(sanitizeInput(req.body[field]));
            }
        }

        // Also check nested fields in objects
        for (const key in req.body) {
            if (req.body[key] && typeof req.body[key] === 'object' && !Array.isArray(req.body[key])) {
                for (const nestedField of fieldsToProcess) {
                    if (req.body[key][nestedField] && typeof req.body[key][nestedField] === 'string') {
                        req.body[key][nestedField] = safeEncodeText(sanitizeInput(req.body[key][nestedField]));
                    }
                }
            }
        }
    }

    next();
};

/**
 * Middleware to verify content for inappropriate patterns
 * Checks for contact information sharing attempts
 */
exports.contentFilter = (req, res, next) => {
    try {
        const { text, message } = req.body;

        const contentToCheck = text || message || '';

        if (!contentToCheck) {
            return next();
        }

        // Patterns to detect: phone numbers, emails, telegram usernames, etc.
        const patterns = [
            /\+\d{10,15}/g, // Phone numbers with country code
            /\b\d{9,11}\b/g, // Phone numbers without formatting
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, // Emails
            /\@[A-Za-z0-9_]{5,}/g, // Telegram usernames
            /\bt\.me\/[A-Za-z0-9_]+\b/g, // Telegram links
            /telegram\.\w+/gi, // Telegram domain references
            /\bwhatsapp\b/gi, // WhatsApp references
            /\bviber\b/gi, // Viber references
            /\bsignal\b/gi, // Signal references
            /\binstagram\b/gi, // Instagram references
            /\bfacebook\b/gi, // Facebook references
            /\bmessenger\b/gi // Messenger references
        ];

        // Check if any pattern matches
        let violation = false;
        let matches = [];

        for (const pattern of patterns) {
            const match = contentToCheck.match(pattern);
            if (match) {
                violation = true;
                matches = [...matches, ...match];
            }
        }

        if (violation) {
            // Get user from request
            const userId = req.user?.id;

            if (!userId) {
                return res.status(400).json({
                    message: 'Content contains prohibited information. Please remove contact details or external communication platforms references.'
                });
            }

            // Log violation
            logContentViolation(userId, matches, contentToCheck);

            // Return error
            return res.status(400).json({
                message: 'For your safety and privacy, sharing contact information or references to external communication platforms is not allowed. Please communicate through the platform.'
            });
        }

        next();
    } catch (error) {
        console.error('Content filter error:', error);
        next(); // Allow the request to continue in case of filter error
    }
};

/**
 * Log content violation for user
 * @param {String} userId User ID
 * @param {Array} matches Array of matched patterns
 * @param {String} content Original content
 */
async function logContentViolation(userId, matches, content) {
    try {
        // Get user
        const User = require('../user/model');
        const user = await User.findById(userId);

        if (!user) {
            console.error('Content violation: User not found', userId);
            return;
        }

        // Initialize violations counter if not exists
        if (!user.contentViolations) {
            user.contentViolations = [];
        }

        // Add new violation
        user.contentViolations.push({
            timestamp: Date.now(),
            matches: matches,
            contentExcerpt: content.substring(0, 100) // Store only first 100 chars
        });

        // Apply penalties based on number of violations
        const violationCount = user.contentViolations.length;

        if (violationCount >= 10) {
            // Permanent ban
            user.isActive = false;
            user.banReason = 'Multiple content policy violations';
        } else if (violationCount >= 5) {
            // Temporary ban - 7 days
            user.isSuspended = true;
            user.suspensionEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            user.suspensionReason = 'Repeated content policy violations';
        } else if (violationCount >= 3) {
            // Warning
            user.hasWarning = true;
            user.warningMessage = 'You have violated our content policy multiple times. Further violations may result in suspension.';
        }

        await user.save();

    } catch (error) {
        console.error('Error logging content violation:', error);
    }
}

module.exports = exports;