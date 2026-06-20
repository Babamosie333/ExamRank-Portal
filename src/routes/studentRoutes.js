const express = require('express');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const { sendOtpEmail } = require('../services/mailer'); // Fix 1: use shared mailer

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    let student = await Student.findOne({ email: normalizedEmail });

    if (student) {
      student.name = name;
      student.otpCode = otpCode;
      student.otpExpiresAt = otpExpiresAt;
      await student.save();
    } else {
      student = await Student.create({
        name,
        email: normalizedEmail,
        otpCode,
        otpExpiresAt,
        isVerified: false,
      });
    }

    await sendOtpEmail(normalizedEmail, otpCode);

    return res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Register error:', {
      message: error.message,
      code: error.code,
      response: error.response,
      responseCode: error.responseCode,
      command: error.command,
    });
    return res.status(500).json({ message: error.message });
  }
});

router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const student = await Student.findOne({ email: normalizedEmail });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    student.otpCode = otpCode;
    student.otpExpiresAt = otpExpiresAt;
    await student.save();

    await sendOtpEmail(normalizedEmail, otpCode);

    return res.status(200).json({ message: 'OTP resent successfully' });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ message: error.message });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const student = await Student.findOne({ email: normalizedEmail });

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!student.otpCode || !student.otpExpiresAt) {
      return res.status(400).json({ message: 'No OTP found for this student' });
    }

    if (student.otpCode !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (student.otpExpiresAt < new Date()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    student.isVerified = true;
    student.otpCode = null;
    student.otpExpiresAt = null;
    await student.save();

    // Fix 2: token only includes fields that actually exist on Student model (no phone)
    const token = jwt.sign(
      { id: student._id, email: student.email, name: student.name, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'OTP verified successfully',
      token,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        isVerified: student.isVerified,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;
