const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

exports.register = async (req, res, next) => {
    try {
        const { name, tel, email, password, role } = req.body;

        const user = await User.create({
            name,
            tel,
            email,
            password,
            role
        });
        // const token = await user.getSignedJwtToken();
        // res.status(200).json({success: true});
        sendTokenResponse(user, 201, res);
    } catch (err) {
        res.status(400).json({ success: false });
        console.log(err.stack);
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

//@desc     Login or Register with Google
//@route    POST /api/v1/auth/google
//@access   Public
exports.googleLogin = async (req, res, next) => {
    try {
        const { idToken, tel } = req.body;

        if (!idToken) {
            return res.status(400).json({ success: false, msg: "Please provide a Google ID Token" });
        }

        // 1. ตรวจสอบว่า Token ถูกต้องและมาจากแอปเราจริงหรือไม่
        const ticket = await client.verifyIdToken({
            idToken: idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        // 2. ดึงข้อมูล User จาก Payload
        const payload = ticket.getPayload();
        const { email, name } = payload;

        // 3. ตรวจสอบว่ามีอีเมลนี้ในระบบหรือยัง
        let user = await User.findOne({ email });

        if (!user) {
            // ถ้ายังไม่มี = สมัครสมาชิกใหม่
            user = await User.create({
                name,
                tel,
                email,
                provider: 'google',
                role: 'user'
            });
        }

        // 4. สร้าง JWT Token ของระบบเรา (ด้วยฟังก์ชันที่มีอยู่แล้ว) แล้วส่งคืน
        sendTokenResponse(user, 200, res);

    } catch (error) {
        console.error("Google Auth Error:", error.message);
        res.status(401).json({ success: false, msg: "Invalid Google Token" });
    }
};