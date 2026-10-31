document.addEventListener('DOMContentLoaded', () => {
    const materialSelect = document.getElementById('materialSelect');
    const thicknessInput = document.getElementById('thickness');
    const kFactorInput = document.getElementById('kFactor');
    const bendAngleInput = document.getElementById('bendAngle');
    const insideRadiusInput = document.getElementById('insideRadius');
    const flange1Input = document.getElementById('flange1');
    const flange2Input = document.getElementById('flange2');

    const resBA = document.getElementById('resBA');
    const resBD = document.getElementById('resBD');
    const resSB = document.getElementById('resSB');
    const resTotal = document.getElementById('resTotal');

    const saveBtn = document.getElementById('savePresetBtn');
    const resetBtn = document.getElementById('resetBtn');
    const logTableBody = document.getElementById('logTableBody');
    const canvas = document.getElementById('forgeCanvas');
    const ctx = canvas.getContext('2d');

    const toggleBtns = document.querySelectorAll('.toggle-btn');
    let currentView = 'both';

    let calculationLogs = JSON.parse(localStorage.getItem('auraforge_logs') || '[]');

    materialSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val !== 'custom') {
            kFactorInput.value = val;
            kFactorInput.disabled = true;
        } else {
            kFactorInput.disabled = false;
        }
        calculate();
    });

    const inputs = [thicknessInput, kFactorInput, bendAngleInput, insideRadiusInput, flange1Input, flange2Input];
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            calculate();
        });
    });

    toggleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            toggleBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentView = e.target.getAttribute('data-view');
            calculate();
        });
    });

    resetBtn.addEventListener('click', () => {
        materialSelect.value = '0.44';
        kFactorInput.value = '0.44';
        kFactorInput.disabled = true;
        thicknessInput.value = '2.0';
        bendAngleInput.value = '90';
        insideRadiusInput.value = '2.0';
        flange1Input.value = '50.0';
        flange2Input.value = '50.0';
        calculate();
    });

    saveBtn.addEventListener('click', () => {
        const data = getCurrentValues();
        calculationLogs.unshift(data);
        if (calculationLogs.length > 20) calculationLogs.pop();
        localStorage.setItem('auraforge_logs', JSON.stringify(calculationLogs));
        renderLogs();
    });

    window.deleteLog = function(index) {
        calculationLogs.splice(index, 1);
        localStorage.setItem('auraforge_logs', JSON.stringify(calculationLogs));
        renderLogs();
    };

    function getCurrentValues() {
        return {
            material: materialSelect.options[materialSelect.selectedIndex].text.split(' ')[0],
            thickness: parseFloat(thicknessInput.value) || 0,
            kFactor: parseFloat(kFactorInput.value) || 0,
            angle: parseFloat(bendAngleInput.value) || 0,
            radius: parseFloat(insideRadiusInput.value) || 0,
            flange1: parseFloat(flange1Input.value) || 0,
            flange2: parseFloat(flange2Input.value) || 0,
            totalLen: parseFloat(resTotal.textContent) || 0
        };
    }

    function calculate() {
        const T = parseFloat(thicknessInput.value) || 0;
        const K = parseFloat(kFactorInput.value) || 0;
        const A = parseFloat(bendAngleInput.value) || 0;
        const R = parseFloat(insideRadiusInput.value) || 0;
        const L1 = parseFloat(flange1Input.value) || 0;
        const L2 = parseFloat(flange2Input.value) || 0;

        const radAngle = (A * Math.PI) / 180;

        // Bend Allowance formula: BA = (pi * A / 180) * (R + K * T)
        const BA = (radAngle) * (R + K * T);

        // Setback formula: SB = (R + T) * tan(A / 2)
        const halfRad = ((A / 2) * Math.PI) / 180;
        const SB = (R + T) * Math.tan(halfRad);

        // Bend Deduction formula: BD = 2 * SB - BA
        const BD = 2 * SB - BA;

        // Total Flat Length = L1 + L2 - BD
        const L_total = L1 + L2 - BD;

        resBA.textContent = BA.toFixed(2);
        resBD.textContent = BD.toFixed(2);
        resSB.textContent = SB.toFixed(2);
        resTotal.textContent = L_total > 0 ? L_total.toFixed(2) : '0.00';

        drawPreview({
            T, R, A, L1, L2, BA, BD, L_total
        });
    }

    function drawPreview(data) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const w = canvas.width;
        const h = canvas.height;

        ctx.save();
        ctx.fillStyle = '#0b1120';
        ctx.fillRect(0, 0, w, h);

        // Grid lines
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        const gridSize = 20;
        for (let x = 0; x < w; x += gridSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        if (currentView === 'flat') {
            drawFlatPattern(w, h, data);
        } else {
            drawBothViews(w, h, data);
        }

        ctx.restore();
    }

    function drawBothViews(w, h, data) {
        // Left Side: Bent Profile schematic
        ctx.save();
        ctx.translate(160, h / 2 + 30);

        const scale = Math.min(1.5, 120 / Math.max(data.L1, data.L2, 40));

        // Draw bent metal lines
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = Math.max(2, data.T * scale);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(-data.L1 * scale, 0);
        ctx.lineTo(0, 0);
        const angleRad = (data.A * Math.PI) / 180;
        const endX = data.L2 * scale * Math.cos(Math.PI - angleRad);
        const endY = -data.L2 * scale * Math.sin(Math.PI - angleRad);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Label
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Bent Profile Schema', 0, 90);

        ctx.restore();

        // Right Side: Flat Pattern Layout
        drawFlatPattern(w, h, data, true);
    }

    function drawFlatPattern(w, h, data, isSplit = false) {
        ctx.save();
        const startX = isSplit ? w / 2 + 60 : 80;
        const centerY = h / 2;
        const availableWidth = isSplit ? w / 2 - 100 : w - 160;

        const scale = Math.min(2, availableWidth / Math.max(data.L_total, 10));
        const flatPxLen = data.L_total * scale;
        const thickPx = Math.max(4, data.T * scale);

        // Flat sheet background
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.fillRect(startX, centerY - thickPx / 2, flatPxLen, thickPx);
        ctx.strokeRect(startX, centerY - thickPx / 2, flatPxLen, thickPx);

        // Bend deduction lines
        const leftFlangePx = data.L1 * scale;
        const rightFlangePx = data.L2 * scale;

        const bStart = startX + leftFlangePx;
        const bEnd = startX + flatPxLen - rightFlangePx;

        if (bEnd > bStart) {
            ctx.strokeStyle = '#f59e0b';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(bStart, centerY - thickPx / 2 - 12);
            ctx.lineTo(bStart, centerY + thickPx / 2 + 12);
            ctx.moveTo(bEnd, centerY - thickPx / 2 - 12);
            ctx.lineTo(bEnd, centerY + thickPx / 2 + 12);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Dimension text & annotations
        ctx.fillStyle = '#f8fafc';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Flat Blank Length: ${data.L_total.toFixed(2)} mm`, startX + flatPxLen / 2, centerY - thickPx / 2 - 25);

        if (!isSplit) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px sans-serif';
            ctx.fillText('Flat Pattern Layout View', startX + flatPxLen / 2, centerY + 50);
        }

        ctx.restore();
    }

    function renderLogs() {
        if (calculationLogs.length === 0) {
            logTableBody.innerHTML = '<tr class="empty-row"><td colspan="6">No saved logs yet. Click \'Save to Local Logs\'.</td></tr>';
            return;
        }

        logTableBody.innerHTML = calculationLogs.map((log, index) => `
            <tr>
                <td>${log.material}</td>
                <td>${log.thickness} mm</td>
                <td>${log.angle}&deg;</td>
                <td>${log.radius} mm</td>
                <td><strong>${log.totalLen} mm</strong></td>
                <td><button class="btn-sm" onclick="deleteLog(${index})">Delete</button></td>
            </tr>
        `).join('');
    }

    // Initial setup
    kFactorInput.disabled = true;
    calculate();
    renderLogs();
});
