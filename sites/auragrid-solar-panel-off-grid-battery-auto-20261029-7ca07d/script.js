document.addEventListener('DOMContentLoaded', () => {
    // Default application state & appliances
    const defaultAppliances = [
        { name: 'Refrigerator (Inverter)', watts: 120, hours: 8 },
        { name: 'LED Lighting', watts: 60, hours: 5 },
        { name: 'Laptop / Router Wi-Fi', watts: 65, hours: 10 },
        { name: 'Water Pump 12V', watts: 150, hours: 1 },
        { name: 'Phone & Device Charging', watts: 30, hours: 4 }
    ];

    let appliances = JSON.parse(localStorage.getItem('auragrid_appliances')) || defaultAppliances;

    // Input DOM elements
    const sunHoursInput = document.getElementById('sunHours');
    const panelWattageInput = document.getElementById('panelWattage');
    const systemVoltageSelect = document.getElementById('systemVoltage');
    const batteryTypeSelect = document.getElementById('batteryType');
    const autonomyDaysInput = document.getElementById('autonomyDays');
    const systemLossesInput = document.getElementById('systemLosses');
    
    // Results DOM elements
    const totalWhEl = document.getElementById('totalWh');
    const totalPanelsEl = document.getElementById('totalPanels');
    const panelTextEl = document.getElementById('panelText');
    const totalBatteryAhEl = document.getElementById('totalBatteryAh');
    const batteryAhUnitEl = document.getElementById('batteryAhUnit');
    const mpptAmpsEl = document.getElementById('mpptAmps');
    
    const applianceList = document.getElementById('applianceList');
    const addApplianceBtn = document.getElementById('addApplianceBtn');
    const resetDefaultsBtn = document.getElementById('resetDefaults');
    const exportConfigBtn = document.getElementById('exportConfig');
    const canvas = document.getElementById('energyCanvas');
    const ctx = canvas.getContext('2d');

    // Initialize UI
    function init() {
        renderAppliances();
        calculateAndRender();
        setupEventListeners();
    }

    // Render appliance rows
    function renderAppliances() {
        applianceList.innerHTML = '';
        appliances.forEach((item, index) => {
            const tr = document.createElement('tr');
            const energyWh = Math.round(item.watts * item.hours);
            tr.innerHTML = `
                <td><input type="text" class="app-name" value="${escapeHtml(item.name)}" data-index="${index}" /></td>
                <td><input type="number" class="app-watts" value="${item.watts}" min="0" max="5000" step="5" data-index="${index}" /></td>
                <td><input type="number" class="app-hours" value="${item.hours}" min="0" max="24" step="0.5" data-index="${index}" /></td>
                <td class="app-energy">${energyWh.toLocaleString()} Wh</td>
                <td><button class="btn btn-danger" data-index="${index}">Remove</button></td>
            `;
            applianceList.appendChild(tr);
        });
    }

    // Core calculation engine
    function calculateAndRender() {
        const sunHours = parseFloat(sunHoursInput.value) || 4.5;
        const panelWattage = parseFloat(panelWattageInput.value) || 400;
        const systemVoltage = parseFloat(systemVoltageSelect.value) || 48;
        const usableDoD = parseFloat(batteryTypeSelect.value) || 0.8;
        const autonomyDays = parseFloat(autonomyDaysInput.value) || 2;
        const efficiency = (parseFloat(systemLossesInput.value) || 80) / 100;

        // 1. Calculate Total Daily Wh
        let totalDailyWh = 0;
        appliances.forEach(item => {
            totalDailyWh += (parseFloat(item.watts) || 0) * (parseFloat(item.hours) || 0);
        });

        // Account for system efficiency losses in generation requirement
        const requiredGenerationWh = totalDailyWh / efficiency;

        // 2. Calculate Solar Array Panels Required
        const dailyPanelOutputWh = panelWattage * sunHours;
        const totalPanelsNeeded = dailyPanelOutputWh > 0 ? Math.ceil(requiredGenerationWh / dailyPanelOutputWh) : 0;
        const actualDailyGenerationWh = totalPanelsNeeded * dailyPanelOutputWh;

        // 3. Calculate Battery Bank Ah
        const totalEnergyStorageNeededWh = (totalDailyWh * autonomyDays) / usableDoD;
        const batteryBankAh = Math.round(totalEnergyStorageNeededWh / systemVoltage);

        // 4. Calculate MPPT Charge Controller Amps (Array Amps * 1.25 safety factor)
        const totalArrayWatts = totalPanelsNeeded * panelWattage;
        const mpptAmps = Math.ceil((totalArrayWatts / systemVoltage) * 1.25);

        // Update UI Dashboard metrics
        totalWhEl.textContent = Math.round(totalDailyWh).toLocaleString();
        totalPanelsEl.textContent = totalPanelsNeeded;
        panelTextEl.textContent = `${totalPanelsNeeded} panels (${panelWattage}W each)`;
        totalBatteryAhEl.textContent = batteryBankAh.toLocaleString();
        batteryAhUnitEl.textContent = `Ah at ${systemVoltage}V DC`;
        mpptAmpsEl.textContent = `${mpptAmps} A`;

        // Save to local storage
        localStorage.setItem('auragrid_appliances', JSON.stringify(appliances));

        // Render Canvas Chart
        drawEnergyChart(actualDailyGenerationWh, totalDailyWh);
    }

    // Canvas Graph Drawing
    function drawEnergyChart(dailyGenWh, dailyLoadWh) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const width = canvas.width;
        const height = canvas.height;
        const padding = 40;
        const graphWidth = width - padding * 2;
        const graphHeight = height - padding * 2;

        // Draw Background grid
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;

        for (let i = 0; i <= 4; i++) {
            const y = padding + (graphHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        // Generate 24 hourly points
        const hoursCount = 24;
        const generationPoints = [];
        const loadPoints = [];

        let cumulativeLoad = 0;
        let cumulativeGen = 0;

        // Peak sun hours roughly centered around solar noon (10 AM to 4 PM)
        const peakSunHoursVal = parseFloat(sunHoursInput.value) || 4.5;
        
        for (let h = 0; h < hoursCount; h++) {
            // Approximate bell curve for solar generation from 6 AM (h=6) to 6 PM (h=18)
            let genThisHour = 0;
            if (h >= 6 && h <= 18) {
                const solarAngleFactor = Math.sin(((h - 6) / 12) * Math.PI);
                genThisHour = (dailyGenWh / (peakSunHoursVal * 1.5)) * Math.max(0, solarAngleFactor);
            }
            cumulativeGen += genThisHour;
            generationPoints.push(cumulativeGen);

            // Distribute load across hours (heavier during evening/morning)
            let hourlyLoadFraction = 1 / 24;
            if (h >= 17 || h <= 8) hourlyLoadFraction = 1.5 / 24; // heavier at night
            cumulativeLoad += dailyLoadWh * hourlyLoadFraction;
            loadPoints.push(cumulativeLoad);
        }

        const maxVal = Math.max(dailyGenWh, dailyLoadWh, 1000) * 1.1;

        // Helper to map coordinates
        function getCoords(index, val) {
            const x = padding + (index / (hoursCount - 1)) * graphWidth;
            const y = height - padding - (val / maxVal) * graphHeight;
            return { x, y };
        }

        // Draw Solar Generation Line
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        generationPoints.forEach((val, idx) => {
            const pt = getCoords(idx, val);
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();

        // Draw Cumulative Load Line
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        loadPoints.forEach((val, idx) => {
            const pt = getCoords(idx, val);
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();

        // Draw Axis labels
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        
        // X-axis time markers
        [0, 6, 12, 18, 23].forEach(h => {
            const pt = getCoords(h, 0);
            const timeLabel = h === 0 ? '12 AM' : h === 12 ? '12 PM' : h > 12 ? `${h-12} PM` : `${h} AM`;
            ctx.fillText(timeLabel, pt.x, height - 15);
        });
    }

    // Event Listeners setup
    function setupEventListeners() {
        // Global config input changes
        [sunHoursInput, panelWattageInput, systemVoltageSelect, batteryTypeSelect, autonomyDaysInput, systemLossesInput].forEach(element => {
            element.addEventListener('input', calculateAndRender);
            element.addEventListener('change', calculateAndRender);
        });

        // Appliance table live edits
        applianceList.addEventListener('input', (e) => {
            const index = e.target.dataset.index;
            if (index === undefined) return;

            const item = appliances[index];
            if (e.target.classList.contains('app-name')) {
                item.name = e.target.value;
            } else if (e.target.classList.contains('app-watts')) {
                item.watts = parseFloat(e.target.value) || 0;
            } else if (e.target.classList.contains('app-hours')) {
                item.hours = parseFloat(e.target.value) || 0;
            }

            // Update energy cell live without full re-render to avoid losing focus
            const tr = e.target.closest('tr');
            const energyCell = tr.querySelector('.app-energy');
            const energyWh = Math.round(item.watts * item.hours);
            energyCell.textContent = `${energyWh.toLocaleString()} Wh`;

            calculateAndRender();
        });

        // Remove appliance
        applianceList.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-danger')) {
                const index = parseInt(e.target.dataset.index);
                appliances.splice(index, 1);
                renderAppliances();
                calculateAndRender();
            }
        });

        // Add appliance button
        addApplianceBtn.addEventListener('click', () => {
            appliances.push({ name: 'New Appliance', watts: 50, hours: 4 });
            renderAppliances();
            calculateAndRender();
        });

        // Reset defaults
        resetDefaultsBtn.addEventListener('click', () => {
            if (confirm('Reset all appliances and settings to default?')) {
                appliances = JSON.parse(JSON.stringify(defaultAppliances));
                sunHoursInput.value = '4.5';
                panelWattageInput.value = '400';
                systemVoltageSelect.value = '48';
                batteryTypeSelect.value = '0.8';
                autonomyDaysInput.value = '2';
                systemLossesInput.value = '80';
                renderAppliances();
                calculateAndRender();
            }
        });

        // Export System JSON
        exportConfigBtn.addEventListener('click', () => {
            const data = {
                config: {
                    sunHours: sunHoursInput.value,
                    panelWattage: panelWattageInput.value,
                    systemVoltage: systemVoltageSelect.value,
                    batteryDoD: batteryTypeSelect.value,
                    autonomyDays: autonomyDaysInput.value,
                    systemLosses: systemLossesInput.value
                },
                appliances: appliances,
                timestamp: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'auragrid-solar-plan.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    // HTML escape helper
    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // Run initialization
    init();
});
