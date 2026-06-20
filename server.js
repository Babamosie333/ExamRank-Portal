require('dotenv').config();

const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('./src/config/db');

const authRoutes = require('./src/routes/authRoutes');
const studentRoutes = require('./src/routes/studentRoutes');
const subjectRoutes = require('./src/routes/subjectRoutes');
const testRoutes = require('./src/routes/testRoutes');
const questionRoutes = require('./src/routes/questionRoutes');
const attemptRoutes = require('./src/routes/attemptRoutes');
const examRoutes = require('./src/routes/examRoutes');
const resultRoutes = require('./src/routes/resultRoutes');
const statsRoutes = require('./src/routes/statsRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Fix 4: restrict CORS to explicit allowed origins from .env
// In development, ALLOWED_ORIGINS can be left empty to allow all origins
const rawOrigins = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = rawOrigins
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length > 0
      ? (origin, callback) => {
          // allow requests with no origin (e.g. same-origin, mobile apps, curl)
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error(`CORS: origin '${origin}' not allowed`));
          }
        }
      : true, // dev fallback: allow all
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use('/api/admin', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/exam', examRoutes);
app.use('/api/results', resultRoutes);
app.use('/api', statsRoutes);

app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`MCQ Test Platform running at http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin/login.html`);
  });
}).catch((err) => {
  console.error('DB connection failed, starting without DB:', err.message);
  app.listen(PORT, () => {
    console.log(`Server running without DB at http://localhost:${PORT}`);
  });
});

module.exports = app;
