(async function () {
  if (!requireStudent()) return;

  const student = getStudent();
  document.getElementById('welcomeText').textContent = `Welcome, ${student?.name || 'Student'}`;
  document.getElementById('logoutBtn').addEventListener('click', logoutStudent);

  const grid = document.getElementById('subjectsGrid');
  const alertEl = document.getElementById('alert');

  try {
    const [subjects, tests] = await Promise.all([
      apiRequest('/api/subjects?active=true'),
      apiRequest('/api/tests?active=true&withCount=true'),
    ]);

    const countBySubject = {};
    tests.forEach((t) => {
      const sid = t.subjectId?._id || t.subjectId;
      countBySubject[sid] = (countBySubject[sid] || 0) + 1;
    });

    if (!subjects.length) {
      grid.innerHTML = '<p class="empty-state">No subjects available yet.</p>';
      return;
    }

    grid.innerHTML = subjects
      .map(
        (s) => `
      <a class="subject-card" href="/tests.html?subjectId=${s._id}" style="--subject-color:${s.color || '#4f46e5'}">
        <span class="subject-icon">${s.icon || '📚'}</span>
        <h3>${s.name}</h3>
        <p>${s.description || 'Practice tests'}</p>
        <span class="subject-meta">${countBySubject[s._id] || 0} test(s)</span>
      </a>`
      )
      .join('');
  } catch (err) {
    alertEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  }
})();
