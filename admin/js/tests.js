(async function () {
  await requireAuth();
  const tableBody = document.getElementById('tableBody');
  const modal = document.getElementById('modal');
  const alertEl = document.getElementById('alert');
  let tests = [];
  let subjects = [];

  async function loadSubjects() {
    subjects = await apiRequest('/api/subjects');
    const sel = document.getElementById('subjectId');
    sel.innerHTML = subjects.map((s) => `<option value="${s._id}">${s.name}</option>`).join('');
  }

  async function load() {
    tests = await apiRequest('/api/tests?withCount=true');
    tableBody.innerHTML =
      tests.length > 0
        ? tests
            .map((t) => {
              const subj = t.subjectId?.name || subjects.find((s) => s._id === t.subjectId)?.name || '-';
              return `
      <tr>
        <td>${t.title}</td>
        <td>${subj}</td>
        <td>${t.durationMinutes} min</td>
        <td>${t.questionCount ?? 0}</td>
        <td><span class="badge ${t.isActive ? 'badge-active' : 'badge-inactive'}">${t.isActive ? 'Active' : 'Inactive'}</span></td>
        <td class="table-actions">
          <a class="btn btn-secondary btn-sm" href="/admin/questions.html?testId=${t._id}">Questions</a>
          <button class="btn btn-secondary btn-sm" data-edit="${t._id}">Edit</button>
          <button class="btn btn-danger btn-sm" data-delete="${t._id}">Delete</button>
        </td>
      </tr>`;
            })
            .join('')
        : '<tr><td colspan="6">No tests yet</td></tr>';

    tableBody.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => openEdit(btn.dataset.edit));
    });
    tableBody.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => deleteTest(btn.dataset.delete));
    });
  }

  function openAdd() {
    document.getElementById('modalTitle').textContent = 'Add Test';
    document.getElementById('testId').value = '';
    document.getElementById('title').value = '';
    document.getElementById('description').value = '';
    document.getElementById('durationMinutes').value = 30;
    document.getElementById('totalMarks').value = 0;
    document.getElementById('passingMarks').value = 0;
    document.getElementById('isActive').checked = true;
    modal.classList.remove('hidden');
  }

  function openEdit(id) {
    const t = tests.find((x) => x._id === id);
    if (!t) return;
    document.getElementById('modalTitle').textContent = 'Edit Test';
    document.getElementById('testId').value = t._id;
    document.getElementById('subjectId').value = t.subjectId?._id || t.subjectId;
    document.getElementById('title').value = t.title;
    document.getElementById('description').value = t.description || '';
    document.getElementById('durationMinutes').value = t.durationMinutes;
    document.getElementById('totalMarks').value = t.totalMarks || 0;
    document.getElementById('passingMarks').value = t.passingMarks || 0;
    document.getElementById('isActive').checked = t.isActive;
    modal.classList.remove('hidden');
  }

  async function deleteTest(id) {
    if (!confirm('Delete this test and all its questions/attempts?')) return;
    try {
      await apiRequest(`/api/tests/${id}`, { method: 'DELETE' });
      showAlert(alertEl, 'Test deleted', 'success');
      load();
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  }

  document.getElementById('addBtn').addEventListener('click', openAdd);
  document.getElementById('cancelBtn').addEventListener('click', () => modal.classList.add('hidden'));

  document.getElementById('testForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('testId').value;
    const body = {
      subjectId: document.getElementById('subjectId').value,
      title: document.getElementById('title').value,
      description: document.getElementById('description').value,
      durationMinutes: Number(document.getElementById('durationMinutes').value),
      totalMarks: Number(document.getElementById('totalMarks').value),
      passingMarks: Number(document.getElementById('passingMarks').value),
      isActive: document.getElementById('isActive').checked,
    };
    try {
      if (id) {
        await apiRequest(`/api/tests/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await apiRequest('/api/tests', { method: 'POST', body: JSON.stringify(body) });
      }
      modal.classList.add('hidden');
      showAlert(alertEl, 'Test saved', 'success');
      load();
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  });

  await loadSubjects();
  load();
})();
