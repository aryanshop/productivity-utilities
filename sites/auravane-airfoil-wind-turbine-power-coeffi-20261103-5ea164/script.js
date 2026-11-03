document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const inputs = {
        windSpeed: document.getElementById('windSpeed'),
        airDensity: document.getElementById('airDensity'),
        ambientTemp: document.getElementById('ambientTemp'),
        bladeRadius: document.getElementById('bladeRadius'),
        bladeCount: document.getElementById('bladeCount'),
        pitchAngle: document.getElementById('pitchAngle'),
        rotorRpm: document.getElementById('rotorRpm'),
        generatorEfficiency: document.getElementById('generatorEfficiency'),
        systemVoltage: document.getElementById('systemVoltage')
    };

    const displays = {
        windSpeed: document.getElementById('val-windSpeed'),
        airDensity: document.getElementById('val-airDensity'),
        bladeRadius: document.getElementById('val-bladeRadius'),
        pitchAngle: document.getElementById('val-pitchAngle'),
        rotorRpm: document.getElementById('val-rotorRpm'),
        generatorEfficiency: document.getElementById('val-generatorEfficiency'),

        sweptArea: document.getElementById('out-sweptArea'),
        windPower: document.getElementById('out-windPower'),
        electricalPower: document.getElementById('out-electricalPower'),
        tsr: document.getElementById('out-tsr'),
        cp: document.getElementById('out-cp'),
        current: document.getElementById('out-current'),
        statusBadge: document.getElementById('status-badge'),
        insightList: document.getElementById('insight-list')
    };

    const btnReset = document.getElementById('btn-preset-reset');
    const btnExport = document.getElementById('btn-export');

    const turbineCanvas = document.getElementById('turbineCanvas');
    const turbineCtx = turbineCanvas.getContext('2d');
    const curveCanvas = document.getElementById('curveCanvas');
    const curveCtx = curveCanvas.getContext('2d');

    let animationFrameId;
    let rotationAngle = 0;

    // Default values mapping for reset
    const defaultValues = {
        windSpeed: 12,
        airDensity: 1.225,
        ambientTemp: 15,
        bladeRadius: 2.5,
        bladeCount: '3',
        pitchAngle: 3,
        rotorRpm: 65,
        generatorEfficiency: 85,
        systemVoltage: '48'
    };

    function formatNumber(num, decimals = 2) {
        if (isNaN(num) || !isFinite(num)) return '0.00';
        return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }

    function calculatePhysics() {
        const v = parseFloat(inputs.windSpeed.value);
        const rho = parseFloat(inputs.airDensity.value);
        const r = parseFloat(inputs.bladeRadius.value);
        const blades = parseInt(inputs.bladeCount.value);
        const pitch = parseFloat(inputs.pitchAngle.value);
        const rpm = parseFloat(inputs.rotorRpm.value);
        const genEff = parseFloat(inputs.generatorEfficiency.value) / 100;
        const voltage = parseFloat(inputs.systemVoltage.value);

        // 1. Swept Area (A = pi * r^2)
        const A = Math.PI * Math.pow(r, 2);

        // 2. Available Wind Power (P_wind = 0.5 * rho * A * v^3)
        const pWind = 0.5 * rho * A * Math.pow(v, 3);

        // 3. Tip Speed Ratio (TSR lambda = (omega * r) / v)
        const omega = (rpm * 2 * Math.PI) / 60;
        const tipSpeed = omega * r;
        const tsr = v > 0 ? tipSpeed / v : 0;

        // 4. Power Coefficient (Cp estimation based on TSR and pitch)
        // Approximation model for aerodynamic efficiency
        let cp = 0.517 * (116 / (tsr + 0.08 * pitch) - 0.4 * pitch - 5) * Math.exp(-21 / (tsr + 0.08 * pitch)) + 0.0068 * tsr;
        // Adjust for blade count factor
        const bladeFactor = 1 - (1 / (blades * 2.5));
        cp = Math.max(0, Math.min(0.593, cp * bladeFactor));

        // If blades are stalled or spinning way too slow/fast
        if (tsr < 0.5 || tsr > 15 || pitch > 25) {
            cp *= 0.3;
        }

        // 5. Mechanical & Electrical Output
        const pMechanical = pWind * cp;
        const pElectrical = pMechanical * genEff;
        const current = voltage > 0 ? pElectrical / voltage : 0;

        return {
            v, rho, r, blades, pitch, rpm, genEff, voltage, A, pWind, tsr, cp, pMechanical, pElectrical, current
        };
    }

    function updateDisplayValues(data) {
        displays.windSpeed.textContent = data.v;
        displays.airDensity.textContent = data.rho;
        displays.bladeRadius.textContent = data.r;
        displays.pitchAngle.textContent = data.pitch;
        displays.rotorRpm.textContent = data.rpm;
        displays.generatorEfficiency.textContent = Math.round(data.genEff * 100);

        displays.sweptArea.textContent = formatNumber(data.A, 2);
        displays.windPower.textContent = formatNumber(data.pWind, 0);
        displays.electricalPower.textContent = formatNumber(data.pElectrical, 0);
        displays.tsr.textContent = formatNumber(data.tsr, 2);
        displays.cp.textContent = formatNumber(data.cp, 3);
        displays.current.textContent = formatNumber(data.current, 1);

        // Status badge
        if (data.cp > 0.35) {
            displays.statusBadge.textContent = 'High Efficiency';
            displays.statusBadge.style.color = 'var(--accent-green)';
            displays.statusBadge.style.backgroundColor = 'rgba(52, 211, 153, 0.15)';
        } else if (data.cp > 0.15) {
            displays.statusBadge.textContent = 'Nominal Operation';
            displays.statusBadge.style.color = 'var(--accent)';
            displays.statusBadge.style.backgroundColor = 'rgba(56, 189, 248, 0.15)';
        } else {
            displays.statusBadge.textContent = 'Suboptimal / Stalled';
            displays.statusBadge.style.color = 'var(--accent-amber)';
            displays.statusBadge.style.backgroundColor = 'rgba(251, 191, 36, 0.15)';
        }

        generateInsights(data);
    }

    function generateInsights(data) {
        const list = displays.insightList;
        list.innerHTML = '';

        const insights = [];

        if (data.cp >= 0.4) {
            insights.push('Excellent aerodynamic coupling! Operating close to peak wind turbine design thresholds.');
        } else if (data.cp < 0.15) {
            insights.push('Low power coefficient detected. Try adjusting the blade pitch angle or tuning RPM closer to optimal TSR (approx 6-8).');
        }

        if (data.tsr < 4 && data.v > 5) {
            insights.push('Tip Speed Ratio is low. The rotor may be under-speeding for the current wind velocity, leaving extractable kinetic energy on the table.');
        } else if (data.tsr > 10) {
            insights.push('High Tip Speed Ratio risk. Excessive centrifugal stress on blades and acoustic noise may occur.');
        }

        if (data.current > data.voltage * 2) {
            insights.push(`High DC current (${formatNumber(data.current, 1)}A) at ${data.voltage}V. Consider stepping up nominal system voltage to 48V or higher to reduce cable thermal losses.`);
        } else {
            insights.push(`System electrical load is well balanced for standard ${data.voltage}V transmission lines.`);
        }

        insights.push(`At ${data.v} m/s wind speed, the turbine sweeps ${formatNumber(data.A, 1)} m² of air mass per second, yielding ${formatNumber(data.pElectrical, 0)}W of usable electrical power.`);

        insights.forEach(text => {
            const li = document.createElement('li');
            li.textContent = text;
            list.appendChild(li);
        });
    }

    function drawTurbineCanvas(data) {
        const ctx = turbineCtx;
        const w = turbineCanvas.width;
        const h = turbineCanvas.height;

        ctx.clearRect(0, 0, w, h);

        // Background grid & wind streaks
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw wind stream particles
        ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
        for (let i = 0; i < 8; i++) {
            let yPos = 40 + i * 32;
            let xPos = (Date.now() * 0.05 * data.v + i * 75) % w;
            ctx.fillRect(xPos, yPos, 25, 2);
        }

        // Tower
        ctx.fillStyle = '#475569';
        ctx.fillRect(w / 2 - 6, h / 2, 12, h / 2 - 10);

Nacelle
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 18, 0, Math.PI * 2);
        ctx.fill();

        // Rotor Blades
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate(rotationAngle);

        const bladeCount = data.blades;
        for (let i = 0; i < bladeCount;
            i++) {
            ctx.save();
            ctx.rotate((i * 2 * Math.PI) / bladeCount);

            // Blade shape
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-6, -110);
            ctx.lineTo(0, -125);
            ctx.lineTo(6, -110);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }

        // Center hub cap
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Update rotation angle based on RPM
        rotationAngle += (data.rpm * 2 * Math.PI) / 60 * 0.03;
    }

    function drawCurveCanvas(data) {
        const ctx = curveCtx;
        const w = curveCanvas.width;
        const h = curveCanvas.height;

        ctx.clearRect(0, 0, w, h);

        // Draw Axes
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(40, h - 30);
        ctx.lineTo(w - 20, h - 30);
        ctx.moveTo(40, 20);
        ctx.lineTo(40, h - 30);
        ctx.stroke();

        // Axis labels
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px system-ui';
        ctx.fillText('0 m/s', 35, h - 15);
        ctx.fillText('25 m/s', w - 45, h - 15);
        ctx.fillText('Power (W)', 45, 25);

        // Compute power curve across wind speeds 0 to 25 m/s
        const maxWind = 25;
        const maxPowerCalc = 0.5 * data.rho * data.A * Math.pow(maxWind, 3) * 0.5;
        const scaleY = (h - 50) / Math.max(1000, maxPowerCalc);
        const scaleX = (w - 60) / maxWind;

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        for (let vTest = 0; vTest <= maxWind; vTest += 0.5) {
            const pW = 0.5 * data.rho * data.A * Math.pow(vTest, 3);
            const pEl = pW * data.cp * data.genEff;
            const x = 40 + vTest * scaleX;
            const y = (h - 30) - (pEl * scaleY);

            if (vTest === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Highlight current operating point on curve
        const curX = 40 + Math.min(maxWind, data.v) * scaleX;
        const curY = (h - 30) - (data.pElectrical * scaleY);

        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.arc(curX, curY, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    function loop() {
        const data = calculatePhysics();
        updateDisplayValues(data);
        drawTurbineCanvas(data);
        drawCurveCanvas(data);
        animationFrameId = requestAnimationFrame(loop);
    }

    // Event Listeners for inputs
    Object.values(inputs).forEach(input => {
        input.addEventListener('input', () => {
            // immediate redraw trigger via loop
        });
    });

    btnReset.addEventListener('click', () => {
        Object.keys(defaultValues).forEach(key => {
            if (inputs[key]) {
                inputs[key].value = defaultValues[key];
            }
        });
    });

    btnExport.addEventListener('click', () => {
        const data = calculatePhysics();
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'auravane-session-export.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Start animation & simulation loop
    loop();
});
