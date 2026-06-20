const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.GMAIL_USER,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  },
});

async function sendOtpEmail(email, otpCode) {
  await transporter.sendMail({
    from: `"Exam Portal" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Your Exam Portal OTP',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 16px;">
        <h2>Your OTP Code</h2>
        <p>Use the following OTP to verify your login:</p>
        <h1 style="letter-spacing: 4px;">${otpCode}</h1>
        <p>This OTP expires in 10 minutes.</p>
      </div>
    `,
  });
}

module.exports = { transporter, sendOtpEmail };
