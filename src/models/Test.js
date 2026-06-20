const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  durationMinutes: { type: Number, required: true, min: 1 },
  totalMarks: { type: Number, default: 0 },
  passingMarks: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

testSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Test', testSchema);
