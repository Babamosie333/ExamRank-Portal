const express = require('express');
const Subject = require('../models/Subject');
const Test = require('../models/Test');
const Question = require('../models/Question');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const activeOnly = req.query.active === 'true';
    const filter = activeOnly ? { isActive: true } : {};
    const subjects = await Subject.find(filter).sort({ name: 1 });
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, icon, color, isActive } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Subject name is required' });
    }
    const subject = await Subject.create({
      name: String(name).trim(),
      description: description || '',
      icon: icon || '📚',
      color: color || '#4f46e5',
      isActive: isActive !== false,
    });
    res.status(201).json(subject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { name, description, icon, color, isActive } = req.body;
    const update = { updatedAt: Date.now() };
    if (name !== undefined) update.name = String(name).trim();
    if (description !== undefined) update.description = description;
    if (icon !== undefined) update.icon = icon;
    if (color !== undefined) update.color = color;
    if (isActive !== undefined) update.isActive = isActive;

    const subject = await Subject.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    res.json(subject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const tests = await Test.find({ subjectId: subject._id });
    const testIds = tests.map((t) => t._id);
    await Test.deleteMany({ subjectId: subject._id });
    await Question.deleteMany({ subjectId: subject._id });

    res.json({ message: 'Subject and related data deleted', testIds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
