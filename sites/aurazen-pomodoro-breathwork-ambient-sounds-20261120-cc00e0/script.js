document.addEventListener('DOMContentLoaded', () => {
  // --- STATE & CONFIG --- 
  const STORAGE_KEY = 'aurazen_workspace_v1';
  let state = loadState() || {
    workDuration: 25,
    shortBreak: 5,
    longBreak: 15,
    completedCount: 0,
    totalMinutes: 0,
    streak: 0,
    lastActiveDate: null,
    history: []
  };

  // Timer State
  let timerMode = 'pomodoro'; // 'pomodoro' | 'breathwork'
  let pomoState = 'work'; // 'work' | 'shortBreak' | 'longBreak'
  let timeLeft = state.workDuration * 60;
  let totalPomoSeconds = state.workDuration * 60;
  let timerRunning = false;
  let timerInterval = null;
  let currentSessionIndex = 1;

  // DOM Elements
  const tabBtns = document.querySelectorAll('.tab-btn');
  const modeViews = document.querySelectorAll('.mode-view');
  
  // Pomodoro DOM
  const pomoRing = document.getElementById('pomo-ring');
  const pomoTimeEl = document.getElementById('pomo-time');
  const pomoStateEl = document.getElementById('pomo-state');
  const pomoCountEl = document.getElementById('pomo-count');
  const pomoStartBtn = document.getElementById('pomo-start-btn');
  const pomoResetBtn = document.getElementById('pomo-reset-btn');
  const pomoSkipBtn = document.getElementById('pomo-skip-btn');
  const workDurInput = document.getElementById('work-dur');
  const shortBreakInput = document.getElementById('short-break-dur');
  const longBreakInput = document.getElementById('long-break-dur');

  // Breathwork DOM
  const breathStartBtn = document.getElementById('breath-start-btn');
  const breathStopBtn = document.getElementById('breath-stop-btn');
  const breathPatternSelect = document.getElementById('breath-pattern-select');
  const breathOrb = document.getElementById('breath-orb');
  const breathInstruction = document.getElementById('breath-instruction');
  const breathCountdown = document.getElementById('breath-countdown');

  // Stats DOM
  const statCompleted = document.getElementById('stat-completed');
  const statMinutes = document.getElementById('stat-minutes');
  const statStreak = document.getElementById('stat-streak');
  const clearStatsBtn = document.getElementById('clear-stats-btn');
  const sessionHistoryList = document.getElementById('session-history-list');

  // Audio Sliders
  const audioSliders = document.querySelectorAll('.audio-slider');
  const masterAudioBtn = document.getElementById('master-audio-btn');

  // Ring geometry
  const radius = 105;
  const circumference = 2 * Math.PI * radius;
  pomoRing.style.strokeDasharray = circumference;

  // --- INIT UI --- 
  workDurInput.value = state.workDuration;
  shortBreakInput.value = state.shortBreak;
  longBreakInput.value = state.longBreak;
  updateStatsUI();
  renderHistory();
  checkStreakOnLoad();

  // --- TAB SWITCHING --- 
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      modeViews.forEach(v => v.classList.remove('active'));
      btn.classList.add('active');
      
      const targetMode = btn.dataset.mode;
      timerMode = targetMode;
      if (targetMode === 'pomodoro') {
        document.getElementById('pomodoro-view').classList.add('active');
        stopBreathworkEngine();
      } else {
        document.getElementById('breathwork-view').classList.add('active');
        pausePomodoro();
      }
    });
  });

  // --- POMODORO TIMER ENGINE --- 
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function updatePomoDisplay() {
    pomoTimeEl.textContent = formatTime(timeLeft);
    const progressOffset = circumference - (timeLeft / totalPomoSeconds) * circumference;
    pomoRing.style.strokeDashoffset = progressOffset;

    let stateLabelText = 'Focus Time';
    if (pomoState === 'shortBreak') stateLabelText = 'Short Break';
    if (pomoState === 'longBreak') stateLabelText = 'Long Break';
    pomoStateEl.textContent = stateLabelText;
    pomoCountEl.textContent = `Session ${currentSessionIndex} of 4`;
  }

  function startPomodoro() {
    if (timerRunning) {
      pausePomodoro();
      return;
    }

    timerRunning = true;
    pomoStartBtn.textContent = 'Pause Focus';
    pomoStartBtn.style.backgroundColor = 'var(--danger)';

    timerInterval = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
        updatePomoDisplay();
      } else {
        clearInterval(timerInterval);
        timerRunning = false;
        playChime();
        handleSessionCompletion();
      }
    }, 1000);
  }

  function pausePomodoro() {
    clearInterval(timerInterval);
    timerRunning = false;
    pomoStartBtn.textContent = 'Start Focus';
    pomoStartBtn.style.backgroundColor = 'var(--accent-primary)';
  }

  function resetPomodoro() {
    pausePomodoro();
    setDurationForCurrentState();
    updatePomoDisplay();
  }

  function skipPomodoro() {
    pausePomodoro();
    advancePomodoroState();
    updatePomoDisplay();
  }

  function setDurationForCurrentState() {
    if (pomoState === 'work') {
      totalPomoSeconds = parseInt(workDurInput.value) * 60 || 1500;
    } else if (pomoState === 'shortBreak') {
      totalPomoSeconds = parseInt(shortBreakInput.value) * 60 || 300;
    } else {
      totalPomoSeconds = parseInt(longBreakInput.value) * 60 || 900;
    }
    timeLeft = totalPomoSeconds;
  }

  function handleSessionCompletion() {
    if (pomoState === 'work') {
      state.completedCount++;
      state.totalMinutes += parseInt(workDurInput.value);
      recordSessionHistory(parseInt(workDurInput.value));
      updateStreak();
      saveState();
      updateStatsUI();

      if (currentSessionIndex < 4) {
        pomoState = 'shortBreak';
        currentSessionIndex++;
      } else {
        pomoState = 'longBreak';
        currentSessionIndex = 1;
      }
    } else {
      pomoState = 'work';
    }

    setDurationForCurrentState();
    updatePomoDisplay();
    pomoStartBtn.textContent = 'Start Focus';
    pomoStartBtn.style.backgroundColor = 'var(--accent-primary)';
  }

  function advancePomodoroState() {
    if (pomoState === 'work') {
      if (currentSessionIndex < 4) {
        pomoState = 'shortBreak';
        currentSessionIndex++;
      } else {
        pomoState = 'longBreak';
        currentSessionIndex = 1;
      }
    } else {
      pomoState = 'work';
    }
    setDurationForCurrentState();
  }

  pomoStartBtn.addEventListener('click', startPomodoro);
  pomoResetBtn.addEventListener('click', resetPomodoro);
  pomoSkipBtn.addEventListener('click', skipPomodoro);

  workDurInput.addEventListener('change', () => {
    if (!timerRunning && pomoState === 'work') {
      state.workDuration = parseInt(workDurInput.value) || 25;
      saveState();
      resetPomodoro();
    }
  });
  shortBreakInput.addEventListener('change', () => {
    if (!timerRunning && pomoState === 'shortBreak') {
      state.shortBreak = parseInt(shortBreakInput.value) || 5;
      saveState();
      resetPomodoro();
    }
  });
  longBreakInput.addEventListener('change', () => {
    if (!timerRunning && pomoState === 'longBreak') {
      state.longBreak = parseInt(longBreakInput.value) || 15;
      saveState();
      resetPomodoro();
    }
  });

  // --- BREATHWORK ENGINE --- 
  const patterns = {
    box: [ { phase: 'Inhale', duration: 4, scale: 1.35 }, { phase: 'Hold', duration: 4, scale: 1.35 }, { phase: 'Exhale', duration: 4, scale: 1.0 }, { phase: 'Hold', duration: 4, scale: 1.0 } ],
    relaxing: [ { phase: 'Inhale', duration: 4, scale: 1.35 }, { phase: 'Hold', duration: 7, scale: 1.35 }, { phase: 'Exhale', duration: 8, scale: 1.0 } ],
    energizing: [ { phase: 'Inhale', duration: 6, scale: 1.4 }, { phase: 'Hold', duration: 2, scale: 1.4 }, { phase: 'Exhale', duration: 6, scale: 1.0 }, { phase: 'Hold', duration: 2, scale: 1.0 } ],
    calming: [ { phase: 'Inhale', duration: 5, scale: 1.35 }, { phase: 'Hold', duration: 5, scale: 1.35 }, { phase: 'Exhale', duration: 5, scale: 1.0 }, { phase: 'Hold', duration: 5, scale: 1.0 } ]
  };

  let breathRunning = false;
  let breathTimeout = null;
  let currentStepIndex = 0;
  let stepTimeRemaining = 0;

  function startBreathworkEngine() {
    if (breathRunning) return;
    breathRunning = true;
    breathStartBtn.disabled = true;
    breathStopBtn.disabled = false;
    breathPatternSelect.disabled = true;
    currentStepIndex = 0;
    runBreathStep();
  }

  function runBreathStep() {
    if (!breathRunning) return;
    const patternKey = breathPatternSelect.value;
    const currentPattern = patterns[patternKey];
    const step = currentPattern[currentStepIndex];

    breathInstruction.textContent = step.phase;
    breathOrb.style.transition = `transform ${step.duration}s ease-in-out`;
    breathOrb.style.transform = `scale(${step.scale})`;

    stepTimeRemaining = step.duration;
    breathCountdown.textContent = stepTimeRemaining;

    let stepInterval = setInterval(() => {
      if (!breathRunning) {
        clearInterval(stepInterval);
        return;
      }
      stepTimeRemaining--;
      if (stepTimeRemaining > 0) {
        breathCountdown.textContent = stepTimeRemaining;
      } else {
        clearInterval(stepInterval);
        currentStepIndex = (currentStepIndex + 1) % currentPattern.length;
        runBreathStep();
      }
    }, 1000);
  }

  function stopBreathworkEngine() {
    breathRunning = false;
    breathStartBtn.disabled = false;
    breathStopBtn.disabled = true;
    breathPatternSelect.disabled = false;
    breathInstruction.textContent = 'Inhale';
    breathCountdown.textContent = '4';
    breathOrb.style.transform = 'scale(1)';
    if (breathTimeout) clearTimeout(breathTimeout);
  }

  breathStartBtn.addEventListener('click', startBreathworkEngine);
  breathStopBtn.addEventListener('click', stopBreathworkEngine);
  breathPatternSelect.addEventListener('change', () => {
    stopBreathworkEngine();
  });

  // --- WEB AUDIO API SOUNDSCAPE SYNTHESIZER --- 
  let audioCtx = null;
  const activeSources = {};

  function initAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function setSoundVolume(soundType, volPercent) {
    initAudioContext();
    const vol = volPercent / 100;
    document.getElementById(`${soundType}-val`).textContent = `${Math.round(volPercent)}%`;

    if (vol === 0) {
      if (activeSources[soundType]) {
        stopSoundSource(soundType);
      }
      return;
    }

    if (!activeSources[soundType]) {
      startSoundSource(soundType, vol);
    } else {
      // Update gain
      activeSources[soundType].gainNode.gain.setValueAtTime(vol * getBaseScale(soundType), audioCtx.currentTime);
    }
  }

  function getBaseScale(soundType) {
    if (soundType === 'white') return 0.05;
    if (soundType === 'pink') return 0.08;
    if (soundType === 'brown') return 0.15;
    if (soundType === 'tone432') return 0.05;
    if (soundType === 'tone528') return 0.05;
    return 0.05;
  }

  function startSoundSource(soundType, vol) {
    if (soundType === 'white' || soundType === 'pink' || soundType === 'brown') {
      // Noise generator
      const bufferSize = 2 * audioCtx.sampleRate;
      const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (soundType === 'white') {
          output[i] = white;
        } else if (soundType === 'pink') {
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          output[i] *= 0.11;
          b6 = white * 0.115926;
        } else if (soundType === 'brown') {
          b0 = (b0 + (0.02 * white)) / 1.02;
          output[i] = b0 * 3.5;
        }
      }

      const noiseSource = audioCtx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(vol * getBaseScale(soundType), audioCtx.currentTime);

      noiseSource.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      noiseSource.start();

      activeSources[soundType] = { source: noiseSource, gainNode: gainNode };

    } else if (soundType === 'tone432' || soundType === 'tone528') {
      const freq = soundType === 'tone432' ? 432 : 528;
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(vol * getBaseScale(soundType), audioCtx.currentTime);

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();

      activeSources[soundType] = { source: osc, gainNode: gainNode };
    }
  }

  function stopSoundSource(soundType) {
    if (activeSources[soundType]) {
      try {
        activeSources[soundType].source.stop();
        activeSources[soundType].source.disconnect();
      } catch (e) {}
      delete activeSources[soundType];
    }
  }

  audioSliders.forEach(slider => {
    slider.addEventListener('input', (e) => {
      const soundType = e.target.dataset.sound;
      const val = parseFloat(e.target.value);
      setSoundVolume(soundType, val);
    });
  });

  masterAudioBtn.addEventListener('click', () => {
    audioSliders.forEach(slider => {
      slider.value = 0;
      const soundType = slider.dataset.sound;
      setSoundVolume(soundType, 0);
    });
  });

  // Subtle alert chime on work session complete
  function playChime() {
    initAudioContext();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(528, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.5);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 1.5);
  }

  // --- STATS & HISTORY --- 
  function recordSessionHistory(mins) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const entry = { time: timestamp, duration: mins };
    state.history.unshift(entry);
    if (state.history.length > 10) state.history.pop();
  }

  function updateStreak() {
    const todayStr = new Date().toDateString();
    if (state.lastActiveDate !== todayStr) {
      if (!state.lastActiveDate) {
        state.streak = 1;
      } else {
        const lastDate = new Date(state.lastActiveDate);
        const currentDate = new Date(todayStr);
        const diffTime = Math.abs(currentDate - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          state.streak++;
        } else if (diffDays > 1) {
          state.streak = 1;
        }
      }
      state.lastActiveDate = todayStr;
    }
  }

  function checkStreakOnLoad() {
    if (!state.lastActiveDate) return;
    const todayStr = new Date().toDateString();
    const lastDate = new Date(state.lastActiveDate);
    const currentDate = new Date(todayStr);
    const diffDays = Math.ceil(Math.abs(currentDate - lastDate) / (1000 * 60 * 60 * 24));
    if (diffDays > 1) {
      state.streak = 0;
      saveState();
      updateStatsUI();
    }
  }

  function updateStatsUI() {
    statCompleted.textContent = state.completedCount;
    statMinutes.textContent = state.totalMinutes;
    statStreak.textContent = state.streak;
    renderHistory();
  }

  function renderHistory() {
    if (!state.history || state.history.length === 0) {
      sessionHistoryList.innerHTML = '<li class="empty-log">No completed sessions yet today. Start focusing!</li>';
      return;
    }

    sessionHistoryList.innerHTML = state.history.map(item => `
      <li class="session-item">
        <span>Focus Block Completed</span>
        <span>${item.duration} mins @ ${item.time}</span>
      </li>
    `).join('');
  }

  clearStatsBtn.addEventListener('click', () => {
    if (confirm('Reset all daily statistics and history?')) {
      state.completedCount = 0;
      state.totalMinutes = 0;
      state.streak = 0;
      state.history = [];
      state.lastActiveDate = null;
      saveState();
      updateStatsUI();
    }
  });

  // --- STORAGE --- 
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
});
