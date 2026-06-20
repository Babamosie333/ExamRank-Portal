function normalizeAnswers(answers) {
  const map = new Map();
  if (!answers) return map;
  if (answers instanceof Map) return answers;
  if (typeof answers === 'object') {
    for (const [qId, opt] of Object.entries(answers)) {
      if (['A', 'B', 'C', 'D'].includes(opt)) map.set(qId, opt);
    }
  }
  return map;
}

function calculateScore(questions, answersInput, passingMarks = 0) {
  const answersMap = normalizeAnswers(answersInput);
  let obtainedMarks = 0;
  let totalMarks = 0;
  let correctCount = 0;
  let wrongCount = 0;
  const answerDetails = [];

  for (const q of questions) {
    const marks = q.marks || 0;
    totalMarks += marks;
    const qId = q._id.toString();
    const selected = answersMap.get(qId) || '';
    const isCorrect = selected === q.correctOption;

    if (isCorrect) {
      obtainedMarks += marks;
      correctCount += 1;
    } else {
      wrongCount += 1;
    }

    answerDetails.push({
      questionId: q._id,
      selectedOption: selected,
      isCorrect,
      correctOption: q.correctOption,
      questionText: q.questionText,
      options: q.options,
      marks,
      explanation: q.explanation || '',
    });
  }

  const percentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 10000) / 100 : 0;
  const passed = obtainedMarks >= passingMarks;

  return {
    score: obtainedMarks,
    obtainedMarks,
    totalMarks,
    correctCount,
    wrongCount,
    percentage,
    passed,
    answerDetails,
  };
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

module.exports = { calculateScore, shuffleArray, normalizeAnswers };
