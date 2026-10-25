/* ChronoSplit Engine */

const PRESETS = {
    tabata: {
        name: "Tabata Standard",
        rounds: 8,
        phases: [
            { type: "work", name: "High Intensity", duration: 20 },
            { type: "rest", name: "Rest", duration: 10 }
        ]
    },
    hiit: {
        name: "HIIT Power Circuit",
        rounds: 5,
        phases: [
            { type: "warmup", name: "Warm-up", duration: 30 },
            { type: "work", name: "Explosive Effort", duration: 45 },
            { type: "rest", name: "Recovery", duration: 15 }
        ]
    },
    pomodoro: {
        name: "Focus Sprint",
        rounds: 4,
        phases: [
            { type: "work", name: "Deep Work Sprint", duration: 1500 },
            { type: "rest", name: "Short Break", duration: 300 }
        ]
    },
    stretching: {
        name: "Mobility Flow",
        rounds: 3,
        phases: [
            { type: "work", name: "Dynamic Stretch", duration: 60 },
            { type: "rest", name: "Transition", duration: 15 }
        ]
    }
};

let currentCircuit = {
    name: "Tabata Blast",
    rounds: 4,
    phases: [
        { type: "work", name: "Work", duration: 20 },
        { type: "rest", name: "Rest", duration: 10 }
    ]
};

let timerState = {
    isRunning: false,
    isPaused: false,
    currentPhaseIndex: 0,
    currentRound: 1,
    timeLeft: 0,
    totalPhaseDuration: 0,
    timerId: null,
    audioCtx: null
};

// DOM Elements
const presetSelect = document.getElementById('presetSelect');
const circuitNameInput = document.getElementById('circuitNameInput');
const roundsInput = document.getElementById('roundsInput');
const phasesList = document.getElementById('phasesList');
const addPhaseBtn = document.getElementById('addPhaseBtn');
const savePresetBtn = document.getElementById('savePresetBtn');
const loadPresetBtn = document.getElementById('loadPresetBtn');

const currentPhaseBadge = document.getElementById('currentPhaseBadge');
const timerClock = document.getElementById('timerClock');
const currentRoundInfo = document.getElementById('currentRoundInfo');
const totalTimeInfo = document.getElementById('totalTimeInfo');
const progressRing = document.getElementById('progressRing');
const ringStatusIcon = document.getElementById('ringStatusIcon');

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');

const soundToggle = document.getElementById('soundToggle');
const speechToggle = document.getElementById('speechToggle');

const statTotalDuration = document.getElementById('statTotalDuration');
const statTotalPhases = document.getElementById('statTotalPhases');
const statWorkRestRatio = document.getElementById('statWorkRestRatio');
const timelineBar = document.getElementById('timelineBar');

const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * 96;

// Initialize App
function init() {
    progressRing.style.strokeDasharray = CIRCLE_CIRCUMFERENCE;
    loadPreset('tabata');
    setupEventListeners();
}

function setupEventListeners() {
    presetSelect.addEventListener('change', (e) => {
        if (e.target.value !== 'custom') {
            loadPreset(e.target.value);
        }
    });

    circuitNameInput.addEventListener('input', (e) => {
        currentCircuit.name = e.target.value;
    });

    roundsInput.addEventListener('input', (e) => {
        currentCircuit.rounds = Math.max(1, parseInt(e.target.value) || 1);
        updateAnalytics();
    });

    addPhaseBtn.addEventListener('click', () => {
        currentCircuit.phases.push({ type: 'work', name: 'New Interval', duration: 30 });
        renderPhases();
        updateAnalytics();
    });

    savePresetBtn.addEventListener('click', () => {
        try {
            localStorage.setItem('chronosplit_custom', JSON.stringify(currentCircuit));
            alert('Circuit successfully saved to local storage!');
        } catch (err) {
            console.error(err);
        }
    });

    loadPresetBtn.addEventListener('click', () => {
        try {
            const saved = localStorage.getItem('chronosplit_custom');
            if (saved) {
                currentCircuit = JSON.parse(saved);
                circuitNameInput.value = currentCircuit.name;
                roundsInput.value = currentCircuit.rounds;
                presetSelect.value = 'custom';
                renderPhases();
                updateAnalytics();
                resetTimerState();
                alert('Loaded custom circuit!');
            } else {
                alert('No saved circuit found in local storage.');
            }
        } catch (err) {
            console.error(err);
        }
    });

    startBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    resetBtn.addEventListener('click', resetTimerState);

    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    });
}

