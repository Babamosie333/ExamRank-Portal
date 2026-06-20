const mongoose = require('mongoose');
async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mcq_test_platform';
    await mongoose.connect(uri);
    console.log('MongoDB connected:', uri);
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    // Server continues to run even if DB fails
    // Admin login will still work via .env credentials
  }
}

module.exports = connectDB;