(async function () {
  await requireAuth();
  const testSelect = document.getElementById('testSelect');
  const questionsList = document.getElementById('questionsList');
  const modal = document.getElementById('modal');
  const alertEl = document.getElementById('alert');
  const addBtn = document.getElementById('addBtn');
  let questions = [];
  let currentTest = null;

  async function loadTests() {
    const tests = await apiRequest('/api/tests');
    testSelect.innerHTML =
      '<option value="">-- Select test --</option>' +
      tests.map((t) => `<option value="${t._id}">${t.title}</option>`).join('');

    const preselect = getQueryParam('testId');
    if (preselect) {
      testSelect.value = preselect;
      loadQuestions();
    }
  }

  async function loadQuestions() {
    const testId = testSelect.value;
    if (!testId) {
      questionsList.innerHTML = '<p class="empty-state">Select a test to manage questions</p>';
      addBtn.disabled = true;
      return;
    }
    addBtn.disabled = false;
    currentTest = await apiRequest(`/api/tests/${testId}`);
    questions = await apiRequest(`/api/tests/${testId}/questions?admin=true`);

    questionsList.innerHTML =
      questions.length > 0
        ? questions
            .map(
              (q, i) => `
        <div class="question-block">
          <h4>Q${i + 1}. ${q.questionText}</h4>
          <p style="color:var(--muted);font-size:0.9rem;">
            A: ${q.options.A} | B: ${q.options.B} | C: ${q.options.C} | D: ${q.options.D}<br>
            Correct: <strong>${q.correctOption}</strong> | Marks: ${q.marks}
          </p>
          <div class="table-actions" style="margin-top:0.75rem;">
            <button class="btn btn-secondary btn-sm" data-edit="${q._id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-delete="${q._id}">Delete</button>
          </div>
        </div>`
            )
            .join('')
        : '<p class="empty-state">No questions for this test</p>';

    questionsList.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => openEdit(btn.dataset.edit));
    });
    questionsList.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => deleteQuestion(btn.dataset.delete));
    });
  }

  function openAdd() {
    document.getElementById('modalTitle').textContent = 'Add Question';
    document.getElementById('questionId').value = '';
    document.getElementById('questionForm').reset();
    document.getElementById('marks').value = 1;
    modal.classList.remove('hidden');
  }

  function openEdit(id) {
    const q = questions.find((x) => x._id === id);
    if (!q) return;
    document.getElementById('modalTitle').textContent = 'Edit Question';
    document.getElementById('questionId').value = q._id;
    document.getElementById('questionText').value = q.questionText;
    document.getElementById('optA').value = q.options.A;
    document.getElementById('optB').value = q.options.B;
    document.getElementById('optC').value = q.options.C;
    document.getElementById('optD').value = q.options.D;
    document.getElementById('correctOption').value = q.correctOption;
    document.getElementById('marks').value = q.marks;
    modal.classList.remove('hidden');
  }

  async function deleteQuestion(id) {
    if (!confirm('Delete this question?')) return;
    try {
      await apiRequest(`/api/questions/${id}`, { method: 'DELETE' });
      showAlert(alertEl, 'Question deleted', 'success');
      loadQuestions();
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  }

  testSelect.addEventListener('change', loadQuestions);
  addBtn.addEventListener('click', openAdd);
  document.getElementById('cancelBtn').addEventListener('click', () => modal.classList.add('hidden'));

  document.getElementById('questionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('questionId').value;
    const body = {
      testId: testSelect.value,
      subjectId: currentTest?.subjectId?._id || currentTest?.subjectId,
      questionText: document.getElementById('questionText').value,
      options: {
        A: document.getElementById('optA').value,
        B: document.getElementById('optB').value,
        C: document.getElementById('optC').value,
        D: document.getElementById('optD').value,
      },
      correctOption: document.getElementById('correctOption').value,
      marks: Number(document.getElementById('marks').value),
    };
    try {
      if (id) {
        await apiRequest(`/api/questions/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await apiRequest('/api/questions', { method: 'POST', body: JSON.stringify(body) });
      }
      modal.classList.add('hidden');
      showAlert(alertEl, 'Question saved', 'success');
      loadQuestions();
    } catch (err) {
      showAlert(alertEl, err.message);
    }
  });

  loadTests();
})();
