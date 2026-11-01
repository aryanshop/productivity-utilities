/* STATE MANAGEMENT & STORAGE */
const STORAGE_KEY = 'aurapulse_state_v1';

let state = {
    workDuration: 25, // minutes
    breakDuration: 5, // minutes
    longBreakDuration: 15,
    autoStartBreaks: true,
    soundEnabled: true,
    theme: 'dark',
    streak: 0,
    totalSprints: 0,
    totalMinutes: 0,
    totalStretches: 0,
    logs: [],
    lastActiveDate: null
};

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            state = { ...state, ...JSON.parse(saved) };
        } catch (e) {
            console.error('Failed to load state', e);
        }
    }
    checkStreak();
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function checkStreak() {
    const today = new Date().toDateString();
    if (state.lastActiveDate) {
        const lastDate = new Date(state.lastActiveDate);
        const diffDays = Math.floor((new Date(today) - lastDate) / (1000 * 60 * 60 * 24));
        if (diffDays > 1) {
            state.streak = 0;
        }
    }
}

function recordStreak() {
    const today = new Date().toDateString();
    if (state.lastActiveDate !== today) {
        if (!state.lastActiveDate) {
            state.streak = 1;
        } else {
            const lastDate = new Date(state.lastActiveDate);
            const diffDays = Math.floor((new Date(today) - lastDate) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
                state.streak += 1;
            } else if (diffDays > 1) {
                state.streak = 1;
            }
        }
        state.lastActiveDate = today;
    }
}

/* WEB AUDIO API CHIME */
let audioCtx = null;

function playChime(type = 'work') {
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
        if (type === 'work') {
            osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
            osc.frequency.exponentialRampToValueAtTime(659.25, audioCtx.currentTime + 0.3); // E5
        } else {
            osc.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
            osc.frequency.exponentialRampToValueAtTime(523.25, audioCtx.currentTime + 0.3); // C5
        }
        
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 1.2);
    } catch (e) {
        console.log('Audio context not allowed yet', e);
    }
}

/* TIMER ENGINE */
let timerInterval = null;
let timeLeft = 25 * 60;
let totalTimerDuration = 25 * 60;
let isRunning = false;
let currentMode = 'work'; // 'work', 'break'
let sessionCount = 1;

const circleRadius = 125;
const circleCircumference = 2 * Math.PI * circleRadius;

function initTimer() {
    const ringFill = document.getElementById('ringFill');
    ringFill.style.strokeDasharray = circleCircumference;
    updateTimerDisplay();
}

function setTimerMode(mode) {
    currentMode = mode;
    if (mode === 'work') {
        totalTimerDuration = state.workDuration * 60;
        document.getElementById('modeLabel').textContent = 'Deep Work';
        document.getElementById('statusDot').className = 'status-dot';
        document.getElementById('statusText').textContent = 'Focus Sprint Active';
    } else {
        totalTimerDuration = (sessionCount % 4 === 0 ? state.longBreakDuration : state.breakDuration) * 60;
        document.getElementById('modeLabel').textContent = sessionCount % 4 === 0 ? 'Long Break' : 'Micro-Break';
        document.getElementById('statusDot').className = 'status-dot break';
        document.getElementById('statusText').textContent = 'Micro-Break Recovery';
    }
    timeLeft = totalTimerDuration;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    document.getElementById('timeCountdown').textContent = timeStr;
    document.title = `${timeStr} - AuraPulse`;
    
    const progress = (totalTimerDuration - timeLeft) / totalTimerDuration;
    const offset = circleCircumference - (progress * circleCircumference);
    document.getElementById('ringFill').style.strokeDashoffset = offset;
    
    document.getElementById('sessionCounter').textContent = `Session ${sessionCount} of 4`;
}

