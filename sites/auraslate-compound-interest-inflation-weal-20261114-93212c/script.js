document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const principalInput = document.getElementById('initial-principal');
    const monthlyInput = document.getElementById('monthly-contrib');
    const returnInput = document.getElementById('annual-return');
    const inflationInput = document.getElementById('inflation-rate');
    const horizonInput = document.getElementById('time-horizon');
    const taxDragInput = document.getElementById('tax-drag');
    
    const resetBtn = document.getElementById('reset-btn');
    const savePresetBtn = document.getElementById('save-preset-btn');
    const deletePresetBtn = document.getElementById('delete-preset-btn');
    const presetSelect = document.getElementById('preset-select');
    
    const statNominal = document.getElementById('stat-nominal');
    const statNominalDiff = document.getElementById('stat-nominal-diff');
    const statReal = document.getElementById('stat-real');
    const statPurchasingPower = document.getElementById('stat-purchasing-power');
    const statContributions = document.getElementById('stat-contributions');
    const statReturnMultiplier = document.getElementById('stat-return-multiplier');
    
    const canvas = document.getElementById('wealth-canvas');
    const ctx = canvas.getContext('2d');
    const breakdownTbody = document.getElementById('breakdown-tbody');

    // Defaults
    const defaults = {
        principal: 10000,
        monthly: 500,
        returnRate: 7.0,
        inflationRate: 2.5,
        horizon: 30,
        taxDrag: 0.5
    };

    // Local storage key for presets
    const STORAGE_KEY = 'auraslate_presets_v1';

    function formatCurrency(val) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(val);
    }

    function getInputs() {
        return {
            principal: Math.max(0, parseFloat(principalInput.value) || 0),
            monthly: Math.max(0, parseFloat(monthlyInput.value) || 0),
            returnRate: parseFloat(returnInput.value) || 0,
            inflationRate: parseFloat(inflationInput.value) || 0,
            horizon: Math.min(70, Math.max(1, parseInt(horizonInput.value) || 1)),
            taxDrag: parseFloat(taxDragInput.value) || 0
        };
    }

    function calculateSimulation(data) {
        const { principal, monthly, returnRate, inflationRate, horizon, taxDrag } = data;
        
        // Net annual return after tax drag
        const netReturn = Math.max(-100, returnRate - taxDrag);
        const monthlyRate = (netReturn / 100) / 12;
        const monthlyInflation = (inflationRate / 100) / 12;
        
        let nominalBalance = principal;
        let realBalance = principal;
        let totalContributed = principal;
        
        const yearlyData = [];
        
        for (let year = 1; year <= horizon; year++) {
            let yearStartNominal = nominalBalance;
            let yearStartReal = realBalance;
            let yearContributed = 0;
            
            for (let m = 1; m <= 12; m++) {
                // Nominal compounding
                nominalBalance = (nominalBalance + monthly) * (1 + monthlyRate);
                
                // Real purchasing power calculation (deflated monthly)
                // First apply return, then deflate by inflation
                realBalance = (realBalance + monthly) * (1 + monthlyRate);
                realBalance = realBalance / (1 + monthlyInflation);
                
                totalContributed += monthly;
                yearContributed += monthly;
            }
            
            const nominalInterest = nominalBalance - yearStartNominal - yearContributed;
            
            yearlyData.push({
                year,
                totalContributed,
                nominalBalance,
                realBalance,
                interestEarned: Math.max(0, nominalBalance - totalContributed)
            });
        }
        
        return {
            finalNominal: nominalBalance,
            finalReal: realBalance,
            totalContributed,
            yearlyData
        };
    }

    function renderUI(results, inputs) {
        const { finalNominal, finalReal, totalContributed, yearlyData } = results;
        const totalInterest = finalNominal - totalContributed;
        const purchasingPowerPct = finalNominal > 0 ? ((finalReal / finalNominal) * 100).toFixed(1) : 0;
        const growthMultiple = totalContributed > 0 ? (finalNominal / totalContributed).toFixed(2) : 0;
        
        // Update Stat Cards
        statNominal.textContent = formatCurrency(finalNominal);
        statNominalDiff.textContent = `Total Interest: ${formatCurrency(totalInterest)}`;
        
        statReal.textContent = formatCurrency(finalReal);
        statPurchasingPower.textContent = `Purchasing Power Retained: ${purchasingPowerPct}%`;
        
        statContributions.textContent = formatCurrency(totalContributed);
        statReturnMultiplier.textContent = `Growth Multiple: ${growthMultiple}x`;
        
        // Update Table
        breakdownTbody.innerHTML = '';
        yearlyData.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>Year ${row.year}</td>
                <td>Age +${row.year}</td>
                <td>${formatCurrency(row.totalContributed)}</td>
                <td><strong>${formatCurrency(row.nominalBalance)}</strong></td>
                <td style="color: var(--success);">${formatCurrency(row.realBalance)}</td>
                <td>${formatCurrency(row.interestEarned)}</td>
            `;
            breakdownTbody.appendChild(tr);
        });

        // Render Chart
        renderChart(yearlyData);
    }

    function renderChart(yearlyData) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        
        ctx.scale(dpr, dpr);
        const width = rect.width;
        const height = rect.height;
        
        ctx.clearRect(0, 0, width, height);
        
        if (yearlyData.length === 0) return;
        
        const padding = { top: 20, right: 20, bottom: 30, left: 70 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        
        const maxVal = Math.max(...yearlyData.map(d => d.nominalBalance), 1);
        const minVal = 0;
        
        // Draw Grid Lines
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        const gridSteps = 5;
        for (let i = 0; i <= gridSteps; i++) {
            const y = padding.top + (chartHeight / gridSteps) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            
            // Y-Axis Labels
            const val = maxVal - (maxVal / gridSteps) * i;
            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px system-ui, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(formatCompact(val), padding.left - 8, y + 4);
        }

        // Helper for plotting lines
        function drawLine(dataKey, color, lineWidth = 2) {
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();
            
            yearlyData.forEach((d, index) => {
                const x = padding.left + (index / (yearlyData.length - 1 || 1)) * chartWidth;
                const y = padding.top + chartHeight - ((d[dataKey] - minVal) / (maxVal - minVal || 1)) * chartHeight;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();
        }

        // Draw Principal Curve (Warning color)
        drawLine('totalContributed', '#facc15', 1.5);
        
        // Draw Real Curve (Success color)
        drawLine('realBalance', '#34d399', 2);

        // Draw Nominal Curve (Accent color)
        drawLine('nominalBalance', '#38bdf8', 2.5);
    }

    function formatCompact(num) {
        if (num >= 1e9) return '$' + (num / 1e9).toFixed(1) + 'B';
        if (num >= 1e6) return '$' + (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return '$' + (num / 1e3).toFixed(0) + 'k';
        return '$' + num.toFixed(0);
    }

    function runSimulation() {
        const inputs = getInputs();
        const results = calculateSimulation(inputs);
        renderUI(results, inputs);
    }

    // Preset Management
    fnLoadPresets();

    function fnLoadPresets() {
        presetSelect.innerHTML = '<option value="">Load Saved Scenario...</option>';
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            Object.keys(saved).forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                presetSelect.appendChild(opt);
            });
        } catch (e) {
            console.error('Failed to load presets', e);
        }
    }

    savePresetBtn.addEventListener('click', () => {
        const name = prompt('Enter a name for this wealth scenario preset:');
        if (!name || !name.trim()) return;
        
        const inputs = getInputs();
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            saved[name.trim()] = inputs;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
            fnLoadPresets();
            presetSelect.value = name.trim();
        } catch (e) {
            alert('Unable to save preset.');
        }
    });

    presetSelect.addEventListener('change', () => {
        const name = presetSelect.value;
        if (!name) return;
        
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            const p = saved[name];
            if (p) {
                principalInput.value = p.principal;
                monthlyInput.value = p.monthly;
                returnInput.value = p.returnRate;
                inflationInput.value = p.inflationRate;
                horizonInput.value = p.horizon;
                taxDragInput.value = p.taxDrag;
                runSimulation();
            }
        } catch (e) {
            console.error('Error loading preset', e);
        }
    });

    deletePresetBtn.addEventListener('click', () => {
        const name = presetSelect.value;
        if (!name) {
            alert('Please select a preset to delete.');
            return;
        }
        if (confirm(`Are you sure you want to delete preset "${name}"?`)) {
            try {
                const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
                delete saved[name];
                localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
                fnLoadPresets();
                runSimulation();
            } catch (e) {
                console.error('Error deleting preset', e);
            }
        }
    });

    resetBtn.addEventListener('click', () => {
        principalInput.value = defaults.principal;
        monthlyInput.value = defaults.monthly;
        returnInput.value = defaults.returnRate;
        inflationInput.value = defaults.inflationRate;
        horizonInput.value = defaults.horizon;
        taxDragInput.value = defaults.taxDrag;
        runSimulation();
    });

    // Event Listeners for Real-time calculation
    [principalInput, monthlyInput, returnInput, inflationInput, horizonInput, taxDragInput].forEach(input => {
        input.addEventListener('input', runSimulation);
    });

    window.addEventListener('resize', runSimulation);

    // Initial run
    runSimulation();
});
