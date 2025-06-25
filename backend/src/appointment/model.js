const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Define the chat message schema
const chatMessageSchema = new Schema({
    sender: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const appointmentSchema = new Schema({
    patient: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    doctor: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    dateTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: function () {
            return this.dateTime !== undefined;
        },
        default: function () {
            return this.dateTime ? new Date(this.dateTime.getTime() + 30 * 60000) : undefined;
        }
    },
    duration: {
        type: Number,
        default: 30, // Duration in minutes, must be a multiple of 15
        min: 15,
        max: 120,
        validate: {
            validator: function (value) {
                return value % 15 === 0;
            },
            message: 'Duration must be a multiple of 15 minutes'
        }
    },
    status: {
        type: String,
        enum: ['pending-payment', 'pending-doctor-confirmation', 'scheduled', 'completed', 'canceled', 'no-show'],
        default: 'pending-doctor-confirmation'
    },
    type: {
        type: String,
        enum: ['video', 'audio', 'chat'],
        required: true
    },
    reasonForVisit: {
        type: String,
        required: true
    },
    notes: {
        type: String
    },
    consultationSummary: {
        type: String
    },
    // Added chatLog field to store messages
    chatLog: [chatMessageSchema],
    prescriptions: [{
        medication: String,
        dosage: String,
        frequency: String,
        duration: String,
        instructions: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    followUp: {
        recommended: Boolean,
        date: Date,
        notes: String
    },
    payment: {
        amount: Number,
        status: {
            type: String,
            enum: ['pending', 'completed', 'refunded'],
            default: 'pending'
        },
        transactionId: String
    },
    documents: [{
        name: String,
        fileUrl: String,
        fileType: String,
        uploadedBy: {
            type: String,
            enum: ['patient', 'doctor']
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    cancellationReason: {
        type: String
    },
    doctorConfirmationExpires: {
        type: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for efficient queries
appointmentSchema.index({ patient: 1, dateTime: -1 });
appointmentSchema.index({ doctor: 1, dateTime: -1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ doctorConfirmationExpires: 1 }, { expireAfterSeconds: 0 }); // For TTL index

// Middleware to update the updatedAt field
appointmentSchema.pre('save', function (next) {
    this.updatedAt = Date.now();

    // Set endTime based on dateTime and duration if not explicitly set
    if (this.dateTime && this.duration && !this.isModified('endTime')) {
        this.endTime = new Date(this.dateTime.getTime() + this.duration * 60000);
    }

    next();
});

// Instance methods
appointmentSchema.methods.cancel = function (reason) {
    this.status = 'canceled';
    if (reason) {
        this.cancellationReason = reason;
    }
    return this.save();
};

appointmentSchema.methods.complete = function (summary) {
    this.status = 'completed';
    if (summary) {
        this.consultationSummary = summary;
    }
    return this.save();
};

appointmentSchema.methods.confirmDoctor = function () {
    if (this.status === 'pending-doctor-confirmation') {
        this.status = 'scheduled';
    }
    return this.save();
};

// Static methods
appointmentSchema.statics.findUpcomingForPatient = function (patientId) {
    return this.find({
        patient: patientId,
        dateTime: { $gte: new Date() },
        status: 'scheduled'
    }).sort({ dateTime: 1 }).populate('doctor');
};

appointmentSchema.statics.findUpcomingForDoctor = function (doctorId) {
    return this.find({
        doctor: doctorId,
        dateTime: { $gte: new Date() },
        status: 'scheduled'
    }).sort({ dateTime: 1 }).populate('patient');
};

// Add method to find pending-payment follow-ups for a patient
appointmentSchema.statics.findPendingFollowUpsForPatient = function (patientId) {
    return this.find({
        patient: patientId,
        status: 'pending-payment'
    }).sort({ dateTime: 1 }).populate('doctor');
};

// Find appointments pending doctor confirmation
appointmentSchema.statics.findPendingDoctorConfirmation = function (doctorId) {
    return this.find({
        doctor: doctorId,
        status: 'pending-doctor-confirmation',
        doctorConfirmationExpires: { $gt: new Date() }
    }).sort({ doctorConfirmationExpires: 1 }).populate('patient');
};

// Find expired doctor confirmation appointments
appointmentSchema.statics.findExpiredDoctorConfirmation = function () {
    return this.find({
        status: 'pending-doctor-confirmation',
        doctorConfirmationExpires: { $lte: new Date() }
    }).populate('patient').populate('doctor');
};

// Find appointments for calendar view
appointmentSchema.statics.findForCalendar = function (userId, userRole, startDate, endDate) {
    const query = {};

    if (userRole === 'patient') {
        query.patient = userId;
    } else if (userRole === 'doctor') {
        query.doctor = userId;
    }

    if (startDate && endDate) {
        query.dateTime = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    return this.find(query)
        .sort({ dateTime: 1 })
        .populate(userRole === 'patient' ? 'doctor' : 'patient');
};

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;