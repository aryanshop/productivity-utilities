document.addEventListener('DOMContentLoaded', () => {
    // --- APPLICATION STATE --- 
    const STORAGE_KEY = 'auraslate_studio_data_v1';
    
    let appState = {
        timer: {
            mode: 'pomodoro',
            duration: 25 * 60,
            timeLeft: 25 * 60,
            isRunning: false,
            sessionsCompleted: 0
        },
        tasks: [],
        habits: []
    };

    let timerInterval = null;

    // Load local storage
    function loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                appState = Object.assign({}, appState, parsed);
                // Reset timer running state on load
                appState.timer.isRunning = false;
                appState.timer.timeLeft = appState.timer.duration;
            } else {
                // Default seed data for first-time visitors
                appState.tasks = [
                    { id: 't1', text: 'Define project architecture & specs', quadrant: 'q1', completed: false },
                    { id: 't2', text: 'Refactor core modules & write docs', quadrant: 'q2', completed: false },
                    { id: 't3', text: 'Review team status updates', quadrant: 'q3', completed: false },
                    { id: 't4', text: 'Browse tech articles', quadrant: 'q4', completed: true }
                ];
                appState.habits = [
                    { id: 'h1', name: 'Morning Meditation (15m)', days: [true, true, false, true, true, false, false] },
                    { id: 'h2', name: 'Code Kata / Practice', days: [true, true, true, true, true, false, false] }
                ];
            }
        } catch (e) {
            console.error('Failed to load local storage data', e);
        }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
        } catch (e) {
            console.error('Failed to save local storage data', e);
        }
    }

    // --- TAB NAVIGATION --- 
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            const activePanel = document.getElementById(`tab-${targetTab}`);
            if (activePanel) activePanel.classList.add('active');
        });
    });

    // --- AUDIO SYNTHESIZER (Web Audio API) --- 
    let audioCtx = null;

    function playChime() {
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!audioCtx) {
                audioCtx = new AudioContext();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            
            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(528, now); // Solfeggio frequency
            
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start(now);
            osc.stop(now + 1.5);
        } catch (e) {
            console.log('Web Audio API not supported or blocked', e);
        }
    }

    // --- POMODORO TIMER --- 
    const modeBtns = document.querySelectorAll('.mode-btn');
    const minutesEl = document.getElementById('minutes');
    const secondsEl = document.getElementById('seconds');
    const btnStart = document.getElementById('btn-start');
    const btnReset = document.getElementById('btn-reset');
    const sessionCountEl = document.getElementById('session-count');
    const progressBar = document.getElementById('progress-bar');

    const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 125; // r = 125
    if (progressBar) {
        progressBar.style.strokeDasharray = CIRCLE_CIRCUMFERENCE;
    }

    function setTimerMode(mode) {
        appState.timer.mode = mode;
        appState.timer.isRunning = false;
        if (timerInterval) clearInterval(timerInterval);
        
        if (mode === 'pomodoro') {
            appState.timer.duration = 25 * 60;
        } else if (mode === 'shortBreak') {
            appState.timer.duration = 5 * 60;
        } else if (mode === 'longBreak') {
            appState.timer.duration = 15 * 60;
        }
        
        appState.timer.timeLeft = appState.timer.duration;
        
        modeBtns.forEach(b => {
            if (b.getAttribute('data-mode') === mode) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });
        
        if (btnStart) btnStart.textContent = mode === 'pomodoro' ? 'Start Focus' : 'Start Break';
        updateTimerDisplay();
    }

    function updateTimerDisplay() {
        const mins = Math.floor(appState.timer.timeLeft / 60);
        const secs = appState.timer.timeLeft % 60;
        
        if (minutesEl) minutesEl.textContent = String(mins).padStart(2, '0');
        if (secondsEl) secondsEl.textContent = String(secs).padStart(2, '0');
        if (sessionCountEl) sessionCountEl.textContent = appState.timer.sessionsCompleted;
        
        if (progressBar) {
            const progress = appState.timer.timeLeft / appState.timer.duration;
            const offset = CIRCLE_CIRCUMFERENCE - (progress * CIRCLE_CIRCUMFERENCE);
            progressBar.style.strokeDashoffset = offset;
        }
    }

    function toggleTimer() {
        if (appState.timer.isRunning) {
            clearInterval(timerInterval);
            appState.timer.isRunning = false;
            if (btnStart) btnStart.textContent = 'Resume';
        } else {
            appState.timer.isRunning = true;
            if (btnStart) btnStart.textContent = 'Pause';
            
            timerInterval = setInterval(() => {
                if (appState.timer.timeLeft > 0) {
                    appState.timer.timeLeft--;
                    updateTimerDisplay();
                } else {
                    clearInterval(timerInterval);
                    appState.timer.isRunning = false;
                    playChime();
                    
                    if (appState.timer.mode === 'pomodoro') {
                        appState.timer.sessionsCompleted++;
                        alert('Focus session complete! Time for a break.');
                        setTimerMode('shortBreak');
                    } else {
                        alert('Break finished! Ready to focus?');
                        setTimerMode('pomodoro');
                    }
                    saveState();
                }
            }, 1000);
        }
    }

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setTimerMode(btn.getAttribute('data-mode'));
        });
    });

    if (btnStart) {
        btnStart.addEventListener('click', toggleTimer);
    }

    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if (timerInterval) clearInterval(timerInterval);
            appState.timer.isRunning = false;
            appState.timer.timeLeft = appState.timer.duration;
            if (btnStart) btnStart.textContent = appState.timer.mode === 'pomodoro' ? 'Start Focus' : 'Start Break';
            updateTimerDisplay();
        });
    }

    // --- EISENHOWER MATRIX --- 
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskQuadrantSelect = document.getElementById('task-quadrant');

    function renderTasks() {
        const quadrants = ['q1', 'q2', 'q3', 'q4'];
        quadrants.forEach(q => {
            const listEl = document.getElementById(`list-${q}`);
            if (!listEl) return;
            
            listEl.innerHTML = '';
            const filtered = appState.tasks.filter(t => t.quadrant === q);
            
            if (filtered.length === 0) {
                const emptyLi = document.createElement('li');
                emptyLi.className = 'task-item';
                emptyLi.style.justifyContent = 'center';
                emptyLi.style.color = 'var(--text-secondary)';
                emptyLi.style.fontSize = '0.85rem';
                emptyLi.textContent = 'No tasks in this quadrant';
                listEl.appendChild(emptyLi);
                return;
            }
            
            filtered.forEach(task => {
                const li = document.createElement('li');
                li.className = `task-item ${task.completed ? 'completed' : ''}`;
                
                li.innerHTML = `
                    <div class="task-content">
                        <input type="checkbox" class="task-checkbox-item" ${task.completed ? 'checked' : ''} data-id="${task.id}">
                        <span>${escapeHtml(task.text)}</span>
                    </div>
                    <div class="task-actions">
                        <button class="icon-btn delete" data-id="${task.id}" title="Delete task">&times;</button>
                    </div>
                `;
                listEl.appendChild(li);
            });
        });

        // Bind task action listeners
        document.querySelectorAll('.task-checkbox-item').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                const task = appState.tasks.find(t => t.id === id);
                if (task) {
                    task.completed = e.target.checked;
                    saveState();
                    renderTasks();
                }
            });
        });

        document.querySelectorAll('.task-item .delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                appState.tasks = appState.tasks.filter(t => t.id !== id);
                saveState();
                renderTasks();
            });
        });
    }

    if (taskForm) {
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = taskInput.value.trim();
            const quadrant = taskQuadrantSelect.value;
            
            if (text) {
                const newTask = {
                    id: 't_' + Date.now(),
                    text,
                    quadrant,
                    completed: false
                };
                appState.tasks.push(newTask);
                taskInput.value = '';
                saveState();
                renderTasks();
            }
        });
    }

    // --- DAILY HABITS --- 
    const habitForm = document.getElementById('habit-form');
    const habitInput = document.getElementById('habit-input');
    const habitsTbody = document.getElementById('habits-tbody');

    function calculateStreak(daysArray) {
        let streak = 0;
        // Check from most recent day backwards
        for (let i = daysArray.length - 1; i >= 0; i--) {
            if (daysArray[i]) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }

    function renderHabits() {
        if (!habitsTbody) return;
        habitsTbody.innerHTML = '';

        if (appState.habits.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="10" style="text-align: center; color: var(--text-secondary);">No habits tracked yet. Add one above!</td>`;
            habitsTbody.appendChild(tr);
            return;
        }

        appState.habits.forEach(habit => {
            const streak = calculateStreak(habit.days);
            const tr = document.createElement('tr');
            
            let daysHtml = '';
            for (let i = 0; i < 7; i++) {
                const checked = habit.days[i] ? 'checked' : '';
                daysHtml += `
                    <td class="day-col">
                        <input type="checkbox" class="habit-checkbox" ${checked} data-habit-id="${habit.id}" data-day-index="${i}">
                    </td>
                `;
            }

            tr.innerHTML = `
                <td><strong>${escapeHtml(habit.name)}</strong></td>
                <td><span class="streak-badge">🔥 ${streak} day${streak === 1 ? '' : 's'}</span></td>
                ${daysHtml}
                <td>
                    <button class="icon-btn delete habit-delete" data-habit-id="${habit.id}" title="Delete habit">&times;</button>
                </td>
            `;
            habitsTbody.appendChild(tr);
        });

        // Bind habit day checkbox listeners
        document.querySelectorAll('.habits-table .habit-checkbox').forEach(chk => {
            chk.addEventListener('change', (e) => {
                const habitId = e.target.getAttribute('data-habit-id');
                const dayIndex = parseInt(e.target.getAttribute('data-day-index'), 10);
                const habit = appState.habits.find(h => h.id === habitId);
                if (habit) {
                    habit.days[dayIndex] = e.target.checked;
                    saveState();
                    renderHabits();
                }
            });
        });

        // Bind habit delete listeners
        document.querySelectorAll('.habit-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const habitId = e.target.getAttribute('data-habit-id');
                appState.habits = appState.habits.filter(h => h.id !== habitId);
                saveState();
                renderHabits();
            });
        });
    }

    if (habitForm) {
        habitForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = habitInput.value.trim();
            if (name) {
                const newHabit = {
                    id: 'h_' + Date.now(),
                    name,
                    days: [false, false, false, false, false, false, false]
                };
                appState.habits.push(newHabit);
                habitInput.value = '';
                saveState();
                renderHabits();
            }
        });
    }

    // --- EXPORT & IMPORT BACKUP --- 
    const btnExport = document.getElementById('btn-export');
    const importFile = document.getElementById('import-file');

    if (btnExport) {
        btnExport.addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8,";
            const jsonPayload = JSON.stringify(appState, null, 2);
            const encodedUri = encodeURI(dataStr + jsonPayload);
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute('href', encodedUri);
            downloadAnchor.setAttribute('download', `auraslate_backup_${new Date().toISOString().slice(0, 10)}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        });
    }

    if (importFile) {
        importFile.addEventListener('change', (e) => {
            const fileReader = new FileReader();
            if (e.target.files[0]) {
                fileReader.readAsText(e.target.files[0], 'UTF-8');
                fileReader.onload = (event) => {
                    try {
                        const parsed = JSON.parse(event.target.result);
                        if (parsed && typeof parsed === 'object') {
                            appState = Object.assign({}, appState, parsed);
                            saveState();
                            updateTimerDisplay();
                            renderTasks();
                            renderHabits();
                            alert('Workspace successfully imported!');
                        }
                    } catch (err) {
                        alert('Invalid JSON file format.');
                        console.error(err);
                    }
                };
            }
        });
    }

    // --- UTILITIES --- 
    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // --- INITIALIZE APP --- 
    loadState();
    updateTimerDisplay();
    renderTasks();
    renderHabits();
});
