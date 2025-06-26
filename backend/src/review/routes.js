const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
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
    appointment: {
        type: Schema.Types.ObjectId,
        ref: 'Appointment',
        required: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    // Specific rating categories
    communicationRating: {
        type: Number,
        min: 1,
        max: 5
    },
    professionalismRating: {
        type: Number,
        min: 1,
        max: 5
    },
    satisfactionRating: {
        type: Number,
        min: 1,
        max: 5
    },
    // Admin moderation fields
    isApproved: {
        type: Boolean,
        default: true // Auto-approve by default, can be changed for moderation
    },
    rejectionReason: {
        type: String,
        trim: true
    },
    // Doctor response to review
    teacherResponse: {
        text: {
            type: String,
            trim: true
        },
        respondedAt: {
            type: Date
        }
    },
    // Timestamps
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

// Ensure a student can only leave one review per appointment
reviewSchema.index({ student: 1, appointment: 1 }, { unique: true });

// Add indexes for frequent queries
reviewSchema.index({ teacher: 1 });
reviewSchema.index({ isApproved: 1 });
reviewSchema.index({ rating: 1 });

// Prevent students from reviewing their own appointments multiple times
reviewSchema.pre('save', async function (next) {
    if (this.isNew) {
        const existingReview = await this.constructor.findOne({
            student: this.student,
            appointment: this.appointment
        });

        if (existingReview) {
            const error = new Error('You have already reviewed this appointment');
            error.status = 400;
            return next(error);
        }
    }

    this.updatedAt = Date.now();
    next();
});

// Static method to get teacher's average rating
reviewSchema.statics.getDoctorRating = async function (teacherId) {
    const result = await this.aggregate([
        {
            $match: {
                teacher: mongoose.Types.ObjectId(teacherId),
                isApproved: true
            }
        },
        {
            $group: {
                _id: '$teacher',
                averageRating: { $avg: '$rating' },
                communicationRating: { $avg: '$communicationRating' },
                professionalismRating: { $avg: '$professionalismRating' },
                satisfactionRating: { $avg: '$satisfactionRating' },
                reviewCount: { $sum: 1 }
            }
        }
    ]);

    return result.length ? result[0] : {
        averageRating: 0,
        communicationRating: 0,
        professionalismRating: 0,
        satisfactionRating: 0,
        reviewCount: 0
    };
};

// Static method to get recent reviews for a teacher
reviewSchema.statics.getRecentReviews = async function (teacherId, limit = 5) {
    return this.find({
        teacher: teacherId,
        isApproved: true
    })
        .populate('student', 'firstName lastName profilePicture')
        .sort({ createdAt: -1 })
        .limit(limit);
};

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;