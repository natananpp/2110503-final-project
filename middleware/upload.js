const multer = require('multer');

const MAX_SIZE_MB = 2;

// Keep the file in memory; the controller sends it to Cloudinary
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Accepts one image in form-data field "photo"; bad files get 400
exports.uploadPhoto = (req, res, next) => {
    upload.single('photo')(req, res, (err) => {
        if (err) {
            const message = err.code === 'LIMIT_FILE_SIZE'
                ? `Image must be smaller than ${MAX_SIZE_MB} MB`
                : err.message;
            return res.status(400).json({ success: false, message });
        }
        next();
    });
};
