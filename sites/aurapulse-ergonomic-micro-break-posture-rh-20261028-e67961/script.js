/* AuraPulse Interactive Script */

document.addEventListener('DOMContentLoaded', () => {
  // State variables
  let state = {
    mode: 'pomodoro',
    isRunning: false,
    isFocus: true,
    focusDuration: 25 * 60,
    breakDuration: 5 * 60,
    timeLeft: 25 * 60,
    totalSeconds: 25 * 60,
    completedFocus: 0,
    completedBreaks: 0,
    streak: 0,
    totalFocusMins: 0,
    history: [],
    soundActive: false,
    currentSound: 'pink',
    volume: 0.3
  };

  // DOM Elements
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');
  const startBtn = document.getElementById('start-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const skipBtn = document.getElementById('skip-btn');
  const phaseBadge = document.getElementById('phase-badge');
  const ringProgress = document.getElementById('ring-progress');
  const modeBtns = document.querySelectorAll('.mode-btn');
  
  const statFocus = document.getElementById('stat-completed-focus');
  const statBreaks = document.getElementById('stat-completed-breaks');
  const statStreak = document.getElementById('stat-streak');
  
  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  const soundBtns = document.querySelectorAll('.sound-btn');
  const volumeSlider = document.getElementById('volume-slider');
  
  const statsBtn = document.getElementById('stats-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const statsModal = document.getElementById('stats-modal');
  const settingsModal = document.getElementById('settings-modal');
  const closeStatsBtn = document.getElementById('close-stats-btn');
  const closeSettingsBtn = document.getElementById('close-settings-btn');
  const modalTotalMins = document.getElementById('modal-total-mins');
  const modalTotalBreaks = document.getElementById('modal-total-breaks');
  const historyList = document.getElementById('history-list');
  
  const settingFocusInput = document.getElementById('setting-focus');
  const settingBreakInput = document.getElementById('setting-break');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  
  const journalInput = document.getElementById('journal-input');
  const saveJournalBtn = document.getElementById('save-journal-btn');
  const journalStatus = document.getElementById('journal-status');
  
  // Stretch Guide Elements
  const stretches = [
    {
      category: "Neck & Shoulders",
      title: "Shoulder Roll & Release",
      desc: "Sit tall with feet flat. Slowly roll your shoulders backward in wide circles 5 times, then forward 5 times. Breathe deeply.",
      duration: "60s",
      emoji: "🧘"
    },
    {
      category: "Upper Back",
      title: "Seated Thoracic Extension",
      desc: "Interlace fingers behind your head, gently arch your upper back over the backrest, and look up toward the ceiling to open your chest.",
      duration: "45s",
      emoji: "🪑"
    },
    {
      category: "Wrists & Hands",
      title: "Wrist Flexor & Extensor Stretch",
      desc: "Extend your right arm forward with palm facing out. Use your left hand to gently pull fingers back for 20s, then downward for 20s. Switch arms.",
      duration: "60s",
      emoji: "🤲"
    },
    {
      category: "Eyes & Vision",
      title: "20-20-20 Eye Relaxation",
      desc: "Look away from your monitor at an object at least 20 feet away for 20 seconds to relax your ciliary eye muscles.",
      duration: "20s",
      emoji: "👁️"
    }
  ];
  let currentStretchIndex = 0;
  const stretchCategoryTag = document.getElementById('stretch-category-tag');
  const stretchEmoji = document.getElementById('stretch-emoji');
  const stretchTitle = document.getElementById('stretch-title');
  const stretchDesc = document.getElementById('stretch-desc');
  const stretchTime = document.getElementById('stretch-time');
  const prevStretchBtn = document.getElementById('prev-stretch-btn');
  const nextStretchBtn = document.getElementById('next-stretch-btn');

  let timerInterval = null;
  let audioCtx = null;
  let audioNode = null;
  let gainNode = null;

  // Load saved local data if available
  function loadStorage() {
    try {
      const saved = localStorage.getItem('aurapulse_data');
      if (saved) {
        const data = JSON.parse(saved);
        state.completedFocus = data.completedFocus || 0;
        state.completedBreaks = data.completedBreaks || 0;
        state.streak = data.streak || 0;
        state.totalFocusMins = data.totalFocusMins || 0;
        state.history = data.history || [];
        if (data.journal) journalInput.value = data.journal;
        updateStatsDisplay();
      }
    } catch (e) {
      console.error('Failed to load local storage', e);
    }
  }

  function saveStorage() {
    try {
      const data = {
        completedFocus: state.completedFocus,
        completedBreaks: state.completedBreaks,
        streak: state.streak,
        totalFocusMins: state.totalFocusMins,
        history: state.history,
        journal: journalInput.value
      };
      localStorage.setItem('aurapulse_data', JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save local storage', e);
    }
  }

  // Timer Logic
  const FULL_DASH_ARRAY = 552.92;

  function updateDisplay() {
    const mins = Math.floor(state.timeLeft / 60);
    const secs = state.timeLeft % 60;
    minutesEl.textContent = String(mins).padStart(2, '0');
    secondsEl.textContent = String(secs).padStart(2, '0');
    
    // Ring Progress
    const fraction = state.timeLeft / state.totalSeconds;
    const dashOffset = FULL_DASH_ARRAY - (fraction * FULL_DASH_ARRAY);
    ringProgress.style.strokeDashoffset = dashOffset;
  }

  function setMode(newMode) {
    state.mode = newMode;
    modeBtns.forEach(btn => {
      if (btn.dataset.mode === newMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (newMode === 'pomodoro') {
      state.focusDuration = 25 * 60;
      state.breakDuration = 5 * 60;
    } else if (newMode === '202020') {
      state.focusDuration = 20 * 60;
      state.breakDuration = 20;
    } else if (newMode === 'custom') {
      state.focusDuration = parseInt(settingFocusInput.value || 25) * 60;
      state.breakDuration = parseInt(settingBreakInput.value || 5) * 60;
    }

    resetTimer();
  }

  function resetTimer() {
    stopTimer();
    state.isFocus = true;
    state.totalSeconds = state.focusDuration;
    state.timeLeft = state.focusDuration;
    phaseBadge.textContent = 'Focus Session';
    phaseBadge.className = 'phase-badge focus';
    ringProgress.style.stroke = '#38bdf8';
    updateDisplay();
  }

  function startTimer() {
    if (state.isRunning) return;
    state.isRunning = true;
    startBtn.disabled = true;
    pauseBtn.disabled = false;

    timerInterval = setInterval(() => {
      if (state.timeLeft > 0) {
        state.timeLeft--;
        updateDisplay();
      } else {
        handlePhaseComplete();
      }
    }, 1000);
  }

  function pauseTimer() {
    stopTimer();
  }

  function stopTimer() {
    state.isRunning = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    if (timerInterval) clearInterval(timerInterval);
  }

  function skipPhase() {
    stopTimer();
    switchPhase();
  }

  function switchPhase() {
    playChime();
    if (state.isFocus) {
      // Finished Focus
      state.completedFocus++;
      state.streak++;
      const durationMins = Math.round(state.focusDuration / 60);
      state.totalFocusMins += durationMins;
      state.history.unshift({
        type: 'Focus',
        duration: durationMins + 'm',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      
      state.isFocus = false;
      state.totalSeconds = state.breakDuration;
      state.timeLeft = state.breakDuration;
      phaseBadge.textContent = 'Micro-Break & Stretch';
      phaseBadge.className = 'phase-badge break';
      ringProgress.style.stroke = '#10b981';
    } else {
      // Finished Break
      state.completedBreaks++;
      state.history.unshift({
        type: 'Break',
        duration: Math.round(state.breakDuration / 60) + 'm',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      state.isFocus = true;
      state.totalSeconds = state.focusDuration;
      state.timeLeft = state.focusDuration;
      phaseBadge.textContent = 'Focus Session';
      phaseBadge.className = 'phase-badge focus';
      ringProgress.style.stroke = '#38bdf8';
    }
    updateStatsDisplay();
    saveStorage();
    updateDisplay();
    startTimer();
  }

  function handlePhaseComplete() {
    stopTimer();
    switchPhase();
  }

  function updateStatsDisplay() {
    statFocus.textContent = state.completedFocus;
    statBreaks.textContent = state.completedBreaks;
    statStreak.textContent = state.streak;
    modalTotalMins.textContent = state.totalFocusMins;
    modalTotalBreaks.textContent = state.completedBreaks;

    if (state.history.length > 0) {
      historyList.innerHTML = state.history.map(item => `
        <li><strong>${item.type}</strong> (${item.duration}) &bull; ${item.time}</li>
      `).join('');
    } else {
      historyList.innerHTML = '<li class="empty-history">No recorded sessions yet today. Get started!</li>';
    }
  }

  // Web Audio API Sound Generation
  function toggleSound() {
    if (!state.soundActive) {
      startSound(state.currentSound);
      state.soundActive = true;
      soundToggleBtn.textContent = '🔊 Sound: On';
      soundToggleBtn.classList.add('btn-primary');
      soundToggleBtn.classList.remove('btn-secondary');
    } else {
      stopSound();
      state.soundActive = false;
      soundToggleBtn.textContent = '🔊 Sound: Off';
      soundToggleBtn.classList.remove('btn-primary');
      soundToggleBtn.classList.add('btn-secondary');
    }
  }

  function startSound(type) {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!audioCtx) audioCtx = new AudioContext();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      stopSound();

      gainNode = audioCtx.createGain();
      gainNode.gain.value = state.volume;
      gainNode.connect(audioCtx.destination);

      if (type === 'pink' || type === 'brown' || type === 'rain') {
        // Buffer noise generator
        const bufferSize = 2 * audioCtx.sampleRate;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          if (type === 'pink') {
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            output[i] *= 0.11;
            b6 = white * 0.115926;
          } else if (type === 'brown') {
            b0 = (b0 + (0.02 * white)) / 1.02;
            output[i] = b0 * 3.5;
          } else {
            // Gentle simulated rain texture with lowpass filter
            output[i] = white * 0.2;
          }
        }

        const whiteNoise = audioCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        if (type === 'rain') {
          const filter = audioCtx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 1000;
          whiteNoise.connect(filter);
          filter.connect(gainNode);
        } else {
          whiteNoise.connect(gainNode);
        }

        whiteNoise.start(0);
        audioNode = whiteNoise;
      } else if (type === 'binaural') {
        // Binaural 40Hz Gamma waves (carrier 200Hz, offset 40Hz)
        const oscLeft = audioCtx.createOscillator();
        const oscRight = audioCtx.createOscillator();
        const merger = audioCtx.createChannelMerger(2);
        
        oscLeft.frequency.value = 200;
        oscRight.frequency.value = 240;
        
        oscLeft.connect(merger, 0, 0);
        oscRight.connect(merger, 0, 1);
        merger.connect(gainNode);
        
        oscLeft.start(0);
        oscRight.start(0);
        audioNode = { stop: () => { oscLeft.stop(); oscRight.stop(); } };
      }
    } catch (e) {
      console.error('Audio initialization error', e);
    }
  }

  function stopSound() {
    if (audioNode) {
      try {
        if (typeof audioNode.stop === 'function') audioNode.stop();
        audioNode.disconnect();
      } catch (e) {}
      audioNode = null;
    }
  }

  function playChime() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
      
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch (e) {}
  }

  // Stretch Guide Navigation
  function updateStretchDisplay() {
    const s = stretches[currentStretchIndex];
    stretchCategoryTag.textContent = s.category;
    stretchEmoji.textContent = s.emoji;
    stretchTitle.textContent = s.title;
    stretchDesc.textContent = s.desc;
    stretchTime.textContent = s.duration;
  }

  // Event Listeners
  startBtn.addEventListener('click', startTimer);
  pauseBtn.addEventListener('click', pauseTimer);
  skipBtn.addEventListener('click', skipPhase);

  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      setMode(btn.dataset.mode);
    });
  });

  soundToggleBtn.addEventListener('click', toggleSound);

  soundBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      soundBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentSound = btn.dataset.sound;
      if (state.soundActive) {
        startSound(state.currentSound);
      }
    });
  });

  volumeSlider.addEventListener('input', (e) => {
    state.volume = parseFloat(e.target.value);
    if (gainNode && audioCtx) {
      gainNode.gain.setValueAtTime(state.volume, audioCtx.currentTime);
    }
  });

  statsBtn.addEventListener('click', () => statsModal.classList.add('open'));
  closeStatsBtn.addEventListener('click', () => statsModal.classList.remove('open'));
  
  settingsBtn.addEventListener('click', () => settingsModal.classList.add('open'));
  closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('open'));

  saveSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('open');
    if (state.mode === 'custom') {
      setMode('custom');
    }
  });

  prevStretchBtn.addEventListener('click', () => {
    currentStretchIndex = (currentStretchIndex - 1 + stretches.length) % stretches.length;
    updateStretchDisplay();
  });

  nextStretchBtn.addEventListener('click', () => {
    currentStretchIndex = (currentStretchIndex + 1) % stretches.length;
    updateStretchDisplay();
  });

  saveJournalBtn.addEventListener('click', () => {
    saveStorage();
    journalStatus.textContent = 'Saved successfully!';
    setTimeout(() => {
      journalStatus.textContent = 'Changes saved locally';
    }, 2000);
  });

  // Close modal on outside click
  window.addEventListener('click', (e) => {
    if (e.target === statsModal) statsModal.classList.remove('open');
    if (e.target === settingsModal) settingsModal.classList.remove('open');
  });

  // Initial Load
  loadStorage();
  updateDisplay();
  updateStretchDisplay();
});
