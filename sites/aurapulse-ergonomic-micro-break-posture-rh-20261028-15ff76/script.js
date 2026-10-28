/* AuraPulse: Core JavaScript Logic */

document.addEventListener('DOMContentLoaded', () => {
    // State Management
    const state = {
        theme: localStorage.getItem('aurapulse_theme') || 'light',
        activeTab: 'timer',
        sessionType: 'focus', // 'focus', 'micro', 'eyestrain'
        duration: 25 * 60, // in seconds
        timeLeft: 25 * 60,
        isRunning: false,
        timerInterval: null,
        streak: parseInt(localStorage.getItem('aurapulse_streak')) || 0,
        stats: JSON.parse(localStorage.getItem('aurapulse_stats')) || {
            focusCount: 0,
            breakCount: 0,
            totalMinutes: 0,
            weekly: [2, 4, 3, 5, 4, 6, 3]
        },
        settings: JSON.parse(localStorage.getItem('aurapulse_settings')) || {
            focusDuration: 25,
            microDuration: 5,
            eyeDuration: 20,
            soundCue: true
        },
        soundStates: {
            rain: false,
            waves: false,
            binaural: false,
            forest: false
        },
        masterVolume: 0.5
    };

    // DOM Elements
    const body = document.body;
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const themeToggleBtn = document.getElementById('themeToggle');
    const quickSoundToggleBtn = document.getElementById('quickSoundToggle');
    
    // Timer Elements
    const timeRemainingDisplay = document.getElementById('timeRemaining');
    const timerSublabel = document.getElementById('timerSublabel');
    const timerProgress = document.getElementById('timerProgress');
    const startPauseBtn = document.getElementById('startPauseBtn');
    const resetBtn = document.getElementById('resetBtn');
    const skipBtn = document.getElementById('skipBtn');
    const sessionPills = document.querySelectorAll('.session-type-pills .pill');
    const currentModeText = document.getElementById('currentModeText');
    const statusDot = document.getElementById('statusDot');

    // Suggestion Elements
    const suggestionTitle = document.getElementById('suggestionTitle');
    const suggestionText = document.getElementById('suggestionText');
    const suggestionIcon = document.getElementById('suggestionIcon');
    const nextSuggestionBtn = document.getElementById('nextSuggestionBtn');

    // Modal Elements
    const postureModal = document.getElementById('postureModal');
    const modalMessage = document.getElementById('modalMessage');
    const modalStartBreakBtn = document.getElementById('modalStartBreakBtn');
    const modalDismissBtn = document.getElementById('modalDismissBtn');

    // Stats Elements
    const streakCount = document.getElementById('streakCount');
    const statFocusCount = document.getElementById('statFocusCount');
    const statBreakCount = document.getElementById('statBreakCount');
    const statMinutes = document.getElementById('statMinutes');
    const flowChart = document.getElementById('flowChart');
    const clearStatsBtn = document.getElementById('clearStatsBtn');

    // Settings Elements
    const settingFocusDuration = document.getElementById('settingFocusDuration');
    const settingMicroDuration = document.getElementById('settingMicroDuration');
    const settingEyeDuration = document.getElementById('settingEyeDuration');
    const settingSoundCue = document.getElementById('settingSoundCue');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');

    // Stretches Grid
    const stretchGrid = document.getElementById('stretchGrid');
    const filterBtns = document.querySelectorAll('.filter-btn');

    // Ambient Sound Toggles
    const soundCheckboxes = document.querySelectorAll('.sound-checkbox');
    const masterVolumeRange = document.getElementById('masterVolume');

    // Ergonomic & Somatic Tips Bank
    const tips = [
        { icon: '🧘', title: 'Spine Decompression', text: 'Sit tall, roll your shoulders back and down, and imagine a gentle string pulling the crown of your head upward.' },
        { icon: '👁️', title: '20-20-20 Eye Rest', text: 'Look away from your screen at an object at least 20 feet away for 20 seconds to relax your ciliary eye muscles.' },
        { icon: '💧', title: 'Hydration Reset', text: 'Take a sip of fresh water. Dehydration quietly degrades cognitive focus and increases perceived fatigue.' },
        { icon: '👐', title: 'Wrist Tendon Glide', text: 'Extend your arms forward with palms out and gently pull fingers backward with your opposite hand for 15 seconds.' },
        { icon: '🌬️', title: 'Box Breathing', text: 'Inhale for 4 seconds, hold for 4, exhale for 4, and hold empty for 4 to down-regulate your nervous system.' }
    ];
    let currentTipIndex = 0;

    // Stretches Bank
    const stretchesData = [
        { category: 'neck', title: 'Neck Lateral Flexion', duration: '30s per side', desc: 'Gently tilt your right ear toward your right shoulder until a gentle stretch is felt along the left side of your neck.' },
        { category: 'neck', title: 'Chin Tuck', duration: '10 reps', desc: 'Retract your chin straight back like making a double chin to relieve cervical spine strain from forward head posture.' },
        { category: 'spine', title: 'Seated Torso Twist', duration: '30s per side', desc: 'Sit upright and twist your torso to the right, holding the back of your chair for a gentle spinal rotation.' },
        { category: 'spine', title: 'Cat-Cow Seated', duration: '10 reps', desc: 'Arch your chest forward while inhaling, then round your spine backward while exhaling against the chair back.' },
        { category: 'wrists', title: 'Wrist Flexor Stretch', duration: '20s per hand', desc: 'Extend arm forward with palm up, fingers pointing down, and apply gentle pressure back toward your body.' },
        { category: 'wrists', title: 'Finger Fan & Roll', duration: '15s', desc: 'Spread your fingers wide apart as far as possible, hold, then gently rotate your wrists in slow circular loops.' }
    ];

    // Web Audio API Sound Generator State
    let audioCtx = null;
    let soundNodes = {};

    // Initialize App
    function init() {
        applyTheme(state.theme);
        updateStreakDisplay();
        updateStatsDisplay();
        renderStretches('all');
        renderFlowChart();
        loadSettingsToForm();
        setSessionType('focus', false);
        updateTipCard();

        // Event Listeners
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        themeToggleBtn.addEventListener('click', toggleTheme);
        quickSoundToggleBtn.addEventListener('click', toggleMasterSoundQuick);

        startPauseBtn.addEventListener('click', toggleTimer);
        resetBtn.addEventListener('click', resetTimer);
        skipBtn.addEventListener('click', skipSession);

        sessionPills.forEach(pill => {
            pill.addEventListener('click', () => setSessionType(pill.dataset.session));
        });

        nextSuggestionBtn.addEventListener('click', rotateTip);

        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                renderStretches(e.target.dataset.filter);
            });
        });

        soundCheckboxes.forEach(cb => {
            cb.addEventListener('change', (e) => {
                const soundKey = e.target.dataset.sound;
                state.soundStates[soundKey] = e.target.checked;
                handleSoundPlayback(soundKey, e.target.checked);
            });
        });

        masterVolumeRange.addEventListener('input', (e) => {
            state.masterVolume = parseFloat(e.target.value);
            updateMasterVolume();
        });

        saveSettingsBtn.addEventListener('click', saveSettings);
        clearStatsBtn.addEventListener('click', clearStats);

        modalStartBreakBtn.addEventListener('click', () => {
            postureModal.classList.remove('active');
            setSessionType('micro');
            startTimer();
        });

        modalDismissBtn.addEventListener('click', () => {
            postureModal.classList.remove('active');
            setSessionType('focus');
        });
    }

    // Theme Handler
    function applyTheme(theme) {
        state.theme = theme;
        body.setAttribute('data-theme', theme);
        localStorage.setItem('aurapulse_theme', theme);
    }

    function toggleTheme() {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    }

    // Tab Switching
    function switchTab(tabId) {
        state.activeTab = tabId;
        navBtns.forEach(btn => {
            if (btn.dataset.tab === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        tabPanes.forEach(pane => {
            if (pane.id === `tab-${tabId}`) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });
    }

    // Timer Logic
    function setSessionType(type, autoReset = true) {
        if (state.isRunning) pauseTimer();
        state.sessionType = type;

        sessionPills.forEach(p => {
            if (p.dataset.session === type) {
                p.classList.add('active');
            } else {
                p.classList.remove('active');
            }
        });

        if (type === 'focus') {
            state.duration = state.settings.focusDuration * 60;
            timerSublabel.textContent = 'Focus Session';
            currentModeText.textContent = 'Deep Flow Active';
        } else if (type === 'micro') {
            state.duration = state.settings.microDuration * 60;
            timerSublabel.textContent = 'Micro-Break';
            currentModeText.textContent = 'Rest & Stretch';
        } else if (type === 'eyestrain') {
            state.duration = state.settings.eyeDuration;
            timerSublabel.textContent = '20-20-20 Rest';
            currentModeText.textContent = 'Eye Relaxation';
        }

        if (autoReset) {
            state.timeLeft = state.duration;
        }
        updateTimerDisplay();
    }

    function updateTimerDisplay() {
        const mins = Math.floor(state.timeLeft / 60);
        const secs = state.timeLeft % 60);
        timeRemainingDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        const circumference = 552;
        const offset = circumference - (state.timeLeft / state.duration) * circumference;
        timerProgress.style.strokeDashoffset = offset;
    }

    function toggleTimer() {
        if (state.isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    }

    function startTimer() {
        state.isRunning = true;
        startPauseBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> Pause Flow`;
        statusDot.style.background = 'var(--accent)';

        state.timerInterval = setInterval(() => {
            if (state.timeLeft > 0) {
                state.timeLeft--;
                updateTimerDisplay();
            } else {
                completeSession();
            }
        }, 1000);
    }

    function pauseTimer() {
        state.isRunning = false;
        clearInterval(state.timerInterval);
        startPauseBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Start Flow`;
        statusDot.style.background = 'var(--success)';
    }

    function resetTimer() {
        pauseTimer();
        state.timeLeft = state.duration;
        updateTimerDisplay();
    }

    function skipSession() {
        pauseTimer();
        if (state.sessionType === 'focus') {
            setSessionType('micro');
        } else {
            setSessionType('focus');
        }
    }

    function completeSession() {
        pauseTimer();
        playChime();

        if (state.sessionType === 'focus') {
            state.stats.focusCount++;
            state.stats.totalMinutes += state.settings.focusDuration;
            modalMessage.textContent = `Wonderful focus session completed! Take a ${state.settings.microDuration}-minute somatic micro-break to reset your posture.`;
            postureModal.classList.add('active');
        } else {
            state.stats.breakCount++;
            modalMessage.textContent = `Micro-break completed! Ready to dive back into deep flow?`;
            postureModal.classList.add('active');
        }

        saveStats();
        updateStatsDisplay();
        renderFlowChart();
    }

    // Web Audio Chime
    function playChime() {
        if (!state.settings.soundCue) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 1.5);
        } catch (e) {
            console.error(e);
        }
    }

    // Tips Rotation
    function updateTipCard() {
        const tip = tips[currentTipIndex];
        suggestionIcon.textContent = tip.icon;
        suggestionTitle.textContent = tip.title;
        suggestionText.textContent = tip.text;
    }

    function rotateTip() {
        currentTipIndex = (currentTipIndex + 1) % tips.length;
        updateTipCard();
    }

    // Stretches Renderer
    function renderStretches(filter) {
        stretchGrid.innerHTML = '';
        const filtered = filter === 'all' ? stretchesData : stretchesData.filter(s => s.category === filter);

        filtered.forEach(s => {
            const card = document.createElement('div');
            card.className = 'stretch-card';
            card.innerHTML = `
                <span class="stretch-tag">${s.category}</span>
                <h4>${s.title}</h4>
                <p>${s.desc}</p>
                <span class="stretch-duration">⏱️ ${s.duration}</span>
            `;
            stretchGrid.appendChild(card);
        });
    }

    // Generative Web Audio Synthesizer
    function getAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function handleSoundPlayback(soundKey, active) {
        const ctx = getAudioContext();

        if (active) {
            if (soundKey === 'rain') {
                soundNodes.rain = createRainSound(ctx);
            } else if (soundKey === 'waves') {
                soundNodes.waves = createWavesSound(ctx);
            } else if (soundKey === 'binaural') {
                soundNodes.binaural = createBinauralSound(ctx);
            } else if (soundKey === 'forest') {
                soundNodes.forest = createForestSound(ctx);
            }
        } else {
            if (soundNodes[soundKey]) {
                if (typeof soundNodes[soundKey].stop === 'function') {
                    soundNodes[soundKey].stop();
                } else if (soundNodes[soundKey].disconnect) {
                    soundNodes[soundKey].disconnect();
                }
                delete soundNodes[soundKey];
            }
        }
    }

    function createRainSound(ctx) {
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1000;

        const gain = ctx.createGain();
        gain.gain.value = state.masterVolume * 0.3;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();

        return {
            stop: () => { noise.stop(); noise.disconnect(); },
            gainNode: gain
        };
    }

    function createWavesSound(ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.value = 80;

        filter.type = 'lowpass';
        filter.frequency.value = 400;

        gain.gain.value = state.masterVolume * 0.4;

        // LFO for wave sweep
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.1; // 10s period
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 300;

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        lfo.start();

        return {
            stop: () => {
                osc.stop(); lfo.stop();
                osc.disconnect(); lfo.disconnect();
            },
            gainNode: gain
        };
    }

    function createBinauralSound(ctx) {
        const merger = ctx.createChannelMerger(2);
        const oscL = ctx.createOscillator();
        const oscR = ctx.createOscillator();
        const gain = ctx.createGain();

        oscL.type = 'sine';
        oscL.frequency.value = 200;

        oscR.type = 'sine';
        oscR.frequency.value = 210; // 10Hz Alpha beat

        gain.gain.value = state.masterVolume * 0.2;

        oscL.connect(merger, 0, 0);
        oscR.connect(merger, 0, 1);
        merger.connect(gain);
        gain.connect(ctx.destination);

        oscL.start();
        oscR.start();

        return {
            stop: () => {
                oscL.stop(); oscR.stop();
                oscL.disconnect(); oscR.disconnect();
            },
            gainNode: gain
        };
    }

    function createForestSound(ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.value = 150;

        filter.type = 'bandpass';
        filter.frequency.value = 600;
        filter.Q.value = 3;

        gain.gain.value = state.masterVolume * 0.15;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        return {
            stop: () => { osc.stop(); osc.disconnect(); },
            gainNode: gain
        };
    }

    function updateMasterVolume() {
        Object.keys(soundNodes).forEach(key => {
            const node = soundNodes[key];
            if (node && node.gainNode) {
                node.gainNode.gain.value = state.masterVolume * 0.3;
            }
        });
    }

    function toggleMasterSoundQuick() {
        const anyActive = Object.values(state.soundStates).some(v => v);
        soundCheckboxes.forEach(cb => {
            cb.checked = !anyActive;
            state.soundStates[cb.dataset.sound] = !anyActive;
            handleSoundPlayback(cb.dataset.sound, !anyActive);
        });
    }

    // Analytics & Stats Management
    function saveStats() {
        localStorage.setItem('aurapulse_stats', JSON.stringify(state.stats));
    }

    function updateStatsDisplay() {
        streakCount.textContent = state.streak;
        statFocusCount.textContent = state.stats.focusCount;
        statBreakCount.textContent = state.stats.breakCount;
        statMinutes.textContent = `${state.stats.totalMinutes}m`;
    }

    function renderFlowChart() {
        flowChart.innerHTML = '';
        const maxVal = Math.max(...state.stats.weekly, 1);
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        state.stats.weekly.forEach((val, idx) => {
            const heightPct = (val / maxVal) * 100;
            const wrap = document.createElement('div');
            wrap.className = 'chart-bar-wrap';
            wrap.innerHTML = `
                <div class="chart-bar" style="height: ${Math.max(heightPct, 10)}%" title="${val} sessions"></div>
                <span class="chart-label">${days[idx]}</span>
            `;
            flowChart.appendChild(wrap);
        });
    }

    function clearStats() {
        if (confirm("Reset today's flow statistics and logs?")) {
            state.stats = { focusCount: 0, breakCount: 0, totalMinutes: 0, weekly: [0, 0, 0, 0, 0, 0, 0] };
            saveStats();
            updateStatsDisplay();
            renderFlowChart();
        }
    }

    // Settings Management
    function loadSettingsToForm() {
        settingFocusDuration.value = state.settings.focusDuration;
        settingMicroDuration.value = state.settings.microDuration;
        settingEyeDuration.value = state.settings.eyeDuration;
        settingSoundCue.checked = state.settings.soundCue;
    }

    function saveSettings(e) {
        e.preventDefault();
        state.settings.focusDuration = parseInt(settingFocusDuration.value) || 25;
        state.settings.microDuration = parseInt(settingMicroDuration.value) || 5;
        state.settings.eyeDuration = parseInt(settingEyeDuration.value) || 20;
        state.settings.soundCue = settingSoundCue.checked;

        localStorage.setItem('aurapulse_settings', JSON.stringify(state.settings));
        setSessionType('focus');
        alert('Preferences successfully saved!');
    }

    // Initialize execution
    init();
});