function startTimer() {
    if (isRunning) return;
    isRunning = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('pauseBtn').disabled = false;
    
    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateTimerDisplay();
        } else {
            clearInterval(timerInterval);
            isRunning = false;
            document.getElementById('startBtn').disabled = false;
            document.getElementById('pauseBtn').disabled = true;
            playChime(currentMode);
            
            if (currentMode === 'work') {
                state.totalSprints++;
                state.totalMinutes += state.workDuration;
                recordStreak();
                addLog('Focus Sprint', `${state.workDuration} min deep work completed`);
                saveState();
                updateStatsUI();
                
                if (state.autoStartBreaks) {
                    setTimerMode('break');
                    startTimer();
                } else {
                    setTimerMode('break');
                }
            } else {
                addLog('Micro-Break', 'Recovery break completed');
                sessionCount = sessionCount >= 4 ? 1 : sessionCount + 1;
                setTimerMode('work');
                saveState();
            }
        }
    }, 1000);
}

function pauseTimer() {
    if (!isRunning) return;
    clearInterval(timerInterval);
    isRunning = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('statusText').textContent = 'Timer Paused';
}

function skipTimer() {
    clearInterval(timerInterval);
    isRunning = false;
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    
    if (currentMode === 'work') {
        setTimerMode('break');
    } else {
        sessionCount = sessionCount >= 4 ? 1 : sessionCount + 1;
        setTimerMode('work');
    }
}

/* SOMATIC STRETCHES DATA */
const stretchesData = [
    {
        id: 1,
        category: 'neck',
        title: 'Neck Lateral Tilt',
        duration: 30,
        description: 'Sit upright, gently tilt your right ear toward your right shoulder until you feel a comfortable stretch along the left side of your neck. Hold for 30 seconds, then switch sides.',
        tag: 'Neck & Shoulders'
    },
    {
        id: 2,
        category: 'neck',
        title: 'Shoulder Blade Squeeze',
        duration: 20,
        description: 'Draw your shoulders back and squeeze your shoulder blades together as if holding a pencil between them. Hold for 5 seconds, repeat 5 times.',
        tag: 'Neck & Shoulders'
    },
    {
        id: 3,
        category: 'wrists',
        title: 'Wrist Flexor & Extensor Stretch',
        duration: 30,
        description: 'Extend your right arm forward with palm facing out, fingers pointing up. Use your left hand to gently pull your fingers back toward your body. Hold 15s, then point fingers down.',
        tag: 'Wrists & Hands'
    },
    {
        id: 4,
        category: 'wrists',
        title: 'Finger Spreads & Circles',
        duration: 20,
        description: 'Make a tight fist, then aggressively spread your fingers wide apart as far as comfortable. Repeat 10 times, then gently rotate wrists in circular motions.',
        tag: 'Wrists & Hands'
    },
    {
        id: 5,
        category: 'eyes',
        title: '20-20-20 Eye Relaxation',
        duration: 20,
        description: 'Look away from your computer monitor and focus on an object at least 20 feet away for 20 seconds to relax your ciliary eye muscles.',
        tag: 'Eye Strain'
    },
    {
        id: 6,
        category: 'back',
        title: 'Seated Spinal Twist',
        duration: 30,
        description: 'Sit sideways or straight in your chair, place your left hand on the backrest, and gently twist your torso to the left. Hold for 15 seconds, then repeat on the right side.',
        tag: 'Spine & Core'
    }
];

function renderStretches(filter = 'all') {
    const grid = document.getElementById('stretchGrid');
    grid.innerHTML = '';
    
    const filtered = filter === 'all' ? stretchesData : stretchesData.filter(s => s.category === filter);
    
    filtered.forEach(s => {
        const card = document.createElement('div');
        card.className = 'stretch-card';
        card.innerHTML = `
            <div>
                <span class="stretch-card-tag">${s.tag}</span>
                <h4>${s.title}</h4>
                <p>${s.description}</p>
            </div>
            <div class="stretch-card-footer">
                <span>⏱️ ${s.duration}s</span>
                <span class="btn-text">Start &rarr;</span>
            </div>
        `;
        card.addEventListener('click', () => openStretchModal(s));
        grid.appendChild(card);
    });
}

