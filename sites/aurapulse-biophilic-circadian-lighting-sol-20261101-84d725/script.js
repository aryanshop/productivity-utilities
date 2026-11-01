document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const orientationSelect = document.getElementById('window-orientation');
    const valOrientation = document.getElementById('val-orientation');
    const roomDepthInput = document.getElementById('room-depth');
    const valDepth = document.getElementById('val-depth');
    const glazingInput = document.getElementById('glazing-trans');
    const valGlazing = document.getElementById('val-glazing');
    const seasonSelect = document.getElementById('season-select');
    const workStartInput = document.getElementById('work-start');
    const workEndInput = document.getElementById('work-end');
    
    const timeScrubber = document.getElementById('time-scrubber');
    const currentTimeLabel = document.getElementById('current-time-label');
    const scrubberTimeIndicator = document.getElementById('scrubber-time-indicator');
    const btnPlay = document.getElementById('btn-play');
    
    const metricKelvin = document.getElementById('metric-kelvin');
    const metricEdi = document.getElementById('metric-edi');
    const metricAlert = document.getElementById('metric-alert');
    
    const currentSwatch = document.getElementById('current-swatch');
    const prescPhaseTitle = document.getElementById('presc-phase-title');
    const prescDesc = document.getElementById('presc-desc');
    const prescCct = document.getElementById('presc-cct');
    const prescLux = document.getElementById('presc-lux');
    
    const btnExport = document.getElementById('btn-export');
    const btnPresets = document.getElementById('btn-presets');
    const exportModal = document.getElementById('export-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const exportText = document.getElementById('export-text');
    const btnCopyExport = document.getElementById('btn-copy-export');

    const solarCanvas = document.getElementById('solarCanvas');
    const solarCtx = solarCanvas.getContext('2d');
    const rhythmCanvas = document.getElementById('rhythmCanvas');
    const rhythmCtx = rhythmCanvas.getContext('2d');

    // State
    let isPlaying = false;
    let playInterval = null;

    // Helper: Format minutes to HH:MM AM/PM
    function formatMinutes(totalMinutes) {
        let hours = Math.floor(totalMinutes / 60);
        let minutes = totalMinutes % 60;
        let ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        let minutesStr = minutes < 10 ? '0' + minutes : minutes;
        return `${hours}:${minutesStr} ${ampm}`;
    }

    function formatMinutes24(totalMinutes) {
        let hours = Math.floor(totalMinutes / 60);
        let minutes = totalMinutes % 60;
        let hStr = hours < 10 ? '0' + hours : hours;
        let mStr = minutes < 10 ? '0' + minutes : minutes;
        return `${hStr}:${mStr}`;
    }

    // Convert Kelvin to approx RGB for canvas rendering
    function kelvinToRGB(kelvin) {
        let temp = kelvin / 100;
        let red, green, blue;

        if (temp <= 66) {
            red = 255;
            green = temp;
            green = 99.4708025861 * Math.log(green) - 161.1195681661;
            if (temp <= 19) {
                blue = 0;
            } else {
                blue = temp - 10;
                blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
            }
        } else {
            red = temp - 60;
            red = 329.698727446 * Math.pow(red, -0.1332047592);
            green = temp - 60;
            green = 288.1221695283 * Math.pow(green, -0.0755148492);
            blue = 255;
        }

        return {
            r: Math.min(255, Math.max(0, Math.round(red))),
            g: Math.min(255, Math.max(0, Math.round(green))),
            b: Math.min(255, Math.max(0, Math.round(blue)))
        };
    }

    // Calculate CCT, Lux, and Melanopic Equivalent Daylight Illuminance (mEDI) based on time and params
    function calculateLightMetrics(minutes, orientation, depth, glazing, season) {
        // Day spans from 360 (6:00 AM) to 1140 (7:00 PM)
        // Peak solar noon is 720 (12:00 PM)
        
        let sunProgress = (minutes - 360) / (1140 - 360);
        if (sunProgress < 0 || sunProgress > 1) {
            // Nighttime
            return {
                kelvin: 2200,
                lux: 10,
                edi: 2,
                phase: 'Night / Evening Wind-Down',
                desc: 'Melatonin production active. Low blue light required for restorative sleep preparation.',
                alertness: 'Resting'
            };
        }

        // Solar altitude angle approximation based on season
        let maxAltitude = season === 'summer' ? 72 : (season === 'winter' ? 28 : 50);
        let altitude = Math.sin(sunProgress * Math.PI) * maxAltitude;
        
        // Orientation factor
        let orientRad = (parseInt(orientation) * Math.PI) / 180;
        // East favors morning, West favors afternoon, South favors peak noon, North is diffuse
        let orientationBonus = Math.cos(sunProgress * Math.PI * 2 - orientRad) * 0.3 + 0.7;
        
        let baseLux = Math.max(0, Math.sin(sunProgress * Math.PI) * 12000);
        let effectiveLux = baseLux * (glazing / 100) * orientationBonus * Math.max(0.2, (1 - depth * 0.07));
        
        // Kelvin calculation
        let kelvin;
        if (sunProgress < 0.2 || sunProgress > 0.8) {
            kelvin = 3000; // Dawn / Dusk warm light
        } else if (sunProgress < 0.45) {
            kelvin = 4500; // Morning ramp up
        } else if (sunProgress <= 0.55) {
            kelvin = 6500; // Peak solar noon high alertness
        } else {
            kelvin = 5000; // Afternoon decrease
        }

        // mEDI (approx 0.5 ratio for daylight at 6500K)
        let edi = Math.round(effectiveLux * 0.45);
        let luxVal = Math.round(effectiveLux);

        let phase, desc, alertness;
        if (sunProgress < 0.25) {
            phase = 'Dawn & Morning Awakening';
            desc = 'Gradual increase in blue-enriched light signals the suprachiasmatic nucleus to cease melatonin.';
            alertness = 'Ramping Up';
        } else if (sunProgress <= 0.75) {
            phase = 'Deep Work & Peak Alertness';
            desc = 'High melanopic lux supporting sustained focus, cognitive performance, and elevated cortisol rhythms.';
            alertness = 'Optimal';
        } else {
            phase = 'Evening Wind-Down';
            desc = 'Sun angle lowering. Transition to warm CCT (<3000K) to prepare biological clock for rest.';
            alertness = 'Wind-Down';
        }

        return {
            kelvin,
            lux: luxVal,
            edi,
            phase,
            desc,
            alertness
        };
    }

    // Draw Solar Arc Canvas
    function drawSolarScene(minutes, orientation, season) {
        const w = solarCanvas.width;
        const h = solarCanvas.height;
        solarCtx.clearRect(0, 0, w, h);

        // Sky gradient background based on time
        let sunProgress = (minutes - 360) / (1140 - 360);
        sunProgress = Math.max(0, Math.min(1, sunProgress));

        let skyGrad = solarCtx.createLinearGradient(0, 0, 0, h);
        if (sunProgress === 0 || sunProgress === 1) {
            skyGrad.addColorStop(0, '#090d16');
            skyGrad.addColorStop(1, '#111827');
        } else {
            skyGrad.addColorStop(0, '#1e293b');
            skyGrad.addColorStop(1, '#3b82f6');
        }
        solarCtx.fillStyle = skyGrad;
        solarCtx.fillRect(0, 0, w, h);

        // Draw Horizon line
        solarCtx.strokeStyle = '#334155';
        solarCtx.lineWidth = 2;
        solarCtx.beginPath();
        solarCtx.moveTo(0, h - 50);
        solarCtx.lineTo(w, h - 50);
        solarCtx.stroke();

        // Draw Building silhouette / window frame representation
        solarCtx.fillStyle = '#111827';
        solarCtx.fillRect(0, h - 48, w, 48);
        
        // Draw Solar Arc Path
        solarCtx.strokeStyle = 'rgba(251, 191, 36, 0.3)';
        solarCtx.lineWidth = 2;
        solarCtx.setLineDash([4, 4]);
        solarCtx.beginPath();
        solarCtx.arc(w / 2, h - 50, 180, Math.PI, 2 * Math.PI);
        solarCtx.stroke();
        solarCtx.setLineDash([]);

        // Calculate Sun Position on Arc
        let angle = Math.PI * (1 - sunProgress);
        let sunX = w / 2 + 180 * Math.cos(angle);
        let sunY = (h - 50) - 180 * Math.sin(angle);

        // Draw Sun glow
        let gradient = solarCtx.createRadialGradient(sunX, sunY, 5, sunX, sunY, 35);
        gradient.addColorStop(0, 'rgba(251, 191, 36, 0.9)');
        gradient.addColorStop(1, 'rgba(251, 191, 36, 0)');
        solarCtx.fillStyle = gradient;
        solarCtx.beginPath();
        solarCtx.arc(sunX, sunY, 35, 0, 2 * Math.PI);
        solarCtx.fill();

        // Draw Sun core
        solarCtx.fillStyle = '#fbbf24';
        solarCtx.beginPath();
        solarCtx.arc(sunX, sunY, 10, 0, 2 * Math.PI);
        solarCtx.fill();
    }

    // Draw Circadian Rhythm Profile Chart
    function drawRhythmChart(workStart, workEnd) {
        const w = rhythmCanvas.width;
        const h = rhythmCanvas.height;
        rhythmCtx.clearRect(0, 0, w, h);

        // Background grid
        rhythmCtx.strokeStyle = '#2b3a52';
        rhythmCtx.lineWidth = 1;
        rhythmCtx.beginPath();
        rhythmCtx.moveTo(0, h / 2);
        rhythmCtx.lineTo(w, h / 2);
        rhythmCtx.stroke();

        // Draw Cortisol (Alertness) curve across 24 hours (0 to 1440 mins)
        rhythmCtx.strokeStyle = '#fbbf24';
        rhythmCtx.lineWidth = 2.5;
        rhythmCtx.beginPath();
        for (let x = 0; x < w; x++) {
            let minutes = (x / w) * 1440;
            // Cortisol peaks around 8 AM (480 mins) and dips at night
            let val = Math.sin(((minutes - 240) / 1440) * Math.PI * 2) * 0.4 + 0.5;
            let y = h - (val * (h - 20) + 10);
            if (x === 0) rhythmCtx.moveTo(x, y);
            else rhythmCtx.lineTo(x, y);
        }
        rhythmCtx.stroke();

        // Draw Melatonin curve (Inverse)
        rhythmCtx.strokeStyle = '#3b82f6';
        rhythmCtx.lineWidth = 2.5;
        rhythmCtx.beginPath();
        for (let x = 0; x < w; x++) {
            let minutes = (x / w) * 1440;
            // Melatonin peaks at night (1200 - 360 mins)
            let val = Math.cos(((minutes - 360) / 1440) * Math.PI * 2) * 0.4 + 0.5;
            let y = h - (val * (h - 20) + 10);
            if (x === 0) rhythmCtx.moveTo(x, y);
            else rhythmCtx.lineTo(x, y);
        }
        rhythmCtx.stroke();

        // Highlight work window
        let startX = (workStart / 1440) * w;
        let endX = (workEnd / 1440) * w;
        rhythmCtx.fillStyle = 'rgba(59, 130, 246, 0.08)';
        rhythmCtx.fillRect(startX, 0, endX - startX, h);
        rhythmCtx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
        rhythmCtx.strokeRect(startX, 0, endX - startX, h);
    }

    // Update UI components based on current state
    function updateUI() {
        const orientation = orientationSelect.value;
        const orientationText = orientationSelect.options[orientationSelect.selectedIndex].text.split(' ')[0] + '-Facing';
        valOrientation.textContent = orientationText;

        const depth = parseFloat(roomDepthInput.value);
        valDepth.textContent = depth.toFixed(1) + ' m';

        const glazing = parseInt(glazingInput.value);
        valGlazing.textContent = glazing + '%';

        const season = seasonSelect.value;
        const currentMinutes = parseInt(timeScrubber.value);

        currentTimeLabel.textContent = formatMinutes(currentMinutes);
        scrubberTimeIndicator.textContent = formatMinutes24(currentMinutes);

        // Calculate metrics
        const metrics = calculateLightMetrics(currentMinutes, orientation, depth, glazing, season);

        metricKelvin.textContent = metrics.kelvin + 'K';
        metricEdi.textContent = metrics.edi + ' lx';
        metricAlert.textContent = metrics.alertness;

        // Update Prescription Card
        prescPhaseTitle.textContent = metrics.phase;
        prescDesc.textContent = metrics.desc;
        prescCct.textContent = `${metrics.kelvin}K`;
        prescLux.textContent = `${metrics.lux} lx`;

        const rgb = kelvinToRGB(metrics.kelvin);
        const rgbStr = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        currentSwatch.style.background = rgbStr;

        // Draw Scenes
        drawSolarScene(currentMinutes, orientation, season);

        let [wStartH, wStartM] = workStartInput.value.split(':').map(Number);
        let [wEndH, wEndM] = workEndInput.value.split(':').map(Number);
        drawRhythmChart(wStartH * 60 + wStartM, wEndH * 60 + wEndM);
    }

    // Event Listeners
    orientationSelect.addEventListener('change', updateUI);
    roomDepthInput.addEventListener('input', updateUI);
    glazingInput.addEventListener('input', updateUI);
    seasonSelect.addEventListener('change', updateUI);
    workStartInput.addEventListener('change', updateUI);
    workEndInput.addEventListener('change', updateUI);
    timeScrubber.addEventListener('input', updateUI);

    // Play simulation button
    btnPlay.addEventListener('click', () => {
        if (isPlaying) {
            clearInterval(playInterval);
            isPlaying = false;
            btnPlay.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
        } else {
            isPlaying = true;
            btnPlay.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
            playInterval = setInterval(() => {
                let val = parseInt(timeScrubber.value);
                val += 15;
                if (val > 1260) val = 360;
                timeScrubber.value = val;
                updateUI();
            }, 150);
        }
    });

    // Quick Presets
    btnPresets.addEventListener('click', () => {
        orientationSelect.value = '180';
        roomDepthInput.value = '3.5';
        glazingInput.value = '85';
        seasonSelect.value = 'equinox';
        workStartInput.value = '08:30';
        workEndInput.value = '17:30';
        timeScrubber.value = '540'; // 9:00 AM
        updateUI();
    });

    // Palette item clicks to jump scrubber or preview
    document.querySelectorAll('.palette-item').forEach(item => {
        item.addEventListener('click', () => {
            const cct = item.getAttribute('data-cct');
            if (cct === '6500') timeScrubber.value = '720'; // Noon
            else if (cct === '4000') timeScrubber.value = '900'; // 3 PM
            else if (cct === '3000') timeScrubber.value = '1080'; // 6 PM
            else if (cct === '2200') timeScrubber.value = '1200'; // 8 PM
            updateUI();
        });
    });

    // Export modal handling
    btnExport.addEventListener('click', () => {
        let [sH, sM] = workStartInput.value.split(':').map(Number);
        let [eH, eM] = workEndInput.value.split(':').map(Number);
        let startMins = sH * 60 + sM;
        let endMins = eH * 60 + eM;

        let scheduleReport = `=== AURAPULSE CIRCADIAN LIGHTING PRESCRIPTION ===\n`;
        scheduleReport += `Window Orientation: ${orientationSelect.options[orientationSelect.selectedIndex].text}\n`;
        scheduleReport += `Room Depth: ${roomDepthInput.value}m | Glazing: ${glazingInput.value}%\n`;
        scheduleReport += `Work Window: ${workStartInput.value} - ${workEndInput.value}\n\n`;
        scheduleReport += `Recommended Daily Timeline:\n`;
        
        for (let m = startMins; m <= endMins; m += 60) {
            let metrics = calculateLightMetrics(m, orientationSelect.value, parseFloat(roomDepthInput.value), parseInt(glazingInput.value), seasonSelect.value);
            scheduleReport += `- ${formatMinutes(m)}: Target CCT ${metrics.kelvin}K | Estimated mEDI: ${metrics.edi} lux (${metrics.phase})\n`;
        }

        exportText.value = scheduleReport;
        exportModal.classList.remove('hidden');
    });

    btnCloseModal.addEventListener('click', () => {
        exportModal.classList.add('hidden');
    });

    btnCopyExport.addEventListener('click', () => {
        exportText.select();
        document.execCommand('copy');
        btnCopyExport.textContent = 'Copied to Clipboard!';
        setTimeout(() => {
            btnCopyExport.textContent = 'Copy to Clipboard';
        }, 2000);
    });

    exportModal.addEventListener('click', (e) => {
        if (e.target === exportModal) {
            exportModal.classList.add('hidden');
        }
    });

    // Initial render
    updateUI();
});
