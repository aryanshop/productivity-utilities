document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const tempUnitSelect = document.getElementById('tempUnit');
    const unitLabelTemp = document.getElementById('unitLabelTemp');
    const unitLabelOffset = document.getElementById('unitLabelOffset');
    
    const airTempInput = document.getElementById('airTemp');
    const airTempRange = document.getElementById('airTempRange');
    
    const relHumInput = document.getElementById('relHum');
    const relHumRange = document.getElementById('relHumRange');
    
    const leafOffsetInput = document.getElementById('leafOffset');
    const leafOffsetRange = document.getElementById('leafOffsetRange');
    
    const growthStageSelect = document.getElementById('growthStage');
    
    const vpdValueEl = document.getElementById('vpdValue');
    const vpdStatusBadge = document.getElementById('vpdStatusBadge');
    const vpdAdviceEl = document.getElementById('vpdAdvice');
    
    const leafTempValEl = document.getElementById('leafTempVal');
    const dewPointValEl = document.getElementById('dewPointVal');
    const svpValEl = document.getElementById('svpVal');
    const avpValEl = document.getElementById('avpVal');
    
    const recommendationList = document.getElementById('recommendationList');
    const stageTableRows = document.querySelectorAll('.stage-table tbody tr');
    
    const btnLogClimate = document.getElementById('btnLogClimate');
    const btnExportLog = document.getElementById('btnExportLog');
    const btnClearLog = document.getElementById('btnClearLog');
    const logTableBody = document.getElementById('logTableBody');

    // State
    let climateLogs = [];

    // Load logs from localStorage if present
    try {
        const saved = localStorage.getItem('aurabreeze_logs');
        if (saved) {
            climateLogs = JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to load local logs', e);
    }

    // Sync range and number inputs safely
    function syncInputs(rangeEl, numberEl, callback) {
        if (!rangeEl || !numberEl) return;
        rangeEl.addEventListener('input', () => {
            numberEl.value = rangeEl.value;
            if (callback) callback();
        });
        numberEl.addEventListener('input', () => {
            if (numberEl.value !== '') {
                rangeEl.value = numberEl.value;
                if (callback) callback();
            }
        });
    }

    syncInputs(airTempRange, airTempInput, calculateVPD);
    syncInputs(relHumRange, relHumInput, calculateVPD);
    syncInputs(leafOffsetRange, leafOffsetInput, calculateVPD);

    tempUnitSelect.addEventListener('change', () => {
        const isF = tempUnitSelect.value === 'F';
        unitLabelTemp.textContent = isF ? '°F' : '°C';
        unitLabelOffset.textContent = isF ? '°F' : '°C';

        // Convert current slider/number values cleanly
        let currentAirTemp = parseFloat(airTempInput.value);
        let currentOffset = parseFloat(leafOffsetInput.value);

        if (isF) {
            // Convert C to F
            currentAirTemp = (currentAirTemp * 9/5) + 32;
            currentOffset = currentOffset * 9/5;
            
            airTempRange.min = 50;
            airTempRange.max = 115;
            airTempRange.step = 1;
            airTempInput.min = 50;
            airTempInput.max = 115;
            airTempInput.step = 1;
        } else {
            // Convert F to C
            currentAirTemp = (currentAirTemp - 32) * 5/9;
            currentOffset = currentOffset * 5/9;

            airTempRange.min = 10;
            airTempRange.max = 45;
            airTempRange.step = 0.5;
            airTempInput.min = 10;
            airTempInput.max = 45;
            airTempInput.step = 0.5;
        }

        airTempRange.value = currentAirTemp.toFixed(1);
        airTempInput.value = currentAirTemp.toFixed(1);
        leafOffsetRange.value = currentOffset.toFixed(1);
        leafOffsetInput.value = currentOffset.toFixed(1);

        calculateVPD();
    });

    growthStageSelect.addEventListener('change', calculateVPD);

    // Core calculation logic
    function calculateVPD() {
        let airT = parseFloat(airTempInput.value);
        let rh = parseFloat(relHumInput.value);
        let offset = parseFloat(leafOffsetInput.value);
        const isF = tempUnitSelect.value === 'F';

        // Convert to Celsius for formula calculations
        let airTCelsius = isF ? (airT - 32) * 5/9 : airT;
        let offsetCelsius = isF ? offset * 5/9 : offset;

        let leafTCelsius = airTCelsius + offsetCelsius;
        let leafTF = (leafTCelsius * 9/5) + 32;

        // Tetens formula for Saturated Vapor Pressure (kPa)
        // SVP = 0.61078 * exp((17.27 * T) / (T + 237.3))
        const calc1 = (17.27 * airTCelsius) / (airTCelsius + 237.3);
        const svpAir = 0.61078 * Math.exp(calc1);

        // Actual Vapor Pressure
        const avp = svpAir * (rh / 100);

        // Leaf SVP using leaf temperature
        const calcLeaf = (17.27 * leafTCelsius) / (leafTCelsius + 237.3);
        const svpLeaf = 0.61078 * Math.exp(calcLeaf);

        // VPD = SVP_leaf - AVP
        let vpd = svpLeaf - avp;
        if (vpd < 0) vpd = 0;

        // Dew Point approximation
        const aParam = 17.27;
        const bParam = 237.3;
        const alpha = ((aParam * airTCelsius) / (bParam + airTCelsius)) + Math.log(rh / 100);
        const dewPointC = (bParam * alpha) / (aParam - alpha);
        const dewPointDisplay = isF ? (dewPointC * 9/5) + 32 : dewPointC;

        // Render metrics
        vpdValueEl.textContent = vpd.toFixed(2);
        leafTempValEl.textContent = `${leafTCelsius.toFixed(1)} °C / ${leafTF.toFixed(1)} °F`;
        dewPointValEl.textContent = `${dewPointC.toFixed(1)} °C / ${dewPointDisplay.toFixed(1)} °F`;
        svpValEl.textContent = `${svpLeaf.toFixed(2)} kPa`;
        avpValEl.textContent = `${avp.toFixed(2)} kPa`;

        // Evaluate Growth Stage Requirements
        evaluateStageStatus(vpd, airTCelsius);
    }

    function evaluateStageStatus(vpd, airTCelsius) {
        const stage = growthStageSelect.value;
        let minTarget = 0.8, maxTarget = 1.2;

        if (stage === 'prop') { minTarget = 0.4; maxTarget = 0.8; }
        else if (stage === 'veg') { minTarget = 0.8; maxTarget = 1.2; }
        else if (stage === 'lateVeg') { minTarget = 1.0; maxTarget = 1.4; }
        else if (stage === 'flower') { minTarget = 1.2; maxTarget = 1.6; }
        else if (stage === 'drying') { minTarget = 0.6; maxTarget = 1.0; }

        // Highlight active row in table
        stageTableRows.forEach(row => {
            if (row.getAttribute('data-stage') === stage) {
                row.classList.add('active-stage');
            } else {
                row.classList.remove('active-stage');
            }
        });

        let status = 'optimal';
        let statusText = 'Optimal VPD Range';
        let advice = [];

        if (vpd < minTarget) {
            status = 'warning';
            statusText = 'VPD Too Low (Risk of Mold / Stagnant Transpiration)';
            advice.push('Humidity is too high or temperature is too low for this stage.');
            advice.push('Increase room temperature slightly or increase dehumidification/ventilation airflow.');
            advice.push('Low VPD restricts nutrient uptake as plants cannot transpire efficiently.');
        } else if (vpd > maxTarget) {
            status = 'danger';
            statusText = 'VPD Too High (Stomatal Closure / Plant Stress)';
            advice.push('Humidity is too low or temperature is too high, creating excessive transpirational pull.');
            advice.push('Mist cuttings, increase relative humidity via humidifier, or lower lighting intensity/heat.');
            advice.push('Extreme high VPD causes plants to close stomata, halting photosynthesis.');
        } else {
            status = 'optimal';
            statusText = 'Ideal Vapor Pressure Deficit';
            advice.push('Current environment is well-calibrated for robust stomatal conductance and nutrient flow.');
            advice.push('Maintain consistent air circulation under and above canopy to prevent microclimate pockets.');
        }

        vpdStatusBadge.className = `status-badge ${status}`;
        vpdStatusBadge.textContent = statusText;
        vpdAdviceEl.textContent = advice[0];

        // Render detailed recommendation list
        recommendationList.innerHTML = '';
        advice.forEach(tip => {
            const li = document.createElement('li');
            li.textContent = tip;
            recommendationList.appendChild(li);
        });
    }

    // Logging functionality
    btnLogClimate.addEventListener('click', () => {
        const airT = airTempInput.value + ' ' + (tempUnitSelect.value === 'F' ? '°F' : '°C');
        const rh = relHumInput.value + '%';
        const leafT = leafTempValEl.textContent;
        const vpd = vpdValueEl.textContent + ' kPa';
        const stageText = growthStageSelect.options[growthStageSelect.selectedIndex].text.split('(')[0].trim();
        const statusText = vpdStatusBadge.textContent;
        const timestamp = new Date().toLocaleString();

        const newLog = {
            id: Date.now(),
            timestamp,
            airT,
            rh,
            leafT,
            vpd,
            stageText,
            statusText
        };

        climateLogs.unshift(newLog);
        saveAndRenderLogs();
    });

    function saveAndRenderLogs() {
        try {
            localStorage.setItem('aurabreeze_logs', JSON.stringify(climateLogs));
        } catch (e) {
            console.error('Failed to save to localStorage', e);
        }
        renderLogTable();
    }

    function renderLogTable() {
        if (climateLogs.length === 0) {
            logTableBody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="8">No climate snapshots saved yet. Click "Save Climate Snapshot" above.</td>
                </tr>
            `;
            return;
        }

        logTableBody.innerHTML = '';
        climateLogs.forEach((log) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${log.timestamp}</td>
                <td>${log.airT}</td>
                <td>${log.rh}</td>
                <td>${log.leafT}</td>
                <td><strong>${log.vpd}</strong></td>
                <td>${log.stageText}</td>
                <td>${log.statusText}</td>
                <td><button class="delete-row-btn" data-id="${log.id}">Remove</button></td>
            `;
            logTableBody.appendChild(tr);
        });

        // Attach delete handlers
        document.querySelectorAll('.delete-row-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = Number(e.target.getAttribute('data-id'));
                climateLogs = climateLogs.filter(item => item.id !== id);
                saveAndRenderLogs();
            });
        });
    }

    btnClearLog.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all saved climate snapshots?')) {
            climateLogs = [];
            saveAndRenderLogs();
        }
    });

    btnExportLog.addEventListener('click', () => {
        if (climateLogs.length === 0) {
            alert('No logs available to export.');
            return;
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(climateLogs, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "aurabreeze_climate_log.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    // Initial calculation and render
    calculateVPD();
    renderLogTable();
});
