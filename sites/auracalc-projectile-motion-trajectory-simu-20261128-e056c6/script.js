document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('sim-canvas');
    const ctx = canvas.getContext('2d');

    // Inputs
    const inputVelocity = document.getElementById('velocity');
    const valVelocity = document.getElementById('val-velocity');
    const inputAngle = document.getElementById('angle');
    const valAngle = document.getElementById('val-angle');
    const inputHeight = document.getElementById('height');
    const valHeight = document.getElementById('val-height');
    const selectCelestial = document.getElementById('celestial');
    const customGravityGroup = document.getElementById('custom-gravity-group');
    const inputGravity = document.getElementById('gravity');
    const valGravity = document.getElementById('val-gravity');
    const inputDrag = document.getElementById('drag');
    const valDrag = document.getElementById('val-drag');
    const inputMass = document.getElementById('mass');
    const inputArea = document.getElementById('area');

    // Metrics
    const metricHeight = document.getElementById('metric-height');
    const metricTime = document.getElementById('metric-time');
    const metricRange = document.getElementById('metric-range');
    const metricImpact = document.getElementById('metric-impact');

    // Buttons
    const btnFire = document.getElementById('btn-fire');
    const btnClear = document.getElementById('btn-clear');
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnResetView = document.getElementById('btn-reset-view');
    const btnPresets = document.getElementById('btn-presets');
    const btnExport = document.getElementById('btn-export');
    const modalPresets = document.getElementById('modal-presets');
    const modalClose = document.getElementById('modal-close');
    const btnSavePreset = document.getElementById('btn-save-preset');
    const presetNameInput = document.getElementById('preset-name');
    const presetList = document.getElementById('preset-list');

    // State
    let trajectories = [];
    let activeAnimation = null;
    let viewScale = 1.0; // Pixels per meter
    let viewOffsetX = 50; // Canvas X offset from left in pixels
    let viewOffsetY = 0;  // Canvas Y offset from bottom in pixels

    // Resize canvas resolution to display size
    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        drawScene();
    }

    window.addEventListener('resize', resizeCanvas);

    // Update labels and auto-simulate preview
    function updateLabels() {
        valVelocity.textContent = inputVelocity.value;
        valAngle.textContent = inputAngle.value;
        valHeight.textContent = parseFloat(inputHeight.value).toFixed(1);
        valGravity.textContent = inputGravity.value;
        valDrag.textContent = parseFloat(inputDrag.value).toFixed(2);
    }

    function getGravity() {
        if (selectCelestial.value === 'custom') {
            return parseFloat(inputGravity.value);
        }
        return parseFloat(selectCelestial.value);
    }

    // Physics calculation engine
    function calculateTrajectory(v0, angleDeg, y0, g, cd, mass, area) {
        const angleRad = (angleDeg * Math.PI) / 180;
        let vx = v0 * Math.cos(angleRad);
        let vy = v0 * Math.sin(angleRad);
        let x = 0;
        let y = y0;

        const dt = 0.01; // Time step
        const points = [{ x, y, vx, vy, t: 0 }];
        let t = 0;
        let maxH = y0;

        // Air density constant (approx sea level kg/m^3)
        const rho = 1.225;

        while (y >= 0 && t < 1000) {
            let ax = 0;
            let ay = -g;

            if (cd > 0 && mass > 0) {
                const v = Math.sqrt(vx * vx + vy * vy);
                const dragFactor = 0.5 * rho * cd * area * v / mass;
                ax -= dragFactor * vx;
                ay -= dragFactor * vy;
            }

            vx += ax * dt;
            vy += ay * dt;
            x += vx * dt;
            y += vy * dt;
            t += dt;

            if (y > maxH) maxH = y;

            if (y <= 0) {
                // Linear interpolation for exact ground contact
                const prev = points[points.length - 1];
                const fraction = -prev.y / (y - prev.y);
                const exactX = prev.x + fraction * (x - prev.x);
                const exactT = prev.t + fraction * dt;
                points.push({ x: exactX, y: 0, vx, vy, t: exactT });
                break;
            } else {
                points.push({ x, y, vx, vy, t });
            }
        }

        const finalPoint = points[points.length - 1];
        const impactV = Math.sqrt(finalPoint.vx * finalPoint.vx + finalPoint.vy * finalPoint.vy);

        return {
            points,
            maxHeight: maxH,
            flightTime: finalPoint.t,
            range: finalPoint.x,
            impactVelocity: impactV,
            params: { v0, angleDeg, y0, g, cd, mass, area }
        };
    }

    // Auto-fit view scale
    function autoFitView(maxR, maxH) {
        const rect = canvas.getBoundingClientRect();
        const paddingX = 80;
        const paddingY = 60;
        const availableWidth = rect.width - paddingX;
        const availableHeight = rect.height - paddingY;

        const scaleX = availableWidth / Math.max(maxR, 10);
        const scaleY = availableHeight / Math.max(maxH, 10);

        viewScale = Math.min(scaleX, scaleY);
        viewOffsetX = 50;
        viewOffsetY = 40;
    }

    // Render Scene
    function drawScene() {
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);

        ctx.save();
        // Transform to bottom-left origin coordinate system
        ctx.translate(viewOffsetX, rect.height - viewOffsetY);
        ctx.scale(viewScale, -viewScale);

        // Draw Grid lines
        drawGrid(rect.width, rect.height);

        // Draw Ground
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-10000, -10000, 20000, 10000);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2 / viewScale;
        ctx.beginPath();
        ctx.moveTo(-10000, 0);
        ctx.lineTo(10000, 0);
        ctx.stroke();

        // Draw Trajectories
        trajectories.forEach((traj, index) => {
            if (traj.points.length < 2) return;

            // Trajectory Line
            ctx.strokeStyle = index === trajectories.length - 1 ? '#38bdf8' : '#64748b';
            ctx.lineWidth = (index === trajectories.length - 1 ? 3 : 2) / viewScale;
            ctx.beginPath();
            ctx.moveTo(traj.points[0].x, traj.points[0].y);
            for (let i = 1; i < traj.points.length; i++) {
                ctx.lineTo(traj.points[i].x, traj.points[i].y);
            }
            ctx.stroke();

            // Draw Apex marker
            let apex = traj.points.reduce((max, p) => p.y > max.y ? p : max, traj.points[0]);
            ctx.fillStyle = '#f43f5e';
            ctx.beginPath();
            ctx.arc(apex.x, apex.y, 4 / viewScale, 0, 2 * Math.PI);
            ctx.fill();

            // Draw Impact marker
            let impact = traj.points[traj.points.length - 1];
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.arc(impact.x, impact.y, 5 / viewScale, 0, 2 * Math.PI);
            ctx.fill();
        });

        ctx.restore();
    }

    function drawGrid(width, height) {
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1 / viewScale;

        const step = Math.max(10, Math.pow(10, Math.floor(Math.log10(500 / viewScale))));
        
        // Vertical grid lines
        for (let x = 0; x < 5000; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, -10000);
            ctx.lineTo(x, 10000);
            ctx.stroke();
        }

        // Horizontal grid lines
        for (let y = 0; y < 5000; y += step) {
            ctx.beginPath();
            ctx.moveTo(-10000, y);
            ctx.lineTo(10000, y);
            ctx.stroke();
        }
    }

    // Fire simulation action
    function fireProjectile() {
        const v0 = parseFloat(inputVelocity.value);
        const angle = parseFloat(inputAngle.value);
        const y0 = parseFloat(inputHeight.value);
        const g = getGravity();
        const cd = parseFloat(inputDrag.value);
        const mass = parseFloat(inputMass.value);
        const area = parseFloat(inputArea.value);

        const result = calculateTrajectory(v0, angle, y0, g, cd, mass, area);
        trajectories.push(result);

        // Update Metrics Display
        metricHeight.textContent = result.maxHeight.toFixed(2);
        metricTime.textContent = result.flightTime.toFixed(2);
        metricRange.textContent = result.range.toFixed(2);
        metricImpact.textContent = result.impactVelocity.toFixed(2);

        // Find max range and height for scaling
        let maxR = Math.max(...trajectories.map(t => t.range), 10);
        let maxH = Math.max(...trajectories.map(t => t.maxHeight), 10);

        autoFitView(maxR, maxH);
        drawScene();
    }

    // Event Listeners for inputs
    [inputVelocity, inputAngle, inputHeight, inputGravity, inputDrag, inputMass, inputArea].forEach(input => {
        input.addEventListener('input', () => {
            updateLabels();
        });
    });

    selectCelestial.addEventListener('change', () => {
        if (selectCelestial.value === 'custom') {
            customGravityGroup.style.display = 'flex';
        } else {
            customGravityGroup.style.display = 'none';
        }
    });

    btnFire.addEventListener('click', fireProjectile);

    btnClear.addEventListener('click', () => {
        trajectories = [];
        metricHeight.textContent = '0.00';
        metricTime.textContent = '0.00';
        metricRange.textContent = '0.00';
        metricImpact.textContent = '0.00';
        drawScene();
    });

    // Zoom and pan controls
    btnZoomIn.addEventListener('click', () => {
        viewScale *= 1.25;
        drawScene();
    });

    btnZoomOut.addEventListener('click', () => {
        viewScale /= 1.25;
        drawScene();
    });

    btnResetView.addEventListener('click', () => {
        if (trajectories.length > 0) {
            let maxR = Math.max(...trajectories.map(t => t.range), 10);
            let maxH = Math.max(...trajectories.map(t => t.maxHeight), 10);
            autoFitView(maxR, maxH);
        } else {
            viewScale = 10;
            viewOffsetX = 50;
            viewOffsetY = 40;
        }
        drawScene();
    });

    // CSV Export
    btnExport.addEventListener('click', () => {
        if (trajectories.length === 0) {
            alert('No simulation data to export. Fire a projectile first.');
            return;
        }
        const last = trajectories[trajectories.length - 1];
        let csv = 'Time (s),X Position (m),Y Position (m),X Velocity (m/s),Y Velocity (m/s)\n';
        last.points.forEach(p => {
            csv += `${p.t.toFixed(3)},${p.x.toFixed(3)},${p.y.toFixed(3)},${p.vx.toFixed(3)},${p.vy.toFixed(3)}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'trajectory_data.csv';
        a.click();
        URL.revokeObjectURL(url);
    });

    // Presets Modal handling
    btnPresets.addEventListener('click', () => modalPresets.classList.add('active'));
    modalClose.addEventListener('click', () => modalPresets.classList.remove('active'));

    function getSavedPresets() {
        try {
            return JSON.parse(localStorage.getItem('auracalc_presets') || '[]');
        } catch (e) {
            return [];
        }
    }

    function renderPresets() {
        const presets = getSavedPresets();
        presetList.innerHTML = '';
        if (presets.length === 0) {
            presetList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.875rem;">No saved presets found.</p>';
            return;
        }
        presets.forEach((p, idx) => {
            const item = document.createElement('div');
            item.className = 'preset-item';
            item.innerHTML = `
                <div class="preset-info">
                    <span class="preset-title">${p.name}</span>
                    <span class="preset-desc">v₀: ${p.v0}m/s, θ: ${p.angle}°, g: ${p.g}m/s²</span>
                </div>
                <div class="preset-actions">
                    <button class="btn secondary" data-action="load" data-index="${idx}">Load</button>
                    <button class="btn danger" data-action="delete" data-index="${idx}">Del</button>
                </div>
            `;
            presetList.appendChild(item);
        });
    }

    btnSavePreset.addEventListener('click', () => {
        const name = presetNameInput.value.trim();
        if (!name) {
            alert('Please enter a preset name.');
            return;
        }
        const presets = getSavedPresets();
        presets.push({
            name,
            v0: inputVelocity.value,
            angle: inputAngle.value,
            height: inputHeight.value,
            celestial: selectCelestial.value,
            gravity: inputGravity.value,
            drag: inputDrag.value,
            mass: inputMass.value,
            area: inputArea.value
        });
        localStorage.setItem('auracalc_presets', JSON.stringify(presets));
        presetNameInput.value = '';
        renderPresets();
    });

    presetList.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const idx = parseInt(btn.dataset.index);
        const presets = getSavedPresets();

        if (btn.dataset.action === 'load') {
            const p = presets[idx];
            inputVelocity.value = p.v0;
            inputAngle.value = p.angle;
            inputHeight.value = p.height;
            selectCelestial.value = p.celestial;
            inputGravity.value = p.gravity;
            inputDrag.value = p.drag;
            inputMass.value = p.mass;
            inputArea.value = p.area;

            if (p.celestial === 'custom') {
                customGravityGroup.style.display = 'flex';
            } else {
                customGravityGroup.style.display = 'none';
            }

            updateLabels();
            modalPresets.classList.remove('active');
            fireProjectile();
        } else if (btn.dataset.action === 'delete') {
            presets.splice(idx, 1);
            localStorage.setItem('auracalc_presets', JSON.stringify(presets));
            renderPresets();
        }
    });

    renderPresets();
    resizeCanvas();
    fireProjectile();
});
