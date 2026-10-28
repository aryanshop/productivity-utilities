document.addEventListener('DOMContentLoaded', () => {
    // Default application state
    let state = {
        startingCash: 12500,
        stressScenario: 0, // percentage change in income (-50 to +50)
        incomes: [
            { id: 1, name: 'Client Retainer A', amount: 4500 },
            { id: 2, name: 'SaaS Subscriptions', amount: 1800 }
        ],
        expenses: [
            { id: 1, name: 'Server & Tools', amount: 350 },
            { id: 2, name: 'Health Insurance', amount: 600 },
            { id: 3, name: 'Workspace Rent', amount: 900 },
            { id: 4, name: 'Living Expenses', amount: 2500 }
        ]
    };

    // Load from localStorage if present
    const savedState = localStorage.getItem('auraslate_state');
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            if (parsed && typeof parsed.startingCash === 'number') {
                state = parsed;
            }
        } catch (e) {
            console.error('Failed to load saved state', e);
        }
    }

    // DOM Elements
    const startingCashInput = document.getElementById('starting-cash');
    const stressSlider = document.getElementById('stress-scenario');
    const stressValBadge = document.getElementById('stress-val');
    const incomeListEl = document.getElementById('income-list');
    const expenseListEl = document.getElementById('expense-list');
    const addIncomeBtn = document.getElementById('add-income');
    const addExpenseBtn = document.getElementById('add-expense');
    const resetBtn = document.getElementById('btn-reset');
    const exportBtn = document.getElementById('btn-export');
    const importFileInput = document.getElementById('import-file');

    const kpiRunway = document.getElementById('kpi-runway');
    const kpiRunwaySub = document.getElementById('kpi-runway-sub');
    const kpiBurn = document.getElementById('kpi-burn');
    const kpiEnding = document.getElementById('kpi-ending');
    const sumInflow = document.getElementById('sum-inflow');
    const sumOutflow = document.getElementById('sum-outflow');
    const sumNet = document.getElementById('sum-net');
    const canvas = document.getElementById('runway-canvas');
    const ctx = canvas.getContext('2d');

    // Initialize controls
    startingCashInput.value = state.startingCash;
    stressSlider.value = state.stressScenario;
    updateStressBadge(state.stressScenario);

    // Event Listeners
    startingCashInput.addEventListener('input', (e) => {
        state.startingCash = parseFloat(e.target.value) || 0;
        saveAndRender();
    });

    stressSlider.addEventListener('input', (e) => {
        state.stressScenario = parseInt(e.target.value, 10) || 0;
        updateStressBadge(state.stressScenario);
        saveAndRender();
    });

    addIncomeBtn.addEventListener('click', () => {
        state.incomes.push({ id: Date.now(), name: 'New Income', amount: 1000 });
        saveAndRender();
    });

    addExpenseBtn.addEventListener('click', () => {
        state.expenses.push({ id: Date.now(), name: 'New Expense', amount: 500 });
        saveAndRender();
    });

    resetBtn.addEventListener('click', () => {
        if (confirm('Reset all values to default demo data?')) {
            localStorage.removeItem('auraslate_state');
            location.reload();
        }
    });

    exportBtn.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "auraslate_budget_backup.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (imported && typeof imported.startingCash === 'number' && Array.isArray(imported.incomes) && Array.isArray(imported.expenses)) {
                    state = imported;
                    startingCashInput.value = state.startingCash;
                    stressSlider.value = state.stressScenario;
                    updateStressBadge(state.stressScenario);
                    saveAndRender();
                    alert('Financial setup imported successfully!');
                } else {
                    alert('Invalid JSON file format.');
                }
            } catch (err) {
                alert('Error parsing JSON file.');
            }
            importFileInput.value = '';
        };
        reader.readAsText(file);
    });

    function updateStressBadge(val) {
        const sign = val > 0 ? '+' : '';
        stressValBadge.textContent = `${sign}${val}% income change`;
    }

    function saveAndRender() {
        localStorage.setItem('auraslate_state', JSON.stringify(state));
        renderLists();
        calculateAndRenderAnalytics();
    }

    function renderLists() {
        // Render Incomes
        incomeListEl.innerHTML = '';
        state.incomes.forEach((inc, index) => {
            const row = document.createElement('div');
            row.className = 'item-row';
            row.innerHTML = `
                <input type="text" value="${escapeHtml(inc.name)}" data-type="income" data-id="${inc.id}" data-field="name">
                <input type="number" value="${inc.amount}" min="0" step="50" data-type="income" data-id="${inc.id}" data-field="amount">
                <button class="btn-delete" data-type="income" data-id="${inc.id}" title="Remove income">&times;</button>
            `;
            incomeListEl.appendChild(row);
        });

        // Render Expenses
        expenseListEl.innerHTML = '';
        state.expenses.forEach((exp, index) => {
            const row = document.createElement('div');
            row.className = 'item-row';
            row.innerHTML = `
                <input type="text" value="${escapeHtml(exp.name)}" data-type="expense" data-id="${exp.id}" data-field="name">
                <input type="number" value="${exp.amount}" min="0" step="50" data-type="expense" data-id="${exp.id}" data-field="amount">
                <button class="btn-delete" data-type="expense" data-id="${exp.id}" title="Remove expense">&times;</button>
            `;
            expenseListEl.appendChild(row);
        });

        // Bind row inputs dynamically
        attachRowListeners();
    }

    function attachRowListeners() {
        incomeListEl.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', (e) => handleItemInput(e, 'incomes'));
        });
        expenseListEl.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', (e) => handleItemInput(e, 'expenses'));
        });

        incomeListEl.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => handleItemDelete(e, 'incomes'));
        });
        expenseListEl.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => handleItemDelete(e, 'expenses'));
        });
    }

    function handleItemInput(e, listKey) {
        const id = parseInt(e.target.dataset.id, 10);
        const field = e.target.dataset.field;
        const val = field === 'amount' ? (parseFloat(e.target.value) || 0) : e.target.value;
        
        const item = state[listKey].find(i => i.id === id);
        if (item) {
            item[field] = val;
            localStorage.setItem('auraslate_state', JSON.stringify(state));
            calculateAndRenderAnalytics();
        }
    }

    function handleItemDelete(e, listKey) {
        const id = parseInt(e.target.dataset.id, 10);
        state[listKey] = state[listKey].filter(i => i.id !== id);
        saveAndRender();
    }

    function calculateAndRenderAnalytics() {
        const baseInflow = state.incomes.reduce((acc, curr) => acc + curr.amount, 0);
        const stressMultiplier = 1 + (state.stressScenario / 100);
        const effectiveInflow = baseInflow * stressMultiplier;
        const totalOutflow = state.expenses.reduce((acc, curr) => acc + curr.amount, 0);
        const netMonthly = effectiveInflow - totalOutflow;

        // Update Summary text
        sumInflow.textContent = formatCurrency(effectiveInflow);
        sumOutflow.textContent = formatCurrency(totalOutflow);
        sumNet.textContent = formatCurrency(netMonthly);
        sumNet.className = netMonthly >= 0 ? 'text-success' : 'text-danger';

        kpiBurn.textContent = formatCurrency(Math.abs(netMonthly));
        if (netMonthly >= 0) {
            kpiBurn.nextElementSibling.textContent = 'Net Monthly Surplus';
        } else {
            kpiBurn.nextElementSibling.textContent = 'Net Monthly Deficit';
        }

        // Runway calculation
        let runwayMonths;
        if (netMonthly >= 0) {
            runwayMonths = 'Infinite';
            kpiRunway.textContent = '∞';
            kpiRunwaySub.textContent = 'Cash flow positive';
        } else {
            const months = state.startingCash / Math.abs(netMonthly);
            runwayMonths = months;
            kpiRunway.textContent = months.toFixed(1) + ' mo';
            kpiRunwaySub.textContent = `Zero cash in ~${Math.round(months)} months`;
        }

        // 12-Month Projection
        const trajectory = [];
        const stressTrajectory = [];
        let currentNormal = state.startingCash;
        let currentStress = state.startingCash;

        for (let m = 0; m <= 12; m++) {
            if (m === 0) {
                trajectory.push(state.startingCash);
                stressTrajectory.push(state.startingCash);
            } else {
                currentNormal += (baseInflow - totalOutflow);
                trajectory.push(currentNormal);

                currentStress += (effectiveInflow - totalOutflow);
                stressTrajectory.push(currentStress);
            }
        }

        kpiEnding.textContent = formatCurrency(trajectory[12]);

        // Draw Canvas Chart
        drawChart(trajectory, stressTrajectory);
    }

    function drawChart(normalData, stressData) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const padding = 40;
        const graphWidth = w - padding * 2;
        const graphHeight = h - padding * 2;

        // Combine data for scaling
        const allVals = [...normalData, ...stressData];
        let minVal = Math.min(...allVals, 0);
        let maxVal = Math.max(...allVals, 1000);
        const range = maxVal - minVal || 1;

        const getX = (index) => padding + (index / 12) * graphWidth;
        const getY = (val) => h - padding - ((val - minVal) / range) * graphHeight;

        // Draw Grid lines
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px sans-serif';

        for (let i = 0; i <= 4; i++) {
            const yVal = minVal + (range * i) / 4;
            const yPos = getY(yVal);
            ctx.beginPath();
            ctx.moveTo(padding, yPos);
            ctx.lineTo(w - padding, yPos);
            ctx.stroke();
            ctx.fillText(formatShortCurrency(yVal), 5, yPos + 4);
        }

        // Zero baseline line if in range
        if (minVal < 0 && maxVal > 0) {
            const zeroY = getY(0);
            ctx.strokeStyle = '#f87171';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(padding, zeroY);
            ctx.lineTo(w - padding, zeroY);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw Month labels
        const monthsLabels = ['Start', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'];
        monthsLabels.forEach((lbl, idx) => {
            const xPos = getX(idx);
            ctx.fillText(lbl, xPos - 10, h - 15);
        });

        // Draw Normal Trajectory line
        drawLine(normalData, '#38bdf8', 3, getX, getY);

        // Draw Stress Trajectory line if different
        if (state.stressScenario !== 0) {
            drawLine(stressData, '#fbbf24', 2, getX, getY, [4, 4]);
        }
    }

    function drawLine(dataArray, color, lineWidth, getX, getY, lineDash = []) {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.setLineDash(lineDash);
        ctx.beginPath();
        dataArray.forEach((val, idx) => {
            const x = getX(idx);
            const y = getY(val);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw points
        ctx.fillStyle = color;
        dataArray.forEach((val, idx) => {
            const x = getX(idx);
            const y = getY(val);
            ctx.beginPath();
            ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function formatCurrency(num) {
        return '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatShortCurrency(num) {
        if (Math.abs(num) >= 1000) {
            return '$' + (num / 1000).toFixed(1) + 'k';
        }
        return '$' + num.toFixed(0);
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // Initial render
    saveAndRender();
});
