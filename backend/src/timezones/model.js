const mongoose = require('mongoose');

const timezoneSchema = new mongoose.Schema({
    value: {
        type: String,
        required: true,
        unique: true
    },
    label: {
        type: String,
        required: true
    },
    offset: {
        type: Number,
        required: true
    },
    region: {
        type: String,
        required: true
    },
    abbreviation: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

const Timezone = mongoose.model('Timezone', timezoneSchema);

module.exports = Timezone;