function loadPreset(key) {
    const p = PRESETS[key];
    if (!p) return;
    currentCircuit = JSON.parse(JSON.stringify(p));
    circuitNameInput.value = currentCircuit.name;
    roundsInput.value = currentCircuit.rounds;
    renderPhases();
    updateAnalytics();
    resetTimerState();
}

function renderPhases() {
    phasesList.innerHTML = '';
    currentCircuit.phases.forEach((phase, index) => {
        const div = document.createElement('div');
        div.className = 'phase-item';
        div.innerHTML = `
            <select onchange="updatePhaseType(${index}, this.value)">
                <option value="work" ${phase.type === 'work' ? 'selected' : ''}>Work</option>
                <option value="rest" ${phase.type === 'rest' ? 'selected' : ''}>Rest</option>
                <option value="warmup" ${phase.type === 'warmup' ? 'selected' : ''}>Warmup</option>
                <option value="cool" ${phase.type === 'cool' ? 'selected' : ''}>Cool</option>
            </select>
            <input type="text" value="${phase.name}" oninput="updatePhaseName(${index}, this.value)">
            <input type="number" value="${phase.duration}" min="1" max="3600" oninput="updatePhaseDuration(${index}, this.value)">
            <button class="btn danger-btn" style="padding:6px 10px; font-size:12px;" onclick="removePhase(${index})">✕</button>
        `;
        phasesList.appendChild(div);
    });
}

window.updatePhaseType = function(index, type) {
    currentCircuit.phases[index].type = type;
    updateAnalytics();
};

window.updatePhaseName = function(index, name) {
    currentCircuit.phases[index].name = name;
};

window.updatePhaseDuration = function(index, dur) {
    currentCircuit.phases[index].duration = Math.max(1, parseInt(dur) || 1);
    updateAnalytics();
};

window.removePhase = function(index) {
    if (currentCircuit.phases.length <= 1) {
        alert('Circuit must have at least one phase.');
        return;
    }
    currentCircuit.phases.splice(index, 1);
    renderPhases();
    updateAnalytics();
};

function calculateTotalSeconds() {
    const singleRoundSecs = currentCircuit.phases.reduce((acc, p) => acc + p.duration, 0);
    return singleRoundSecs * currentCircuit.rounds;
}

function updateAnalytics() {
    const totalSecs = calculateTotalSeconds();
    statTotalDuration.textContent = formatTimeMinutes(totalSecs);
    const totalIntervals = currentCircuit.phases.length * currentCircuit.rounds;
    statTotalPhases.textContent = totalIntervals;

    let workSecs = 0;
    let restSecs = 0;
    currentCircuit.phases.forEach(p => {
        if (p.type === 'work' || p.type === 'warmup') workSecs += p.duration;
        else restSecs += p.duration;
    });
    workSecs *= currentCircuit.rounds;
    restSecs *= currentCircuit.rounds;

    if (restSecs === 0) {
        statWorkRestRatio.textContent = 'N/A';
    } else {
        const ratio = (workSecs / restSecs).toFixed(1);
        statWorkRestRatio.textContent = `${ratio}:1`;
    }

    totalTimeInfo.textContent = `Total: ${formatTimeMinutes(totalSecs)}`;
    renderTimelinePreview();
}

function renderTimelinePreview() {
    timelineBar.innerHTML = '';
    const totalSecs = calculateTotalSeconds();
    if (totalSecs === 0) return;

    for (let r = 0; r < currentCircuit.rounds; r++) {
        currentCircuit.phases.forEach(p => {
            const seg = document.createElement('div');
            seg.className = 'timeline-segment';
            const pct = (p.duration / totalSecs) * 100;
            seg.style.width = `${pct}%`;
            
            if (p.type === 'work') seg.style.backgroundColor = 'var(--accent-work)';
            else if (p.type === 'rest') seg.style.backgroundColor = 'var(--accent-rest)';
            else if (p.type === 'warmup') seg.style.backgroundColor = 'var(--accent-warm)';
            else seg.style.backgroundColor = 'var(--accent-cool)';
            
            seg.title = `${p.name} (${p.duration}s)`;
            timelineBar.appendChild(seg);
        });
    }
}

