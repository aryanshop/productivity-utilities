document.addEventListener('DOMContentLoaded', () => {
    // Tab Switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const activeContent = document.getElementById(`${targetTab}-tab`);
            if (activeContent) {
                activeContent.classList.add('active');
                if (targetTab === 'timer') {
                    syncTimerInputFromReciprocity();
                }
            }
        });
    });

    // Elements for Reciprocity & Exposure
    const filmStockSelect = document.getElementById('film-stock');
    const meteredTimeVal = document.getElementById('metered-time-val');
    const meteredTimeUnit = document.getElementById('metered-time-unit');
    const filterCheckboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]');
    
    const outMetered = document.getElementById('out-metered');
    const outFilter = document.getElementById('out-filter');
    const outCorrected = document.getElementById('out-corrected');
    const btnSendTimer = document.getElementById('btn-send-timer');

    // Canvas
    const canvas = document.getElementById('exposure-canvas');
    const ctx = canvas.getContext('2d');

    function calculateExposure() {
        const p = parseFloat(filmStockSelect.value);
        let baseTimeSeconds = parseFloat(meteredTimeVal.value) * parseFloat(meteredTimeUnit.value);
        if (isNaN(baseTimeSeconds) || baseTimeSeconds <= 0) baseTimeSeconds = 1;

        // Calculate filter stops
        let totalStops = 0;
        filterCheckboxes.forEach(chk => {
            if (chk.checked) {
                totalStops += parseFloat(chk.dataset.stops);
            }
        });

        // Adjust metered time for filters first (2^stops)
        const timeAfterFilters = baseTimeSeconds * Math.pow(2, totalStops);

        // Schwarzschild Reciprocity Failure Formula: T_corr = T^p
        // Note: Reciprocity failure typically kicks in noticeably above 1 second.
        let correctedTime = timeAfterFilters;
        if (timeAfterFilters > 1) {
            correctedTime = Math.pow(timeAfterFilters, p);
        }

        // Format outputs
        outMetered.textContent = formatTimeDisplay(baseTimeSeconds);
        outFilter.textContent = `${totalStops} Stops (${Math.pow(2, totalStops).toFixed(1)}x)`;
        outCorrected.textContent = formatTimeDisplay(correctedTime);

        drawReciprocityGraph(p, timeAfterFilters, correctedTime);

        return correctedTime;
    }

    function formatTimeDisplay(sec) {
        if (sec < 60) {
            return `${sec.toFixed(1)} s`;
        } else if (sec < 3600) {
            const mins = Math.floor(sec / 60);
            const s = (sec % 60).toFixed(0);
            return `${mins}m ${s}s`;
        } else {
            const hrs = (sec / 3600).toFixed(1);
            return `${hrs} hrs`;
        }
    }

    // Canvas Graph Renderer
    function drawReciprocityGraph(pVal, currentT, currentCorrected) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const w = canvas.width;
        const h = canvas.height;
        const padding = 30;
        
        // Draw axes
        ctx.strokeStyle = '#30363d';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, h - padding);
        ctx.lineTo(w - padding, h - padding);
        ctx.moveTo(padding, h - padding);
        ctx.lineTo(padding, padding);
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#8b949e';
        ctx.font = '10px sans-serif';
        ctx.fillText('Metered Time', w / 2 - 35, h - 8);
        
        ctx.save();
        ctx.translate(12, h / 2 + 20);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Corrected Time', 0, 0);
        ctx.restore();

        // Plot Reciprocity curve (log scale representation roughly)
        ctx.strokeStyle = '#f0883e';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const maxLogT = Math.log10(120); // up to 120 seconds
        for (let px = 0; px <= w - 2 * padding; px += 2) {
            const logT = (px / (w - 2 * padding)) * maxLogT;
            const t = Math.pow(10, logT);
            
            let corr = t > 1 ? Math.pow(t, pVal) : t;
            const maxLogCorr = Math.log10(Math.pow(120, pVal));
            
            const py = (Math.log10(corr) / maxLogCorr) * (h - 2 * padding);
            
            const canvasX = padding + px;
            const canvasY = h - padding - py;

            if (px === 0) {
                ctx.moveTo(canvasX, canvasY);
            } else {
                ctx.lineTo(canvasX, canvasY);
            }
        }
        ctx.stroke();

        // Draw current point marker
        if (currentT <= 120 && currentT > 0) {
            const logT = Math.log10(currentT);
            const px = (logT / maxLogT) * (w - 2 * padding);
            const maxLogCorr = Math.log10(Math.pow(120, pVal));
            const py = (Math.log10(currentCorrected) / maxLogCorr) * (h - 2 * padding);
            
            const cx = padding + px;
            const cy = h - padding - py;

            ctx.fillStyle = '#58a6ff';
            ctx.beginPath();
            ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    // Event Listeners for Reciprocity inputs
    filmStockSelect.addEventListener('change', calculateExposure);
    meteredTimeVal.addEventListener('input', calculateExposure);
    meteredTimeUnit.addEventListener('change', calculateExposure);
    filterCheckboxes.forEach(chk => chk.addEventListener('change', calculateExposure));

    // Send to timer button
    function syncTimerInputFromReciprocity() {
        const p = parseFloat(filmStockSelect.value);
        let baseTimeSeconds = parseFloat(meteredTimeVal.value) * parseFloat(meteredTimeUnit.value);
        if (isNaN(baseTimeSeconds) || baseTimeSeconds <= 0) baseTimeSeconds = 1;
        
        let totalStops = 0;
        filterCheckboxes.forEach(chk => {
            if (chk.checked) totalStops += parseFloat(chk.dataset.stops);
        });
        const timeAfterFilters = baseTimeSeconds * Math.pow(2, totalStops);
        const correctedTime = timeAfterFilters > 1 ? Math.pow(timeAfterFilters, p) : timeAfterFilters;
        
        const timerInput = document.getElementById('timer-duration');
        if (timerInput) {
            timerInput.value = correctedTime.toFixed(1);
            resetTimerState();
        }
    }

    btnSendTimer.addEventListener('click', () => {
        // Switch to timer tab
        tabButtons.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        const timerBtn = document.querySelector('[data-tab="timer"]');
        const timerTab = document.getElementById('timer-tab');
        if (timerBtn && timerTab) {
            timerBtn.classList.add('active');
            timerTab.classList.add('active');
            syncTimerInputFromReciprocity();
        }
    });

    // Darkroom Timer Logic
    let timerInterval = null;
    let timeLeft = 0;
    let totalDuration = 0;
    let isRunning = false;

    const timerDurationInput = document.getElementById('timer-duration');
    const timerCountdown = document.getElementById('timer-countdown');
    const timerProgress = document.getElementById('timer-progress');
    const timerStartBtn = document.getElementById('timer-start');
    const timerPauseBtn = document.getElementById('timer-pause');
    const timerResetBtn = document.getElementById('timer-reset');

    function resetTimerState() {
        if (timerInterval) clearInterval(timerInterval);
        isRunning = false;
        totalDuration = parseFloat(timerDurationInput.value) || 10;
        timeLeft = totalDuration;
        updateTimerDisplay();
        timerStartBtn.textContent = 'Start Timer';
        timerStartBtn.disabled = false;
        timerPauseBtn.disabled = true;
    }

    function updateTimerDisplay() {
        const mins = Math.floor(timeLeft / 60);
        const secs = (timeLeft % 60).toFixed(1);
        const paddedSecs = secs < 10 ? '0' + secs : secs;
        const paddedMins = mins < 10 ? '0' + mins : mins;
        
        timerCountdown.textContent = `${paddedMins}:${paddedSecs}`;
        
        const percent = Math.max(0, Math.min(100, ((totalDuration - timeLeft) / totalDuration) * 100));
        timerProgress.style.width = `${percent}%`;
    }

    // Web Audio API Beep Generator
    function playBeep(freq = 440, duration = 0.15) {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctxAudio = new AudioContext();
            const osc = ctxAudio.createOscillator();
            const gain = ctxAudio.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            gain.gain.setValueAtTime(0.1, ctxAudio.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctxAudio.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(ctxAudio.destination);
            
            osc.start();
            osc.stop(ctxAudio.currentTime + duration);
        } catch(e) {
            // Audio blocked or unsupported
        }
    }

    timerStartBtn.addEventListener('click', () => {
        if (!isRunning) {
            if (timeLeft <= 0) {
                totalDuration = parseFloat(timerDurationInput.value) || 10;
                timeLeft = totalDuration;
            }
            isRunning = true;
            timerStartBtn.textContent = 'Running...';
            timerStartBtn.disabled = true;
            timerPauseBtn.disabled = false;
            
            playBeep(587.33, 0.1); // Start chime (D5)

            const startTime = Date.now();
            const initialTimeLeft = timeLeft;

            timerInterval = setInterval(() => {
                const elapsed = (Date.now() - startTime) / 1000;
                timeLeft = Math.max(0, initialTimeLeft - elapsed);
                updateTimerDisplay();

                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    isRunning = false;
                    timerStartBtn.textContent = 'Start Timer';
                    timerStartBtn.disabled = false;
                    timerPauseBtn.disabled = true;
                    playBeep(880, 0.4); // Completion beep (A5)
                }
            }, 50);
        }
    });

    timerPauseBtn.addEventListener('click', () => {
        if (isRunning) {
            clearInterval(timerInterval);
            isRunning = false;
            timerStartBtn.textContent = 'Resume';
            timerStartBtn.disabled = false;
            timerPauseBtn.disabled = true;
            playBeep(440, 0.1);
        }
    });

    timerResetBtn.addEventListener('click', () => {
        resetTimerState();
        playBeep(330, 0.1);
    });

    timerDurationInput.addEventListener('change', () => {
        if (!isRunning) {
            resetTimerState();
        }
    });

    // Chemistry Dilution Calculator Logic
    const devRatioSelect = document.getElementById('dev-ratio');
    const tankVolumeInput = document.getElementById('tank-volume');
    const resConcentrate = document.getElementById('res-concentrate');
    const resWater = document.getElementById('res-water');

    function calculateDilution() {
        const ratioStr = devRatioSelect.value;
        const parts = ratioStr.split(':');
        const concPart = parseFloat(parts[0]);
        const waterPart = parseFloat(parts[1]);
        const totalParts = concPart + waterPart;

        const totalVol = parseFloat(tankVolumeInput.value) || 500;

        const concentrateVol = (totalVol / totalParts) * concPart;
        const waterVol = totalVol - concentrateVol;

        resConcentrate.textContent = `${concentrateVol.toFixed(1)} ml`;
        resWater.textContent = `${waterVol.toFixed(1)} ml`;
    }

    devRatioSelect.addEventListener('change', calculateDilution);
    tankVolumeInput.addEventListener('input', calculateDilution);

    // Initialize on load
    calculateExposure();
    resetTimerState();
    calculateDilution();
});
