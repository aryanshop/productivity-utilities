document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const maxKnotInput = document.getElementById('max-knot');
    const maxKnotVal = document.getElementById('max-knot-val');
    const tidalTypeSelect = document.getElementById('tidal-type');
    const transitThresholdInput = document.getElementById('transit-threshold');
    const transitThresholdVal = document.getElementById('transit-threshold-val');
    const vesselSpeedInput = document.getElementById('vessel-speed');
    const channelWidthInput = document.getElementById('channel-width');
    const windAssistCheckbox = document.getElementById('enable-wind-assist');
    const btnCalculate = document.getElementById('btn-calculate');
    const btnReset = document.getElementById('btn-reset');
    const btnExport = document.getElementById('btn-export');
    const btnSaveLog = document.getElementById('btn-save-log');
    
    // Metric elements
    const metricMaxEbb = document.getElementById('metric-max-ebb');
    const metricMaxFlood = document.getElementById('metric-max-flood');
    const metricWindows = document.getElementById('metric-windows');
    const metricSog = document.getElementById('metric-sog');

    // Canvas
    const canvas = document.getElementById('tideCanvas');
    const ctx = canvas.getContext('2d');

    // Tabs
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Tables
    const twelfthsTbody = document.querySelector('#twelfths-table tbody');
    const logTbody = document.querySelector('#log-table tbody');

    // Local storage key
    const STORAGE_KEY = 'auratide_session_logs_v1';

    // Tab switching
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Range value live updates
    maxKnotInput.addEventListener('input', () => {
        maxKnotVal.textContent = parseFloat(maxKnotInput.value).toFixed(1) + ' kt';
    });

    transitThresholdInput.addEventListener('input', () => {
        transitThresholdVal.textContent = parseFloat(transitThresholdInput.value).toFixed(2) + ' kt';
    });

    // Main calculation & rendering function
    function runSimulation() {
        let maxKnot = parseFloat(maxKnotInput.value);
        const tidalType = tidalTypeSelect.value;
        const threshold = parseFloat(transitThresholdInput.value);
        const vesselSpeed = parseFloat(vesselSpeedInput.value);
        const windAssist = windAssistCheckbox.checked ? 0.5 : 0.0;

        // Apply tidal multipliers
        if (tidalType === 'spring') maxKnot *= 1.3;
        if (tidalType === 'neap') maxKnot *= 0.7;

        // Metrics update
        metricMaxEbb.textContent = `-${maxKnot.toFixed(1)} kt`;
        metricMaxFlood.textContent = `+${maxKnot.toFixed(1)} kt`;

        const sogMin = Math.max(0, vesselSpeed - maxKnot - windAssist);
        const sogMax = vesselSpeed + maxKnot + windAssist;
        metricSog.textContent = `${sogMin.toFixed(1)} - ${sogMax.toFixed(1)} kt`;

        // Estimate safe transit windows (hours out of 12 hours cycle where current < threshold)
        // Approximation based on sinusoidal curve: current = maxKnot * sin(t)
        let safeHours = 0;
        const totalCycleHours = 12.4;
        for (let t = 0; t <= totalCycleHours; t += 0.1) {
            const currentVel = Math.abs(maxKnot * Math.sin((t / totalCycleHours) * 2 * Math.PI));
            if (currentVel <= threshold) {
                safeHours += 0.1;
            }
        }
        const safeH = Math.floor(safeHours);
        const safeM = Math.round((safeHours - safeH) * 60);
        metricWindows.textContent = `${safeH}h ${safeM}m per cycle`;

        // Draw Canvas Curve
        drawTidalCurve(maxKnot, threshold, totalCycleHours);

        // Populate Rule of Twelfths table
        populateTwelfths(maxKnot, threshold);
    }

    function drawTidalCurve(maxKnot, threshold, cycleHours) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const w = canvas.width;
        const h = canvas.height;
        const padding = 40;
        const graphWidth = w - padding * 2;
        const graphHeight = h - padding * 2;

        // Background grid
        ctx.strokeStyle = '#2a3a5e';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        // Horizontal zero line
        const centerY = padding + graphHeight / 2;
        ctx.beginPath();
        ctx.moveTo(padding, centerY);
        ctx.lineTo(w - padding, centerY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Threshold lines (+/-)
        const scaleY = (graphHeight / 2) / (maxKnot * 1.3 || 1);
        const threshPixelOffset = threshold * scaleY;

        ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
        ctx.beginPath();
        ctx.moveTo(padding, centerY - threshPixelOffset);
        ctx.lineTo(w - padding, centerY - threshPixelOffset);
        ctx.moveTo(padding, centerY + threshPixelOffset);
        ctx.lineTo(w - padding, centerY + threshPixelOffset);
        ctx.stroke();

        // Draw Sine Tidal Curve
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 3;
        ctx.beginPath();

        const steps = 150;
        for (let i = 0; i <= steps; i++) {
            const t = (i / steps) * cycleHours;
            const val = maxKnot * Math.sin((t / cycleHours) * 2 * Math.PI);
            const x = padding + (i / steps) * graphWidth;
            const y = centerY - (val * scaleY);

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Labels & Legend
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px system-ui';
        ctx.fillText('Slack Water', padding, centerY - 10);
        ctx.fillText('Max Ebb (-)', padding, padding + 12);
        ctx.fillText('Max Flood (+)', padding, h - 10);
    }

    function populateTwelfths(maxKnot, threshold) {
        twelfthsTbody.innerHTML = '';
        // Rule of twelfths standard fractions: 1/12, 2/12, 3/12, 3/12, 2/12, 1/12
        const fractions = [
            { period: 'Hour 1 (Slack to 1st)', frac: '1/12', multiplier: 0.083 },
            { period: 'Hour 2 (1st to 2nd)', frac: '2/12', multiplier: 0.167 },
            { period: 'Hour 3 (2nd to Max)', frac: '3/12', multiplier: 0.250 },
            { period: 'Hour 4 (Max to 4th)', frac: '3/12', multiplier: 0.250 },
            { period: 'Hour 5 (4th to 5th)', frac: '2/12', multiplier: 0.167 },
            { period: 'Hour 6 (5th to Slack)', frac: '1/12', multiplier: 0.083 },
        ];

        fractions.forEach(item => {
            const tr = document.createElement('tr');
            const speedVal = (maxKnot * item.multiplier * 4).toFixed(2); // approximate peak scaling
            const isSafe = speedVal <= threshold;

            tr.innerHTML = `
                <td>${item.period}</td>
                <td>${item.frac}</td>
                <td>${speedVal} kt</td>
                <td class="${isSafe ? 'status-safe' : 'status-danger'}">${isSafe ? 'Safe Transit' : 'Caution / High Flow'}</td>
            `;
            twelfthsTbody.appendChild(tr);
        });
    }

    // Session logs management
    function loadLogs() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;
        try {
            const logs = JSON.parse(saved);
            logTbody.innerHTML = '';
            logs.forEach((log, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${log.time}</td>
                    <td>${log.maxKnot} kt</td>
                    <td>${log.type}</td>
                    <td>${log.window}</td>
                    <td><button class="btn secondary" style="padding:2px 8px; font-size:0.75rem;" data-index="${index}">Delete</button></td>
                `;
                logTbody.appendChild(tr);
            });
        } catch (e) {
            console.error(e);
        }
    }

    btnSaveLog.addEventListener('click', () => {
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const newLog = {
            time: now,
            maxKnot: parseFloat(maxKnotInput.value).toFixed(1),
            type: tidalTypeSelect.value,
            window: metricWindows.textContent
        };

        let logs = [];
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try { logs = JSON.parse(saved); } catch (e) {}
        }
        logs.unshift(newLog);
        if (logs.length > 20) logs.pop();

        localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
        loadLogs();
        alert('Current simulation state saved to session log.');
    });

    logTbody.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const index = parseInt(e.target.getAttribute('data-index'), 10);
            let logs = [];
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try { logs = JSON.parse(saved); } catch (err) {}
            }
            logs.splice(index, 1);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
            loadLogs();
        }
    });

    btnExport.addEventListener('click', () => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
            alert('No logs available to export.');
            return;
        }
        const blob = new Blob([saved], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'auratide-simulation-logs.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    btnReset.addEventListener('click', () => {
        maxKnotInput.value = 3.5;
        maxKnotVal.textContent = '3.5 kt';
        tidalTypeSelect.value = 'semi-diurnal';
        transitThresholdInput.value = 2.0;
        transitThresholdVal.textContent = '2.00 kt';
        vesselSpeedInput.value = 6;
        channelWidthInput.value = 450;
        windAssistCheckbox.checked = false;
        runSimulation();
    });

    btnCalculate.addEventListener('click', runSimulation);

    // Initial run
    runSimulation();
    loadLogs();
});
