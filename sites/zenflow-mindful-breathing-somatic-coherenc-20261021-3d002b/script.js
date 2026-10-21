document.addEventListener('DOMContentLoaded', () => {
  // Presets definition
  const presets = {
    box: { name: 'Box Breathing', inhale: 4, holdIn: 4, exhale: 4, holdOut: 4 },
    relax478: { name: '4-7-8 Relaxation', inhale: 4, holdIn: 7, exhale: 8, holdOut: 0 },
    coherent: { name: 'Coherent Breathing', inhale: 5, holdIn: 0, exhale: 5, holdOut: 0 },
    energize: { name: 'Energizing Breath', inhale: 6, holdIn: 0, exhale: 2, holdOut: 0 }
  };

  // DOM Elements
  const presetSelect = document.getElementById('preset-select');
  const durationSelect = document.getElementById('duration-select');
  const valInhale = document.getElementById('val-inhale');
  const valHoldIn = document.getElementById('val-hold-in');
  const valExhale = document.getElementById('val-exhale');
  const valHoldOut = document.getElementById('val-hold-out');
  const groupHoldIn = document.getElementById('group-hold-in');
  const groupHoldOut = document.getElementById('group-hold-out');

  const breathingOrb = document.getElementById('breathing-orb');
  const orbGlow = document.getElementById('orb-glow');
  const phaseTitle = document.getElementById('phase-title');
  const phaseCountdown = document.getElementById('phase-countdown');
  const progressFill = document.getElementById('progress-fill');

  const btnToggle = document.getElementById('btn-toggle');
  const btnSound = document.getElementById('btn-sound');
  const btnReset = document.getElementById('btn-reset');

  const statSessions = document.getElementById('stat-sessions');
  const statMinutes = document.getElementById('stat-minutes');
  const journalInput = document.getElementById('journal-input');
  const btnSaveNote = document.getElementById('btn-save-note');
  const historyList = document.getElementById('history-list');

  // State variables
  let isRunning = false;
  let soundEnabled = false;
  let audioCtx = null;
  let currentPreset = presets.coherent;
  let totalDurationSec = 180; // 3 minutes default
  let elapsedSessionSec = 0;
  let sessionTimer = null;
  
  let currentPhaseIndex = 0;
  let phaseTimeRemaining = 0;
  let phaseTimer = null;

  // Stats loaded from localStorage
  let stats = JSON.parse(localStorage.getItem('zenflow_stats')) || { sessions: 0, minutes: 0, notes: [] };

  function updateStatsDisplay() {
    if (statSessions) statSessions.textContent = stats.sessions;
    if (statMinutes) statMinutes.textContent = stats.minutes;
    
    if (historyList) {
      if (!stats.notes || stats.notes.length === 0) {
        historyList.innerHTML = '<li class="empty-history">No notes recorded yet today.</li>';
      } else {
        historyList.innerHTML = stats.notes.slice(-5).reverse().map(n => `<li>${escapeHtml(n)}</li>`).join('');
      }
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function updatePresetUI() {
    const p = currentPreset;
    valInhale.textContent = p.inhale + 's';
    valExhale.textContent = p.exhale + 's';
    
    if (p.holdIn > 0) {
      groupHoldIn.style.display = 'flex';
      valHoldIn.textContent = p.holdIn + 's';
    } else {
      groupHoldIn.style.display = 'none';
    }

    if (p.holdOut > 0) {
      groupHoldOut.style.display = 'flex';
      valHoldOut.textContent = p.holdOut + 's';
    } else {
      groupHoldOut.style.display = 'none';
    }
  }

  presetSelect.addEventListener('change', (e) => {
    if (isRunning) stopSession();
    currentPreset = presets[e.target.value] || presets.coherent;
    updatePresetUI();
    resetVisualizer();
  });

  durationSelect.addEventListener('change', (e) => {
    totalDurationSec = parseInt(e.target.value, 10) * 60;
  });

  // Audio API helper
  function initAudio() {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, type = 'sine', duration = 0.5, vol = 0.05) {
    if (!soundEnabled || !audioCtx) return;
    try {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      
      gain.gain.setValueAtTime(vol, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.error(e);
    }
  }

  btnSound.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    btnSound.setAttribute('aria-pressed', soundEnabled);
    btnSound.textContent = soundEnabled ? 'Sound: On' : 'Sound: Off';
    if (soundEnabled) {
      initAudio();
      playTone(432, 'sine', 0.8, 0.08);
    }
  });

  // Breathing sequence generator
  function getPhases() {
    const p = currentPreset;
    const phases = [];
    if (p.inhale > 0) phases.push({ name: 'Inhale', duration: p.inhale, scaleStart: 0.7, scaleEnd: 1.25, tone: 528 });
    if (p.holdIn > 0) phases.push({ name: 'Hold', duration: p.holdIn, scaleStart: 1.25, scaleEnd: 1.25, tone: 639 });
    if (p.exhale > 0) phases.push({ name: 'Exhale', duration: p.exhale, scaleStart: 1.25, scaleEnd: 0.7, tone: 396 });
    if (p.holdOut > 0) phases.push({ name: 'Hold', duration: p.holdOut, scaleStart: 0.7, scaleEnd: 0.7, tone: 417 });
    return phases;
  }

  function startSession() {
    if (isRunning) return;
    initAudio();
    isRunning = true;
    btnToggle.textContent = 'Pause Session';
    btnToggle.classList.add('btn-danger');
    presetSelect.disabled = true;
    durationSelect.disabled = true;

    elapsedSessionSec = 0;
    currentPhaseIndex = 0;
    
    runPhase();
    
    sessionTimer = setInterval(() => {
      elapsedSessionSec++;
      if (totalDurationSec > 0) {
        const pct = Math.min(100, (elapsedSessionSec / totalDurationSec) * 100);
        progressFill.style.width = pct + '%';

        if (elapsedSessionSec >= totalDurationSec) {
          completeSession();
        }
      } else {
        // Unbounded mode progress animation (pulse every 60s)
        const pct = (elapsedSessionSec % 60) / 60 * 100;
        progressFill.style.width = pct + '%';
      }
    }, 1000);
  }

  function runPhase() {
    if (!isRunning) return;
    const phases = getPhases();
    const phase = phases[currentPhaseIndex];

    phaseTitle.textContent = phase.name;
    phaseCountdown.textContent = phase.duration;
    phaseTimeRemaining = phase.duration;

    // Play sound cue
    playTone(phase.tone, 'sine', 0.6, 0.06);

    // Animate Orb
    breathingorbTransition(phase.scaleStart, phase.scaleEnd, phase.duration);

    if (phaseTimer) clearInterval(phaseTimer);

    const startTime = Date.now();
    const durationMs = phase.duration * 1000;

    phaseTimer = setInterval(() => {
      const elapsedMs = Date.now() - startTime;
      const left = Math.max(0, Math.ceil((durationMs - elapsedMs) / 1000));
      phaseCountdown.textContent = left;

      if (elapsedMs >= durationMs) {
        clearInterval(phaseTimer);
        currentPhaseIndex = (currentPhaseIndex + 1) % phases.length;
        runPhase();
      }
    }, 200);
  }

  function breathingorbTransition(fromScale, toScale, durationSec) {
    breathingorb.style.transition = `transform ${durationSec}s cubic-bezier(0.4, 0, 0.2, 1)`;
    breathingorb.style.transform = `scale(${toScale})`;
    orbGlow.style.transition = `transform ${durationSec}s cubic-bezier(0.4, 0, 0.2, 1), opacity ${durationSec}s ease`;
    orbGlow.style.transform = `scale(${toScale * 1.2})`;
    orbGlow.style.opacity = toScale > 1 ? '0.3' : '0.15';
  }

  function stopSession() {
    isRunning = false;
    if (sessionTimer) clearInterval(sessionTimer);
    if (phaseTimer) clearInterval(phaseTimer);
    btnToggle.textContent = 'Start Session';
    btnToggle.classList.remove('btn-danger');
    presetSelect.disabled = false;
    durationSelect.disabled = false;
  }

  function completeSession() {
    stopSession();
    playTone(528, 'sine', 1.5, 0.1);
    
    // Update stats
    stats.sessions += 1;
    const addedMinutes = totalDurationSec > 0 ? Math.round(totalDurationSec / 60) : Math.round(elapsedSessionSec / 60);
    stats.minutes += Math.max(1, addedMinutes);
    localStorage.setItem('zenflow_stats', JSON.stringify(stats));
    updateStatsDisplay();

    phaseTitle.textContent = 'Session Complete';
    phaseCountdown.textContent = '✨';
    progressFill.style.width = '100%';
  }

  function resetVisualizer() {
    stopSession();
    phaseTitle.textContent = 'Ready';
    phaseCountdown.textContent = '--';
    progressFill.style.width = '0%';
    breathingorb.style.transition = 'transform 0.5s ease';
    breathingorb.style.transform = 'scale(0.7)';
    orbGlow.style.transform = 'scale(1)';
    orbGlow.style.opacity = '0.15';
  }

  btnToggle.addEventListener('click', () => {
    if (isRunning) {
      stopSession();
      phaseTitle.textContent = 'Paused';
    } else {
      startSession();
    }
  });

  btnReset.addEventListener('click', () => {
    resetVisualizer();
  });

  // Journal Note Saving
  btnSaveNote.addEventListener('click', () => {
    const val = journalInput.value.trim();
    if (!val) return;
    if (!stats.notes) stats.notes = [];
    stats.notes.push(val);
    localStorage.setItem('zenflow_stats', JSON.stringify(stats));
    journalInput.value = '';
    updateStatsDisplay();
  });

  // Initial UI state setup
  updatePresetUI();
  updateStatsDisplay();
});
