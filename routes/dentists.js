const express = require('express');
const { getDentists, getDentist, createDentist, updateDentist, deleteDentist, uploadDentistPhoto } = require('../controllers/dentists');
const { getSessions } = require('../controllers/sessions');
const { protect, authorize } = require('../middleware/auth');
const { uploadPhoto } = require('../middleware/upload');
const bookingRouter = require('./bookings');

const router = express.Router();

// Re-route into other resource routers
router.use('/:dentistId/bookings', bookingRouter);

// Available sessions, filtered by time period tags
router.get('/:dentistId/sessions', getSessions);

router.route('/')
    .get(getDentists)
    .post(protect, authorize('admin'), createDentist);
router.route('/:id')
    .get(getDentist)
    .put(protect, authorize('admin'), updateDentist)
    .delete(protect, authorize('admin'), deleteDentist);

// Profile photo upload (stored on Cloudinary)
router.put('/:id/photo', protect, authorize('admin'), uploadPhoto, uploadDentistPhoto);

module.exports = router;
