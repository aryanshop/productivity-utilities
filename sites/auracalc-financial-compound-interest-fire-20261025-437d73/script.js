document.addEventListener('DOMContentLoaded', () => {
    const state = {
        currentAge: 30,
        retireAge: 55,
        currentNetWorth: 25000,
        annualIncome: 85000,
        savingsRate: 40,
        annualReturn: 7.5,
        inflationRate: 2.5,
        withdrawalRate: 4.0
    };

    const defaults = { ...state };

    // UI Elements
    const elements = {
        currentAge: document.getElementById('currentAge'),
        retireAge: document.getElementById('retireAge'),
        currentNetWorth: document.getElementById('currentNetWorth'),
        annualIncome: document.getElementById('annualIncome'),
        savingsRate: document.getElementById('savingsRate'),
        annualReturn: document.getElementById('annualReturn'),
        inflationRate: document.getElementById('inflationRate'),
        withdrawalRate: document.getElementById('withdrawalRate'),
        val_currentAge: document.getElementById('val-currentAge'),
        val_retireAge: document.getElementById('val-retireAge'),
        val_savingsRate: document.getElementById('val-savingsRate'),
        val_annualReturn: document.getElementById('val-annualReturn'),
        val_inflationRate: document.getElementById('val-inflationRate'),
        val_withdrawalRate: document.getElementById('val-withdrawalRate'),
        res_fireTarget: document.getElementById('res-fireTarget'),
        res_fireSub: document.getElementById('res-fireSub'),
        res_finalNw: document.getElementById('res-finalNw'),
        res_ageSub: document.getElementById('res-ageSub'),
        res_yearsToFire: document.getElementById('res-yearsToFire'),
        res_dateSub: document.getElementById('res-dateSub'),
        res_passiveIncome: document.getElementById('res-passiveIncome'),
        tableBody: document.getElementById('tableBody'),
        growthCanvas: document.getElementById('growthCanvas'),
        resetDefaults: document.getElementById('resetDefaults'),
        exportData: document.getElementById('exportData')
    };

    function formatCurrency(val) {
        return '$' + Math.round(val).toLocaleString();
    }

    function initInputs() {
        Object.keys(state).forEach(key => {
            if (elements[key]) {
                elements[key].value = state[key];
                if (elements['val_' + key]) {
                    elements['val_' + key].textContent = state[key];
                }
            }
        });
    }

    function updateStateFromDOM() {
        state.currentAge = parseInt(elements.currentAge.value) || 18;
        state.retireAge = parseInt(elements.retireAge.value) || 20;
        if (state.retireAge <= state.currentAge) {
            state.retireAge = state.currentAge + 1;
            elements.retireAge.value = state.retireAge;
        }

        state.currentNetWorth = parseFloat(elements.currentNetWorth.value) || 0;
        state.annualIncome = parseFloat(elements.annualIncome.value) || 0;
        state.savingsRate = parseFloat(elements.savingsRate.value) || 0;
        state.annualReturn = parseFloat(elements.annualReturn.value) || 0;
        state.inflationRate = parseFloat(elements.inflationRate.value) || 0;
        state.withdrawalRate = parseFloat(elements.withdrawalRate.value) || 0;

        // Update badge labels
        elements.val_currentAge.textContent = state.currentAge;
        elements.val_retireAge.textContent = state.retireAge;
        elements.val_savingsRate.textContent = state.savingsRate;
        elements.val_annualReturn.textContent = state.annualReturn;
        elements.val_inflationRate.textContent = state.inflationRate;
        elements.val_withdrawalRate.textContent = state.withdrawalRate;
    }

    function calculateProjections() {
        const years = Math.max(1, state.retireAge - state.currentAge);
        const annualSavings = state.annualIncome * (state.savingsRate / 100);
        const annualSpend = state.annualIncome - annualSavings;
        
        const fireTarget = annualSpend / (state.withdrawalRate / 100);
        
        let nominalNW = state.currentNetWorth;
        let realNW = state.currentNetWorth;
        
        const rNominal = state.annualReturn / 100;
        const inflation = state.inflationRate / 100;
        const rReal = (1 + rNominal) / (1 + inflation) - 1;

        const timeline = [];
        let fireYearIndex = null;

        for (let i = 0; i <= years; i++) {
            const age = state.currentAge + i;
            const year = new Date().getFullYear() + i;

            if (i > 0) {
                const nominalGain = nominalNW * rNominal;
                nominalNW = nominalNW + nominalGain + annualSavings;

                const realGain = realNW * rReal;
                realNW = realNW + realGain + annualSavings;
            }

            const contributionsSoFar = state.currentNetWorth + (annualSavings * i);
            const investmentGain = nominalNW - contributionsSoFar;

            timeline.push({
                age,
                year,
                annualSavings,
                investmentGain,
                nominalNW,
                realNW
            });

            if (fireYearIndex === null && nominalNW >= fireTarget) {
                fireYearIndex = i;
            }
        }

        return {
            fireTarget,
            annualSpend,
            finalNominal: nominalNW,
            finalReal: realNW,
            fireYearIndex,
            timeline
        };
    }

    function renderDashboard(data) {
        elements.res_fireTarget.textContent = formatCurrency(data.fireTarget);
        elements.res_fireSub.textContent = `Based on ${formatCurrency(data.annualSpend)}/yr spend`;
        
        elements.res_finalNw.textContent = formatCurrency(data.finalNominal);
        elements.res_ageSub.textContent = `At age ${state.retireAge} (Real: ${formatCurrency(data.finalReal)})`;

        if (data.fireYearIndex !== null) {
            const fireAge = state.currentAge + data.fireYearIndex;
            elements.res_yearsToFire.textContent = `${data.fireYearIndex} yrs`;
            elements.res_dateSub.textContent = `Achieved at age ${fireAge} (${data.timeline[data.fireYearIndex].year})`;
        } else {
            elements.res_yearsToFire.textContent = `${state.retireAge - state.currentAge}+ yrs`;
            elements.res_dateSub.textContent = 'Target not reached in timeframe';
        }

        const passiveIncome = data.finalNominal * (state.withdrawalRate / 100);
        elements.res_passiveIncome.textContent = formatCurrency(passiveIncome);

        renderTable(data.timeline);
        renderChart(data.timeline, data.fireTarget);
    }

    function renderTable(timeline) {
        elements.tableBody.innerHTML = '';
        timeline.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.age}</td>
                <td>${row.year}</td>
                <td>${formatCurrency(row.annualSavings)}</td>
                <td>${formatCurrency(row.investmentGain)}</td>
                <td><strong>${formatCurrency(row.nominalNW)}</strong></td>
                <td>${formatCurrency(row.realNW)}</td>
            `;
            elements.tableBody.appendChild(tr);
        });
    }

    function renderChart(timeline, fireTarget) {
        const canvas = elements.growthCanvas;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        if (timeline.length < 2) return;

        const maxNW = Math.max(
            ...timeline.map(t => Math.max(t.nominalNW, t.realNW)),
            fireTarget * 1.1
        );

        const padding = 50;
        const graphWidth = width - padding * 2;
        const graphHeight = height - padding * 2;

        // Draw grid lines
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px system-ui';

        const gridSteps = 4;
        for (let i = 0; i <= gridSteps; i++) {
            const y = padding + (graphHeight / gridSteps) * i;
            const val = maxNW * (1 - i / gridSteps);
            
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();

            ctx.fillText('$' + Math.round(val / 1000) + 'k', 10, y + 3);
        }

        // Draw FIRE Target line
        const targetY = padding + graphHeight - (fireTarget / maxNW) * graphHeight;
        if (targetY >= padding && targetY <= height - padding) {
            ctx.strokeStyle = '#f59e0b';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(padding, targetY);
            ctx.lineTo(width - padding, targetY);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#f59e0b';
            ctx.fillText('FIRE Target: ' + formatCurrency(fireTarget), padding, targetY - 6);
        }

        function getCoords(index, val) {
            const x = padding + (index / (timeline.length - 1)) * graphWidth;
            const y = padding + graphHeight - (val / maxNW) * graphHeight;
            return { x, y };
        }

        // Draw Nominal NW Line
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        timeline.forEach((t, idx) => {
            const { x, y } = getCoords(idx, t.nominalNW);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw Real NW Line
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        timeline.forEach((t, idx) => {
            const { x, y } = getCoords(idx, t.realNW);
            if (idx === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }

    function exportCSV() {
        const data = calculateProjections();
        let csv = 'Age,Year,Annual Savings,Investment Gain,Nominal Net Worth,Real Net Worth\n';
        data.timeline.forEach(row => {
            csv += `${row.age},${row.year},${row.annualSavings.toFixed(2)},${row.investmentGain.toFixed(2)},${row.nominalNW.toFixed(2)},${row.realNW.toFixed(2)}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', 'auracalc_fire_report.csv');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    // Event Listeners
    const allInputs = [ 
        elements.currentAge, elements.retireAge, elements.currentNetWorth, 
        elements.annualIncome, elements.savingsRate, elements.annualReturn, 
        elements.inflationRate, elements.withdrawalRate 
    ];

    allInputs.forEach(input => {
        input.addEventListener('input', () => {
            updateStateFromDOM();
            renderDashboard(calculateProjections());
        });
    });

    elements.resetDefaults.addEventListener('click', () => {
        Object.assign(state, defaults);
        initInputs();
        renderDashboard(calculateProjections());
    });

    elements.exportData.addEventListener('click', exportCSV);

    // Initial render
    initInputs();
    renderDashboard(calculateProjections());
});
