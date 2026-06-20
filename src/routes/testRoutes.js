const express = require('express');
const Test = require('../models/Test');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');
const authMiddleware = require('../middleware/authMiddleware');

async function getQuestionsForTest(req, res) {
  try {
    const adminView = req.query.admin === 'true';
    const questions = await Question.find({ testId: req.params.testId }).sort({ createdAt: 1 });
    if (adminView) return res.json(questions);
    const safe = questions.map((q) => ({
      _id: q._id,
      questionText: q.questionText,
      options: q.options,
      marks: q.marks,
    }));
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

const router = express.Router();

async function enrichTests(tests, includeQuestionCount = false) {
  if (!includeQuestionCount) return tests;
  return Promise.all(
    tests.map(async (t) => {
      const obj = t.toObject ? t.toObject() : { ...t };
      obj.questionCount = await Question.countDocuments({ testId: t._id });
      return obj;
    })
  );
}

router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.active === 'true') filter.isActive = true;
    if (req.query.subjectId) filter.subjectId = req.query.subjectId;

    let tests = await Test.find(filter)
      .populate('subjectId', 'name isActive')
      .sort({ createdAt: -1 });

    const withCount = req.query.withCount === 'true';
    if (withCount) {
      tests = await enrichTests(tests, true);
    }

    res.json(tests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:testId/questions', getQuestionsForTest);

router.get('/:id', async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).populate('subjectId', 'name isActive');
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const questionCount = await Question.countDocuments({ testId: test._id });
    const obj = test.toObject();
    obj.questionCount = questionCount;
    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { subjectId, title, description, durationMinutes, totalMarks, passingMarks, isActive } = req.body;
    if (!subjectId || !title || !durationMinutes) {
      return res.status(400).json({ error: 'subjectId, title, and durationMinutes are required' });
    }
    const test = await Test.create({
      subjectId,
      title: String(title).trim(),
      description: description || '',
      durationMinutes: Number(durationMinutes),
      totalMarks: Number(totalMarks) || 0,
      passingMarks: Number(passingMarks) || 0,
      isActive: isActive !== false,
    });
    res.status(201).json(test);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { subjectId, title, description, durationMinutes, totalMarks, passingMarks, isActive } = req.body;
    const update = { updatedAt: Date.now() };
    if (subjectId !== undefined) update.subjectId = subjectId;
    if (title !== undefined) update.title = String(title).trim();
    if (description !== undefined) update.description = description;
    if (durationMinutes !== undefined) update.durationMinutes = Number(durationMinutes);
    if (totalMarks !== undefined) update.totalMarks = Number(totalMarks);
    if (passingMarks !== undefined) update.passingMarks = Number(passingMarks);
    if (isActive !== undefined) update.isActive = isActive;

    const test = await Test.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!test) return res.status(404).json({ error: 'Test not found' });
    res.json(test);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const test = await Test.findByIdAndDelete(req.params.id);
    if (!test) return res.status(404).json({ error: 'Test not found' });
    await Question.deleteMany({ testId: test._id });
    await Attempt.deleteMany({ testId: test._id });
    res.json({ message: 'Test and related data deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
