const { safeEncodeText, sanitizeInput } = require('../utils/textUtils');

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