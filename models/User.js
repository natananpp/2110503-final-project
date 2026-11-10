const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please add a name"],
    },
    tel: {
        type: String,
        // กำหนดเงื่อนไข: จะ require ก็ต่อเมื่อ provider เป็น 'local'
        required: [
            function () { 
                return this.provider === 'local'; 
            }, 
            "Please add a telephone number"
        ],
        unique: true,
        sparse: true,
        match: [
            /^(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/,
            "Please add a valid telephone number",
        ],
    },
    email: {
        type: String,
        required: [true, "Please add an email"],
        unique: true,
        match: [
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            "Please add a valid email",
        ],
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user",
    },
    password: {
        type: String,
        // กำหนดเงื่อนไข: จะ require ก็ต่อเมื่อ provider เป็น 'local'
        required: [
            function () { 
                return this.provider === 'local'; 
            }, 
            "Please add a password"
        ],
        minLength: 6,
        select: false,
    },
    provider: { // เพิ่ม field สำหรับแยกประเภทการล็อกอิน
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// ป้องกัน Error ตอน Hash รหัสผ่าน กรณี User มาจาก Google แล้วไม่มีรหัสผ่าน
UserSchema.pre("save", async function () {
    if (!this.isModified('password') || !this.password) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

//Sign JWT and return
UserSchema.methods.getSignedJwtToken = function () {
    return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);