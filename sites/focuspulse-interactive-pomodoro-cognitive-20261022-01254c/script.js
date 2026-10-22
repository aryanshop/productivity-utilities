document.addEventListener('DOMContentLoaded', () => {
  // Timer configurations (in seconds)
  const MODES = {
    work: { duration: 25 * 60, label: 'Deep Work', color: '#6366f1' },
    shortBreak: { duration: 5 * 60, label: 'Short Break', color: '#10b981' },
    longBreak: { duration: 15 * 60, label: 'Long Break', color: '#3b82f6' }
  };

  let currentMode = 'work';
  let timeLeft = MODES[currentMode].duration;
  let totalDuration = MODES[currentMode].duration;
  let timerId = null;
  let isRunning = false;

  // DOM Elements
  const timeDisplay = document.getElementById('timeDisplay');
  const timerStatusLabel = document.getElementById('timerStatusLabel');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const modeBtns = document.querySelectorAll('.mode-btn');
  const progressCircle = document.querySelector('.progress-ring__circle');
  
  const sessionForm = document.getElementById('sessionForm');
  const taskInput = document.getElementById('taskInput');
  const energySelect = document.getElementById('energySelect');
  const distractionInput = document.getElementById('distractionInput');
  const notesInput = document.getElementById('notesInput');
  const logTableBody = document.getElementById('logTableBody');
  const totalMinutesEl = document.getElementById('totalMinutes');
  const clearDataBtn = document.getElementById('clearDataBtn');

  const CIRCUMFERENCE = 2 * Math.PI * 115;
  progressCircle.style.strokeDasharray = CIRCUMFERENCE;

  // Local Storage Key
  const STORAGE_KEY = 'focus_pulse_logs';

  function updateDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timeDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    // Update circle progress
    const offset = CIRCUMFERENCE - (timeLeft / totalDuration) * CIRCUMFERENCE;
    progressCircle.style.strokeDashoffset = offset;
    
    // Update document title
    document.title = `${timeDisplay.textContent} - FocusPulse`;
  }

  function setMode(modeKey) {
    if (isRunning) stopTimer();
    currentMode = modeKey;
    totalDuration = MODES[modeKey].duration;
    timeLeft = totalDuration;
    
    modeBtns.forEach(btn => {
      if (btn.dataset.mode === modeKey) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    document.documentElement.style.setProperty('--ring-fill', MODES[modeKey].color);
    timerStatusLabel.textContent = `Ready for ${MODES[modeKey].label.toLowerCase()}`;
    updateDisplay();
  }

  function startTimer() {
    if (isRunning) return;
    isRunning = true;
    startBtn.textContent = 'Running...';
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    timerStatusLabel.textContent = `Focus session in progress...`;

    timerId = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
        updateDisplay();
      } else {
        clearInterval(timerId);
        isRunning = false;
        startBtn.textContent = 'Start Session';
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        timerStatusLabel.textContent = 'Session complete! Log your progress below.';
        
        // Auto-fill task duration if work mode completed
        if (currentMode === 'work') {
          taskInput.focus();
        }
      }
    }, 1000);
  }

  function pauseTimer() {
    if (!isRunning) return;
    clearInterval(timerId);
    isRunning = false;
    startBtn.textContent = 'Resume';
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    timerStatusLabel.textContent = 'Paused';
  }

  function resetTimer() {
    if (isRunning) clearInterval(timerId);
    isRunning = false;
    timeLeft = totalDuration;
    startBtn.textContent = 'Start Session';
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    timerStatusLabel.textContent = `Ready for ${MODES[currentMode].label.toLowerCase()}`;
    updateDisplay();
  }

  // Event Listeners for Timer
  startBtn.addEventListener('click', startTimer);
  pauseBtn.addEventListener('click', pauseTimer);
  resetBtn.addEventListener('click', resetTimer);

  modeBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      setMode(e.target.dataset.mode);
    });
  });

  // Session Logging Logic
  function getLogs() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveLogs(logs) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error('Could not save to localStorage', e);
    }
  }

  function renderLogs() {
    const logs = getLogs();
    logTableBody.innerHTML = '';
    
    let totalMins = 0;

    if (logs.length === 0) {
      const tr = document.createElement('tr');
      tr.className = 'empty-row';
      tr.innerHTML = '<td colspan="5">No sessions recorded yet today. Start your first focus block!</td>';
      logTableBody.appendChild(tr);
      totalMinutesEl.textContent = '0';
      return;
    }

    logs.forEach(log => {
      totalMins += parseInt(log.duration, 10) || 25;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(log.task)}</strong>${log.notes ? '<br><small style="color: var(--text-muted);">' + escapeHtml(log.notes) + '</small>' : ''}</td>
        <td>${log.duration}m</td>
        <td>${log.energy}/5</td>
        <td>${log.distractions}</td>
        <td>${log.timestamp}</td>
      `;
      logTableBody.appendChild(tr);
    });

    totalMinutesEl.textContent = totalMins;
  }

  function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  }

  sessionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const task = taskInput.value.trim();
    if (!task) return;

    const newLog = {
      task,
      duration: Math.round(MODES[currentMode].duration / 60),
      energy: energySelect.value,
      distractions: distractionInput.value || 0,
      notes: notesInput.value.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const logs = getLogs();
    logs.unshift(newLog);
    saveLogs(logs);
    renderLogs();

    // Reset form
    taskInput.value = '';
    distractionInput.value = '0';
    notesInput.value = '';
    energySelect.value = '3';
  });

  clearDataBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear your session history?')) {
      localStorage.removeItem(STORAGE_KEY);
      renderLogs();
    }
  });

  // Initial setup
  updateDisplay();
  renderLogs();
});
