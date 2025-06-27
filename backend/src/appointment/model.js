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
    student: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    teacher: {
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
        enum: ['pending-payment', 'pending-teacher-confirmation', 'scheduled', 'completed', 'canceled', 'no-show'],
        default: 'pending-teacher-confirmation'
    },
    type: {
        type: String,
        enum: ['video', 'audio', 'chat'],
        required: true
    },
    shortDescription: {
        type: String,
        required: true
    },
    notes: {
        type: String
    },
    lessonSummary: {
        type: String
    },
    // Added chatLog field to store messages
    chatLog: [chatMessageSchema],
    homeworks: [{
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
            enum: ['student', 'teacher']
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    cancellationReason: {
        type: String
    },
    teacherConfirmationExpires: {
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
appointmentSchema.index({ student: 1, dateTime: -1 });
appointmentSchema.index({ teacher: 1, dateTime: -1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ teacherConfirmationExpires: 1 }, { expireAfterSeconds: 0 }); // For TTL index

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
        this.lessonSummary = summary;
    }
    return this.save();
};

appointmentSchema.methods.confirmTeacher = function () {
    if (this.status === 'pending-teacher-confirmation') {
        this.status = 'scheduled';
    }
    return this.save();
};

// Static methods
appointmentSchema.statics.findUpcomingForStudent = function (studentId) {
    return this.find({
        student: studentId,
        dateTime: { $gte: new Date() },
        status: 'scheduled'
    }).sort({ dateTime: 1 }).populate('teacher');
};

appointmentSchema.statics.findUpcomingForTeacher = function (teacherId) {
    return this.find({
        teacher: teacherId,
        dateTime: { $gte: new Date() },
        status: 'scheduled'
    }).sort({ dateTime: 1 }).populate('student');
};

// Add method to find pending-payment follow-ups for a student
appointmentSchema.statics.findPendingFollowUpsForStudent = function (studentId) {
    return this.find({
        student: studentId,
        status: 'pending-payment'
    }).sort({ dateTime: 1 }).populate('teacher');
};

// Find appointments pending teacher confirmation
appointmentSchema.statics.findPendingTeacherConfirmation = function (teacherId) {
    return this.find({
        teacher: teacherId,
        status: 'pending-teacher-confirmation',
        teacherConfirmationExpires: { $gt: new Date() }
    }).sort({ teacherConfirmationExpires: 1 }).populate('student');
};

// Find expired teacher confirmation appointments
appointmentSchema.statics.findExpiredTeacherConfirmation = function () {
    return this.find({
        status: 'pending-teacher-confirmation',
        teacherConfirmationExpires: { $lte: new Date() }
    }).populate('student').populate('teacher');
};

// Find appointments for calendar view
appointmentSchema.statics.findForCalendar = function (userId, userRole, startDate, endDate) {
    const query = {};

    if (userRole === 'student') {
        query.student = userId;
    } else if (userRole === 'teacher') {
        query.teacher = userId;
    }

    if (startDate && endDate) {
        query.dateTime = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    return this.find(query)
        .sort({ dateTime: 1 })
        .populate(userRole === 'student' ? 'teacher' : 'student');
};

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;