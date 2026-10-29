/* AuraPulse Application Logic */

document.addEventListener('DOMContentLoaded', () => {
  // State Management
  const STORAGE_KEY_LOGS = 'aurapulse_recovery_logs_v1';
  const STORAGE_KEY_STATS = 'aurapulse_stats_v1';

  let recoveryLogs = loadFromStorage(STORAGE_KEY_LOGS, []);
  let stats = loadFromStorage(STORAGE_KEY_STATS, { totalSessions: 0, totalMinutes: 0, streak: 0, lastDate: null });

  // DOM Elements - Check-in
  const checkinForm = document.getElementById('checkin-form');
  const sleepRange = document.getElementById('sleep-quality');
  const sorenessRange = document.getElementById('muscle-soreness');
  const fatigueRange = document.getElementById('mental-fatigue');
  const hydrationRange = document.getElementById('hydration-level');

  const valSleep = document.getElementById('val-sleep');
  const valSoreness = document.getElementById('val-soreness');
  const valFatigue = document.getElementById('val-fatigue');
  const valHydration = document.getElementById('val-hydration');

  const recoveryScoreNum = document.getElementById('recovery-score-num');
  const recoveryStatusText = document.getElementById('recovery-status-text');

  // DOM Elements - Breathing Studio
  const presetBtns = document.querySelectorAll('.preset-btn');
  const dynamicRing = document.getElementById('dynamic-ring');
  const breathPhaseText = document.getElementById('breath-phase-text');
  const breathTimer = document.getElementById('breath-timer');
  const btnStartBreath = document.getElementById('btn-start-breath');
  const btnStopBreath = document.getElementById('btn-stop-breath');
  const audioChimeToggle = document.getElementById('audio-chime-toggle');

  // DOM Elements - Analytics & History
  const statSessions = document.getElementById('stat-sessions');
  const statStreak = document.getElementById('stat-streak');
  const statMinutes = document.getElementById('stat-minutes');
  const historyList = document.getElementById('history-list');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const btnExport = document.getElementById('btn-export');
  const btnImport = document.getElementById('btn-import');
  const fileInput = document.getElementById('file-input');

  // Breathing Session Config
  let currentPreset = { inhale: 4, hold1: 2, exhale: 4, hold2: 2 };
  let isBreathingActive = false;
  let breathingInterval = null;
  let audioCtx = null;

  const CIRCUMFERENCE = 691; // 2 * pi * 110

  // Helper: LocalStorage
  function loadFromStorage(key, fallback) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveToStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {}
  }

  // Range Slider Live Updates
  function updateRangeDisplay(input, display) {
    display.textContent = input.value;
  }

  sleepRange.addEventListener('input', () => updateRangeDisplay(sleepRange, valSleep));
  sorenessRange.addEventListener('input', () => updateRangeDisplay(sorenessRange, valSoreness));
  fatigueRange.addEventListener('input', () => updateRangeDisplay(fatigueRange, valFatigue));
  hydrationRange.addEventListener('input', () => updateRangeDisplay(hydrationRange, valHydration));

  // Check-in Form Submission
  checkinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const sleep = parseInt(sleepRange.value);
    const soreness = parseInt(sorenessRange.value);
    const fatigue = parseInt(fatigueRange.value);
    const hydration = parseInt(hydrationRange.value);

    // Calculation: Sleep (+) Hydration (+) - Soreness (-) - Fatigue (-)
    // Max possible score ~ 40, normalize to 100
    let rawScore = (sleep * 3.5) + (hydration * 3.0) + ((11 - soreness) * 2.0) + ((11 - fatigue) * 1.5);
    let finalScore = Math.min(100, Math.max(10, Math.round(rawScore)));

    recoveryScoreNum.textContent = finalScore;

    let statusMsg = '';
    if (finalScore >= 80) {
      statusMsg = 'Optimal autonomic balance. Prime state for high-focus cognitive work.';
      recoveryScoreNum.style.color = 'var(--accent)';
    } else if (finalScore >= 60) {
      statusMsg = 'Good recovery baseline. Steady energy for routine tasks.';
      recoveryScoreNum.style.color = 'var(--primary)';
    } else if (finalScore >= 40) {
      statusMsg = 'Moderate fatigue detected. Recommended: take structured micro-breaks.';
      recoveryScoreNum.style.color = 'var(--warning)';
    } else {
      statusMsg = 'Low readiness score. Prioritize deep rest, hydration, and somatic breathing.';
      recoveryScoreNum.style.color = 'var(--danger)';
    }
    recoveryStatusText.textContent = statusMsg;

    // Save Log
    const logEntry = {
      id: Date.now(),
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      score: finalScore,
      sleep,
      soreness,
      fatigue,
      hydration
    };

    recoveryLogs.unshift(logEntry);
    if (recoveryLogs.length > 30) recoveryLogs.pop(); // keep last 30
    saveToStorage(STORAGE_KEY_LOGS, recoveryLogs);

    // Update streak
    updateStreakOnLog();
    renderHistory();
  });

  // Preset Selection
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (isBreathingActive) return;
      presetBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      currentPreset = {
        inhale: parseFloat(btn.dataset.inhale),
        hold1: parseFloat(btn.dataset.hold),
        exhale: parseFloat(btn.dataset.exhale),
        hold2: parseFloat(btn.dataset.hold2)
      };
    });
  });

  // Web Audio API Ambient Chimes
  function playTone(freq = 216, duration = 0.8) {
    if (!audioChimeToggle.checked) return;
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.01, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  }

  // Breathing Session Engine
  function startBreathingSession() {
    if (isBreathingActive) return;
    isBreathingActive = true;
    btnStartBreath.disabled = true;
    btnStopBreath.disabled = false;
    presetBtns.forEach(b => b.disabled = true);

    let phaseIndex = 0;
    // Phases sequence: Inhale, Hold1, Exhale, Hold2 (filter out zero durations)
    const buildPhases = () => {
      let p = [];
      if (currentPreset.inhale > 0) p.push({ name: 'Inhale', duration: currentPreset.inhale, freq: 288 });
      if (currentPreset.hold1 > 0) p.push({ name: 'Hold', duration: currentPreset.hold1, freq: 324 });
      if (currentPreset.exhale > 0) p.push({ name: 'Exhale', duration: currentPreset.exhale, freq: 216 });
      if (currentPreset.hold2 > 0) p.push({ name: 'Hold', duration: currentPreset.hold2, freq: 192 });
      return p;
    };

    let phases = buildPhases();
    let currentPhase = phases[phaseIndex];
    let timeLeft = currentPhase.duration;
    let totalElapsedSeconds = 0;

    breathPhaseText.textContent = currentPhase.name;
    breathTimer.textContent = Math.ceil(timeLeft);
    playTone(currentPhase.freq, 1.0);

    const updateRingAnimation = (phaseName, progress) => {
      // progress goes 0 to 1
      let offset = CIRCUMFERENCE;
      if (phaseName === 'Inhale') {
        offset = CIRCUMFERENCE - (progress * CIRCUMFERENCE);
      } else if (phaseName === 'Exhale') {
        offset = progress * CIRCUMFERENCE;
      } else {
        // Hold
        offset = phaseName === 'Hold' && currentPhase.name === 'Hold' ? (phaseName === 'Hold' ? (breathPhaseText.textContent.includes('In') ? 0 : CIRCUMFERENCE) : 0) : 0;
      }
      dynamicRing.style.strokeDashoffset = offset;
    };

    let tickInterval = 100; // ms
    let elapsedInPhase = 0;

    breathingInterval = setInterval(() => {
      elapsedInPhase += (tickInterval / 1000);
      totalElapsedSeconds += (tickInterval / 1000);
      timeLeft = currentPhase.duration - elapsedInPhase;

      let progress = elapsedInPhase / currentPhase.duration;
      updateRingAnimation(currentPhase.name, Math.min(1, progress));

      breathTimer.textContent = Math.max(0, Math.ceil(timeLeft));

      if (timeLeft <= 0) {
        phaseIndex = (phaseIndex + 1) % phases.length;
        currentPhase = phases[phaseIndex];
        elapsedInPhase = 0;
        breathPhaseText.textContent = currentPhase.name;
        playTone(currentPhase.freq, 1.0);
      }
    }, tickInterval);

    // Save session stats on stop
    window.currentSessionSeconds = () => totalElapsedSeconds;
  }

  function stopBreathingSession() {
    if (!isBreathingActive) return;
    clearInterval(breathingInterval);
    isBreathingActive = false;
    btnStartBreath.disabled = false;
    btnStopBreath.disabled = true;
    presetBtns.forEach(b => b.disabled = false);

    breathPhaseText.textContent = 'Ready';
    breathTimer.textContent = '--';
    dynamicRing.style.strokeDashoffset = CIRCUMFERENCE;

    if (window.currentSessionSeconds) {
      const mins = Math.round((window.currentSessionSeconds() / 60) * 10) / 10;
      if (mins >= 0.2) {
        stats.totalSessions += 1;
        stats.totalMinutes = Math.round((stats.totalMinutes + mins) * 10) / 10;
        saveToStorage(STORAGE_KEY_STATS, stats);
        renderStats();
      }
    }
  }

  btnStartBreath.addEventListener('click', startBreathingSession);
  btnStopBreath.addEventListener('click', stopBreathingSession);

  // Streak & Stats Management
  function updateStreakOnLog() {
    const todayStr = new Date().toDateString();
    if (stats.lastDate !== todayStr) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (stats.lastDate === yesterday.toDateString()) {
        stats.streak += 1;
      } else if (!stats.lastDate) {
        stats.streak = 1;
      } else {
        stats.streak = 1;
      }
      stats.lastDate = todayStr;
      saveToStorage(STORAGE_KEY_STATS, stats);
    }
    renderStats();
  }

  function renderStats() {
    statSessions.textContent = stats.totalSessions;
    statStreak.textContent = stats.streak;
    statMinutes.textContent = stats.totalMinutes;
  }

  function renderHistory() {
    if (recoveryLogs.length === 0) {
      historyList.innerHTML = '<li class="empty-item">No logs recorded yet. Complete your first check-in!</li>';
      return;
    }

    historyList.innerHTML = '';
    recoveryLogs.forEach(log => {
      const li = document.createElement('li');
      li.className = 'history-item';
      li.innerHTML = `
        <div>
          <div class="history-item-date">${log.date}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">Sleep: ${log.sleep} | Soreness: ${log.soreness}</div>
        </div>
        <div class="history-item-score">${log.score} <span style="font-size:0.75rem; color:var(--text-muted);">/100</span></div>
      `;
      historyList.appendChild(li);
    });
  }

  btnClearHistory.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear your local recovery history?')) {
      recoveryLogs = [];
      stats = { totalSessions: 0, totalMinutes: 0, streak: 0, lastDate: null };
      saveToStorage(STORAGE_KEY_LOGS, recoveryLogs);
      saveToStorage(STORAGE_KEY_STATS, stats);
      renderHistory();
      renderStats();
      recoveryScoreNum.textContent = '--';
      recoveryStatusText.textContent = 'Complete check-in to analyze autonomic balance.';
    }
  });

  // JSON Export / Import Backup
  btnExport.addEventListener('click', () => {
    const backupData = {
      version: 1,
      exportDate: new Date().toISOString(),
      recoveryLogs,
      stats
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aurapulse-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  btnImport.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed && Array.isArray(parsed.recoveryLogs)) {
          recoveryLogs = parsed.recoveryLogs;
          stats = parsed.stats || stats;
          saveToStorage(STORAGE_KEY_LOGS, recoveryLogs);
          saveToStorage(STORAGE_KEY_STATS, stats);
          renderHistory();
          renderStats();
          alert('Recovery data imported successfully.');
        } else {
          alert('Invalid backup file structure.');
        }
      } catch (err) {
        alert('Failed to parse JSON backup file.');
      }
      fileInput.value = '';
    };
    reader.readAsText(file);
  });

  // Initial Render
  renderHistory();
  renderStats();
});
