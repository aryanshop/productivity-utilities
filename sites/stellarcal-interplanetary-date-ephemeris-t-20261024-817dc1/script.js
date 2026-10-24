document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const earthDatetimeInput = document.getElementById('earth-datetime');
    const btnNow = document.getElementById('btn-now');
    const btnReset = document.getElementById('btn-reset');
    const missionStartInput = document.getElementById('mission-start');
    const metTimeEl = document.getElementById('met-time');
    const targetBodyDelaySelect = document.getElementById('target-body-delay');
    const lightDelayValEl = document.getElementById('light-delay-val');
    const planetGridEl = document.getElementById('planet-grid');
    
    // Ephemeris elements
    const valJdEl = document.getElementById('val-jd');
    const valMjdEl = document.getElementById('val-mjd');
    const valCenturyEl = document.getElementById('val-century');
    const valGmstEl = document.getElementById('val-gmst');
    const valSolLongEl = document.getElementById('val-sol-long');
    const canvas = document.getElementById('solar-system-canvas');
    const ctx = canvas.getContext('2d');

    // Constants
    const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
    const LIGHT_SPEED_KM_S = 299792.458;

    // Average distances in km from Sun / Earth for rough light delay estimation
    const CELESTIAL_BODIES = {
        moon: { name: 'Moon', distKm: 384400, icon: '🌕' },
        mars: { name: 'Mars', distKm: 225000000, icon: '🔴' },
        venus: { name: 'Venus', distKm: 41000000, icon: '🟡' },
        jupiter: { name: 'Jupiter', distKm: 778500000, icon: '🟠' },
        saturn: { name: 'Saturn', distKm: 1433000000, icon: '🪐' }
    };

    const PLANETS_CONFIG = [
        {
            id: 'mars',
            name: 'Mars (Darian Sol)',
            icon: '🔴',
            dayLengthHours: 24.6597,
            yearLengthDays: 668.6,
            epochOffsetSols: 0,
            primeMeridianOffset: 0
        },
        {
            id: 'lunar',
            name: 'Lunar Standard Time',
            icon: '🌕',
            dayLengthHours: 708.734,
            yearLengthDays: 365.25,
            epochOffsetSols: 0,
            primeMeridianOffset: 0
        },
        {
            id: 'venus',
            name: 'Venusian Rotation',
            icon: '🟡',
            dayLengthHours: 5832.5,
            yearLengthDays: 224.7,
            epochOffsetSols: 0,
            primeMeridianOffset: 0
        },
        {
            id: 'jupiter',
            name: 'Jovian System (Sys II)',
            icon: '🟠',
            dayLengthHours: 9.925,
            yearLengthDays: 4332.6,
            epochOffsetSols: 0,
            primeMeridianOffset: 0
        }
    ];

    // Initialize datetime inputs if empty
    function initInputs() {
        const now = new Date();
        earthDatetimeInput.value = formatLocalDateTime(now);
        
        // Default mission start to 30 days ago
        const past = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        missionStartInput.value = formatLocalDateTime(past);
    }

    function formatLocalDateTime(date) {
        const pad = (n) => String(n).padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const mins = pad(date.getMinutes());
        return `${year}-${month}-${day}T${hours}:${mins}`;
    }

    // Event Listeners
    btnNow.addEventListener('click', () => {
        earthDatetimeInput.value = formatLocalDateTime(new Date());
        updateAll();
    });

    btnReset.addEventListener('click', () => {
        earthDatetimeInput.value = "2000-01-01T12:00";
        updateAll();
    });

    earthDatetimeInput.addEventListener('input', updateAll);
    missionStartInput.addEventListener('input', updateAll);
    targetBodyDelaySelect.addEventListener('change', updateAll);

    // Core calculation pipeline
    function updateAll() {
        const earthDateVal = earthDatetimeInput.value;
        if (!earthDateVal) return;

        const earthDate = new Date(earthDateVal);
        const earthMs = earthDate.getTime();

        if (isNaN(earthMs)) return;

        // 1. Astronomical Constants
        const jd = (earthMs - J2000_MS) / 86400000 + 2451545.0;
        const mjd = jd - 2400000.5;
        const tCentury = (jd - 2451545.0) / 36525.0;
        
        // GMST approximation
        let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0);
        gmst = ((gmst % 360) + 360) % 360;
        const gmstHours = gmst / 15;

        // Solar Longitude approx
        let sunLong = 280.466 + 0.9856474 * (jd - 2451545.0);
        sunLong = ((sunLong % 360) + 360) % 360;

        valJdEl.textContent = jd.toFixed(5);
        valMjdEl.textContent = mjd.toFixed(5);
        valCenturyEl.textContent = tCentury.toFixed(6);
        valGmstEl.textContent = formatHoursToHMS(gmstHours);
        valSolLongEl.textContent = `${sunLong.toFixed(2)}°`;

        // 2. MET Calculation
        const missionStartVal = missionStartInput.value;
        if (missionStartVal) {
            const missionStartDate = new Date(missionStartVal);
            const diffMs = earthMs - missionStartDate.getTime();
            metTimeEl.textContent = formatMET(diffMs);
        } else {
            metTimeEl.textContent = "+000d 00:00:00";
        }

        // 3. Light Speed Delay
        const selectedBodyKey = targetBodyDelaySelect.value;
        const bodyInfo = CELESTIAL_BODIES[selectedBodyKey];
        if (bodyInfo) {
            const seconds = bodyInfo.distKm / LIGHT_SPEED_KM_S;
            lightDelayValEl.textContent = formatLightDelay(seconds);
        }

        // 4. Planetary Grids
        renderPlanetaryCards(jd);

        // 5. Canvas Solar System Render
        renderSolarCanvas(tCentury);
    }

    function formatHoursToHMS(decimalHours) {
        const hrs = Math.floor(decimalHours);
        const mins = Math.floor((decimalHours - hrs) * 60);
        const secs = Math.floor(((decimalHours - hrs) * 60 - mins) * 60);
        const pad = n => String(n).padStart(2, '0');
        return `${pad(hrs)}h ${pad(mins)}m ${pad(secs)}s`;
    }

    function formatMET(ms) {
        const sign = ms < 0 ? '-' : '+';
        const absMs = Math.abs(ms);
        const totalSecs = Math.floor(absMs / 1000);
        const days = Math.floor(totalSecs / 86400);
        const hours = Math.floor((totalSecs % 86400) / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        const pad = n => String(n).padStart(2, '0');
        return `${sign}${String(days).padStart(3, '0')}d ${pad(hours)}:${pad(mins)}:${pad(secs)}`;
    }

    function formatLightDelay(seconds) {
        if (seconds < 60) {
            return `${seconds.toFixed(2)} seconds`;
        } else if (seconds < 3600) {
            const mins = Math.floor(seconds / 60);
            const secs = (seconds % 60).toFixed(1);
            return `${mins}m ${secs}s (~${(seconds/60).toFixed(1)} mins)`;
        } else {
            const hrs = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            return `${hrs}h ${mins}m (~${(seconds/3600).toFixed(2)} hours)`;
        }
    }

    function renderPlanetaryCards(jd) {
        // Clear grid
        planetGridEl.innerHTML = '';

        const daysSinceJ2000 = jd - 2451545.0;

        PLANETS_CONFIG.forEach(planet => {
            const totalHours = (daysSinceJ2000 * 24);
            const planetSols = totalHours / planet.dayLengthHours;
            const solNumber = Math.floor(planetSols);
            const solFraction = planetSols - solNumber;
            
            const solHours = solFraction * planet.dayLengthHours;
            const hours = Math.floor(solHours);
            const minutes = Math.floor((solHours - hours) * 60);
            const seconds = Math.floor(((solHours - hours) * 60 - minutes) * 60);

            const planetaryYear = (daysSinceJ2000 / planet.yearLengthDays).toFixed(2);

            const card = document.createElement('div');
            card.className = 'planet-card';
            card.innerHTML = `
                <div class="planet-header">
                    <span class="planet-icon">${planet.icon}</span>
                    <div class="planet-title">
                        <h3>${planet.name}</h3>
                        <span>Day length: ${planet.dayLengthHours}h</span>
                    </div>
                </div>
                <div class="planet-data">
                    <div class="data-row">
                        <span class="data-label">Current Sol / Cycle:</span>
                        <span class="data-val">Sol ${solNumber.toLocaleString()}</span>
                    </div>
                    <div class="data-row">
                        <span class="data-label">Local Time of Sol:</span>
                        <span class="data-val">${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}</span>
                    </div>
                    <div class="data-row">
                        <span class="data-label">Planetary Year:</span>
                        <span class="data-val">Year ${planetaryYear}</span>
                    </div>
                </div>
            `;
            planetGridEl.appendChild(card);
        });
    }

    function renderSolarCanvas(tCentury) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;

        // Draw Sun
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(cx, cy, 14, 0, Math.PI * 2);
        ctx.fill();

        // Orbit radii and approximate angular speeds based on Kepler's 3rd law
        const orbits = [
            { radius: 45, speed: 4.15, color: '#94a3b8', name: 'Merc' },
            { radius: 70, speed: 1.62, color: '#facc15', name: 'Ven' },
            { radius: 105, speed: 1.00, color: '#38bdf8', name: 'Ear' },
            { radius: 140, speed: 0.53, color: '#f43f5e', name: 'Mar' }
        ];

        orbits.forEach(orb => {
            // Draw orbit circle
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, cy, orb.radius, 0, Math.PI * 2);
            ctx.stroke();

            // Calculate body position
            const angle = tCentury * 100 * orb.speed;
            const x = cx + orb.radius * Math.cos(angle);
            const y = cy + orb.radius * Math.sin(angle);

            // Draw planet dot
            ctx.fillStyle = orb.color;
            ctx.beginPath();
            ctx.arc(x, y, orb.name === 'Ear' ? 4 : 3, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Initial run
    initInputs();
    updateAll();
});
