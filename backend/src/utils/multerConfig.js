const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads/documents');

        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate a unique filename to prevent collisions
        const uniqueFilename = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueFilename);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    // Allowed file types
    const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, images, Word documents, Excel spreadsheets, and text files are allowed.'), false);
    }
};

// Size limits
const limits = {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
};

// Initialize multer upload
const upload = multer({
    storage,
    fileFilter,
    limits
});

module.exports = upload;