(async function () {
  if (!requireStudent()) return;

  const subjectId = getQueryParam('subjectId');
  if (!subjectId) {
    window.location.href = '/dashboard.html';
    return;
  }

  const grid = document.getElementById('testsGrid');
  const alertEl = document.getElementById('alert');

  try {
    const [subjects, tests] = await Promise.all([
      apiRequest('/api/subjects?active=true'),
      apiRequest(`/api/tests?active=true&subjectId=${subjectId}&withCount=true`),
    ]);

    const subject = subjects.find((s) => s._id === subjectId);
    if (subject) {
      document.getElementById('pageTitle').textContent = `${subject.name} Tests`;
      document.getElementById('pageSubtitle').textContent = subject.description || 'Select a chapter to start.';
    }

    if (!tests.length) {
      grid.innerHTML = '<p class="empty-state">No active tests for this subject.</p>';
      return;
    }

    grid.innerHTML = tests
      .map((t) => {
        const total = t.totalMarks || 0;
        const disabled = !t.isActive;
        return `
        <article class="test-card">
          <h3>${t.title}</h3>
          <ul class="test-meta-list">
            <li>Duration: ${t.durationMinutes} min</li>
            <li>Questions: ${t.questionCount || 0}</li>
            <li>Total marks: ${total}</li>
          </ul>
          <button class="btn btn-primary btn-block" data-id="${t._id}" ${disabled ? 'disabled' : ''}>
            ${disabled ? 'Inactive' : 'Start Test'}
          </button>
        </article>`;
      })
      .join('');

    grid.querySelectorAll('button[data-id]:not([disabled])').forEach((btn) => {
      btn.addEventListener('click', () => {
        window.location.href = `/exam.html?chapterId=${btn.dataset.id}`;
      });
    });
  } catch (err) {
    alertEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
})();
