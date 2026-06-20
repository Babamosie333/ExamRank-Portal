const mongoose = require('mongoose');

const answerDetailSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  selectedOption: { type: String, enum: ['A', 'B', 'C', 'D', ''], default: '' },
  isCorrect: { type: Boolean, default: false },
  correctOption: { type: String, enum: ['A', 'B', 'C', 'D'] },
  questionText: String,
  options: mongoose.Schema.Types.Mixed,
  marks: Number,
  explanation: String,
}, { _id: false });

const attemptSchema = new mongoose.Schema({
  testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  studentName: { type: String, trim: true },
  studentMobile: { type: String, trim: true },
  passed: { type: Boolean, default: false },
  answerDetails: [answerDetailSchema],
  answers: {
    type: Map,
    of: String,
    default: {},
  },
  score: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 0 },
  correctCount: { type: Number, default: 0 },
  wrongCount: { type: Number, default: 0 },
  percentage: { type: Number, default: 0 },
  startedAt: { type: Date, default: Date.now },
  submittedAt: { type: Date },
  durationUsedSeconds: { type: Number, default: 0 },
  status: { type: String, enum: ['in_progress', 'submitted'], default: 'in_progress' },
});

module.exports = mongoose.model('Attempt', attemptSchema);
