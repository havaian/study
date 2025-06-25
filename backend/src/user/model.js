const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Schema = mongoose.Schema;

// Time slot schema for doctor availability
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
        enum: ['patient', 'doctor', 'admin'],
        default: 'patient'
    },
    dateOfBirth: {
        type: Date,
        required: function () { return this.role === 'patient'; }
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other', 'prefer not to say'],
        required: function () { return this.role === 'patient'; }
    },
    profilePicture: {
        type: String,
        default: '/images/user-placeholder.jpg'
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
        country: String
    },
    // Doctor-specific fields
    specializations: [{
        type: String,
        required: function () { return this.role === 'doctor'; }
    }],
    licenseNumber: {
        type: String,
        required: function () { return this.role === 'doctor'; }
    },
    experience: {
        type: Number,
        default: 0,
        required: function () { return this.role === 'doctor'; }
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
        dayOfWeek: Number, // 0 = Monday, 6 = Sunday
        isAvailable: Boolean,
        // Legacy fields - kept for backward compatibility
        startTime: String, // Format: "HH:MM"
        endTime: String,   // Format: "HH:MM"
        // New field - multiple time slots per day
        timeSlots: [timeSlotSchema]
    }],
    consultationFee: {
        type: Number,
        required: function () { return this.role === 'doctor'; }
    },
    // Patient-specific fields
    medicalHistory: {
        allergies: [String],
        chronicConditions: [String],
        currentMedications: [String],
        surgeries: [{
            procedure: String,
            year: Number
        }]
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

// Add indexes for searching doctors - removed the duplicate email index
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

// Method to get doctor's basic public profile
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

// Static method to find available doctors by specializations
userSchema.statics.findAvailableDoctors = function (specializations) {
    return this.find({
        role: 'doctor',
        isActive: true,
        isVerified: true,
        specializations: specializations || { $exists: true }
    }).select('-password');
};

const User = mongoose.model('User', userSchema);

module.exports = User;