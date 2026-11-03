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

const dentistFields = { path: 'dentist', select: 'name yearsOfExperience expertise' };

const isOwner = (booking, user) => booking.user.toString() === user.id;

//@desc     Get own bookings
//@route    GET /api/v1/bookings
//@route    GET /api/v1/dentists/:dentistId/bookings
//@access   Private
exports.getBookings = async (req, res, next) => {
    try {
        const filter = { user: req.user.id };
        if (req.params.dentistId) {
            filter.dentist = req.params.dentistId;
        }

        const bookings = await Booking.find(filter).populate(dentistFields).sort('bookingDate');
        res.status(200).json({ success: true, count: bookings.length, data: bookings });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Cannot find bookings' });
    }
};

//@desc     Get single booking
//@route    GET /api/v1/bookings/:id
//@access   Private (owner)
exports.getBooking = async (req, res, next) => {
    try {
        const booking = await Booking.findById(req.params.id).populate(dentistFields);
        if (!booking) {
            return res.status(404).json({ success: false, message: `No booking with the id of ${req.params.id}` });
        }
        if (!isOwner(booking, req.user)) {
            return res.status(403).json({ success: false, message: `User ${req.user.id} is not authorized to view this booking` });
        }
        res.status(200).json({ success: true, data: booking });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Cannot find booking' });
    }
};

//@desc     Update booking (date and/or dentist)
//@route    PUT /api/v1/bookings/:id
//@access   Private (owner)
exports.updateBooking = async (req, res, next) => {
    try {
        let booking = await Booking.findById(req.params.id);
        if (!booking) {
            return res.status(404).json({ success: false, message: `No booking with the id of ${req.params.id}` });
        }
        if (!isOwner(booking, req.user)) {
            return res.status(403).json({ success: false, message: `User ${req.user.id} is not authorized to update this booking` });
        }

        // Only these fields can be changed; the owner (user) can not be changed
        const updates = {};
        if (req.body.bookingDate !== undefined) {
            const dateError = checkBookingDate(req.body.bookingDate);
            if (dateError) {
                return res.status(400).json({ success: false, message: dateError });
            }
            updates.bookingDate = req.body.bookingDate;
        }
        if (req.body.dentist !== undefined) {
            const dentist = await Dentist.findById(req.body.dentist).catch(() => null);
            if (!dentist) {
                return res.status(404).json({ success: false, message: `No dentist with the id of ${req.body.dentist}` });
            }
            updates.dentist = dentist._id;
        }

        booking = await Booking.findByIdAndUpdate(req.params.id, updates, {
            returnDocument: 'after',
            runValidators: true
        }).populate(dentistFields);
        res.status(200).json({ success: true, data: booking });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Cannot update booking' });
    }
};
