(function () {
  const testId = getQueryParam('id');
  if (!testId) {
    window.location.href = '/tests.html';
    return;
  }

  const startSection = document.getElementById('startSection');
  const examSection = document.getElementById('examSection');
  const timerBar = document.getElementById('timerBar');
  const timerDisplay = document.getElementById('timerDisplay');
  const alertEl = document.getElementById('alert');
  const questionsContainer = document.getElementById('questionsContainer');

  let test = null;
  let questions = [];
  let attemptId = null;
  let endTime = null;
  let timerInterval = null;
  let submitting = false;
  const answers = {};

async function loadTestInfo() {
  test = await apiRequest(`/api/tests/${testId}`);
  if (!test.isActive) throw new Error('This test is not available');

  const testTitleEl = document.getElementById('testTitle');
  const testMetaEl = document.getElementById('testMeta');

  if (testTitleEl) testTitleEl.textContent = test.title;
  if (testMetaEl) {
    testMetaEl.textContent = `Duration: ${test.durationMinutes} min | Questions: ${test.questionCount || 0}`;
  }
}


  function renderQuestions() {
    questionsContainer.innerHTML = questions
      .map((q, i) => {
        const opts = ['A', 'B', 'C', 'D']
          .map(
            (key) => `
          <label>
            <input type="radio" name="q_${q._id}" value="${key}" data-qid="${q._id}">
            <strong>${key}.</strong> ${q.options[key]}
          </label>`
          )
          .join('');
        return `
        <div class="question-block">
          <h4>Question ${i + 1} (${q.marks} mark${q.marks !== 1 ? 's' : ''})</h4>
          <p style="margin-bottom:1rem;">${q.questionText}</p>
          <div class="options-list">${opts}</div>
        </div>`;
      })
      .join('');

    questionsContainer.querySelectorAll('input[type=radio]').forEach((input) => {
      input.addEventListener('change', () => {
        answers[input.dataset.qid] = input.value;
      });
    });
  }

  function updateTimer() {
    const remaining = endTime - Date.now();
    if (remaining <= 0) {
      timerDisplay.textContent = '00:00';
      timerBar.classList.add('danger');
      submitTest(true);
      return;
    }

    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (remaining < 60000) timerBar.classList.add('danger');
    else if (remaining < 300000) timerBar.classList.add('warning');
  }

  async function submitTest(auto = false) {
    if (submitting) return;
    submitting = true;
    clearInterval(timerInterval);

    if (!auto && !confirm('Submit your test now?')) {
      submitting = false;
      timerInterval = setInterval(updateTimer, 1000);
      return;
    }

    try {
      const result = await apiRequest(`/api/attempts/${attemptId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      });
      sessionStorage.setItem('lastResult', JSON.stringify(result));
      window.location.href = `/result.html?attemptId=${attemptId}`;
    } catch (err) {
      submitting = false;
      alertEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
      timerInterval = setInterval(updateTimer, 1000);
    }
  }

  document.getElementById('startForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    alertEl.innerHTML = '';
    try {
      const startData = await apiRequest('/api/attempts/start', {
        method: 'POST',
        body: JSON.stringify({
          testId,
          studentName: document.getElementById('studentName').value,
          studentMobile: document.getElementById('studentMobile').value,
        }),
      });

      attemptId = startData.attemptId;
      questions = await apiRequest(`/api/tests/${testId}/questions`);
      if (questions.length === 0) throw new Error('No questions in this test');

      startSection.classList.add('hidden');
      examSection.classList.remove('hidden');
      timerBar.classList.remove('hidden');

      renderQuestions();
      endTime = Date.now() + startData.durationMinutes * 60 * 1000;
      timerInterval = setInterval(updateTimer, 1000);
      updateTimer();
    } catch (err) {
      alertEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
    }
  });

  document.getElementById('submitBtn').addEventListener('click', () => submitTest(false));
  document.getElementById('submitBtnBottom').addEventListener('click', () => submitTest(false));

  loadTestInfo().catch((err) => {
    alertEl.innerHTML = `<div class="alert alert-error">${err.message}</div>`;
  });
})();
