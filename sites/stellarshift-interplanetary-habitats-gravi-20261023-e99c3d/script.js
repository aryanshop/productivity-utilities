document.addEventListener('DOMContentLoaded', () => {
    // Habitat configurations
    const habitats = {
        moon: {
            name: 'Moon Base (Alpha)',
            badge: 'Moon Base',
            solHours: 708.73, // 29.5 Earth days
            solName: 'Lunar Synodic Day',
            gravity: 0.166,
            gravityDesc: '1/6 Earth Gravity (0.166g)',
            dilationFactor: 0.0000005, // General relativity time dilation micro-sec per day
            baseOffsetHours: 0
        },
        mars: {
            name: 'Mars Colony (Olympus)',
            badge: 'Mars Colony',
            solHours: 24.6597, // 1 sol = 24h 39m
            solName: 'Martian Sol',
            gravity: 0.379,
            gravityDesc: 'Mars Surface Gravity (0.379g)',
            dilationFactor: 0.0000012,
            baseOffsetHours: -5
        },
        europa: {
            name: 'Europa Sub-Surface Outpost',
            badge: 'Europa Outpost',
            solHours: 85.2, // Tidally locked with Jupiter
            solName: 'Jovian Tidal Cycle',
            gravity: 0.134,
            gravityDesc: 'Europa Surface Gravity (0.134g)',
            dilationFactor: 0.0000035,
            baseOffsetHours: 4
        },
        titan: {
            name: 'Titan Hydrocarbon Station',
            badge: 'Titan Station',
            solHours: 382.4, // 15.9 Earth days
            solName: 'Saturnian Orbital Day',
            gravity: 0.138,
            gravityDesc: 'Titan Surface Gravity (0.138g)',
            dilationFactor: 0.0000021,
            baseOffsetHours: 8
        },
        starship: {
            name: 'Relativistic Starship',
            badge: 'Starship (In Flight)',
            solHours: 24.0,
            solName: 'Artificial Ship Cycle',
            gravity: 1.0, // Centrifugal artificial gravity
            gravityDesc: 'Centrifugal Spin Gravity (1.0g)',
            dilationFactor: 86400, // Dynamic based on velocity
            baseOffsetHours: 0
        }
    };

    // DOM Elements
    const dtInput = document.getElementById('earth-datetime');
    const btnNow = document.getElementById('btn-now');
    const habitatSelect = document.getElementById('habitat-select');
    const starshipGroup = document.getElementById('starship-group');
    const velocityRange = document.getElementById('velocity-range');
    const velocityVal = document.getElementById('velocity-val');
    const btnCalculate = document.getElementById('btn-calculate');

    const activeBadge = document.getElementById('active-habitat-badge');
    const resSol = document.getElementById('res-sol');
    const resSolDesc = document.getElementById('res-sol-desc');
    const resGravity = document.getElementById('res-gravity');
    const resGravityDesc = document.getElementById('res-gravity-desc');
    const resDilation = document.getElementById('res-dilation');
    const resDilationDesc = document.getElementById('res-dilation-desc');
    const resProper = document.getElementById('res-proper');
    const resProperDesc = document.getElementById('res-proper-desc');
    
    const timeScrubber = document.getElementById('time-scrubber');
    const meetingWindowBox = document.getElementById('meeting-window-box');
    const canvas = document.getElementById('orbit-canvas');
    const ctx = canvas.getContext('2d');

    // Initialize with current local time
    function setNow() {
        const now = new Date();
        // Format for datetime-local: YYYY-MM-DDTHH:mm
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        dtInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    setNow();

    // Toggle Starship velocity slider
    habitatSelect.addEventListener('change', () => {
        if (habitatSelect.value === 'starship') {
            starshipGroup.classList.remove('hidden');
        } else {
            starshipGroup.classList.add('hidden');
        }
        runCalculation();
    });

    velocityRange.addEventListener('input', () => {
        velocityVal.textContent = velocityRange.value;
        runCalculation();
    });

    btnNow.addEventListener('click', () => {
        setNow();
        runCalculation();
    });

    btnCalculate.addEventListener('click', runCalculation);
    timeScrubber.addEventListener('input', drawOrbitSimulation);

    // Core calculation logic
    function runCalculation() {
        const habitatKey = habitatSelect.value;
        const habitat = habitats[habitatKey];
        const selectedDate = new Date(dtInput.value || Date.now());
        
        activeBadge.textContent = habitat.badge;

        // Sol length
        resSol.textContent = `${habitat.solHours.toFixed(1)} Hours`;
        resSolDesc.textContent = `1 ${habitat.solName}`;

        // Gravity
        resGravity.textContent = `${habitat.gravity.toFixed(3)}g`;
        resGravityDesc.textContent = habitat.gravityDesc;

        // Time Dilation calculation
        let dilationMicroSec = 0;
        let properTimeText = '';

        if (habitatKey === 'starship') {
            const vFraction = parseInt(velocityRange.value) / 100;
            // Lorentz factor gamma = 1 / sqrt(1 - v^2)
            const gamma = 1 / Math.sqrt(1 - (vFraction * vFraction));
            dilationMicroSec = Math.round((gamma - 1) * 86400 * 1000000);
            resDilation.textContent = `${(gamma - 1).toFixed(4)} s/s`;
            resDilationDesc.textContent = `Lorentz Gamma factor: ${gamma.toFixed(3)}`;

            // Proper elapsed time calculation over 1 Earth Year
            const properDaysPerEarthYear = 365.25 / gamma;
            properTimeText = `${properDaysPerEarthYear.toFixed(1)} days per Earth year`;
        } else {
            // Gravitational time dilation (General Relativity approximation based on potential)
            dilationMicroSec = (habitat.gravity * 2.8).toFixed(2);
            resDilation.textContent = `+${dilationMicroSec} µs / day`;
            resDilationDesc.textContent = `General relativity gravitational shift`;

            const epochDiffDays = (selectedDate - new Date('2025-01-01')) / (1000 * 60 * 60 * 24);
            const properDriftSeconds = (epochDiffDays * (habitat.dilationFactor * 0.001)).toFixed(4);
            properTimeText = `Drift: ${properDriftSeconds}s since Epoch 2025`;
        }

        resProper.textContent = properTimeText;
        resProperDesc.textContent = habitatKey === 'starship' ? 'Traveler subjective aging rate' : 'Cumulative clock desynchronization';

        // Compute Meeting Window
        calculateMeetingWindow(habitat);
        drawOrbitSimulation();
    }

    function calculateMeetingWindow(habitat) {
        const earthWakeStart = 8; // 08:00
        const earthWakeEnd = 18; // 18:00
        
        const habitatLocalOffset = habitat.baseOffsetHours;
        // Find overlapping hours
        const overlapStart = Math.max(earthWakeStart, 8 - habitatLocalOffset);
        const overlapEnd = Math.min(earthWakeEnd, 18 - habitatLocalOffset);

        if (overlapStart < overlapEnd) {
            meetingWindowBox.innerHTML = `<strong>Optimal Sync Window Found:</strong> Earth Command [${overlapStart}:00 - ${overlapEnd}:00 UTC] aligns with ${habitat.name} local operational hours. Communication latency is minimal.`;
        } else {
            meetingWindowBox.innerHTML = `<strong>Partial Alignment:</strong> Direct waking overlap is constrained due to orbital offset (${habitatLocalOffset}h shift). Asynchronous message relay recommended between Earth and ${habitat.name}.`;
        }
    }

    // Canvas Visualizer (Day/Night & Orbital Phase)
    function drawOrbitSimulation() {
        const width = canvas.width;
        const height = canvas.height;
        const scrubberVal = parseInt(timeScrubber.value);
        const dayFraction = scrubberVal / 1440; // 0 to 1 over 24h

        ctx.clearRect(0, 0, width, height);

        // Background gradient space
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#0b0f19');
        bgGrad.addColorStop(1, '#131c2e');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Draw Orbital Path line
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(100, height / 2, 60, 0, Math.PI * 2);
        ctx.stroke();

        // Sun position vector based on scrubber
        const sunAngle = dayFraction * Math.PI * 2 - Math.PI / 2;
        const sunX = 100 + Math.cos(sunAngle) * 60;
        const sunY = (height / 2) + Math.sin(sunAngle) * 60;

        // Draw Habitat Planet node
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(100, height / 2, 22, 0, Math.PI * 2);
        ctx.fill();

        // Day/Night terminator simulation on planet
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.beginPath();
        ctx.arc(100, height / 2, 22, sunAngle - Math.PI/2, sunAngle + Math.PI/2, true);
        ctx.fill();

        // Habitat label
        ctx.fillStyle = '#f8fafc';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText('Habitat Body', 50, height - 15);

        // Draw Timeline Horizon Wave on right side
        const waveStartX = 200;
        const waveWidth = width - 220;
        
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(waveStartX, height / 2);
        ctx.lineTo(width - 20, height / 2);
        ctx.stroke();

        // Sine wave representing local solar irradiance / power generation
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < waveWidth; x++) {
            const px = waveStartX + x;
            const angle = (x / waveWidth) * Math.PI * 4 + (dayFraction * Math.PI * 2);
            const py = (height / 2) - Math.sin(angle) * 35;
            if (x === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Scrubber position marker on wave
        const markerX = waveStartX + (dayFraction * waveWidth);
        const markerAngle = (markerX - waveStartX) / waveWidth * Math.PI * 4 + (dayFraction * Math.PI * 2);
        const markerY = (height / 2) - Math.sin(markerAngle) * 35;

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(markerX, markerY, 6, 0, Math.PI * 2);
        ctx.fill();

        // Legend
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillText('Solar Power & Illumination Cycle', waveStartX, 25);
    }

    // Initial run
    runCalculation();
});
