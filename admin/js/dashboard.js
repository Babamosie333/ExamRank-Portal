(async function () {
  const admin = await requireAuth();
  if (!admin) return;

  document.getElementById('adminUser').textContent = admin.username;
  document.getElementById('logoutBtn').addEventListener('click', logout);

  const stats = await apiRequest('/api/admin/stats');
  const colors = ['#4f7cff', '#16a34a', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  document.getElementById('statsGrid').innerHTML = [
    { label: 'Students Registered', value: stats.totalStudents },
    { label: 'Tests Today', value: stats.testsToday },
    { label: 'Tests This Week', value: stats.testsThisWeek },
    { label: 'Subjects', value: stats.totalSubjects },
    { label: 'Chapters', value: stats.totalChapters },
    { label: 'Questions', value: stats.totalQuestions },
  ]
    .map(
      (s, i) => `
    <div class="stat-card" style="border-top:4px solid ${colors[i % colors.length]}">
      <div class="value">${s.value ?? 0}</div>
      <div class="label">${s.label}</div>
    </div>`
    )
    .join('');

  const recentBody = document.querySelector('#recentTable tbody');
  const rows = stats.recentResults || stats.recentAttempts || [];

  recentBody.innerHTML =
    rows.length > 0
      ? rows
          .map((a) => {
            const subj = a.subjectId?.name || '-';
            const test = a.testId?.title || '-';
            const pass = a.passed ? 'Pass' : 'Fail';
            return `
      <tr>
        <td>${a.studentName || '-'}</td>
        <td>${a.studentId?.email || '-'}</td>
        <td>${subj}</td>
        <td>${test}</td>
        <td>${a.score}/${a.totalMarks} (${a.percentage}%)</td>
        <td><span class="badge ${a.passed ? 'badge-active' : 'badge-inactive'}">${pass}</span></td>
      </tr>`;
          })
          .join('')
      : '<tr><td colspan="6">No results yet</td></tr>';
})();
