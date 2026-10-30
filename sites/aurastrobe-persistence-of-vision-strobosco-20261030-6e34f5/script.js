document.addEventListener('DOMContentLoaded', () => {
    // State Management
    const state = {
        mode: 'strobe',
        targetRpm: 1200,
        flashHz: 20,
        dutyCycle: 10,
        harmonics: 5,
        audioSync: false,
        povChars: 'AURA STROBE',
        sweepRpm: 900,
        ledCount: 15,
        refreshHz: 400,
        isPaused: false,
        time: 0
    };

    // DOM Elements
    const tabs = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.mode-panel');
    const canvas = document.getElementById('lab-canvas');
    const ctx = canvas.getContext('2d');

    const inputTargetRpm = document.getElementById('target-rpm');
    const valTargetRpm = document.getElementById('val-target-rpm');
    const inputFlashHz = document.getElementById('flash-hz');
    const valFlashHz = document.getElementById('val-flash-hz');
    const inputDutyCycle = document.getElementById('duty-cycle');
    const valDutyCycle = document.getElementById('val-duty-cycle');
    const selectHarmonics = document.getElementById('harmonics-count');
    const btnSyncStrobe = document.getElementById('btn-sync-strobe');
    const btnStrobeAudio = document.getElementById('btn-strobe-audio');

    const inputPovChars = document.getElementById('pov-chars');
    const inputSweepRpm = document.getElementById('sweep-rpm');
    const valSweepRpm = document.getElementById('val-sweep-rpm');
    const inputLedCount = document.getElementById('led-count');
    const valLedCount = document.getElementById('val-led-count');
    const inputRefreshHz = document.getElementById('refresh-hz');
    const valRefreshHz = document.getElementById('val-refresh-hz');

    const btnPause = document.getElementById('btn-pause');
    const btnReset = document.getElementById('btn-reset');
    const btnExport = document.getElementById('btn-export');
    const simStatusDot = document.getElementById('sim-status-dot');
    const simStatusText = document.getElementById('sim-status-text');

    const statRatio = document.getElementById('stat-ratio');
    const statRatioDesc = document.getElementById('stat-ratio-desc');
    const statMotion = document.getElementById('stat-motion');
    const statHarmonics = document.getElementById('stat-harmonics');
    const statPovRes = document.getElementById('stat-pov-res');

    // Web Audio API Context
    let audioCtx = null;
    let oscNode = null;
    let gainNode = null;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function toggleAudio(enable) {
        initAudio();
        if (enable) {
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            oscNode = audioCtx.createOscillator();
            gainNode = audioCtx.createGain();
            oscNode.type = 'sine';
            oscNode.frequency.setValueAtTime(state.flashHz, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
            oscNode.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscNode.start();
        } else {
            if (oscNode) {
                oscNode.stop();
                oscNode.disconnect();
                oscNode = null;
            }
        }
    }

    // Resize Canvas
    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Tab Switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            panels.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            state.mode = tab.dataset.mode;

            document.getElementById(`panel-${state.mode}`).classList.add('active');
            if (state.mode === 'pov' && state.audioSync) {
                state.audioSync = false;
                toggleAudio(false);
                btnStrobeAudio.classList.remove('primary');
            }
        });
    });

    // Input Event Listeners
    inputTargetRpm.addEventListener('input', (e) => {
        state.targetRpm = parseFloat(e.target.value);
        valTargetRpm.textContent = `${state.targetRpm} RPM`;
    });

    inputFlashHz.addEventListener('input', (e) => {
        state.flashHz = parseFloat(e.target.value);
        valFlashHz.textContent = `${state.flashHz.toFixed(1)} Hz`;
        if (state.audioSync && oscNode) {
            oscNode.frequency.setValueAtTime(state.flashHz, audioCtx.currentTime);
        }
    });

    inputDutyCycle.addEventListener('input', (e) => {
        state.dutyCycle = parseInt(e.target.value);
        valDutyCycle.textContent = `${state.dutyCycle}%`;
    });

    selectHarmonics.addEventListener('change', (e) => {
        state.harmonics = parseInt(e.target.value);
    });

    btnSyncStrobe.addEventListener('click', () => {
        const rps = state.targetRpm / 60;
        state.flashHz = Math.round(rps * 10) / 10;
        inputFlashHz.value = state.flashHz;
        valFlashHz.textContent = `${state.flashHz.toFixed(1)} Hz`;
    });

    btnStrobeAudio.addEventListener('click', () => {
        state.audioSync = !state.audioSync;
        toggleAudio(state.audioSync);
        btnStrobeAudio.classList.toggle('primary', state.audioSync);
    });

    inputPovChars.addEventListener('input', (e) => {
        state.povChars = e.target.value.toUpperCase() || 'AURA';
    });

    inputSweepRpm.addEventListener('input', (e) => {
        state.sweepRpm = parseFloat(e.target.value);
        valSweepRpm.textContent = `${state.sweepRpm} RPM`;
    });

    inputLedCount.addEventListener('input', (e) => {
        state.ledCount = parseInt(e.target.value);
        valLedCount.textContent = `${state.ledCount} Pixels`;
    });

    inputRefreshHz.addEventListener('input', (e) => {
        state.refreshHz = parseFloat(e.target.value);
        valRefreshHz.textContent = `${state.refreshHz} Hz`;
    });

    btnPause.addEventListener('click', () => {
        state.isPaused = !state.isPaused;
        simStatusDot.classList.toggle('paused', state.isPaused);
        simStatusText.textContent = state.isPaused ? 'Simulation Paused' : 'Simulation Running';
    });

    btnReset.addEventListener('click', () => {
        state.targetRpm = 1200;
        state.flashHz = 20;
        state.dutyCycle = 10;
        state.sweepRpm = 900;
        state.povChars = 'AURA STROBE';
        inputTargetRpm.value = state.targetRpm;
        valTargetRpm.textContent = '1200 RPM';
        inputFlashHz.value = state.flashHz;
        valFlashHz.textContent = '20.0 Hz';
        inputDutyCycle.value = state.dutyCycle;
        valDutyCycle.textContent = '10%';
        inputSweepRpm.value = state.sweepRpm;
        valSweepRpm.textContent = '900 RPM';
        inputPovChars.value = state.povChars;
    });

    btnExport.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "aurastrobe_session.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    // Simple Font Matrix lookup for POV text
    const FONT_5X7 = {
        'A': [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
        'B': [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
        'C': [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
        'D': [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
        'E': [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
        'F': [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
        'G': [0x0e, 0x11, 0x10, 0x13, 0x11, 0x11, 0x0e],
        'H': [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
        'I': [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
        'J': [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
        'K': [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
        'L': [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
        'M': [0x11, 0x1b, 0x15, 0x11, 0x11, 0x11, 0x11],
        'N': [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
        'O': [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
        'P': [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
        'Q': [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
        'R': [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
        'S': [0x0e, 0x11, 0x10, 0x0e, 0x01, 0x11, 0x0e],
        'T': [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
        'U': [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
        'V': [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
        'W': [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
        'X': [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
        'Y': [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
        'Z': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
        ' ':[0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
    };

    function getPixel(char, x, y) {
        const colData = FONT_5X7[char] || FONT_5X7[' '];
        if (x < 0 || x >= 5 || y < 0 || y >= 7) return 0;
        return (colData[y] >> (4 - x)) & 1;
    }

    // Main Animation Loop
    let lastTimestamp = performance.now();

    function render(timestamp) {
        const dt = (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;

        if (!state.isPaused) {
            state.time += dt;
        }

        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        ctx.clearRect(0, 0, width, height);

        if (state.mode === 'strobe') {
            renderStrobeMode(width, height);
        } else {
            renderPovMode(width, height);
        }

        requestAnimationFrame(render);
    }

    function renderStrobeMode(w, h) {
        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(cx, cy) * 0.75;

        // Calculations
        const objRps = state.targetRpm / 60;
        const ratio = state.flashHz / objRps;
        const angle = state.time * objRps * Math.PI * 2;

        // Strobe flash gating
        const flashPeriod = 1 / state.flashHz;
        const flashPhase = (state.time % flashPeriod) / flashPeriod;
        const isFlashActive = flashPhase <= (state.dutyCycle / 100);

        // Update telemetry stats
        statRatio.textContent = `${ratio.toFixed(2)} : 1`;
        
        const slip = Math.abs(ratio - Math.round(ratio));
        if (slip < 0.03) {
            statMotion.textContent = 'Stationary (Freeze)';
            statMotion.textContent = 'Zero slip velocity';
            statRatioDesc.textContent = 'Perfect stroboscopic lock';
        } else if (ratio < 1) {
            statMotion.textContent = 'Forward Slow-Motion';
            statRatioDesc.textContent = 'Sub-harmonic rotation view';
        } else {
            statMotion.textContent = 'Aliased Reverse / Fast Spin';
            statRatioDesc.textContent = 'Stroboscopic aliasing active';
        }

        // Harmonics calculation list
        const harmonicsList = [];
        for (let i = 1; i <= state.harmonics; i++) {
            harmonicsList.push((objRps * i).toFixed(1) + ' Hz');
        }
        statHarmonics.textContent = harmonicsList.slice(0, 3).join(', ');

        // Draw Background grid
        ctx.strokeStyle = '#1b2030';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw Rotating Wheel (Fan with 4 blades and index marker)
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        // Draw 4 blades
        for (let i = 0; i < 4; i++) {
            ctx.rotate(Math.PI / 2);
            ctx.fillStyle = i === 0 ? '#3b82f6' : '#1e293b';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radius, -0.4, 0.4);
            ctx.fill();
        }

        // Center hub
        ctx.fillStyle = '#f0f4f8';
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Strobe flash overlay / vignette
        if (!isFlashActive) {
            ctx.fillStyle = 'rgba(9, 10, 15, 0.88)';
            ctx.fillRect(0, 0, w, h);
        } else {
            // Flash halo
            const grad = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 1.2);
            grad.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        }
    }

    function renderPovMode(w, h) {
        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(cx, cy) * 0.75;

        const sweepRps = state.sweepRpm / 60;
        const sweepAngle = state.time * sweepRps * Math.PI * 2;

        const durationMs = (1 / sweepRps) * 1000;
        statPovRes.textContent = `${durationMs.toFixed(1)} ms / 360°`;

        // Draw rotating POV wand disc representation
        ctx.save();
        ctx.translate(cx, cy);

        // Draw persistence trails (circular ghosting effect)
        for (let a = 0; a < Math.PI * 2; a += 0.1) {
            const fadeAlpha = 0.05 * (1 - (a / (Math.PI * 2)));
            ctx.strokeStyle = `rgba(6, 182, 212, ${fadeAlpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.8, sweepAngle - a, sweepAngle - a + 0.05);
            ctx.stroke();
        }

        // Draw active LED Wand Blade
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(sweepAngle) * radius, Math.sin(sweepAngle) * radius);
        ctx.stroke();

        // Render Pixels along the wand according to text string
        const chars = state.povChars;
        const totalCols = chars.length * 6;
        const currentAngleNorm = (sweepAngle % (Math.PI * 2)) / (Math.PI * 2);
        const activeColIndex = Math.floor(currentAngleNorm * totalCols) % totalCols;

        const charIdx = Math.floor(activeColIndex / 6);
        const fontColIdx = activeColIndex % 6;
        const currentChar = chars[charIdx] || ' ';

        const ledR = radius * 0.75;
        const ledInnerR = radius * 0.3;

        for (let i = 0; i < state.ledCount; i++) {
            const dist = ledInnerR + (i / state.ledCount) * (ledR - ledInnerR);
            const fontRow = Math.floor((i / state.ledCount) * 7);
            const isOn = getPixel(currentChar, fontColIdx, fontRow);

            const px = Math.cos(sweepAngle) * dist;
            const py = Math.sin(sweepAngle) * dist;

            ctx.fillStyle = isOn ? '#ffffff' : '#1e293b';
            ctx.beginPath();
            ctx.arc(px, py, isOn ? 3.5 : 1.5, 0, Math.PI * 2);
            ctx.fill();

            if (isOn) {
                ctx.shadowColor = '#06b6d4';
                ctx.shadowBlur = 10;
            } else {
                ctx.shadowBlur = 0;
            }
        }

        // Center hub
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#f0f4f8';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    requestAnimationFrame(render);
});
