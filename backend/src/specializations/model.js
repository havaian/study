const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const specializationSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,  // This creates an index automatically
        trim: true
        // Removed index: true from here since we're declaring it below
    },
    description: {
        type: String,
        trim: true
    },
    icon: {
        type: String, // FontAwesome icon name or URL to custom icon
        default: 'fa-stethoscope'
    },
    isActive: {
        type: Boolean,
        default: true
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

// Only define the index for isActive field, since name already has an index via unique: true
specializationSchema.index({ isActive: 1 });

// Pre-save middleware to update timestamps
specializationSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Specialization = mongoose.model('Specialization', specializationSchema);

module.exports = Specialization;