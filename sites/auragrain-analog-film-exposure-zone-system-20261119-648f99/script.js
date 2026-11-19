document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const filmIsoSelect = document.getElementById('film-iso');
    const baseEvSlider = document.getElementById('base-ev');
    const baseEvVal = document.getElementById('base-ev-val');
    const filterFactorSelect = document.getElementById('filter-factor');
    const zoneTargetSelect = document.getElementById('zone-target');
    const devPushRadios = document.querySelectorAll('input[name="dev"]');
    const rawSecondsSelect = document.getElementById('raw-seconds');

    const resShutter = document.getElementById('res-shutter');
    const resAperture = document.getElementById('res-aperture');
    const resDevTime = document.getElementById('res-dev-time');
    const resReciprocityNote = document.getElementById('res-reciprocity-note');

    const zoneCanvas = document.getElementById('zoneCanvas');
    const zoneNameDisplay = document.getElementById('zone-name-display');
    const zoneDescDisplay = document.getElementById('zone-desc-display');

    const btnReset = document.getElementById('btn-reset');
    const btnSavePreset = document.getElementById('btn-save-preset');
    const btnClearLog = document.getElementById('btn-clear-log');
    const logTbody = document.getElementById('log-tbody');

    // Zone System Definitions
    const zonesData = [
        { roman: "Zone 0", name: "Pure Black", desc: "Absolute black with no shadow detail. Film base + fog.", gray: 0 },
        { roman: "Zone I", name: "Near Black", desc: "Tonal value barely perceptibly above black. Deepest shadows with slight nuance.", gray: 25 },
        { roman: "Zone II", name: "Deep Shadows", desc: "First suggestion of texture in deep shadows. Bark in heavy shade.", gray: 50 },
        { roman: "Zone III", name: "Textured Shadows", desc: "Standard dark shadow placement for textured detail (dark wood, deep hair).", gray: 75 },
        { roman: "Zone IV", name: "Dark Foliage", desc: "Average dark foliage, dark stone, shaded skin tones in portraiture.", gray: 100 },
        { roman: "Zone V", name: "18% Gray", desc: "Mid-tone gray, clear north sky, weathered wood. Baseline metering reference.", gray: 128 },
        { roman: "Zone VI", name: "Average Skin", desc: "Average Caucasian skin, lit stone, sunlit weathered wood.", gray: 160 },
        { roman: "Zone VII", name: "High Values", desc: "Very light skin, bright textured snow in sunlight, white cloth with detail.", gray: 190 },
        { roman: "Zone VIII", name: "Near White", desc: "White objects with delicate texture (white feathers, snow highlights).", gray: 215 },
        { roman: "Zone IX", name: "High White", desc: "Dazzling snow highlights, specular reflections, pure white without texture.", gray: 240 },
        { roman: "Zone X", name: "Pure White", desc: "Light source highlights, glaring specular reflection, absolute paper white.", gray: 255 }
    ];

    let activeHoverZone = 5; // Default Zone V

    // Helper: EV to Shutter Speed at f/8
    function evToShutterAtF8(ev, iso) {
        // Formula: At ISO 100, EV = log2(N^2 / t). For f/8 (N=8), 64/t = 2^EV => t = 64 / 2^EV
        // Adjust for ISO: higher ISO shifts EV sensitivity
        const isoMultiplier = 100 / iso;
        const adjustedEv = ev + Math.log2(isoMultiplier);
        const shutterTime = 64 / Math.pow(2, adjustedEv);
        return shutterTime;
    }

    // Format shutter time nicely
    function formatShutter(seconds) {
        if (seconds >= 1) {
            return seconds.toFixed(1) + 's';
        } else {
            const denom = Math.round(1 / seconds);
            return '1/' + denom + 's';
        }
    }

    // Reciprocity Failure Compensation (Schwartzchild's Law: t_corr = t ^ p, typically p ~ 1.25 to 1.4 for black & white film)
    function calculateReciprocity(seconds) {
        if (seconds <= 1) {
            return { adjusted: seconds, note: 'No reciprocity failure' };
        } else if (seconds <= 10) {
            // ~1.3 exponent approximation
            const adj = Math.pow(seconds, 1.25);
            return { adjusted: adj, note: `Reciprocity applied (+${(adj - seconds).toFixed(1)}s)` };
        } else {
            const adj = Math.pow(seconds, 1.35);
            return { adjusted: adj, note: `Heavy reciprocity (+${(adj - seconds).toFixed(0)}s)` };
        }
    }

    // Main Calculation Engine
    function computeExposure() {
        const iso = parseInt(filmIsoSelect.value);
        const baseEv = parseInt(baseEvSlider.value);
        const filterStops = parseFloat(filterFactorSelect.value);
        const targetZone = parseInt(zoneTrustValue());
        const devPush = getSelectedDevPush();

        // Update EV label
        const evDescriptions = {
            '-2': 'EV -2 (Deep night / Starlight)',
            '0': 'EV 0 (Deep twilight / Full moonlight)',
            '3': 'EV 3 (Deep shade / Campfire light)',
            '6': 'EV 6 (Heavy overcast / Indoor stage)',
            '9': 'EV 9 (Open shade / Heavy overcast day)',
            '12': 'EV 12 (Overcast / Open shade)',
            '15': 'EV 15 (Bright sunlight / Beach / Snow)',
            '18': 'EV 18 (Extreme desert glare)'
        };
        baseEvVal.textContent = `EV ${baseEv} (${evDescriptions[baseEv] || 'Standard Lighting'})`;

        // Zone placement shift relative to Zone V (mid-tone)
        // If user wants shadow placed on Zone III instead of Zone V, exposure needs 2 stops more exposure (+2 EV)
        const zoneOffset = 5 - targetZone;

        // Total EV calculation
        const totalEv = baseEv - filterStops + zoneOffset;

        // Compute shutter speed at fixed f/8
        const baseShutter = evToShutterAtF8(totalEv, iso);
        const reciprocityResult = calculateReciprocity(baseShutter);

        resShutter.textContent = formatShutter(reciprocityResult.adjusted);
        resReciprocityNote.textContent = reciprocityResult.note;

        // Aperture suggestion (fixed at f/8, calculate alternative apertures if shutter is too extreme)
        let recommendedAperture = 'f/8.0';
        if (reciprocityResult.adjusted < 0.001) recommendedAperture = 'f/16 or f/22';
        else if (reciprocityResult.adjusted > 15) recommendedAperture = 'f/4.0 or f/2.8';
        resAperture.textContent = recommendedAperture;

        // Development adjustment (N+/-)
        let devText = '100% (Normal)';
        if (devPush === -2) devText = '60% time (N-2 / Low Contrast)';
        else if (devPush === -1) devText = '75% time (N-1)';
        else if (devPush === 1) devText = '130% time (N+1 / High Contrast)';
        else if (devPush === 2) devText = '170% time (N+2)';
        resDevTime.textContent = devText;

        drawZoneCanvas();
    }

    function zoneTrustValue() {
        return parseInt(zoneTargetSelect.value);
    }

    function getSelectedDevPush() {
        let val = 0;
        devPushRadios.forEach(radio => {
            if (radio.checked) val = parseInt(radio.value);
        });
        return val;
    }

    // Canvas Zone Step Wedge Renderer
    function drawZoneCanvas() {
        if (!zoneCanvas.getContext) return;
        const ctx = zoneCanvas.getContext('2d');
        const width = zoneCanvas.width;
        const height = zoneCanvas.height;

        ctx.clearRect(0, 0, width, height);

        const colWidth = width / zonesData.length;

        zonesData.forEach((zone, index) => {
            const x = index * colWidth;
            const isHovered = (index === activeHoverZone);

            // Fill zone box
            ctx.fillStyle = `rgb(${zone.gray}, ${zone.gray}, ${zone.gray})`;
            ctx.fillRect(x, 0, colWidth, height - 35);

            // Border
            ctx.strokeStyle = isHovered ? '#d4a373' : '#2e3542';
            ctx.lineWidth = isHovered ? 3 : 1;
            ctx.strokeRect(x, 0, colWidth, height - 35);

            // Label background bar
            ctx.fillStyle = '#16191f';
            ctx.fillRect(x, height - 35, colWidth, 35);

            // Roman numerals
            ctx.fillStyle = isHovered ? '#faedcd' : '#9da6b4';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(zone.roman, x + colWidth / 2, height - 14);
        });
    }

    // Canvas Mouse Interaction for Zone Inspector
    zoneCanvas.addEventListener('mousemove', (e) => {
        const rect = zoneCanvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const scaleX = zoneCanvas.width / rect.width;
        const canvasX = mouseX * scaleX;
        const colWidth = zoneCanvas.width / zonesData.length;
        const hoveredIndex = Math.floor(canvasX / colWidth);

        if (hoveredIndex >= 0 && hoveredIndex < zonesData.length && hoveredIndex !== activeHoverZone) {
            activeHoverZone = hoveredIndex;
            updateZoneInspector(activeHoverZone);
            drawZoneCanvas();
        }
    });

    function updateZoneInspector(index) {
        const zone = zonesData[index];
        if (zone) {
            zoneNameDisplay.textContent = `${zone.roman}: ${zone.name} (Reflectance Step ${index})`;
            zoneDescDisplay.textContent = zone.desc;
        }
    }

    // Log History Storage (Local First)
    let logEntries = [];

    function savePresetToLog() {
        const entry = {
            iso: filmIsoSelect.value,
            filter: filterFactorSelect.options[filterFactorSelect.selectedIndex].text.split(' ')[0],
            zone: zoneTargetSelect.options[zoneTargetSelect.selectedIndex].text.split(':')[0],
            shutter: resShutter.textContent,
            aperture: resAperture.textContent,
            dev: getSelectedDevPush() === 0 ? 'N' : (getSelectedDevPush() > 0 ? '+' + getSelectedDevPush() : getSelectedDevPush())
        };

        logEntries.unshift(entry);
        if (logEntries.max > 10) logEntries.pop();
        renderLogTable();
    }

    function renderLogTable() {
        logTbody.innerHTML = '';
        if (logEntries.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="6" style="text-align: center; color: var(--text-secondary);">No saved shots yet. Click 'Save Preset' to log current configuration.</td>`;
            logTbody.appendChild(tr);
            return;
        }

        logEntries.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>ISO ${item.iso}</td>
                <td>${item.filter}</td>
                <td>${item.zone}</td>
                <td><strong style="color: var(--accent-color);">${item.shutter}</strong></td>
                <td>${item.aperture}</td>
                <td>${item.dev}</td>
            `;
            logTbody.appendChild(tr);
        });
    }

    // Event Listeners
    filmIsoSelect.addEventListener('change', computeExposure);
    baseEvSlider.addEventListener('input', computeExposure);
    filterFactorSelect.addEventListener('change', computeExposure);
    zoneTargetSelect.addEventListener('change', computeExposure);
    devPushRadios.forEach(radio => radio.addEventListener('change', computeExposure));
    rawSecondsSelect.addEventListener('change', computeExposure);

    btnReset.addEventListener('click', () => {
        filmIsoSelect.value = '100';
        baseEvSlider.value = '12';
        filterFactorSelect.value = '0';
        zoneTargetSelect.value = '0';
        document.querySelector('input[name="dev"][value="0"]').checked = true;
        rawSecondsSelect.value = '0.008';
        computeExposure();
    });

    btnSavePreset.addEventListener('click', savePresetToLog);
    btnClearLog.addEventListener('click', () => {
        logEntries = [];
        renderLogTable();
    });

    // Initial setup
    computeExposure();
    renderLogTable();
});
