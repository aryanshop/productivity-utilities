document.addEventListener('DOMContentLoaded', () => {
    // --- TAB SWITCHING --- 
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-tab');
            tabButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // --- LOCAL STORAGE HELPERS --- 
    const loadData = (key, fallback) => {
        try {
            const item = localStorage.getItem('zenflow_' + key);
            return item ? JSON.parse(item) : fallback;
        } catch (e) {
            return fallback;
        }
    };

    const saveData = (key, data) => {
        try {
            localStorage.setItem('zenflow_' + key, JSON.stringify(data));
        } catch (e) {}
    };

    // --- RITUAL TIMER LOGIC --- 
    let defaultSteps = [
        { name: 'Mindful Breathing', duration: 60 },
        { name: 'Hydrate & Gentle Stretch', duration: 120 },
        { name: 'Review Daily Intentions', duration: 90 }
    ];

    let ritualSteps = loadData('ritual_steps', defaultSteps);
    let currentStepIndex = 0;
    let timeLeft = 0;
    let timerInterval = null;
    let isRunning = false;
    let isPaused = false;

    const sequenceListEl = document.getElementById('sequenceList');
    const stepNameInput = document.getElementById('stepNameInput');
    const stepDurationInput = document.getElementById('stepDurationInput');
    const addStepBtn = document.getElementById('addStepBtn');
    const currentStepTitleEl = document.getElementById('currentStepTitle');
    const timerClockEl = document.getElementById('timerClock');
    const nextStepLabelEl = document.getElementById('nextStepLabel');
    const startRitualBtn = document.getElementById('startRitualBtn');
    const pauseRitualBtn = document.getElementById('pauseRitualBtn');
    const skipRitualBtn = document.getElementById('skipRitualBtn');
    const resetRitualBtn = document.getElementById('resetRitualBtn');
    const breathHaloEl = document.getElementById('breathHalo');

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function renderSequence() {
        sequenceListEl.innerHTML = '';
        if (ritualSteps.length === 0) {
            sequenceListEl.innerHTML = '<p class="section-desc">No steps in sequence. Add one below!</p>';
            return;
        }

        ritualSteps.forEach((step, index) => {
            const item = document.createElement('div');
            item.className = `sequence-item ${isRunning && index === currentStepIndex ? 'active-step' : ''}`;
            item.innerHTML = `
                <div class="sequence-item-info">
                    <span>${index + 1}. ${escapeHTML(step.name)}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span class="sequence-item-time">${formatTime(step.duration)}</span>
                    ${!isRunning ? `<button class="btn btn-danger btn-sm" data-index="${index}">&times;</button>` : ''}
                </div>
            `;

            const deleteBtn = item.querySelector('button');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    ritualSteps.splice(index, 1);
                    saveData('ritual_steps', ritualSteps);
                    renderSequence();
                    resetTimerDisplay();
                });
            }

            sequenceListEl.appendChild(item);
        });

        updateTimerDisplayState();
    }

    function updateTimerDisplayState() {
        if (ritualSteps.length === 0) {
            currentStepTitleEl.textContent = 'No Steps Configured';
            timerClockEl.textContent = '00:00';
            nextStepLabelEl.textContent = 'Next: None';
            startRitualBtn.disabled = true;
            return;
        }

        startRitualBtn.disabled = isRunning;
        pauseRitualBtn.disabled = !isRunning;
        skipRitualBtn.disabled = !isRunning;

        if (!isRunning && !isPaused) {
            currentStepTitleEl.textContent = ritualSteps[0].name;
            timeLeft = ritualSteps[0].duration;
            timerClockEl.textContent = formatTime(timeLeft);
            nextStepLabelEl.textContent = ritualSteps.length > 1 ? `Next: ${ritualSteps[1].name}` : 'Next: End of Ritual';
        }
    }

    function resetTimerDisplay() {
        clearInterval(timerInterval);
        isRunning = false;
        isPaused = false;
        currentStepIndex = 0;
        breathHaloEl.className = 'breath-halo';
        pauseRitualBtn.textContent = 'Pause';
        updateTimerDisplayState();
    }

    function startRitual() {
        if (ritualSteps.length === 0) return;
        if (!isRunning && !isPaused) {
            currentStepIndex = 0;
            timeLeft = ritualSteps[0].duration;
        }
        isRunning = true;
        isPaused = false;
        pauseRitualBtn.textContent = 'Pause';
        updateTimerDisplayState();
        renderSequence();

        // Breath animation cycle simulation
        let breathPhase = 0; // 0 for inhale, 1 for exhale
        const breathInterval = setInterval(() => {
            if (!isRunning) {
                clearInterval(breathInterval);
                return;
            }
            breathPhase = 1 - breathPhase;
            breathHaloEl.className = `breath-halo ${breathPhase === 0 ? 'inhale' : 'exhale'}`;
        }, 4000);

        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                timerClockEl.textContent = formatTime(timeLeft);
            } else {
                // Advance step
                currentStepIndex++;
                if (currentStepIndex < ritualSteps.length) {
                    timeLeft = ritualSteps[currentStepIndex].duration;
                    currentStepTitleEl.textContent = ritualSteps[currentStepIndex].name;
                    nextStepLabelEl.textContent = currentStepIndex + 1 < ritualSteps.length ? `Next: ${ritualSteps[currentStepIndex + 1].name}` : 'Next: End of Ritual';
                    renderSequence();
                } else {
                    // Complete ritual
                    clearInterval(timerInterval);
                    isRunning = false;
                    breathHaloEl.className = 'breath-halo';
                    currentStepTitleEl.textContent = 'Ritual Completed ✨';
                    timerClockEl.textContent = '00:00';
                    nextStepLabelEl.textContent = 'Great job taking time for yourself.';
                    startRitualBtn.disabled = false;
                    pauseRitualBtn.disabled = true;
                    skipRitualBtn.disabled = true;
                    renderSequence();
                }
            }
        }, 1000);
    }

    addStepBtn.addEventListener('click', () => {
        const name = stepNameInput.value.trim();
        const duration = parseInt(stepDurationInput.value, 10);
        if (!name) return;
        if (isNaN(duration) || duration <= 0) return;

        ritualSteps.push({ name, duration });
        saveData('ritual_steps', ritualSteps);
        stepNameInput.value = '';
        renderSequence();
    });

    startRitualBtn.addEventListener('click', startRitual);

    pauseRitualBtn.addEventListener('click', () => {
        if (!isRunning) return;
        if (!isPaused) {
            clearInterval(timerInterval);
            isRunning = false;
            isPaused = true;
            pauseRitualBtn.textContent = 'Resume';
            startRitualBtn.disabled = false;
        } else {
            startRitual();
        }
    });

    skipRitualBtn.addEventListener('click', () => {
        if (!isRunning) return;
        timeLeft = 0;
    });

    resetRitualBtn.addEventListener('click', resetTimerDisplay);

    renderSequence();

    // --- MICRO-HABITS LOGIC --- 
    let defaultHabits = [
        { id: '1', title: 'Hydrate immediately upon waking', streak: 3, lastCompleted: null },
        { id: '2', title: '5-minute evening room reset', streak: 5, lastCompleted: null }
    ];

    let habits = loadData('micro_habits', defaultHabits);
    const habitsGridEl = document.getElementById('habitsGrid');
    const habitTitleInput = document.getElementById('habitTitleInput');
    const addHabitBtn = document.getElementById('addHabitBtn');

    function getTodayString() {
        const d = new Date();
        return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    }

    function renderHabits() {
        habitsGridEl.innerHTML = '';
        if (habits.length === 0) {
            habitsGridEl.innerHTML = '<p class="section-desc">No micro-habits created yet. Add one above.</p>';
            return;
        }

        const today = getTodayString();

        habits.forEach(habit => {
            const isCompletedToday = habit.lastCompleted === today;
            const card = document.createElement('div');
            card.className = 'habit-card';
            card.innerHTML = `
                <div class="habit-header-row">
                    <span class="habit-title">${escapeHTML(habit.title)}</span>
                    <span class="habit-streak">&#128293; ${habit.streak} day streak</span>
                </div>
                <div class="habit-footer-row">
                    <button class="btn btn-danger btn-sm delete-habit" data-id="${habit.id}">Delete</button>
                    <button class="habit-check-btn ${isCompletedToday ? 'completed' : ''}" data-id="${habit.id}">
                        ${isCompletedToday ? 'Completed &#10003;' : 'Check for Today'}
                    </button>
                </div>
            `;

            card.querySelector('.delete-habit').addEventListener('click', () => {
                habits = habits.filter(h => h.id !== habit.id);
                saveData('micro_habits', habits);
                renderHabits();
            });

            card.querySelector('.habit-check-btn').addEventListener('click', () => {
                if (habit.lastCompleted === today) {
                    // Uncheck
                    habit.lastCompleted = null;
                    habit.streak = Math.max(0, habit.streak - 1);
                } else {
                    // Check
                    habit.lastCompleted = today;
                    habit.streak += 1;
                }
                saveData('micro_habits', habits);
                renderHabits();
            });

            habitsGridEl.appendChild(card);
        });
    }

    addHabitBtn.addEventListener('click', () => {
        const title = habitTitleInput.value.trim();
        if (!title) return;

        const newHabit = {
            id: Date.now().toString(),
            title,
            streak: 0,
            lastCompleted: null
        };

        habits.push(newHabit);
        saveData('micro_habits', habits);
        habitTitleInput.value = '';
        renderHabits();
    });

    renderHabits();

    // --- REFLECTION JOURNAL LOGIC --- 
    const prompts = [
        "What is one small friction in your workflow you can eliminate today?",
        "What are you grateful for right now, no matter how small?",
        "If you could only accomplish ONE meaningful task today, what would it be?",
        "What did you learn from a recent mistake or setback?",
        "How can you show yourself a little more patience today?",
        "What distraction can you consciously let go of for the next hour?"
    ];

    const promptTextEl = document.getElementById('promptText');
    const newPromptBtn = document.getElementById('newPromptBtn');
    const journalTextarea = document.getElementById('journalTextarea');
    const saveJournalBtn = document.getElementById('saveJournalBtn');
    const journalStatusEl = document.getElementById('journalStatus');

    function setRandomPrompt() {
        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
        promptTextEl.textContent = `\u201c${randomPrompt}\u201d`;
    }

    newPromptBtn.addEventListener('click', setRandomPrompt);
    setRandomPrompt();

    // Load journal draft
    const savedJournal = loadData('journal_draft', '');
    journalTextarea.value = savedJournal;

    journalTextarea.addEventListener('input', () => {
        journalStatusEl.textContent = 'Unsaved changes...';
    });

    saveJournalBtn.addEventListener('click', () => {
        saveData('journal_draft', journalTextarea.value);
        journalStatusEl.textContent = 'Saved successfully!';
        setTimeout(() => {
            journalStatusEl.textContent = 'All changes saved locally';
        }, 2500);
    });

    function escapeHTML(str) {
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
});
