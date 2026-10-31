// AuraPulse Workspace Rhythm Architect - Vanilla JS Implementation

document.addEventListener('DOMContentLoaded', () => {
    // State Management
    const state = {
        mode: 'work', // 'work', 'break', 'rest'
        durations: {
            work: 25 * 60,
            break: 5 * 60,
            rest: 15 * 60
        },
        timeRemaining: 25 * 60,
        isRunning: false,
        soundEnabled: true,
        stats: {
            completedSessions: 0,
            focusMinutes: 0,
            movementStreak: 0
        }
    };

    // Storage Load
    const savedStats = localStorage.getItem('aurapulse_stats');
    if (savedStats) {
        try {
            state.stats = JSON.parse(savedStats);
        } catch (e) {
            console.error('Failed to parse saved stats');
        }
    }

    // DOM Elements
    const modeBtns = document.querySelectorAll('.mode-btn');
    const timeRemainingEl = document.getElementById('timeRemaining');
    const timerStatusLabel = document.getElementById('timerStatusLabel');
    const startPauseBtn = document.getElementById('startPauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const soundToggleBtn = document.getElementById('soundToggleBtn');
    const ringProgress = document.querySelector('.ring-progress');
    
    // Stats DOM
    const completedSessionsEl = document.getElementById('completedSessions');
    const focusMinutesEl = document.getElementById('focusMinutes');
    const movementStreakEl = document.getElementById('movementStreak');
    const clearDataBtn = document.getElementById('clearDataBtn');

    // Stretch DOM
    const stretchTitle = document.getElementById('stretchTitle');
    const stretchDesc = document.getElementById('stretchDesc');
    const stretchDuration = document.getElementById('stretchDuration');
    const nextStretchBtn = document.getElementById('nextStretchBtn');
    const stretchCategoryBadge = document.getElementById('stretchCategoryBadge');

    // Config DOM
    const workDurInput = document.getElementById('workDur');
    const breakDurInput = document.getElementById('breakDur');
    const restDurInput = document.getElementById('restDur');
    const saveConfigBtn = document.getElementById('saveConfigBtn');

    // Ergonomic Stretches & Exercises Database
    const stretches = [
        {
            category: 'Posture & Stretch',
            title: 'Neck & Cervical Release',
            desc: 'Gently tilt your right ear toward your right shoulder. Hold for 15 seconds while breathing deeply, then switch sides to relieve trap tension.',
            duration: '30s'
        },
        {
            category: 'Eye Strain Relief',
            title: '20-20-20 Focal Shift',
            desc: 'Look away from your monitor at an object at least 20 feet away for 20 seconds. Blink rapidly to refresh tear film and relax ciliary eye muscles.',
            duration: '20s'
        },
        {
            category: 'Thoracic Mobility',
            title: 'Seated Spinal Twist',
            desc: 'Sit tall, place your left hand on the outside of your right knee, and gently twist your torso to the right. Hold for 15 seconds per side.',
            duration: '30s'
        },
        {
            category: 'Circulation & Wrists',
            title: 'Carpal & Forearm Stretch',
            desc: 'Extend your right arm forward with palm facing out, fingers pointing down. Gently pull fingers back with your left hand for 15 seconds.',
            duration: '30s'
        },
        {
            category: 'Shoulder Openers',
            title: 'Pectoral Doorway Stretch',
            desc: 'Interlace your fingers behind your lower back, straighten your arms, and gently lift your chest upward to reverse slouching posture.',
            duration: '25s'
        }
    ];
    let currentStretchIndex = 0;

    let timerId = null;
    const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 116;

    // Initialize Web Audio API Chime Generator (No external assets)
    let audioCtx = null;
    function playChime(isComplete = false) {
        if (!state.soundEnabled) return;
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
            // Pleasant bell frequency
            osc.frequency.setValueAtTime(isComplete ? 587.33 : 440, audioCtx.currentTime); // D5 or A4
            
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start();
            osc.stop(audioCtx.currentTime + 1.2);
        } catch (e) {
            console.warn('AudioContext prevented or not supported', e);
        }
    }

    // Timer Mechanics
    function updateDisplay() {
        const minutes = Math.floor(state.timeRemaining / 60);
        const seconds = state.timeRemaining % 60;
        timeRemainingEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        // Update Tab Title
        document.title = `(${timeRemainingEl.textContent}) AuraPulse Workspace Architect`;

        // Update Progress Ring
        const totalDuration = state.durations[state.mode];
        const progress = state.timeRemaining / totalDuration;
        const dashOffset = CIRCLE_CIRCUMFERENCE * (1 - progress);
        ringProgress.style.strokeDashoffset = dashOffset;
    }

    function setMode(newMode) {
        if (state.isRunning) {
            pauseTimer();
        }
        state.mode = newMode;
        state.timeRemaining = state.durations[newMode];

        modeBtns.forEach(btn => {
            if (btn.dataset.mode === newMode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        const labels = {
            work: 'Deep Work Session',
            break: 'Ergonomic Micro-Break',
            rest: 'Long Reset & Recharge'
        };
        timerStatusLabel.textContent = labels[newMode];
        updateDisplay();
    }

    function startPauseTimer() {
        if (state.isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    }

    function startTimer() {
        state.isRunning = true;
        startPauseBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            <span>Pause Session</span>
        `;
        timerStatusLabel.textContent = state.mode === 'work' ? 'Focus in Progress...' : 'Resting & Stretching...';

        timerId = setInterval(() => {
            if (state.timeRemaining > 0) {
                state.timeRemaining--;
                updateDisplay();
            } else {
                clearInterval(timerId);
                handleTimerComplete();
            }
        }, 1000);
    }

    function pauseTimer() {
        state.isRunning = false;
        clearInterval(timerId);
        startPauseBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            <span>Resume Session</span>
        `;
        timerStatusLabel.textContent = 'Paused';
    }

    function resetTimer() {
        pauseTimer();
        state.timeRemaining = state.durations[state.mode];
        updateDisplay();
        timerStatusLabel.textContent = 'Ready';
    }

    function handleTimerComplete() {
        playChime(true);
        state.isRunning = false;
        
        if (state.mode === 'work') {
            state.stats.completedSessions++;
            state.stats.focusMinutes += Math.round(state.durations.work / 60);
            state.stats.movementStreak++;
            saveStats();
            updateStatsUI();
            
            // Suggest switching to break
            setMode('break');
        } else {
            setMode('work');
        }
        
        // Auto shuffle stretch for variety
        shuffleStretch();
    }

    // Stretch Prescription Logic
    function shuffleStretch() {
        currentStretchIndex = (currentStretchIndex + 1) % stretches.length;
        const s = stretches[currentStretchIndex];
        stretchCategoryBadge.textContent = s.category;
        stretchTitle.textContent = s.title;
        stretchDesc.textContent = s.desc;
        stretchDuration.textContent = `Duration: ${s.duration}`;
    }

    // Stats Management
    function saveStats() {
        localStorage.setItem('aurapulse_stats', JSON.stringify(state.stats));
    }

    function updateStatsUI() {
        completedSessionsEl.textContent = state.stats.completedSessions;
        focusMinutesEl.textContent = `${state.stats.focusMinutes}m`;
        movementStreakEl.textContent = state.stats.movementStreak;
    }

    // Event Listeners
    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setMode(btn.dataset.mode);
        });
    });

    startPauseBtn.addEventListener('click', startPauseTimer);
    resetBtn.addEventListener('click', resetTimer);

    soundToggleBtn.addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        soundToggleBtn.classList.toggle('active', state.soundEnabled);
        if (state.soundEnabled) playChime();
    });

    nextStretchBtn.addEventListener('click', shuffleStretch);

    clearDataBtn.addEventListener('click', () => {
        if (confirm('Reset all daily session stats and streaks?')) {
            state.stats = { completedSessions: 0, focusMinutes: 0, movementStreak: 0 };
            saveStats();
            updateStatsUI();
        }
    });

    saveConfigBtn.addEventListener('click', () => {
        const w = parseInt(workDurInput.value);
        const b = parseInt(breakDurInput.value);
        const r = parseInt(restDurInput.value);

        if (w > 0 && b > 0 && r > 0) {
            state.durations.work = w * 60;
            state.durations.break = b * 60;
            state.durations.rest = r * 60;
            
            // Reset current timer with new duration
            resetTimer();
            alert('Rhythm intervals updated successfully!');
        } else {
            alert('Please enter valid positive numbers for durations.');
        }
    });

    // Keyboard Shortcuts (Space for Start/Pause)
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            startPauseTimer();
        }
    });

    // Initial setup
    ringProgress.style.strokeDasharray = CIRCLE_CIRCUMFERENCE;
    updateDisplay();
    updateStatsUI();
    shuffleStretch();
});
