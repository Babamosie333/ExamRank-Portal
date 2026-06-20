const express = require('express');
const Attempt = require('../models/Attempt');
const { verifyAdminToken, verifyStudentToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/student', verifyStudentToken, async (req, res) => {
  try {
    const results = await Attempt.find({
      studentId: req.student.id,
      status: 'submitted',
    })
      .sort({ submittedAt: -1 })
      .populate('studentId', 'email')
      .populate('testId', 'title durationMinutes passingMarks')
      .populate('subjectId', 'name');

    res.json(
      results.map((r) => ({
        id: r._id,
        studentName: r.studentName,
        email: r.studentId?.email || '',
        subject: r.subjectId?.name || '',
        chapter: r.testId?.title || '',
        obtainedMarks: r.score,
        totalMarks: r.totalMarks,
        percentage: r.percentage,
        passed: r.passed,
        date: r.submittedAt,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/student/:id', verifyStudentToken, async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.id)
      .populate('studentId', 'email')
      .populate('testId', 'title passingMarks')
      .populate('subjectId', 'name');

    if (!attempt || attempt.status !== 'submitted') {
      return res.status(404).json({ error: 'Result not found' });
    }

    if (String(attempt.studentId?._id || attempt.studentId) !== String(req.student.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(formatDetail(attempt));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin', verifyAdminToken, async (req, res) => {
  try {
    const filter = { status: 'submitted' };

    if (req.query.subjectId) filter.subjectId = req.query.subjectId;

    if (req.query.chapterId || req.query.testId) {
      filter.testId = req.query.chapterId || req.query.testId;
    }

    if (req.query.passed === 'true') filter.passed = true;
    if (req.query.passed === 'false') filter.passed = false;

    if (req.query.from || req.query.to) {
      filter.submittedAt = {};
      if (req.query.from) filter.submittedAt.$gte = new Date(req.query.from);
      if (req.query.to) {
        const to = new Date(req.query.to);
        to.setHours(23, 59, 59, 999);
        filter.submittedAt.$lte = to;
      }
    }

    let results = await Attempt.find(filter)
      .sort({ submittedAt: -1 })
      .populate('studentId', 'email')
      .populate('testId', 'title')
      .populate('subjectId', 'name');

    const search = (req.query.search || '').trim().toLowerCase();
    if (search) {
      results = results.filter(
        (r) =>
          (r.studentName || '').toLowerCase().includes(search) ||
          (r.studentId?.email || '').toLowerCase().includes(search)
      );
    }

    res.json(
      results.map((r) => ({
        id: r._id,
        studentName: r.studentName,
        email: r.studentId?.email || '',
        subject: r.subjectId?.name || '',
        chapter: r.testId?.title || '',
        obtainedMarks: r.score,
        totalMarks: r.totalMarks,
        percentage: r.percentage,
        passed: r.passed,
        date: r.submittedAt,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/:id', verifyAdminToken, async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.id)
      .populate('studentId', 'email')
      .populate('testId', 'title passingMarks')
      .populate('subjectId', 'name');

    if (!attempt) return res.status(404).json({ error: 'Result not found' });

    res.json(formatDetail(attempt));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/export/csv', verifyAdminToken, async (req, res) => {
  try {
    const filter = { status: 'submitted' };

    if (req.query.subjectId) filter.subjectId = req.query.subjectId;
    if (req.query.chapterId || req.query.testId) {
      filter.testId = req.query.chapterId || req.query.testId;
    }

    const results = await Attempt.find(filter)
      .sort({ submittedAt: -1 })
      .populate('studentId', 'email')
      .populate('testId', 'title')
      .populate('subjectId', 'name');

    const header = 'Student Name,Email,Subject,Chapter,Score,Total Marks,Percentage,Pass/Fail,Date';

    const rows = results.map((r) => {
      const cols = [
        r.studentName,
        r.studentId?.email || '',
        r.subjectId?.name,
        r.testId?.title,
        r.score,
        r.totalMarks,
        r.percentage,
        r.passed ? 'Pass' : 'Fail',
        r.submittedAt ? new Date(r.submittedAt).toISOString() : '',
      ];

      return cols.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',');
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="exam-results.csv"');
    res.send([header, ...rows].join('\n'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function formatDetail(attempt) {
  return {
    id: attempt._id,
    studentName: attempt.studentName,
    email: attempt.studentId?.email || '',
    subject: attempt.subjectId?.name || '',
    chapter: attempt.testId?.title || '',
    obtainedMarks: attempt.score,
    totalMarks: attempt.totalMarks,
    percentage: attempt.percentage,
    passed: attempt.passed,
    passingMarks: attempt.testId?.passingMarks || 0,
    timeTakenSeconds: attempt.durationUsedSeconds,
    date: attempt.submittedAt,
    answerDetails: attempt.answerDetails || [],
  };
}

module.exports = router;
// Per-student detailed CSV: correct/wrong answers just like the result review screen
router.get('/admin/export/student/:attemptId', verifyAdminToken, async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.attemptId)
      .populate('studentId', 'email')
      .populate('testId', 'title passingMarks')
      .populate('subjectId', 'name');

    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

    const meta = [
      ['Student Name',  attempt.studentName || ''],
      ['Email',         attempt.studentId?.email || ''],
      ['Subject',       attempt.subjectId?.name || ''],
      ['Chapter/Test',  attempt.testId?.title || ''],
      ['Score',         `${attempt.score} / ${attempt.totalMarks}`],
      ['Percentage',    `${attempt.percentage}%`],
      ['Result',        attempt.passed ? 'PASS' : 'FAIL'],
      ['Time Taken',    attempt.durationUsedSeconds
        ? `${Math.floor(attempt.durationUsedSeconds / 60)}m ${attempt.durationUsedSeconds % 60}s`
        : ''],
      ['Date',          attempt.submittedAt ? new Date(attempt.submittedAt).toISOString() : ''],
      [],
    ];

    const answerHeader = [
      'Q#',
      'Question',
      'Option A', 'Option B', 'Option C', 'Option D',
      'Student Answer',
      'Correct Answer',
      'Result',
      'Marks',
      'Explanation',
    ];

    const answerRows = (attempt.answerDetails || []).map((d, i) => [
      i + 1,
      d.questionText || '',
      d.options?.A || '',
      d.options?.B || '',
      d.options?.C || '',
      d.options?.D || '',
      d.selectedOption || 'Not Answered',
      d.correctOption || '',
      d.isCorrect ? 'Correct' : (d.selectedOption ? 'Wrong' : 'Skipped'),
      d.marks || 0,
      d.explanation || '',
    ]);

    const allRows = [...meta, answerHeader, ...answerRows];

    const csvLines = allRows.map((row) =>
      row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
    );

    const safeName = (attempt.studentName || 'student').replace(/[^a-z0-9]/gi, '_');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}_result.csv"`);
    res.send(csvLines.join('\n'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
