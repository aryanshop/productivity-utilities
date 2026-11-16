document.addEventListener('DOMContentLoaded', () => {
    // State Management
    let state = loadState() || {
        tasks: [
            { id: '1', title: 'Prepare quarterly review presentation', quadrant: 'q1', completed: false },
            { id: '2', title: 'Refactor core modules & unit tests', quadrant: 'q2', completed: false },
            { id: '3', title: 'Review routine team status updates', quadrant: 'q3', completed: false },
            { id: '4', title: 'Clean up old browser bookmarks', quadrant: 'q4', completed: false }
        ],
        habits: [
            { id: 'h1', title: 'Morning 15m Stretch & Mobility', streak: 4, lastCompleted: null },
            { id: 'h2', title: 'Read 20 Pages Non-Fiction', streak: 12, lastCompleted: null }
        ],
        timer: {
            mode: 'work',
            timeLeft: 25 * 60,
            totalTime: 25 * 60,
            isRunning: false,
            linkedTaskId: '',
            stats: {
                completedCount: 0,
                minutesFocused: 0
            }
        }
    };

    let timerInterval = null;

    // Audio Context for Chimes (Web Audio API)
    let audioCtx = null;
    function playChime() {
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
            osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
            osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5); // A5
            
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start();
            osc.stop(audioCtx.currentTime + 1.5);
        } catch (e) {
            console.error('Audio play failed', e);
        }
    }

    // Persistence
    function saveState() {
        try {
            localStorage.setItem('auraslate_state', JSON.stringify(state));
        } catch (e) {
            console.error('Storage failed', e);
        }
    }

    function loadState() {
        try {
            const data = localStorage.getItem('auraslate_state');
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Load failed', e);
            return null;
        }
    }

    // Tabs Routing
    const tabBtns = document.querySelectorAll('.tab-btn');
    const viewSections = document.querySelectorAll('.view-section');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            viewSections.forEach(v => v.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(`view-${tab}`).classList.add('active');
        });
    });

    // Timer Logic
    const timeDisplay = document.getElementById('timer-time');
    const progressRing = document.getElementById('progress-ring');
    const btnStart = document.getElementById('btn-start');
    const btnReset = document.getElementById('btn-reset');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const activeTaskSelect = document.getElementById('active-task-select');
    const statCompleted = document.getElementById('stat-completed');
    const statMinutes = document.getElementById('stat-minutes');

    const CIRCLE_CIRCUMFERENCE = 722;

    function updateTimerDisplay() {
        const mins = Math.floor(state.timer.timeLeft / 60);
        const secs = state.timer.timeLeft % 60;
        timeDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        // Ring Progress
        const progress = state.timer.timeLeft / state.timer.totalTime;
        const offset = CIRCLE_CIRCUMFERENCE - (progress * CIRCLE_CIRCUMFERENCE);
        progressRing.style.strokeDashoffset = offset;

        // Stats
        statCompleted.textContent = state.timer.stats.completedCount;
        statMinutes.textContent = state.timer.stats.minutesFocused;
    }

    function setTimerMode(mode) {
        pauseTimer();
        state.timer.mode = mode;
        let duration = 25 * 60;
        if (mode === 'shortBreak') duration = 5 * 60;
        if (mode === 'longBreak') duration = 15 * 60;

        state.timer.totalTime = duration;
        state.timer.timeLeft = duration;

        modeBtns.forEach(b => {
            if (b.getAttribute('data-mode') === mode) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });

        btnStart.textContent = mode === 'work' ? 'Start Focus' : 'Start Break';
        updateTimerDisplay();
        saveState();
    }

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setTimerMode(btn.getAttribute('data-mode'));
        });
    });

    function startTimer() {
        if (state.timer.isRunning) {
            pauseTimer();
            return;
        }

        state.timer.isRunning = true;
        btnStart.textContent = 'Pause';
        btnStart.classList.replace('btn-primary', 'btn-secondary');

        timerInterval = setInterval(() => {
            if (state.timer.timeLeft > 0) {
                state.timer.timeLeft--;
                if (state.timer.mode === 'work' && state.timer.timeLeft % 60 === 0) {
                    state.timer.stats.minutesFocused++;
                }
                updateTimerDisplay();
            } else {
                pauseTimer();
                playChime();
                if (state.timer.mode === 'work') {
                    state.timer.stats.completedCount++;
                    alert('Focus session completed! Take a well-deserved break.');
                    setTimerMode('shortBreak');
                } else {
                    alert('Break finished! Ready to focus again?');
                    setTimerMode('work');
                }
            }
            saveState();
        }, 1000);
    }

    function pauseTimer() {
        state.timer.isRunning = false;
        clearInterval(timerInterval);
        btnStart.textContent = state.timer.mode === 'work' ? 'Start Focus' : 'Start Break';
        btnStart.classList.replace('btn-secondary', 'btn-primary');
        saveState();
    }

    btnStart.addEventListener('click', startTimer);
    btnReset.addEventListener('click', () => {
        pauseTimer();
        state.timer.timeLeft = state.timer.totalTime;
        updateTimerDisplay();
    });

    activeTaskSelect.addEventListener('change', (e) => {
        state.timer.linkedTaskId = e.target.value;
        saveState();
    });

    // Populate Task Select Dropdown
    function populateTaskSelect() {
        activeTaskSelect.innerHTML = '<option value="">-- None (General Focus) --</option>';
        state.tasks.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.title;
            if (state.timer.linkedTaskId === t.id) {
                opt.selected = true;
            }
            activeTaskSelect.appendChild(opt);
        });
    }

    // Matrix Logic
    const taskModal = document.getElementById('task-modal');
    const taskForm = document.getElementById('task-form');
    const btnAddTask = document.getElementById('btn-add-task');
    const modalTaskCancel = document.getElementById('modal-task-cancel');
    const taskTitleInput = document.getElementById('task-title-input');
    const taskQuadrantSelect = document.getElementById('task-quadrant-select');
    const taskIdInput = document.getElementById('task-id');
    const modalTaskTitle = document.getElementById('modal-task-title');

    function renderMatrix() {
        ['q1', 'q2', 'q3', 'q4'].forEach(q => {
            document.getElementById(`list-${q}`).innerHTML = '';
        });

        state.tasks.forEach(task => {
            const listEl = document.getElementById(`list-${task.quadrant}`);
            if (!listEl) return;

            const item = document.createElement('div');
            item.className = `task-item ${task.completed ? 'completed' : ''}`;
            item.innerHTML = `
                <div class="task-content">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}" class="task-checkbox">
                    <span>${escapeHtml(task.title)}</span>
                </div>
                <div class="task-actions">
                    <button class="icon-btn edit-task" data-id="${task.id}" title="Edit">✏️</button>
                    <button class="icon-btn delete-task" data-id="${task.id}" title="Delete">🗑️</button>
                </div>
            `;
            listEl.appendChild(item);
        });

        populateTaskSelect();
        saveState();
    }

    btnAddTask.addEventListener('click', () => {
        taskIdInput.value = '';
        taskTitleInput.value = '';
        modalTaskTitle.textContent = 'Add Task';
        taskModal.classList.add('open');
        taskTitleInput.focus();
    });

    modalTaskCancel.addEventListener('click', () => {
        taskModal.classList.remove('open');
    });

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = taskIdInput.value;
        const title = taskTitleInput.value.trim();
        const quadrant = taskQuadrantSelect.value;

        if (!title) return;

        if (id) {
            const task = state.tasks.find(t => t.id === id);
            if (task) {
                task.title = title;
                task.quadrant = quadrant;
            }
        } else {
            state.tasks.push({
                id: 't_' + Date.now(),
                title,
                quadrant,
                completed: false
            });
        }

        taskModal.classList.remove('open');
        renderMatrix();
    });

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('task-checkbox')) {
            const id = e.target.getAttribute('data-id');
            const task = state.tasks.find(t => t.id === id);
            if (task) {
                task.completed = e.target.checked;
                renderMatrix();
            }
        }
        if (e.target.classList.contains('delete-task') || e.target.closest('.delete-task')) {
            const btn = e.target.closest('.delete-task');
            const id = btn.getAttribute('data-id');
            state.tasks = state.tasks.filter(t => t.id !== id);
            renderMatrix();
        }
        if (e.target.classList.contains('edit-task') || e.target.closest('.edit-task')) {
            const btn = e.target.closest('.edit-task');
            const id = btn.getAttribute('data-id');
            const task = state.tasks.find(t => t.id === id);
            if (task) {
                taskIdInput.value = task.id;
                taskTitleInput.value = task.title;
                taskQuadrantSelect.value = task.quadrant;
                modalTaskTitle.textContent = 'Edit Task';
                taskModal.classList.add('open');
            }
        }
    });

    // Habits Logic
    const habitsContainer = document.getElementById('habits-container');
    const btnAddHabit = document.getElementById('btn-add-habit');
    const habitModal = document.getElementById('habit-modal');
    const habitForm = document.getElementById('habit-form');
    const modalHabitCancel = document.getElementById('modal-habit-cancel');
    const habitTitleInput = document.getElementById('habit-title-input');

    function renderHabits() {
        habitsContainer.innerHTML = '';
        const todayStr = new Date().toDateString();

        state.habits.forEach(habit => {
            const isCheckedToday = habit.lastCompleted === todayStr;
            const card = document.createElement('div');
            card.className = 'habit-card';
            card.innerHTML = `
                <div class="habit-info">
                    <span class="habit-title">${escapeHtml(habit.title)}</span>
                    <span class="habit-streak">🔥 ${habit.streak} Day Streak</span>
                </div>
                <div class="habit-actions">
                    <button class="habit-check-btn ${isCheckedToday ? 'checked' : ''}" data-id="${habit.id}" title="Complete Today">✓</button>
                    <button class="icon-btn delete-habit" data-id="${habit.id}" title="Delete Habit">🗑️</button>
                </div>
            `;
            habitsContainer.appendChild(card);
        });
        saveState();
    }

    btnAddHabit.addEventListener('click', () => {
        habitTitleInput.value = '';
        habitModal.classList.add('open');
        habitTitleInput.focus();
    });

    modalHabitCancel.addEventListener('click', () => {
        habitModal.classList.remove('open');
    });

    habitForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = habitTitleInput.value.trim();
        if (!title) return;

        state.habits.push({
            id: 'h_' + Date.now(),
            title,
            streak: 0,
            lastCompleted: null
        });

        habitModal.classList.remove('open');
        renderHabits();
    });

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('habit-check-btn')) {
            const id = e.target.getAttribute('data-id');
            const habit = state.habits.find(h => h.id === id);
            const todayStr = new Date().toDateString();

            if (habit) {
                if (habit.lastCompleted === todayStr) {
                    habit.lastCompleted = null;
                    habit.streak = Math.max(0, habit.streak - 1);
                } else {
                    habit.lastCompleted = todayStr;
                    habit.streak += 1;
                }
                renderHabits();
            }
        }
        if (e.target.classList.contains('delete-habit') || e.target.closest('.delete-habit')) {
            const btn = e.target.closest('.delete-habit');
            const id = btn.getAttribute('data-id');
            state.habits = state.habits.filter(h => h.id !== id);
            renderHabits();
        }
    });

    // Import / Export JSON
    const btnExport = document.getElementById('btn-export');
    const btnImport = document.getElementById('btn-import');
    const importFile = document.getElementById('import-file');

    btnExport.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", `auraslate_backup_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
    });

    btnImport.addEventListener('click', () => {
        importFile.click();
    });

    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                if (parsed && parsed.tasks && parsed.habits && parsed.timer) {
                    state = parsed;
                    renderMatrix();
                    renderHabits();
                    setTimerMode(state.timer.mode || 'work');
                    updateTimerDisplay();
                    alert('Workspace successfully imported!');
                } else {
                    alert('Invalid backup file structure.');
                }
            } catch (err) {
                alert('Failed to parse JSON file.');
            }
        };
        reader.readAsText(file);
        importFile.value = '';
    });

    function escapeHtml(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }

    // Initial Render
    renderMatrix();
    renderHabits();
    setTimerMode(state.timer.mode || 'work');
    updateTimerDisplay();
});
