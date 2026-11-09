document.addEventListener('DOMContentLoaded', () => {
    // Wire resistance data (Ohms per 1,000 feet at 25°C)
    const WIRE_DATA = {
        '14': { copper: 3.07, aluminum: 5.05 },
        '12': { copper: 1.93, aluminum: 3.18 },
        '10': { copper: 1.21, aluminum: 2.00 },
        '8':  { copper: 0.764, aluminum: 1.26 },
        '6':  { copper: 0.491, aluminum: 0.808 },
        '4':  { copper: 0.308, aluminum: 0.508 },
        '2':  { copper: 0.194, aluminum: 0.319 },
        '1':  { copper: 0.154, aluminum: 0.253 },
        '1/0':{ copper: 0.122, aluminum: 0.201 },
        '2/0':{ copper: 0.0967, aluminum: 0.159 },
        '4/0':{ copper: 0.0608, aluminum: 0.100 }
    };

    const GAUGE_ORDER = ['14', '12', '10', '8', '6', '4', '2', '1', '1/0', '2/0', '4/0'];

    // DOM Elements
    const systemVoltageEl = document.getElementById('systemVoltage');
    const wireLengthEl = document.getElementById('wireLength');
    const lengthUnitEl = document.getElementById('lengthUnit');
    const currentAmpsEl = document.getElementById('currentAmps');
    const conductorMaterialEl = document.getElementById('conductorMaterial');
    const targetDropEl = document.getElementById('targetDrop');
    const wireGaugeEl = document.getElementById('wireGauge');

    const resDropVoltsEl = document.getElementById('resDropVolts');
    const resDropPercentEl = document.getElementById('resDropPercent');
    const resDeliveredVoltageEl = document.getElementById('resDeliveredVoltage');
    const resPowerLossEl = document.getElementById('resPowerLoss');
    const resEnergyWasteEl = document.getElementById('resEnergyWaste');
    const resResistanceEl = document.getElementById('resResistance');
    const resRecGaugeEl = document.getElementById('resRecGauge');

    const statusBanner = document.getElementById('statusBanner');
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.getElementById('statusText');

    const btnSavePreset = document.getElementById('btnSavePreset');
    const btnAutoSelect = document.getElementById('btnAutoSelect');
    const btnClearPresets = document.getElementById('btnClearPresets');
    const presetTableBody = document.getElementById('presetTableBody');
    const dropCanvas = document.getElementById('dropCanvas');

    // Storage for presets
    let savedPresets = JSON.parse(localStorage.getItem('auraslate_presets')) || [
        { name: 'Solar Panels to MPPT', voltage: 48, length: 35, unit: 'feet', amps: 22, material: 'copper', gauge: '10', dropPct: 1.2 },
        { name: 'Battery to Inverter', voltage: 12, length: 6, unit: 'feet', amps: 150, material: 'copper', gauge: '2/0', dropPct: 1.8 }
    ];

    function calculateCircuit() {
        const V = parseFloat(systemVoltageEl.value) || 12;
        let L = parseFloat(wireLengthEl.value) || 10;
        const unit = lengthUnitEl.value;
        const I = parseFloat(currentAmpsEl.value) || 10;
        const material = conductorMaterialEl.value;
        const maxAllowedDropPct = parseFloat(targetDropEl.value) || 2;
        const gauge = wireGaugeEl.value;

        // Convert meters to feet for standard AWG resistance tables (1 meter = 3.28084 feet)
        let oneWayFeet = (unit === 'meters') ? L * 3.28084 : L;

        // Round trip length in feet
        const roundTripFeet = oneWayFeet * 2;

        // Get resistance per 1000 ft
        const ohmsPer1000Ft = WIRE_DATA[gauge] ? WIRE_DATA[gauge][material] : 0.491;

        // Total Resistance
        const totalResistance = (roundTripFeet / 1000) * ohmsPer1000Ft;

        // Voltage Drop = I * R
        const dropVolts = I * totalResistance;
        const dropPercent = (dropVolts / V) * 100;
        const deliveredVoltage = Math.max(0, V - dropVolts);

        // Power Loss in Watts (P = I^2 * R)
        const powerLossWatts = Math.pow(I, 2) * totalResistance;
        // Estimated annual kWh loss assuming 4 hours/day equivalent full load
        const annualKWhLoss = (powerLossWatts * 4 * 365) / 1000;

        // Find minimum recommended gauge for max allowed drop
        let minGauge = gauge;
        for (let g of GAUGE_ORDER) {
            const r1000 = WIRE_DATA[g][material];
            const testRes = (roundTripFeet / 1000) * r1000;
            const testDropPct = ((I * testRes) / V) * 100;
            if (testDropPct <= maxAllowedDropPct) {
                minGauge = g;
                break;
            }
        }

        // Update UI Metrics
        resDropVoltsEl.textContent = dropVolts.toFixed(2) + ' V';
        resDropPercentEl.textContent = '(' + dropPercent.toFixed(2) + '%)';
        resDeliveredVoltageEl.textContent = deliveredVoltage.toFixed(2) + ' V';
        resPowerLossEl.textContent = powerLossWatts.toFixed(1) + ' W';
        resEnergyWasteEl.textContent = annualKWhLoss.toFixed(1) + ' kWh / yr (est)';
        resResistanceEl.textContent = totalResistance.toFixed(4) + ' Ω';
        resRecGaugeEl.textContent = 'Min Safe Gauge: ' + minGauge + ' AWG';

        // Update status banner
        if (dropPercent <= maxAllowedDropPct) {
            statusDot.className = 'status-dot success';
            statusText.textContent = `Safe: Voltage drop (${dropPercent.toFixed(1)}%) is within your target limit of ${maxAllowedDropPct}%.`;
        } else {
            statusDot.className = 'status-dot danger';
            statusText.textContent = `Warning: Voltage drop (${dropPercent.toFixed(1)}%) exceeds target limit (${maxAllowedDropPct}%). Consider upgrading wire gauge.`;
        }

        drawChart(oneWayFeet, I, material, V, maxAllowedDropPct, gauge);
    }

    function drawChart(oneWayFeet, I, material, V, maxAllowedDropPct, currentGauge) {
        if (!dropCanvas.getContext) return;
        const ctx = dropCanvas.getContext('2d');
        const width = dropCanvas.width;
        const height = dropCanvas.height;

        ctx.clearRect(0, 0, width, height);

        // Background
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);

        const roundTripFeet = oneWayFeet * 2;
        const barWidth = width / GAUGE_ORDER.length;

        // Find max drop for scaling
        let maxDrop = 0;
        const drops = GAUGE_ORDER.map(g => {
            const r = (roundTripFeet / 1000) * WIRE_DATA[g][material];
            const dPct = ((I * r) / V) * 100;
            if (dPct > maxDrop) maxDrop = dPct;
            return dPct;
        });

        const chartMaxY = Math.max(maxDrop * 1.2, maxAllowedDropPct * 1.5, 5);

        // Draw target line
        const targetY = height - (maxAllowedDropPct / chartMaxY) * (height - 40) - 20;
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, targetY);
        ctx.lineTo(width, targetY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw bars
        GAUGE_ORDER.forEach((g, index) => {
            const dPct = drops[index];
            const barH = (dPct / chartMaxY) * (height - 40);
            const x = index * barWidth + 6;
            const y = height - barH - 20;
            const w = barWidth - 12;

            // Bar color
            if (g === currentGauge) {
                ctx.fillStyle = '#38bdf8';
            } else if (dPct <= maxAllowedDropPct) {
                ctx.fillStyle = '#22c55e';
            } else {
                ctx.fillStyle = '#334155';
            }

            ctx.fillRect(x, y, w, barH);

            // Label
            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(g, x + w / 2, height - 6);

            // Percentage text on top of bar if fits
            if (barH > 25) {
                ctx.fillStyle = '#f8fafc';
                ctx.fillText(dPct.toFixed(1) + '%', x + w / 2, y + 14);
            }
        });
    }

    // Auto-select minimum gauge button
    btnAutoSelect.addEventListener('click', () => {
        const V = parseFloat(systemVoltageEl.value) || 12;
        let L = parseFloat(wireLengthEl.value) || 10;
        const unit = lengthUnitEl.value;
        const I = parseFloat(currentAmpsEl.value) || 10;
        const material = conductorMaterialEl.value;
        const maxAllowedDropPct = parseFloat(targetDropEl.value) || 2;
        let oneWayFeet = (unit === 'meters') ? L * 3.28084 : L;
        let roundTripFeet = oneWayFeet * 2;

        for (let g of GAUGE_ORDER) {
            const r1000 = WIRE_DATA[g][material];
            const testRes = (roundTripFeet / 1000) * r1000;
            const testDropPct = ((I * testRes) / V) * 100;
            if (testDropPct <= maxAllowedDropPct) {
                wireGaugeEl.value = g;
                break;
            }
        }
        calculateCircuit();
    });

    // Save Preset to local storage
    btnSavePreset.addEventListener('click', () => {
        const namePrompt = prompt('Enter a name for this circuit preset:', 'Solar Array Run');
        if (!namePrompt) return;

        const V = parseFloat(systemVoltageEl.value);
        const L = parseFloat(wireLengthEl.value);
        const unit = lengthUnitEl.value;
        const I = parseFloat(currentAmpsEl.value);
        const material = conductorMaterialEl.value;
        const gauge = wireGaugeEl.value;

        let oneWayFeet = (unit === 'meters') ? L * 3.28084 : L;
        const dropPct = (((I * ((oneWayFeet * 2) / 1000) * WIRE_DATA[gauge][material]) / V) * 100);

        savedPresets.unshift({
            name: namePrompt,
            voltage: V,
            length: L,
            unit: unit,
            amps: I,
            material: material,
            gauge: gauge,
            dropPct: parseFloat(dropPct.toFixed(2))
        });

        localStorage.setItem('auraslate_presets', JSON.stringify(savedPresets));
        renderPresets();
    });

    btnClearPresets.addEventListener('click', () => {
        savedPresets = [];
        localStorage.removeItem('auraslate_presets');
        renderPresets();
    });

    function renderPresets() {
        presetTableBody.innerHTML = '';
        if (savedPresets.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="7" style="text-align: center; color: var(--text-secondary);">No saved circuit presets.</td>`;
            presetTableBody.appendChild(tr);
            return;
        }

        savedPresets.forEach((p, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${escapeHtml(p.name)}</strong></td>
                <td>${p.voltage}V DC</td>
                <td>${p.length} ${p.unit}</td>
                <td>${p.amps} A</td>
                <td>${p.gauge} AWG (${p.material})</td>
                <td>${p.dropPct}%</td>
                <td><button class="btn text-btn load-btn" data-idx="${idx}">Load</button></td>
            `;
            presetTableBody.appendChild(tr);
        });

        document.querySelectorAll('.load-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-idx'));
                const p = savedPresets[idx];
                if (p) {
                    systemVoltageEl.value = p.voltage;
                    wireLengthEl.value = p.length;
                    lengthUnitEl.value = p.unit;
                    currentAmpsEl.value = p.amps;
                    conductorMaterialEl.value = p.material;
                    wireGaugeEl.value = p.gauge;
                    calculateCircuit();
                }
            });
        });
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }

    // Event listeners on inputs
    [systemVoltageEl, wireLengthEl, lengthUnitEl, currentAmpsEl, conductorMaterialEl, targetDropEl, wireGaugeEl].forEach(el => {
        el.addEventListener('input', calculateCircuit);
        el.addEventListener('change', calculateCircuit);
    });

    // Initial run
    renderPresets();
    calculateCircuit();
});
