(async function () {
  if (!requireStudent()) return;

  const listEl = document.getElementById('historyList');
  const alertEl = document.getElementById('alert');

  try {
    const results = await apiRequest('/api/results/student');
    if (!results.length) {
      listEl.innerHTML = '<p class="empty-state">No exam attempts yet.</p>';
      return;
    }

    listEl.innerHTML = results
      .map(
        (r) => `
      <a class="history-item" href="/result.html?attemptId=${r.id}">
        <div>
          <strong>${r.chapter}</strong>
          <span>${r.subject}</span>
        </div>
        <div class="history-score">
          <span>${r.obtainedMarks}/${r.totalMarks} (${r.percentage}%)</span>
          <span class="result-badge ${r.passed ? 'badge-pass' : 'badge-fail'}">${r.passed ? 'PASS' : 'FAIL'}</span>
        </div>
        <time>${formatDate(r.date)}</time>
      </a>`
      )
      .join('');
  } catch (err) {
    alertEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
})();
