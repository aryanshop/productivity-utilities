document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const bedNameInput = document.getElementById('bed-name');
    const bedWidthInput = document.getElementById('bed-width');
    const bedLengthInput = document.getElementById('bed-length');
    const bedDepthInput = document.getElementById('bed-depth');
    const soilTypeSelect = document.getElementById('soil-type');
    const mulchSelect = document.getElementById('mulch-coverage');
    const cropTypeSelect = document.getElementById('crop-type');
    const tempAvgInput = document.getElementById('temp-avg');
    const sunExposureSelect = document.getElementById('sun-exposure');
    const recentRainInput = document.getElementById('recent-rain');
    const irrigationMethodSelect = document.getElementById('irrigation-method');

    const valSoilVol = document.getElementById('val-soil-vol');
    const valSessionWater = document.getElementById('val-session-water');
    const valFrequency = document.getElementById('val-frequency');
    const valWeeklyTotal = document.getElementById('val-weekly-total');
    const statusBadge = document.getElementById('status-badge');
    
    const scheduleTbody = document.getElementById('schedule-tbody');
    const tipsList = document.getElementById('tips-list');
    const gardenNotes = document.getElementById('garden-notes');
    const btnSaveNotes = document.getElementById('btn-save-notes');
    const saveStatus = document.getElementById('save-status');
    
    const btnExport = document.getElementById('btn-export');
    const importFile = document.getElementById('import-file');
    const btnReset = document.getElementById('btn-reset');

    const canvas = document.getElementById('moisture-chart');
    const ctx = canvas ? canvas.getContext('2d') : null;

    // Load saved data if available
    loadFromLocalStorage();

    // Event Listeners for Live Calculation
    const inputs = [
        bedNameInput, bedWidthInput, bedLengthInput, bedDepthInput,
        soilTypeSelect, mulchSelect, cropTypeSelect, tempAvgInput,
        sunExposureSelect, recentRainInput, irrigationMethodSelect
    ];

    inputs.forEach(input => {
        if (input) {
            input.addEventListener('input', calculateAndRender);
            input.addEventListener('change', calculateAndRender);
        }
    });

    if (btnSaveNotes) {
        btnSaveNotes.addEventListener('click', () => {
            localStorage.setItem('auragrid_notes', gardenNotes.value);
            saveStatus.textContent = 'Saved successfully!';
            setTimeout(() => { saveStatus.textContent = ''; }, 2500);
        });
    }

    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if (confirm('Reset all parameters to default?')) {
                localStorage.clear();
                location.reload();
            }
        });
    }

    if (btnExport) {
        btnExport.addEventListener('click', exportJSON);
    }

    if (importFile) {
        importFile.addEventListener('change', importJSON);
    }

    // Initial calculation run
    calculateAndRender();

    function calculateAndRender() {
        // 1. Gather values
        const width = parseFloat(bedWidthInput.value) || 4;
        const length = parseFloat(bedLengthInput.value) || 8;
        const depthInches = parseFloat(bedDepthInput.value) || 10;
        const soilType = soilTypeSelect.value;
        const mulch = mulchSelect.value;
        const cropType = cropTypeSelect.value;
        const temp = parseFloat(tempAvgInput.value) || 75;
        const sun = sunExposureSelect.value;
        const rain = parseFloat(recentRainInput.value) || 0;
        const irrigationEff = parseFloat(irrigationMethodSelect.value) || 0.9;

        // 2. Calculations
        const sqFt = width * length;
        const cubicFeet = sqFt * (depthInches / 12);
        const cubicYards = cubicFeet / 27;

        // Soil capacity factors (Gallons per cubic foot)
        // Loam holds ~1.5 gal/cu.ft available water; Sandy ~0.8; Clay ~2.0; Potting ~2.2
        let baseRetention = 1.5;
        if (soilType === 'sandy') baseRetention = 0.8;
        if (soilType === 'clay') baseRetention = 2.0;
        if (soilType === 'potting') baseRetention = 2.2;

        // Mulch modifier on evaporation
        let evaporationMultiplier = 1.0;
        if (mulch === 'none') evaporationMultiplier = 1.35;
        if (mulch === 'light') evaporationMultiplier = 1.1;
        if (mulch === 'heavy') evaporationMultiplier = 0.75;

        // Sun modifier
        let sunMultiplier = 1.0;
        if (sun === 'full') sunMultiplier = 1.2;
        if (sun === 'shade') sunMultiplier = 0.7;

        // Temperature modifier (baseline 75F)
        let tempMultiplier = Math.max(0.7, temp / 75);

        // Crop factor (Kc)
        let cropFactor = 1.0;
        if (cropType === 'heavy') cropFactor = 1.3;
        if (cropType === 'moderate') cropFactor = 1.0;
        if (cropType === 'drought') cropFactor = 0.6;
        if (cropType === 'seedlings') cropFactor = 1.2;

        // Daily ET (Evapotranspiration in inches or gallons)
        // Standard baseline daily water use ~0.15 inches for moderate crop at 75F in full sun
        const dailyWaterInches = 0.15 * cropFactor * sunMultiplier * tempMultiplier * evaporationMultiplier;
        const dailyWaterGallons = sqFt * dailyWaterInches * 0.623;

        // Total available water holding capacity of the root zone (Gallons)
        const totalCapacityGallons = cubicFeet * baseRetention;
        
        // Effective irrigation need per watering session (~50% depletion of available capacity)
        const targetSessionGallons = (totalCapacityGallons * 0.45) / irrigationEff;
        
        // Recommended frequency (days between waterings)
        const daysBetweenWaterings = Math.max(1, Math.round(targetSessionGallons / Math.max(1, dailyWaterGallons - (rain / 7 * sqFt * 0.623))));
        
        const weeklyTotalGallons = (7 / daysBetweenWaterings) * targetSessionGallons;

        // Update Metrics Display
        valSoilVol.textContent = cubicYards.toFixed(2);
        valSessionWater.textContent = targetSessionGallons.toFixed(1);
        valFrequency.textContent = `Every ${daysBetweenWaterings} ${daysBetweenWaterings === 1 ? 'Day' : 'Days'}`;
        valWeeklyTotal.textContent = weeklyTotalGallons.toFixed(1);

        // Status badge update
        if (dailyWaterGallons > targetSessionGallons * 0.6) {
            statusBadge.textContent = 'High Evaporation Risk';
            statusBadge.style.backgroundColor = '#ffebee';
            statusBadge.style.color = '#c62828';
        } else {
            statusBadge.textContent = 'Optimal Moisture Balance';
            statusBadge.style.backgroundColor = '#e8f5e9';
            statusBadge.style.color = '#2e7d32';
        }

        // Generate 7-Day Forecast & Table
        const forecastData = generateForecast(totalCapacityGallons, dailyWaterGallons, targetSessionGallons, daysBetweenWaterings, rain);
        renderScheduleTable(forecastData);
        renderChart(forecastData, totalCapacityGallons);
        generateTips(soilType, mulch, cropType, daysBetweenWaterings);

        // Save to LocalStorage
        saveToLocalStorage();
    }

    function generateForecast(capacity, dailyUse, sessionWater, freq, rain) {
        let currentMoisture = capacity * 0.75; // Start at 75% capacity
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const forecast = [];

        for (let i = 0; i < 7; i++) {
            let rainAdded = (i === 1) ? (rain * 5) : 0; // simulate distributed recent rain
            let watered = (i % freq === 0);
            let waterAdded = watered ? sessionWater : 0;

            currentMoisture = currentMoisture - dailyUse + rainAdded + waterAdded;
            if (currentMoisture > capacity) currentMoisture = capacity;
            if (currentMoisture < 0) currentMoisture = 0;

            let pct = Math.round((currentMoisture / capacity) * 100);
            let action = watered ? `Water (${sessionWater.toFixed(1)} gal)` : 'Monitor';
            if (pct < 35) action = `URGENT Water (${sessionWater.toFixed(1)} gal)`;

            forecast.push({
                day: days[i],
                et: dailyUse.toFixed(1),
                added: (rainAdded + waterAdded).toFixed(1),
                moisturePct: pct,
                action: action
            });
        }
        return forecast;
    }

    function renderScheduleTable(data) {
        if (!scheduleTbody) return;
        scheduleTbody.innerHTML = '';
        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${row.day}</strong></td>
                <td>${row.et} gal</td>
                <td>${row.added} gal</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="flex-grow: 1; background: #e0e0e0; border-radius: 4px; height: 8px; width: 80px; overflow: hidden;">
                            <div style="background: ${row.moisturePct < 35 ? '#c62828' : '#2e7d32'}; height: 100%; width: ${row.moisturePct}%"></div>
                        </div>
                        <span>${row.moisturePct}%</span>
                    </div>
                </td>
                <td>${row.action}</td>
            `;
            scheduleTbody.appendChild(tr);
        });
    }

    function renderChart(data, capacity) {
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;

        // Background Grid Lines
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= 4; i++) {
            let y = padding + (chartHeight / 4) * i;
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
        }
        ctx.stroke();

        // Draw Moisture Curve
        ctx.strokeStyle = '#2e7d32';
        ctx.lineWidth = 3;
        ctx.beginPath();

        const points = data.map((d, index) => {
            const x = padding + (chartWidth / (data.length - 1)) * index;
            const y = padding + chartHeight - (d.moisturePct / 100) * chartHeight;
            return { x, y, pct: d.moisturePct, day: d.day };
        });

        points.forEach((pt, index) => {
            if (index === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();

        // Draw points and labels
        points.forEach(pt => {
            ctx.fillStyle = pt.pct < 35 ? '#c62828' : '#2e7d32';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#5a6b60';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(pt.day.substring(0, 3), pt.x, height - 12);
            ctx.fillText(`${pt.pct}%`, pt.x, pt.y - 12);
        });
    }

    function generateTips(soil, mulch, crop, freq) {
        if (!tipsList) return;
        const tips = [];

        if (soil === 'sandy') {
            tips.push('Sandy soil drains very quickly. Consider adding compost or organic peat to increase moisture retention.');
        } else if (soil === 'clay') {
            tips.push('Clay soil holds water well but can crust over. Water slowly to prevent runoff and improve deep root penetration.');
        } else {
            tips.push('Your loam soil mix is ideal! Maintain organic top-dressing annually for sustained microbial health.');
        }

        if (mulch === 'none') {
            tips.push('Adding a 3-inch layer of straw or woodchip mulch can reduce surface evaporation by up to 40%.');
        } else {
            tips.push('Your mulch layer is actively protecting the soil microbiome and lowering weed germination rates.');
        }

        if (crop === 'seedlings') {
            tips.push('New seedlings require consistent surface moisture. Water lightly daily until established.');
        } else {
            tips.push(`With your watering frequency (${freq} days), aim for deep watering rather than frequent shallow sprinkling to encourage deep root systems.`);
        }

        tipsList.innerHTML = '';
        tips.forEach(tip => {
            const li = document.createElement('li');
            li.textContent = tip;
            tipsList.appendChild(li);
        });
    }

    function saveToLocalStorage() {
        const data = {
            bedName: bedNameInput.value,
            width: bedWidthInput.value,
            length: bedLengthInput.value,
            depth: bedDepthInput.value,
            soilType: soilTypeSelect.value,
            mulch: mulchSelect.value,
            cropType: cropTypeSelect.value,
            temp: tempAvgInput.value,
            sun: sunExposureSelect.value,
            rain: recentRainInput.value,
            irrigationMethod: irrigationMethodSelect.value,
            notes: gardenNotes.value
        };
        localStorage.setItem('auragrid_state', JSON.stringify(data));
    }

    function loadFromLocalStorage() {
        const saved = localStorage.getItem('auragrid_state');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (data.bedName) bedNameInput.value = data.bedName;
                if (data.width) bedWidthInput.value = data.width;
                if (data.length) bedLengthInput.value = data.length;
                if (data.depth) bedDepthInput.value = data.depth;
                if (data.soilType) soilTypeSelect.value = data.soilType;
                if (data.mulch) mulchSelect.value = data.mulch;
                if (data.cropType) cropTypeSelect.value = data.cropType;
                if (data.temp) tempAvgInput.value = data.temp;
                if (data.sun) sunExposureSelect.value = data.sun;
                if (data.rain) recentRainInput.value = data.rain;
                if (data.irrigationMethod) irrigationMethodSelect.value = data.irrigationMethod;
                if (data.notes) gardenNotes.value = data.notes;
            } catch (e) {
                console.error('Failed to parse saved state', e);
            }
        } else {
            const notesSaved = localStorage.getItem('auragrid_notes');
            if (notesSaved) gardenNotes.value = notesSaved;
        }
    }

    function exportJSON() {
        const data = {
            state: JSON.parse(localStorage.getItem('auragrid_state') || '{}'),
            notes: gardenNotes.value,
            exportDate: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'auragrid-garden-plan.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function importJSON(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                if (parsed.state) {
                    localStorage.setItem('auragrid_state', JSON.stringify(parsed.state));
                }
                if (parsed.notes) {
                    localStorage.setItem('auragrid_notes', parsed.notes);
                }
                alert('Garden plan imported successfully!');
                location.reload();
            } catch (err) {
                alert('Invalid JSON file format.');
            }
        };
        reader.readAsText(file);
    }
});
