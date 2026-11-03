/* AuraPulse - Ergonomic Micro-Break & Posture Rhythm Architect */

document.addEventListener('DOMContentLoaded', () => {
    // State configuration
    const state = {
        mode: 'work', // work, stretch, eyes
        workDuration: 25 * 60,
        stretchDuration: 5 * 60,
        eyesDuration: 2 * 60,
        timeLeft: 25 * 60,
        totalDuration: 25 * 60,
        isRunning: false,
        timerId: null,
        stats: {
            sessions: 0,
            minutes: 0,
            streak: 0,
            lastActiveDate: new Date().toDateString()
        }
    };

    // Somatic & eye exercises database
    const activities = {
        stretch: [
            {
                icon: '🧘',
                title: 'Seated Spinal Twist & Chest Opener',
                desc: 'Sit tall in your chair. Place your right hand on your left knee and gently twist your torso to the left. Hold for 15 seconds while breathing deeply into your diaphragm. Switch sides.',
                tags: ['Neck & Spine', 'Tension Release']
            },
            {
                icon: '🙆',
                title: 'Upper Trapezius Neck Release',
                desc: 'Drop your right ear toward your right shoulder. For gentle added resistance, rest your right hand lightly on top of your head. Hold for 20 seconds, then switch sides.',
                tags: ['Neck', 'Posture']
            },
            {
                icon: '👐',
                title: 'Wrist Flexor & Extensor Stretch',
                desc: 'Extend your right arm forward with palm facing out, fingers pointing up. Use your left hand to gently pull your fingers back toward your torso for 15 seconds. Invert fingers downward.',
                tags: ['Wrists', 'Forearms']
            },
            {
                icon: '🚶',
                title: 'Thoracic Extension & Standing Reach',
                desc: 'Stand up, interlace your fingers overhead, and press your palms toward the ceiling while taking a slow, deep inhale. Exhale and gently arch backward slightly.',
                tags: ['Spine', 'Circulation']
            }
        ],
        eyes: [
            {
                icon: '👁️',
                title: 'The 20-20-20 Rule Focus Shift',
                desc: 'Look away from your monitor and focus your gaze on an object at least 20 feet away for a full 20 seconds. This relaxes the focusing muscle inside the eye.',
                tags: ['Eye Strain', 'Vision']
            },
            {
                icon: '🔄',
                title: 'Palming & Visual Relaxation',
                desc: 'Rub your palms together vigorously until they feel warm, then gently cup them over your closed eyes without applying pressure. Breathe softly in the darkness for 30 seconds.',
                tags: ['Optic Rest', 'Relaxation']
            },
            {
                icon: '↕️',
                title: 'Figure Eight Eye Rotations',
                desc: 'Without moving your head, imagine a giant figure eight (infinity symbol) 10 feet in front of you. Trace the outline slowly with your eyes for 15 seconds in each direction.',
                tags: ['Eye Muscles', 'Mobility']
            }
        ]
    };

    // DOM Elements
    const timeRemainingEl = document.getElementById('time-remaining');
    const timerLabelEl = document.getElementById('timer-label');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const skipBtn = document.getElementById('skip-btn');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const presetBtns = document.querySelectorAll('.preset-btn');
    const progressCircle = document.querySelector('.progress-ring__circle');
    
    const activityContent = document.getElementById('activity-content');
    const nextActivityBtn = document.getElementById('next-activity-btn');
    
    const statSessions = document.getElementById('stat-sessions');
    const statMinutes = document.getElementById('stat-minutes');
    const statStreak = document.getElementById('stat-streak');
    const clearLogBtn = document.getElementById('clear-log-btn');

    // Progress Ring Circumference
    const radius = progressCircle.r.baseVal.value;
    const circumference = 2 * Math.PI * radius;
    progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;

    function setProgress(percent) {
        const offset = circumference - (percent / 100) * circumference;
        progressCircle.style.strokeDashoffset = offset;
    }

    // Load local storage stats safely
    function loadStats() {
        try {
            const saved = localStorage.getItem('aurapulse_stats');
            if (saved) {
                const parsed = JSON.parse(saved);
                const today = new Date().toDateString();
                if (parsed.lastActiveDate === today) {
                    state.stats = parsed;
                } else {
                    // Check if streak continues
                    const lastDate = new Date(parsed.lastActiveDate);
                    const currentDate = new Date(today);
                    const diffTime = Math.abs(currentDate - lastDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    state.stats.streak = diffDays === 1 ? parsed.streak + 1 : 1;
                    state.stats.lastActiveDate = today;
                    state.stats.sessions = 0;
                    state.stats.minutes = 0;
                }
            }
        } catch (e) {
            console.warn('Could not load stats from localStorage', e);
        }
        updateStatsUI();
    }

    function saveStats() {
        try {
            localStorage.setItem('aurapulse_stats', JSON.stringify(state.stats));
        } catch (e) {
            console.warn('Could not save stats to localStorage', e);
        }
    }

    function updateStatsUI() {
        statSessions.textContent = state.stats.sessions;
        statMinutes.textContent = state.stats.minutes;
        statStreak.textContent = state.stats.streak;
    }

    // Web Audio API Chime Generator
    function playChime(type = 'work') {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            
            if (type === 'work') {
                osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
                osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.5);
            } else {
                osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
                osc.frequency.exponentialRampToValueAtTime(293.66, ctx.currentTime + 0.5);
            }

            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 1.2);
        } catch (e) {
            console.warn('Web Audio API not supported or blocked', e);
        }
    }

    // Format time display
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // Update Timer Display
    function updateDisplay() {
        timeRemainingEl.textContent = formatTime(state.timeLeft);
        const percent = ((state.totalDuration - state.timeLeft) / state.totalDuration) * 100;
        setProgress(percent);
        
        let modeTitle = 'Ready to Focus';
        if (state.mode === 'work') modeTitle = state.isRunning ? 'Deep Focus Session' : 'Ready to Focus';
        if (state.mode === 'stretch') modeTitle = 'Somatic Break';
        if (state.mode === 'eyes') modeTitle = 'Eye Relief Break';
        timerLabelEl.textContent = modeTitle;
    }

    // Switch Mode
    function setMode(newMode) {
        stopTimer();
        state.mode = newMode;
        
        tabBtns.forEach(btn => {
            if (btn.dataset.mode === newMode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        if (newMode === 'work') {
            state.totalDuration = state.workDuration;
            progressCircle.style.stroke = 'var(--accent-primary)';
        } else if (newMode === 'stretch') {
            state.totalDuration = state.stretchDuration;
            progressCircle.style.stroke = 'var(--accent-stretch)';
            loadRandomActivity('stretch');
        } else if (newMode === 'eyes') {
            state.totalDuration = state.eyesDuration;
            progressCircle.style.stroke = 'var(--accent-eyes)';
            loadRandomActivity('eyes');
        }

        state.timeLeft = state.totalDuration;
        updateDisplay();
    }

    // Load random exercise guide
    function loadRandomActivity(type) {
        const list = activities[type];
        if (!list || list.length === 0) return;
        const item = list[Math.floor(Math.random() * list.length)];
        
        activityContent.innerHTML = `
            <div class="activity-icon">${item.icon}</div>
            <h3 id="activity-title">${item.title}</h3>
            <p id="activity-desc">${item.desc}</p>
            <div class="activity-tags">
                ${item.tags.map(t => `<span class="tag">${t}</span>`).join('')}
            </div>
        `;
    }

    // Timer execution
    function startTimer() {
        if (state.isRunning) return;
        state.isRunning = true;
        startBtn.textContent = 'Running...';
        startBtn.disabled = true;
        pauseBtn.disabled = false;

        state.timerId = setInterval(() => {
            if (state.timeLeft > 0) {
                state.timeLeft--;
                updateDisplay();
            } else {
                // Timer complete!
                clearInterval(state.timerId);
                state.isRunning = false;
                playChime(state.mode);

                if (state.mode === 'work') {
                    state.stats.sessions++;
                    state.stats.minutes += Math.round(state.workDuration / 60);
                    saveStats();
                    updateStatsUI();
                    
                    // Automatically transition to somatic stretch break
                    setMode('stretch');
                    startTimer();
                } else {
                    // Transition back to work
                    setMode('work');
                    startBtn.textContent = 'Start Session';
                    startBtn.disabled = false;
                    pauseBtn.disabled = true;
                }
            }
        }, 1000);
    }

    function pauseTimer() {
        if (!state.isRunning) return;
        clearInterval(state.timerId);
        state.isRunning = false;
        startBtn.textContent = 'Resume';
        startBtn.disabled = false;
        pauseBtn.disabled = true;
    }

    function skipTimer() {
        stopTimer();
        if (state.mode === 'work') {
            setMode('stretch');
        } else {
            setMode('work');
        }
        startBtn.textContent = 'Start Session';
        startBtn.disabled = false;
        pauseBtn.disabled = true;
    }

    function stopTimer() {
        clearInterval(state.timerId);
        state.isRunning = false;
        startBtn.textContent = 'Start Session';
        startBtn.disabled = false;
        pauseBtn.disabled = true;
    }

    // Event Listeners
    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    skipBtn.addEventListener('click', skipTimer);

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setMode(btn.dataset.mode);
            startBtn.textContent = 'Start Session';
            startBtn.disabled = false;
            pauseBtn.disabled = true;
        });
    });

    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            presetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const workMins = parseInt(btn.dataset.work, 10);
            const breakMins = parseInt(btn.dataset.break, 10);
            
            state.workDuration = workMins * 60;
            state.stretchDuration = breakMins * 60;
            
            if (state.mode === 'work') {
                state.totalDuration = state.workDuration;
                state.timeLeft = state.workDuration;
                updateDisplay();
            }
        });
    });

    nextActivityBtn.addEventListener('click', () => {
        const currentType = state.mode === 'eyes' ? 'eyes' : 'stretch';
        loadRandomActivity(currentType);
    });

    clearLogBtn.addEventListener('click', () => {
        state.stats.sessions = 0;
        state.stats.minutes = 0;
        saveStats();
        updateStatsUI();
    });

    // Initial Load
    loadStats();
    updateDisplay();
    loadRandomActivity('stretch');
});
