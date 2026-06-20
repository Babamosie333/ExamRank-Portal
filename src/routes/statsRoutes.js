const express = require('express');
const Subject = require('../models/Subject');
const Test = require('../models/Test');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');
const Student = require('../models/Student');
const { verifyAdminToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/admin/stats', verifyAdminToken, async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const [
      totalStudents,
      totalSubjects,
      totalChapters,
      totalQuestions,
      testsToday,
      testsThisWeek,
      totalAttempts,
    ] = await Promise.all([
      Student.countDocuments(),
      Subject.countDocuments(),
      Test.countDocuments(),
      Question.countDocuments(),
      Attempt.countDocuments({ status: 'submitted', submittedAt: { $gte: startOfDay } }),
      Attempt.countDocuments({ status: 'submitted', submittedAt: { $gte: startOfWeek } }),
      Attempt.countDocuments({ status: 'submitted' }),
    ]);

    const recentResults = await Attempt.find({ status: 'submitted' })
      .sort({ submittedAt: -1 })
      .limit(10)
      .populate('studentId', 'email')
      .populate('testId', 'title')
      .populate('subjectId', 'name')
      .select(
        'studentId studentName score totalMarks percentage passed submittedAt testId subjectId'
      );

    res.json({
      totalStudents,
      totalSubjects,
      totalChapters,
      totalQuestions,
      totalTests: totalChapters,
      testsToday,
      testsThisWeek,
      totalAttempts,
      recentResults,
      recentAttempts: recentResults,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/results', verifyAdminToken, async (req, res) => {
  try {
    const filter = { status: 'submitted' };

    if (req.query.testId || req.query.chapterId) {
      filter.testId = req.query.testId || req.query.chapterId;
    }

    if (req.query.subjectId) filter.subjectId = req.query.subjectId;

    const results = await Attempt.find(filter)
      .sort({ submittedAt: -1 })
      .populate('studentId', 'email')
      .populate('testId', 'title')
      .populate('subjectId', 'name');

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
