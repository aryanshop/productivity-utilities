/* State Management & LocalStorage */
const STORAGE_KEY = 'auraslate_workspace_data_v1';

let state = {
    tasks: [
        { id: 't1', text: 'Refactor authentication module', quadrant: 'q1', completed: false },
        { id: 't2', text: 'Draft quarterly product roadmap', quadrant: 'q2', completed: false },
        { id: 't3', text: 'Clean up inbox & archive emails', quadrant: 'q3', completed: false },
        { id: 't4', text: 'Browse tech news feed', quadrant: 'q4', completed: true }
    ],
    habits: [
        { id: 'h1', name: 'Morning Deep Work (60m)', history: { 0: true, 1: true, 2: false, 3: true, 4: true, 5: false, 6: false } },
        { id: 'h2', name: 'Read 20 Pages', history: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true } }
    ],
    timer: {
        mode: 'pomodoro', // pomodoro, shortBreak, longBreak
        duration: 25 * 60,
        timeLeft: 25 * 60,
        isRunning: false,
        activeTaskId: ''
    }
};

let timerInterval = null;

// Load from localStorage
function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
        }
    } catch (e) {
        console.error('Failed to load local storage data', e);
    }
}

// Save to localStorage
function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('Failed to save local storage data', e);
    }
}

/* Web Audio API Chime */
function playChime() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(528, now); // Solfeggio frequency
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.8);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.2);
    } catch (e) {
        // Audio context may be blocked before user interaction
    }
}

/* Navigation Tabs */
function initTabs() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');

            navButtons.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            const pane = document.getElementById(`${targetTab}-tab`);
            if (pane) pane.classList.add('active');
        });
    });
}

/* Timer Functionality */
const CIRCUMFERENCE = 2 * Math.PI * 115;

function initTimer() {
    const timeDisplay = document.getElementById('timer-time');
    const statusLabel = document.getElementById('timer-status-label');
    const startBtn = document.getElementById('timer-start-btn');
    const resetBtn = document.getElementById('timer-reset-btn');
    const ringFill = document.querySelector('.progress-ring-fill');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const activeTaskSelect = document.getElementById('active-task-select');

    // Setup ring dasharray
    if (ringFill) {
        ringFill.style.strokeDasharray = CIRCUMFERENCE;
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(state.timer.timeLeft / 60);
        const seconds = state.timer.timeLeft % 60;
        if (timeDisplay) {
            timeDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        // Update ring
        if (ringFill) {
            const total = state.timer.duration;
            const progress = state.timer.timeLeft / total;
            const offset = CIRCUMFERENCE - (progress * CIRCUMFERENCE);
            ringFill.style.strokeDashoffset = offset;
        }

        // Document Title update
        if (state.timer.isRunning) {
            document.title = `(${timeDisplay.textContent}) AuraSlate Focus`;
        } else {
            document.title = 'AuraSlate: Pomodoro & Habit Matrix Studio';
        }
    }

    function setMode(mode) {
        pauseTimer();
        state.timer.mode = mode;
        if (mode === 'pomodoro') state.timer.duration = 25 * 60;
        else if (mode === 'shortBreak') state.timer.duration = 5 * 60;
        else if (mode === 'longBreak') state.timer.duration = 15 * 60;

        state.timer.timeLeft = state.timer.duration;

        modeBtns.forEach(btn => {
            if (btn.getAttribute('data-mode') === mode) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        if (statusLabel) {
            statusLabel.textContent = mode === 'pomodoro' ? 'Ready to focus' : 'Time for a breather';
        }
        updateTimerDisplay();
    }

    function startTimer() {
        if (state.timer.isRunning) {
            pauseTimer();
            return;
        }

        state.timer.isRunning = true;
        if (startBtn) {
            startBtn.textContent = 'Pause Focus';
            startBtn.classList.remove('btn-primary');
            startBtn.classList.add('btn-secondary');
        }
        if (statusLabel) statusLabel.textContent = 'Focus session in progress...';

        timerInterval = setInterval(() => {
            if (state.timer.timeLeft > 0) {
                state.timer.timeLeft--;
                updateTimerDisplay();
            } else {
                pauseTimer();
                playChime();
                if (statusLabel) statusLabel.textContent = 'Session complete! Great work.';
                if (startBtn) startBtn.textContent = 'Start Focus';
            }
        }, 1000);
    }

    function pauseTimer() {
        state.timer.isRunning = false;
        clearInterval(timerInterval);
        if (startBtn) {
            startBtn.textContent = 'Start Focus';
            startBtn.classList.add('btn-primary');
            startBtn.classList.remove('btn-secondary');
        }
        updateTimerDisplay();
    }

    function resetTimer() {
        pauseTimer();
        state.timer.timeLeft = state.timer.duration;
        if (statusLabel) statusLabel.textContent = 'Timer reset';
        updateTimerDisplay();
    }

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setMode(btn.getAttribute('data-mode'));
        });
    });

    if (startBtn) startBtn.addEventListener('click', startTimer);
    if (resetBtn) resetBtn.addEventListener('click', resetTimer);

    if (activeTaskSelect) {
        activeTaskSelect.addEventListener('change', (e) => {
            state.timer.activeTaskId = e.target.value;
            saveState();
        });
    }

    updateTimerDisplay();
}

/* Populate Task Selector in Timer Tab */
function updateTaskDropdown() {
    const activeTaskSelect = document.getElementById('active-task-select');
    if (!activeTaskSelect) return;

    const currentVal = state.timer.activeTaskId;
    activeTaskSelect.innerHTML = '<option value="">-- Select a task from Eisenhower Matrix --</option>';

    state.tasks.forEach(task => {
        const opt = document.createElement('option');
        opt.value = task.id;
        opt.textContent = task.text;
        if (task.id === currentVal) opt.selected = true;
        activeTaskSelect.appendChild(opt);
    });
}

