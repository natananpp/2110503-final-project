const express = require('express');
const { getBookings, getBooking, addBooking } = require('../controllers/bookings');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.route('/')
    .get(protect, getBookings)
    .post(protect, authorize('admin', 'user'), addBooking);
router.route('/:id')
    .get(protect, getBooking);

module.exports = router;
