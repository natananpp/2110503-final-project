const mongoose = require('mongoose');

const DentistSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
        unique: true,
        trim: true,
        maxlength: [50, 'Name can not be more than 50 characters']
    },
    yearsOfExperience: {
        type: Number,
        required: [true, 'Please add years of experience'],
        min: [0, 'Years of experience can not be negative']
    },
    expertise: {
        type: String,
        required: [true, 'Please add an area of expertise'],
        trim: true
    },
    // Profile photo stored on Cloudinary (set by PUT /dentists/:id/photo)
    photo: {
        url: String,
        publicId: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Dentist', DentistSchema);