/* Eisenhower Matrix Functionality */
function initMatrix() {
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskQuadrant = document.getElementById('task-quadrant');

    function renderTasks() {
        ['q1', 'q2', 'q3', 'q4'].forEach(q => {
            const listEl = document.getElementById(`list-${q}`);
            if (listEl) listEl.innerHTML = '';
        });

        state.tasks.forEach(task => {
            const listEl = document.getElementById(`list-${task.quadrant}`);
            if (!listEl) return;

            const item = document.createElement('div');
            item.className = `task-item ${task.completed ? 'completed' : ''}`;
            item.innerHTML = `
                <div class="task-content">
                    <input type="checkbox" class="day-checkbox task-complete-check" ${task.completed ? 'checked' : ''} data-id="${task.id}">
                    <span>${escapeHtml(task.text)}</span>
                </div>
                <div class="task-actions">
                    <button class="icon-btn delete delete-task-btn" data-id="${task.id}" title="Delete task">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            `;
            listEl.appendChild(item);
        });

        // Bind checkbox events
        document.querySelectorAll('.task-complete-check').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                const task = state.tasks.find(t => t.id === id);
                if (task) {
                    task.completed = e.target.checked;
                    saveState();
                    renderTasks();
                }
            });
        });

        // Bind delete events
        document.querySelectorAll('.delete-task-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                state.tasks = state.tasks.filter(t => t.id !== id);
                if (state.timer.activeTaskId === id) {
                    state.timer.activeTaskId = '';
                }
                saveState();
                renderTasks();
                updateTaskDropdown();
            });
        });

        updateTaskDropdown();
    }

    if (taskForm) {
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = taskInput.value.trim();
            const quadrant = taskQuadrant.value;
            if (!text) return;

            const newTask = {
                id: 't_' + Date.now(),
                text,
                quadrant,
                completed: false
            };

            state.tasks.push(newTask);
            taskInput.value = '';
            saveState();
            renderTasks();
        });
    }

    renderTasks();
}

/* Habit Tracker Functionality */
function initHabits() {
    const habitForm = document.getElementById('habit-form');
    const habitInput = document.getElementById('habit-input');
    const habitsTbody = document.getElementById('habits-tbody');

    function computeStreak(history) {
        let streak = 0;
        for (let i = 6; i >= 0; i--) {
            if (history[i]) streak++;
            else break;
        }
        return streak;
    }

    function renderHabits() {
        if (!habitsTbody) return;
        habitsTbody.innerHTML = '';

        if (state.habits.length === 0) {
            habitsTbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-secondary);">No habits added yet. Start your streak today!</td></tr>`;
            return;
        }

        state.habits.forEach(habit => {
            const streak = computeStreak(habit.history);
            const tr = document.createElement('tr');

            let daysHtml = '';
            for (let day = 0; day < 7; day++) {
                const checked = habit.history[day] ? 'checked' : '';
                daysHtml += `<td><input type="checkbox" class="day-checkbox habit-day-check" data-habit-id="${habit.id}" data-day="${day}" ${checked}></td>`;
            }

            tr.innerHTML = `
                <td class="habit-name-cell">${escapeHtml(habit.name)}</td>
                <td>🔥 ${streak} day${streak === 1 ? '' : 's'}</td>
                ${daysHtml}
                <td>
                    <button class="icon-btn delete delete-habit-btn" data-id="${habit.id}" title="Delete habit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </td>
            `;
            habitsTbody.appendChild(tr);
        });

        // Bind day checkbox change
        document.querySelectorAll('.habit-day-check').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const habitId = e.target.getAttribute('data-habit-id');
                const day = e.target.getAttribute('data-day');
                const habit = state.habits.find(h => h.id === habitId);
                if (habit) {
                    habit.history[day] = e.target.checked;
                    saveState();
                    renderHabits();
                }
            });
        });

        // Bind delete habit
        document.querySelectorAll('.delete-habit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                state.habits = state.habits.filter(h => h.id !== id);
                saveState();
                renderHabits();
            });
        });
    }

    if (habitForm) {
        habitForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = habitInput.value.trim();
            if (!name) return;

            const newHabit = {
                id: 'h_' + Date.now(),
                name,
                history: { 0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false }
            };

            state.habits.push(newHabit);
            habitInput.value = '';
            saveState();
            renderHabits();
        });
    }

    renderHabits();
}

/* Settings & Data Backup Functionality */
function initSettings() {
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    const resetBtn = document.getElementById('reset-btn');

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `auraslate_backup_${new Date().toISOString().slice(0, 10)}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        });
    }

    if (importBtn && importFile) {
        importBtn.addEventListener('click', () => {
            importFile.click();
        });

        importFile.addEventListener('change', (e) => {
            const fileReader = new FileReader();
            if (e.target.files[0]) {
                fileReader.readAsText(e.target.files[0], "UTF-8");
                fileReader.onload = (event) => {
                    try {
                        const parsed = JSON.parse(event.target.result);
                        if (parsed && parsed.tasks && parsed.habits) {
                            state = parsed;
                            saveState();
                            window.location.reload();
                        } else {
                            alert('Invalid backup file structure.');
                        }
                    } catch (err) {
                        alert('Failed to parse JSON file.');
                    }
                };
            }
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all tasks, habits, and focus logs?')) {
                localStorage.removeItem(STORAGE_KEY);
                window.location.reload();
            }
        });
    }
}

/* Helper Escape HTML */
function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

/* Initialize App */
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initTabs();
    initTimer();
    initMatrix();
    initHabits();
    initSettings();
});
