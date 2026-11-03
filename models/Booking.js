const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
    // Stores date AND time, so time-based rules (time-period tags,
    // operating hours, 24-hour edit limit) can be added later.
    bookingDate: {
        type: Date,
        required: [true, 'Please add a booking date']
    },
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: true
    },
    dentist: {
        type: mongoose.Schema.ObjectId,
        ref: 'Dentist',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Booking', BookingSchema);
