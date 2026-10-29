document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const spoolNameInput = document.getElementById('spoolName');
    const spoolCostInput = document.getElementById('spoolCost');
    const spoolWeightInput = document.getElementById('spoolWeight');
    const emptySpoolWeightInput = document.getElementById('emptySpoolWeight');

    const printWeightInput = document.getElementById('printWeight');
    const printHoursInput = document.getElementById('printHours');
    const printerWattsInput = document.getElementById('printerWatts');
    const kwhCostInput = document.getElementById('kwhCost');
    const printerWearInput = document.getElementById('printerWear');
    const failRiskInput = document.getElementById('failRisk');
    const laborTimeInput = document.getElementById('laborTime');
    const laborRateInput = document.getElementById('laborRate');

    const markupRange = document.getElementById('markupRange');
    const markupValue = document.getElementById('markupValue');

    // Results elements
    const resTotalCost = document.getElementById('resTotalCost');
    const resRetailPrice = document.getElementById('resRetailPrice');
    const resFilamentCost = document.getElementById('resFilamentCost');
    const resPowerCost = document.getElementById('resPowerCost');
    const resWearCost = document.getElementById('resWearCost');
    const resLaborCost = document.getElementById('resLaborCost');
    const resRiskCost = document.getElementById('resRiskCost');
    const resProfit = document.getElementById('resProfit');

    const saveSpoolBtn = document.getElementById('saveSpoolBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const inventoryList = document.getElementById('inventoryList');
    const spoolCountBadge = document.getElementById('spoolCountBadge');
    const costChart = document.getElementById('costChart');

    // Preset buttons
    document.querySelectorAll('.badge-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            spoolWeightInput.value = btn.dataset.weight;
            spoolCostInput.value = btn.dataset.cost;
            calculateCosts();
        });
    });

    // Markup slider sync
    markupRange.addEventListener('input', () => {
        markupValue.textContent = markupRange.value + '%';
        calculateCosts();
    });

    // Input listeners for real-time recalculation
    const allInputs = [
        spoolNameInput, spoolCostInput, spoolWeightInput, emptySpoolWeightInput,
        printWeightInput, printHoursInput, printerWattsInput, kwhCostInput,
        printerWearInput, failRiskInput, laborTimeInput, laborRateInput
    ];

    allInputs.forEach(input => {
        input.addEventListener('input', calculateCosts);
    });

    // Core Calculation Function
    function calculateCosts() {
        const spoolCost = parseFloat(spoolCostInput.value) || 0;
        const spoolWeight = parseFloat(spoolWeightInput.value) || 1000;
        const printWeight = parseFloat(printWeightInput.value) || 0;
        const printHours = parseFloat(printHoursInput.value) || 0;
        const printerWatts = parseFloat(printerWattsInput.value) || 0;
        const kwhCost = parseFloat(kwhCostInput.value) || 0;
        const printerWear = parseFloat(printerWearInput.value) || 0;
        const failRisk = parseFloat(failRiskInput.value) || 0;
        const laborTimeMins = parseFloat(laborTimeInput.value) || 0;
        const laborRate = parseFloat(laborRateInput.value) || 0;
        const markupPct = parseFloat(markupRange.value) || 0;

        // 1. Filament cost per gram
        const costPerGram = spoolCost / spoolWeight;
        const baseFilamentCost = printWeight * costPerGram;

        // 2. Power cost: (Watts / 1000) * Hours * kwhCost
        const powerKwh = (printerWatts / 1000) * printHours;
        const powerCost = powerKwh * kwhCost;

        // 3. Machine wear & maintenance
        const wearCost = printHours * printerWear;

        // 4. Labor cost
        const laborCost = (laborTimeMins / 60) * laborRate;

        // 5. Subtotal before risk
        const subtotal = baseFilamentCost + powerCost + wearCost + laborCost;

        // 6. Failure contingency risk factor
        const riskCost = subtotal * (failRisk / 100);

        // 7. Total Production Cost
        const totalProductionCost = subtotal + riskCost;

        // 8. Retail Price with markup
        const retailPrice = totalProductionCost * (1 + markupPct / 100);
        const estimatedProfit = retailPrice - totalProductionCost;

        // Update UI Text
        resTotalCost.textContent = '$' + totalProductionCost.toFixed(2);
        resRetailPrice.textContent = '$' + retailPrice.toFixed(2);
        resFilamentCost.textContent = '$' + baseFilamentCost.toFixed(2);
        resPowerCost.textContent = '$' + powerCost.toFixed(2);
        resWearCost.textContent = '$' + wearCost.toFixed(2);
        resLaborCost.textContent = '$' + laborCost.toFixed(2);
        resRiskCost.textContent = '$' + riskCost.toFixed(2);
        resProfit.textContent = '$' + estimatedProfit.toFixed(2);

        // Draw breakdown chart
        drawChart({
            filament: baseFilamentCost,
            power: powerCost,
            wear: wearCost,
            labor: laborCost,
            risk: riskCost
        });

        return {
            totalProductionCost,
            retailPrice,
            baseFilamentCost,
            powerCost,
            wearCost,
            laborCost,
            riskCost,
            estimatedProfit
        };
    }

    // HTML5 Canvas Pie Chart Renderer
    function drawChart(costs) {
        const ctx = costChart.getContext('2d');
        const width = costChart.width;
        const height = costChart.height;

        ctx.clearRect(0, 0, width, height);

        const data = [
            { label: 'Filament', val: costs.filament, color: '#2ea043' },
            { label: 'Power', val: costs.power, color: '#58a6ff' },
            { label: 'Wear', val: costs.wear, color: '#f0883e' },
            { label: 'Labor', val: costs.labor, color: '#bc8cff' },
            { label: 'Risk', val: costs.risk, color: '#f85149' }
        ];

        const total = data.reduce((sum, item) => sum + item.val, 0);
        if (total <= 0) {
            ctx.fillStyle = '#8b949e';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No cost data to display', width / 2, height / 2);
            return;
        }

        let currentAngle = -Math.PI / 2;
        const centerX = 90;
        const centerY = height / 2;
        const radius = 60;

        // Draw Pie Slices
        data.forEach(item => {
            if (item.val <= 0) return;
            const sliceAngle = (item.val / total) * (Math.PI * 2);

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = item.color;
            ctx.fill();

            currentAngle += sliceAngle;
        });

        // Draw Legend
        let legendX = 175;
        let legendY = 25;
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';

        data.forEach(item => {
            const pct = total > 0 ? ((item.val / total) * 100).toFixed(1) : 0;

            // Color box
            ctx.fillStyle = item.color;
            ctx.fillRect(legendX, legendY, 10, 10);

            // Text
            ctx.fillStyle = '#f0f6fc';
            ctx.fillText(`${item.label} (${pct}%)`, legendX + 16, legendY + 9);

            legendY += 24;
        });
    }

    // Spool Inventory Management (localStorage)
    let inventory = JSON.parse(localStorage.getItem('auraslice_spools') || '[]');

    function renderInventory() {
        inventoryList.innerHTML = '';
        spoolCountBadge.textContent = inventory.length + (inventory.length === 1 ? ' spool' : ' spools');

        if (inventory.length === 0) {
            inventoryList.innerHTML = '<div class="empty-state">No spools saved in local vault yet.</div>';
            return;
        }

        inventory.forEach((spool, index) => {
            const item = document.createElement('div');
            item.className = 'inventory-item';

            const costPerG = (spool.cost / spool.weight).toFixed(3);

            item.innerHTML = `
                <div class="inventory-info">
                    <strong>${escapeHtml(spool.name)}</strong>
                    <span>$${spool.cost.toFixed(2)} / ${spool.weight}g ($${costPerG}/g)</span>
                </div>
                <div class="inventory-actions">
                    <button type="button" class="icon-btn load-spool" title="Load into Calculator" data-index="${index}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
                    </button>
                    <button type="button" class="icon-btn delete-spool" title="Delete Spool" data-index="${index}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            `;
            inventoryList.appendChild(item);
        });

        // Bind inventory action buttons
        inventoryList.querySelectorAll('.load-spool').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.currentTarget.dataset.index;
                const spool = inventory[idx];
                spoolNameInput.value = spool.name;
                spoolCostInput.value = spool.cost;
                spoolWeightInput.value = spool.weight;
                emptySpoolWeightInput.value = spool.emptyWeight || 220;
                calculateCosts();
            });
        });

        inventoryList.querySelectorAll('.delete-spool').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.currentTarget.dataset.index;
                inventory.splice(idx, 1);
                localStorage.setItem('auraslice_spools', JSON.stringify(inventory));
                renderInventory();
            });
        });
    }

    saveSpoolBtn.addEventListener('click', () => {
        const name = spoolNameInput.value.trim() || 'Custom Spool';
        const cost = parseFloat(spoolCostInput.value) || 0;
        const weight = parseFloat(spoolWeightInput.value) || 1000;
        const emptyWeight = parseFloat(emptySpoolWeightInput.value) || 220;

        inventory.push({ name, cost, weight, emptyWeight });
        localStorage.setItem('auraslice_spools', JSON.stringify(inventory));
        renderInventory();
    });

    // CSV Export
    exportCsvBtn.addEventListener('click', () => {
        const results = calculateCosts();
        const csvContent = [
            ['AuraSlice 3D Print Cost Report'],
            ['Filament Name', spoolNameInput.value],
            ['Filament Cost ($)', spoolCostInput.value],
            ['Spool Weight (g)', spoolWeightInput.value],
            ['Print Weight (g)', printWeightInput.value],
            ['Print Duration (hrs)', printHoursInput.value],
            ['Total Production Cost ($)', results.totalProductionCost.toFixed(2)],
            ['Suggested Retail Price ($)', results.retailPrice.toFixed(2)],
            ['Estimated Net Profit ($)', results.estimatedProfit.toFixed(2)]
        ].map(e => e.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'auraslice-print-cost.csv';
        a.click();
        URL.revokeObjectURL(url);
    });

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Initial setup
    calculateCosts();
    renderInventory();
});
