document.addEventListener('DOMContentLoaded', () => {
    // State
    const state = {
        unitSystem: 'metric', // 'metric' or 'imperial'
        speed: 12.0,          // km/h (or mph if imperial converted internally)
        cadence: 180,         // steps per min
        height: 178,          // cm (or inches)
        weight: 72,           // kg (or lbs)
        splitDistance: 5,     // km target
        soundType: 'woodblock',
        metronomeActive: false
    };

    // Audio Context & Metronome timer ID
    let audioCtx = null;
    let metronomeTimer = null;
    let currentBeat = 1;
    let nextNoteTime = 0.0;
    const scheduleAheadTime = 0.1;
    const lookahead = 25.0;

    // DOM Elements
    const segBtns = document.querySelectorAll('.seg-btn');
    const speedRange = document.getElementById('speed-range');
    const speedInput = document.getElementById('speed-input');
    const cadenceRange = document.getElementById('cadence-range');
    const cadenceInput = document.getElementById('cadence-input');
    const heightInput = document.getElementById('height-input');
    const weightInput = document.getElementById('weight-input');
    const labelSpeed = document.getElementById('label-speed');
    const labelHeight = document.getElementById('label-height');
    const labelWeight = document.getElementById('label-weight');
    
    const tempoBadge = document.getElementById('tempo-badge');
    const beatCounter = document.getElementById('beat-counter');
    const pulseCore = document.getElementById('pulse-core');
    const pulseRing = document.getElementById('pulse-ring');
    const btnMetronomeToggle = document.getElementById('btn-metronome-toggle');
    const soundTypeSelect = document.getElementById('sound-type');

    const resStrideLength = document.getElementById('res-stride-length');
    const resStrideLengthSub = document.getElementById('res-stride-length-sub');
    const resGct = document.getElementById('res-gct');
    const resOscillation = document.getElementById('res-oscillation');
    const resCalorie = document.getElementById('res-calorie');

    const splitDistanceType = document.getElementById('split-distance-type');
    const resPaceKm = document.getElementById('res-pace-km');
    const resPaceMile = document.getElementById('res-pace-mile');
    const resTotalTime = document.getElementById('res-total-time');
    const splitTbody = document.getElementById('split-tbody');

    const btnPresets = document.getElementById('btn-presets');
    const btnReset = document.getElementById('btn-reset');
    const btnSaveSession = document.getElementById('btn-save-session');
    const btnClearLogs = document.getElementById('btn-clear-logs');
    const logContainer = document.getElementById('log-container');
    const analysisCanvas = document.getElementById('analysisCanvas');

    // Event Listeners for Unit Toggles
    segBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            segBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const targetUnit = e.target.getAttribute('data-unit');
            if (targetUnit !== state.unitSystem) {
                convertUnits(targetUnit);
            }
        });
    });

    function convertUnits(newUnit) {
        if (newUnit === 'imperial') {
            // Convert metric to imperial
            state.speed = Number((state.speed * 0.621371).toFixed(1)); // km/h to mph
            state.height = Math.round(state.height / 2.54);             // cm to inches
            state.weight = Math.round(state.weight * 2.20462);           // kg to lbs

            speedRange.min = 3;
            speedRange.max = 16;
            speedRange.step = 0.5;
            speedInput.min = 2;
            speedInput.max = 25;
            speedInput.step = 0.5;

            labelSpeed.textContent = 'Running Speed (mph)';
            labelHeight.textContent = 'Runner Height (in)';
            labelWeight.textContent = 'Runner Weight (lbs)';
        } else {
            // Convert imperial to metric
            state.speed = Number((state.speed / 0.621371).toFixed(1)); // mph to km/h
            state.height = Math.round(state.height * 2.54);             // inches to cm
            state.weight = Math.round(state.weight / 2.20462);           // lbs to kg

            speedRange.min = 6;
            speedRange.max = 25;
            speedRange.step = 0.1;
            speedInput.min = 1;
            speedInput.max = 40;
            speedInput.step = 0.1;

            labelSpeed.textContent = 'Running Speed (km/h)';
            labelHeight.textContent = 'Runner Height (cm)';
            labelWeight.textContent = 'Runner Weight (kg)';
        }
        state.unitSystem = newUnit;
        syncInputsToState();
        calculateBiomechanics();
    }

    function syncInputsToState() {
        speedRange.value = state.speed;
        speedInput.value = state.speed;
        cadenceRange.value = state.cadence;
        cadenceInput.value = state.cadence;
        heightInput.value = state.height;
        weightInput.value = state.weight;
    }

    // Input bindings
    speedRange.addEventListener('input', (e) => {
        state.speed = parseFloat(e.target.value);
        speedInput.value = state.speed;
        calculateBiomechanics();
    });
    speedInput.addEventListener('input', (e) => {
        let val = parseFloat(e.target.value) || 0;
        state.speed = val;
        speedRange.value = val;
        calculateBiomechanics();
    });

    cadenceRange.addEventListener('input', (e) => {
        state.cadence = parseInt(e.target.value);
        cadenceInput.value = state.cadence;
        tempoBadge.textContent = state.cadence + ' BPM';
        calculateBiomechanics();
    });
    cadenceInput.addEventListener('input', (e) => {
        let val = parseInt(e.target.value) || 180;
        state.cadence = val;
        cadenceRange.value = val;
        tempoBadge.textContent = val + ' BPM';
        calculateBiomechanics();
    });

    heightInput.addEventListener('input', (e) => {
        state.height = parseFloat(e.target.value) || 170;
        calculateBiomechanics();
    });

    weightInput.addEventListener('input', (e) => {
        state.weight = parseFloat(e.target.value) || 70;
        calculateBiomechanics();
    });

    soundTypeSelect.addEventListener('change', (e) => {
        state.soundType = e.target.value;
    });

    splitDistanceType.addEventListener('change', () => {
        state.splitDistance = parseFloat(splitDistanceType.value);
        calculateBiomechanics();
    });

    btnPresets.addEventListener('click', () => {
        if (state.unitSystem === 'metric') {
            state.speed = 13.5;
            state.cadence = 184;
            state.height = 182;
            state.weight = 75;
        } else {
            state.speed = 8.4;
            state.cadence = 184;
            state.height = 72;
            state.weight = 165;
        }
        syncInputsToState();
        tempoBadge.textContent = state.cadence + ' BPM';
        calculateBiomechanics();
    });

    btnReset.addEventListener('click', () => {
        if (state.unitSystem === 'metric') {
            state.speed = 12.0;
            state.cadence = 180;
            state.height = 178;
            state.weight = 72;
        } else {
            state.speed = 7.5;
            state.cadence = 180;
            state.height = 70;
            state.weight = 160;
        }
        syncInputsToState();
        tempoBadge.textContent = state.cadence + ' BPM';
        calculateBiomechanics();
    });

    // Core Biomechanics Calculations
    function calculateBiomechanics() {
        // Normalize speed to km/h for calculations
        let speedKmh = state.unitSystem === 'imperial' ? state.speed * 1.60934 : state.speed;
        let speedMps = (speedKmh * 1000) / 3600; // meters per second

        // Stride Length calculation: Distance = Speed / (Cadence / 60)
        // Stride length in meters
        let strideLengthMeters = speedMps / (state.cadence / 60);

        // Format Stride length for display
        if (state.unitSystem === 'imperial') {
            let strideInches = strideLengthMeters * 39.3701;
            let strideFeet = Math.floor(strideInches / 12);
            let remInches = (strideInches % 12).toFixed(1);
            resStrideLength.textContent = `${strideFeet}' ${remInches}"`;
            resStrideLengthSub.textContent = `(${strideLengthMeters.toFixed(2)} meters per cycle)`;
        } else {
            let strideCm = strideLengthMeters * 100;
            resStrideLength.textContent = `${strideCm.toFixed(1)} cm`;
            resStrideLengthSub.textContent = `(${strideLengthMeters.toFixed(2)} meters per cycle)`;
        }

        // Ground Contact Time (GCT) estimation in ms
        // Higher cadence and higher speed decrease GCT. Typical range 160ms - 300ms
        let baseGct = 280 - (state.cadence - 150) * 1.2 - (speedKmh - 10) * 2;
        let gct = Math.max(140, Math.min(340, Math.round(baseGct)));
        resGct.textContent = `${gct} ms`;

        // Vertical Oscillation estimation in cm
        // Height factor & cadence factor
        let heightCm = state.unitSystem === 'imperial' ? state.height * 2.54 : state.height;
        let baseOscillation = (heightCm * 0.05) - ((state.cadence - 160) * 0.05) + ((speedKmh - 10) * 0.1);
        let oscillation = Math.max(5.0, Math.min(14.0, baseOscillation));
        if (state.unitSystem === 'imperial') {
            let oscInches = (oscillation / 2.54).toFixed(1);
            resOscillation.textContent = `${oscInches} in (${oscillation.toFixed(1)} cm)`;
        } else {
            resOscillation.textContent = `${oscillation.toFixed(1)} cm`;
        }

        // Calories burned in 30 mins: Approx formula based on weight (kg) and speed
        let weightKg = state.unitSystem === 'imperial' ? state.weight * 0.453592 : state.weight;
        // Running calorie burn ~ 1.03 kcal per kg per km
        let calories30 = (1.03 * weightKg * (speedKmh * 0.5));
        resCalorie.textContent = `${Math.round(calories30)} kcal`;

        // Pace calculations
        // Pace min/km = 60 / speedKmh
        let minPerKm = 60 / speedKmh;
        let kmMinPart = Math.floor(minPerKm);
        let kmSecPart = Math.round((minPerKm - kmMinPart) * 60);
        resPaceKm.textContent = `${kmMinPart}:${kmSecPart < 10 ? '0' : ''}${kmSecPart} /km`;

        // Pace min/mile = 60 / speedMph
        let speedMph = state.unitSystem === 'imperial' ? state.speed : speedKmh * 0.621371;
        let minPerMile = 60 / speedMph;
        let mileMinPart = Math.floor(minPerMile);
        let mileSecPart = Math.round((minPerMile - mileMinPart) * 60);
        resPaceMile.textContent = `${mileMinPart}:${mileSecPart < 10 ? '0' : ''}${mileSecPart} /mi`;

        // Total Time for Split Distance
        let totalMinutes = minPerKm * state.splitDistance;
        let totalHours = Math.floor(totalMinutes / 60);
        let totalRemMin = Math.floor(totalMinutes % 60);
        let totalSec = Math.round((totalMinutes - Math.floor(totalMinutes)) * 60);
        
        let timeStr = totalHours > 0 
            ? `${totalHours}:${totalRemMin < 10 ? '0' : ''}${totalRemMin}:${totalSec < 10 ? '0' : ''}${totalSec}`
            : `${totalRemMin}:${totalSec < 10 ? '0' : ''}${totalSec}`;
        resTotalTime.textContent = timeStr;

        // Generate Split Table Rows
        generateSplitTable(minPerKm, state.splitDistance);

        // Draw Canvas graph
        drawAnalysisChart(speedKmh, state.cadence);
    }

    function generateSplitTable(minPerKm, targetDist) {
        splitTbody.innerHTML = '';
        let steps = targetDist >= 21 ? 10 : Math.ceil(targetDist);
        if (steps < 1) steps = 1;
        let stepSize = targetDist / steps;
        
        let cumulativeMin = 0;
        for (let i = 1; i <= steps; i++) {
            let currentDist = i * stepSize;
            let splitTimeMin = minPerKm * stepSize;
            cumulativeMin += splitTimeMin;

            let sMin = Math.floor(splitTimeMin);
            let sSec = Math.round((splitTimeMin - sMin) * 60);

            let cMin = Math.floor(cumulativeMin);
            let cSec = Math.round((cumulativeMin - cMin) * 60);

            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${i}</td>
                <td>${currentDist.toFixed(2)} ${state.unitSystem === 'imperial' ? 'mi' : 'km'}</td>
                <td>${sMin}:${sSec < 10 ? '0' : ''}${sSec}</td>
                <td>${cMin}:${cSec < 10 ? '0' : ''}${cSec}</td>
                <td>${state.cadence} SPM</td>
            `;
            splitTbody.appendChild(tr);
        }
    }

    // Canvas Visualizer Chart
    function drawAnalysisChart(currentSpeed, currentCadence) {
        if (!analysisCanvas) return;
        const ctx = analysisCanvas.getContext('2d');
        const w = analysisCanvas.width;
        const h = analysisCanvas.height;

        ctx.clearRect(0, 0, w, h);

        // Draw Grid & Background
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let x = 50; x < w; x += 60) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h - 30);
            ctx.stroke();
        }
        for (let y = 30; y < h - 30; y += 50) {
            ctx.beginPath();
            ctx.moveTo(40, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Axes
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(40, h - 30);
        ctx.lineTo(w - 20, h - 30);
        ctx.moveTo(40, 20);
        ctx.lineTo(40, h - 30);
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px system-ui';
        ctx.fillText('Cadence (140 - 220 SPM)', w / 2 - 60, h - 8);
        ctx.save();
        ctx.translate(15, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Stride Length (m)', -40, 0);
        ctx.restore();

        // Plot Curve of Cadence vs Stride Length for current speed
        let speedMps = (currentSpeed * 1000) / 3600;
        
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();

        let minCadence = 140;
        let maxCadence = 220;
        
        for (let cad = minCadence; cad <= maxCadence; cad += 2) {
            let sl = speedMps / (cad / 60);
            // Map cad to X: 40 to w-20
            let x = 40 + ((cad - minCadence) / (maxCadence - minCadence)) * (w - 60);
            // Map sl (0.5m to 2.5m) to Y: h-30 to 30
            let y = (h - 30) - ((sl - 0.5) / 2.0) * (h - 60);

            if (cad === minCadence) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Highlight current point
        let curSl = speedMps / (currentCadence / 60);
        let curX = 40 + ((currentCadence - minCadence) / (maxCadence - minCadence)) * (w - 60);
        let curY = (h - 30) - ((curSl - 0.5) / 2.0) * (h - 60);

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(curX, curY, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Optimal cadence zone marker (170 - 190 SPM)
        ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
        let optStartX = 40 + ((170 - minCadence) / (maxCadence - minCadence)) * (w - 60);
        let optWidth = ((20) / (maxCadence - minCadence)) * (w - 60);
        ctx.fillRect(optStartX, 20, optWidth, h - 50);
        
        ctx.fillStyle = '#10b981';
        ctx.font = '10px system-ui';
        ctx.fillText('Optimal Zone', optStartX + 5, 35);
    }

    // Web Audio Metronome Engine
    function initAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playBeatSound(time, isAccent) {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        if (state.soundType === 'woodblock') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(isAccent ? 1000 : 800, time);
            gain.gain.setValueAtTime(0.5, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
            osc.start(time);
            osc.stop(time + 0.05);
        } else if (state.soundType === 'beep') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(isAccent ? 880 : 440, time);
            gain.gain.setValueAtTime(0.3, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
            osc.start(time);
            osc.stop(time + 0.08);
        } else {
            // subtle click
            osc.type = 'square';
            osc.frequency.setValueAtTime(isAccent ? 1200 : 900, time);
            gain.gain.setValueAtTime(0.2, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);
            osc.start(time);
            osc.stop(time + 0.02);
        }
    }

    function metronomeScheduler() {
        while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
            let secondsPerBeat = 60.0 / state.cadence;
            let isAccent = (currentBeat === 1);
            playBeatSound(nextNoteTime, isAccent);

            // Visual trigger scheduled accurately
            let drawTime = (nextNoteTime - audioCtx.currentTime) * 1000;
            setTimeout(() => {
                if (state.metronomeActive) {
                    triggerVisualBeat(currentBeat);
                }
            }, Math.max(0, drawTime));

            nextNoteTime += secondsPerBeat;
            currentBeat = currentBeat >= 4 ? 1 : currentBeat + 1;
        }
    }

    function triggerVisualBeat(beatNum) {
        beatCounter.textContent = beatNum;
        pulseCore.classList.add('beat');
        pulseRing.classList.remove('animate');
        void pulseRing.offsetWidth; // trigger reflow
        pulseRing.classList.add('animate');

        setTimeout(() => {
            pulseCore.classList.remove('beat');
        }, 90);
    }

    btnMetronomeToggle.addEventListener('click', () => {
        initAudioContext();
        state.metronomeActive = !state.metronomeActive;

        if (state.metronomeActive) {
            btnMetronomeToggle.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg><span>Stop Metronome</span>`;
            btnMetronomeToggle.classList.add('btn-danger');
            currentBeat = 1;
            nextNoteTime = audioCtx.currentTime + 0.05;
            metronomeTimer = setInterval(metronomeScheduler, lookahead);
        } else {
            stopMetronome();
        }
    });

    function stopMetronome() {
        state.metronomeActive = false;
        clearInterval(metronomeTimer);
        btnMetronomeToggle.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg><span>Start Metronome</span>`;
        btnMetronomeToggle.classList.remove('btn-danger');
        beatCounter.textContent = '1';
    }

    // Session Logging LocalStorage
    let savedLogs = JSON.parse(localStorage.getItem('aurastride_logs') || '[]');

    btnSaveSession.addEventListener('click', () => {
        let speedText = `${state.speed} ${state.unitSystem === 'imperial' ? 'mph' : 'km/h'}`;
        let newLog = {
            id: Date.now(),
            date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            speed: speedText,
            cadence: state.cadence,
            distance: state.splitDistance + (state.unitSystem === 'imperial' ? ' mi' : ' km'),
            time: resTotalTime.textContent,
            stride: resStrideLength.textContent
        };

        savedLogs.unshift(newLog);
        if (savedLogs.max > 20) savedLogs.pop();
        localStorage.setItem('aurastride_logs', JSON.stringify(savedLogs));
        renderLogs();
    });

    btnClearLogs.addEventListener('click', () => {
        savedLogs = [];
        localStorage.removeItem('aurastride_logs');
        renderLogs();
    });

    function renderLogs() {
        if (savedLogs.length === 0) {
            logContainer.innerHTML = `<p class="empty-msg">No saved training sessions yet. Configure your metrics and click "Save Session Log".</p>`;
            return;
        }

        let html = '<div class="log-list">';
        savedLogs.forEach(log => {
            html += `
                <div class="log-card">
                    <div class="log-info">
                        <span class="log-title">Session @ ${log.speed} &bull; ${log.cadence} SPM</span>
                        <span class="log-meta">Goal: ${log.distance} &bull; Est Time: ${log.time} &bull; Stride: ${log.stride} &bull; Saved: ${log.date}</span>
                    </div>
                    <button class="btn btn-secondary btn-sm" onclick="window.loadLogPreset(${log.id})">Load Profile</button>
                </div>
            `;
        });
        html += '</div>';
        logContainer.innerHTML = html;
    }

    window.loadLogPreset = function(id) {
        let log = savedLogs.find(l => l.id === id);
        if (!log) return;
        // parse speed
        let spdVal = parseFloat(log.speed);
        state.speed = spdVal;
        state.cadence = log.cadence;
        syncInputsToState();
        tempoBadge.textContent = state.cadence + ' BPM';
        calculateBiomechanics();
    };

    // Initial compute on load
    calculateBiomechanics();
    renderLogs();
});
