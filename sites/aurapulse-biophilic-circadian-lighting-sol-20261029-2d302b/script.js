document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const windowOrientationSelect = document.getElementById('windowOrientation');
    const roomDepthSlider = document.getElementById('roomDepth');
    const roomDepthVal = document.getElementById('roomDepthVal');
    const workStartInput = document.getElementById('workStart');
    const workEndInput = document.getElementById('workEnd');
    const glareControlSelect = document.getElementById('glareControl');
    const recalcBtn = document.getElementById('recalcBtn');
    const exportBtn = document.getElementById('exportBtn');
    const timeScrubber = document.getElementById('timeScrubber');
    const scrubberTimeVal = document.getElementById('scrubberTimeVal');
    const currentTimeDisplay = document.getElementById('currentTimeDisplay');

    const mediValEl = document.getElementById('mediVal');
    const kelvinValEl = document.getElementById('kelvinVal');
    const riskValEl = document.getElementById('riskVal');
    const scheduleTableBody = document.querySelector('#scheduleTable tbody');
    const solarCanvas = document.getElementById('solarCanvas');
    const ctx = solarCanvas.getContext('2d');

    // Update room depth display
    roomDepthSlider.addEventListener('input', (e) => {
        roomDepthVal.textContent = e.target.value;
    });

    // Helper: format minutes to HH:MM AM/PM
    function formatTime(minutes) {
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const period = hrs >= 12 ? 'PM' : 'AM';
        const formattedHrs = hrs % 12 === 0 ? 12 : hrs % 12;
        const formattedMins = mins < 10 ? '0' + mins : mins;
        return `${formattedHrs}:${formattedMins} ${period}`;
    }

    // Calculate Kelvin and mEDI based on time of day (minutes from midnight) and parameters
    function calculateLightMetrics(timeMin, orientation, depth, glare) {
        // Solar noon is 720 min (12:00 PM)
        // Sun rises ~360 min (6:00 AM), sets ~1080 min (6:00 PM)
        const sunrise = 360;
        const sunset = 1080;
        
        if (timeMin < sunrise || timeMin > sunset) {
            return { kelvin: 2700, medi: 15, risk: 'Low (Night)' };
        }

        // Solar arc progress from 0 (sunrise) to 1 (sunset)
        const dayProgress = (timeMin - sunrise) / (sunset - sunrise);
        // Peak intensity at noon (dayProgress = 0.5)
        const altitudeFactor = Math.sin(dayProgress * Math.PI);

        // Base outdoor illuminance peak ~ 50,000 lux
        let baseLux = altitudeFactor * 45000 + 5000;

        // Orientation modifier
        let orientMultiplier = 0.5; // default side
        if (orientation === 'south') orientMultiplier = 0.85;
        if (orientation === 'east') {
            // higher in morning
            orientMultiplier = timeMin < 720 ? 0.9 : 0.3;
        }
        if (orientation === 'west') {
            // higher in afternoon
            orientMultiplier = timeMin > 720 ? 0.9 : 0.3;
        }
        if (orientation === 'north') orientMultiplier = 0.35;
        if (orientation === 'windowless') orientMultiplier = 0.02;

        // Depth attenuation (Inverse square / absorption approximation)
        const depthAttenuation = Math.max(0.1, 1 - (depth - 1) * 0.08);

        // Glare filter
        let glareFactor = 1.0;
        if (glare === 'translucent') glareFactor = 0.5;
        if (glare === 'opaque') glareFactor = 0.15;

        const indoorLux = baseLux * orientMultiplier * depthAttenuation * glareFactor;

        // Calculate Correlated Color Temperature (CCT)
        // Dawn/Dusk = ~3000K, Noon = ~6000K
        let kelvin = Math.round(3000 + altitudeFactor * 3200);
        if (orientation === 'windowless') kelvin = 4000; // artificial neutral

        // Melanopic Equivalent Daylight Illuminance (mEDI) is roughly 0.5 to 1.1 * photopic lux depending on spectrum
        const medi = Math.round(indoorLux * 0.75);

        // Risk assessment
        let risk = 'Optimal';
        if (timeMin > 960 && kelvin > 4500) {
            risk = 'High (Melatonin suppression)';
        } else if (timeMin < 540 && medi < 100) {
            risk = 'Moderate (Low morning entrainment)';
        }

        return {
            kelvin,
            medi,
            risk,
            lux: Math.round(indoorLux)
        };
    }

    // Draw Solar Arc Canvas
    function drawCanvas(currentTime) {
        const width = solarCanvas.width;
        const height = solarCanvas.height;
        ctx.clearRect(0, 0, width, height);

        // Background gradient representing sky
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
        skyGrad.addColorStop(0, '#090d16');
        skyGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height);

        // Draw horizon line
        const horizonY = height - 40;
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, horizonY);
        ctx.lineTo(width, horizonY);
        ctx.stroke();

        // Draw Solar Arc Path
        const arcCenterX = width / 2;
        const arcCenterY = horizonY;
        const arcRadiusX = width * 0.42;
        const arcRadiusY = height * 0.7;

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.ellipse(arcCenterX, arcCenterY, arcRadiusX, arcRadiusY, 0, Math.PI, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);

        // Calculate sun position based on currentTime (360 to 1080)
        const sunrise = 360;
        const sunset = 1080;
        const clampedTime = Math.max(sunrise, Math.min(sunset, currentTime));
        const progress = (clampedTime - sunrise) / (sunset - sunrise);

        // Angle from PI to 2*PI
        const angle = Math.PI + progress * Math.PI;
        const sunX = arcCenterX + arcRadiusX * Math.cos(angle);
        const sunY = arcCenterY + arcRadiusY * Math.sin(angle);

        // Draw sun glow & body
        const sunGrad = ctx.createRadialGradient(sunX, sunY, 2, sunX, sunY, 25);
        sunGrad.addColorStop(0, 'rgba(245, 158, 11, 0.9)');
        sunGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.3)');
        sunGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');

        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 25, 0, 2 * Math.PI);
        ctx.fill();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(sunX, sunY, 8, 0, 2 * Math.PI);
        ctx.fill();

        // Draw time label on canvas
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(formatTime(currentTime), sunX, sunY - 35);
    }

    // Generate Schedule Prescription Table
    function generateSchedule(startStr, endStr, orientation, depth, glare) {
        scheduleTableBody.innerHTML = '';
        
        // Parse work start/end to minutes
        const [startH, startM] = startStr.split(':').map(Number);
        const [endH, endM] = endStr.split(':').map(Number);
        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;

        // Create 3-4 checkpoints across the shift
        const intervals = [
            { label: 'Morning Ramp-in', time: startMin, phase: 'Alertness Activation' },
            { label: 'Deep Work Peak', time: Math.round(startMin + (endMin - startMin) * 0.35), phase: 'Peak Cognitive Focus' },
            { label: 'Afternoon Sustained', time: Math.round(startMin + (endMin - startMin) * 0.7), phase: 'Sustained Vigilance' },
            { label: 'Evening Wind-down', time: endMin, phase: 'Melatonin Preparation' }
        ];

        intervals.forEach(item => {
            const metrics = calculateLightMetrics(item.time, orientation, depth, glare);
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatTime(item.time)}</td>
                <td><strong>${item.phase}</strong></td>
                <td>${metrics.kelvin} K</td>
                <td>${metrics.lux} lux (${metrics.medi} mEDI)</td>
                <td>${metrics.risk}</td>
            `;
            scheduleTableBody.appendChild(tr);
        });
    }

    // Full update handler
    function updateAll() {
        const currentTime = parseInt(timeScrubber.value, 10);
        scrubberTimeVal.textContent = formatTime(currentTime);
        currentTimeDisplay.textContent = formatTime(currentTime);

        const orientation = windowOrientationSelect.value;
        const depth = parseFloat(roomDepthSlider.value);
        const glare = glareControlSelect.value;

        const metrics = calculateLightMetrics(currentTime, orientation, depth, glare);
        mediValEl.textContent = `${metrics.medi} mEDI`;
        kelvinValEl.textContent = `${metrics.kelvin} K`;
        riskValEl.textContent = metrics.risk;

        drawCanvas(currentTime);
        generateSchedule(workStartInput.value, workEndInput.value, orientation, depth, glare);
    }

    // Event Listeners
    recalcBtn.addEventListener('click', updateAll);
    timeScrubber.addEventListener('input', updateAll);
    windowOrientationSelect.addEventListener('change', updateAll);
    roomDepthSlider.addEventListener('input', updateAll);
    glareControlSelect.addEventListener('change', updateAll);
    workStartInput.addEventListener('change', updateAll);
    workEndInput.addEventListener('change', updateAll);

    // Export JSON action
    exportBtn.addEventListener('click', () => {
        const data = {
            app: "AuraPulse Biophilic Circadian Studio",
            orientation: windowOrientationSelect.value,
            roomDepthMeters: roomDepthSlider.value,
            workShift: { start: workStartInput.value, end: workEndInput.value },
            glareControl: glareControlSelect.value,
            timestamp: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'aurapulse-lighting-prescription.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Initial run
    updateAll();
});
