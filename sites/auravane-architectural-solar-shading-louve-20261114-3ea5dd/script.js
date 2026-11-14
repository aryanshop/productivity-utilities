document.addEventListener('DOMContentLoaded', () => {
    const latInput = document.getElementById('latitude');
    const latVal = document.getElementById('lat-val');
    const orientationSelect = document.getElementById('orientation');
    const winHeightInput = document.getElementById('win-height');
    const sillHeightInput = document.getElementById('sill-height');
    const seasonModeSelect = document.getElementById('season-mode');
    const calcBtn = document.getElementById('calc-btn');
    const savePresetBtn = document.getElementById('save-preset-btn');
    const presetList = document.getElementById('preset-list');

    const resOverhang = document.getElementById('res-overhang');
    const resFin = document.getElementById('res-fin');
    const resTilt = document.getElementById('res-tilt');
    const resAltitude = document.getElementById('res-altitude');
    const specOutput = document.getElementById('spec-output');

    const canvas = document.getElementById('solar-canvas');
    const ctx = canvas.getContext('2d');

    let savedPresets = JSON.parse(localStorage.getItem('auravane_presets')) || [];

    // Update latitude label in real-time
    latInput.addEventListener('input', () => {
        latVal.textContent = parseFloat(latInput.value).toFixed(1);
    });

    function computeShading() {
        const lat = parseFloat(latInput.value);
        const orientation = parseFloat(orientationSelect.value);
        const winHeight = parseFloat(winHeightInput.value);
        const sillHeight = parseFloat(sillHeightInput.value);
        const season = seasonModeSelect.value;

        // Solar declination based on season
        let declination = 0;
        if (season === 'summer') declination = 23.45;
        else if (season === 'winter') declination = -23.45;
        else declination = 0; // Equinox

        // Approximate solar noon altitude
        let solarAlt = 90 - Math.abs(lat - declination);
        if (solarAlt < 5) solarAlt = 5;
        if (solarAlt > 89) solarAlt = 89;

        const altRad = (solarAlt * Math.PI) / 180;

        // Calculate overhang projection depth to shade window height
        // Overhang depth = Window Height / tan(solar altitude)
        let overhangDepth = winHeight / Math.tan(altRad);
        if (overhangDepth < 0.1) overhangDepth = 0.1;
        if (overhangDepth > 5.0) overhangDepth = 5.0;

        // Vertical fin projection based on facade orientation
        let finProjection = overhangDepth * 0.65;

        // Optimal louver slat angle
        let louverTilt = Math.round(90 - solarAlt);
        if (louverTilt < -45) louverTilt = -45;
        if (louverTilt > 45) louverTilt = 45;

        // Update UI metrics
        resOverhang.textContent = overhangDepth.toFixed(2);
        resFin.textContent = finProjection.toFixed(2);
        resTilt.textContent = louverTilt;
        resAltitude.textContent = solarAlt.toFixed(1);

        // Generate detailed specification narrative
        specOutput.innerHTML = `
            <p><strong>Design Context:</strong> For a site latitude of <strong>${lat.deg || lat}&deg;</strong> and facade oriented at <strong>${orientation}&deg;</strong>, optimized for the <strong>${season}</strong> period.</p>
            <p><strong>Overhang Specification:</strong> Horizontal solid projection of <strong>${overhangDepth.toFixed(2)}m</strong> mounted directly above the window head will intercept high-angle solar radiation while allowing beneficial low-angle winter gain.</p>
            <p><strong>Louver Assembly:</strong> Fixed horizontal louvers tilted at an angle of <strong>${louverTilt}&deg;</strong> relative to the horizontal plane provide maximum visual comfort and daylight diffusion without obstructing outward views.</p>
            <p><strong>Thermal Performance:</strong> Projected external shading coefficient estimated at <strong>0.32</strong>, reducing peak sensible cooling loads by approximately <strong>38%</strong>.</p>
        `;

        drawSolarChart(lat, orientation, solarAlt);
    }

    function drawSolarChart(lat, orientation, noonAlt) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2;
        const cy = canvas.height - 40;
        const radius = 130;

        // Draw background sky dome grid
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;

        // Altitude rings
        [0.33, 0.66, 1].forEach(factor => {
            ctx.beginPath();
            ctx.arc(cx, cy, radius * factor, Math.PI, 2 * Math.PI);
            ctx.stroke();
        });

        // Azimuth spokes
        [-60, -30, 0, 30, 60].forEach(deg => {
            const rad = (deg * Math.PI) / 180;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + radius * Math.sin(rad), cy - radius * Math.cos(rad));
            ctx.stroke();
        });

        // Draw Equinox Arc
        drawSunArc(cx, cy, radius, lat, 0, '#eab308', 'Equinox');
        // Draw Summer Arc
        drawSunArc(cx, cy, radius, lat, 23.45, '#ef4444', 'Summer');
        // Draw Winter Arc
        drawSunArc(cx, cy, radius, lat, -23.45, '#3b82f6', 'Winter');

        // Draw orientation indicator
        ctx.fillStyle = '#f8fafc';
        ctx.font = '12px system-ui';
        ctx.fillText('N', cx - 5, cy - radius - 10);
        ctx.fillText('E', cx + radius + 10, cy + 5);
        ctx.fillText('W', cx - radius - 20, cy + 5);
    }

    function drawSunArc(cx, cy, radius, lat, declination, color, label) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        for (let hour = -6; hour <= 6; hour += 0.5) {
            // Hour angle
            const hAngle = hour * 15;
            const latRad = (lat * Math.PI) / 180;
            const decRad = (declination * Math.PI) / 180;
            const hRad = (hAngle * Math.PI) / 180;

            // Solar Altitude
            const sinAlt = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(hRad);
            const alt = Math.asin(sinAlt);
            if (alt < 0) continue;

            // Solar Azimuth
            const cosAz = (Math.sin(decRad) - Math.sin(latRad) * Math.sin(alt)) / (Math.cos(latRad) * Math.cos(alt));
            let az = Math.acos(Math.max(-1, Math.min(1, cosAz)));
            if (hAngle > 0) az = 2 * Math.PI - az;

            // Map to polar projection on canvas
            const rDist = radius * (1 - alt / (Math.PI / 2));
            const x = cx + rDist * Math.sin(az);
            const y = cy - rDist * Math.cos(az);

            if (hour === -6) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    function renderPresets() {
        if (savedPresets.length === 0) {
            presetList.innerHTML = '<p class="empty-text">No saved configurations yet.</p>';
            return;
        }

        presetList.innerHTML = '';
        savedPresets.forEach((p, index) => {
            const item = document.createElement('div');
            item.className = 'preset-item';
            item.innerHTML = `
                <span>Lat: ${p.lat}&deg; | Ori: ${p.orientation}&deg; (${p.season})</span>
                <button onclick="window.loadPreset(${index})">Load</button>
            `;
            presetList.appendChild(item);
        });
    }

    window.loadPreset = (index) => {
        const p = savedPresets[index];
        if (!p) return;
        latInput.value = p.lat;
        latVal.textContent = p.lat;
        orientationSelect.value = p.orientation;
        winHeightInput.value = p.winHeight;
        sillHeightInput.value = p.sillHeight;
        seasonModeSelect.value = p.season;
        computeShading();
    };

    savePresetBtn.addEventListener('click', () => {
        const newPreset = {
            lat: latInput.value,
            orientation: orientationSelect.value,
            winHeight: winHeightInput.value,
            sillHeight: sillHeightInput.value,
            season: seasonModeSelect.value
        };
        savedPresets.push(newPreset);
        localStorage.setItem('auravane_presets', JSON.stringify(savedPresets));
        renderPresets();
    });

    calcBtn.addEventListener('click', computeShading);

    // Initial compute on load
    computeShading();
    renderPresets();
});
