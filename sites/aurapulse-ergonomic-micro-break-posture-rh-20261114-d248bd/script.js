/* =========================================================
   AuraPulse — Ergonomic Micro-Break & Posture Rhythm Architect
   Vanilla JavaScript Application Logic
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    const state = {
        activeTab: 'timer',
        workDuration: 25, * 60, // in seconds
        breakDuration: 5 * 60,  // in seconds
        timeLeft: 25 * 60,
        timerMode: 'work', // 'work' or 'break'
        isRunning: false,
        timerInterval: null,
        streakDays: 0,
        sessionsCompleted: 0,
        focusMinutesTotal: 0,
        breaksTakenTotal: 0,
        soundEnabled: true,
        sessionLogs: []
    };

    const quotes = [
        "Small postural habits compound into lifelong vitality.",
        "Breathe deep, reset your shoulders, and reclaim your focus.
        "Digital ergonomics is self-care for the knowledge worker.",
        "A micro-break now protects your joints and vision for hours.",
        "Mindful movement fuels peak cognitive endurance."
    ];

    // --- Somatic Exercise Database ---
    const exercises = [
        {
            id: 1,
            title: "Cervical Neck Retraction (" + "Chin Tuck")",
            category: "neck",
            duration: "2 mins",
            description: "Counteracts forward head posture induced by staring at monitors.",
            steps: [
                "Sit upright and relax your shoulders away from your ears.",
                "Look straight ahead, then gently draw your chin straight back as if making a double chin.",
                "Hold for 5 seconds without tilting your head up or down.",
                "Repeat 8 to 10 times smoothly."
            ]
        },
        {
            id: 2,
            title: "Upper Trapezius Stretch",
            category: "neck",
            duration: "1.5 mins",
            description: "Releases tension in the upper shoulders caused by keyboard elevation.",
            steps: [
                "Sit tall and grasp the bottom of your chair with your right hand.",
                "Tilt your left ear gently toward your left shoulder.",
                "Place your left hand lightly over your head for gentle added weight (do not pull).",
                "Hold for 30 seconds, breathe deeply into the stretch, then switch sides."
            ]
        },
        {
            id: 3,
            title: "Wrist Flexor & Extensor Floss",
            category: "wrists",
            duration: "2 mins",
            description: "Prevents repetitive strain injuries and carpal tunnel stiffness.",
            steps: [
                "Extend your right arm straight forward with your palm facing outward (stop sign).",
                "Use your left hand to gently pull your fingers back toward your body for 15 seconds.",
                "Flip your palm downward and gently press the back of your hand toward you for 15 seconds.",
                "Shake out both hands completely and repeat on the left arm."
            ]
        },
        {
            id: 4,
            title: "20-20-20 Visual Acuity Reset",
            category: "eyes",
            duration: "1 min",
            description: "Relieves ciliary muscle spasm and digital eye strain from screen glare.",
            steps: [
                "Look away from your computer monitor entirely.",
                "Focus your gaze on an object at least 20 feet (6 meters) away in the distance.",
                "Breathe slowly and maintain focus on that distant point for 20 continuous seconds.",
                "Allows your eye lens muscles to fully relax."
            ]
        },
        {
            id: 5,
            title: "Thoracic Spine Wall Extension",
            category: "posture",
            duration: "3 mins",
            description: "Counteracts rounded upper back posture from slouching.",
            steps: [
                "Stand with your back and heels against a flat wall.",
                "Raise your arms into a 'W' position with elbows and back of hands touching the wall.",
                "Slowly slide your arms upward into a 'Y' position while keeping contact with the wall.",
                "Perform 10 slow sliding repetitions, engaging your mid-back."
            ]
        },
        {
            id: 6,
            title: "Pectoral Doorway Opener",
            category: "posture",
            duration: "2 mins",
            description: "Opens tight chest muscles that pull shoulders forward over desk.",
            steps: [
                "Stand in an open doorway and place your forearms against the doorframe at 90 degrees.",
                "Step forward gently with one foot until you feel a comfortable stretch across your chest.",
                "Keep your core braced and neck neutral.",
                "Hold for 30 seconds while taking slow, deep diaphragmatic breaths."
            ]
        }
    ];

    // --- DOM Elements ---
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const presetBtns = document.querySelectorAll('.preset-btn');
    const timerClock = document.getElementById('timer-clock');
    const timerModeLabel = document.getElementById('timer-mode-label');
    const timerSubtext = document.getElementById('timer-subtext');
    const btnStart = document.getElementById('btn-start');
    const btnPause = document.getElementById('btn-pause');
    const btnReset = document.getElementById('btn-reset');
    const progressRing = document.getElementById('progress-ring');
    const soundToggle = document.getElementById('sound-toggle');
    const streakCountEl = document.getElementById('streak-count');
    const dailyQuoteEl = document.getElementById('daily-quote');
    const prescriptionBox = document.getElementById('prescription-content');
    
    // Analytics DOM
    const statFocusTime = document.getElementById('stat-focus-time');
    const statSessionsCount = document.getElementById('stat-sessions-count');
    const statBreaksCount = document.getElementById('stat-breaks-count');
    const btnExportLog = document.getElementById('btn-export-log');
    const btnClearLog = document.getElementById('btn-clear-log');
    const logTableBody = document.getElementById('log-table-body');

    // Exercise Library & Modal DOM
    const exerciseGrid = document.getElementById('exercise-grid');
    const filterChips = document.querySelectorAll('.chip');
    const exerciseModal = document.getElementById('exercise-modal');
    const modalClose = document.getElementById('modal-close');
    const modalTitle = document.getElementById('modal-title');
    const modalCategory = document.getElementById('modal-category');
    const modalDesc = document.getElementById('modal-desc');
    const modalSteps = document.getElementById('modal-steps');
    const modalDoneBtn = document.getElementById('modal-done-btn');

    // --- Initialization & Local Storage ---
    function initApp() {
        loadLocalStorage();
        setupTabs();
        setupTimerControls();
        setupPresets();
        renderExercises('all');
        renderAnalytics();
        updateTimerDisplay();
        setRandomQuote();
    }

    function loadLocalStorage() {
        const savedState = localStorage.getItem('aurapulse_state');
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                state.streakDays = parsed.streakDays || 1;
                state.sessionsCompleted = parsed.sessionsCompleted || 0;
                state.focusMinutesTotal = parsed.focusMinutesTotal || 0;
                state.breaksTakenTotal = parsed.breaksTakenTotal || 0;
                state.sessionLogs = parsed.sessionLogs || [];
            } catch (e) {
                console.error("Error loading local storage", e);
            }
        } else {
            state.streakDays = 1;
        }
        streakCountEl.textContent = state.streakDays + (state.streakDays === 1 ? ' day' : ' days');
    }

    function saveLocalStorage() {
        const dataToSave = {
            streakDays: state.streakDays,
            sessionsCompleted: state.sessionsCompleted,
            focusMinutesTotal: state.focusMinutesTotal,
            breaksTakenTotal: state.breaksTakenTotal,
            sessionLogs: state.sessionLogs
        };
        localStorage.setItem('aurapulse_state', JSON.stringify(dataToSave));
    }

    function setRandomQuote() {
        const randomIndex = Math.floor(Math.random() * quotes.length);
        dailyQuoteEl.textContent = `"${quotes[randomIndex]}"`;
    }

    // --- Web Audio API Chime Synthesizer ---
    function playChime(type) {
        if (!state.soundEnabled) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            if (type === 'work-end') {
                osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
                osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);
            } else {
                osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
                osc.frequency.exponentialRampToValueAtTime(329.63, ctx.currentTime + 0.5);
            }

            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 1.2);
        } catch (e) {
            console.log("Web audio not permitted or supported", e);
        }
    }

    // --- Navigation Tabs ---
    function setupTabs() {
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');
                navBtns.forEach(b => b.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));

                btn.classList.add('active');
                document.getElementById(`tab-${targetTab}`).classList.add('active');
                state.activeTab = targetTab;
            });
        });
    }

    // --- Timer Logic ---
    const totalRingLength = 753.98; // 2 * pi * r (r=120)

    function updateTimerDisplay() {
        const mins = Math.floor(state.timeLeft / 60);
        const secs = state.timeLeft % 60);
        timerClock.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        // Calculate Ring Offset
        const totalTime = state.timerMode === 'work' ? state.workDuration : state.breakDuration;
        const progress = state.timeLeft / totalTime;
        const strokeOffset = totalRingLength * (1 - progress);
        progressRing.style.strokeDashoffset = strokeOffset;

        // Document Title update
        document.title = `(${timerClock.textContent}) AuraPulse — ${state.timerMode === 'work' ? 'Focus' : 'Break'}`;
    }

    function setupPresets() {
        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (state.isRunning) return;
                presetBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const workMins = parseInt(btn.getAttribute('data-work'));
                const breakMins = parseInt(btn.getAttribute('data-break'));

                state.workDuration = workMins * 60;
                state.breakDuration = breakMins * 60;
                state.timerMode = 'work';
                state.timeLeft = state.workDuration;

                updateTimerModeUI();
                updateTimerDisplay();
            });
        });
    }

    function updateTimerModeUI() {
        if (state.timerMode === 'work') {
            timerModeLabel.textContent = "Deep Work";
            timerModeLabel.className = "timer-mode-badge focus";
            timerSubtext.textContent = "Focus session in progress";
            progressRing.style.stroke = "var(--accent-focus)";
            progressRing.classList.add('active-pulse');
            loadActivePrescription(false);
        } else {
            timerModeLabel.textContent = "Restorative Break";
            timerModeLabel.className = "timer-mode-badge break";
            timerSubtext.textContent = "Time for somatic reset & eye relief";
            progressRing.style.stroke = "var(--accent-break)";
            progressRing.classList.add('active-pulse');
            loadActivePrescription(true);
        }
    }

    function loadActivePrescription(isBreak) {
        if (!isBreak) {
            prescriptionBox.innerHTML = `
                <div class="prescription-empty">
                    <p>Start your work rhythm to unlock contextual somatic desk stretches and eye-strain relief prompts during break intervals.</p>
                </div>
            `;
            return;
        }

        // Pick a random exercise for the break prescription
        const randomEx = exercises[Math.floor(Math.random() * exercises.length)];
        prescriptionBox.innerHTML = `
            <div class="prescription-card-inner">
                <h4>Recommended: ${randomEx.title}</h4>
                <p>${randomEx.description}</p>
                <button class="btn btn-secondary" id="btn-view-prescription">View Full Instructions</button>
            </div>
        ";

        document.getElementById('btn-view-prescription').addEventListener('click', () => {
            openExerciseModal(randomEx);
        });
    }

    function setupTimerControls() {
        btnStart.addEventListener('click', startTimer);
        btnPause.addEventListener('click', pauseTimer);
        btnReset.addEventListener('click', resetTimer);
        soundToggle.addEventListener('change', (e) => {
            state.soundEnabled = e.target.checked;
        });
    }

    function startTimer() {
        if (state.isRunning) return;
        state.isRunning = true;
        btnStart.disabled = true;
        btnPause.disabled = false;
        progressRing.classList.add('active-pulse');

        state.timerInterval = setInterval(() => {
            if (state.timeLeft > 0) {
                state.timeLeft--;
                updateTimerDisplay();
            } else {
                // Timer completed cycle!
                clearInterval(state.timerInterval);
                state.isRunning = false;
                btnStart.disabled = false;
                btnPause.disabled = true;

                if (state.timerMode === 'work') {
                    playChime('work-end');
                    recordSession('Work Session', Math.round(state.workDuration / 60));
                    state.sessionsCompleted++;
                    state.focusMinutesTotal += Math.round(state.workDuration / 60);
                    
                    // Switch to break
                    state.timerMode = 'break';
                    state.timeLeft = state.breakDuration;
                    updateTimerModeUI();
                    updateTimerDisplay();
                    startTimer(); // Auto start break
                } else {
                    playChime('break-end');
                    recordSession('Micro-Break', Math.round(state.breakDuration / 60));
                    state.breaksTakenTotal++;

                    // Switch to work
                    state.timerMode = 'work';
                    state.timeLeft = state.workDuration;
                    updateTimerModeUI();
                    updateTimerDisplay();
                    saveLocalStorage();
                    renderAnalytics();
                }
            }
        }, 1000);
    }

    function pauseTimer() {
        if (!state.isRunning) return;
        clearInterval(state.timerInterval);
        state.isRunning = false;
        btnStart.disabled = false;
        btnPause.disabled = true;
        progressRing.classList.remove('active-pulse');
    }

    function resetTimer() {
        clearInterval(state.timerInterval);
        state.isRunning = false;
        btnStart.disabled = false;
        btnPause.disabled = true;
        state.timerMode = 'work';
        state.timeLeft = state.workDuration;
        updateTimerModeUI();
        updateTimerDisplay();
        progressRing.classList.remove('active-pulse');
        loadActivePrescription(false);
    }

    function recordSession(type, durationMins) {
        const logEntry = {
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + new Date().toLocaleDateString(),
            type: type,
            duration: durationMins + ' mins',
            status: 'Completed'
        };
        state.sessionLogs.unshift(logEntry);
        saveLocalStorage();
        renderAnalytics();
    }

    // --- Somatic Library & Modal Rendering ---
    function renderExercises(filter) {
        exerciseGrid.innerHTML = '';
        const filtered = filter === 'all' ? exercises : exercises.filter(ex => ex.category === filter);

        filtered.forEach(ex => {
            const card = document.createElement('div');
            card.className = 'exercise-card';
            card.innerHTML = `
                <div class="exercise-card-header">
                    <span class="exercise-cat-tag">${ex.category.toUpperCase()}</span>
                    <span class="exercise-duration">${ex.duration}</span>
                </div>
                <h3>${ex.title}</h3>
                <p>${ex.description}</p>
            `;
            card.addEventListener('click', () => openExerciseModal(ex));
            exerciseGrid.appendChild(card);
        });
    }

    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const filter = chip.getAttribute('data-filter');
            renderExercises(filter);
        });
    });

    function openExerciseModal(ex) {
        modalTitle.textContent = ex.title;
        modalCategory.textContent = ex.category.toUpperCase() + ' • ' + ex.duration;
        modalDesc.textContent = ex.description;
        modalSteps.innerHTML = '';
        ex.steps.forEach(step => {
            const li = document.createElement('li');
            li.textContent = step;
            modalSteps.appendChild(li);
        });

        exerciseModal.classList.add('open');
        exerciseModal.setAttribute('aria-hidden', 'false');
    }

    function closeExerciseModalFunc() {
        exerciseModal.classList.remove('open');
        exerciseModal.setAttribute('aria-hidden', 'true');
    }

    modalClose.addEventListener('click', closeExerciseModalFunc);
    modalDoneBtn.addEventListener('click', closeExerciseModalFunc);
    exerciseModal.addEventListener('click', (e) => {
        if (e.target === exerciseModal) closeExerciseModalFunc();
    });

    // --- Analytics Rendering ---
    function renderAnalytics() {
        statFocusTime.textContent = state.focusMinutesTotal + ' mins';
        statSessionsCount.textContent = state.sessionsCompleted;
        statBreaksCount.textContent = state.breaksTakenTotal;

        if (state.sessionLogs.length === 0) {
            logTableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="4">No session logs recorded yet. Start a rhythm to begin tracking!</td>
                </tr>
            `;
            return;
        }

        logTableBody.innerHTML = '';
        state.sessionLogs.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${log.timestamp}</td>
                <td><span class="badge" style="background-color: ${log.type === 'Work Session' ? 'rgba(56,189,248,0.15); color: var(--accent-focus);' : 'rgba(52,211,153,0.15); color: var(--accent-break);'}">${log.type}</span></td>
                <td>${log.duration}</td>
                <td>${log.status}</td>
            `;
            logTableBody.appendChild(log.src || tr);
            logTableBody.appendChild(tr);
        });
    }

    btnExportLog.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.sessionLogs, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "aurapulse_session_logs.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    btnClearLog.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear your local session history?")) {
            state.sessionLogs = [];
            state.focusMinutesTotal = 0;
            state.sessionsCompleted = 0;
            state.breaksTakenTotal = 0;
            saveLocalStorage();
            renderAnalytics();
        }
    });

    // Run Init
    initApp();
});
