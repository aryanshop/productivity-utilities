/* STATE MANAGEMENT & LOCALSTORAGE */
const STORAGE_KEY = 'chronocraft_data_v1';

let state = {
  activeView: 'timer-view',
  timer: {
    mode: 'pomodoro', // pomodoro, shortBreak, longBreak
    duration: 25 * 60,
    timeLeft: 25 * 60,
    isRunning: false,
    activeTaskId: null
  },
  tasks: [
    { id: '1', title: 'Design user onboarding flow', priority: 'high', estimated: 3, completed: false },
    { id: '2', title: 'Review pull requests and refactor CSS', priority: 'medium', estimated: 2, completed: false }
  ],
  schedule: {}, // hour string (e.g. "09:00") -> task text
  stats: {
    totalPomodoros: 0,
    completedTasks: 0,
    weeklyFocus: [2, 4, 3, 5, 4, 6, 3] // Mon-Sun completed pomodoros
  }
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };
      // Reset timer running state on reload
      state.timer.isRunning = false;
      const modeDurations = { pomodoro: 25 * 60, shortBreak: 5 * 60, longBreak: 15 * 60 };
      state.timer.timeLeft = modeDurations[state.timer.mode] || 25 * 60;
    } catch (e) {
      console.error('Failed to load saved state', e);
    }
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* DOM ELEMENTS */
const navBtns = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');

// Timer elements
const modeBtns = document.querySelectorAll('.mode-btn');
const timeMinutesEl = document.getElementById('time-minutes');
const timeSecondsEl = document.getElementById('time-seconds');
const timerStatusLabel = document.getElementById('timer-status-label');
const startTimerBtn = document.getElementById('start-timer-btn');
const resetTimerBtn = document.getElementById('reset-timer-btn');
const ringProgress = document.querySelector('.ring-progress');
const activeTaskSelect = document.getElementById('active-task-select');

// Task elements
const tasksGridContainer = document.getElementById('tasks-grid-container');
const openTaskModalBtn = document.getElementById('open-task-modal');
const taskModal = document.getElementById('task-modal');
const closeTaskModalBtn = document.getElementById('close-task-modal');
const cancelTaskBtn = document.getElementById('cancel-task-btn');
const taskForm = document.getElementById('task-form');
const filterChips = document.querySelectorAll('.filter-chip');
let currentFilter = 'all';

// Schedule elements
const scheduleTimelineContainer = document.getElementById('schedule-timeline-container');

// Analytics elements
const statTotalPomodoros = document.getElementById('stat-total-pomodoros');
const statFocusHours = document.getElementById('stat-focus-hours');
const statCompletedTasks = document.getElementById('stat-completed-tasks');
const clearDataBtn = document.getElementById('clear-data-btn');
const analyticsCanvas = document.getElementById('analytics-canvas');

let timerInterval = null;

/* NAVIGATION */
navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-target');
    navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    views.forEach(v => v.classList.remove('active'));
    document.getElementById(target).classList.add('active');
    state.activeView = target;

    if (target === 'analytics-view') {
      renderAnalytics();
    }
  });
});

/* TIMER LOGIC */
const modeDurations = {
  pomodoro: 25 * 60,
  shortBreak: 5 * 60,
  longBreak: 15 * 60
};

modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (state.timer.isRunning) {
      if (!confirm('Switching modes will stop the current timer. Continue?')) return;
      stopTimer();
    }
    const mode = btn.getAttribute('data-mode');
    setTimerMode(mode);
  });
});

function setTimerMode(mode) {
  modeBtns.forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
  state.timer.mode = mode;
  state.timer.duration = modeDurations[mode];
  state.timer.timeLeft = state.timer.duration;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const mins = Math.floor(state.timer.timeLeft / 60);
  const secs = state.timer.timeLeft % 60;
  timeMinutesEl.textContent = String(mins).padStart(2, '0');
  timeSecondsEl.textContent = String(secs).padStart(2, '0');

  const total = state.timer.duration;
  const current = state.timer.timeLeft;
  const offset = 565 - (565 * current) / total;
  ringProgress.style.strokeDashoffset = offset;

  let label = 'Ready to Focus';
  if (state.timer.isRunning) {
    label = state.timer.mode === 'pomodoro' ? 'Focus Session in Progress' : 'Break Time';
  }
  timerStatusLabel.textContent = label;
  document.title = `(${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}) ChronoCraft`;
}

