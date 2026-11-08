/**
 * AuraPulse - Ergonomic Micro-Break & Posture Rhythm Architect
 * Fully client-side interactive state management with Web Audio API chimes and LocalStorage session logging.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- State Variables ---
  let currentMode = 'work'; // 'work' or 'break'
  let timerState = 'stopped'; // 'stopped', 'running', 'paused'
  let workDurationMinutes = 25;
  let breakDurationMinutes = 5;
  let timeLeftSeconds = workDurationMinutes * 60;
  let totalDurationSeconds = workDurationMinutes * 60;
  let timerInterval = null;

  let activeTagFilter = 'all';
  let currentExerciseIndex = 0;

  // --- Presets Data ---
  const presets = {
    pomodoro: { work: 25, break: 5 },
    ultradian: { work: 50, break: 10 },
    quick: { work: 15, break: 3 },
    custom: { work: 25, break: 5 }
  };

  // --- Exercise Database ---
  const exercises = [
    {
      category: 'Neck & Shoulders',
      title: 'Upper Trapezius Release',
      desc: 'Sit upright. Gently drop your right ear toward your right shoulder until a mild stretch is felt along the left side of your neck. Hold for 30 seconds with calm breathing.',
      duration: '30s per side',
      type: 'Mobility',
      tags: ['neck', 'all']
    },
    {
      category: 'Eye Strain',
      title: 'The 20-20-20 Vision Reset',
      desc: 'Look away from your monitor and focus your gaze on an object at least 20 feet away for 20 seconds to relax your ciliary eye muscles.',
      duration: '20 seconds',
      type: 'Vision',
      tags: ['eyes', 'all']
    },
    {
      category: 'Spine & Core',
      title: 'Seated Thoracic Rotation',
      desc: 'Sit tall, cross your arms over your chest, and gently twist your torso to the right as far as comfortable without straining. Hold for 5 seconds, then switch sides.',
      duration: '1 min total',
      type: 'Posture',
      tags: ['posture', 'all']
    },
    {
      category: 'Mindfulness',
      title: 'Box Breathing Cycle',
      desc: 'Inhale for 4 seconds, hold your breath for 4 seconds, exhale for 4 seconds, and hold empty for 4 seconds. Repeat for 3 calming cycles.',
      duration: '1 minute',
      type: 'Breathing',
      tags: ['breathing', 'all']
    },
    {
      category: 'Neck & Shoulders',
      title: 'Shoulder Blade Retractions',
      desc: 'Squeeze your shoulder blades back and down together as if trying to hold a pencil between them. Hold for 5 seconds and repeat 5 times.',
      duration: '45 seconds',
      type: 'Ergonomic',
      tags: ['neck', 'posture', 'all']
    },
    {
      category: 'Eye Strain',
      title: 'Palming Darkness Rest',
      desc: 'Rub your palms together until warm, then gently cup them over your closed eyes without applying pressure. Breathe deeply in total darkness.',
      duration: '45 seconds',
      type: 'Vision',
      tags: ['eyes', 'all']
    },
    {
      category: 'Spine & Core',
      title: 'Standing Spinal Extension',
      desc: 'Stand up from your desk, place your hands on your lower back, and gently arch backward to counter forward slouching posture.',
      duration: '30 seconds',
      type: 'Posture',
      tags: ['posture', 'all']
    }
  ];

  // --- DOM Elements ---
  const timeDisplay = document.getElementById('timeDisplay');
  const timerLabel = document.getElementById('timerLabel');
  const currentActivityPrompt = document.getElementById('currentActivityPrompt');
  const progressRing = document.getElementById('progressRing');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const presetSelect = document.getElementById('presetSelect');

  const modeBtns = document.querySelectorAll('.mode-btn');
  const tagFilters = document.querySelectorAll('.tag-filter');
  const shuffleExerciseBtn = document.getElementById('shuffleExerciseBtn');

  const exerciseCategory = document.getElementById('exerciseCategory');
  const exerciseTitle = document.getElementById('exerciseTitle');
  const exerciseDesc = document.getElementById('exerciseDesc');
  const exerciseDuration = document.getElementById('exerciseDuration');
  const exerciseType = document.getElementById('exerciseType');

  const sessionLogList = document.getElementById('sessionLogList');
  const clearLogBtn = document.getElementById('clearLogBtn');
  const streakCount = document.getElementById('streakCount');
  const sessionCount = document.getElementById('sessionCount');

  const customModal = document.getElementById('customModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const saveCustomBtn = document.getElementById('saveCustomBtn');
  const customWorkInput = document.getElementById('customWorkInput');
  const customBreakInput = document.getElementById('customBreakInput');

  // --- Web Audio API Chime Synthesizer ---
  function playChime(type = 'work') {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      if (type === 'work') {
        // Uplifting major chord arpeggio or chime
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5
      } else {
        // Soothing lower chime
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
        osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.2); // C#5
      }

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch (e) {
      console.warn('Audio context blocked or not supported', e);
    }
  }

  // --- Timer Calculations & Rendering ---
  const CIRCUMFERENCE = 2 * Math.PI * 115; // r = 115
  progressRing.style.strokeDasharray = CIRCUMFERENCE;

  function updateDisplay() {
    const mins = Math.floor(timeLeftSeconds / 60);
    const secs = timeLeftSeconds % 60;
    timeDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Progress ring offset
    const progress = timeLeftSeconds / totalDurationSeconds;
    const dashOffset = CIRCUMFERENCE * (1 - progress);
    progressRing.style.strokeDashoffset = dashOffset;

    // Document title update
    document.title = `${timeDisplay.textContent} (${currentMode === 'work' ? 'Deep Work' : 'Break'}) - AuraPulse`;
  }

  function setMode(newMode) {
    currentMode = newMode;
    modeBtns.forEach(btn => {
      if (btn.dataset.mode === newMode) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      }
    });

    if (currentMode === 'work') {
      totalDurationSeconds = workDurationMinutes * 60;
      timerLabel.textContent = 'Deep Focus Session';
      currentActivityPrompt.textContent = 'Minimize distractions & stay in flow';
      progressRing.style.stroke = 'var(--accent-work)';
    } else {
      totalDurationSeconds = breakDurationMinutes * 60;
      timerLabel.textContent = 'Ergonomic Micro-Break';
      currentActivityPrompt.textContent = 'Stand, stretch, and reset posture';
      progressRing.style.stroke = 'var(--accent-break)';
    }

    timeLeftSeconds = totalDurationSeconds;
    updateDisplay();
  }

  function startTimer() {
    if (timerState === 'running') return;

    timerState = 'running';
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    presetSelect.disabled = true;

    timerInterval = setInterval(() => {
      if (timeLeftSeconds > 0) {
        timeLeftSeconds--;
        updateDisplay();
      } else {
        clearInterval(timerInterval);
        playChime(currentMode);
        logCompletedSession();

        // Auto-switch mode
        if (currentMode === 'work') {
          setMode('break');
        } else {
          setMode('work');
        }

        timerState = 'stopped';
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        pauseBtn.textContent = 'Pause';
        presetSelect.disabled = false;
        updateDisplay();
      }
    }, 1000);
  }

  function pauseTimer() {
    if (timerState === 'running') {
      clearInterval(timerInterval);
      timerState = 'paused';
      pauseBtn.textContent = 'Resume';
      startBtn.disabled = false;
    } else if (timerState === 'paused') {
      pauseBtn.textContent = 'Pause';
      startTimer();
    }
  }

  function resetTimer() {
    clearInterval(timerInterval);
    timerState = 'stopped';
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    pauseBtn.textContent = 'Pause';
    presetSelect.disabled = false;
    setMode(currentMode);
  }

  // --- Preset & Modal Handling ---
  presetSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      customModal.classList.add('open');
      customModal.setAttribute('aria-hidden', 'false');
      return;
    }

    if (presets[val]) {
      workDurationMinutes = presets[val].work;
      breakDurationMinutes = presets[val].break;
      resetTimer();
    }
  });

  closeModalBtn.addEventListener('click', () => {
    customModal.classList.remove('open');
    customModal.setAttribute('aria-hidden', 'true');
    presetSelect.value = 'pomodoro';
  });

  saveCustomBtn.addEventListener('click', () => {
    const w = parseInt(customWorkInput.value, 10);
    const b = parseInt(customBreakInput.value, 10);

    if (w > 0 && b > 0) {
      workDurationMinutes = w;
      breakDurationMinutes = b;
      customModal.classList.remove('open');
      customModal.setAttribute('aria-hidden', 'false');
      resetTimer();
    } else {
      alert('Please enter valid positive numbers for durations.');
    }
  });

  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (timerState === 'running') {
        if (!confirm('Switching modes will reset the current timer. Proceed?')) return;
        clearInterval(timerInterval);
        timerState = 'stopped';
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        presetSelect.disabled = false;
      }
      setMode(btn.dataset.mode);
    });
  });

  startBtn.addEventListener('click', startTimer);
  pauseBtn.addEventListener('click', pauseTimer);
  resetBtn.addEventListener('click', resetTimer);

  // --- Exercise Display & Filtering ---
  function renderCurrentExercise() {
    const filtered = exercises.filter(ex => ex.tags.includes(activeTagFilter));
    if (filtered.length === 0) return;

    if (currentExerciseIndex >= filtered.length) {
      currentExerciseIndex = 0;
    }

    const ex = filtered[currentExerciseIndex];
    exerciseCategory.textContent = ex.category;
    exerciseTitle.textContent = ex.title;
    exerciseDesc.textContent = ex.desc;
    exerciseDuration.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> ${ex.duration}`;
    exerciseType.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg> ${ex.type}`;
  }

  tagFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      tagFilters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTagFilter = btn.dataset.filter;
      currentExerciseIndex = 0;
      renderCurrentExercise();
    });
  });

  shuffleExerciseBtn.addEventListener('click', () => {
    const filtered = exercises.filter(ex => ex.tags.includes(activeTagFilter));
    currentExerciseIndex = (currentExerciseIndex + 1) % filtered.length;
    renderCurrentExercise();
  });

  // --- Session Storage & Stats Log ---
  const STORAGE_KEY = 'aurapulse_sessions_v1';
  const STREAK_KEY = 'aurapulse_streak_v1';

  function getStoredSessions() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveSessionToStorage(session) {
    try {
      const sessions = getStoredSessions();
      sessions.unshift(session);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {}
  }

  function updateStatsAndLogUI() {
    const sessions = getStoredSessions();
    sessionCount.textContent = sessions.filter(s => s.type === 'work').length;

    // Streak calculation based on dates
    try {
      const lastDate = localStorage.getItem(STREAK_KEY + '_date');
      const todayStr = new Date().toDateString();
      let streak = parseInt(localStorage.getItem(STREAK_KEY) || '0', 10);

      if (sessions.length > 0) {
        if (!lastDate) {
          streak = 1;
          localStorage.setItem(STREAK_KEY, '1');
          localStorage.setItem(STREAK_KEY + '_date', todayStr);
        } else if (lastDate !== todayStr) {
          const lastDateObj = new Date(lastDate);
          const todayObj = new Date(todayStr);
          const diffDays = Math.round((todayObj - lastDateObj) / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            streak += 1;
            localStorage.setItem(STREAK_KEY, String(streak));
            localStorage.setItem(STREAK_KEY + '_date', todayStr);
          } else if (diffDays > 1) {
            streak = 1;
            localStorage.setItem(STREAK_KEY, '1');
            localStorage.setItem(STREAK_KEY + '_date', todayStr);
          }
        }
      }
      streakCount.textContent = `${streak} days`;
    } catch (e) {
      streakCount.textContent = '1 days';
    }

    // Render Log List
    if (sessions.length === 0) {
      sessionLogList.innerHTML = '<li class="empty-log">No completed sessions yet. Start your first rhythm above!</li>';
      return;
    }

    sessionLogList.innerHTML = '';
    sessions.forEach(s => {
      const li = document.createElement('li');
      li.className = 'log-item';
      li.innerHTML = `
        <span class="log-type ${s.type}">${s.type === 'work' ? 'Deep Work' : 'Micro-Break'} (${s.duration}m)</span>
        <span class="log-time">${s.time}</span>
      `;
      sessionLogList.appendChild(li);
    });
  }

  function logCompletedSession() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const durationMins = currentMode === 'work' ? workDurationMinutes : breakDurationMinutes;

    const session = {
      type: currentMode,
      duration: durationMins,
      time: timeStr,
      timestamp: now.getTime()
    };

    saveSessionToStorage(session);
    updateStatsAndLogUI();
  }

  clearLogBtn.addEventListener('click', () => {
    if (confirm('Clear today\'s session history?')) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (e) {}
      updateStatsAndLogUI();
    }
  });

  // --- Init ---
  setMode('work');
  updateStatsAndLogUI();
  renderCurrentExercise();
});
