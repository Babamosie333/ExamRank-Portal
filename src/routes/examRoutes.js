const express = require('express');
const Test = require('../models/Test');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');
const Student = require('../models/Student');
const { verifyStudentToken } = require('../middleware/authMiddleware');
const { calculateScore, shuffleArray } = require('../services/scoringService');

const router = express.Router();

router.get('/:chapterId', verifyStudentToken, async (req, res) => {
  try {
    const test = await Test.findById(req.params.chapterId).populate('subjectId', 'name');
    if (!test || !test.isActive) {
      return res.status(404).json({ error: 'Test not found or inactive' });
    }

    const questions = await Question.find({ testId: test._id }).sort({ createdAt: 1 });
    if (questions.length === 0) {
      return res.status(400).json({ error: 'This test has no questions yet' });
    }

    const student = await Student.findById(req.student.id);
    const attempt = await Attempt.create({
      testId: test._id,
      subjectId: test.subjectId._id || test.subjectId,
      studentId: student._id,
      studentName: student.name,
      studentMobile: student.phone,
      startedAt: new Date(),
      status: 'in_progress',
    });

    const shuffled = shuffleArray(questions).map((q) => ({
      _id: q._id,
      questionText: q.questionText,
      options: q.options,
      marks: q.marks,
    }));

    const computedTotal = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

    res.json({
      attemptId: attempt._id,
      chapterId: test._id,
      title: test.title,
      durationMinutes: test.durationMinutes,
      totalMarks: test.totalMarks || computedTotal,
      passingMarks: test.passingMarks || 0,
      questionCount: questions.length,
      subjectName: test.subjectId?.name || '',
      startedAt: attempt.startedAt,
      questions: shuffled,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/submit', verifyStudentToken, async (req, res) => {
  try {
    const { attemptId, answers, timeTakenSeconds } = req.body;
    if (!attemptId) {
      return res.status(400).json({ error: 'attemptId is required' });
    }

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    if (String(attempt.studentId) !== String(req.student.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (attempt.status === 'submitted') {
      return res.json(formatResult(attempt, await Test.findById(attempt.testId)));
    }

    const test = await Test.findById(attempt.testId);
    const questions = await Question.find({ testId: attempt.testId });
    const result = calculateScore(questions, answers, test?.passingMarks || 0);

    const submittedAt = new Date();
    const durationUsedSeconds =
      timeTakenSeconds != null
        ? Number(timeTakenSeconds)
        : Math.floor((submittedAt - attempt.startedAt) / 1000);

    const answersMap = new Map();
    if (answers && typeof answers === 'object') {
      for (const [qId, opt] of Object.entries(answers)) {
        if (['A', 'B', 'C', 'D'].includes(opt)) answersMap.set(qId, opt);
      }
    }

    attempt.answers = answersMap;
    attempt.score = result.obtainedMarks;
    attempt.totalMarks = result.totalMarks;
    attempt.correctCount = result.correctCount;
    attempt.wrongCount = result.wrongCount;
    attempt.percentage = result.percentage;
    attempt.passed = result.passed;
    attempt.answerDetails = result.answerDetails;
    attempt.submittedAt = submittedAt;
    attempt.durationUsedSeconds = durationUsedSeconds;
    attempt.status = 'submitted';
    await attempt.save();

    const populated = await Attempt.findById(attempt._id)
      .populate('testId', 'title durationMinutes passingMarks')
      .populate('subjectId', 'name');

    res.json(formatResult(populated, test));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function formatResult(attempt, test) {
  return {
    attemptId: attempt._id,
    chapterId: attempt.testId?._id || attempt.testId,
    chapterTitle: attempt.testId?.title || test?.title || '',
    subjectName: attempt.subjectId?.name || '',
    obtainedMarks: attempt.score,
    totalMarks: attempt.totalMarks,
    percentage: attempt.percentage,
    passed: attempt.passed,
    passingMarks: test?.passingMarks || 0,
    timeTakenSeconds: attempt.durationUsedSeconds,
    submittedAt: attempt.submittedAt,
    answerDetails: attempt.answerDetails || [],
    correctCount: attempt.correctCount,
    wrongCount: attempt.wrongCount,
  };
}

module.exports = router;
