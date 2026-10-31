document.addEventListener('DOMContentLoaded', () => {
    const defaults = {
        windSpeed: 18,
        windAngle: 60,
        craftSpeed: 10,
        sailArea: 12,
        liftCoeff: 1.4,
        dragCoeff: 0.3,
        airTemp: 20,
        unitSystem: 'metric'
    };

    const state = { ...defaults };
    let snapshots = [];

    // DOM Elements
    const elWindSpeedRange = document.getElementById('wind-speed-range');
    const elWindSpeed = document.getElementById('wind-speed');
    const elWindAngle = document.getElementById('wind-angle');
    const elWindAngleVal = document.getElementById('wind-angle-val');
    const elCraftSpeedRange = document.getElementById('craft-speed-range');
    const elCraftSpeed = document.getElementById('craft-speed');
    const elSailAreaRange = document.getElementById('sail-area-range');
    const elSailArea = document.getElementById('sail-area');
    const elLiftCoeff = document.getElementById('lift-coeff');
    const elDragCoeff = document.getElementById('drag-coeff');
    const elAirTemp = document.getElementById('air-temp');
    const elUnitSystem = document.getElementById('unit-system');

    const elWindSpeedUnitLbl = document.getElementById('wind-speed-unit-lbl');
    const elCraftSpeedUnitLbl = document.getElementById('craft-speed-unit-lbl');
    const elSailAreaUnitLbl = document.getElementById('sail-area-unit-lbl');

    const elResAws = document.getElementById('res-aws');
    const elResAwa = document.getElementById('res-awa');
    const elResForce = document.getElementById('res-force');
    const elResForceLbs = document.getElementById('res-force-lbs');
    const elResDrive = document.getElementById('res-drive');
    const elResHeel = document.getElementById('res-heel');
    const elResBeaufort = document.getElementById('res-beaufort');
    const elResRiskStatus = document.getElementById('res-risk-status');

    const elResetDefaults = document.getElementById('reset-defaults');
    const elSaveSnapshot = document.getElementById('save-snapshot');
    const elExportSession = document.getElementById('export-session');
    const elSnapshotTbody = document.getElementById('snapshot-tbody');
    const canvas = document.getElementById('vector-canvas');
    const ctx = canvas.getContext('2d');

    function init() {
        loadFromStorage();
        setupEventListeners();
        calculateAndRender();
    }

    function setupEventListeners() {
        // Sync Range & Number inputs
        bindRangeAndNumber(elWindSpeedRange, elWindSpeed, 'windSpeed');
        bindRangeAndNumber(elCraftSpeedRange, elCraftSpeed, 'craftSpeed');
        bindRangeAndNumber(elSailAreaRange, elSailArea, 'sailArea');

        elWindAngle.addEventListener('input', (e) => {
            state.windAngle = parseFloat(e.target.value);
            elWindAngleVal.textContent = state.windAngle;
            calculateAndRender();
        });

        elLiftCoeff.addEventListener('input', (e) => {
            state.liftCoeff = parseFloat(e.target.value) || 0;
            calculateAndRender();
        });

        elDragCoeff.addEventListener('input', (e) => {
            state.dragCoeff = parseFloat(e.target.value) || 0;
            calculateAndRender();
        });

        elAirTemp.addEventListener('input', (e) => {
            state.airTemp = parseFloat(e.target.value) || 20;
            calculateAndRender();
        });

        elUnitSystem.addEventListener('change', (e) => {
            state.unitSystem = e.target.value;
            updateUnitsDisplay();
            calculateAndRender();
        });

        elResetDefaults.addEventListener('click', () => {
            Object.assign(state, defaults);
            syncUIFromState();
            calculateAndRender();
        });

        elSaveSnapshot.addEventListener('click', saveSnapshot);
        elExportSession.addEventListener('click', exportLog);
    }

    function bindRangeAndNumber(rangeEl, numEl, stateKey) {
        rangeEl.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            numEl.value = val;
            state[stateKey] = val;
            calculateAndRender();
        });

        numEl.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value) || 0;
            rangeEl.value = val;
            state[stateKey] = val;
            calculateAndRender();
        });
    }

    function syncUIFromState() {
        elWindSpeedRange.value = state.windSpeed;
        elWindSpeed.value = state.windSpeed;
        elWindAngle.value = state.windAngle;
        elWindAngleVal.textContent = state.windAngle;
        elCraftSpeedRange.value = state.craftSpeed;
        elCraftSpeed.value = state.craftSpeed;
        elSailAreaRange.value = state.sailArea;
        elSailArea.value = state.sailArea;
        elLiftCoeff.value = state.liftCoeff;
        elDragCoeff.value = state.dragCoeff;
        elAirTemp.value = state.airTemp;
        elUnitSystem.value = state.unitSystem;
        updateUnitsDisplay();
    }

    function updateUnitsDisplay() {
        if (state.unitSystem === 'imperial') {
            elWindSpeedUnitLbl.textContent = 'mph';
            elCraftSpeedUnitLbl.textContent = 'mph';
            elSailAreaUnitLbl.textContent = 'sq.ft';
        } else {
            elWindSpeedUnitLbl.textContent = 'knots';
            elCraftSpeedUnitLbl.textContent = 'knots';
            elSailAreaUnitLbl.textContent = 'm²';
        }
    }

    function calculateAndRender() {
        // Convert to SI (m/s and m²) for physics calculations
        let twsMs, craftMs, areaM2;
        
        if (state.unitSystem === 'imperial') {
            twsMs = state.windSpeed * 0.44704;
            craftMs = state.craftSpeed * 0.44704;
            areaM2 = state.sailArea * 0.092903;
        } else {
            twsMs = state.windSpeed * 0.514444;
            craftMs = state.craftSpeed * 0.514444;
            areaM2 = state.sailArea;
        }

        const angleRad = state.windAngle * (Math.PI / 180);
        
        // Apparent wind calculation (Vector addition: V_apparent = V_true - V_craft)
        const twx = twsMs * Math.cos(angleRad);
        const twy = twsMs * Math.sin(angleRad);
        
        // Craft moves along Y axis (0 deg ahead)
        const cwvx = 0;
        const cwvy = craftMs;

        const awx = twx - cwvx;
        const awy = twy - cwvy;

        const awsMs = Math.sqrt(awx * awx + awy * awy);
        const awaRad = Math.atan2(awy, awx);
        const awaDeg = awaRad * (180 / Math.PI);

        // Air density rho calculation based on temperature at sea level (approx 1.225 kg/m3 at 15C)
        const rho = 1.225 * (288.15 / (273.15 + state.airTemp));

        // Aerodynamic pressure q = 0.5 * rho * V^2
        const q = 0.5 * rho * (awsMs * awsMs);

        // Total Force F = q * Area * sqrt(CL^2 + CD^2)
        const totalForceN = q * areaM2 * Math.sqrt(state.liftCoeff * state.liftCoeff + state.dragCoeff * state.dragCoeff);
        const totalForceLbs = totalForceN * 0.224809;

        // Decompose into drive (forward along craft heading) and heel/side force
        const sailAngleToApparent = Math.PI / 4; // Optimal angle of attack approx 45 deg
        const driveForceN = totalForceN * Math.cos(sailAngleToApparent);
        const heelForceN = totalForceN * Math.sin(sailAngleToApparent);

        // Display formatting
        let awsDisplay, speedUnit;
        if (state.unitSystem === 'imperial') {
            awsDisplay = (awsMs * 2.23694).toFixed(1);
            speedUnit = 'mph';
        } else {
            awsDisplay = (awsMs * 1.94384).toFixed(1);
            speedUnit = 'knots';
        }

        elResAws.textContent = `${awsDisplay} ${speedUnit}`;
        elResAwa.textContent = `Angle: ${Math.abs(awaDeg).toFixed(1)}°`;
        
        if (state.unitSystem === 'imperial') {
            elResForce.textContent = `${totalForceLbs.toFixed(1)} lbf`;
            elResForceLbs.textContent = `${totalForceN.toFixed(1)} N`;
            elResDrive.textContent = `${(driveForceN * 0.224809).toFixed(1)} lbf`;
            elResHeel.textContent = `Heel: ${(heelForceN * 0.224809).toFixed(1)} lbf`;
        } else {
            elResForce.textContent = `${totalForceN.toFixed(1)} N`;
            elResForceLbs.textContent = `${totalForceLbs.toFixed(1)} lbf`;
            elResDrive.textContent = `${driveForceN.toFixed(1)} N`;
            elResHeel.textContent = `Heel: ${heelForceN.toFixed(1)} N`;
        }

        // Beaufort scale estimation based on True Wind Speed in knots
        const twsKnots = state.unitSystem === 'imperial' ? state.windSpeed * 0.868976 : state.windSpeed;
        const beaufort = getBeaufortScale(twsKnots);
        elResBeaufort.textContent = `Force ${beaufort.num}: ${beaufort.name}`;
        
        if (beaufort.num >= 7) {
            elResRiskStatus.textContent = 'Status: High Wind Warning';
            elResRiskStatus.style.color = 'var(--danger)';
        } else if (beaufort.num >= 5) {
            elResRiskStatus.textContent = 'Status: Moderate Caution';
            elResRiskStatus.style.color = 'var(--warning)';
        } else {
            elResRiskStatus.textContent = 'Status: Safe Conditions';
            elResRiskStatus.style.color = 'var(--success)';
        }

        drawVectorCanvas(twx, twy, cwvx, cwvy, awx, awy);
        saveToStorage();
    }

    function getBeaufortScale(knots) {
        if (knots < 1) return { num: 0, name: 'Calm' };
        if (knots <= 3) return { num: 1, name: 'Light Air' };
        if (knots <= 6) return { num: 2, name: 'Light Breeze' };
        if (knots <= 10) return { num: 3, name: 'Gentle Breeze' };
        if (knots <= 16) return { num: 4, name: 'Moderate Breeze' };
        if (knots <= 21) return { num: 5, name: 'Fresh Breeze' };
        if (knots <= 27) return { num: 6, name: 'Strong Breeze' };
        if (knots <= 33) return { num: 7, name: 'Near Gale' };
        if (knots <= 40) return { num: 8, name: 'Gale' };
        if (knots <= 47) return { num: 9, name: 'Strong Gale' };
        return { num: 10, name: 'Storm+' };
    }

    function drawVectorCanvas(twx, twy, cwvx, cwvy, awx, awy) {
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        const cx = width / 2;
        const cy = height / 2 + 20;

        // Scale factor for vectors
        const scale = 12;

        // Draw background grid lines
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 100, 0, 2 * Math.PI);
        ctx.arc(cx, cy, 50, 0, 2 * Math.PI);
        ctx.moveTo(cx - 120, cy);
        ctx.lineTo(cx + 120, cy);
        ctx.moveTo(cx, cy - 120);
        ctx.lineTo(cx, cy + 120);
        ctx.stroke();

        // Craft symbol (small triangle pointing up)
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(cx, cy - 15);
        ctx.lineTo(cx - 10, cy + 15);
        ctx.lineTo(cx + 10, cy + 15);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.stroke();

        // True Wind Vector (Blue)
        // True wind direction comes from state.windAngle
        const twDrawX = -twx * scale;
        const twDrawY = twy * scale;
        drawArrow(ctx, cx, cy, cx + twDrawX, cy - twDrawY, '#3b82f6', 'True Wind');

        // Craft Velocity Vector (Green)
        const craftDrawX = cwvx * scale;
        const craftDrawY = -cwvy * scale;
        drawArrow(ctx, cx, cy, cx + craftDrawX, cy + craftDrawY, '#10b981', 'Craft');

        // Apparent Wind Vector (Orange)
        const awDrawX = awx * scale;
        const awDrawY = -awy * scale;
        drawArrow(ctx, cx, cy, cx + awDrawX, cy + awDrawY, '#f59e0b', 'Apparent Wind');

        // Resultant Force Vector (Red)
        const forceLen = Math.min(100, Math.sqrt(awx*awx + awy*awy) * scale * 0.8);
        const forceAngle = Math.atan2(-awy, awx) - Math.PI / 6;
        const fX = Math.cos(forceAngle) * forceLen;
        const fY = Math.sin(forceAngle) * forceLen;
        drawArrow(ctx, cx, cy, cx + fX, cy + fY, '#ef4444', 'Force');
    }

    function drawArrow(ctx, fromX, fromY, toX, toY, color, label) {
        const headlen = 10;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fill();

        if (label) {
            ctx.font = '11px system-ui';
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(label, toX + 6, toY + 4);
        }
    }

    function saveSnapshot() {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const snapshot = {
            id: Date.now(),
            time: timeStr,
            tws: `${state.windSpeed} ${state.unitSystem === 'imperial' ? 'mph' : 'knots'}`,
            angle: `${state.windAngle}°`,
            sailArea: `${state.sailArea} ${state.unitSystem === 'imperial' ? 'sq.ft' : 'm²'}`,
            aws: elResAws.textContent,
            force: elResForce.textContent
        };

        snapshots.unshift(snapshot);
        if (snapshots.length > 10) snapshots.pop();
        renderSnapshots();
    }

    function renderSnapshots() {
        if (snapshots.length === 0) {
            elSnapshotTbody.innerHTML = `<tr class="empty-row"><td colspan="7">No saved snapshots yet. Click 'Save Current Setup' to record.</td></tr>`;
            return;
        }

        elSnapshotTbody.innerHTML = snapshots.map(s => `
            <tr>
                <td>${s.time}</td>
                <td>${s.tws}</td>
                <td>${s.angle}</td>
                <td>${s.sailArea}</td>
                <td>${s.aws}</td>
                <td><strong>${s.force}</strong></td>
                <td><button class="btn btn-secondary btn-sm" onclick="window.deleteSnapshot(${s.id})">Delete</button></td>
            </tr>
        `).join('');
    }

    window.deleteSnapshot = function(id) {
        snapshots = snapshots.filter(s => s.id !== id);
        renderSnapshots();
    };

    function exportLog() {
        if (snapshots.length === 0) {
            alert('No snapshots to export.');
            return;
        }
        const jsonStr = JSON.stringify(snapshots, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'auravane-session-log.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function saveToStorage() {
        try {
            localStorage.setItem('auravane_state', JSON.stringify(state));
        } catch (e) {
            // Ignore storage limits
        }
    }

    function loadFromStorage() {
        try {
            const saved = localStorage.getItem('auravane_state');
            if (saved) {
                Object.assign(state, JSON.parse(saved));
            }
        } catch (e) {
            // Fallback to defaults
        }
        syncUIFromState();
    }

    init();
});
