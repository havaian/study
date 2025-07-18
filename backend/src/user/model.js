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
    // Enhanced timezone field with all major timezones
    timezone: {
        type: String,
        default: 'Asia/Tashkent', // Default to Uzbekistan timezone
        enum: [
            // UTC-12 to UTC-11
            'Pacific/Kwajalein',     // UTC-12 (Marshall Islands)
            'Pacific/Midway',        // UTC-11 (Midway)
            'Pacific/Niue',          // UTC-11 (Niue)

            // UTC-10 to UTC-9
            'Pacific/Honolulu',      // UTC-10 (Hawaii)
            'Pacific/Marquesas',     // UTC-9:30 (Marquesas)
            'America/Anchorage',     // UTC-9 (Alaska)

            // UTC-8 to UTC-7
            'America/Los_Angeles',   // UTC-8 (Pacific Time)
            'America/Vancouver',     // UTC-8 (Pacific Time Canada)
            'America/Denver',        // UTC-7 (Mountain Time)
            'America/Phoenix',       // UTC-7 (Arizona)

            // UTC-6 to UTC-5
            'America/Chicago',       // UTC-6 (Central Time)
            'America/Mexico_City',   // UTC-6 (Central Mexico)
            'America/New_York',      // UTC-5 (Eastern Time)
            'America/Toronto',       // UTC-5 (Eastern Time Canada)
            'America/Lima',          // UTC-5 (Peru)

            // UTC-4 to UTC-3
            'America/Halifax',       // UTC-4 (Atlantic Time)
            'America/Caracas',       // UTC-4 (Venezuela)
            'America/Sao_Paulo',     // UTC-3 (Brazil)
            'America/Argentina/Buenos_Aires', // UTC-3 (Argentina)

            // UTC-2 to UTC-1
            'America/Noronha',       // UTC-2 (Fernando de Noronha)
            'Atlantic/Cape_Verde',   // UTC-1 (Cape Verde)

            // UTC+0
            'UTC',                   // UTC+0 (Universal Time)
            'Europe/London',         // UTC+0 (Greenwich Mean Time)
            'Africa/Casablanca',     // UTC+0 (Morocco)

            // UTC+1 to UTC+2
            'Europe/Paris',          // UTC+1 (Central European Time)
            'Europe/Berlin',         // UTC+1 (Central European Time)
            'Europe/Rome',           // UTC+1 (Central European Time)
            'Europe/Madrid',         // UTC+1 (Central European Time)
            'Africa/Lagos',          // UTC+1 (West Africa Time)
            'Europe/Athens',         // UTC+2 (Eastern European Time)
            'Europe/Helsinki',       // UTC+2 (Eastern European Time)
            'Africa/Cairo',          // UTC+2 (Egypt)
            'Africa/Johannesburg',   // UTC+2 (South Africa)

            // UTC+3 to UTC+4
            'Europe/Moscow',         // UTC+3 (Moscow Time)
            'Asia/Istanbul',         // UTC+3 (Turkey)
            'Asia/Baghdad',          // UTC+3 (Iraq)
            'Asia/Riyadh',           // UTC+3 (Saudi Arabia)
            'Asia/Dubai',            // UTC+4 (UAE)
            'Asia/Muscat',           // UTC+4 (Oman)
            'Asia/Baku',             // UTC+4 (Azerbaijan)

            // UTC+4:30 to UTC+5:30
            'Asia/Kabul',            // UTC+4:30 (Afghanistan)
            'Asia/Karachi',          // UTC+5 (Pakistan)
            'Asia/Tashkent',         // UTC+5 (Uzbekistan)
            'Asia/Yekaterinburg',    // UTC+5 (Russia - Yekaterinburg)
            'Asia/Kolkata',          // UTC+5:30 (India)
            'Asia/Colombo',          // UTC+5:30 (Sri Lanka)

            // UTC+5:45 to UTC+6:30
            'Asia/Kathmandu',        // UTC+5:45 (Nepal)
            'Asia/Dhaka',            // UTC+6 (Bangladesh)
            'Asia/Almaty',           // UTC+6 (Kazakhstan)
            'Asia/Omsk',             // UTC+6 (Russia - Omsk)
            'Asia/Yangon',           // UTC+6:30 (Myanmar)

            // UTC+7 to UTC+8
            'Asia/Bangkok',          // UTC+7 (Thailand)
            'Asia/Ho_Chi_Minh',      // UTC+7 (Vietnam)
            'Asia/Jakarta',          // UTC+7 (Indonesia - Western)
            'Asia/Krasnoyarsk',      // UTC+7 (Russia - Krasnoyarsk)
            'Asia/Shanghai',         // UTC+8 (China)
            'Asia/Hong_Kong',        // UTC+8 (Hong Kong)
            'Asia/Singapore',        // UTC+8 (Singapore)
            'Asia/Taipei',           // UTC+8 (Taiwan)
            'Asia/Manila',           // UTC+8 (Philippines)
            'Asia/Kuala_Lumpur',     // UTC+8 (Malaysia)
            'Australia/Perth',       // UTC+8 (Western Australia)

            // UTC+8:45 to UTC+9:30
            'Australia/Eucla',       // UTC+8:45 (Central Western Australia)
            'Asia/Tokyo',            // UTC+9 (Japan)
            'Asia/Seoul',            // UTC+9 (South Korea)
            'Asia/Pyongyang',        // UTC+9 (North Korea)
            'Asia/Irkutsk',          // UTC+8 (Russia - Irkutsk) 
            'Australia/Adelaide',    // UTC+9:30 (Central Australia)
            'Australia/Darwin',      // UTC+9:30 (Northern Territory)

            // UTC+10 to UTC+11
            'Australia/Sydney',      // UTC+10 (Eastern Australia)
            'Australia/Melbourne',   // UTC+10 (Eastern Australia)
            'Australia/Brisbane',    // UTC+10 (Eastern Australia)
            'Pacific/Guam',          // UTC+10 (Guam)
            'Asia/Vladivostok',      // UTC+10 (Russia - Vladivostok)
            'Australia/Lord_Howe',   // UTC+10:30 (Lord Howe Island)
            'Pacific/Noumea',        // UTC+11 (New Caledonia)
            'Pacific/Norfolk',       // UTC+11 (Norfolk Island)
            'Asia/Magadan',          // UTC+11 (Russia - Magadan)

            // UTC+12 to UTC+14
            'Pacific/Auckland',      // UTC+12 (New Zealand)
            'Pacific/Fiji',          // UTC+12 (Fiji)
            'Asia/Kamchatka',        // UTC+12 (Russia - Kamchatka)
            'Pacific/Chatham',       // UTC+12:45 (Chatham Islands)
            'Pacific/Tongatapu',     // UTC+13 (Tonga)
            'Pacific/Apia',          // UTC+13 (Samoa)
            'Pacific/Kiritimati'     // UTC+14 (Line Islands)
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

// Enhanced timezone offset mapping with proper daylight saving time consideration
const getTimezoneOffsets = () => {
    return {
        // UTC-12 to UTC-11
        'Pacific/Kwajalein': -12,
        'Pacific/Midway': -11,
        'Pacific/Niue': -11,

        // UTC-10 to UTC-9
        'Pacific/Honolulu': -10,
        'Pacific/Marquesas': -9.5,
        'America/Anchorage': -9,

        // UTC-8 to UTC-7
        'America/Los_Angeles': -8,
        'America/Vancouver': -8,
        'America/Denver': -7,
        'America/Phoenix': -7,

        // UTC-6 to UTC-5
        'America/Chicago': -6,
        'America/Mexico_City': -6,
        'America/New_York': -5,
        'America/Toronto': -5,
        'America/Lima': -5,

        // UTC-4 to UTC-3
        'America/Halifax': -4,
        'America/Caracas': -4,
        'America/Sao_Paulo': -3,
        'America/Argentina/Buenos_Aires': -3,

        // UTC-2 to UTC-1
        'America/Noronha': -2,
        'Atlantic/Cape_Verde': -1,

        // UTC+0
        'UTC': 0,
        'Europe/London': 0,
        'Africa/Casablanca': 0,

        // UTC+1 to UTC+2
        'Europe/Paris': 1,
        'Europe/Berlin': 1,
        'Europe/Rome': 1,
        'Europe/Madrid': 1,
        'Africa/Lagos': 1,
        'Europe/Athens': 2,
        'Europe/Helsinki': 2,
        'Africa/Cairo': 2,
        'Africa/Johannesburg': 2,

        // UTC+3 to UTC+4
        'Europe/Moscow': 3,
        'Asia/Istanbul': 3,
        'Asia/Baghdad': 3,
        'Asia/Riyadh': 3,
        'Asia/Dubai': 4,
        'Asia/Muscat': 4,
        'Asia/Baku': 4,

        // UTC+4:30 to UTC+5:30
        'Asia/Kabul': 4.5,
        'Asia/Karachi': 5,
        'Asia/Tashkent': 5,
        'Asia/Yekaterinburg': 5,
        'Asia/Kolkata': 5.5,
        'Asia/Colombo': 5.5,

        // UTC+5:45 to UTC+6:30
        'Asia/Kathmandu': 5.75,
        'Asia/Dhaka': 6,
        'Asia/Almaty': 6,
        'Asia/Omsk': 6,
        'Asia/Yangon': 6.5,

        // UTC+7 to UTC+8
        'Asia/Bangkok': 7,
        'Asia/Ho_Chi_Minh': 7,
        'Asia/Jakarta': 7,
        'Asia/Krasnoyarsk': 7,
        'Asia/Shanghai': 8,
        'Asia/Hong_Kong': 8,
        'Asia/Singapore': 8,
        'Asia/Taipei': 8,
        'Asia/Manila': 8,
        'Asia/Kuala_Lumpur': 8,
        'Australia/Perth': 8,

        // UTC+8:45 to UTC+9:30
        'Australia/Eucla': 8.75,
        'Asia/Tokyo': 9,
        'Asia/Seoul': 9,
        'Asia/Pyongyang': 9,
        'Asia/Irkutsk': 8,
        'Australia/Adelaide': 9.5,
        'Australia/Darwin': 9.5,

        // UTC+10 to UTC+11
        'Australia/Sydney': 10,
        'Australia/Melbourne': 10,
        'Australia/Brisbane': 10,
        'Pacific/Guam': 10,
        'Asia/Vladivostok': 10,
        'Australia/Lord_Howe': 10.5,
        'Pacific/Noumea': 11,
        'Pacific/Norfolk': 11,
        'Asia/Magadan': 11,

        // UTC+12 to UTC+14
        'Pacific/Auckland': 12,
        'Pacific/Fiji': 12,
        'Asia/Kamchatka': 12,
        'Pacific/Chatham': 12.75,
        'Pacific/Tongatapu': 13,
        'Pacific/Apia': 13,
        'Pacific/Kiritimati': 14
    };
};

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

// Enhanced method to convert local time to UTC for storage
userSchema.methods.convertLocalTimeToUTC = function (localDateTime) {
    if (!localDateTime || !this.timezone) return localDateTime;

    const timezoneOffsets = getTimezoneOffsets();
    const offset = timezoneOffsets[this.timezone] || 5; // Default to UTC+5
    const localTime = new Date(localDateTime);
    const utcTime = new Date(localTime.getTime() - (offset * 60 * 60 * 1000));

    return utcTime;
};

// Enhanced method to convert UTC time to user's local time for display
userSchema.methods.convertUTCToLocalTime = function (utcDateTime) {
    if (!utcDateTime || !this.timezone) return utcDateTime;

    const timezoneOffsets = getTimezoneOffsets();
    const offset = timezoneOffsets[this.timezone] || 5; // Default to UTC+5
    const utcTime = new Date(utcDateTime);
    const localTime = new Date(utcTime.getTime() + (offset * 60 * 60 * 1000));

    return localTime;
};

// Method to get timezone offset in hours
userSchema.methods.getTimezoneOffset = function () {
    const timezoneOffsets = getTimezoneOffsets();
    return timezoneOffsets[this.timezone] || 5; // Default to UTC+5
};

// Method to get timezone display name
userSchema.methods.getTimezoneDisplayName = function () {
    const timezoneNames = {
        // UTC-12 to UTC-11
        'Pacific/Kwajalein': 'Kwajalein (UTC-12)',
        'Pacific/Midway': 'Midway (UTC-11)',
        'Pacific/Niue': 'Niue (UTC-11)',

        // UTC-10 to UTC-9
        'Pacific/Honolulu': 'Hawaii (UTC-10)',
        'Pacific/Marquesas': 'Marquesas (UTC-9:30)',
        'America/Anchorage': 'Alaska (UTC-9)',

        // UTC-8 to UTC-7
        'America/Los_Angeles': 'Pacific Time (UTC-8)',
        'America/Vancouver': 'Pacific Time Canada (UTC-8)',
        'America/Denver': 'Mountain Time (UTC-7)',
        'America/Phoenix': 'Arizona (UTC-7)',

        // UTC-6 to UTC-5
        'America/Chicago': 'Central Time (UTC-6)',
        'America/Mexico_City': 'Central Mexico (UTC-6)',
        'America/New_York': 'Eastern Time (UTC-5)',
        'America/Toronto': 'Eastern Time Canada (UTC-5)',
        'America/Lima': 'Peru (UTC-5)',

        // UTC-4 to UTC-3
        'America/Halifax': 'Atlantic Time (UTC-4)',
        'America/Caracas': 'Venezuela (UTC-4)',
        'America/Sao_Paulo': 'Brazil (UTC-3)',
        'America/Argentina/Buenos_Aires': 'Argentina (UTC-3)',

        // UTC-2 to UTC-1
        'America/Noronha': 'Fernando de Noronha (UTC-2)',
        'Atlantic/Cape_Verde': 'Cape Verde (UTC-1)',

        // UTC+0
        'UTC': 'Universal Time (UTC+0)',
        'Europe/London': 'London (UTC+0)',
        'Africa/Casablanca': 'Morocco (UTC+0)',

        // UTC+1 to UTC+2
        'Europe/Paris': 'Central European Time (UTC+1)',
        'Europe/Berlin': 'Berlin (UTC+1)',
        'Europe/Rome': 'Rome (UTC+1)',
        'Europe/Madrid': 'Madrid (UTC+1)',
        'Africa/Lagos': 'West Africa (UTC+1)',
        'Europe/Athens': 'Athens (UTC+2)',
        'Europe/Helsinki': 'Helsinki (UTC+2)',
        'Africa/Cairo': 'Egypt (UTC+2)',
        'Africa/Johannesburg': 'South Africa (UTC+2)',

        // UTC+3 to UTC+4
        'Europe/Moscow': 'Moscow (UTC+3)',
        'Asia/Istanbul': 'Turkey (UTC+3)',
        'Asia/Baghdad': 'Iraq (UTC+3)',
        'Asia/Riyadh': 'Saudi Arabia (UTC+3)',
        'Asia/Dubai': 'UAE (UTC+4)',
        'Asia/Muscat': 'Oman (UTC+4)',
        'Asia/Baku': 'Azerbaijan (UTC+4)',

        // UTC+4:30 to UTC+5:30
        'Asia/Kabul': 'Afghanistan (UTC+4:30)',
        'Asia/Karachi': 'Pakistan (UTC+5)',
        'Asia/Tashkent': 'Uzbekistan (UTC+5)',
        'Asia/Yekaterinburg': 'Yekaterinburg (UTC+5)',
        'Asia/Kolkata': 'India (UTC+5:30)',
        'Asia/Colombo': 'Sri Lanka (UTC+5:30)',

        // UTC+5:45 to UTC+6:30
        'Asia/Kathmandu': 'Nepal (UTC+5:45)',
        'Asia/Dhaka': 'Bangladesh (UTC+6)',
        'Asia/Almaty': 'Kazakhstan (UTC+6)',
        'Asia/Omsk': 'Omsk (UTC+6)',
        'Asia/Yangon': 'Myanmar (UTC+6:30)',

        // UTC+7 to UTC+8
        'Asia/Bangkok': 'Thailand (UTC+7)',
        'Asia/Ho_Chi_Minh': 'Vietnam (UTC+7)',
        'Asia/Jakarta': 'Indonesia (UTC+7)',
        'Asia/Krasnoyarsk': 'Krasnoyarsk (UTC+7)',
        'Asia/Shanghai': 'China (UTC+8)',
        'Asia/Hong_Kong': 'Hong Kong (UTC+8)',
        'Asia/Singapore': 'Singapore (UTC+8)',
        'Asia/Taipei': 'Taiwan (UTC+8)',
        'Asia/Manila': 'Philippines (UTC+8)',
        'Asia/Kuala_Lumpur': 'Malaysia (UTC+8)',
        'Australia/Perth': 'Perth (UTC+8)',

        // UTC+8:45 to UTC+9:30
        'Australia/Eucla': 'Central Western Australia (UTC+8:45)',
        'Asia/Tokyo': 'Japan (UTC+9)',
        'Asia/Seoul': 'South Korea (UTC+9)',
        'Asia/Pyongyang': 'North Korea (UTC+9)',
        'Asia/Irkutsk': 'Irkutsk (UTC+8)',
        'Australia/Adelaide': 'Adelaide (UTC+9:30)',
        'Australia/Darwin': 'Darwin (UTC+9:30)',

        // UTC+10 to UTC+11
        'Australia/Sydney': 'Sydney (UTC+10)',
        'Australia/Melbourne': 'Melbourne (UTC+10)',
        'Australia/Brisbane': 'Brisbane (UTC+10)',
        'Pacific/Guam': 'Guam (UTC+10)',
        'Asia/Vladivostok': 'Vladivostok (UTC+10)',
        'Australia/Lord_Howe': 'Lord Howe Island (UTC+10:30)',
        'Pacific/Noumea': 'New Caledonia (UTC+11)',
        'Pacific/Norfolk': 'Norfolk Island (UTC+11)',
        'Asia/Magadan': 'Magadan (UTC+11)',

        // UTC+12 to UTC+14
        'Pacific/Auckland': 'New Zealand (UTC+12)',
        'Pacific/Fiji': 'Fiji (UTC+12)',
        'Asia/Kamchatka': 'Kamchatka (UTC+12)',
        'Pacific/Chatham': 'Chatham Islands (UTC+12:45)',
        'Pacific/Tongatapu': 'Tonga (UTC+13)',
        'Pacific/Apia': 'Samoa (UTC+13)',
        'Pacific/Kiritimati': 'Line Islands (UTC+14)'
    };

    return timezoneNames[this.timezone] || `${this.timezone} (Unknown)`;
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

// Static method to get all supported timezones
userSchema.statics.getSupportedTimezones = function () {
    return this.schema.paths.timezone.enumValues;
};

const User = mongoose.model('User', userSchema);

module.exports = User;