/* MODAL STRETCH TIMER */
let activeStretch = null;
let stretchInterval = null;
let stretchTimeLeft = 30;

function openStretchModal(stretch) {
    activeStretch = stretch;
    stretchTimeLeft = stretch.duration;
    
    document.getElementById('modalCategory').textContent = stretch.tag;
    document.getElementById('modalTitle').textContent = stretch.title;
    document.getElementById('modalDescription').textContent = stretch.description;
    document.getElementById('stretchCountdown').textContent = `00:${String(stretchTimeLeft).padStart(2, '0')}`;
    document.getElementById('startStretchTimerBtn').textContent = 'Start Exercise Timer';
    document.getElementById('startStretchTimerBtn').disabled = false;
    
    document.getElementById('stretchModal').classList.add('open');
}

function closeStretchModal() {
    clearInterval(stretchInterval);
    document.getElementById('stretchModal').classList.remove('open');
}

function startStretchTimer() {
    const btn = document.getElementById('startStretchTimerBtn');
    btn.disabled = true;
    
    stretchInterval = setInterval(() => {
        if (stretchTimeLeft > 0) {
            stretchTimeLeft--;
            document.getElementById('stretchCountdown').textContent = `00:${String(stretchTimeLeft).padStart(2, '0')}`;
        } else {
            clearInterval(stretchInterval);
            btn.textContent = 'Completed! 🎉';
            playChime('work');
            state.totalStretches++;
            addLog('Somatic Stretch', `${activeStretch.title} completed`);
            saveState();
            updateStatsUI();
            setTimeout(closeStretchModal, 1500);
        }
    }, 1000);
}

/* ERGONOMIC TIPS ROTATOR */
const ergonomicTips = [
    {
        cat: 'Posture Tip',
        text: 'Keep your monitor top edge at eye level and shoulders relaxed away from your ears.'
    },
    {
        cat: 'Ergonomic Tip',
        text: 'Ensure your elbows are bent at a 90 to 100-degree angle while typing on your keyboard.'
    },
    {
        cat: 'Hydration Reminder',
        text: 'Keep a full glass of water nearby. Dehydration directly impairs cognitive focus and energy.'
    },
    {
        cat: 'Breathwork',
        text: 'Take 3 deep diaphragmatic breaths: inhale for 4 seconds, hold for 4, exhale for 6.'
    },
    {
        cat: 'Foot Support',
        text: 'Ensure your feet are flat on the floor or resting comfortably on a footrest to prevent lower back strain.'
    }
];

function shufflePrompt() {
    const tip = ergonomicTips[Math.floor(Math.random() * ergonomicTips.length)];
    document.getElementById('promptCategory').textContent = tip.cat;
    document.getElementById('promptText').textContent = tip.text;
}

/* LOGS & STATS */
function addLog(type, details) {
    state.logs.unshift({
        type,
        details,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString()
    });
    if (state.logs.length > 50) state.logs.pop();
    renderLogs();
}

function renderLogs() {
    const list = document.getElementById('logList');
    document.getElementById('streakCount').textContent = `${state.streak} Days`;
    
    if (state.logs.length === 0) {
        list.innerHTML = '<div class="empty-state">No focus sessions recorded yet. Start your first sprint!</div>';
        return;
    }
    
    list.innerHTML = '';
    state.logs.forEach(log => {
        const item = document.createElement('div');
        item.className = 'log-item';
        item.innerHTML = `
            <div>
                <strong>${log.type}</strong>
                <div class="log-item-meta">${log.details}</div>
            </div>
            <div class="log-item-meta">${log.time} (${log.date})</div>
        `;
        list.appendChild(item);
    });
}

