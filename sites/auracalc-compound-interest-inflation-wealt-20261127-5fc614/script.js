document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const inputs = {
        principal: document.getElementById('initial-principal'),
        monthly: document.getElementById('monthly-contrib'),
        returnRate: document.getElementById('annual-return'),
        inflation: document.getElementById('inflation-rate'),
        timeHorizonRange: document.getElementById('time-horizon-range'),
        timeHorizonVal: document.getElementById('time-horizon-val'),
        taxDrag: document.getElementById('tax-drag')
    };

    const outputs = {
        nominal: document.getElementById('out-nominal'),
        real: document.getElementById('out-real'),
        contrib: document.getElementById('out-contrib'),
        interest: document.getElementById('out-interest')
    };

    const buttons = {
        reset: document.getElementById('btn-reset'),
        export: document.getElementById('btn-export'),
        savePreset: document.getElementById('btn-save-preset'),
        loadPreset: document.getElementById('btn-load-preset'),
        confirmSave: document.getElementById('btn-confirm-save')
    };

    const modal = document.getElementById('preset-modal');
    const closeModal = document.querySelector('.close-modal');
    const presetList = document.getElementById('preset-list');
    const presetNameInput = document.getElementById('preset-name-input');
    const tableBody = document.getElementById('table-body');
    const canvas = document.getElementById('wealth-canvas');
    const ctx = canvas.getContext('2d');

    // Defaults
    const defaults = {
        principal: 10000,
        monthly: 500,
        returnRate: 7.0,
        inflation: 2.5,
        timeHorizon: 25,
        taxDrag: 0.5
    };

    // Currency formatter
    const fmtCurrency = (val) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(val);
    };

    // Calculation Engine
    function calculateWealth() {
        const P = parseFloat(inputs.principal.value) || 0;
        const PMT = parseFloat(inputs.monthly.value) || 0;
        const grossReturn = (parseFloat(inputs.returnRate.value) || 0) / 100;
        const taxDrag = (parseFloat(inputs.taxDrag.value) || 0) / 100;
        const netReturn = Math.max(-1, grossReturn - taxDrag);
        const inflation = (parseFloat(inputs.inflation.value) || 0) / 100;
        const years = parseInt(inputs.timeHorizonRange.value) || 1;

        inputs.timeHorizonVal.textContent = `${years} ${years === 1 ? 'year' : 'years'}`;

        const monthlyRate = netReturn / 12;
        let currentNominal = P;
        let totalContributed = P;

        const yearlyData = [];

        for (let y = 1; y <= years; y++) {
            let yearStartNominal = currentNominal;
            let yearContributions = 0;

            for (let m = 1; m <= 12; m++) {
                currentNominal = (currentNominal + PMT) * (1 + monthlyRate);
                totalContributed += PMT;
                yearContributions += PMT;
            }

            const interestEarned = currentNominal - yearStartNominal - yearContributions;
            // Real purchasing power adjusted to Year 0 dollars
            const realValue = currentNominal / Math.pow(1 + inflation, y);

            yearlyData.push({
                year: y,
                totalInvested: totalContributed,
                interestEarned: Math.max(0, currentNominal - totalContributed),
                nominalBalance: currentNominal,
                realPurchasingPower: realValue
            });
        }

        const finalRecord = yearlyData[yearlyData.length - 1] || {
            nominalBalance: P,
            realPurchasingPower: P,
            totalInvested: P,
            interestEarned: 0
        };

        // Update UI metrics
        outputs.nominal.textContent = fmtCurrency(finalRecord.nominalBalance);
        outputs.real.textContent = fmtCurrency(finalRecord.realPurchasingPower);
        outputs.contrib.textContent = fmtCurrency(finalRecord.totalInvested);
        outputs.interest.textContent = fmtCurrency(finalRecord.interestEarned);

        renderTable(yearlyData);
        renderCanvas(yearlyData);
    }

    // Render Table
    function renderTable(data) {
        tableBody.innerHTML = '';
        // Render in reverse chronological order for quick inspection
        const reversed = [...data].reverse();
        reversed.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>Yr ${row.year}</td>
                <td>${fmtCurrency(row.totalInvested)}</td>
                <td>${fmtCurrency(row.interestEarned)}</td>
                <td><strong>${fmtCurrency(row.nominalBalance)}</strong></td>
                <td style="color: var(--success)">${fmtCurrency(row.realPurchasingPower)}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    // Render HTML5 Canvas Chart
    function renderCanvas(data) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;

        ctx.clearRect(0, 0, width, height);

        if (data.length === 0) return;

        const padding = { top: 20, right: 20, bottom: 30, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        const maxVal = Math.max(...data.map(d => d.nominalBalance), 1000);
        const minVal = 0;

        const getX = (index) => padding.left + (index / (data.length - 1 || 1)) * chartWidth;
        const getY = (val) => padding.top + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;

        // Draw Grid Lines
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        const gridSteps = 4;
        for (let i = 0; i <= gridSteps; i++) {
            const val = minVal + (maxVal / gridSteps) * i;
            const y = getY(val);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px system-ui, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(formatCompact(val), padding.left - 8, y + 3);
        }

        // Helper for paths
        const drawLine = (selector, color, widthSize = 2) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = widthSize;
            ctx.beginPath();
            data.forEach((d, idx) => {
                const x = getX(idx);
                const y = getY(selector(d));
                if (idx === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        };

        // Draw lines
        drawLine(d => d.totalInvested, '#a78bfa', 1.5);
        drawLine(d => d.realPurchasingPower, '#34d399', 2);
        drawLine(d => d.nominalBalance, '#38bdf8', 2.5);
    }

    function formatCompact(num) {
        if (num >= 1e6) return '$' + (num / 1e6).toFixed(1) + 'M';
        if (num >= 1e3) return '$' + (num / 1e3).toFixed(0) + 'k';
        return '$' + num.toFixed(0);
    }

    // Event Listeners for Inputs
    Object.values(inputs).forEach(input => {
        if (input) {
            input.addEventListener('input', calculateWealth);
        }
    });

    window.addEventListener('resize', calculateWealth);

    // Reset Button
    buttons.reset.addEventListener('click', () => {
        inputs.principal.value = defaults.principal;
        inputs.monthly.value = defaults.monthly;
        inputs.returnRate.value = defaults.returnRate;
        inputs.inflation.value = defaults.inflation;
        inputs.timeHorizonRange.value = defaults.timeHorizon;
        inputs.taxDrag.value = defaults.taxDrag;
        calculateWealth();
    });

    // Export JSON Button
    buttons.export.addEventListener('click', () => {
        const state = {
            principal: inputs.principal.value,
            monthly: inputs.monthly.value,
            returnRate: inputs.returnRate.value,
            inflation: inputs.inflation.value,
            timeHorizon: inputs.timeHorizonRange.value,
            taxDrag: inputs.taxDrag.value,
            timestamp: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'auracalc-wealth-simulation.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    // Preset Modal Logic
    buttons.savePreset.addEventListener('click', () => {
        modal.style.display = 'flex';
        loadPresetList();
    });

    buttons.loadPreset.addEventListener('click', () => {
        modal.style.display = 'flex';
        loadPresetList();
    });

    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    buttons.confirmSave.addEventListener('click', () => {
        const name = presetNameInput.value.trim() || `Preset ${new Date().toLocaleDateString()}`;
        const presets = JSON.parse(localStorage.getItem('auracalc_presets') || '{}');
        
        presets[name] = {
            principal: inputs.principal.value,
            monthly: inputs.monthly.value,
            returnRate: inputs.returnRate.value,
            inflation: inputs.inflation.value,
            timeHorizon: inputs.timeHorizonRange.value,
            taxDrag: inputs.taxDrag.value
        };

        localStorage.setItem('auracalc_presets', JSON.stringify(presets));
        presetNameInput.value = '';
        loadPresetList();
    });

    function loadPresetList() {
        const presets = JSON.parse(localStorage.getItem('auracalc_presets') || '{}');
        presetList.innerHTML = '';
        const keys = Object.keys(presets);

        if (keys.length === 0) {
            presetList.innerHTML = '<p class="empty-msg">No saved presets yet.</p>';
            return;
        }

        keys.forEach(key => {
            const item = document.createElement('div');
            item.className = 'preset-item';
            item.innerHTML = `
                <span>${key}</span>
                <div>
                    <button class="btn primary load-btn" data-name="${key}">Load</button>
                    <button class="btn secondary del-btn" data-name="${key}">Delete</button>
                </div>
            `;
            presetList.appendChild(item);
        });

        // Attach listeners
        document.querySelectorAll('.load-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const name = e.target.getAttribute('data-name');
                const p = presets[name];
                if (p) {
                    inputs.principal.value = p.principal;
                    inputs.monthly.value = p.monthly;
                    inputs.returnRate.value = p.returnRate;
                    inputs.inflation.value = p.inflation;
                    inputs.timeHorizonRange.value = p.timeHorizon;
                    inputs.taxDrag.value = p.taxDrag || 0.5;
                    calculateWealth();
                    modal.style.display = 'none';
                }
            });
        });

        document.querySelectorAll('.del-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const name = e.target.getAttribute('data-name');
                delete presets[name];
                localStorage.setItem('auracalc_presets', JSON.stringify(presets));
                loadPresetList();
            });
        });
    }

    // Initial run
    calculateWealth();
});
