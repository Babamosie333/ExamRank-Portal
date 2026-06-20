(function () {
  if (!requireStudent()) return;

  const chapterId = getQueryParam('chapterId');
  if (!chapterId) {
    window.location.href = '/dashboard.html';
    return;
  }

  // ─────────────────────────────────────────────
  //  Config
  // ─────────────────────────────────────────────
  const MAX_VIOLATIONS = 3;   // auto-submit after this many
  const AUTO_SUBMIT_COUNTDOWN = 3; // seconds countdown on final violation

  // ─────────────────────────────────────────────
  //  State
  // ─────────────────────────────────────────────
  let examData      = null;
  let currentIndex  = 0;
  const answers     = {};
  const marked      = new Set();
  let endTime       = null;
  let timerInterval = null;
  let submitting    = false;
  const startedAt   = Date.now();

  let violationCount    = 0;
  let examStarted       = false;   // true after fullscreen is entered
  let fsExitExpected    = false;   // true when WE trigger fullscreen exit (e.g. on submit nav)
  let violationBannerTimer = null;

  // ─────────────────────────────────────────────
  //  DOM refs
  // ─────────────────────────────────────────────
  const examTitle         = document.getElementById('examTitle');
  const examProgress      = document.getElementById('examProgress');
  const timerDisplay      = document.getElementById('timerDisplay');
  const questionNav       = document.getElementById('questionNav');
  const questionArea      = document.getElementById('questionArea');
  const alertEl           = document.getElementById('alert');
  const prevBtn           = document.getElementById('prevBtn');
  const nextBtn           = document.getElementById('nextBtn');
  const markBtn           = document.getElementById('markBtn');
  const submitBtn         = document.getElementById('submitBtn');

  const fsPromptOverlay   = document.getElementById('fsPromptOverlay');
  const enterFsBtn        = document.getElementById('enterFsBtn');
  const violationBanner   = document.getElementById('violationBanner');
  const violationMsg      = document.getElementById('violationMsg');
  const violationCountEl  = document.getElementById('violationCount');
  const autoSubmitOverlay = document.getElementById('autoSubmitOverlay');
  const autoSubmitMsg     = document.getElementById('autoSubmitMsg');
  const autoSubmitTimer   = document.getElementById('autoSubmitTimer');
  const submitConfirmOverlay = document.getElementById('submitConfirmOverlay');
  const cancelSubmitBtn      = document.getElementById('cancelSubmitBtn');
  const confirmSubmitBtn     = document.getElementById('confirmSubmitBtn');

  // ─────────────────────────────────────────────
  //  Fullscreen helpers
  // ─────────────────────────────────────────────
  function enterFullscreen() {
    const el = document.documentElement;
    if (el.requestFullscreen)            return el.requestFullscreen();
    if (el.webkitRequestFullscreen)      return el.webkitRequestFullscreen();
    if (el.mozRequestFullScreen)         return el.mozRequestFullScreen();
    if (el.msRequestFullscreen)          return el.msRequestFullscreen();
    return Promise.resolve(); // fallback: just proceed
  }

  function exitFullscreen() {
    if (document.exitFullscreen)         return document.exitFullscreen();
    if (document.webkitExitFullscreen)   return document.webkitExitFullscreen();
    if (document.mozCancelFullScreen)    return document.mozCancelFullScreen();
    if (document.msExitFullscreen)       return document.msExitFullscreen();
    return Promise.resolve();
  }

  function isFullscreen() {
    return !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }

  // ─────────────────────────────────────────────
  //  Violation system
  // ─────────────────────────────────────────────
  function showViolationBanner(msg) {
    violationCount++;
    const remaining = MAX_VIOLATIONS - violationCount;

    violationMsg.textContent = `⚠️ ${msg}`;
    violationCountEl.textContent =
      remaining > 0
        ? `Violation ${violationCount}/${MAX_VIOLATIONS} — ${remaining} more will auto-submit`
        : '';
    violationBanner.classList.remove('hidden');

    // dismiss banner after 4 s
    clearTimeout(violationBannerTimer);
    violationBannerTimer = setTimeout(() => {
      violationBanner.classList.add('hidden');
    }, 4000);

    if (violationCount >= MAX_VIOLATIONS) {
      triggerAutoSubmit();
    }
  }

  function triggerAutoSubmit() {
    clearInterval(timerInterval);
    violationBanner.classList.add('hidden');
    autoSubmitOverlay.classList.remove('hidden');

    let countdown = AUTO_SUBMIT_COUNTDOWN;
    autoSubmitTimer.textContent = countdown;
    autoSubmitMsg.textContent =
      `You have violated exam rules ${MAX_VIOLATIONS} times. Your exam is being submitted automatically.`;

    const cdInterval = setInterval(() => {
      countdown--;
      autoSubmitTimer.textContent = countdown;
      if (countdown <= 0) {
        clearInterval(cdInterval);
        fsExitExpected = true;
        exitFullscreen().catch(() => {});
        submitExam(true);
      }
    }, 1000);
  }

  // ─────────────────────────────────────────────
  //  Security monitors  (only active after exam starts)
  // ─────────────────────────────────────────────

  // 1. Tab / window visibility
  document.addEventListener('visibilitychange', () => {
    if (!examStarted || submitting) return;
    if (document.hidden) {
      showViolationBanner('Tab switch or window minimise detected!');
    }
  });

  // 2. Fullscreen exit
  document.addEventListener('fullscreenchange',       onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  document.addEventListener('mozfullscreenchange',    onFsChange);
  document.addEventListener('MSFullscreenChange',     onFsChange);

  function onFsChange() {
    if (!examStarted || submitting || fsExitExpected) return;
    if (!isFullscreen()) {
      showViolationBanner('Fullscreen exit detected!');
      // try to re-enter fullscreen immediately
      enterFullscreen().catch(() => {});
    }
  }

  // 3. Window resize (catches F11 exit on some browsers, split-screen, devtools)
  let lastW = window.innerWidth;
  let lastH = window.innerHeight;
  window.addEventListener('resize', () => {
    if (!examStarted || submitting) return;
    const dw = Math.abs(window.innerWidth  - lastW);
    const dh = Math.abs(window.innerHeight - lastH);
    // Only flag significant resizes (> 50px) to avoid false positives from
    // virtual keyboard on mobile or minor browser chrome changes
    if (dw > 50 || dh > 50) {
      lastW = window.innerWidth;
      lastH = window.innerHeight;
      showViolationBanner('Window resize detected!');
    }
  });

  // 4. Block right-click
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // 5. Block common keyboard shortcuts (PrintScreen, Alt+Tab hint, F12)
  document.addEventListener('keydown', (e) => {
    if (!examStarted || submitting) return;
    const blocked =
      e.key === 'PrintScreen' ||
      e.key === 'F12' ||
      (e.altKey  && e.key === 'Tab') ||
      (e.metaKey && e.key === 'Tab') ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'));
    if (blocked) {
      e.preventDefault();
      showViolationBanner('Restricted key detected!');
    }
  });

  // ─────────────────────────────────────────────
  //  Enter fullscreen button
  // ─────────────────────────────────────────────
  enterFsBtn.addEventListener('click', () => {
    enterFullscreen()
      .then(() => {
        fsPromptOverlay.classList.add('hidden');
        examStarted = true;
        lastW = window.innerWidth;
        lastH = window.innerHeight;
      })
      .catch(() => {
        // Browser blocked fullscreen (e.g. no user gesture) — proceed anyway
        fsPromptOverlay.classList.add('hidden');
        examStarted = true;
      });
  });

  // ─────────────────────────────────────────────
  //  Timer
  // ─────────────────────────────────────────────
  function updateTimer() {
    const remaining = endTime - Date.now();
    if (remaining <= 0) {
      timerDisplay.textContent = '00:00';
      timerDisplay.classList.remove('warning');
      timerDisplay.classList.add('danger');
      submitExam(true);
      return;
    }
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    timerDisplay.classList.toggle('warning', remaining < 300000 && remaining >= 60000);
    timerDisplay.classList.toggle('danger',  remaining < 60000);
  }

  // ─────────────────────────────────────────────
  //  Render helpers
  // ─────────────────────────────────────────────
  function renderNav() {
    questionNav.innerHTML = examData.questions
      .map((q, i) => {
        const answered = answers[q._id];
        const review   = marked.has(q._id);
        const active   = i === currentIndex ? 'active' : '';
        const status   = answered ? 'answered' : review ? 'review' : '';
        return `<button type="button" class="q-nav-btn ${active} ${status}" data-index="${i}">${i + 1}</button>`;
      })
      .join('');

    questionNav.querySelectorAll('.q-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentIndex = Number(btn.dataset.index);
        renderQuestion();
        renderNav();
      });
    });
  }

  function renderQuestion() {
    const q = examData.questions[currentIndex];
    examProgress.textContent = `Q ${currentIndex + 1}/${examData.questions.length}`;
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === examData.questions.length - 1;
    markBtn.textContent = marked.has(q._id) ? 'Unmark Review' : 'Mark for Review';

    const selected = answers[q._id];
    questionArea.innerHTML = `
      <div class="question-card">
        <p class="question-marks">${q.marks} mark(s)</p>
        <h2>${q.questionText}</h2>
        <div class="option-cards">
          ${['A', 'B', 'C', 'D']
            .map(
              (key) => `
            <label class="option-card ${selected === key ? 'selected' : ''}">
              <input type="radio" name="answer-${q._id}" value="${key}" />
              <span class="option-key">${key}</span>
              <span class="option-text">${q.options[key]}</span>
            </label>`
            )
            .join('')}
        </div>
      </div>`;

    // Set `.checked` as a JS property (not just the HTML attribute) right after
    // insertion. Browsers can be unreliable about honoring a `checked` attribute
    // on radios injected via innerHTML, especially across re-renders. Each
    // question also gets its own unique `name` group (answer-<questionId>) so
    // navigating between questions can never cross-contaminate selections.
    if (selected) {
      const inputToCheck = questionArea.querySelector(`input[value="${selected}"]`);
      if (inputToCheck) inputToCheck.checked = true;
    }

    questionArea.querySelectorAll('input[type=radio]').forEach((input) => {
      input.addEventListener('change', () => {
        answers[q._id] = input.value;
        // Update the .selected highlight class on option cards immediately
        questionArea.querySelectorAll('.option-card').forEach((card) => {
          card.classList.toggle('selected', card.querySelector('input').checked);
        });
        renderNav();
      });
    });
  }

  // ─────────────────────────────────────────────
  //  Submit
  // ─────────────────────────────────────────────
  async function submitExam(auto = false) {
    if (submitting) return;

    if (!auto) {
      // Use an in-page modal instead of window.confirm(). Native confirm()
      // dialogs force the browser to auto-exit fullscreen before they can
      // display, which our fullscreenchange listener picked up as an
      // unexpected violation and left the exam in a broken state on submit.
      // A styled in-page overlay has no such side effect.
      submitConfirmOverlay.classList.remove('hidden');
      return;
    }

    submitting = true;
    clearInterval(timerInterval);

    // Mark fullscreen exit as expected so the fullscreenchange listener
    // doesn't register it as a violation. We fire-and-forget the exit instead
    // of awaiting it — awaiting exitFullscreen() before navigating can hang
    // or race with window.location.href on some browsers (especially over
    // plain HTTP on localhost), which left the result page rendering blank.
    fsExitExpected = true;
    if (isFullscreen()) {
      exitFullscreen().catch(() => {});
    }

    try {
      const timeTakenSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const result = await apiRequest('/api/exam/submit', {
        method: 'POST',
        body: JSON.stringify({
          attemptId: examData.attemptId,
          answers,
          timeTakenSeconds,
        }),
      });
      sessionStorage.setItem('lastResult', JSON.stringify(result));
      window.location.href = `/result.html?attemptId=${examData.attemptId}`;
    } catch (err) {
      submitting = false;
      fsExitExpected = false;
      showError(`${err.message}. Please try again.`);
      timerInterval = setInterval(updateTimer, 1000);
    }
  }

  function showError(msg) {
    alertEl.innerHTML = `<div class="alert alert-error">${msg}</div>`;
  }

  // ─────────────────────────────────────────────
  //  Button wiring
  // ─────────────────────────────────────────────
  markBtn.addEventListener('click', () => {
    const q = examData.questions[currentIndex];
    if (marked.has(q._id)) marked.delete(q._id);
    else marked.add(q._id);
    renderNav();
    renderQuestion();
  });

  prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) { currentIndex--; renderQuestion(); renderNav(); }
  });

  nextBtn.addEventListener('click', () => {
    if (currentIndex < examData.questions.length - 1) { currentIndex++; renderQuestion(); renderNav(); }
  });

  submitBtn.addEventListener('click', () => submitExam(false));

  cancelSubmitBtn.addEventListener('click', () => {
    submitConfirmOverlay.classList.add('hidden');
  });

  confirmSubmitBtn.addEventListener('click', () => {
    submitConfirmOverlay.classList.add('hidden');
    submitExam(true); // auto=true here just means "skip the confirm step", we already confirmed
  });

  // ─────────────────────────────────────────────
  //  Load exam data — show fullscreen prompt once ready
  // ─────────────────────────────────────────────
  apiRequest(`/api/exam/${chapterId}`)
    .then((data) => {
      examData = data;
      examTitle.textContent = data.title;
      endTime = Date.now() + data.durationMinutes * 60 * 1000;
      timerInterval = setInterval(updateTimer, 1000);
      updateTimer();
      renderNav();
      renderQuestion();
      // Show the fullscreen prompt — exam interaction is blocked until student clicks
      fsPromptOverlay.classList.remove('hidden');
    })
    .catch((err) => {
      showError(err.message);
      setTimeout(() => { window.location.href = '/dashboard.html'; }, 2000);
    });
})();
