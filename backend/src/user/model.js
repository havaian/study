const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Schema = mongoose.Schema;

// Time slot schema for teacher availability
const timeSlotSchema = new Schema({
    startTime: {
        type: String, // Format: "HH:MM"
        required: true
    },
    endTime: {
        type: String, // Format: "HH:MM"
        required: true
    }
});

const userSchema = new Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
        select: false
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    role: {
        type: String,
        enum: ['student', 'teacher', 'admin'],
        default: 'student'
    },
    dateOfBirth: {
        type: Date,
        required: function () { return this.role === 'student'; }
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other', 'prefer not to say'],
        required: function () { return this.role === 'student'; }
    },
    profilePicture: {
        type: String,
        default: '/images/user-placeholder.jpg'
    },
    // NEW: Timezone field
    timezone: {
        type: String,
        default: 'Asia/Tashkent', // Default to Uzbekistan timezone
        enum: [
            'Asia/Tashkent',     // UTC+5 (Uzbekistan)
            'Asia/Almaty',       // UTC+6 (Kazakhstan)
            'Asia/Yekaterinburg', // UTC+5 (Russia)
            'Europe/Moscow',     // UTC+3 (Russia)
            'Asia/Dubai',        // UTC+4 (UAE)
            'Asia/Karachi',      // UTC+5 (Pakistan)
            'Asia/Kolkata',      // UTC+5:30 (India)
            'Asia/Dhaka',        // UTC+6 (Bangladesh)
            'UTC'                // UTC+0 (Universal)
        ]
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    // Teacher-specific fields
    specializations: [{
        type: String,
        required: function () { return this.role === 'teacher'; }
    }],
    licenseNumber: {
        type: String,
        required: function () { return this.role === 'teacher'; }
    },
    experience: {
        type: Number,
        default: 0,
        required: function () { return this.role === 'teacher'; }
    },
    education: [{
        degree: String,
        institution: String,
        year: Number
    }],
    certifications: [{
        name: String,
        issuer: String,
        year: Number,
        file: String // URL or path to the uploaded certificate file
    }],
    languages: [{
        type: String
    }],
    bio: {
        type: String,
        maxlength: [500, 'Bio cannot be more than 500 characters']
    },
    availability: [{
        dayOfWeek: Number, // 1 = Monday, 7 = Sunday (to match backend logic)
        isAvailable: Boolean,
        // Legacy fields - kept for backward compatibility
        startTime: String, // Format: "HH:MM" - stored in user's local timezone
        endTime: String,   // Format: "HH:MM" - stored in user's local timezone
        // New field - multiple time slots per day
        timeSlots: [timeSlotSchema] // Times stored in user's local timezone
    }],
    lessonFee: {
        type: Number,
        required: function () { return this.role === 'teacher'; }
    },
    // Student-specific fields
    educationalHistory: {
        type: String,
        required: false
    },
    emergencyContact: {
        name: String,
        relationship: String,
        phone: String
    },
    // Agreement to terms
    termsAccepted: {
        type: Boolean,
        default: false
    },
    privacyPolicyAccepted: {
        type: Boolean,
        default: false
    },
    termsAcceptedAt: {
        type: Date
    },
    // Common fields
    isVerified: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    telegramId: {
        type: String
    },
    telegramVerificationCode: String,
    telegramVerificationExpire: Date,
    // Token and security related fields
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    verificationToken: String,
    jwtSecret: {
        type: String,
        default: function () {
            return crypto.randomBytes(32).toString('hex');
        }
    },
    jwtSecretCreatedAt: {
        type: Date,
        default: Date.now
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date
    }
}, {
    timestamps: true
});

// Create a virtual field for full name
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Add indexes for searching teachers - removed the duplicate email index
userSchema.index({ specializations: 1 });
userSchema.index({ 'address.city': 1 });
userSchema.index({ firstName: 'text', lastName: 'text', specializations: 'text' });

