const Booking = require('../models/Booking');
const Dentist = require('../models/Dentist');

// Returns an error message if the date is missing, invalid or in the past
const checkBookingDate = (value) => {
    const date = new Date(value);
    if (!value || isNaN(date.getTime())) {
        return 'Please provide a valid booking date';
    }
    if (date <= new Date()) {
        return 'Booking date must be in the future';
    }
    return null;
};

//@desc     Add booking (a user can have only ONE booking)
//@route    POST /api/v1/dentists/:dentistId/bookings
//@access   Private
exports.addBooking = async (req, res, next) => {
    try {
        const dentist = await Dentist.findById(req.params.dentistId);
        if (!dentist) {
            return res.status(404).json({ success: false, message: `No dentist with the id of ${req.params.dentistId}` });
        }

        const dateError = checkBookingDate(req.body.bookingDate);
        if (dateError) {
            return res.status(400).json({ success: false, message: dateError });
        }

        const existing = await Booking.findOne({ user: req.user.id });
        if (existing) {
            return res.status(400).json({ success: false, message: `The user with ID ${req.user.id} already has a booking` });
        }

        const booking = await Booking.create({
            bookingDate: req.body.bookingDate,
            dentist: dentist._id,
            user: req.user.id
        });
        res.status(201).json({ success: true, data: booking });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Cannot create booking' });
    }
};
