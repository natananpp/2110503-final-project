const nodemailer = require('nodemailer');

let transporter;

// Gmail SMTP. Needs GMAIL_USER and GMAIL_APP_PASSWORD (a Google "App password", not the normal password).
const getTransporter = () => {
    const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
        throw new Error('Gmail is not configured');
    }
    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
        });
    }
    return transporter;
};

exports.sendOtpEmail = async (to, name, otp, minutes) => {
    await getTransporter().sendMail({
        from: `"Dentist Booking" <${process.env.GMAIL_USER}>`,
        to,
        subject: `Your verification code: ${otp}`,
        text: `Hi ${name},\n\nYour Dentist Booking verification code is ${otp}.\nIt expires in ${minutes} minutes.\n\nIf you did not register, ignore this email.`,
        html: `<p>Hi ${name},</p>
               <p>Your Dentist Booking verification code is:</p>
               <p style="font-size:28px;font-weight:bold;letter-spacing:6px">${otp}</p>
               <p>It expires in ${minutes} minutes.</p>
               <p style="color:#888">If you did not register, ignore this email.</p>`
    });
};
