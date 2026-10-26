document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const roomTypeSelect = document.getElementById('room-type');
    const monitorNitsInput = document.getElementById('monitor-nits');
    const monitorNitsVal = document.getElementById('monitor-nits-val');
    const ambientLuxInput = document.getElementById('ambient-lux');
    const ambientLuxVal = document.getElementById('ambient-lux-val');
    const wallReflectanceSelect = document.getElementById('wall-reflectance');
    const workStartInput = document.getElementById('work-start');
    const workEndInput = document.getElementById('work-end');
    const scheduleVal = document.getElementById('schedule-val');
    const resetBtn = document.getElementById('reset-defaults');

    const resContrast = document.getElementById('res-contrast');
    const statContrast = document.getElementById('stat-contrast');
    const resStrain = document.getElementById('res-strain');
    const statStrain = document.getElementById('stat-strain');
    const resTemp = document.getElementById('res-temp');
    const statTemp = document.getElementById('stat-temp');
    const resBias = document.getElementById('res-bias');
    const statBias = document.getElementById('stat-bias');
    const recText = document.getElementById('rec-text');

    const simCanvas = document.getElementById('simCanvas');
    const ctx = simCanvas.getContext('2d');

    const timelineAxis = document.getElementById('timeline-axis');
    const timelineTrack = document.getElementById('timeline-track');
    const scheduleTbody = document.getElementById('schedule-tbody');

    // Room Presets
    const roomPresets = {
        'home-office': { nits: 220, lux: 300, reflectance: '0.50' },
        'coding': { nits: 250, lux: 500, reflectance: '0.50' },
        'design': { nits: 160, lux: 200, reflectance: '0.85' },
        'ambient': { nits: 120, lux: 100, reflectance: '0.20' }
    };

    // Load saved settings if available
    function loadSettings() {
        const saved = localStorage.getItem('auragrid_settings');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.roomType) roomTypeSelect.value = data.roomType;
                if (data.nits) monitorNitsInput.value = data.nits;
                if (data.lux) ambientLuxInput.value = data.lux;
                if (data.reflectance) wallReflectanceSelect.value = data.reflectance;
                if (data.start) workStartInput.value = data.start;
                if (data.end) workEndInput.value = data.end;
            } catch (e) {
                console.error('Failed to load storage', e);
            }
        }
    }

    function saveSettings() {
        const data = {
            roomType: roomTypeSelect.value,
            nits: monitorNitsInput.value,
            lux: ambientLuxInput.value,
            reflectance: wallReflectanceSelect.value,
            start: workStartInput.value,
            end: workEndInput.value
        };
        localStorage.setItem('auragrid_settings', JSON.stringify(data));
    }

    function updateValues() {
        monitorNitsVal.textContent = `${monitorNitsInput.value} nits`;
        ambientLuxVal.textContent = `${ambientLuxInput.value} lx`;
        scheduleVal.textContent = `${workStartInput.value} - ${workEndInput.value}`;

        calculateDiagnostics();
        drawSimulation();
        renderTimeline();
        saveSettings();
    }

    function calculateDiagnostics() {
        const nits = parseFloat(monitorNitsInput.value);
        const lux = parseFloat(ambientLuxInput.value);
        const reflectance = parseFloat(wallReflectanceSelect.value);

        // Screen to Wall Contrast calculation
        // Approximate wall luminance (cd/m2) = (Ambient Lux * Reflectance) / Pi
        const wallLuminance = (lux * reflectance) / Math.PI;
        const contrastRatio = (nits / Math.max(wallLuminance, 1)).toFixed(1);

        resContrast.textContent = `${contrastRatio}:1`;
        
        if (contrastRatio >= 2 && contrastRatio <= 5) {
            statContrast.textContent = 'Optimal Balance';
            statContrast.className = 'metric-status status-optimal';
        } else if (contrastRatio < 2) {
            statContrast.textContent = 'Washed Out (Low Contrast)';
            statContrast.className = 'metric-status status-warning';
        } else {
            statContrast.textContent = 'High Glare Risk (>5:1)';
            statContrast.className = 'metric-status status-danger';
        }

        // Eye Fatigue Risk Index (0-100 score)
        // Factors: high brightness relative to low ambient, or extreme mismatch
        let fatigueScore = 15;
        if (nits > 400 && lux < 150) fatigueScore += 45;
        if (nits < 120 && lux > 600) fatigueScore += 35;
        if (contrastRatio > 6 || contrastRatio < 1.5) fatigueScore += 25;
        fatigueScore = Math.min(fatigueScore, 98);

        resStrain.textContent = `${fatigueScore}/100`;
        if (fatigueScore < 30) {
            statStrain.textContent = 'Low Strain Risk';
            statStrain.className = 'metric-status status-optimal';
        } else if (fatigueScore < 60) {
            statStrain.textContent = 'Moderate Fatigue';
            statStrain.className = 'metric-status status-warning';
        } else {
            statStrain.textContent = 'High Eye Strain Hazard';
            statStrain.className = 'metric-status status-danger';
        }

        // Recommended CCT based on room type
        let cct = 4000;
        let cctDesc = 'Neutral Daylight';
        const room = roomTypeSelect.value;
        if (room === 'coding') { cct = 5000; cctDesc = 'Crisp Focus (5000K)'; }
        else if (room === 'design') { cct = 6500; cctDesc = 'D65 Daylight Standard'; }
        else if (room === 'ambient') { cct = 3000; cctDesc = 'Warm Relaxation (3000K)'; }
        else { cct = 4000; cctDesc = 'Balanced Office (4000K)'; }

        resTemp.textContent = `${cct} K`;
        statTemp.textContent = cctDesc;

        // Bias Light Intensity Target (ISO standard recommends ~10% of monitor max or matching surround)
        const targetBiasLux = Math.round(nits * 0.35);
        resBias.textContent = `${targetBiasLux} lx`;
        statBias.textContent = 'Ideal Backlight Lumens';

        // Recommendation generator
        let rec = '';
        if (fatigueScore >= 60) {
            rec = `Warning: High eye strain risk detected. Your monitor luminance (${nits} nits) is poorly balanced with the ambient room lighting (${lux} lx). Try increasing ambient light or enabling a 3500K-4000K LED bias backlight behind your monitor.`;
        } else if (contrastRatio > 5) {
            rec = `Notice: High luminance gradient between your display and rear wall. Consider lowering monitor brightness by 20-30 nits or adding soft wall illumination to prevent pupil fatigue.`;
        } else if (contrastRatio < 2) {
            rec = `Notice: Low contrast ratio can cause text to feel dull and eye muscles to strain to focus. Increase room illumination or boost monitor backlight slightly.`;
        } else {
            rec = `Excellent workspace balance! Your screen-to-wall luminance ratio (${contrastRatio}:1) falls within ergonomic standards. Maintain regular 20-20-20 breaks (every 20 mins, look 20 feet away for 20 seconds).`;
        }
        recText.textContent = rec;
    }

    function drawSimulation() {
        const width = simCanvas.width;
        const height = simCanvas.height;
        const nits = parseFloat(monitorNitsInput.value);
        const lux = parseFloat(ambientLuxInput.value);

        ctx.clearRect(0, 0, width, height);

        // Draw Wall Background
        const wallTone = Math.min(Math.floor((lux / 1000) * 120 + 30), 180);
        ctx.fillStyle = `rgb(${wallTone}, ${wallTone + 5}, ${wallTone + 15})`;
        ctx.fillRect(0, 0, width, height);

        // Draw Bias Light Glow behind monitor
        const biasGlowRadius = 140;
        const gradient = ctx.createRadialGradient(width / 2, height / 2 - 10, 40, width / 2, height / 2 - 10, biasGlowRadius);
        const glowAlpha = Math.min(0.6, Math.max(0.15, nits / 700));
        gradient.addColorStop(0, `rgba(255, 215, 120, ${glowAlpha})`);
        gradient.addColorStop(1, 'rgba(255, 215, 120, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Draw Monitor Body
        const monWidth = 340;
        const monHeight = 180;
        const monX = (width - monWidth) / 2;
        const monY = (height - monHeight) / 2 - 20;

        // Monitor Stand
        ctx.fillStyle = '#334155';
        ctx.fillRect(width / 2 - 8, monY + monHeight, 16, 35);
        ctx.fillRect(width / 2 - 45, monY + monHeight + 32, 90, 8);

        // Monitor Bezel
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.roundRect(monX - 6, monY - 6, monWidth + 12, monHeight + 12, 8);
        ctx.fill();

        // Monitor Screen / Display Content
        const screenBrightnessFactor = Math.min(1, Math.max(0.3, nits / 500));
        ctx.fillStyle = `rgb(${Math.floor(20 * screenBrightnessFactor)}, ${Math.floor(40 * screenBrightnessFactor)}, ${Math.floor(70 * screenBrightnessFactor)})`;
        ctx.fillRect(monX, monY, monWidth, monHeight);

        // Simulated IDE / UI on screen
        ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.fillRect(monX + 15, monY + 15, 70, 10);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(monX + 15, monY + 35, monWidth - 30, 6);
        ctx.fillRect(monX + 15, monY + 50, monWidth - 60, 6);
        ctx.fillRect(monX + 15, monY + 65, monWidth - 45, 6);
        ctx.fillRect(monX + 15, monY + 90, 120, 40);
        ctx.fillRect(monX + 145, monY + 90, 160, 40);

        // Desk Surface
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, height - 35, width, 35);
        ctx.fillStyle = '#334155';
        ctx.fillRect(0, height - 35, width, 3);
    }

    function renderTimeline() {
        const startStr = workStartInput.value;
        const endStr = workEndInput.value;

        const [startHour, startMin] = startStr.split(':').map(Number);
        const [endHour, endMin] = endStr.split(':').map(Number);

        const startFraction = startHour + startMin / 60;
        const endFraction = endHour + endMin / 60;

        // Render Axis ticks
        timelineAxis.innerHTML = '';
        for (let h = 0; h <= 24; h += 3) {
            const span = document.createElement('span');
            span.textContent = `${String(h).padStart(2, '0')}:00`;
            timelineAxis.appendChild(span);
        }

        // Render Track blocks (24 hours total = 100%)
        timelineTrack.innerHTML = '';

        const phases = [
            { name: 'Early Morning (Melatonin High)', start: 0, end: 6, color: '#312e81', text: '00:00 - 06:00', cct: '2200K', nits: 'Off / Low', prot: 'Maximum' },
            { name: 'Morning Ramp & Awakening', start: 6, end: startFraction, color: '#0369a1', text: '06:00 - Start', cct: '5000K', nits: 'Medium', prot: 'High' },
            { name: 'Deep Work Focus Window', start: startFraction, end: endFraction, color: '#38bdf8', text: `${startStr} - ${endStr}`, cct: '4500K', nits: 'Optimal', prot: 'Balanced' },
            { name: 'Evening Wind-Down', start: endFraction, end: 22, color: '#f59e0b', text: `${endStr} - 22:00`, cct: '3000K', nits: 'Dim', prot: 'Strong' },
            { name: 'Night Melatonin Synthesis', start: 22, end: 24, color: '#4c1d95', text: '22:00 - 24:00', cct: '1800K', nits: 'Minimal', prot: 'Maximum' }
        ];

        scheduleTbody.innerHTML = '';

        phases.forEach(phase => {
            const duration = phase.end - phase.start;
            if (duration <= 0) return;

            const widthPct = (duration / 24) * 100;

            const block = document.createElement('div');
            block.className = 'timeline-block';
            block.style.width = `${widthPct}%`;
            block.style.backgroundColor = phase.color;
            block.style.color = (phase.color === '#38bdf8' || phase.color === '#f59e0b') ? '#0f172a' : '#f8fafc';
            block.title = `${phase.name} (${phase.text})`;
            block.textContent = widthPct > 8 ? phase.name.split(' ')[0] : '';
            timelineTrack.appendChild(block);

            // Table row
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${phase.name}</strong><br><small style="color:var(--text-secondary)">${phase.text}</small></td>
                <td>${phase.cct}</td>
                <td>${phase.nits}</td>
                <td><span class="badge" style="background:${phase.color}22; color:${phase.color}">${phase.prot}</span></td>
            `;
            scheduleTbody.appendChild(tr);
        });
    }

    // Event Listeners
    roomTypeSelect.addEventListener('change', (e) => {
        const preset = roomPresets[e.target.value];
        if (preset) {
            monitorNitsInput.value = preset.nits;
            ambientLuxInput.value = preset.lux;
            wallReflectanceSelect.value = preset.reflectance;
            updateValues();
        }
    });

    monitorNitsInput.addEventListener('input', updateValues);
    ambientLuxInput.addEventListener('input', updateValues);
    wallReflectanceSelect.addEventListener('change', updateValues);
    workStartInput.addEventListener('change', updateValues);
    workEndInput.addEventListener('change', updateValues);

    resetBtn.addEventListener('click', () => {
        roomTypeSelect.value = 'home-office';
        const preset = roomPresets['home-office'];
        monitorNitsInput.value = preset.nits;
        ambientLuxInput.value = preset.lux;
        wallReflectanceSelect.value = preset.reflectance;
        workStartInput.value = '09:00';
        workEndInput.value = '18:00';
        localStorage.removeItem('auragrid_settings');
        updateValues();
    });

    // Initialize
    loadSettings();
    updateValues();
});
