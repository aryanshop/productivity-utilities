/* AuraPulse: Ergonomic Micro-Break & Posture Rhythm Architect */

document.addEventListener('DOMContentLoaded', () => {
    // State Management
    const state = {
        currentTab: 'timer-view',
        timerMode: 'work', // 'work' or 'break'
        workDuration: 25 * 60, // in seconds
        breakDuration: 5 * 60, // in seconds
        timeLeft: 25 * 60,
        isRunning: false,
        timerInterval: null,
        chimeFreq: 440,
        soundEnabled: true,
        streakDays: 0,
        totalSessions: 0,
        totalMinutes: 0,
        breaksTaken: 0,
        logs: [],
        currentStretchFilter: 'all'
    };

    // Somatic Stretches Library
    const exercises = [
        {
            id: 1,
            title: 'Neck Lateral Flexion',
            category: 'neck',
            duration: '30 sec each side',
            description: 'Gently tilt your right ear toward your right shoulder until a gentle stretch is felt along the left side of your neck. Hold steady without forcing.'
        },
        {
            id: 2,
            title: 'Scapular Wall Squeeze',
            category: 'neck',
            duration: '10 repetitions',
            description: 'Stand with your back against a wall. Pull your shoulder blades down and back, pressing them gently into the wall while keeping your chin tucked.'
        },
        {
            id: 3,
            title: 'Wrist Flexor & Extensor Stretch',
            category: 'wrists',
            duration: '20 sec per arm',
            description: 'Extend your right arm forward with palm facing out. Use your left hand to gently pull your fingers back toward your body, then downwards.'
        },
        {
            id: 4,
            title: 'Thumb & Finger Abduction',
            category: 'wrists',
            duration: '15 repetitions',
            description: 'Open your hands wide and stretch each finger outward as far as comfortable to relieve repetitive keyboard strain.'
        },
        {
            id: 5,
            title: '20-20-20 Eye Relief Drill',
            category: 'eyes',
            duration: '20 seconds',
            description: 'Look away from your monitor at an object at least 20 feet away. Allow your ciliary eye muscles to relax completely.'
        },
        {
            id: 6,
            title: 'Palming & Warmth',
            category: 'eyes',
            duration: '30 seconds',
            description: 'Rub your palms together until warm, then gently cup them over your closed eyes without applying direct pressure to your eyeballs.'
        },
        {
            id: 7,
            title: 'Seated Thoracic Spine Twist',
            category: 'spine',
            duration: '30 sec each side',
            description: 'Sit tall in your chair, place your left hand on the outside of your right knee, and gently twist your torso to the right.'
        },
        {
            id: 8,
            title: 'Hip Flexor & Psoas Reset',
            category: 'spine',
            duration: '45 sec each leg',
            description: 'Stand up from your desk into a shallow lunge position, tucking your pelvis slightly under to release seated hip tightness.'
        }
    ];

    // DOM Elements
    const navBtns = document.querySelectorAll('.nav-btn');
    const viewSections = document.querySelectorAll('.view-section');
    const timerCountdown = document.getElementById('timer-countdown');
    const timerLabel = document.getElementById('timer-label');
    const timerStartBtn = document.getElementById('timer-start-btn');
    const timerSkipBtn = document.getElementById('timer-skip-btn');
    const quickResetBtn = document.getElementById('quick-reset-btn');
    const quickMuteBtn = document.getElementById('quick-mute-btn');
    const modeBadge = document.getElementById('mode-badge');
    const modeTitle = document.getElementById('mode-title');
    const protocolInstruction = document.getElementById('protocol-instruction');
    const progressRingCircle = document.getElementById('progress-ring-circle');
    const presetBtns = document.querySelectorAll('.preset-btn');
    const exerciseGrid = document.getElementById('exercise-grid');
    const filterChips = document.querySelectorAll('.chip');
    const breakModal = document.getElementById('break-modal');
    const modalExerciseSpotlight = document.getElementById('modal-exercise-spotlight');
    const modalCompleteBreak = document.getElementById('modal-complete-break');
    const modalSnoozeBreak = document.getElementById('modal-snooze-break');
    
    // Settings Elements
    const settingWorkDuration = document.getElementById('setting-work-duration');
    const settingBreakDuration = document.getElementById('setting-break-duration');
    const saveDurationsBtn = document.getElementById('save-durations-btn');
    const settingChimeFreq = document.getElementById('setting-chime-freq');
    const freqVal = document.getElementById('freq-val');
    const settingSoundEnabled = document.getElementById('setting-sound-enabled');
    const testChimeBtn = document.getElementById('test-chime-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const importJsonBtn = document.getElementById('import-json-btn');
    const importFileInput = document.getElementById('import-file-input');
    const clearLogsBtn = document.getElementById('clear-logs-btn');

    // Stat Elements
    const sidebarStreak = document.getElementById('sidebar-streak');
    const statTotalSessions = document.getElementById('stat-total-sessions');
    const statTotalMinutes = document.getElementById('stat-total-minutes');
    const statStreakDays = document.getElementById('stat-streak-days');
    const statBreaksTaken = document.getElementById('stat-breaks-taken');
    const logTableBody = document.getElementById('log-table-body');

    // Initialization
    function init() {
        loadFromLocalStorage();
        setupEventListeners();
        renderExercises();
        updateTimerDisplay();
        updateStatsDisplay();
        renderLogs();
    }

    // LocalStorage Operations
    function loadFromLocalStorage() {
        const saved = localStorage.getItem('aurapulse_state');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                state.streakDays = data.streakDays || 0;
                state.totalSessions = data.totalSessions || 0;
                state.totalMinutes = data.totalMinutes || 0;
                state.breaksTaken = data.breaksTaken || 0;
                state.logs = data.logs || [];
                state.workDuration = (data.workMinutes || 25) * 60;
                state.breakDuration = (data.breakMinutes || 5) * 60;
                state.timeLeft = state.workDuration;
                settingWorkDuration.value = data.workMinutes || 25;
                settingBreakDuration.value = data.breakMinutes || 5;
                settingChimeFreq.value = data.chimeFreq || 440;
                state.chimeFreq = data.chimeFreq || 440;
                settingSoundEnabled.checked = data.soundEnabled !== false;
                state.soundEnabled = data.soundEnabled !== false;
            } catch (e) {
                console.error('Error loading localStorage', e);
            }
        }
    }

    function saveToLocalStorage() {
        const data = {
            streakDays: state.streakDays,
            totalSessions: state.totalSessions,
            totalMinutes: state.totalMinutes,
            breaksTaken: state.breaksTaken,
            logs: state.logs,
            workMinutes: Math.round(state.workDuration / 60),
            breakMinutes: Math.round(state.breakDuration / 60),
            chimeFreq: state.chimeFreq,
            soundEnabled: state.soundEnabled
        };
        localStorage.setItem('aurapulse_state', JSON.stringify(data));
    }

    // Event Listeners Setup
    function setupEventListeners() {
        // Navigation Tabs
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');
                switchTab(targetTab);
            });
        });

        // Timer Controls
        timerStartBtn.addEventListener('click', toggleTimer);
        timerSkipBtn.addEventListener('click', skipSession);
        quickResetBtn.addEventListener('click', resetTimer);
        quickMuteBtn.addEventListener('click', toggleSoundMute);

        // Presets
        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                presetBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const w = parseInt(btn.getAttribute('data-work'));
                const b = parseInt(btn.getAttribute('data-break'));
                setTimerDurations(w, b);
            });
        });

        // Exercise Filters
        filterChips.forEach(chip => {
            chip.addEventListener('click', () => {
                filterChips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                state.currentStretchFilter = chip.getAttribute('data-filter');
                renderExercises();
            });
        });

        // Modal Controls
        modalCompleteBreak.addEventListener('click', () => {
            closeBreakModal();
            state.breaksTaken++;
            addLog('Break', 'Completed somatic break session');
            saveToLocalStorage();
            updateStatsDisplay();
            startWorkSession();
        });

        modalSnoozeBreak.addEventListener('click', () => {
            closeBreakModal();
            state.timeLeft = 2 * 60; // 2 min snooze
            state.timerMode = 'break';
            startTimerInterval();
        });

        // Settings Actions
        saveDurationsBtn.addEventListener('click', () => {
            const w = parseInt(settingWorkDuration.value) || 25;
            const b = parseInt(settingBreakDuration.value) || 5;
            setTimerDurations(w, b);
            alert('Timer durations updated successfully!');
        });

        settingChimeFreq.addEventListener('input', (e) => {
            state.chimeFreq = parseInt(e.target.value);
            freqVal.textContent = state.chimeFreq + ' Hz';
        });

        settingSoundEnabled.addEventListener('change', (e) => {
            state.soundEnabled = e.target.checked;
            saveToLocalStorage();
        });

        testChimeBtn.addEventListener('click', () => {
            playChime();
        });

        clearLogsBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear your session history?')) {
                state.logs = [];
                state.totalSessions = 0;
                state.totalMinutes = 0;
                saveToLocalStorage();
                renderLogs();
                updateStatsDisplay();
            }
        });

        exportJsonBtn.addEventListener('click', exportDataJSON);
        importJsonBtn.addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', importDataJSON);
    }

    // Navigation Tab Switcher
    function switchTab(tabId) {
        state.currentTab = tabId;
        navBtns.forEach(btn => {
            if (btn.getAttribute('data-tab') === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        viewSections.forEach(sec => {
            if (sec.id === tabId) {
                sec.classList.add('active');
            } else {
                sec.classList.remove('active');
            }
        });
    }

    // Timer Logic
    function toggleTimer() {
        if (state.isRunning) {
            pauseTimer();
        } else {
            startTimerInterval();
        }
    }

    function startTimerInterval() {
        state.isRunning = true;
        timerStartBtn.textContent = 'Pause Session';
        timerStartBtn.style.backgroundColor = 'var(--accent-danger)';

        if (!state.timerInterval) {
            state.timerInterval = setInterval(() => {
                if (state.timeLeft > 0) {
                    state.timeLeft--;
                    updateTimerDisplay();
                } else {
                    clearInterval(state.timerInterval);
                    state.timerInterval = null;
                    state.isRunning = false;
                    handleTimerComplete();
                }
            }, 1000);
        }
    }

    function pauseTimer() {
        state.isRunning = false;
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        timerStartBtn.textContent = 'Resume Session';
        timerStartBtn.style.backgroundColor = 'var(--accent-work)';
    }

    function resetTimer() {
        pauseTimer();
        state.timeLeft = state.timerMode === 'work' ? state.workDuration : state.breakDuration;
        updateTimerDisplay();
        timerStartBtn.textContent = 'Start Session';
        timerStartBtn.style.backgroundColor = 'var(--accent-work)';
    }

    function skipSession() {
        pauseTimer();
        if (state.timerMode === 'work') {
            startBreakSession();
        } else {
            startWorkSession();
        }
    }

    function setTimerDurations(workMin, breakMin) {
        state.workDuration = workMin * 60;
        state.breakDuration = breakMin * 60;
        resetTimer();
        saveToLocalStorage();
    }

    function handleTimerComplete() {
        if (state.soundEnabled) {
            playChime();
        }

        if (state.timerMode === 'work') {
            state.totalSessions++;
            state.totalMinutes += Math.round(state.workDuration / 60);
            if (state.streakDays === 0) state.streakDays = 1;
            addLog('Focus Block', `Completed ${Math.round(state.workDuration / 60)} min focus block`);
            saveToLocalStorage();
            updateStatsDisplay();
            renderLogs();
            openBreakModal();
        } else {
            addLog('Micro-Break', 'Completed break interval');
            saveToLocalStorage();
            startWorkSession();
        }
    }

    function startWorkSession() {
        state.timerMode = 'work';
        state.timeLeft = state.workDuration;
        modeBadge.className = 'badge work';
        modeBadge.textContent = 'Deep Work Session';
        modeTitle.textContent = 'Concentration & Flow';
        document.documentElement.style.setProperty('--accent-work', '#6366f1');
        progressRingCircle.style.stroke = 'var(--accent-work)';
        timerStartBtn.textContent = 'Start Session';
        timerStartBtn.style.backgroundColor = 'var(--accent-work)';
        updateTimerDisplay();
    }

    function startBreakSession() {
        state.timerMode = 'break';
        state.timeLeft = state.breakDuration;
        modeBadge.className = 'badge break';
        modeBadge.textContent = 'Micro-Break Active';
        modeTitle.textContent = 'Somatic Stretch & Reset';
        document.documentElement.style.setProperty('--accent-work', '#10b981');
        progressRingCircle.style.stroke = 'var(--accent-break)';
        timerStartBtn.textContent = 'Start Break';
        timerStartBtn.style.backgroundColor = 'var(--accent-break)';
        updateTimerDisplay();
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(state.timeLeft / 60);
        const seconds = state.timeLeft % 60;
        timerCountdown.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        const totalDuration = state.timerMode === 'work' ? state.workDuration : state.breakDuration;
        const progressOffset = 753.98 - (state.timeLeft / totalDuration) * 753.98;
        progressRingCircle.style.strokeDashoffset = progressOffset;

        const modeStr = state.timerMode === 'work' ? 'Work' : 'Break';
        timerLabel.textContent = `${modeStr} Interval`;
        document.title = `(${timerCountdown.textContent}) AuraPulse Studio`;
    }

    function toggleSoundMute() {
        state.soundEnabled = !state.soundEnabled;
        quickMuteBtn.textContent = state.soundEnabled ? '🔔' : '🔕';
        saveToLocalStorage();
    }

    // Web Audio API Chime Synthesizer
    function playChime() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(state.chimeFreq, ctx.currentTime);
            // Harmonic overtone
            osc.frequency.exponentialRampToValueAtTime(state.chimeFreq * 1.5, ctx.currentTime + 0.5);

            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 1.2);
        } catch (e) {
            console.error('Audio error', e);
        }
    }

    // Somatic Stretches Rendering
    function renderExercises() {
        exerciseGrid.innerHTML = '';
        const filtered = state.currentStretchFilter === 'all' 
            ? exercises 
            : exercises.filter(ex => ex.category === state.currentStretchFilter);

        filtered.forEach(ex => {
            const card = document.createElement('div');
            card.className = 'exercise-card';
            card.innerHTML = `
                <span class="exercise-tag">${ex.category.toUpperCase()}</span>
                <h3>${ex.title}</h3>
                <p>${ex.description}</p>
                <span class="exercise-duration">⏱️ ${ex.duration}</span>
            `;
            exerciseGrid.appendChild(card);
        });
    }

    // Modal Break Spotlight
    function openBreakModal() {
        // Pick a random exercise
        const randomEx = exercises[Math.floor(Math.random() * exercises.length)];
        modalExerciseSpotlight.innerHTML = `
            <strong>Recommended Somatic Drill: ${randomEx.title}</strong>
            <p style="color: var(--text-secondary); font-size: 13px; margin-top: 4px;">${randomEx.description}</p>
            <span style="font-size: 11px; color: var(--accent-break); margin-top: 4px; display: inline-block;">Duration: ${randomEx.duration}</span>
        `;
        breakModal.classList.add('active');
    }

    function closeBreakModal() {
        breakModal.classList.remove('active');
        startBreakSession();
    }

    // Logs & Stats Operations
    function addLog(type, note) {
        const now = new Date();
        const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + now.toLocaleDateString();
        const duration = state.timerMode === 'work' ? Math.round(state.workDuration / 60) + ' min' : 'Break';
        
        state.logs.unshift({
            timestamp,
            type,
            duration,
            note
        });

        // Keep max 50 logs
        if (state.logs.length > 50) {
            state.logs.pop();
        }
    }

    function updateStatsDisplay() {
        sidebarStreak.textContent = `${state.streakDays} Days`;
        statTotalSessions.textContent = state.totalSessions;
        statTotalMinutes.textContent = state.totalMinutes;
        statStreakDays.textContent = state.streakDays;
        statBreaksTaken.textContent = state.breaksTaken;
    }

    function renderLogs() {
        if (state.logs.length === 0) {
            logTableBody.innerHTML = `<tr><td colspan="4" class="empty-row">No sessions recorded yet today. Start your first focus timer!</td></tr>`;
            return;
        }

        logTableBody.innerHTML = '';
        state.logs.forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${log.timestamp}</td>
                <td><span class="badge ${log.type === 'Focus Block' ? 'work' : 'break'}">${log.type}</span></td>
                <td>${log.duration}</td>
                <td>${log.note}</td>
            `;
            logTableBody.appendChild(row);
        });
    }

    // Export / Import Data
    function exportDataJSON() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "aurapulse_workspace_backup.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }

    function importDataJSON(e) {
        const fileReader = new FileReader();
        if (e.target.files.length === 0) return;
        fileReader.readAsText(e.target.files[0], "UTF-8");
        fileReader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (imported && typeof imported === 'object') {
                    state.streakDays = imported.streakDays || state.streakDays;
                    state.totalSessions = imported.totalSessions || state.totalSessions;
                    state.totalMinutes = imported.totalMinutes || state.totalMinutes;
                    state.breaksTaken = imported.breaksTaken || state.breaksTaken;
                    state.logs = imported.logs || state.logs;
                    saveToLocalStorage();
                    updateStatsDisplay();
                    renderLogs();
                    alert('Workspace data successfully imported!');
                }
            } catch (error) {
                alert('Invalid JSON file format.');
            }
        };
    }

    // Run initialization
    init();
});
