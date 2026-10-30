document.addEventListener('DOMContentLoaded', () => {
    // Timer Configurations (in seconds)
    const MODES = {
        work: { duration: 25 * 60, label: 'Deep Focus', status: 'FOCUS TIME', protocol: {
            title: 'Spinal Alignment & Ergonomic Posture',
            desc: 'Ensure your monitor top edge is at eye level, elbows rest at a 90-degree angle, and feet are planted flat.'
        }},
        break: { duration: 5 * 60, label: 'Micro Break', status: 'REST & RESET', protocol: {
            title: 'Hydration & Optic Relief',
            desc: 'Step away from your keyboard, drink a glass of water, and look at an object at least 20 feet away.'
        }},
        stretch: { duration: 3 * 60, label: 'Desk Stretch', status: 'SOMATIC MOVEMENT', protocol: {
            title: 'Shoulder & Neck Decompression',
            desc: 'Gently tilt your head from side to side, roll your shoulders backward 10 times, and open your chest.'
        }}
    };

    const STRETCHES = {
        neck: {
            title: 'Neck Release & Lateral Flexion',
            desc: 'Slowly drop your right ear toward your right shoulder until a gentle stretch is felt along the left side of your neck. Hold for 20 seconds, then switch sides. Never force the movement.'
        },
        eyes: {
            title: '20-20-20 Optic Reset',
            desc: 'Every 20 minutes of screen work, look at something 20 feet away for at least 20 seconds. This relaxes the focusing muscle inside the eye to prevent digital eye strain.'
        },
        wrists: {
            title: 'Carpo-Metacarpal Wrist Extension',
            desc: 'Extend your right arm forward with your palm facing out (stop sign gesture). Use your left hand to gently pull your fingers back toward your body for 15 seconds. Switch arms.'
        },
        spine: {
            title: 'Seated Thoracic Rotation',
            desc: 'Sit tall in your chair, place your left hand on the outside of your right knee, and gently twist your torso to the right, looking over your shoulder. Hold for 15 seconds per side.'
        }
    };

    // State Variables
    let currentMode = 'work';
    let timeLeft = MODES[currentMode].duration;
    let timerId = null;
    let isRunning = false;
    let soundEnabled = true;
    let audioCtx = null;

    // DOM Elements
    const modeBtns = document.querySelectorAll('.mode-btn');
    const timeDisplay = document.getElementById('timeDisplay');
    const timerStatusLabel = document.getElementById('timerStatusLabel');
    const sessionTypeLabel = document.getElementById('sessionTypeLabel');
    const startPauseBtn = document.getElementById('startPauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const soundToggleBtn = document.getElementById('soundToggleBtn');
    const progressRing = document.getElementById('progressRing');
    
    const protocolTitle = document.getElementById('protocolTitle');
    const protocolDesc = document.getElementById('protocolDesc');
    
    const stretchChips = document.querySelectorAll('.chip');
    const stretchDetailBox = document.getElementById('stretchDetailBox');
    
    const completedPomodorosEl = document.getElementById('completedPomodoros');
    const totalFocusMinutesEl = document.getElementById('totalFocusMinutes');
    const streakCountEl = document.getElementById('streakCount');
    const sessionLogList = document.getElementById('sessionLogList');
    const clearStatsBtn = document.getElementById('clearStatsBtn');

    // Ring Circumference calculation (r = 120 -> 2 * pi * 120 ≈ 753.98)
    const CIRCUMFERENCE = 753.98;
    progressRing.style.strokeDasharray = CIRCUMFERENCE;

    // Load Data from LocalStorage
    let stats = JSON.parse(localStorage.getItem('aurapulse_stats')) || {
        completed: 0,
        minutes: 0,
        streak: 0,
        lastActiveDate: null,
        logs: []
    };

    // Check streak reset
    const todayStr = new Date().toDateString();
    if (stats.lastActiveDate && stats.lastActiveDate !== todayStr) {
        // If last active was not today or yesterday, reset streak
        const lastDate = new Date(stats.lastActiveDate);
        const currentDate = new Date();
        const diffTime = Math.abs(currentDate - lastDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 2) {
            stats.streak = 0;
        }
    }

    updateStatsDisplay();
    renderLogs();

    // Web Audio API Chime Generator
    function playChime(type = 'complete') {
        if (!soundEnabled) return;
        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }

            const now = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = 'sine';
            
            if (type === 'complete') {
                osc.frequency.setValueAtTime(523.25, now); // C5
                osc.frequency.setValueAtTime(659.25, now + 0.15); // E5
                osc.frequency.setValueAtTime(783.99, now + 0.3); // G5
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
                osc.start(now);
                osc.stop(now + 0.8);
            } else {
                // Click tick
                osc.frequency.setValueAtTime(440, now);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                osc.start(now);
                osc.stop(now + 0.05);
            }

            osc.connect(gain);
            gain.connect(audioCtx.destination);
        } catch (e) {
            console.warn('AudioContext not allowed or supported', e);
        }
    }

    // Format time display
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Update Progress Ring Offset
    function updateProgress() {
        const totalDuration = MODES[currentMode].duration;
        const progress = timeLeft / totalDuration;
        const offset = CIRCUMFERENCE - (progress * CIRCUMFERENCE);
        progressRing.style.strokeDashoffset = offset;
    }

    // Switch Mode
    function setMode(modeKey) {
        if (isRunning) {
            if (!confirm('A session is currently running. Switch mode and reset timer?')) return;
            pauseTimer();
        }
        currentMode = modeKey;
        timeLeft = MODES[currentMode].duration;

        modeBtns.forEach(btn => {
            if (btn.dataset.mode === modeKey) {
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');
            } else {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            }
        });

        timerStatusLabel.textContent = MODES[currentMode].status;
        sessionTypeLabel.textContent = MODES[currentMode].label;
        
        // Update protocol guidance
        protocolTitle.textContent = MODES[currentMode].protocol.title;
        protocolDesc.textContent = MODES[currentMode].protocol.desc;

        timeDisplay.textContent = formatTime(timeLeft);
        updateProgress();
    }

    // Timer Tick Logic
    function timerTick() {
        if (timeLeft > 0) {
            timeLeft--;
            timeDisplay.textContent = formatTime(timeLeft);
            updateProgress();
        } else {
            completeTimer();
        }
    }

    function startTimer() {
        if (!isRunning) {
            isRunning = true;
            startPauseBtn.textContent = 'Pause Session';
            startPauseBtn.classList.add('active');
            timerId = setInterval(timerTick, 1000);
        }
    }

    function pauseTimer() {
        if (isRunning) {
            isRunning = false;
            clearInterval(timerId);
            startPauseBtn.textContent = 'Resume Session';
            startPauseBtn.classList.remove('active');
        }
    }

    function resetTimer() {
        pauseTimer();
        timeLeft = MODES[currentMode].duration;
        timeDisplay.textContent = formatTime(timeLeft);
        updateProgress();
        startPauseBtn.textContent = 'Start Session';
    }

    function completeTimer() {
        pauseTimer();
        playChime('complete');

        const durationMinutes = Math.round(MODES[currentMode].duration / 60);

        // Log stats if work mode
        if (currentMode === 'work') {
            stats.completed += 1;
            stats.minutes += durationMinutes;
            
            if (stats.lastActiveDate !== todayStr) {
                stats.streak += 1;
                stats.lastActiveDate = todayStr;
            }

            const logEntry = {
                title: 'Deep Focus Block',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                duration: durationMinutes
            };
            stats.logs.unshift(logEntry);
            if (stats.logs.max > 20) stats.logs.pop();

            saveStats();
            updateStatsDisplay();
            renderLogs();
        }

        alert(`Session completed: ${MODES[currentMode].label}! Take a moment to stretch and breathe.`);
        resetTimer();
    }

    function saveStats() {
        localStorage.setItem('aurapulse_stats', JSON.stringify(stats));
    }

    function updateStatsDisplay() {
        completedPomodorosEl.textContent = stats.completed;
        totalFocusMinutesEl.textContent = stats.minutes;
        streakCountEl.textContent = stats.streak;
    }

    function renderLogs() {
        if (!stats.logs || stats.logs.length === 0) {
            sessionLogList.innerHTML = `<li class="empty-log">No sessions completed yet today. Start a focus block to build your rhythm!</li>`;
            return;
        }

        sessionLogList.innerHTML = '';
        stats.logs.forEach(log => {
            const li = document.createElement('li');
            li.className = 'session-log-item';
            li.innerHTML = `
                <span class="session-title">${log.title} (${log.duration}m)</span>
                <span class="session-time">${log.time}</span>
            `;
            sessionLogList.appendChild(li);
        });
    }

    // Event Listeners
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setMode(btn.dataset.mode);
        });
    });

    startPauseBtn.addEventListener('click', () => {
        if (isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    });

    resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset the current timer?')) {
            resetTimer();
        }
    });

    soundToggleBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundToggleBtn.style.opacity = soundEnabled ? '1' : '0.4';
        soundToggleBtn.title = soundEnabled ? 'Sound Chimes Enabled' : 'Sound Chimes Muted';
        if (soundEnabled) playChime('tick');
    });

    stretchChips.forEach(chip => {
        chip.addEventListener('click', () => {
            stretchChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const stretchKey = chip.dataset.stretch;
            const data = STRETCHES[stretchKey];
            if (data) {
                stretchDetailBox.innerHTML = `<strong>${data.title}</strong><p style="margin-top: 0.35rem; color: var(--text-primary);">${data.desc}</p>`;
            }
        });
    });

    clearStatsBtn.addEventListener('click', () => {
        if (confirm("Reset today's recorded focus stats and logs?")) {
            stats.completed = 0;
            stats.minutes = 0;
            stats.logs = [];
            saveStats();
            updateStatsDisplay();
            renderLogs();
        }
    });

    // Initialize display
    timeDisplay.textContent = formatTime(timeLeft);
    updateProgress();
});