function updateStatsUI() {
    document.getElementById('totalSprints').textContent = state.totalSprints;
    document.getElementById('totalMinutes').textContent = `${state.totalMinutes}m`;
    document.getElementById('totalStretches').textContent = state.totalStretches;
    document.getElementById('streakCount').textContent = `${state.streak} Days`;
}

/* EVENT LISTENERS & SETUP */
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initTimer();
    updateStatsUI();
    renderLogs();
    renderStretches('all');
    
    // Theme setup
    if (state.theme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    }
    
    // Navigation tabs
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            navBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`${targetTab}Tab`).classList.add('active');
        });
    });
    
    // Timer preset pills
    const presetPills = document.querySelectorAll('.preset-pill');
    presetPills.forEach(pill => {
        pill.addEventListener('click', () => {
            presetPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            
            const work = parseInt(pill.getAttribute('data-work'));
            const brk = parseInt(pill.getAttribute('data-break'));
            state.workDuration = work;
            state.breakDuration = brk;
            saveState();
            
            if (!isRunning) {
                setTimerMode('work');
            }
        });
    });
    
    // Timer action buttons
    document.getElementById('startBtn').addEventListener('click', startTimer);
    document.getElementById('pauseBtn').addEventListener('click', pauseTimer);
    document.getElementById('skipBtn').addEventListener('click', skipTimer);
    document.getElementById('nextPromptBtn').addEventListener('click', shufflePrompt);
    
    // Quick header actions
    document.getElementById('soundToggle').addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        saveState();
        document.getElementById('soundIcon').style.opacity = state.soundEnabled ? '1' : '0.4';
    });
    
    document.getElementById('themeToggle').addEventListener('click', () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        if (state.theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        saveState();
    });
    
    // Stretch filter chips
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            renderStretches(chip.getAttribute('data-filter'));
        });
    });
    
    // Modal controls
    document.getElementById('closeModalBtn').addEventListener('click', closeStretchModal);
    document.getElementById('stretchModal').addEventListener('click', (e) => {
        if (e.target.id === 'stretchModal') closeStretchModal();
    });
    document.getElementById('startStretchTimerBtn').addEventListener('click', startStretchTimer);
    
    // Settings controls
    const customWork = document.getElementById('customWork');
    const customBreak = document.getElementById('customBreak');
    const longBreakDur = document.getElementById('longBreakDur');
    
    customWork.value = state.workDuration;
    document.getElementById('customWorkVal').textContent = `${state.workDuration} min`;
    customBreak.value = state.breakDuration;
    document.getElementById('customBreakVal').textContent = `${state.breakDuration} min`;
    longBreakDur.value = state.longBreakDuration;
    document.getElementById('longBreakVal').textContent = `${state.longBreakDuration} min`;
    
    document.getElementById('autoStartBreaks').checked = state.autoStartBreaks;
    document.getElementById('ambientChimes').checked = state.soundEnabled;
    
    customWork.addEventListener('input', (e) => {
        document.getElementById('customWorkVal').textContent = `${e.target.value} min`;
    });
    customBreak.addEventListener('input', (e) => {
        document.getElementById('customBreakVal').textContent = `${e.target.value} min`;
    });
    longBreakDur.addEventListener('input', (e) => {
        document.getElementById('longBreakVal').textContent = `${e.target.value} min`;
    });
    
    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
        state.workDuration = parseInt(customWork.value);
        state.breakDuration = parseInt(customBreak.value);
        state.longBreakDuration = parseInt(longBreakDur.value);
        state.autoStartBreaks = document.getElementById('autoStartBreaks').checked;
        state.soundEnabled = document.getElementById('ambientChimes').checked;
        saveState();
        if (!isRunning) {
            setTimerMode('work');
        }
        alert('Preferences successfully saved!');
    });
    
    document.getElementById('clearLogsBtn').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear your session history?')) {
            state.logs = [];
            state.totalSprints = 0;
            state.totalMinutes = 0;
            state.totalStretches = 0;
            saveState();
            renderLogs();
            updateStatsUI();
        }
    });
});