function formatTimeMinutes(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatClockTime(secs) {
    if (secs >= 3600) {
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function resetTimerState() {
    if (timerState.timerId) clearInterval(timerState.timerId);
    timerState.isRunning = false;
    timerState.isPaused = false;
    timerState.currentPhaseIndex = 0;
    timerState.currentRound = 1;
    
    if (currentCircuit.phases.length > 0) {
        timerState.timeLeft = currentCircuit.phases[0].duration;
        timerState.totalPhaseDuration = currentCircuit.phases[0].duration;
        currentPhaseBadge.textContent = currentCircuit.phases[0].name;
        setPhaseTheme(currentCircuit.phases[0].type);
    } else {
        timerState.timeLeft = 0;
        timerState.totalPhaseDuration = 1;
        currentPhaseBadge.textContent = 'READY';
    }

    timerClock.textContent = formatClockTime(timerState.timeLeft);
    currentRoundInfo.textContent = `Round 1 / ${currentCircuit.rounds}`;
    setRingProgress(1);
    ringStatusIcon.textContent = '▶';

    startBtn.disabled = false;
    pauseBtn.disabled = true;
    pauseBtn.textContent = 'Pause';
}

function setPhaseTheme(type) {
    let color = 'var(--accent-work)';
    if (type === 'rest') color = 'var(--accent-rest)';
    else if (type === 'warmup') color = 'var(--accent-warm)';
    else if (type === 'cool') color = 'var(--accent-cool)';

    progressRing.style.stroke = color;
    currentPhaseBadge.style.borderColor = color;
    currentPhaseBadge.style.color = color;
}

function startTimer() {
    if (currentCircuit.phases.length === 0) return;

    if (!timerState.isRunning && !timerState.isPaused) {
        // Fresh start
        const p = currentCircuit.phases[0];
        timerState.timeLeft = p.duration;
        timerState.totalPhaseDuration = p.duration;
        setPhaseTheme(p.type);
    }

    timerState.isRunning = true;
    timerState.isPaused = false;
    startBtn.disabled = true;
    pauseBtn.disabled = false;
    pauseBtn.textContent = 'Pause';
    ringStatusIcon.textContent = '⏸';

    if (!timerState.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) timerState.audioCtx = new AudioContext();
    }

    timerState.timerId = setInterval(tick, 1000);
}

function pauseTimer() {
    if (timerState.isRunning) {
        clearInterval(timerState.timerId);
        timerState.isRunning = false;
        timerState.isPaused = true;
        startBtn.disabled = false;
        pauseBtn.textContent = 'Resume';
        ringStatusIcon.textContent = '▶';
    } else if (timerState.isPaused) {
        startTimer();
    }
}

function tick() {
    if (timerState.timeLeft > 0) {
        timerState.timeLeft--;
        timerClock.textContent = formatClockTime(timerState.timeLeft);
        
        const progress = timerState.timeLeft / timerState.totalPhaseDuration;
        setRingProgress(progress);

        if (timerState.timeLeft <= 3 && timerState.timeLeft > 0) {
            playBeep(440, 0.1);
        } else if (timerState.timeLeft === 0) {
            playBeep(880, 0.3);
        }
    }

    if (timerState.timeLeft <= 0) {
        // Transition to next phase or round
        timerState.currentPhaseIndex++;
        if (timerState.currentPhaseIndex >= currentCircuit.phases.length) {
            timerState.currentPhaseIndex = 0;
            timerState.currentRound++;
            if (timerState.currentRound > currentCircuit.rounds) {
                // Circuit Complete!
                clearInterval(timerState.timerId);
                timerState.isRunning = false;
                currentPhaseBadge.textContent = 'COMPLETE! 🎉';
                timerClock.textContent = '00:00';
                setRingProgress(0);
                ringStatusIcon.textContent = '🏁';
                playCompleteSound();
                startBtn.disabled = false;
                pauseBtn.disabled = true;
                return;
            }
        }

        const nextP = currentCircuit.phases[timerState.currentPhaseIndex];
        timerState.timeLeft = nextP.duration;
        timerState.totalPhaseDuration = nextP.duration;
        currentPhaseBadge.textContent = nextP.name;
        setPhaseTheme(nextP.type);
        currentRoundInfo.textContent = `Round ${timerState.currentRound} / ${currentCircuit.rounds}`;
        timerClock.textContent = formatClockTime(timerState.timeLeft);
    }
}

function setRingProgress(progress) {
    const offset = CIRCLE_CIRCUMFERENCE - (progress * CIRCLE_CIRCUMFERENCE);
    progressRing.style.strokeDashoffset = offset;
}

function playBeep(freq, duration) {
    if (!soundToggle.checked || !timerState.audioCtx) return;
    try {
        const ctx = timerState.audioCtx;
        if (ctx.state === 'suspended') ctx.resume();
        
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch (e) {
        console.error(e);
    }
}

function playCompleteSound() {
    if (!soundToggle.checked || !timerState.audioCtx) return;
    setTimeout(() => playBeep(523.25, 0.15), 0);
    setTimeout(() => playBeep(659.25, 0.15), 150);
    setTimeout(() => playBeep(783.99, 0.3), 300);
}

window.addEventListener('DOMContentLoaded', init);
