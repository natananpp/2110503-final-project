const Dentist = require('../models/Dentist');
const Booking = require('../models/Booking');
const { uploadImage, deleteImage } = require('../config/cloudinary');

//@desc     Get all dentists
//@route    GET /api/v1/dentists
//@access   Public
exports.getDentists = async (req, res, next) => {
    try {
        // Copy req.query and drop the fields that are not filters
        const reqQuery = { ...req.query };
        const removeFields = ['select', 'sort', 'page', 'limit'];
        removeFields.forEach(param => delete reqQuery[param]);

        // Turn gt/gte/lt/lte/in into MongoDB operators ($gt, ...)
        let queryStr = JSON.stringify(reqQuery);
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);
        const filter = JSON.parse(queryStr);

        let query = Dentist.find(filter);

        // Select fields
        if (req.query.select) {
            query = query.select(req.query.select.split(',').join(' '));
        }

        // Sort
        if (req.query.sort) {
            query = query.sort(req.query.sort.split(',').join(' '));
        } else {
            query = query.sort('name');
        }

        // Pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 25;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const total = await Dentist.countDocuments(filter);

        query = query.skip(startIndex).limit(limit);

        const dentists = await query;

        const pagination = {};
        if (endIndex < total) {
            pagination.next = { page: page + 1, limit };
        }
        if (startIndex > 0) {
            pagination.prev = { page: page - 1, limit };
        }

        res.status(200).json({ success: true, count: dentists.length, pagination, data: dentists });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: 'Cannot get dentists' });
    }
};

//@desc     Get single dentist
//@route    GET /api/v1/dentists/:id
//@access   Public
exports.getDentist = async (req, res, next) => {
    try {
        const dentist = await Dentist.findById(req.params.id);
        if (!dentist) {
            return res.status(404).json({ success: false, message: `No dentist with the id of ${req.params.id}` });
        }
        res.status(200).json({ success: true, data: dentist });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: 'Cannot get dentist' });
    }
};

//@desc     Create new dentist
//@route    POST /api/v1/dentists
//@access   Private (admin)
exports.createDentist = async (req, res, next) => {
    try {
        delete req.body.photo; // photo is set only through the upload route
        const dentist = await Dentist.create(req.body);
        res.status(201).json({ success: true, data: dentist });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

//@desc     Update dentist
//@route    PUT /api/v1/dentists/:id
//@access   Private (admin)
exports.updateDentist = async (req, res, next) => {
    try {
        delete req.body.photo; // photo is set only through the upload route
        const dentist = await Dentist.findByIdAndUpdate(req.params.id, req.body, {
            returnDocument: 'after',
            runValidators: true
        });
        if (!dentist) {
            return res.status(404).json({ success: false, message: `No dentist with the id of ${req.params.id}` });
        }
        res.status(200).json({ success: true, data: dentist });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

//@desc     Delete dentist (and all of their bookings)
//@route    DELETE /api/v1/dentists/:id
//@access   Private (admin)
exports.deleteDentist = async (req, res, next) => {
    try {
        const dentist = await Dentist.findById(req.params.id);
        if (!dentist) {
            return res.status(404).json({ success: false, message: `No dentist with the id of ${req.params.id}` });
        }

        await Booking.deleteMany({ dentist: req.params.id });
        await deleteImage(dentist.photo && dentist.photo.publicId);
        await dentist.deleteOne();

        res.status(200).json({ success: true, data: {} });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: 'Cannot delete dentist' });
    }
};

//@desc     Upload dentist profile photo to Cloudinary (replaces the old one)
//@route    PUT /api/v1/dentists/:id/photo   (form-data, field "photo")
//@access   Private (admin)
exports.uploadDentistPhoto = async (req, res, next) => {
    try {
        const dentist = await Dentist.findById(req.params.id).catch(() => null);
        if (!dentist) {
            return res.status(404).json({ success: false, message: `No dentist with the id of ${req.params.id}` });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload an image in form-data field "photo"' });
        }

        const result = await uploadImage(req.file.buffer, 'dentist-booking/dentists');
        const oldPublicId = dentist.photo && dentist.photo.publicId;

        dentist.photo = { url: result.secure_url, publicId: result.public_id };
        await dentist.save();
        await deleteImage(oldPublicId);

        res.status(200).json({ success: true, data: dentist });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Cannot upload photo' });
    }
};
