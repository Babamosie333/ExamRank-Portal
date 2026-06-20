const express = require('express');
const Attempt = require('../models/Attempt');
const Test = require('../models/Test');
const Question = require('../models/Question');
const { calculateScore } = require('../services/scoringService');

const router = express.Router();

router.post('/start', async (req, res) => {
  try {
    const { testId, studentName, studentMobile } = req.body;
    if (!testId || !studentName || !studentMobile) {
      return res.status(400).json({ error: 'testId, studentName, and studentMobile are required' });
    }

    const test = await Test.findById(testId);
    if (!test || !test.isActive) {
      return res.status(404).json({ error: 'Test not found or inactive' });
    }

    const questionCount = await Question.countDocuments({ testId });
    if (questionCount === 0) {
      return res.status(400).json({ error: 'This test has no questions yet' });
    }

    const attempt = await Attempt.create({
      testId: test._id,
      subjectId: test.subjectId,
      studentName: String(studentName).trim(),
      studentMobile: String(studentMobile).trim(),
      startedAt: new Date(),
      status: 'in_progress',
    });

    res.status(201).json({
      attemptId: attempt._id,
      testId: test._id,
      durationMinutes: test.durationMinutes,
      questionCount,
      startedAt: attempt.startedAt,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/submit', async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.id);
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    if (attempt.status === 'submitted') {
      return res.json({
        attemptId: attempt._id,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        correctCount: attempt.correctCount,
        wrongCount: attempt.wrongCount,
        percentage: attempt.percentage,
        submittedAt: attempt.submittedAt,
      });
    }

    const { answers } = req.body;
    const answersMap = new Map();
    if (answers && typeof answers === 'object') {
      for (const [qId, opt] of Object.entries(answers)) {
        if (['A', 'B', 'C', 'D'].includes(opt)) {
          answersMap.set(qId, opt);
        }
      }
    }

    const questions = await Question.find({ testId: attempt.testId });
    const result = calculateScore(questions, answersMap);

    const submittedAt = new Date();
    const durationUsedSeconds = Math.floor((submittedAt - attempt.startedAt) / 1000);

    attempt.answers = answersMap;
    attempt.score = result.score;
    attempt.totalMarks = result.totalMarks;
    attempt.correctCount = result.correctCount;
    attempt.wrongCount = result.wrongCount;
    attempt.percentage = result.percentage;
    attempt.submittedAt = submittedAt;
    attempt.durationUsedSeconds = durationUsedSeconds;
    attempt.status = 'submitted';
    await attempt.save();

    res.json({
      attemptId: attempt._id,
      score: attempt.score,
      totalMarks: attempt.totalMarks,
      correctCount: attempt.correctCount,
      wrongCount: attempt.wrongCount,
      percentage: attempt.percentage,
      submittedAt: attempt.submittedAt,
      durationUsedSeconds: attempt.durationUsedSeconds,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.id)
      .populate('testId', 'title durationMinutes')
      .populate('subjectId', 'name');
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
    res.json(attempt);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
