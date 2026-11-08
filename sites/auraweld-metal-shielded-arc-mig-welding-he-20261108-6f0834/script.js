document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const processSelect = document.getElementById('weld-process');
    const shieldGasSelect = document.getElementById('shield-gas');
    const thermalEffInput = document.getElementById('thermal-efficiency');
    const ampsInput = document.getElementById('arc-amps');
    const voltsInput = document.getElementById('arc-volts');
    const speedInput = document.getElementById('travel-speed');
    const steelGradeSelect = document.getElementById('steel-grade');
    const plateThicknessInput = document.getElementById('plate-thickness');
    const jointTypeSelect = document.getElementById('joint-type');
    const interpassInput = document.getElementById('interpass-temp');

    const resHeatInput = document.getElementById('res-heat-input');
    const resArcEnergy = document.getElementById('res-arc-energy');
    const resCooling = document.getElementById('res-cooling');
    const hazStatusBadge = document.getElementById('haz-status');
    const advisoryList = document.getElementById('advisory-list');

    const canvas = document.getElementById('hazCanvas');
    const ctx = canvas.getContext('2d');

    const btnReset = document.getElementById('btn-reset');
    const btnExport = document.getElementById('btn-export');
    const btnLogRun = document.getElementById('btn-log-run');
    const logTbody = document.getElementById('log-tbody');

    let savedRuns = [];

    // Preset efficiencies based on process selection
    const defaultEfficiencies = {
        'GMAW': 0.80,
        'GTAW': 0.60,
        'SMAW': 0.90,
        'FCAW': 0.85
    };

    processSelect.addEventListener('change', () => {
        const proc = processSelect.value;
        if (defaultEfficiencies[proc] !== undefined) {
            thermalEffInput.value = defaultEfficiencies[proc];
        }
        calculateAndRender();
    });

    // Input event listeners
    const inputs = [shieldGasSelect, thermalEffInput, ampsInput, voltsInput, speedInput, steelGradeSelect, plateThicknessInput, jointTypeSelect, interpassInput];
    inputs.forEach(input => {
        input.addEventListener('input', calculateAndRender);
    });

    btnReset.addEventListener('click', () => {
        processSelect.value = 'GMAW';
        shieldGasSelect.value = '75Ar25CO2';
        thermalEffInput.value = '0.80';
        ampsInput.value = '180';
        voltsInput.value = '24.0';
        speedInput.value = '8.0';
        steelGradeSelect.value = 'A36';
        plateThicknessInput.value = '0.375';
        jointTypeSelect.value = 'Fillet';
        interpassInput.value = '350';
        calculateAndRender();
    });

    btnLogRun.addEventListener('click', () => {
        const amps = parseFloat(ampsInput.value) || 0;
        const volts = parseFloat(voltsInput.value) || 0;
        const speed = parseFloat(speedInput.value) || 1;
        const eff = parseFloat(thermalEffInput.value) || 0.8;
        const arcEnergy = (amps * volts * 60) / (speed * 1000);
        const heatInput = arcEnergy * eff;
        const cooling = calculateCoolingRate(heatInput, parseFloat(plateThicknessInput.value));

        const runItem = {
            process: processSelect.value,
            amps,
            volts,
            speed,
            heatInput: heatInput.toFixed(1),
            cooling: cooling.toFixed(1),
            id: Date.now()
        };

        savedRuns.unshift(runItem);
        renderLogTable();
    });

    btnExport.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedRuns, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "auraweld_session_report.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    function calculateCoolingRate(heatInput, thickness) {
        // Simplified t8/5 cooling rate estimation (sec)
        // Proportional to heat input squared divided by thickness factor
        let baseTime = (heatInput * heatInput) / (thickness * 1200 + 200);
        return Math.max(2.0, Math.min(120.0, baseTime));
    }

    function calculateAndRender() {
        const amps = parseFloat(ampsInput.value) || 0;
        const volts = parseFloat(voltsInput.value) || 0;
        const speed = parseFloat(speedInput.value) || 1;
        const eff = parseFloat(thermalEffInput.value) || 0.8;
        const thickness = parseFloat(plateThicknessInput.value) || 0.375;
        const steelGrade = steelGradeSelect.value;

        // Formulas:
        // Arc Energy (kJ/in) = (Amps * Volts * 60) / (Travel Speed in/min * 1000)
        const arcEnergy = (amps * volts * 60) / (speed * 1000);
        // Heat Input (kJ/in) = Arc Energy * Thermal Efficiency
        const heatInput = arcEnergy * eff;

        const coolingRate = calculateCoolingRate(heatInput, thickness);

        // Update metrics
        resHeatInput.textContent = heatInput.toFixed(1);
        resArcEnergy.textContent = arcEnergy.toFixed(1);
        resCooling.textContent = coolingRate.toFixed(1);

        // Advisory & Badge evaluation
        let advisories = [];
        let statusType = 'optimal';
        let statusText = 'Optimal Heat Range';

        // Carbon Equivalents
        let ceMap = { 'A36': 0.26, 'A572': 0.38, '4140': 0.72, 'Stainless304': 0.15 };
        let currentCE = ceMap[steelGrade] || 0.30;

        if (currentCE > 0.45 && heatInput < 25.0) {
            statusType = 'danger';
            statusText = 'Risk of Hydrogen Cracking';
            advisories.push('High Carbon Equivalent (CE > 0.45) with low heat input increases martensite formation and hydrogen cracking risk. Preheating is strongly recommended.');
        } else if (heatInput > 60.0) {
            statusType = 'warning';
            statusText = 'Excessive Heat Input';
            advisories.push('High heat input may cause excessive grain growth in the Heat-Affected Zone (HAZ), reducing impact toughness.');
        } else if (heatInput < 15.0) {
            statusType = 'warning';
            statusText = 'Low Heat Input / Lack of Fusion';
            advisories.push('Low heat input can lead to lack of fusion defects or rapid cooling rates, particularly on thicker sections.');
        } else {
            statusType = 'optimal';
            statusText = 'Balanced Heat Input';
            advisories.push('Heat input parameters are within standard structural fabrication guidelines for moderate carbon steels.');
        }

        if (coolingRate < 6.0 && currentCE > 0.35) {
            advisories.push('Slow cooling rate (t8/5 > 6s) promotes adequate ductility, but verify interpass temperature limits.');
        } else if (coolingRate > 30.0) {
            advisories.push('Rapid cooling detected. Watch for micro-hardness spikes in the HAZ.');
        }

        if (shieldGasSelect.value === '100CO2') {
            advisories.push('100% CO2 shielding gas provides deep penetration and rugged arc drive, but causes increased spatter compared to Argon-blend mixes.');
        } else if (shieldGasSelect.value === '100Ar' && processSelect.value === 'GMAW') {
            advisories.push('Warning: 100% Argon for GMAW on steel causes severe undercut and unstable arc behavior. Use Ar/CO2 blends.');
        }

        hazStatusBadge.textContent = statusText;
        hazStatusBadge.className = 'badge ' + statusType;

        advisoryList.innerHTML = advisories.map(adv => `<li>${adv}</li>`).join('');

        drawHazCanvas(heatInput, thickness);
    }

    function drawHazCanvas(heatInput, thickness) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Background grid lines
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 30) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += 30) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        // Center coordinates
        const cx = w / 2;
        const cy = h / 2 - 20;

        // Base metal plate representation
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.roundRect(cx - 180, cy - 40, 360, 110, 8);
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.stroke();

        // HAZ zone sizing proportional to heat input
        let hazRadiusX = Math.min(120, 50 + heatInput * 1.2);
        let hazRadiusY = Math.min(75, 30 + heatInput * 0.8);

        // Draw HAZ (Heat Affected Zone - Magenta glow)
        let hazGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, hazRadiusX);
        hazGrad.addColorStop(0, 'rgba(236, 72, 153, 0.8)');
        hazGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.4)');
        hazGrad.addColorStop(1, 'transparent');

        ctx.fillStyle = hazGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, hazRadiusX, hazRadiusY, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw Weld Deposit / Bead (Gold/Orange)
        let weldRadiusX = Math.min(60, 20 + heatInput * 0.5);
        let weldRadiusY = Math.min(35, 12 + heatInput * 0.3);

        let weldGrad = ctx.createRadialGradient(cx, cy - 5, 2, cx, cy, weldRadiusX);
        weldGrad.addColorStop(0, '#fde047');
        weldGrad.addColorStop(0.7, '#f59e0b');
        weldGrad.addColorStop(1, '#b45309');

        ctx.fillStyle = weldGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy - 5, weldRadiusX, weldRadiusY, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Dimension indicator
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`Plate Cross-Section (${(thickness * 25.4).toFixed(1)} mm nominal)`, cx, cy + 95);
    }

    function renderLogTable() {
        if (savedRuns.length === 0) {
            logTbody.innerHTML = `<tr class="empty-row"><td colspan="6">No runs logged yet. Click 'Log Current Run' to record.</td></tr>`;
            return;
        }

        logTbody.innerHTML = savedRuns.map(run => `
            <tr>
                <td><strong>${run.process}</strong></td>
                <td>${run.amps}A / ${run.volts}V</td>
                <td>${run.speed} in/min</td>
                <td><span style="color: #f59e0b; font-weight: 600;">${run.heatInput} kJ/in</span></td>
                <td>${run.cooling} s</td>
                <td><button class="btn secondary sm" onclick="window.removeRun(${run.id})">Delete</button></td>
            </tr>
        `).join('');
    }

    window.removeRun = function(id) {
        savedRuns = savedRuns.filter(r => r.id !== id);
        renderLogTable();
    };

    // Initial calculation run
    calculateAndRender();
});
