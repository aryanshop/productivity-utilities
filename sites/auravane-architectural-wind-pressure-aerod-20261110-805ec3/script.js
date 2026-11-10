document.addEventListener('DOMContentLoaded', () => {
    // State
    let currentUnit = 'imperial'; // 'imperial' or 'metric'
    let savedLogs = [];

    // DOM Elements
    const windSpeedSlider = document.getElementById('windSpeed');
    const windSpeedVal = document.getElementById('windSpeedVal');
    const buildingHeight = document.getElementById('buildingHeight');
    const buildingWidth = document.getElementById('buildingWidth');
    const buildingLength = document.getElementById('buildingLength');
    const roofPitch = document.getElementById('roofPitch');
    const terrainCategory = document.getElementById('terrainCategory');
    const topoFactor = document.getElementById('topoFactor');
    const topoFactorVal = document.getElementById('topoFactorVal');
    const importanceClass = document.getElementById('importanceClass');

    // Labels for units
    const speedUnitLabel = document.getElementById('speedUnitLabel');
    const dimUnitLabel = document.getElementById('dimUnitLabel');
    const pressureUnitLabel = document.getElementById('pressureUnitLabel');
    const designPressureUnitLabel = document.getElementById('designPressureUnitLabel');
    const forceUnitLabel = document.getElementById('forceUnitLabel');
    const momentUnitLabel = document.getElementById('momentUnitLabel');

    // Result outputs
    const resVelocityPressure = document.getElementById('resVelocityPressure');
    const resDesignPressure = document.getElementById('resDesignPressure');
    const resDragForce = document.getElementById('resDragForce');
    const resOverturningMoment = document.getElementById('resOverturningMoment');

    // Buttons
    const resetBtn = document.getElementById('resetBtn');
    const saveLogBtn = document.getElementById('saveLogBtn');
    const clearLogBtn = document.getElementById('clearLogBtn');
    const unitBtns = document.querySelectorAll('.unit-btn');
    const logTableBody = document.getElementById('logTableBody');

    // Canvas
    const canvas = document.getElementById('windCanvas');
    const ctx = canvas.getContext('2d');

    // Sync Sliders and Inputs
    windSpeedSlider.addEventListener('input', (e) => {
        windSpeedVal.value = e.target.value;
        calculateAndRender();
    });

    windSpeedVal.addEventListener('input', (e) => {
        let val = parseFloat(e.target.value) || 0;
        if (val < 40) val = 40;
        if (val > 200) val = 200;
        windSpeedSlider.value = val;
        calculateAndRender();
    });

    topoFactor.addEventListener('input', (e) => {
        topoFactorVal.textContent = parseFloat(e.target.value).toFixed(2);
        calculateAndRender();
    });

    // Input changes
    [buildingHeight, buildingWidth, buildingLength, roofPitch, terrainCategory, importanceClass].forEach(el => {
        el.addEventListener('input', calculateAndRender);
    });

    // Unit Switcher
    unitBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            unitBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const targetUnit = e.target.getAttribute('data-unit');
            if (targetUnit !== currentUnit) {
                convertUnits(targetUnit);
                currentUnit = targetUnit;
                calculateAndRender();
            }
        });
    });

    function convertUnits(newUnit) {
        const h = parseFloat(buildingHeight.value);
        const w = parseFloat(buildingWidth.value);
        const l = parseFloat(buildingLength.value);
        const s = parseFloat(windSpeedVal.value);

        if (newUnit === 'metric') {
            // Imperial to Metric
            buildingHeight.value = (h * 0.3048).toFixed(1);
            buildingWidth.value = (w * 0.3048).toFixed(1);
            buildingLength.value = (l * 0.3048).toFixed(1);
            windSpeedVal.value = Math.round(s * 1.60934);
            windSpeedSlider.min = 60;
            windSpeedSlider.max = 320;
            windSpeedSlider.value = windSpeedVal.value;

            speedUnitLabel.textContent = 'km/h';
            dimUnitLabel.textContent = 'm';
            pressureUnitLabel.textContent = 'Pa';
            designPressureUnitLabel.textContent = 'Pa';
            forceUnitLabel.textContent = 'N';
            momentUnitLabel.textContent = 'N-m';
        } else {
            // Metric to Imperial
            buildingHeight.value = Math.round(h / 0.3048);
            buildingWidth.value = Math.round(w / 0.3048);
            buildingLength.value = Math.round(l / 0.3048);
            windSpeedVal.value = Math.round(s / 1.60934);
            windSpeedSlider.min = 40;
            windSpeedSlider.max = 200;
            windSpeedSlider.value = windSpeedVal.value;

            speedUnitLabel.textContent = 'mph';
            dimUnitLabel.textContent = 'ft';
            pressureUnitLabel.textContent = 'psf';
            designPressureUnitLabel.textContent = 'psf';
            forceUnitLabel.textContent = 'lbs';
            momentUnitLabel.textContent = 'ft-lbs';
        }
    }

    // Calculation Logic
    function calculateAndRender() {
        const speed = parseFloat(windSpeedVal.value) || 0;
        const height = parseFloat(buildingHeight.value) || 0;
        const width = parseFloat(buildingWidth.value) || 0;
        const length = parseFloat(buildingLength.value) || 0;
        const pitch = parseFloat(roofPitch.value) || 0;
        const terrain = terrainCategory.value;
        const kzt = parseFloat(topoFactor.value) || 1.0;
        const imp = importanceClass.value;

        // Importance factor (Iw)
        let iw = 1.0;
        if (imp === 'I') iw = 0.87;
        if (imp === 'III') iw = 1.15;
        if (imp === 'IV') iw = 1.15;

        // Exposure coefficient (Kz approximated based on height & terrain)
        let alpha = 9.5; // Category C
        let zg = 900;
        if (terrain === 'B') { alpha = 7.0; zg = 1200; }
        if (terrain === 'D') { alpha = 11.5; zg = 700; }

        const z_effective = Math.max(15, height * (currentUnit === 'metric' ? 3.28084 : 1));
        const kz = 2.01 * Math.pow(z_effective / zg, 2 / alpha);

        let qz, designP, dragForce, overturningMoment;

        if (currentUnit === 'imperial') {
            // qz = 0.00256 * Kz * Kzt * Kd * V^2 (assuming Kd = 0.85 for main wind force)
            qz = 0.00256 * kz * (kzt * kzt) * 0.85 * (speed * speed);
            designP = qz * 1.3 * iw; // Net pressure coefficient approx 1.3
            
            const effectiveAreaHeight = height;
            const effectiveAreaWidth = width;
            dragForce = designP * effectiveAreaWidth * effectiveAreaHeight * 0.8;
            overturningMoment = dragForce * (height / 2);
        } else {
            // Metric: qz in Pascals, speed in km/h -> convert speed to m/s for formula: 0.613 * V^2
            const v_ms = speed / 3.6;
            qz = 0.613 * kz * (kzt * kzt) * 0.85 * (v_ms * v_ms);
            designP = qz * 1.3 * iw;

            const effectiveAreaHeight = height;
            const effectiveAreaWidth = width;
            dragForce = designP * effectiveAreaWidth * effectiveAreaHeight * 0.8;
            overturningMoment = dragForce * (height / 2);
        }

        // Display Results
        resVelocityPressure.textContent = qz.toFixed(2);
        resDesignPressure.textContent = designP.toFixed(2);
        resDragForce.textContent = Math.round(dragForce).toLocaleString();
        resOverturningMoment.textContent = Math.round(overturningMoment).toLocaleString();

        // Draw Canvas
        drawWindVisualization(pitch, height, width, qz, designP);
    }

    // Canvas Visualizer Drawing
    function drawWindVisualization(pitch, height, width, qz, designP) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const w = canvas.width;
        const h = canvas.height;

        // Background Grid
        ctx.strokeStyle = '#1e2533';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += 40) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // Building Geometry on Canvas
        const bWidth = 160;
        const bHeight = 120;
        const startX = 220;
        const startY = 220;

        const pitchRad = (pitch * Math.PI) / 180;
        const roofPeakH = Math.tan(pitchRad) * (bWidth / 2);

        // Draw Building Body
        ctx.fillStyle = '#171c26';
        ctx.strokeStyle = '#273043';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX, startY - bHeight);
        // Roof slope left
        ctx.lineTo(startX + (bWidth / 2), startY - bHeight - roofPeakH);
        // Roof slope right
        ctx.lineTo(startX + bWidth, startY - bHeight);
        ctx.lineTo(startX + bWidth, startY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Draw Wind Streamlines (Left to Right)
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.lineWidth = 2;
        for (let yPos = 80; yPos <= 240; yPos += 30) {
            ctx.beginPath();
            ctx.moveTo(40, yPos);
            if (yPos < startY - bHeight) {
                // Streamline over roof
                ctx.bezierCurveTo(120, yPos, startX + 40, yPos - roofPeakH - 30, w - 40, yPos - 15);
            } else if (yPos > startY - bHeight && yPos < startY) {
                // Streamline hitting windward wall and deflecting
                ctx.lineTo(startX, yPos);
                ctx.lineTo(startX - 10, yPos - 20); // Deflection up
            } else {
                ctx.lineTo(w - 40, yPos);
            }
            ctx.stroke();
        }

        // Draw Pressure Indicators (Arrows)
        // Windward positive pressure arrows (pushing in)
        ctx.fillStyle = '#ef4444';
        for (let ay = startY - 90; ay <= startY - 30; ay += 30) {
            drawArrow(ctx, startX - 45, ay, startX, ay, '#ef4444');
        }

        // Leeward suction arrows (pulling out)
        ctx.fillStyle = '#3b82f6';
        for (let ay = startY - 90; ay <= startY - 30; ay += 30) {
            drawArrow(ctx, startX + bWidth, ay, startX + bWidth + 45, ay, '#3b82f6');
        }

        // Roof suction arrows
        drawArrow(ctx, startX + 40, startY - bHeight - roofPeakH / 2 - 10, startX + 40, startY - bHeight - roofPeakH / 2 - 40, '#3b82f6');
    }

    function drawArrow(ctx, fromX, fromY, toX, toY, color) {
        const headLength = 8;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
    }

    // Reset Defaults
    resetBtn.addEventListener('click', () => {
        currentUnit = 'imperial';
        unitBtns.forEach(b => b.classList.remove('active'));
        unitBtns[0].classList.add('active');

        speedUnitLabel.textContent = 'mph';
        dimUnitLabel.textContent = 'ft';
        pressureUnitLabel.textContent = 'psf';
        designPressureUnitLabel.textContent = 'psf';
        forceUnitLabel.textContent = 'lbs';
        momentUnitLabel.textContent = 'ft-lbs';

        windSpeedSlider.min = 40;
        windSpeedSlider.max = 200;
        windSpeedSlider.value = 90;
        windSpeedVal.value = 90;

        buildingHeight.value = 35;
        buildingWidth.value = 40;
        buildingLength.value = 60;
        roofPitch.value = 25;
        terrainCategory.value = 'C';
        topoFactor.value = 1.0;
        topoFactorVal.textContent = '1.00';
        importanceClass.value = 'II';

        calculateAndRender();
    });

    // Save Simulation to Log
    saveLogBtn.addEventListener('click', () => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const logItem = {
            time: timeStr,
            speed: `${windSpeedVal.value} ${speedUnitLabel.textContent}`,
            dimensions: `${buildingHeight.value}×${buildingWidth.value}×${buildingLength.value} ${dimUnitLabel.textContent}`,
            terrain: `Cat ${terrainCategory.value}`,
            designPressure: `${resDesignPressure.textContent} ${designPressureUnitLabel.textContent}`,
            dragForce: `${resDragForce.textContent} ${forceUnitLabel.textContent}`
        };

        savedLogs.unshift(logItem);
        renderLogTable();
    });

    clearLogBtn.addEventListener('click', () => {
        savedLogs = [];
        renderLogTable();
    });

    function renderLogTable() {
        if (savedLogs.length === 0) {
            logTableBody.innerHTML = `<tr class="empty-row"><td colspan="6">No saved simulations yet. Click 'Save Simulation' to record current results.</td></tr>`;
            return;
        }

        logTableBody.innerHTML = savedLogs.map(item => `
            <tr>
                <td>${item.time}</td>
                <td>${item.speed}</td>
                <td>${item.dimensions}</td>
                <td>${item.terrain}</td>
                <td>${item.designPressure}</td>
                <td>${item.dragForce}</td>
            </tr>
        `).join('');
    }

    // Initial calculation
    calculateAndRender();
});
