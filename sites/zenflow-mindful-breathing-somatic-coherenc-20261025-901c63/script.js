/* ZenFlow - Mindful Breathing & Somatic Coherence Studio */

document.addEventListener('DOMContentLoaded', () => {
    // Breathing Technique Definitions (durations in seconds)
    const TECHNIQUES = {
        box: {
            name: 'Box Breathing',
            phases: [
                { name: 'Inhale', duration: 4, action: 'expand' },
                { name: 'Hold', duration: 4, action: 'holdFull' },
                { name: 'Exhale', duration: 4, action: 'contract' },
                { name: 'Hold', duration: 4, action: 'holdEmpty' }
            ]
        },
        relax478: {
            name: '4-7-8 Deep Calm',
            phases: [
                { name: 'Inhale', duration: 4, action: 'expand' },
                { name: 'Hold', duration: 7, action: 'holdFull' },
                { name: 'Exhale', duration: 8, action: 'contract' }
            ]
        },
        coherent: {
            name: 'Coherent Flow',
            phases: [
                { name: 'Inhale', duration: 5.5, action: 'expand' },
                { name: 'Exhale', duration: 5.5, action: 'contract' }
            ]
        },
        energize: {
            name: 'Energizing Breath',
            phases: [
                { name: 'Inhale', duration: 6, action: 'expand' },
                { name: 'Hold', duration: 2, action: 'holdFull' },
                { name: 'Exhale', duration: 4, action: 'contract' }
            ]
        }
    };

    // State Variables
    let currentTechniqueKey = 'box';
    let currentTechnique = TECHNIQUES[currentTechniqueKey];
    let isRunning = false;
    let isPaused = false;
    let currentPhaseIndex = 0;
    let phaseTimer = 0;
    let phaseDuration = 0;
    let sessionDurationSetting = 180; // default 3 mins in seconds
    let sessionTimeRemaining = sessionDurationSetting;
    let sessionTimerInterval = null;
    let animationFrameId = null;
    let completedCycles = 0;

    // Audio Context (Web Audio API)
    let audioCtx = null;

    // DOM Elements
    const techButtons = document.querySelectorAll('.tech-btn');
    const sessionDurationSelect = document.getElementById('sessionDuration');
    const soundToggle = document.getElementById('soundToggle');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    
    const phaseLabel = document.getElementById('phaseLabel');
    const timerLabel = document.getElementById('timerLabel');
    const instructionText = document.getElementById('instructionText');
    const progressRing = document.getElementById('progressRing');
    const coreCircle = document.getElementById('coreCircle');
    const ambientGlow = document.getElementById('ambientGlow');
    const cycleCountEl = document.getElementById('cycleCount');

    const totalMinutesEl = document.getElementById('totalMinutes');
    const totalSessionsEl = document.getElementById('totalSessions');
    const currentStreakEl = document.getElementById('currentStreak');
    const journalInput = document.getElementById('journalInput');
    const saveJournalBtn = document.getElementById('saveJournalBtn');
    const saveStatus = document.getElementById('saveStatus');
    const journalHistory = document.getElementById('journalHistory');

    const circumference = 2 * Math.PI * 110; // r = 110
    progressRing.style.strokeDasharray = circumference;

    // Initialize Stats from LocalStorage
    let stats = JSON.parse(localStorage.getItem('zenflow_stats')) || { totalMinutes: 0, totalSessions: 0, currentStreak: 0, lastDate: null };
    let journalEntries = JSON.parse(localStorage.getItem('zenflow_journal')) || [];

    function updateStatsDisplay() {
        totalMinutesEl.textContent = stats.totalMinutes;
        totalSessionsEl.textContent = stats.totalSessions;
        currentStreakEl.textContent = stats.currentStreak;
    }

    function renderJournalHistory() {
        journalHistory.innerHTML = '';
        journalEntries.slice(-5).reverse().forEach(entry => {
            const div = document.createElement('div');
            div.className = 'journal-entry';
            div.innerHTML = `
                <div class="journal-entry-header">
                    <span>${entry.date}</span>
                    <span>${entry.technique}</span>
                </div>
                <p>${escapeHtml(entry.text)}</p>
            `;
            journalHistory.appendChild(div);
        });
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    updateStatsDisplay();
    renderJournalHistory();

    // Technique selection
    techButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isRunning) return;
            techButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTechniqueKey = btn.getAttribute('data-technique');
            currentTechnique = TECHNIQUES[currentTechniqueKey];
            resetSessionState();
        });
    });

    sessionDurationSelect.addEventListener('change', (e) => {
        const val = parseInt(e.target.value);
        sessionDurationSetting = val === 0 ? 0 : val * 60;
        sessionTimeRemaining = sessionDurationSetting;
        updateTimerDisplay();
    });

    function updateTimerDisplay() {
        if (sessionDurationSetting === 0) {
            timerLabel.textContent = '∞';
            return;
        }
        const mins = Math.floor(sessionTimeRemaining / 60);
        const secs = sessionTimeRemaining % 60;
        timerLabel.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // Audio chime helper
    function playTone(freq, duration = 0.8, type = 'sine') {
        if (!soundToggle.checked) return;
        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            
            gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) {
            console.error('Audio error:', e);
        }
    }

    // Start / Pause / Reset Controls
    startBtn.addEventListener('click', () => {
        if (!isRunning) {
            startSession();
        } else if (isPaused) {
            resumeSession();
        }
    });

    pauseBtn.addEventListener('click', () => {
        if (isRunning && !isPaused) {
            pauseSession();
        }
    });

    resetBtn.addEventListener('click', () => {
        stopSession();
        resetSessionState();
    });

    function startSession() {
        isRunning = true;
        isPaused = false;
        startBtn.textContent = 'Running...';
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        sessionDurationSelect.disabled = true;
        techButtons.forEach(b => b.disabled = true);

        currentPhaseIndex = 0;
        completedCycles = 0;
        cycleCountEl.textContent = completedCycles;

        if (sessionDurationSetting > 0) {
            sessionTimeRemaining = sessionDurationSetting;
            sessionTimerInterval = setInterval(() => {
                sessionTimeRemaining--;
                updateTimerDisplay();
                if (sessionTimeRemaining <= 0) {
                    completeSession();
                }
            }, 1000);
        } else {
            timerLabel.textContent = '∞';
        }

        playTone(329.63, 1.2); // E4 starting chime
        runPhase();
    }

    function pauseSession() {
        isPaused = true;
        startBtn.textContent = 'Resume';
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        if (sessionTimerInterval) clearInterval(sessionTimerInterval);
        cancelAnimationFrame(animationFrameId);
    }

    function resumeSession() {
        isPaused = false;
        startBtn.textContent = 'Running...';
        startBtn.disabled = true;
        pauseBtn.disabled = false;

        if (sessionDurationSetting > 0) {
            sessionTimerInterval = setInterval(() => {
                sessionTimeRemaining--;
                updateTimerDisplay();
                if (sessionTimeRemaining <= 0) {
                    completeSession();
                }
            }, 1000);
        }
        runPhase();
    }

    function stopSession() {
        isRunning = false;
        isPaused = false;
        if (sessionTimerInterval) clearInterval(sessionTimerInterval);
        cancelAnimationFrame(animationFrameId);

        startBtn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Start Session';
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        sessionDurationSelect.disabled = false;
        techButtons.forEach(b => b.disabled = false);

        phaseLabel.textContent = 'Ready to Begin';
        instructionText.textContent = 'Press Start';
        progressRing.style.strokeDashoffset = circumference;
        coreCircle.style.transform = 'scale(1)';
        ambientGlow.style.opacity = '0.3';
    }

    function resetSessionState() {
        sessionDurationSetting = sessionDurationSelect.value === '0' ? 0 : parseInt(sessionDurationSelect.value) * 60;
        sessionTimeRemaining = sessionDurationSetting;
        updateTimerDisplay();
        completedCycles = 0;
        cycleCountEl.textContent = completedCycles;
    }

    function completeSession() {
        stopSession();
        playTone(523.25, 2.0); // C5 completion chime

        // Update stats
        const durationMins = sessionDurationSetting > 0 ? Math.round(sessionDurationSetting / 60) : 3;
        stats.totalMinutes += durationMins;
        stats.totalSessions += 1;

        const todayStr = new Date().toDateString();
        if (stats.lastDate !== todayStr) {
            const last = stats.lastDate ? new Date(stats.lastDate) : null;
            const now = new Date();
            if (last) {
                const diffDays = Math.round((now - last) / (1000 * 60 * 60 * 24));
                if (diffDays === 1) {
                    stats.currentStreak += 1;
                } else if (diffDays > 1) {
                    stats.currentStreak = 1;
                }
            } else {
                stats.currentStreak = 1;
            }
            stats.lastDate = todayStr;
        }

        localStorage.setItem('zenflow_stats', JSON.stringify(stats));
        updateStatsDisplay();
        phaseLabel.textContent = 'Session Complete ✨';
        instructionText.textContent = 'Well Done';
    }

    // Breathing Phase Loop with requestAnimationFrame
    function runPhase() {
        if (!isRunning || isPaused) return;

        const phase = currentTechnique.phases[currentPhaseIndex];
        phaseLabel.textContent = phase.name;
        instructionText.textContent = phase.name;

        // Play transition chime tone based on phase action
        if (phase.action === 'expand') {
            playTone(261.63, 0.6); // C4
        } else if (phase.action === 'contract') {
            playTone(196.00, 0.6); // G3
        } else {
            playTone(220.00, 0.4); // A3 hold
        }

        phaseDuration = phase.duration;
        let startTime = performance.now();

        function step(now) {
            if (!isRunning || isPaused) return;

            let elapsed = (now - startTime) / 1000;
            let progress = Math.min(elapsed / phaseDuration, 1);

            // Calculate visual parameters
            let scale = 1;
            let dashOffset = 0;

            if (phase.action === 'expand') {
                scale = 1 + (progress * 0.55);
                dashOffset = circumference - (progress * circumference);
                ambientGlow.style.opacity = 0.2 + (progress * 0.5);
            } else if (phase.action === 'contract') {
                scale = 1.55 - (progress * 0.55);
                dashOffset = (progress * circumference);
                ambientGlow.style.opacity = 0.7 - (progress * 0.5);
            } else if (phase.action === 'holdFull') {
                scale = 1.55;
                dashOffset = 0;
                ambientGlow.style.opacity = 0.7;
            } else if (phase.action === 'holdEmpty') {
                scale = 1;
                dashOffset = circumference;
                ambientGlow.style.opacity = 0.2;
            }

            coreCircle.style.transform = `scale(${scale})`;
            progressRing.style.strokeDashoffset = dashOffset;

            if (progress < 1) {
                animationFrameId = requestAnimationFrame(step);
            } else {
                // Move to next phase
                currentPhaseIndex++;
                if (currentPhaseIndex >= currentTechnique.phases.length) {
                    currentPhaseIndex = 0;
                    completedCycles++;
                    cycleCountEl.textContent = completedCycles;
                }
                runPhase();
            }
        }

        animationFrameId = requestAnimationFrame(step);
    }

    // Journal Saving
    saveJournalBtn.addEventListener('click', () => {
        const text = journalInput.value.trim();
        if (!text) return;

        const newEntry = {
            date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
            technique: currentTechnique.name,
            text: text
        };

        journalEntries.push(newEntry);
        localStorage.setItem('zenflow_journal', JSON.stringify(journalEntries));
        journalInput.value = '';
        renderJournalHistory();

        saveStatus.textContent = 'Saved!';
        setTimeout(() => {
            saveStatus.textContent = '';
        }, 2000);
    });
});
