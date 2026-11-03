const express = require('express');
const { addBooking } = require('../controllers/bookings');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.route('/')
    .post(protect, authorize('admin', 'user'), addBooking);

module.exports = router;
