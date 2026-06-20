(async function () {
  if (!requireStudent()) return;

  const alertEl = document.getElementById('alert');
  const summaryEl = document.getElementById('resultSummary');
  const reviewEl = document.getElementById('answerReview');
  const attemptId = getQueryParam('attemptId');

  try {
    let result = null;
    try {
      const cached = sessionStorage.getItem('lastResult');
      if (cached) result = JSON.parse(cached);
    } catch {
      result = null;
    }

    if (!result && attemptId) {
      result = await apiRequest(`/api/results/student/${attemptId}`);
    }

    if (!result) {
      alertEl.innerHTML = '<div class="alert alert-error">Result not found. Please check your exam history.</div>';
      return;
    }

    const badgeClass = result.passed ? 'badge-pass' : 'badge-fail';
    const badgeText = result.passed ? 'PASS' : 'FAIL';

    summaryEl.innerHTML = `
      <h1>${result.chapter || result.chapterTitle || 'Exam Result'}</h1>
      <p class="result-subject">${result.subject || result.subjectName || ''}</p>
      <div class="result-score-card">
        <div class="score-main">
          <strong>${result.obtainedMarks}</strong> / ${result.totalMarks}
          <span>marks</span>
        </div>
        <div class="score-side">
          <span class="result-percent">${result.percentage}%</span>
          <span class="result-badge ${badgeClass}">${badgeText}</span>
          <span class="result-time">Time: ${formatDuration(result.timeTakenSeconds || 0)}</span>
        </div>
      </div>`;

    const details = result.answerDetails || [];
    reviewEl.innerHTML = `
      <h2>Answer Review</h2>
      ${details
        .map((d, i) => {
          const cls = d.isCorrect ? 'review-correct' : 'review-wrong';
          const selected = d.selectedOption || 'Not answered';
          return `
          <article class="review-item ${cls}">
            <h3>Q${i + 1}. ${d.questionText}</h3>
            <p><strong>Your answer:</strong> ${selected}${d.selectedOption ? `. ${d.options?.[d.selectedOption] || ''}` : ''}</p>
            <p><strong>Correct answer:</strong> ${d.correctOption}. ${d.options?.[d.correctOption] || ''}</p>
            ${d.explanation ? `<p class="review-explanation">${d.explanation}</p>` : ''}
          </article>`;
        })
        .join('')}`;
  } catch (err) {
    console.error('Result page error:', err);
    alertEl.innerHTML = `<div class="alert alert-error">Could not load your result: ${err.message || 'Unknown error'}. Please check "My Results" from the dashboard.</div>`;
  }
})();
