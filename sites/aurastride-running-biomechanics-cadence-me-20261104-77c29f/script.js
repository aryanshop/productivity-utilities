document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const heightSlider = document.getElementById('runner-height');
    const heightNum = document.getElementById('runner-height-num');
    const weightSlider = document.getElementById('runner-weight');
    const weightNum = document.getElementById('runner-weight-num');
    const speedKmhInput = document.getElementById('speed-kmh');
    const paceMinInput = document.getElementById('pace-min');
    const paceSecInput = document.getElementById('pace-sec');
    const cadenceSlider = document.getElementById('target-cadence');
    const cadenceNum = document.getElementById('target-cadence-num');
    const unitSystemSelect = document.getElementById('unit-system');
    const unitLabelHeight = document.querySelector('.unit-label-height');
    const unitLabelWeight = document.querySelector('.unit-label-weight');

    // Results Elements
    const resStrideLength = document.getElementById('res-stride-length');
    const resStrideRatio = document.getElementById('res-stride-length-ratio');
    const resGct = document.getElementById('res-gct');
    const resGctQuality = document.getElementById('res-gct-quality');
    const resOscillation = document.getElementById('res-oscillation');
    const resOscillationQuality = document.getElementById('res-oscillation-quality');
    const resCalories = document.getElementById('res-calories');
    const resCaloriesKm = document.getElementById('res-calories-km');

    // Metronome Elements
    const btnStartMetro = document.getElementById('btn-start-metro');
    const btnTapTempo = document.getElementById('btn-tap-tempo');
    const soundTypeSelect = document.getElementById('audio-sound-type');
    const metroStatusBadge = document.getElementById('metro-status-badge');
    const pendulumBob = document.getElementById('pendulum-bob');
    const beatPulseRing = document.getElementById('beat-pulse-ring');

    // Splits & Logs
    const splitsTbody = document.getElementById('splits-tbody');
    const btnLogSession = document.getElementById('btn-log-session');
    const sessionLogContainer = document.getElementById('session-log-container');
    const btnClearLogs = document.getElementById('btn-clear-logs');
    const btnResetDefaults = document.getElementById('reset-defaults');
    const toggleMetroOverlayBtn = document.getElementById('toggle-metronome-overlay');

    // State
    let isMetric = true;
    let isRunning = false;
    let audioCtx = null;
    let timerId = null;
    let beatCount = 0;
    let tapTimes = [];

    // Sync Sliders and Inputs
    function syncInputs(slider, num) {
        slider.addEventListener('input', () => {
            num.value = slider.value;
            calculateAll();
        });
        num.addEventListener('input', () => {
            slider.value = num.value;
            calculateAll();
        });
    }

    syncInputs(heightSlider, heightNum);
    syncInputs(weightSlider, weightNum);
    syncInputs(cadenceSlider, cadenceNum);

    // Unit System Change Handler
    unitSystemSelect.addEventListener('change', () => {
        isMetric = unitSystemSelect.value === 'metric';
        if (isMetric) {
            unitLabelHeight.textContent = 'cm';
            unitLabelWeight.textContent = 'kg';
            heightSlider.min = 140; heightSlider.max = 210; heightSlider.value = 175;
            heightNum.value = 175;
            weightSlider.min = 40; weightSlider.max = 130; weightSlider.value = 70;
            weightNum.value = 70;
            speedKmhInput.value = 12.0;
            updatePaceFromSpeed(12.0);
        } else {
            unitLabelHeight.textContent = 'in';
            unitLabelWeight.textContent = 'lbs';
            heightSlider.min = 55; heightSlider.max = 85; heightSlider.value = 69;
            heightNum.value = 69;
            weightSlider.min = 90; weightSlider.max = 280; weightSlider.value = 154;
            weightNum.value = 154;
            speedKmhInput.value = 7.5; // ~7.5 mph
            updatePaceFromSpeed(7.5 * 1.60934);
        }
        calculateAll();
    });

    // Speed & Pace reciprocal updates
    function updatePaceFromSpeed(speedKmh) {
        if (speedKmh <= 0) return;
        const totalMinPerKm = 60 / speedKmh;
        const mins = Math.floor(totalMinPerKm);
        const secs = Math.round((totalMinPerKm - mins) * 60);
        paceMinInput.value = mins;
        paceSecInput.value = secs < 10 ? '0' + secs : secs;
    }

    function updateSpeedFromPace() {
        const mins = parseFloat(paceMinInput.value) || 0;
        const secs = parseFloat(paceSecInput.value) || 0;
        const totalMinPerKm = mins + (secs / 60);
        if (totalMinPerKm > 0) {
            const speedKmh = 60 / totalMinPerKm;
            speedKmhInput.value = speedKmh.toFixed(1);
            calculateAll();
        }
    }

    speedKmhInput.addEventListener('input', () => {
        const val = parseFloat(speedKmhInput.value);
        if (!isNaN(val) && val > 0) {
            updatePaceFromSpeed(val);
            calculateAll();
        }
    });

    paceMinInput.addEventListener('input', updateSpeedFromPace);
    paceSecInput.addEventListener('input', updateSpeedFromPace);

    // Core Calculations
    function calculateAll() {
        const heightCm = isMetric ? parseFloat(heightNum.value) : parseFloat(heightNum.value) * 2.54;
        const weightKg = isMetric ? parseFloat(weightNum.value) : parseFloat(weightNum.value) * 0.453592;
        const speedKmh = parseFloat(speedKmhInput.value) || 12;
        const cadence = parseInt(cadenceNum.value) || 180;

        // Speed in meters per minute
        const speedMpm = (speedKmh * 1000) / 60;
        
        // Stride Length in meters = speed (m/min) / cadence (steps/min)
        const strideLengthM = speedMpm / cadence;
        const strideLengthDisplay = isMetric ? `${strideLengthM.toFixed(2)} m` : `${(strideLengthM * 3.28084).toFixed(2)} ft`;
        const strideRatio = (strideLengthM * 100 / heightCm);

        resStrideLength.textContent = strideLengthDisplay;
        resStrideRatio.textContent = `${strideRatio.toFixed(2)}x of height`;

        // Ground Contact Time (GCT) estimation (ms). Higher cadence & speed lower GCT.
        // Elite runners: ~160-200ms. Recreational: ~220-270ms
        let estGct = Math.round(310 - (cadence - 150) * 1.2 - (speedKmh - 10) * 2);
        estGct = Math.max(150, Math.min(320, estGct));
        resGct.textContent = `${estGct} ms`;
        resGctQuality.textContent = estGct < 220 ? 'Elite / Explosive (&lt;220ms)' : estGct < 250 ? 'Optimal Range (&lt;250ms)' : 'Standard Recreational';

        // Vertical Oscillation estimation (cm)
        let estOsc = (heightCm * 0.05) - ((cadence - 160) * 0.05) + (speedKmh * 0.1);
        estOsc = Math.max(5.0, Math.min(14.0, estOsc));
        resOscillation.textContent = `${estOsc.toFixed(1)} cm`;
        resOscillationQuality.textContent = estOsc < 8.0 ? 'High vertical efficiency' : estOsc < 11.0 ? 'Moderate vertical displacement' : 'High bounce / energy loss';

        // Calorie Burn estimation (Running ~ 1.03 kcal per kg per km)
        const caloriesPerKm = 1.03 * weightKg;
        const caloriesPerHour = caloriesPerKm * speedKmh;
        resCalories.textContent = `${Math.round(caloriesPerHour)} kcal/hr`;
        resCaloriesKm.textContent = `${caloriesPerKm.toFixed(1)} kcal / km`;

        // Update Splits Table
        renderSplits(speedKmh, cadence);
    }

    function renderSplits(speedKmh, cadence) {
        splitsTbody.innerHTML = '';
        const distances = [1, 3, 5, 10, 21.1, 42.2];
        const distanceLabels = ['1 km', '3 km', '5 km', '10 km', 'Half Marathon (21.1k)', 'Marathon (42.2k)'];

        const totalMinPerKm = 60 / speedKmh;

        distances.forEach((dist, idx) => {
            const totalMinutes = dist * totalMinPerKm;
            const hours = Math.floor(totalMinutes / 60);
            const mins = Math.floor(totalMinutes % 60);
            const secs = Math.round((totalMinutes - Math.floor(totalMinutes)) * 60);
            
            let timeStr = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
            if (hours > 0) {
                timeStr = `${hours}h ${mins < 10 ? '0' : ''}${mins}m`;
            }

            const paceMins = Math.floor(totalMinPerKm);
            const paceSecs = Math.round((totalMinPerKm - paceMins) * 60);
            const paceStr = `${paceMins}:${paceSecs < 10 ? '0' : ''}${paceSecs} /km`;

            const totalSteps = Math.round(dist * 1000 / (( (speedKmh * 1000) / 60 ) / cadence));

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${distanceLabels[idx]}</strong></td>
                <td>${timeStr}</td>
                <td>${paceStr}</td>
                <td>${totalSteps.toLocaleString()} steps</td>
            `;
            splitsTbody.appendChild(tr);
        });
    }

    // Audio Metronome Engine (Web Audio API)
    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function playBeatSound(soundType) {
        initAudio();
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        const now = audioCtx.currentTime;

        if (soundType === 'beep') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now); // A5
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (soundType === 'woodblock') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1200, now);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
            osc.start(now);
            osc.stop(now + 0.03);
        } else {
            // Mechanical Click
            osc.type = 'square';
            osc.frequency.setValueAtTime(400, now);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
            osc.start(now);
            osc.stop(now + 0.02);
        }
    }

    function startMetronome() {
        if (isRunning) return;
        isRunning = true;
        metroStatusBadge.textContent = 'Running';
        metroStatusBadge.className = 'badge badge-running';
        btnStartMetro.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> Stop Metronome`;
        btnStartMetro.className = 'btn btn-danger btn-lg';

        const cadence = parseInt(cadenceNum.value) || 180;
        const intervalMs = (60 / cadence) * 1000;

        beatCount = 0;
        runBeatCycle(intervalMs);
    }

    function runBeatCycle(intervalMs) {
        if (!isRunning) return;

        playBeatSound(soundTypeSelect.value);
        triggerVisualBeat();

        timerId = setTimeout(() => {
            runBeatCycle(intervalMs);
        }, intervalMs);
    }

    function stopMetronome() {
        isRunning = false;
        clearTimeout(timerId);
        metroStatusBadge.textContent = 'Stopped';
        metroStatusBadge.className = 'badge badge-stopped';
        btnStartMetro.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Start Metronome`;
        btnStartMetro.className = 'btn btn-success btn-lg';
        pendulumBob.style.transform = 'translate(-50%, -50%) translateX(0px)';
    }

    function triggerVisualBeat() {
        beatCount++;
        const direction = beatCount % 2 === 0 ? 35 : -35;
        pendulumBob.style.transform = `translate(-50%, -50%) translateX(${direction}px)`;

        beatPulseRing.classList.remove('beat-pulse-active');
        void beatPulseRing.offsetWidth; // trigger reflow
        beatPulseRing.classList.add('beat-pulse-active');
    }

    btnStartMetro.addEventListener('click', () => {
        if (isRunning) {
            stopMetronome();
        } else {
            startMetronome();
        }
    });

    toggleMetroOverlayBtn.addEventListener('click', () => {
        document.querySelector('.metronome-panel').scrollIntoView({ behavior: 'smooth' });
    });

    // Tap Tempo Feature
    btnTapTempo.addEventListener('click', () => {
        const now = Date.now();
        tapTimes.push(now);
        // Keep only taps within last 3 seconds
        tapTimes = tapTimes.filter(t => now - t < 3000);

        if (tapTimes.length >= 2) {
            let intervals = [];
            for (let i = 1; i < tapTimes.length; i++) {
                intervals.push(tapTimes[i] - tapTimes[i - 1]);
            }
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const calculatedCadence = Math.round(60000 / avgInterval);
            
            if (calculatedCadence >= 140 && calculatedCadence <= 220) {
                cadenceSlider.value = calculatedCadence;
                cadenceNum.value = calculatedCadence;
                calculateAll();
                if (isRunning) {
                    stopMetronome();
                    startMetronome();
                }
            }
        }
    });

    // Session Logging Feature (LocalStorage)
    function loadSessionLogs() {
        const saved = localStorage.getItem('aurastride_sessions');
        if (!saved) return;
        try {
            const logs = JSON.parse(saved);
            if (logs.length > 0) {
                sessionLogContainer.innerHTML = '';
                logs.forEach(log => renderSessionCard(log));
            }
        } catch (e) {
            console.error('Failed to load session logs');
        }
    }

    function renderSessionCard(log) {
        const card = document.createElement('div');
        card.className = 'session-card';
        card.innerHTML = `
            <div class="session-info">
                <span class="session-title">${log.speed} km/h @ ${log.cadence} SPM Cadence</span>
                <span class="session-meta">Stride: ${log.stride} | GCT: ${log.gct} | Saved: ${log.date}</span>
            </div>
            <button class="btn btn-sm btn-outline load-session-btn">Load</button>
        `;

        card.querySelector('.load-session-btn').addEventListener('click', () => {
            speedKmhInput.value = log.speed;
            updatePaceFromSpeed(log.speed);
            cadenceSlider.value = log.cadence;
            cadenceNum.value = log.cadence;
            calculateAll();
        });

        sessionLogContainer.appendChild(card);
    }

    btnLogSession.addEventListener('click', () => {
        const newLog = {
            speed: speedKmhInput.value,
            cadence: cadenceNum.value,
            stride: resStrideLength.textContent,
            gct: resGct.textContent,
            date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        let logs = [];
        const saved = localStorage.getItem('aurastride_sessions');
        if (saved) {
            try { logs = JSON.parse(saved); } catch (e) {}
        }
        logs.unshift(newLog);
        if (logs.length > 5) logs.pop(); // Keep max 5

        localStorage.setItem('aurastride_sessions', JSON.stringify(logs));
        sessionLogContainer.innerHTML = '';
        logs.forEach(log => renderSessionCard(log));
    });

    btnClearLogs.addEventListener('click', () => {
        localStorage.removeItem('aurastride_sessions');
        sessionLogContainer.innerHTML = `<p class="empty-log-text">No saved sessions yet. Configure your metrics and click "Save Session to Log" to record your workout blueprint.</p>`;
    });

    // Reset Defaults
    btnResetDefaults.addEventListener('click', () => {
        if (isRunning) stopMetronome();
        heightSlider.value = 175; heightNum.value = 175;
        weightSlider.value = 70; weightNum.value = 70;
        speedKmhInput.value = 12.0;
        updatePaceFromSpeed(12.0);
        cadenceSlider.value = 180; cadenceNum.value = 180;
        unitSystemSelect.value = 'metric';
        isMetric = true;
        unitLabelHeight.textContent = 'cm';
        unitLabelWeight.textContent = 'kg';
        calculateAll();
    });

    // Initial calculation on load
    calculateAll();
    loadSessionLogs();
});
