const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const scheduleAppointmentReminders = require('./src/cron/appointmentReminders');
const socketIo = require('socket.io');
const initializeSocketIO = require('./src/chat/socket');
const { handleTextEncoding } = require('./src/auth/index'); // Import text encoding middleware from existing auth module

// Load environment variables
require('dotenv').config();

// Connect to MongoDB
require('./db');

// Import routes
const userRoutes = require('./src/user/routes');
const appointmentRoutes = require('./src/appointment/routes');
const telegramRoutes = require('./src/bot/routes');
// const assistantRoutes = require('./src/assistant/routes');
const paymentRoutes = require('./src/payment/routes');
const consultationRoutes = require('./src/consultation/routes');
const adminRoutes = require('./src/admin/routes');
const specializationRoutes = require('./src/specializations/routes');
const chatRoutes = require('./src/chat/routes'); // Added chat routes

// Initialize express app
const app = express();

// Middleware
// Enable CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : true,
    credentials: true
}));

// Set security HTTP headers
app.use(helmet());

// Development logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Stripe webhook needs raw body for signature verification
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const paymentController = require('./payment/controller');
    paymentController.handleStripeWebhook(req, res);
});

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser
app.use(cookieParser());

// Apply text encoding middleware
app.use(handleTextEncoding);

// Custom sanitize middleware (instead of express-mongo-sanitize)
app.use((req, res, next) => {
    if (!req.body) return next();

    // Function to sanitize object
    const sanitize = (obj) => {
        const result = {};

        Object.keys(obj).forEach(key => {
            // Check for MongoDB operators starting with $
            if (key[0] === '$') {
                console.warn(`Potentially harmful key detected and sanitized: ${key}`);
                result[`_${key.slice(1)}`] = obj[key];
            }
            // Handle nested objects and arrays
            else if (typeof obj[key] === 'object' && obj[key] !== null) {
                if (Array.isArray(obj[key])) {
                    result[key] = obj[key].map(item =>
                        typeof item === 'object' && item !== null ? sanitize(item) : item
                    );
                } else {
                    result[key] = sanitize(obj[key]);
                }
            }
            // Regular properties
            else {
                result[key] = obj[key];
            }
        });

        return result;
    };

    // Apply sanitization to body, query, and params
    if (req.body && typeof req.body === 'object') {
        req.body = sanitize(req.body);
    }

    if (req.query && typeof req.query === 'object') {
        const sanitizedQuery = sanitize(req.query);
        // Safely copy sanitized properties
        Object.keys(req.query).forEach(key => {
            delete req.query[key];
        });
        Object.keys(sanitizedQuery).forEach(key => {
            req.query[key] = sanitizedQuery[key];
        });
    }

    if (req.params && typeof req.params === 'object') {
        const sanitizedParams = sanitize(req.params);
        // Safely copy sanitized properties
        Object.keys(req.params).forEach(key => {
            delete req.params[key];
        });
        Object.keys(sanitizedParams).forEach(key => {
            req.params[key] = sanitizedParams[key];
        });
    }

    next();
});

