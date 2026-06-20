const XLSX = require('xlsx');
const Subject = require('../models/Subject');
const Test = require('../models/Test');
const Question = require('../models/Question');

const REQUIRED_COLUMNS = [
  'subject',
  'test_title',
  'question',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct_option',
  'marks',
];

function normalizeKey(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

function parseRow(rawRow) {
  const row = {};
  for (const [k, v] of Object.entries(rawRow)) {
    row[normalizeKey(k)] = v;
  }
  return row;
}

function validateRow(row, rowIndex) {
  const errors = [];
  for (const col of REQUIRED_COLUMNS) {
    const val = row[col];
    if (val === undefined || val === null || String(val).trim() === '') {
      errors.push(`Missing required field: ${col}`);
    }
  }
  const correct = String(row.correct_option || '')
    .trim()
    .toUpperCase();
  if (!['A', 'B', 'C', 'D'].includes(correct)) {
    errors.push('correct_option must be A, B, C, or D');
  }
  const marks = Number(row.marks);
  if (Number.isNaN(marks) || marks < 0) {
    errors.push('marks must be a non-negative number');
  }
  return { valid: errors.length === 0, errors, correct, marks };
}

async function getOrCreateSubject(name) {
  const trimmed = name.trim();
  let subject = await Subject.findOne({ name: new RegExp(`^${trimmed}$`, 'i') });
  if (!subject) {
    subject = await Subject.create({ name: trimmed, description: '', isActive: true });
  }
  return subject;
}

async function getOrCreateTest(subjectId, title) {
  const trimmed = title.trim();
  let test = await Test.findOne({
    subjectId,
    title: new RegExp(`^${trimmed}$`, 'i'),
  });
  if (!test) {
    test = await Test.create({
      subjectId,
      title: trimmed,
      description: '',
      durationMinutes: 30,
      isActive: true,
    });
  }
  return test;
}

async function importFromBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { successCount: 0, failedRows: [{ row: 0, errors: ['Excel file has no sheets'] }] };
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const successRows = [];
  const failedRows = [];

  for (let i = 0; i < rawRows.length; i++) {
    const rowNum = i + 2;
    const row = parseRow(rawRows[i]);
    const { valid, errors, correct, marks } = validateRow(row, rowNum);

    if (!valid) {
      failedRows.push({ row: rowNum, errors });
      continue;
    }

    try {
      const subject = await getOrCreateSubject(String(row.subject));
      const test = await getOrCreateTest(subject._id, String(row.test_title));

      const question = await Question.create({
        testId: test._id,
        subjectId: subject._id,
        questionText: String(row.question).trim(),
        options: {
          A: String(row.option_a).trim(),
          B: String(row.option_b).trim(),
          C: String(row.option_c).trim(),
          D: String(row.option_d).trim(),
        },
        correctOption: correct,
        marks,
      });

      successRows.push({ row: rowNum, questionId: question._id });
    } catch (err) {
      failedRows.push({ row: rowNum, errors: [err.message] });
    }
  }

  return {
    successCount: successRows.length,
    failedCount: failedRows.length,
    totalRows: rawRows.length,
    failedRows,
  };
}

module.exports = { importFromBuffer, REQUIRED_COLUMNS };
