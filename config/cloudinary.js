const cloudinary = require('cloudinary').v2;

// Reads keys from config/config.env when first used
// (this file can be required before dotenv runs).
const getCloudinary = () => {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
        return null;
    }
    cloudinary.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET,
        secure: true
    });
    return cloudinary;
};

// Uploads an image buffer, resolves with { secure_url, public_id, ... }
const uploadImage = (buffer, folder) => new Promise((resolve, reject) => {
    const cld = getCloudinary();
    if (!cld) {
        return reject(new Error('Cloudinary is not configured'));
    }
    cld.uploader.upload_stream({ folder, resource_type: 'image' }, (err, result) => {
        if (err) return reject(err);
        resolve(result);
    }).end(buffer);
});

// Deletes an image; errors are logged, not thrown
const deleteImage = async (publicId) => {
    const cld = getCloudinary();
    if (!cld || !publicId) return;
    try {
        await cld.uploader.destroy(publicId);
    } catch (err) {
        console.log(`Cannot delete image ${publicId}: ${err.message}`);
    }
};

module.exports = { cloudinary, uploadImage, deleteImage };
