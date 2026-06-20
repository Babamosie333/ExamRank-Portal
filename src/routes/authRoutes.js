const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { verifyAdminToken } = require('../middleware/authMiddleware');

const router = express.Router();

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 24 * 60 * 60 * 1000,
};

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const trimmedUser = username.trim();
    let admin = await Admin.findOne({ username: trimmedUser });

    if (!admin) {
      if (
        trimmedUser === process.env.ADMIN_USERNAME &&
        String(password) === process.env.ADMIN_PASSWORD
      ) {
        const passwordHash = await bcrypt.hash(String(password), 10);
        admin = await Admin.create({ username: trimmedUser, passwordHash });
      } else {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    const valid = await bcrypt.compare(String(password), admin.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('adminToken', token, COOKIE_OPTS);
    res.json({ message: 'Login successful', username: admin.username, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('adminToken');
  res.json({ message: 'Logged out' });
});

router.get('/me', verifyAdminToken, (req, res) => {
  res.json({ username: req.admin.username, role: 'admin' });
});

module.exports = router;
