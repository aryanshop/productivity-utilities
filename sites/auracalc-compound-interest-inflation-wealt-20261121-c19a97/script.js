document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('calc-form');
    const btnReset = document.getElementById('btn-reset');
    const btnExport = document.getElementById('btn-export');
    const canvas = document.getElementById('growth-canvas');
    const ctx = canvas.getContext('2d');
    const tooltip = document.getElementById('chart-tooltip');
    const tableBody = document.getElementById('table-body');

    const metricNominal = document.getElementById('metric-nominal');
    const metricReal = document.getElementById('metric-real');
    const metricContrib = document.getElementById('metric-contrib');
    const metricInterest = document.getElementById('metric-interest');

    const STORAGE_KEY = 'auracalc_wealth_params';

    let simulationData = [];
    let hoverIndex = null;

    // Default input values
    const defaults = {
        'initial-principal': 10000,
        'monthly-contrib': 500,
        'annual-return': 8.0,
        'inflation-rate': 3.0,
        'time-horizon': 30,
        'tax-drag': 0.5
    };

    function loadSavedState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                for (const [key, val] of Object.entries(data)) {
                    const input = document.getElementById(key);
                    if (input) input.value = val;
                }
            }
        } catch (e) {
            console.error('Failed to load storage', e);
        }
    }

    function saveState() {
        try {
            const data = {};
            for (const key of Object.keys(defaults)) {
                const input = document.getElementById(key);
                if (input) data[key] = input.value;
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save storage', e);
        }
    }

    function formatCurrency(val) {
        return '$' + Math.round(val).toLocaleString();
    }

    function runSimulation() {
        const principal = parseFloat(document.getElementById('initial-principal').value) || 0;
        const monthlyContrib = parseFloat(document.getElementById('monthly-contrib').value) || 0;
        const annualReturn = (parseFloat(document.getElementById('annual-return').value) || 0) / 100;
        const inflationRate = (parseFloat(document.getElementById('inflation-rate').value) || 0) / 100;
        const timeHorizon = parseInt(document.getElementById('time-horizon').value) || 1;
        const taxDrag = (parseFloat(document.getElementById('tax-drag').value) || 0) / 100;

        const netReturn = Math.max(-1, annualReturn - taxDrag);
        const monthlyRate = netReturn / 12;

        simulationData = [];

        let currentNominal = principal;
        let totalPrincipal = principal;
        let currentReal = principal;

        simulationData.push({
            year: 0,
            principal: totalPrincipal,
            interest: 0,
            nominal: currentNominal,
            real: currentReal
        });

        for (let y = 1; y <= timeHorizon; y++) {
            let yearInterest = 0;
            for (let m = 1; m <= 12; m++) {
                const monthlyInterest = currentNominal * monthlyRate;
                yearInterest += monthlyInterest;
                currentNominal += monthlyInterest + monthlyContrib;
                totalPrincipal += monthlyContrib;
            }

            // Apply inflation deflation factor for real purchasing power
            currentReal = currentNominal / Math.pow(1 + inflationRate, y);

            simulationData.push({
                year: y,
                principal: totalPrincipal,
                interest: currentNominal - totalPrincipal,
                nominal: currentNominal,
                real: currentReal
            });
        }

        updateMetrics(simulationData);
        renderTable(simulationData);
        drawChart();
        saveState();
    }

    function updateMetrics(data) {
        const final = data[data.length - 1];
        metricNominal.textContent = formatCurrency(final.nominal);
        metricReal.textContent = formatCurrency(final.real);
        metricContrib.textContent = formatCurrency(final.principal);
        metricInterest.textContent = formatCurrency(final.interest);
    }

    function renderTable(data) {
        tableBody.innerHTML = '';
        // Skip year 0 for cleaner table, or keep it
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>Year ${row.year}</td>
                <td>${formatCurrency(row.principal)}</td>
                <td>${formatCurrency(row.interest)}</td>
                <td>${formatCurrency(row.nominal)}</td>
                <td>${formatCurrency(row.real)}</td>
            `;
            tableBody.appendChild(tr);
        }
    }

    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        drawChart();
    }

    function drawChart() {
        const rectWidth = canvas.width / window.devicePixelRatio;
        const rectHeight = canvas.height / window.devicePixelRatio;

        ctx.clearRect(0, 0, rectWidth, rectHeight);

        if (simulationData.length === 0) return;

        const padding = { top: 20, right: 20, bottom: 30, left: 70 };
        const chartWidth = rectWidth - padding.left - padding.right;
        const chartHeight = rectHeight - padding.top - padding.bottom;

        const maxVal = Math.max(...simulationData.map(d => d.nominal)) * 1.1;

        function getX(i) {
            return padding.left + (i / (simulationData.length - 1)) * chartWidth;
        }

        function getY(val) {
            return padding.top + chartHeight - (val / maxVal) * chartHeight;
        }

        // Draw grid lines & Y-axis labels
        ctx.strokeStyle = '#334155';
        ctx.fillStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        const steps = 5;
        for (let i = 0; i <= steps; i++) {
            const val = (maxVal / steps) * i;
            const y = getY(val);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(rectWidth - padding.right, y);
            ctx.stroke();

            let label = '$' + Math.round(val / 1000) + 'k';
            if (val >= 1000000) label = '$' + (val / 1000000).toFixed(1) + 'M';
            ctx.fillText(label, padding.left - 10, y);
        }

        // Draw Nominal Line Area
        ctx.beginPath();
        ctx.moveTo(getX(0), getY(0));
        for (let i = 0; i < simulationData.length; i++) {
            ctx.lineTo(getX(i), getY(simulationData[i].nominal));
        }
        ctx.lineTo(getX(simulationData.length - 1), padding.top + chartHeight);
        ctx.lineTo(getX(0), padding.top + chartHeight);
        ctx.closePath();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
        ctx.fill();

        // Draw Nominal Line
        ctx.beginPath();
        for (let i = 0; i < simulationData.length; i++) {
            const x = getX(i);
            const y = getY(simulationData[i].nominal);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Draw Real Line (Inflation Adjusted)
        ctx.beginPath();
        for (let i = 0; i < simulationData.length; i++) {
            const x = getX(i);
            const y = getY(simulationData[i].real);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw hover point
        if (hoverIndex !== null && simulationData[hoverIndex]) {
            const hx = getX(hoverIndex);
            const hYNom = getY(simulationData[hoverIndex].nominal);
            const hYReal = getY(simulationData[hoverIndex].real);

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;

            ctx.beginPath();
            ctx.arc(hx, hYNom, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#38bdf8';
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(hx, hYReal, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#34d399';
            ctx.fill();
            ctx.stroke();

            // Vertical guideline
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath();
            ctx.moveTo(hx, padding.top);
            ctx.lineTo(hx, padding.top + chartHeight);
            ctx.stroke();
        }
    }

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const paddingLeft = 70;
        const paddingRight = 20;
        const chartWidth = rect.width - paddingLeft - paddingRight;

        if (x >= paddingLeft && x <= rect.width - paddingRight) {
            const ratio = (x - paddingLeft) / chartWidth;
            const index = Math.round(ratio * (simulationData.length - 1));
            if (index >= 0 && index < simulationData.length) {
                hoverIndex = index;
                drawChart();

                const d = simulationData[index];
                tooltip.style.display = 'block';
                tooltip.style.left = `${e.clientX - rect.left}px`;
                tooltip.style.top = `${e.clientY - rect.top - 10}px`;
                tooltip.innerHTML = `<strong>Year ${d.year}</strong><br>Nominal: ${formatCurrency(d.nominal)}<br>Real: ${formatCurrency(d.real)}`;
            }
        }
    });

    canvas.addEventListener('mouseleave', () => {
        hoverIndex = null;
        tooltip.style.display = 'none';
        drawChart();
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        runSimulation();
    });

    btnReset.addEventListener('click', () => {
        for (const [key, val] of Object.entries(defaults)) {
            const input = document.getElementById(key);
            if (input) input.value = val;
        }
        localStorage.removeItem(STORAGE_KEY);
        runSimulation();
    });

    btnExport.addEventListener('click', () => {
        if (simulationData.length === 0) return;
        let csv = 'Year,Total Principal,Interest Earned,Nominal Balance,Real Balance\n';
        simulationData.forEach(d => {
            csv += `${d.year},${d.principal.toFixed(2)},${d.interest.toFixed(2)},${d.nominal.toFixed(2)},${d.real.toFixed(2)}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'auracalc_wealth_simulation.csv';
        a.click();
        URL.revokeObjectURL(url);
    });

    window.addEventListener('resize', resizeCanvas);

    // Initial setup
    loadSavedState();
    runSimulation();
    // Force canvas resize after layout settlement
    setTimeout(resizeCanvas, 50);
});
