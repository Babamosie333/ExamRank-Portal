const express = require('express');
const multer = require('multer');
const Question = require('../models/Question');
const Test = require('../models/Test');
const authMiddleware = require('../middleware/authMiddleware');
const { importFromBuffer } = require('../services/excelImportService');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function validateOptions(options) {
  if (!options || !options.A || !options.B || !options.C || !options.D) {
    return 'All four options (A, B, C, D) are required';
  }
  return null;
}

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { testId, subjectId, questionText, options, correctOption, marks, explanation } = req.body;
    const optErr = validateOptions(options);
    if (!testId || !questionText || optErr) {
      return res.status(400).json({ error: optErr || 'testId and questionText are required' });
    }
    if (!['A', 'B', 'C', 'D'].includes(correctOption)) {
      return res.status(400).json({ error: 'correctOption must be A, B, C, or D' });
    }

    let subId = subjectId;
    if (!subId) {
      const test = await Test.findById(testId);
      if (!test) return res.status(404).json({ error: 'Test not found' });
      subId = test.subjectId;
    }

    const question = await Question.create({
      testId,
      subjectId: subId,
      questionText: String(questionText).trim(),
      options,
      correctOption,
      marks: marks ?? 1,
      explanation: explanation || '',
    });
    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { questionText, options, correctOption, marks, explanation } = req.body;
    const update = { updatedAt: Date.now() };
    if (questionText !== undefined) update.questionText = String(questionText).trim();
    if (explanation !== undefined) update.explanation = explanation;
    if (options !== undefined) {
      const optErr = validateOptions(options);
      if (optErr) return res.status(400).json({ error: optErr });
      update.options = options;
    }
    if (correctOption !== undefined) {
      if (!['A', 'B', 'C', 'D'].includes(correctOption)) {
        return res.status(400).json({ error: 'correctOption must be A, B, C, or D' });
      }
      update.correctOption = correctOption;
    }
    if (marks !== undefined) update.marks = Number(marks);

    const question = await Question.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!question) return res.status(404).json({ error: 'Question not found' });
    res.json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ error: 'Question not found' });
    res.json({ message: 'Question deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/import-excel', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Excel file is required' });
    }
    const result = await importFromBuffer(req.file.buffer);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