// Custom XSS protection middleware (instead of xss-clean)
app.use((req, res, next) => {
    if (!req.body) return next();

    // Function to sanitize strings (basic HTML escape)
    const sanitizeXSS = (str, fieldName) => {
        if (typeof str !== 'string') return str;

        // Only sanitize fields that could contain HTML/script tags
        // For text fields like bio, we should preserve apostrophes and quotes
        const fieldsToFullySanitize = ['html', 'script', 'code', 'content'];
        const fieldsToPreserveQuotes = ['bio', 'reasonForVisit', 'consultationSummary', 'notes', 'text', 'comment'];

        // Check if this field should preserve quotes and apostrophes
        const shouldPreserveQuotes = fieldsToPreserveQuotes.some(field =>
            fieldName.toLowerCase().includes(field.toLowerCase())
        );

        // Apply full sanitization or limited sanitization
        if (shouldPreserveQuotes) {
            // Only sanitize < and > to prevent script tags, but preserve quotes and apostrophes
            return str
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        } else {
            // Apply full sanitization
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
                .replace(/\//g, '&#x2F;');
        }
    };

    // Function to sanitize object
    const sanitizeObj = (obj, parentKey = '') => {
        const result = {};

        Object.keys(obj).forEach(key => {
            const currentKey = parentKey ? `${parentKey}.${key}` : key;

            // Handle nested objects and arrays
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                if (Array.isArray(obj[key])) {
                    result[key] = obj[key].map((item, index) =>
                        typeof item === 'object' && item !== null ?
                            sanitizeObj(item, `${currentKey}[${index}]`) :
                            typeof item === 'string' ? sanitizeXSS(item, currentKey) : item
                    );
                } else {
                    result[key] = sanitizeObj(obj[key], currentKey);
                }
            }
            // Sanitize strings
            else if (typeof obj[key] === 'string') {
                result[key] = sanitizeXSS(obj[key], currentKey);
            }
            // Keep other types as is
            else {
                result[key] = obj[key];
            }
        });

        return result;
    };

    // Apply sanitization to body
    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObj(req.body);
    }

    next();
});

// Response middleware to decode HTML entities in specific fields
app.use((req, res, next) => {
    // Save the original res.json function
    const originalJson = res.json;

    // Override the res.json function
    res.json = function (data) {
        // If data is an object and not null, process it
        if (data && typeof data === 'object') {
            data = decodeHtmlEntitiesInObject(data);
        }

        // Call the original json function with processed data
        return originalJson.call(this, data);
    };

    // Function to decode HTML entities in strings
    function decodeHtmlEntities(str) {
        if (typeof str !== 'string') return str;

        return str
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&#x2F;/g, '/')
            .replace(/&amp;/g, '&');
    }

    // Function to process objects and decode HTML entities
    function decodeHtmlEntitiesInObject(obj) {
        if (!obj) return obj;

        // Handle different types
        if (typeof obj === 'string') {
            return decodeHtmlEntities(obj);
        }

        if (Array.isArray(obj)) {
            return obj.map(item => decodeHtmlEntitiesInObject(item));
        }

        if (typeof obj === 'object') {
            const result = {};

            // These fields should have HTML entities decoded
            const fieldsToProcess = [
                'bio', 'reasonForVisit', 'consultationSummary',
                'notes', 'text', 'comment', 'message'
            ];

            // Process each property
            for (const key in obj) {
                if (Object.hasOwnProperty.call(obj, key)) {
                    // If this is a field we should decode, or it's an object that might contain such fields
                    if (fieldsToProcess.includes(key) && typeof obj[key] === 'string') {
                        result[key] = decodeHtmlEntities(obj[key]);
                    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                        result[key] = decodeHtmlEntitiesInObject(obj[key]);
                    } else {
                        result[key] = obj[key];
                    }
                }
            }

            return result;
        }

        return obj;
    }

    next();
});

// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
});
app.use('/api', limiter);

// Create HTTP server
const server = require('http').createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["Authorization"]
    },
    path: '/socket.io/',
    transports: ['websocket', 'polling']
});

// Initialize socket.io handlers
initializeSocketIO(io);

// Routes
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/telegram', telegramRoutes);
// app.use('/api/assistant', assistantRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/specializations', specializationRoutes);
app.use('/api/chat', chatRoutes); // Added chat routes

// Initialize cron jobs
scheduleAppointmentReminders();

// Health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Server is running',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);

    const statusCode = err.statusCode || 500;
    const status = err.status || 'error';

    res.status(statusCode).json({
        status,
        message: err.message || 'Internal server error'
    });
});

const initializeCronJobs = require('./src/cron/index');

// Initialize cron jobs
initializeCronJobs();

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`✅ PORT ${PORT}`);
    console.log(`✅ ${(process.env.NODE_ENV).toUpperCase()} mode`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', err => {
    console.error('UNHANDLED REJECTION:', err);
    // Log to external service like Sentry here

    // Close server & exit process
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', err => {
    console.error('UNCAUGHT EXCEPTION:', err);
    // Log to external service like Sentry here

    // Close server & exit process
    process.exit(1);
});

module.exports = { app, server, io };