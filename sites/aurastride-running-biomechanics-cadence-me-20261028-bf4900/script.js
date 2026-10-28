(function() {
    'use strict';

    // State variables
    let unitSystem = 'metric'; // 'metric' or 'imperial'
    let heightVal = 175; // cm
    let weightVal = 70; // kg
    let speedMinPerKm = 5.0; // min/km
    let cadenceSPM = 180;
    let isMetronomeActive = false;
    let audioCtx = null;
    let metronomeTimer = null;
    let pendulumPos = 0;
    let pendulumDir = 1;
    let animationFrameId = null;

    // DOM Elements
    const heightInput = document.getElementById('runnerHeight');
    const weightInput = document.getElementById('runnerWeight');
    const unitBtns = document.querySelectorAll('.unit-btn');
    const unitLabelHeight = document.querySelector('.unit-label-height');
    const unitLabelWeight = document.querySelector('.unit-label-weight');
    const unitLabelSpeed = document.querySelector('.unit-label-speed');
    
    const speedSlider = document.getElementById('runSpeedSlider');
    const speedDisplay = document.getElementById('speedDisplay');
    const speedKmhDisplay = document.getElementById('speedKmhDisplay');
    const activeSpeedLabel = document.getElementById('activeSpeedLabel');

    const targetCadenceInput = document.getElementById('targetCadence');
    const adjBtns = document.querySelectorAll('.adj-btn');
    const metronomeToggle = document.getElementById('metronomeToggle');
    const pendulumDot = document.getElementById('pendulumDot');
    const audioCueCheck = document.getElementById('audioCue');
    const soundFreqSelect = document.getElementById('soundFreq');

    const resStrideLength = document.getElementById('resStrideLength');
    const resStrideInches = document.getElementById('resStrideInches');
    const resGCT = document.getElementById('resGCT');
    const resOscillation = document.getElementById('resOscillation');
    const resEfficiency = document.getElementById('resEfficiency');

    const strideChart = document.getElementById('strideChart');
    const splitsTableBody = document.getElementById('splitsTableBody');
    const saveSessionBtn = document.getElementById('saveSessionBtn');
    const clearSessionsBtn = document.getElementById('clearSessionsBtn');
    const sessionLogList = document.getElementById('sessionLogList');

    // Initialization
    function init() {
        setupEventListeners();
        calculateBiomechanics();
        renderSplits();
        loadSessions();
    }

    function setupEventListeners() {
        // Unit toggles
        unitBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = btn.dataset.target;
                const unit = btn.dataset.unit;
                
                // Set active class within group
                document.querySelectorAll(`.unit-btn[data-target="${target}"]`).forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                if (target === 'height') {
                    if (unit === 'imperial' && unitSystem === 'metric') {
                        // cm to inches
                        heightVal = Math.round(heightVal / 2.54);
                        unitSystem = 'imperial';
                        unitLabelHeight.textContent = 'in';
                        heightInput.min = 47;
                        heightInput.max = 87;
                    } else if (unit === 'metric' && unitSystem === 'imperial') {
                        // inches to cm
                        heightVal = Math.round(heightVal * 2.54);
                        unitSystem = 'metric';
                        unitLabelHeight.textContent = 'cm';
                        heightInput.min = 120;
                        heightInput.max = 220;
                    }
                    heightInput.value = heightVal;
                } else if (target === 'weight') {
                    if (unit === 'imperial' && unitSystem === 'metric') {
                        // kg to lbs
                        weightVal = Math.round(weightVal * 2.20462);
                        unitLabelWeight.textContent = 'lbs';
                        weightInput.min = 75;
                        weightInput.max = 400;
                    } else if (unit === 'metric' && unitSystem === 'imperial') {
                        // lbs to kg
                        weightVal = Math.round(weightVal / 2.20462);
                        unitLabelWeight.textContent = 'kg';
                        weightInput.min = 35;
                        weightInput.max = 180;
                    }
                    weightInput.value = weightVal;
                }
                calculateBiomechanics();
            });
        });

        heightInput.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) {
                heightVal = val;
                calculateBiomechanics();
            }
        });

        weightInput.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val)) {
                weightVal = val;
                calculateBiomechanics();
            }
        });

        speedSlider.addEventListener('input', (e) => {
            speedMinPerKm = parseFloat(e.target.value);
            updateSpeedDisplays();
            calculateBiomechanics();
        });

        targetCadenceInput.addEventListener('input', (e) => {
            let val = parseInt(e.target.value);
            if (!isNaN(val)) {
                cadenceSPM = Math.max(120, Math.min(220, val));
                calculateBiomechanics();
                if (isMetronomeActive) {
                    restartMetronome();
                }
            }
        });

        adjBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const change = parseInt(btn.dataset.change);
                cadenceSPM = Math.max(120, Math.min(220, cadenceSPM + change));
                targetCadenceInput.value = cadenceSPM;
                calculateBiomechanics();
                if (isMetronomeActive) {
                    restartMetronome();
                }
            });
        });

        metronomeToggle.addEventListener('click', toggleMetronome);
        saveSessionBtn.addEventListener('click', saveCurrentSession);
        clearSessionsBtn.addEventListener('click', clearAllSessions);
    }

    function updateSpeedDisplays() {
        const mins = Math.floor(speedMinPerKm);
        const secs = Math.round((speedMinPerKm - mins) * 60);
        const formattedSecs = secs < 10 ? '0' + secs : secs;
        
        let speedStr = `${mins}:${formattedSecs} min/km`;
        let kmh = (60 / speedMinPerKm).toFixed(1);
        let speedSubStr = `(${kmh} km/h)`;

        if (unitSystem === 'imperial') {
            // Convert min/km to min/mile
            const minPerMile = speedMinPerKm * 1.60934;
            const mMi = Math.floor(minPerMile);
            const sMi = Math.round((minPerMile - mMi) * 60);
            const fSMi = sMi < 10 ? '0' + sMi : sMi;
            speedStr = `${mMi}:${fSMi} min/mi`;
            const mph = (kmh / 1.60934).toFixed(1);
            speedSubStr = `(${mph} mph)`;
            unitLabelSpeed.textContent = 'min/mi';
        } else {
            unitLabelSpeed.textContent = 'min/km';
        }

        speedDisplay.textContent = speedStr;
        speedKmhDisplay.textContent = speedSubStr;
        activeSpeedLabel.textContent = speedStr;
    }

    function calculateBiomechanics() {
        // Normalize height in cm
        let heightCm = heightVal;
        if (unitSystem === 'imperial') {
            heightCm = heightVal * 2.54;
        }

        // Speed in meters per second
        const kmh = 60 / speedMinPerKm;
        const metersPerSec = (kmh * 1000) / 3600;

        // Stride Length (meters) = Speed (m/s) * 60 / Cadence (SPM)
        const strideMeters = (metersPerSec * 60) / cadenceSPM;
        const strideInches = strideMeters * 39.3701;

        // Ground Contact Time (GCT) estimation in ms
        // Higher cadence and taller runners correlate with shorter GCT
        let baseGCT = 240 - ((cadenceSPM - 150) * 1.2) - ((heightCm - 170) * 0.2);
        let gctMs = Math.round(Math.max(160, Math.min(320, baseGCT)));

        // Vertical Oscillation estimation (cm)
        // Lower stride length relative to height & higher cadence reduces oscillation
        let baseOsc = 10.5 - ((cadenceSPM - 160) * 0.05) + ((strideMeters * 100 - 110) * 0.03);
        let oscCm = Math.max(5.0, Math.min(14.0, baseOsc)).toFixed(1);

        // Efficiency Score based on cadence range (170-190 is optimal sweet spot)
        let cadenceDiff = Math.abs(cadenceSPM - 180);
        let efficiency = Math.max(70, Math.min(99, Math.round(99 - (cadenceDiff * 0.8))));

        // Render to DOM
        resStrideLength.textContent = strideMeters.toFixed(2) + ' m';
        resStrideInches.textContent = Math.round(strideInches) + ' in';
        resGCT.textContent = gctMs + ' ms';
        resOscillation.textContent = oscCm + ' cm';
        resEfficiency.textContent = efficiency + '%';

        // Render chart & splits
        drawStrideChart(strideMeters, cadenceSPM, metersPerSec);
        renderSplits();
    }

    // Chart Rendering on Canvas
    function drawStrideChart(currentStride, currentCadence, metersPerSec) {
        const ctx = strideChart.getContext('2d');
        const width = strideChart.width;
        const height = strideChart.height;

        ctx.clearRect(0, 0, width, height);

        // Background grid
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 50; x < width; x += 50) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height - 25);
        }
        for (let y = 25; y < height - 25; y += 40) {
            ctx.moveTo(40, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();

        // Axes
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(40, height - 25);
        ctx.lineTo(width - 10, height - 25);
        ctx.moveTo(40, 10);
        ctx.lineTo(40, height - 25);
        ctx.stroke();

        // Draw Stride vs Cadence curve (Cadence range 120 to 220)
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();

        const minCadence = 120;
        const maxCadence = 220;
        const chartWidth = width - 60;
        const chartHeight = height - 40;

        let points = [];
        for (let c = minCadence; c <= maxCadence; c += 2) {
            let s = (metersPerSec * 60) / c;
            let x = 40 + ((c - minCadence) / (maxCadence - minCadence)) * chartWidth;
            // Stride length expected roughly between 0.6m and 2.2m
            let y = (height - 25) - ((s - 0.6) / (2.2 - 0.6)) * chartHeight;
            points.push({x, y, cadence: c, stride: s});
        }

        points.forEach((pt, index) => {
            if (index === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();

        // Draw current user marker on curve
        let activeX = 40 + ((currentCadence - minCadence) / (maxCadence - minCadence)) * chartWidth;
        let activeY = (height - 25) - ((currentStride - 0.6) / (2.2 - 0.6)) * chartHeight;

        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(activeX, activeY, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Axis Labels
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px system-ui';
        ctx.fillText('120 SPM', 35, height - 10);
        ctx.fillText('180 SPM', width / 2 - 15, height - 10);
        ctx.fillText('220 SPM', width - 50, height - 10);
    }

    function renderSplits() {
        splitsTableBody.innerHTML = '';
        // Calculate splits for 1km, 5km, 10km, Half Marathon (21.1km)
        const distances = [
            { name: '1 km', km: 1 },
            { name: '5 km', km: 5 },
            { name: '10 km', km: 10 },
            { name: 'Half Marathon', km: 21.0975 }
        ];

        distances.forEach(d => {
            // Total time in seconds
            const totalSeconds = d.km * speedMinPerKm * 60;
            const mins = Math.floor(totalSeconds / 60);
            const secs = Math.round(totalSeconds % 60);
            const timeStr = `${mins}:${secs < 10 ? '0' + secs : secs}`;

            // Total strides = km * 1000 / stride length... or cadence * total minutes
            const totalMinutes = totalSeconds / 60;
            const totalStrides = Math.round(totalMinutes * cadenceSPM);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${d.name}</strong></td>
                <td>${speedMinPerKm.toFixed(1)} min/km</td>
                <td>${timeStr}</td>
                <td>${totalStrides.toLocaleString()} steps</td>
            `;
            splitsTableBody.appendChild(row);
        });
    }

    // Metronome Audio & Animation
    function toggleMetronome() {
        if (isMetronomeActive) {
            stopMetronome();
        } else {
            startMetronome();
        }
    }

    function startMetronome() {
        isMetronomeActive = true;
        metronomeToggle.classList.add('active-beat');
        metronomeToggle.querySelector('span').textContent = 'Stop Metronome Beat';
        
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } else if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const intervalMs = (60 / cadenceSPM) * 1000;
        
        // Play first beat immediately
        playBeat();

        metronomeTimer = setInterval(() => {
            playBeat();
        }, intervalMs);

        // Animate Pendulum
        animatePendulum();
    }

    function stopMetronome() {
        isMetronomeActive = false;
        metronomeToggle.classList.remove('active-beat');
        metronomeToggle.querySelector('span').textContent = 'Start Metronome Beat';

        if (metronomeTimer) {
            clearInterval(metronomeTimer);
            metronomeTimer = null;
        }

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        pendulumDot.style.left = '50%';
    }

    function restartMetronome() {
        if (metronomeTimer) clearInterval(metronomeTimer);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        const intervalMs = (60 / cadenceSPM) * 1000;
        metronomeTimer = setInterval(() => {
            playBeat();
        }, intervalMs);
        animatePendulum();
    }

    function playBeat() {
        if (!audioCueCheck.checked || !audioCtx) return;

        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            const freq = parseInt(soundFreqSelect.value) || 600;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

            gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start();
            osc.stop(audioCtx.currentTime + 0.05);
        } catch(e) {
            console.error('Audio playback error', e);
        }
    }

    function animatePendulum() {
        let startTime = performance.now();
        const intervalMs = (60 / cadenceSPM) * 1000;

        function frame(currentTime) {
            if (!isMetronomeActive) return;

            let elapsed = (currentTime - startTime) % intervalMs;
            let progress = elapsed / intervalMs;

            // Sine wave swing from -40% to +40% around center 50%
            let offset = Math.sin(progress * Math.PI * 2) * 40;
            pendulumDot.style.left = (50 + offset) + '%';

            animationFrameId = requestAnimationFrame(frame);
        }

        animationFrameId = requestAnimationFrame(frame);
    }

    // LocalStorage Session Logging
    function saveCurrentSession() {
        const kmh = (60 / speedMinPerKm).toFixed(1);
        const sessionData = {
            id: Date.now(),
            date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            cadence: cadenceSPM,
            speed: `${speedMinPerKm.toFixed(1)} min/km (${kmh} km/h)`,
            height: `${heightVal} ${unitSystem === 'metric' ? 'cm' : 'in'}`,
            weight: `${weightVal} ${unitSystem === 'metric' ? 'kg' : 'lbs'}`,
            stride: resStrideLength.textContent
        };

        let sessions = JSON.parse(localStorage.getItem('aurastride_sessions') || '[]');
        sessions.unshift(sessionData);
        if (sessions.max > 15) sessions = sessions.slice(0, 15);
        localStorage.setItem('aurastride_sessions', JSON.stringify(sessions));
        loadSessions();
    }

    function loadSessions() {
        const sessions = JSON.parse(localStorage.getItem('aurastride_sessions') || '[]');
        sessionLogList.innerHTML = '';

        if (sessions.length === 0) {
            sessionLogList.innerHTML = '<p class="empty-msg">No saved sessions yet. Configure your metrics and click "Save Session Stats".</p>';
            return;
        }

        sessions.forEach(s => {
            const item = document.createElement('div');
            item.className = 'session-item';
            item.innerHTML = `
                <div class="session-details">
                    <span class="session-title">${s.cadence} SPM &bull; Stride: ${s.stride}</span>
                    <span class="session-meta">Speed: ${s.speed} &bull; ${s.date}</span>
                </div>
                <button class="session-delete-btn" data-id="${s.id}" title="Delete session">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;
            sessionLogList.appendChild(item);
        });

        // Bind delete buttons
        document.querySelectorAll('.session-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(btn.dataset.id);
                deleteSession(id);
            });
        });
    }

    function deleteSession(id) {
        let sessions = JSON.parse(localStorage.getItem('aurastride_sessions') || '[]');
        sessions = sessions.filter(s => s.id !== id);
        localStorage.setItem('aurastride_sessions', JSON.stringify(sessions));
        loadSessions();
    }

    function clearAllSessions() {
        localStorage.removeItem('aurastride_sessions');
        loadSessions();
    }

    // Run on load
    document.addEventListener('DOMContentLoaded', init);
})();
