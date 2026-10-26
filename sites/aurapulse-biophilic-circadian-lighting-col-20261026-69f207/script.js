document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    const orientationSelect = document.getElementById('room-orientation');
    const roomSizeRange = document.getElementById('room-size');
    const roomSizeVal = document.getElementById('room-size-val');
    const windowRatioRange = document.getElementById('window-ratio');
    const windowRatioVal = document.getElementById('window-ratio-val');
    const workStyleSelect = document.getElementById('work-style');
    
    const timeScrubber = document.getElementById('time-scrubber');
    const timeScrubberVal = document.getElementById('time-scrubber-val');
    const presetBtns = document.querySelectorAll('.preset-btn');
    const phaseDescription = document.getElementById('phase-description');
    
    const fixOverhead = document.getElementById('fix-overhead');
    const fixBias = document.getElementById('fix-bias');
    const fixFloor = document.getElementById('fix-floor');
    const fixGrow = document.getElementById('fix-grow');
    const manualDimmer = document.getElementById('manual-dimmer');
    const manualDimmerVal = document.getElementById('manual-dimmer-val');
    
    const btnReset = document.getElementById('btn-reset');
    const btnExport = document.getElementById('btn-export');
    const exportModal = document.getElementById('exportModal');
    const closeModal = document.getElementById('close-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const btnCopy = document.getElementById('btn-copy');
    const exportText = document.getElementById('export-text');
    
    // Visualizer Elements
    const previewViewport = document.getElementById('preview-viewport');
    const ambientGlow = document.getElementById('ambient-glow');
    const skyGradient = document.getElementById('sky-gradient');
    const sunDisk = document.getElementById('sun-disk');
    const monitorGlow = document.getElementById('monitor-glow');
    const kelvinDisplay = document.getElementById('kelvin-display');
    const luxDisplay = document.getElementById('lux-display');
    
    // Metrics Elements
    const metricCct = document.getElementById('metric-cct');
    const metricCctDesc = document.getElementById('metric-cct-desc');
    const metricMedi = document.getElementById('metric-medi');
    const metricMediDesc = document.getElementById('metric-medi-desc');
    const metricPower = document.getElementById('metric-power');
    const metricPowerDesc = document.getElementById('metric-power-desc');
    const metricScore = document.getElementById('metric-score');
    const metricScoreDesc = document.getElementById('metric-score-desc');
    
    const circadianCanvas = document.getElementById('circadianCanvas');
    const ctx = circadianCanvas.getContext('2d');

    // State
    const state = {
        orientation: 'east',
        roomSize: 18,
        windowRatio: 25,
        workStyle: 'standard',
        timeMinutes: 720, // 12:00 PM in minutes
        fixtures: {
            overhead: true,
            bias: true,
            floor: false,
            grow: false
        },
        dimmer: 100
    };

    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const targetId = `tab-${btn.dataset.tab}`;
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Preset Time Buttons
    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const time = parseInt(btn.dataset.time, 10);
            timeScrubber.value = time;
            updateTime(time);
        });
    });

    // Event Listeners for Controls
    orientationSelect.addEventListener('change', (e) => {
        state.orientation = e.target.value;
        updateSimulation();
    });

    roomSizeRange.addEventListener('input', (e) => {
        state.roomSize = parseInt(e.target.value, 10);
        roomSizeVal.textContent = `${state.roomSize} m²`;
        updateSimulation();
    });

    windowRatioRange.addEventListener('input', (e) => {
        state.windowRatio = parseInt(e.target.value, 10);
        windowRatioVal.textContent = `${state.windowRatio}%`;
        updateSimulation();
    });

    workStyleSelect.addEventListener('change', (e) => {
        state.workStyle = e.target.value;
        updateSimulation();
    });

    timeScrubber.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        updateTime(val);
    });

    fixOverhead.addEventListener('change', (e) => { state.fixtures.overhead = e.target.checked; updateSimulation(); });
    fixBias.addEventListener('change', (e) => { state.fixtures.bias = e.target.checked; updateSimulation(); });
    fixFloor.addEventListener('change', (e) => { state.fixtures.floor = e.target.checked; updateSimulation(); });
    fixGrow.addEventListener('change', (e) => { state.fixtures.grow = e.target.checked; updateSimulation(); });

    manualDimmer.addEventListener('input', (e) => {
        state.dimmer = parseInt(e.target.value, 10);
        manualDimmerVal.textContent = `${state.dimmer}%`;
        updateSimulation();
    });

    btnReset.addEventListener('click', () => {
        orientationSelect.value = 'east';
        roomSizeRange.value = 18;
        roomSizeVal.textContent = '18 m²';
        windowRatioRange.value = 25;
        windowRatioVal.textContent = '25%';
        workStyleSelect.value = 'standard';
        timeScrubber.value = 720;
        fixOverhead.checked = true;
        fixBias.checked = true;
        fixFloor.checked = false;
        fixGrow.checked = false;
        manualDimmer.value = 100;
        manualDimmerVal.textContent = '100%';

        state.orientation = 'east';
        state.roomSize = 18;
        state.windowRatio = 25;
        state.workStyle = 'standard';
        state.timeMinutes = 720;
        state.fixtures = { overhead: true, bias: true, floor: false, grow: false };
        state.dimmer = 100;

        updateSimulation();
    });

    // Modal handlers
    btnExport.addEventListener('click', () => {
        const recipe = generateRecipeText();
        exportText.value = recipe;
        exportModal.classList.add('active');
    });

    closeModal.addEventListener('click', () => exportModal.classList.remove('active'));
    closeModalBtn.addEventListener('click', () => exportModal.classList.remove('active'));
    exportModal.addEventListener('click', (e) => {
        if (e.target === exportModal) exportModal.classList.remove('active');
    });

    btnCopy.addEventListener('click', () => {
        exportText.select();
        document.execCommand('copy');
        btnCopy.textContent = 'Copied!';
        setTimeout(() => btnCopy.textContent = 'Copy to Clipboard', 2000);
    });

    function updateTime(minutes) {
        state.timeMinutes = minutes;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 === 0 ? 12 : hours % 12;
        const formattedMins = mins < 10 ? `0${mins}` : mins;
        timeScrubberVal.textContent = `${formattedHours}:${formattedMins} ${ampm}`;
        updateSimulation();
    }

    function kelvinToRGB(kelvin) {
        // Approximation of Planckian locus to RGB
        let temp = kelvin / 100;
        let red, green, blue;

        if (temp <= 66) {
            red = 255;
            green = temp;
            green = 99.4708025861 * Math.log(green) - 161.1195681661;
            if (temp <= 19) blue = 0;
            else {
                blue = temp - 10;
                blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
            }
        } else {
            red = temp - 60;
            red = 329.698727446 * Math.pow(red, -0.1332047592);
            green = temp - 60;
            green = 288.1221695283 * Math.pow(green, -0.0755148492);
            blue = 255;
        }

        return {
            r: Math.min(255, Math.max(0, Math.round(red))),
            g: Math.min(255, Math.max(0, Math.round(green))),
            b: Math.min(255, Math.max(0, Math.round(blue)))
        };
    }

    function updateSimulation() {
        const hours = state.timeMinutes / 60;
        
        // Solar calculation (Sunrise ~6:00, Sunset ~18:00)
        let sunFactor = 0;
        if (hours >= 5.5 && hours <= 18.5) {
            sunFactor = Math.sin(((hours - 5.5) / 13) * Math.PI);
        }

        // Color Temperature based on time and orientation
        let cct = 5000;
        if (hours < 7) cct = 2700 + (hours - 5) * 1150; // Dawn warmup
        else if (hours <= 12) cct = 5000 + (hours - 7) * 500; // Morning shift to daylight
        else if (hours <= 16) cct = 6500 - (hours - 12) * 200;
        else if (hours <= 19) cct = 5700 - (hours - 16) * 1000; // Sunset warmdown
        else cct = 2200; // Night

        if (state.orientation === 'north') cct += 800;
        if (state.orientation === 'west' && hours > 14) cct = 3000;
        if (state.orientation === 'windowless') cct = 4000;

        cct = Math.min(6500, Math.max(1800, Math.round(cct)));

        // Lux Calculation
        let baseLux = sunFactor * (state.windowRatio / 100) * 2500;
        if (state.orientation === 'windowless') baseLux = 0;
        
        // Add indoor artificial lights if active
        let artificialLux = 0;
        let powerWatts = 0;
        if (state.fixtures.overhead) { artificialLux += 300; powerWatts += 28; }
        if (state.fixtures.bias) { artificialLux += 75; powerWatts += 8; }
        if (state.fixtures.floor) { artificialLux += 150; powerWatts += 18; }
        if (state.fixtures.grow) { artificialLux += 200; powerWatts += 45; }

        artificialLux *= (state.dimmer / 100);
        powerWatts *= (state.dimmer / 100);

        const totalLux = Math.round(baseLux + artificialLux);
        const medi = Math.round(totalLux * (cct > 4000 ? 0.9 : 0.3));

        // UI Updates
        kelvinDisplay.textContent = `${cct}K`;
        luxDisplay.textContent = `${totalLux} lux`;

        metricCct.textContent = `${cct} K`;
        metricCct.style.color = `rgb(${Object.values(kelvinToRGB(cct)).join(',')})`;
        
        if (cct > 5000) metricCctDesc.textContent = 'Cool Daylight (High Alertness)';
        else if (cct > 3500) metricCctDesc.textContent = 'Neutral White (Balanced)';
        else metricCctDesc.textContent = 'Warm Amber (Relaxation)';

        metricMedi.textContent = `${medi} lux`;
        if (medi > 250) {
            metricMediDesc.textContent = 'Strong Melatonin Suppression';
            metricMedi.style.color = 'var(--accent-primary)';
        } else if (medi > 100) {
            metricMediDesc.textContent = 'Moderate Circadian Stimulation';
            metricMedi.style.color = 'var(--success)';
        } else {
            metricMediDesc.textContent = 'Melatonin Promotion (Wind-Down)';
            metricMedi.style.color = '#f59e0b';
        }

        const dailyKWh = ((powerWatts * 8) / 1000).toFixed(2);
        metricPower.textContent = `${Math.round(powerWatts)} W`;
        metricPowerDesc.textContent = `Est. ${dailyKWh} kWh / day`;

        // Circadian alignment score calculation based on work style
        let score = 92;
        if (state.workStyle === 'standard' && hours >= 9 && hours <= 18 && cct < 4000) score -= 15;
        if (state.workStyle === 'night' && hours >= 20 && cct > 4000) score -= 20;
        metricScore.textContent = `${Math.max(60, score)}%`;

        // Phase description update
        if (hours < 7) phaseDescription.textContent = 'Dawn transition. Melatonin levels dropping as cortisol begins to rise.';
        else if (hours < 12) phaseDescription.textContent = 'Morning focus window. Cool high-CCT spectrum promotes peak cognitive alertness.';
        else if (hours < 17) phaseDescription.textContent = 'Afternoon maintenance. Steady luminous flux sustaining deep work output.';
        else if (hours < 20) phaseDescription.textContent = 'Sunset wind-down. Transitioning to warmer tones to prepare for melatonin synthesis.';
        else phaseDescription.textContent = 'Evening recovery. Low-intensity warm amber light protects natural sleep architecture.';

        // Visualizer color adjustments
        const rgb = kelvinToRGB(cct);
        const glowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.min(0.6, totalLux / 1500)})`;
        ambientGlow.style.background = `radial-gradient(circle at 50% 30%, ${glowColor}, transparent 70%)`;

        // Sky color gradient
        let skyTop = '#050b14';
        let skyBottom = '#1e293b';
        if (sunFactor > 0.5) {
            skyTop = '#0284c7';
            skyBottom = '#38bdf8';
        } else if (sunFactor > 0) {
            skyTop = '#ea580c';
            skyBottom = '#fbbf24';
        }
        skyGradient.style.background = `linear-gradient(to bottom, ${skyTop}, ${skyBottom})`;

        // Sun disk position
        const sunX = ((hours - 6) / 12) * 120 - 10;
        const sunY = Math.max(0, 80 - (sunFactor * 70));
        sunDisk.style.left = `${Math.max(-10, Math.min(110, sunX))}%`;
        sunDisk.style.top = `${sunY}px`;
        sunDisk.style.opacity = sunFactor > 0 ? 1 : 0;

        // Monitor color
        monitorGlow.style.background = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`;

        drawCircadianCurve();
    }

    function drawCircadianCurve() {
        const w = circadianCanvas.width;
        const h = circadianCanvas.height;
        ctx.clearRect(0, 0, w, h);

        // Grid lines
        ctx.strokeStyle = '#2a3855';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.75);
        ctx.lineTo(w, h * 0.75);
        ctx.stroke();

        // Draw Sun Curve
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
            const hours = (x / w) * 24;
            let sf = 0;
            if (hours >= 5.5 && hours <= 18.5) {
                sf = Math.sin(((hours - 5.5) / 13) * Math.PI);
            }
            const y = h - (sf * h * 0.7) - 15;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Draw Task Lighting Profile
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
            const hours = (x / w) * 24;
            let tf = 0.2;
            if (hours >= 8 && hours <= 19) tf = 0.8;
            if (hours >= 12 && hours <= 13) tf = 0.5; // Lunch dip
            const y = h - (tf * h * 0.6) - 15;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Current time marker
        const currentX = (state.timeMinutes / 1440) * w;
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(currentX, 0);
        ctx.lineTo(currentX, h);
        ctx.stroke();
    }

    function generateRecipeText() {
        const hours = Math.floor(state.timeMinutes / 60);
        const mins = state.timeMinutes % 60;
        return `=== AURAPULSE CIRCADIAN LIGHTING SPECIFICATION ===
Generated: ${new Date().toLocaleDateString()}

[ROOM & GEOMETRY]
- Orientation: ${state.orientation.toUpperCase()}
- Floor Area: ${state.roomSize} m²
- Window-to-Wall Ratio: ${state.windowRatio}%
- Focus Routine: ${state.workStyle.toUpperCase()}

[ACTIVE SIMULATION STATE]
- Time of Day: ${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}
- Active Fixtures: ${Object.entries(state.fixtures).filter(v=>v[1]).map(v=>v[0]).join(', ')}
- Master Dimmer: ${state.dimmer}%

[TARGET METRICS]
- Color Temperature (CCT): ${kelvinDisplay.textContent}
- Total Illuminance: ${luxDisplay.textContent}
- Melanopic EDI: ${metricMedi.textContent}
- Daily Energy Est: ${metricPower.textContent}

===================================================`;
    }

    // Initial render
    updateSimulation();
    window.addEventListener('resize', drawCircadianCurve);
});
