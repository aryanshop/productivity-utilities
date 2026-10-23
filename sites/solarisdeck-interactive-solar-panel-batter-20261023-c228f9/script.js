document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const inputs = {
        monthlyBill: document.getElementById('monthly-bill'),
        electricityRate: document.getElementById('electricity-rate'),
        solarSize: document.getElementById('solar-size'),
        batteryCapacity: document.getElementById('battery-capacity'),
        sunHours: document.getElementById('sun-hours'),
        systemCost: document.getElementById('system-cost'),
        incentivePct: document.getElementById('incentive-pct')
    };

    const displays = {
        monthlyBillVal: document.getElementById('monthly-bill-val'),
        electricityRateVal: document.getElementById('electricity-rate-val'),
        solarSizeVal: document.getElementById('solar-size-val'),
        batteryCapacityVal: document.getElementById('battery-capacity-val'),
        sunHoursVal: document.getElementById('sun-hours-val'),
        incentivePctVal: document.getElementById('incentive-pct-val')
    };

    const kpis = {
        savings: document.getElementById('kpi-savings'),
        savingsSub: document.getElementById('kpi-savings-sub'),
        payback: document.getElementById('kpi-payback'),
        paybackSub: document.getElementById('kpi-payback-sub'),
        profit: document.getElementById('kpi-profit'),
        carbon: document.getElementById('kpi-carbon')
    };

    const bars = {
        solar: document.getElementById('bar-solar'),
        load: document.getElementById('bar-load'),
        battery: document.getElementById('bar-battery'),
        export: document.getElementById('bar-export')
    };

    const vals = {
        solar: document.getElementById('val-solar'),
        load: document.getElementById('val-load'),
        battery: document.getElementById('val-battery'),
        export: document.getElementById('val-export')
    };

    const canvas = document.getElementById('roi-canvas');
    const ctx = canvas.getContext('2d');
    const saveBtn = document.getElementById('save-scenario-btn');
    const resetBtn = document.getElementById('reset-btn');
    const clearScenariosBtn = document.getElementById('clear-scenarios');
    const ledgerList = document.getElementById('ledger-list');

    let savedScenarios = [];

    // Default state backup
    const defaultValues = {
        monthlyBill: 180,
        electricityRate: 0.18,
        solarSize: 6.5,
        batteryCapacity: 10,
        sunHours: 4.5,
        systemCost: 18500,
        incentivePct: 30
    };

    function init() {
        loadScenariosFromStorage();
        setupEventListeners();
        updateCalculations();
        window.addEventListener('resize', drawChart);
    }

    function setupEventListeners() {
        Object.keys(inputs).forEach(key => {
            if (inputs[key]) {
                inputs[key].addEventListener('input', () => {
                    updateDisplayValues();
                    updateCalculations();
                });
            }
        });

        if (saveBtn) {
            saveBtn.addEventListener('click', saveCurrentScenario);
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', resetToDefaults);
        }

        if (clearScenariosBtn) {
            clearScenariosBtn.addEventListener('click', clearAllScenarios);
        }
    }

    function updateDisplayValues() {
        if (displays.monthlyBillVal) displays.monthlyBillVal.textContent = `$${inputs.monthlyBill.value}`;
        if (displays.electricityRateVal) displays.electricityRateVal.textContent = `$${Number(inputs.electricityRate.value).toFixed(2)}`;
        if (displays.solarSizeVal) displays.solarSizeVal.textContent = `${inputs.solarSize.value} kW`;
        if (displays.batteryCapacityVal) displays.batteryCapacityVal.textContent = `${Number(inputs.batteryCapacity.value).toFixed(1)} kWh`;
        if (displays.sunHoursVal) displays.sunHoursVal.textContent = `${Number(inputs.sunHours.value).toFixed(2)} hrs`;
        if (displays.incentivePctVal) displays.incentivePctVal.textContent = `${inputs.incentivePct.value}%`;
    }

    function calculateMetrics() {
        const monthlyBill = parseFloat(inputs.monthlyBill.value);
        const rate = parseFloat(inputs.electricityRate.value);
        const solarSize = parseFloat(inputs.solarSize.value);
        const battery = parseFloat(inputs.batteryCapacity.value);
        const sunHours = parseFloat(inputs.sunHours.value);
        const systemCost = parseFloat(inputs.systemCost.value) || 0;
        const incentivePct = parseFloat(inputs.incentivePct.value);

        // Annual consumption in kWh
        const annualBill = monthlyBill * 12;
        const annualConsumption = annualBill / rate;
        const dailyConsumption = annualConsumption / 365;

        // Solar generation (approx 80% system efficiency factor)
        const dailySolarGen = solarSize * sunHours * 0.85;
        const annualSolarGen = dailySolarGen * 365;

        // Self consumption & battery buffering
        // Assume 50% load occurs when sun shines, rest is buffered by battery up to capacity
        const daytimeLoad = dailyConsumption * 0.5;
        const directSelfConsumption = Math.min(daytimeLoad, dailySolarGen);
        const surplusSolar = Math.max(0, dailySolarGen - daytimeLoad);
        const eveningDeficit = dailyConsumption - daytimeLoad;
        
        const batteryStored = Math.min(surplusSolar, battery, eveningDeficit);
        const totalSelfConsumed = directSelfConsumption + batteryStored;
        const gridExport = Math.max(0, surplusSolar - batteryStored);
        
        const selfConsumptionPct = dailySolarGen > 0 ? (totalSelfConsumed / dailySolarGen) * 100 : 0;

        // Financials
        const netSystemCost = systemCost * (1 - incentivePct / 100);
        const feedInTariff = rate * 0.35; // Feed-in credit is typically lower
        
        const annualSavingsFromOffset = totalSelfConsumed * 365 * rate;
        const annualSavingsFromExport = gridExport * 365 * feedInTariff;
        const totalAnnualSavings = Math.min(annualBill, annualSavingsFromOffset + annualSavingsFromExport);

        const simplePayback = totalAnnualSavings > 0 ? (netSystemCost / totalAnnualSavings) : 99.9;

        // 25-year projection with electricity cost inflation (3% per year)
        let cumulativeCashFlow = [-netSystemCost];
        let baselineWithoutSolar = [0];
        let currentBill = annualBill;
        let totalProfit25 = -netSystemCost;
        const electricityInflation = 0.03;

        for (let year = 1; year <= 25; year++) {
            const billWithoutSolar = currentBill;
            const savingsThisYear = Math.min(currentBill, totalAnnualSavings * Math.pow(1.02, year - 1));
            const billWithSolar = Math.max(0, currentBill - savingsThisYear);
            
            const netBenefit = billWithoutSolar - billWithSolar;
            totalProfit25 += netBenefit;
            
            cumulativeCashFlow.push(cumulativeCashFlow[cumulativeCashFlow.length - 1] + netBenefit);
            baselineWithoutSolar.push(baselineWithoutSolar[baselineWithoutSolar.length - 1] - billWithoutSolar);
            
            currentBill *= (1 + electricityInflation);
        }

        // Carbon offset (approx 0.85 lbs CO2 per kWh -> tons over 25 years)
        const totalKwh25 = annualSolarGen * 25;
        const carbonTons25 = (totalKwh25 * 0.00042); // metric tons

        return {
            annualSavings: totalAnnualSavings,
            simplePayback,
            totalProfit25,
            carbonTons25,
            netSystemCost,
            dailySolarGen,
            dailyConsumption,
            batteryStored,
            gridExport,
            cumulativeCashFlow,
            baselineWithoutSolar
        };
    }

    function updateCalculations() {
        const metrics = calculateMetrics();

        // Update KPIs
        if (kpis.savings) kpis.savings.textContent = `$${Math.round(metrics.annualSavings).toLocaleString()}`;
        if (kpis.savingsSub) kpis.savingsSub.textContent = `~${Math.round((metrics.annualSavings / (parseFloat(inputs.monthlyBill.value) * 12)) * 100)}% bill reduction`;
        
        if (kpis.payback) kpis.payback.textContent = metrics.simplePayback > 50 ? '> 25 yrs' : `${metrics.simplePayback.toFixed(1)} yrs`;
        if (kpis.profit) kpis.profit.textContent = `$${Math.round(metrics.totalProfit25).toLocaleString()}`;
        if (kpis.carbon) kpis.carbon.textContent = `${metrics.carbonTons25.toFixed(1)} tons`;

        // Update Energy Balance Bars
        const maxVal = Math.max(metrics.dailySolarGen, metrics.dailyConsumption, 1);
        if (bars.solar) bars.solar.style.width = `${Math.min(100, (metrics.dailySolarGen / maxVal) * 100)}%`;
        if (bars.load) bars.load.style.width = `${Math.min(100, (metrics.dailyConsumption / maxVal) * 100)}%`;
        if (bars.battery) bars.battery.style.width = `${Math.min(100, (metrics.batteryStored / maxVal) * 100)}%`;
        if (bars.export) bars.export.style.width = `${Math.min(100, (metrics.gridExport / maxVal) * 100)}%`;

        if (vals.solar) vals.solar.textContent = `${metrics.dailySolarGen.toFixed(1)} kWh`;
        if (vals.load) vals.load.textContent = `${metrics.dailyConsumption.toFixed(1)} kWh`;
        if (vals.battery) vals.battery.textContent = `${metrics.batteryStored.toFixed(1)} kWh`;
        if (vals.export) vals.export.textContent = `${metrics.gridExport.toFixed(1)} kWh`;

        drawChart(metrics);
    }

    function drawChart(metricsData) {
        if (!canvas) return;
        const metrics = metricsData || calculateMetrics();
        
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;

        ctx.clearRect(0, 0, width, height);

        const data = metrics.cumulativeCashFlow;
        const maxVal = Math.max(...data);
        const minVal = Math.min(...data);
        const range = maxVal - minVal || 1;

        const padding = { top: 20, right: 20, bottom: 30, left: 60 };
        const graphWidth = width - padding.left - padding.right;
        const graphHeight = height - padding.top - padding.bottom;

        // Draw Grid Lines
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';

        const gridSteps = 5;
        for (let i = 0; i <= gridSteps; i++) {
            const y = padding.top + (graphHeight / gridSteps) * i;
            const val = maxVal - (range / gridSteps) * i;
            
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            const formattedVal = val >= 1000 || val <= -1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val.toFixed(0)}`;
            ctx.fillText(formattedVal, padding.left - 50, y + 4);
        }

        // Draw Zero Baseline
        const zeroY = padding.top + graphHeight * (maxVal / range);
        if (zeroY >= padding.top && zeroY <= height - padding.bottom) {
            ctx.strokeStyle = '#64748b';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(padding.left, zeroY);
            ctx.lineTo(width - padding.right, zeroY);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw Cumulative Cash Flow Line (Green/Battery accent)
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        data.forEach((val, index) => {
            const x = padding.left + (index / (data.length - 1)) * graphWidth;
            const y = padding.top + graphHeight * ((maxVal - val) / range);
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw X-Axis Labels (Years 0, 5, 10, 15, 20, 25)
        ctx.fillStyle = '#94a3b8';
        for (let year = 0; year <= 25; year += 5) {
            const x = padding.left + (year / 25) * graphWidth;
            ctx.fillText(`Yr ${year}`, x - 10, height - 10);
        }
    }

    function saveCurrentScenario() {
        const metrics = calculateMetrics();
        const scenario = {
            id: Date.now(),
            name: `Scenario ${savedScenarios.length + 1}`,
            solar: inputs.solarSize.value,
            battery: inputs.batteryCapacity.value,
            cost: inputs.systemCost.value,
            savings: Math.round(metrics.annualSavings),
            payback: metrics.simplePayback.toFixed(1)
        };

        savedScenarios.unshift(scenario);
        if (savedScenarios.length > 5) savedScenarios.pop();
        
        saveScenariosToStorage();
        renderLedger();
    }

    function renderLedger() {
        if (!ledgerList) return;
        
        if (savedScenarios.length === 0) {
            ledgerList.innerHTML = `<p class="empty-state">No saved scenarios yet. Configure your system and click 'Save Scenario'.</p>`;
            return;
        }

        ledgerList.innerHTML = '';
        savedScenarios.forEach(sc => {
            const item = document.createElement('div');
            item.className = 'scenario-item';
            item.innerHTML = `
                <div class="scenario-info">
                    <span class="scenario-title">${sc.name} (${sc.solar} kW + ${sc.battery} kWh)</span>
                    <span class="scenario-details">Cost: $${Number(sc.cost).toLocaleString()} &bull; Savings: $${sc.savings}/yr &bull; Payback: ${sc.payback} yrs</span>
                </div>
                <div class="scenario-actions">
                    <button class="btn btn-secondary btn-sm" data-id="${sc.id}">Load</button>
                </div>
            `;
            
            item.querySelector('button').addEventListener('click', () => loadScenario(sc));
            ledgerList.appendChild(item);
        });
    }

    function loadScenario(sc) {
        inputs.solarSize.value = sc.solar;
        inputs.batteryCapacity.value = sc.battery;
        inputs.systemCost.value = sc.cost;
        updateDisplayValues();
        updateCalculations();
    }

    function resetToDefaults() {
        Object.keys(defaultValues).forEach(key => {
            if (inputs[key]) inputs[key].value = defaultValues[key];
        });
        updateDisplayValues();
        updateCalculations();
    }

    function clearAllScenarios() {
        savedScenarios = [];
        saveScenariosToStorage();
        renderLedger();
    }

    function saveScenariosToStorage() {
        try {
            localStorage.setItem('solarisdeck_scenarios', JSON.stringify(savedScenarios));
        } catch (e) {
            // Storage disabled fallback
        }
    }

    function loadScenariosFromStorage() {
        try {
            const stored = localStorage.getItem('solarisdeck_scenarios');
            if (stored) {
                savedScenarios = JSON.parse(stored);
                renderLedger();
            }
        } catch (e) {
            savedScenarios = [];
        }
    }

    init();
});
