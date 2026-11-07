document.addEventListener('DOMContentLoaded', () => {
    // App State
    let state = {
        timer: {
            mode: 'pomodoro',
            duration: 25 * 60,
            timeLeft: 25 * 60,
            isRunning: false,
            timerId: null,
            activeTask: null
        },
        habits: [
            { id: 'h1', title: 'Morning Hydration & Stretches', completedToday: false, streak: 4 },
            { id: 'h2', title: 'Deep Work Session (90 mins)', completedToday: false, streak: 2 },
            { id: 'h3', title: 'Read 20 Pages', completedToday: true, streak: 12 }
        ],
        tasks: [
            { id: 't1', title: 'Finalize project quarterly review architecture', quadrant: 'q1', completed: false },
            { id: 't2', title: 'Design user onboarding flow wireframes', quadrant: 'q2', completed: false },
            { id: 't3', title: 'Review routine team status updates', quadrant: 'q3', completed: false },
            { id: 't4', title: 'Organize desktop folders and bookmarks', quadrant: 'q4', completed: true }
        ]
    };

    // Load local storage if available
    const savedState = localStorage.getItem('auraslate_state');
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            if (parsed.habits && parsed.tasks) {
                state.habits = parsed.habits;
                state.tasks = parsed.tasks;
            }
        } catch (e) {
            console.error('Failed to load saved state', e);
        }
    }

    function saveState() {
        localStorage.setItem('auraslate_state', JSON.stringify({
            habits: state.habits,
            tasks: state.tasks
        }));
    }

    // Audio chime using Web Audio API
    function playChime() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5); // A5
            
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.2);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start();
            osc.stop(ctx.currentTime + 1.2);
        } catch (e) {
            console.log('Audio not supported or blocked', e);
        }
    }

    // Timer Elements
    const timeDisplay = document.getElementById('time-display');
    const startTimerBtn = document.getElementById('start-timer');
    const pauseTimerBtn = document.getElementById('pause-timer');
    const resetTimerBtn = document.getElementById('reset-timer');
    const modeBtns = document.querySelectorAll('.mode-btn');
    const progressCircle = document.querySelector('.progress-ring__circle');
    const currentFocusTaskEl = document.getElementById('current-focus-task');

    const circumference = 2 * Math.PI * 100; // r = 100
    if (progressCircle) {
        progressCircle.style.strokeDasharray = circumference;
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(state.timer.timeLeft / 60);
        const seconds = state.timer.timeLeft % 60;
        timeDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (progressCircle) {
            const progress = state.timer.timeLeft / state.timer.duration;
            const offset = circumference - (progress * circumference);
            progressCircle.style.strokeDashoffset = offset;
        }

        document.title = `(${timeDisplay.textContent}) AuraSlate Studio`;
    }

    function switchTimerMode(minutes, modeName, btnElement) {
        if (state.timer.isRunning) {
            clearInterval(state.timer.timerId);
            state.timer.isRunning = false;
            startTimerBtn.textContent = 'Start Sprint';
            pauseTimerBtn.disabled = true;
        }
        state.timer.mode = modeName;
        state.timer.duration = minutes * 60;
        state.timer.timeLeft = minutes * 60;
        
        modeBtns.forEach(b => b.classList.remove('active'));
        if (btnElement) btnElement.classList.add('active');
        updateTimerDisplay();
    }

    modeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mins = parseInt(e.target.getAttribute('data-time'));
            let name = 'pomodoro';
            if (mins === 5) name = 'shortBreak';
            if (mins === 15) name = 'longBreak';
            switchTimerMode(mins, name, e.target);
        });
    });

    function startTimer() {
        if (state.timer.isRunning) return;
        state.timer.isRunning = true;
        startTimerBtn.textContent = 'Running...';
        pauseTimerBtn.disabled = false;

        state.timer.timerId = setInterval(() => {
            if (state.timer.timeLeft > 0) {
                state.timer.timeLeft--;
                updateTimerDisplay();
            } else {
                clearInterval(state.timer.timerId);
                state.timer.isRunning = false;
                startTimerBtn.textContent = 'Start Sprint';
                pauseTimerBtn.disabled = true;
                playChime();
                alert('Focus session completed! Take a well-deserved break.');
            }
        }, 1000);
    }

    function pauseTimer() {
        if (!state.timer.isRunning) return;
        clearInterval(state.timer.timerId);
        state.timer.isRunning = false;
        startTimerBtn.textContent = 'Resume';
        pauseTimerBtn.disabled = true;
    }

    function resetTimer() {
        clearInterval(state.timer.timerId);
        state.timer.isRunning = false;
        state.timer.timeLeft = state.timer.duration;
        startTimerBtn.textContent = 'Start Sprint';
        pauseTimerBtn.disabled = true;
        updateTimerDisplay();
    }

    startTimerBtn.addEventListener('click', startTimer);
    pauseTimerBtn.addEventListener('click', pauseTimer);
    resetTimerBtn.addEventListener('click', resetTimer);

    // Habits Section
    const habitForm = document.getElementById('habit-form');
    const habitInput = document.getElementById('habit-input');
    const habitsList = document.getElementById('habits-list');

    function renderHabits() {
        habitsList.innerHTML = '';
        if (state.habits.length === 0) {
            habitsList.innerHTML = '<li class="item-row"><span class="item-title">No habits added yet.</span></li>';
            return;
        }

        state.habits.forEach(habit => {
            const li = document.createElement('li');
            li.className = 'item-row';
            li.innerHTML = `
                <div class="item-info">
                    <input type="checkbox" data-id="${habit.id}" ${habit.completedToday ? 'checked' : ''}>
                    <span class="item-title ${habit.completedToday ? 'completed' : ''}">${escapeHTML(habit.title)}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="streak-badge">🔥 ${habit.streak} streak</span>
                    <button class="delete-btn" data-id="${habit.id}" title="Delete habit">&times;</button>
                </div>
            `;
            habitsList.appendChild(li);
        });
    }

    habitForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = habitInput.value.trim();
        if (!val) return;

        state.habits.push({
            id: 'h_' + Date.now(),
            title: val,
            completedToday: false,
            streak: 0
        });
        habitInput.value = '';
        saveState();
        renderHabits();
    });

    habitsList.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            const id = e.target.getAttribute('data-id');
            const habit = state.habits.find(h => h.id === id);
            if (habit) {
                habit.completedToday = e.target.checked;
                if (habit.completedToday) {
                    habit.streak += 1;
                } else {
                    habit.streak = Math.max(0, habit.streak - 1);
                }
                saveState();
                renderHabits();
            }
        }
    });

    habitsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn')) {
            const id = e.target.getAttribute('data-id');
            state.habits = state.habits.filter(h => h.id !== id);
            saveState();
            renderHabits();
        }
    });

    // Eisenhower Matrix Section
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskQuadrantSelect = document.getElementById('task-quadrant');

    function renderTasks() {
        ['q1', 'q2', 'q3', 'q4'].forEach(q => {
            const container = document.getElementById(`tasks-${q}`);
            container.innerHTML = '';

            const filtered = state.tasks.filter(t => t.quadrant === q);
            if (filtered.length === 0) {
                container.innerHTML = '<div style="font-size: 0.8rem; color: #94a3b8; text-align: center; padding: 12px;">No tasks in this quadrant</div>';
                return;
            }

            filtered.forEach(task => {
                const div = document.createElement('div');
                div.className = 'matrix-task';
                div.innerHTML = `
                    <div class="matrix-task-left">
                        <input type="checkbox" data-task-id="${task.id}" ${task.completed ? 'checked' : ''}>
                        <span class="matrix-task-title ${task.completed ? 'done' : ''}">${escapeHTML(task.title)}</span>
                    </div>
                    <div class="matrix-task-actions">
                        <button class="focus-btn" data-focus-title="${escapeHTML(task.title)}" title="Set as Active Timer Task">Focus</button>
                        <button class="delete-btn" data-task-id="${task.id}" title="Delete task">&times;</button>
                    </div>
                `;
                container.appendChild(div);
            });
        });
    }

    taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = taskInput.value.trim();
        const quadrant = taskQuadrantSelect.value;
        if (!title) return;

        state.tasks.push({
            id: 't_' + Date.now(),
            title: title,
            quadrant: quadrant,
            completed: false
        });

        taskInput.value = '';
        saveState();
        renderTasks();
    });

    document.addEventListener('change', (e) => {
        if (e.target.hasAttribute('data-task-id')) {
            const id = e.target.getAttribute('data-task-id');
            const task = state.tasks.find(t => t.id === id);
            if (task) {
                task.completed = e.target.checked;
                saveState();
                renderTasks();
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-btn') && e.target.hasAttribute('data-task-id')) {
            const id = e.target.getAttribute('data-task-id');
            state.tasks = state.tasks.filter(t => t.id !== id);
            saveState();
            renderTasks();
        }

        if (e.target.classList.contains('focus-btn')) {
            const title = e.target.getAttribute('data-focus-title');
            state.timer.activeTask = title;
            if (currentFocusTaskEl) {
                currentFocusTaskEl.textContent = title;
            }
        }
    });

    // Export & Import functionality
    const exportBtn = document.getElementById('export-btn');
    const importFile = document.getElementById('import-file');

    exportBtn.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
            habits: state.habits,
            tasks: state.tasks
        }, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `auraslate_backup_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const parsed = JSON.parse(event.target.result);
                if (parsed.habits && parsed.tasks) {
                    state.habits = parsed.habits;
                    state.tasks = parsed.tasks;
                    saveState();
                    renderHabits();
                    renderTasks();
                    alert('Workspace imported successfully!');
                } else {
                    alert('Invalid JSON file format.');
                }
            } catch (err) {
                alert('Error parsing JSON file.');
            }
        };
        reader.readAsText(file);
    });

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }

    // Initial render
    updateTimerDisplay();
    renderHabits();
    renderTasks();
});