// Encrypt password before saving
userSchema.pre('save', async function (next) {
    // Only hash the password if it's modified (or new)
    if (!this.isModified('password')) return next();

    try {
        // Generate salt
        const salt = await bcrypt.genSalt(10);

        // Hash password
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Pre-save middleware to handle accepting terms
userSchema.pre('save', function (next) {
    if (this.isModified('termsAccepted') && this.termsAccepted) {
        this.termsAcceptedAt = Date.now();
    }
    next();
});

userSchema.pre('save', function (next) {
    if (this.specializations) {
        this.specializations = [...new Set(this.specializations)];
    }
    next();
});

// Method to check if password matches
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate JWT token
userSchema.methods.generateAuthToken = function () {
    return jwt.sign(
        { id: this._id, role: this.role },
        this.jwtSecret || process.env.JWT_SECRET,
        { expiresIn: '24h' } // Set token expiration to 24 hours
    );
};

// NEW: Method to convert local time to UTC for storage
userSchema.methods.convertLocalTimeToUTC = function (localDateTime) {
    if (!localDateTime || !this.timezone) return localDateTime;
    
    // This would typically use a library like moment-timezone or date-fns-tz
    // For now, we'll use a simple offset calculation
    const timezoneOffsets = {
        'Asia/Tashkent': 5,     // UTC+5
        'Asia/Almaty': 6,       // UTC+6
        'Asia/Yekaterinburg': 5, // UTC+5
        'Europe/Moscow': 3,     // UTC+3
        'Asia/Dubai': 4,        // UTC+4
        'Asia/Karachi': 5,      // UTC+5
        'Asia/Kolkata': 5.5,    // UTC+5:30
        'Asia/Dhaka': 6,        // UTC+6
        'UTC': 0                // UTC+0
    };
    
    const offset = timezoneOffsets[this.timezone] || 5; // Default to UTC+5
    const localTime = new Date(localDateTime);
    const utcTime = new Date(localTime.getTime() - (offset * 60 * 60 * 1000));
    
    return utcTime;
};

// NEW: Method to convert UTC time to user's local time for display
userSchema.methods.convertUTCToLocalTime = function (utcDateTime) {
    if (!utcDateTime || !this.timezone) return utcDateTime;
    
    const timezoneOffsets = {
        'Asia/Tashkent': 5,     // UTC+5
        'Asia/Almaty': 6,       // UTC+6
        'Asia/Yekaterinburg': 5, // UTC+5
        'Europe/Moscow': 3,     // UTC+3
        'Asia/Dubai': 4,        // UTC+4
        'Asia/Karachi': 5,      // UTC+5
        'Asia/Kolkata': 5.5,    // UTC+5:30
        'Asia/Dhaka': 6,        // UTC+6
        'UTC': 0                // UTC+0
    };
    
    const offset = timezoneOffsets[this.timezone] || 5; // Default to UTC+5
    const utcTime = new Date(utcDateTime);
    const localTime = new Date(utcTime.getTime() + (offset * 60 * 60 * 1000));
    
    return localTime;
};

// Rotate JWT secret
userSchema.methods.rotateJwtSecret = function () {
    this.jwtSecret = crypto.randomBytes(32).toString('hex');
    this.jwtSecretCreatedAt = Date.now();
    return this.save();
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
    // Generate token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set token expire time (10 minutes)
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    return resetToken;
};

// Method to get teacher's basic public profile
userSchema.methods.getPublicProfile = function () {
    const user = this.toObject();

    // Remove sensitive information
    delete user.password;
    delete user.resetPasswordToken;
    delete user.resetPasswordExpire;
    delete user.verificationToken;
    delete user.jwtSecret;

    return user;
};

// Static method to find available teachers by specializations
userSchema.statics.findAvailableTeachers = function (specializations) {
    return this.find({
        role: 'teacher',
        isActive: true,
        isVerified: true,
        specializations: specializations || { $exists: true }
    }).select('-password');
};

const User = mongoose.model('User', userSchema);

module.exports = User;