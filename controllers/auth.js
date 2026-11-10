const crypto = require('crypto');
const User = require('../models/User');
const { sendOtpEmail } = require('../config/email');

const OTP_MINUTES = 10;        // OTP lifetime
const OTP_MAX_ATTEMPTS = 5;    // wrong tries before a new OTP is needed
const OTP_RESEND_SECONDS = 60; // wait time between resends

const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

// New 6-digit OTP + the fields to store (only the hash is saved)
const newOtp = () => {
    const otp = crypto.randomInt(0, 1000000).toString().padStart(6, '0');
    return {
        otp,
        fields: {
            otpHash: hashOtp(otp),
            otpExpire: new Date(Date.now() + OTP_MINUTES * 60 * 1000),
            otpAttempts: 0,
            otpSentAt: new Date()
        }
    };
};

// For automated tests only: return the OTP in the response (never in production)
const debugOtp = (otp) =>
    process.env.OTP_IN_RESPONSE === 'true' && process.env.NODE_ENV !== 'production' ? { otp } : {};

// Switch in config.env: REQUIRE_EMAIL_VERIFICATION=false lets users log in
// without the OTP (the OTP email is still sent). Default: required.
const verificationRequired = () => process.env.REQUIRE_EMAIL_VERIFICATION !== 'false';

//@desc     Register user and email an OTP to verify the email address
//@route    POST /api/v1/auth/register
//@access   Public
exports.register = async (req, res, next) => {
    let user;
    try {
        const { name, tel, email, password, role } = req.body;
        const { otp, fields } = newOtp();

        user = await User.create({
            name,
            tel,
            email,
            password,
            role,
            isVerified: false,
            ...fields
        });

        try {
            await sendOtpEmail(user.email, user.name, otp, OTP_MINUTES);
        } catch (err) {
            console.log(`Cannot send OTP email: ${err.message}`);
            if (verificationRequired()) {
                // Remove the user so they can register again
                await user.deleteOne();
                return res.status(500).json({ success: false, msg: 'Cannot send OTP email. Please try again.' });
            }
        }

        // Verification switched off -> log in right away, like before
        if (!verificationRequired()) {
            return sendTokenResponse(user, 201, res);
        }

        res.status(201).json({
            success: true,
            msg: `Registered. An OTP was sent to ${user.email}. Verify it to log in.`,
            ...debugOtp(otp)
        });
    } catch (err) {
        res.status(400).json({ success: false });
        console.log(err.stack);
    }
};

//@desc     Verify email with the OTP, then log in
//@route    POST /api/v1/auth/verify-otp
//@access   Public
exports.verifyOtp = async (req, res, next) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ success: false, msg: 'Please provide an email and OTP' });
        }

        const user = await User.findOne({ email }).select('+otpHash +otpExpire +otpAttempts');
        if (!user || user.isVerified !== false) {
            return res.status(400).json({ success: false, msg: 'Invalid email or the email is already verified' });
        }
        if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
            return res.status(429).json({ success: false, msg: 'Too many wrong attempts. Please request a new OTP.' });
        }
        if (!user.otpExpire || user.otpExpire < new Date()) {
            return res.status(400).json({ success: false, msg: 'OTP expired. Please request a new OTP.' });
        }
        if (hashOtp(String(otp)) !== user.otpHash) {
            await User.updateOne({ _id: user._id }, { $inc: { otpAttempts: 1 } });
            return res.status(400).json({ success: false, msg: 'Invalid OTP' });
        }

        // updateOne (not save) so the password hook does not run again
        await User.updateOne(
            { _id: user._id },
            { $set: { isVerified: true }, $unset: { otpHash: 1, otpExpire: 1, otpAttempts: 1, otpSentAt: 1 } }
        );
        sendTokenResponse(user, 200, res);
    } catch (err) {
        console.log(err.stack);
        res.status(500).json({ success: false, msg: 'Cannot verify OTP' });
    }
};

//@desc     Send a new OTP
//@route    POST /api/v1/auth/resend-otp
//@access   Public
exports.resendOtp = async (req, res, next) => {
    try {
        const user = await User.findOne({ email: req.body.email }).select('+otpSentAt');
        if (!user || user.isVerified !== false) {
            return res.status(400).json({ success: false, msg: 'Invalid email or the email is already verified' });
        }

        const waited = (Date.now() - (user.otpSentAt ? user.otpSentAt.getTime() : 0)) / 1000;
        if (waited < OTP_RESEND_SECONDS) {
            return res.status(429).json({ success: false, msg: `Please wait ${Math.ceil(OTP_RESEND_SECONDS - waited)} seconds before requesting a new OTP` });
        }

        const { otp, fields } = newOtp();
        try {
            await sendOtpEmail(user.email, user.name, otp, OTP_MINUTES);
        } catch (err) {
            console.log(`Cannot send OTP email: ${err.message}`);
            return res.status(500).json({ success: false, msg: 'Cannot send OTP email. Please try again.' });
        }
        await User.updateOne({ _id: user._id }, { $set: fields });

        res.status(200).json({ success: true, msg: `A new OTP was sent to ${user.email}`, ...debugOtp(otp) });
    } catch (err) {
        console.log(err.stack);
        res.status(500).json({ success: false, msg: 'Cannot resend OTP' });
    }
};

//@desc     Login user
//@route    POST /api/v1/auth/login
//@access   Public
exports.login = async (req, res, next) => {
    const { email, password } = req.body;
    // Validate email and password
    if (!email || !password) {
        return res
            .status(401)
            .json({ success: false, msg: "Please provide an email and password" });
    }
    // Check for user
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
        return res.status(400).json({ success: false, msg: "Invalid credentials" });
    }
    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
        return res.status(401).json({ success: false, msg: "Invalid credentials" });
    }
    // Email must be verified with the OTP first
    if (user.isVerified === false && verificationRequired()) {
        return res.status(403).json({ success: false, msg: "Please verify your email with the OTP first" });
    }
    // Create token
    // const token = user.getSignedJwtToken();
    // res.status(200).json({ success: true, token });
    sendTokenResponse(user, 200, res);
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
    // Create token
    const token = user.getSignedJwtToken();
    const options = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
    };
    if (process.env.NODE_ENV === "production") {
        options.secure = true;
    }
    res.status(statusCode).cookie("token", token, options).json({
        success: true,
        token,
    });
};

exports.getMe = async (req, res, next) => {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, data: user });
};

//@desc Log user out / clear cookie
//@route GET /api/v1/auth/logout
//@access Private
exports.logout = async (req, res, next) => {
    res.cookie('token', 'none', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });
    res.status(200).json({ success: true, data: {} });
}
