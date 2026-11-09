document.addEventListener('DOMContentLoaded', () => {
    const inputs = {
        mass: document.getElementById('mass'),
        weightDist: document.getElementById('weightDist'),
        wheelbase: document.getElementById('wheelbase'),
        radius: document.getElementById('radius'),
        speed: document.getElementById('speed'),
        cf: document.getElementById('cf'),
        cr: document.getElementById('cr')
    };

    const displays = {
        mass: document.getElementById('valMass'),
        weightDist: document.getElementById('valDist'),
        wheelbase: document.getElementById('valWheelbase'),
        radius: document.getElementById('valRadius'),
        speed: document.getElementById('valSpeed'),
        cf: document.getElementById('valCf'),
        cr: document.getElementById('valCr')
    };

    const resGForce = document.getElementById('resGForce');
    const resHandling = document.getElementById('resHandling');
    const resAlphaF = document.getElementById('resAlphaF');
    const resAlphaR = document.getElementById('resAlphaR');
    const insightsText = document.getElementById('insightsText');
    const presetSelect = document.getElementById('presetSelect');
    const btnReset = document.getElementById('btnReset');
    const btnSavePreset = document.getElementById('btnSavePreset');
    const canvas = document.getElementById('simCanvas');
    const ctx = canvas.getContext('2d');

    const presets = {
        sportcar: { mass: 1250, weightDist: 52, wheelbase: 2.4, radius: 35, speed: 85, cf: 1400, cr: 1300 },
        sedan: { mass: 1550, weightDist: 62, wheelbase: 2.7, radius: 30, speed: 65, cf: 1100, cr: 1250 },
        formula: { mass: 650, weightDist: 44, wheelbase: 2.6, radius: 45, speed: 110, cf: 2200, cr: 2400 },
        suv: { mass: 2200, weightDist: 55, wheelbase: 2.9, radius: 25, speed: 55, cf: 950, cr: 1000 }
    };

    function updateValuesFromInputs() {
        return {
            mass: parseFloat(inputs.mass.value),
            weightDist: parseFloat(inputs.weightDist.value),
            wheelbase: parseFloat(inputs.wheelbase.value),
            radius: parseFloat(inputs.radius.value),
            speed: parseFloat(inputs.speed.value),
            cf: parseFloat(inputs.cf.value),
            cr: parseFloat(inputs.cr.value)
        };
    }

    function updateLabels(v) {
        displays.mass.textContent = v.mass;
        displays.weightDist.textContent = v.weightDist;
        displays.wheelbase.textContent = v.wheelbase;
        displays.radius.textContent = v.radius;
        displays.speed.textContent = v.speed;
        displays.cf.textContent = v.cf;
        displays.cr.textContent = v.cr;
    }

    function calculatePhysics(v) {
        // Convert speed from km/h to m/s
        const vMs = (v.speed * 1000) / 3600;
        
        // Lateral acceleration in m/s^2 and g's
        const aLat = (vMs * vMs) / v.radius;
        const gForce = aLat / 9.81;

        // Axle loads (Newtons)
        const W = v.mass * 9.81;
        const Wf = W * (v.weightDist / 100);
        const Wr = W * ((100 - v.weightDist) / 100);

        // Slip angles in radians -> converted to degrees
        // Alpha_f = (Wf / Cf) * (aLat / 9.81) approximately, simplified bicycle model calculation
        const alphaFRad = (Wf / v.cf) * (aLat / 9.81) * (180 / Math.PI);
        const alphaRRad = (Wr / v.cr) * (aLat / 9.81) * (180 / Math.PI);
        
        // Understeer gradient K = (Wf/Cf) - (Wr/Cr)
        const kGrad = (Wf / v.cf) - (Wr / v.cr);

        let handlingState = 'Neutral';
        let handlingClass = 'status-neutral';
        let insightDesc = 'The vehicle exhibits balanced cornering characteristics with equal front and rear tire slip.';

        if (kGrad > 0.005) {
            handlingState = 'Understeer';
            handlingClass = 'status-understeer';
            insightDesc = 'Front tires are generating higher slip angles than rear tires. The car tends to push wide toward the outside of the turn.';
        } else if (kGrad < -0.005) {
            handlingState = 'Oversteer';
            handlingClass = 'status-oversteer';
            insightDesc = 'Rear tires are generating higher slip angles than front tires. The rear end tends to rotate outward (loose condition).';
        }

        return {
            gForce,
            alphaF: alphaFRad,
            alphaR: alphaRRad,
            handlingState,
            handlingClass,
            insightDesc,
            aLat
        };
    }

    function drawSimulation(v, physics) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const cx = canvas.width / 2;
        const cy = canvas.height / 2 + 30;
        
        // Draw corner reference circle
        const scale = 2.2;
        const drawRadius = Math.min(v.radius * scale, 130);

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy - drawRadius, drawRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Ideal path arc indicator
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy - drawRadius, drawRadius, Math.PI * 0.3, Math.PI * 0.7);
        ctx.stroke();

        // Draw Vehicle Body (Simplified top-down rectangle)
        ctx.save();
        ctx.translate(cx, cy);
        
        // Rotation based on slip angle difference
        const slipDiff = (physics.alphaF - physics.alphaR) * 0.05;
        ctx.rotate(slipDiff);

        const carWidth = 40;
        const carLength = 80;

        // Car chassis
        ctx.fillStyle = '#334155';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-carWidth/2, -carLength/2, carWidth, carLength, 8);
        ctx.fill();
        ctx.stroke();

        // Wheels
        const wheelW = 8;
        const wheelH = 20;
        
        // Front Wheels (with steering / slip angle indicator)
        ctx.save();
        ctx.translate(-carWidth/2, -carLength/2 + 10);
        ctx.rotate(Math.min(physics.alphaF * 0.1, 0.5));
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-wheelW/2, -wheelH/2, wheelW, wheelH);
        ctx.restore();

        ctx.save();
        ctx.translate(carWidth/2, -carLength/2 + 10);
        ctx.rotate(Math.min(physics.alphaF * 0.1, 0.5));
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-wheelW/2, -wheelH/2, wheelW, wheelH);
        ctx.restore();

        // Rear Wheels
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(-carWidth/2 - wheelW/2, carLength/2 - 25, wheelW, wheelH);
        ctx.fillRect(carWidth/2 - wheelW/2, carLength/2 - 25, wheelW, wheelH);

        // Center of gravity dot
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    function updateUI() {
        const v = updateValuesFromInputs();
        updateLabels(v);
        const physics = calculatePhysics(v);

        resGForce.textContent = physics.gForce.toFixed(2);
        resHandling.textContent = physics.handlingState;
        resHandling.className = 'metric-value status-badge ' + physics.handlingClass;
        resAlphaF.textContent = physics.alphaF.toFixed(1);
        resAlphaR.textContent = physics.alphaR.toFixed(1);
        insightsText.textContent = physics.insightDesc;

        drawSimulation(v, physics);
    }

    Object.values(inputs).forEach(input => {
        input.addEventListener('input', () => {
            presetSelect.value = 'custom';
            updateUI();
        });
    });

    presetSelect.addEventListener('change', (e) => {
        const key = e.target.value;
        if (presets[key]) {
            const p = presets[key];
            inputs.mass.value = p.mass;
            inputs.weightDist.value = p.weightDist;
            inputs.wheelbase.value = p.wheelbase;
            inputs.radius.value = p.radius;
            inputs.speed.value = p.speed;
            inputs.cf.value = p.cf;
            inputs.cr.value = p.cr;
            updateUI();
        }
    });

    btnReset.addEventListener('click', () => {
        presetSelect.value = 'sportcar';
        const p = presets.sportcar;
        inputs.mass.value = p.mass;
        inputs.weightDist.value = p.weightDist;
        inputs.wheelbase.value = p.wheelbase;
        inputs.radius.value = p.radius;
        inputs.speed.value = p.speed;
        inputs.cf.value = p.cf;
        inputs.cr.value = p.cr;
        updateUI();
    });

    btnSavePreset.addEventListener('click', () => {
        const v = updateValuesFromInputs();
        try {
            localStorage.setItem('auradrift_custom', JSON.stringify(v));
            btnSavePreset.textContent = 'Saved Successfully!';
            setTimeout(() => { btnSavePreset.textContent = 'Save Setup to Local'; }, 2000);
        } catch (e) {
            console.error(e);
        }
    });

    // Load saved setup if present
    try {
        const saved = localStorage.getItem('auradrift_custom');
        if (saved) {
            const p = JSON.parse(saved);
            inputs.mass.value = p.mass;
            inputs.weightDist.value = p.weightDist;
            inputs.wheelbase.value = p.wheelbase;
            inputs.radius.value = p.radius;
            inputs.speed.value = p.speed;
            inputs.cf.value = p.cf;
            inputs.cr.value = p.cr;
        }
    } catch (e) {
        console.error(e);
    }

    updateUI();
});