startTimerBtn.addEventListener('click', () => {
  if (state.timer.isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
});

resetTimerBtn.addEventListener('click', () => {
  stopTimer();
  state.timer.timeLeft = state.timer.duration;
  updateTimerDisplay();
});

function startTimer() {
  state.timer.isRunning = true;
  startTimerBtn.textContent = 'Pause Session';
  startTimerBtn.classList.remove('btn-primary');
  startTimerBtn.classList.add('btn-secondary');

  timerInterval = setInterval(() => {
    if (state.timer.timeLeft > 0) {
      state.timer.timeLeft--;
      updateTimerDisplay();
    } else {
      clearInterval(timerInterval);
      state.timer.isRunning = false;
      playChime();
      handleSessionComplete();
    }
  }, 1000);
  updateTimerDisplay();
}

function pauseTimer() {
  state.timer.isRunning = false;
  clearInterval(timerInterval);
  startTimerBtn.textContent = 'Resume Session';
  startTimerBtn.classList.remove('btn-secondary');
  startTimerBtn.classList.add('btn-primary');
  updateTimerDisplay();
}

function stopTimer() {
  state.timer.isRunning = false;
  clearInterval(timerInterval);
  startTimerBtn.textContent = 'Start Session';
  startTimerBtn.classList.remove('btn-secondary');
  startTimerBtn.classList.add('btn-primary');
  updateTimerDisplay();
}

function handleSessionComplete() {
  if (state.timer.mode === 'pomodoro') {
    state.stats.totalPomodoros++;
    const todayIndex = (new Date().getDay() + 6) % 7; // Mon=0 .. Sun=6
    state.stats.weeklyFocus[todayIndex] = (state.stats.weeklyFocus[todayIndex] || 0) + 1;
    alert('Pomodoro session completed! Take a well-deserved break.');
  } else {
    alert('Break finished! Ready to dive back into deep work?');
  }
  saveState();
  setTimerMode('pomodoro');
}

// Simple Web Audio API chime
function playChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(528, ctx.currentTime); // Solfeggio frequency
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.5);
  } catch (e) {
    // Audio not allowed or unsupported
  }
}

/* TASK BACKLOG LOGIC */
function renderTaskSelect() {
  activeTaskSelect.innerHTML = '<option value="">-- Select a task from backlog --</option>';
  state.tasks.forEach(t => {
    if (!t.completed) {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.title;
      if (state.timer.activeTaskId === t.id) opt.selected = true;
      activeTaskSelect.appendChild(opt);
    }
  });
}

activeTaskSelect.addEventListener('change', (e) => {
  state.timer.activeTaskId = e.target.value;
  saveState();
});

function renderTasks() {
  tasksGridContainer.innerHTML = '';
  const filtered = state.tasks.filter(t => {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'completed') return t.completed;
    return t.priority === currentFilter && !t.completed;
  });

  if (filtered.length === 0) {
    tasksGridContainer.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1; text-align: center; padding: 2rem;">No tasks found in this filter.</p>`;
    return;
  }

  filtered.forEach(task => {
    const card = document.createElement('div');
    card.className = `task-card ${task.completed ? 'completed' : ''}`;
    card.innerHTML = `
      <div class="task-card-header">
        <span class="task-title">${escapeHtml(task.title)}</span>
        <span class="badge badge-${task.priority}">${task.priority}</span>
      </div>
      <div class="task-card-footer">
        <span>Est: ${task.estimated} pomodoro${task.estimated > 1 ? 's' : ''}</span>
        <div class="task-actions">
          <button class="icon-btn" onclick="toggleTask('${task.id}')" title="${task.completed ? 'Mark Active' : 'Mark Complete'}">
            ${task.completed ? '↩️' : '✅'}
          </button>
          <button class="icon-btn" onclick="deleteTask('${task.id}')" title="Delete Task">🗑️</button>
        </div>
      </div>
    `;
    tasksGridContainer.appendChild(card);
  });
  renderTaskSelect();
}

