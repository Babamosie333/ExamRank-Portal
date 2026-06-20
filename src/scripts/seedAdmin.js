require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const Admin = require('../models/Admin');

async function seed() {
  await connectDB();
  const username = process.env.ADMIN_USERNAME || 'Vikram';
  const password = process.env.ADMIN_PASSWORD || 'vikram123';

  const existing = await Admin.findOne({ username });
  if (existing) {
    console.log(`Admin "${username}" already exists. Skipping seed.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await Admin.create({ username, passwordHash });
  console.log(`Admin created: username="${username}"`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