filterChips.forEach(chip => {
  chip.addEventListener('click', () => {
    filterChips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    currentFilter = chip.getAttribute('data-filter');
    renderTasks();
  });
});

openTaskModalBtn.addEventListener('click', () => taskModal.classList.add('open'));
closeTaskModalBtn.addEventListener('click', () => taskModal.classList.remove('open'));
cancelTaskBtn.addEventListener('click', () => taskModal.classList.remove('open'));

taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = document.getElementById('task-title-input').value.trim();
  const priority = document.getElementById('task-priority-input').value;
  const estimated = parseInt(document.getElementById('task-est-input').value) || 1;

  if (!title) return;

  const newTask = {
    id: Date.now().toString(),
    title,
    priority,
    estimated,
    completed: false
  };

  state.tasks.unshift(newTask);
  saveState();
  renderTasks();
  taskForm.reset();
  taskModal.classList.remove('open');
});

window.toggleTask = function(id) {
  const task = state.tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    if (task.completed) {
      state.stats.completedTasks++;
      if (state.timer.activeTaskId === id) state.timer.activeTaskId = null;
    }
    saveState();
    renderTasks();
  }
};

window.deleteTask = function(id) {
  if (confirm('Are you sure you want to delete this task?')) {
    state.tasks = state.tasks.filter(t => t.id !== id);
    if (state.timer.activeTaskId === id) state.timer.activeTaskId = null;
    saveState();
    renderTasks();
  }
};

/* TIME-BLOCK SCHEDULE LOGIC */
function renderSchedule() {
  scheduleTimelineContainer.innerHTML = '';
  // Generate hours from 06:00 to 23:00 (6 AM to 11 PM)
  for (let hour = 6; hour <= 23; hour++) {
    const hourStr = `${String(hour).padStart(2, '0')}:00`;
    const slot = document.createElement('div');
    slot.className = 'time-slot';

    const label = document.createElement('div');
    label.className = 'time-slot-label';
    label.textContent = hourStr;

    const content = document.createElement('div');
    content.className = 'time-slot-content';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'time-slot-input';
    input.placeholder = `Plan for ${hourStr}...`;
    input.value = state.schedule[hourStr] || '';
    input.addEventListener('input', (e) => {
      state.schedule[hourStr] = e.target.value;
      saveState();
    });

    content.appendChild(input);
    slot.appendChild(label);
    slot.appendChild(content);
    scheduleTimelineContainer.appendChild(slot);
  }
}

/* ANALYTICS & CHARTS */
function renderAnalytics() {
  statTotalPomodoros.textContent = state.stats.totalPomodoros;
  statFocusHours.textContent = (state.stats.totalPomodoros * 0.4).toFixed(1) + 'h';
  statCompletedTasks.textContent = state.stats.completedTasks;

  drawWeeklyChart();
}

function drawWeeklyChart() {
  const canvas = analyticsCanvas;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const data = state.stats.weeklyFocus || [0, 0, 0, 0, 0, 0, 0];
  const maxVal = Math.max(...data, 8); // at least scale to 8

  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const barWidth = chartWidth / days.length - 16;

  // Draw axes
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  // Draw bars & labels
  days.forEach((day, i) => {
    const val = data[i] || 0;
    const barHeight = (val / maxVal) * chartHeight;
    const x = padding + i * (chartWidth / days.length) + 8;
    const y = height - padding - barHeight;

    // Bar fill
    ctx.fillStyle = '#6366f1';
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
    ctx.fill();

    // Value text on top of bar
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(val, x + barWidth / 2, y - 6);

    // Day label
    ctx.fillText(day, x + barWidth / 2, height - padding + 16);
  });
}

clearDataBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to reset all tasks, stats, and schedule data?')) {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }
});

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

/* INITIALIZATION */
function init() {
  loadState();
  updateTimerDisplay();
  renderTasks();
  renderSchedule();
  renderAnalytics();
}

init();
