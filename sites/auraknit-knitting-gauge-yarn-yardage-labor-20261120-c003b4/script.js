document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const targetChestInput = document.getElementById('targetChest');
    const targetLengthInput = document.getElementById('targetLength');
    const easeInput = document.getElementById('ease');
    const unitSystemSelect = document.getElementById('unitSystem');
    const swatchStitchesInput = document.getElementById('swatchStitches');
    const swatchRowsInput = document.getElementById('swatchRows');
    const yarnWeightSelect = document.getElementById('yarnWeight');
    const needleSizeInput = document.getElementById('needleSize');
    const skeinYardageInput = document.getElementById('skeinYardage');
    const skeinWeightInput = document.getElementById('skeinWeight');

    const resStitches = document.getElementById('resStitches');
    const resRows = document.getElementById('resRows');
    const resYardage = document.getElementById('resYardage');
    const resSkeins = document.getElementById('resSkeins');
    const subInfo = document.getElementById('subInfo');

    const stitchCountValue = document.getElementById('stitchCountValue');
    const btnInc = document.getElementById('btnInc');
    const btnDec = document.getElementById('btnDec');
    const btnReset = document.getElementById('btnReset');

    const btnSaveProject = document.getElementById('btnSaveProject');
    const btnExportJSON = document.getElementById('btnExportJSON');
    const projectListUl = document.getElementById('projectListUl');
    const gaugeCanvas = document.getElementById('gaugeCanvas');

    let currentCount = 0;

    // Yarn Data lookup for WPI & parameters
    const yarnData = {
        lace: { name: 'Lace (0)', wpi: '30-40+', recommendedNeedle: 'US 0-2 (2.0-2.75mm)' },
        fingering: { name: 'Fingering / Sock (1)', wpi: '14-18', recommendedNeedle: 'US 1-3 (2.25-3.25mm)' },
        sport: { name: 'Sport (2)', wpi: '12-14', recommendedNeedle: 'US 3-5 (3.25-3.75mm)' },
        dk: { name: 'DK (3)', wpi: '11-12', recommendedNeedle: 'US 5-7 (3.75-4.5mm)' },
        worsted: { name: 'Worsted / Aran (4)', wpi: '9-10', recommendedNeedle: 'US 7-9 (4.5-5.5mm)' },
        bulky: { name: 'Bulky (5)', wpi: '7-8', recommendedNeedle: 'US 9-11 (5.5-8.0mm)' },
        superbulky: { name: 'Super Bulky (6)', wpi: '5-6', recommendedNeedle: 'US 11-17 (8.0-12.75mm)' }
    };

    function calculate() {
        const chest = parseFloat(targetChestInput.value) || 0;
        const length = parseFloat(targetLengthInput.value) || 0;
        const ease = parseFloat(easeInput.value) || 0;
        const sStitches = parseFloat(swatchStitchesInput.value) || 20;
        const sRows = parseFloat(swatchRowsInput.value) || 28;
        const sYardage = parseFloat(skeinYardageInput.value) || 200;

        const totalCircumference = chest + ease;
        
        // Calculations based on 4 inch swatch gauge
        const stitchesPerInch = sStitches / 4;
        const rowsPerInch = sRows / 4;

        const calculatedStitches = Math.round(totalCircumference * stitchesPerInch);
        const calculatedRows = Math.round(length * rowsPerInch);

        // Approximate yardage: Surface area approximation (Circumference * Length * 2 for front/back)
        // Adjusted by stitch/row density factor
        const surfaceAreaSqIn = totalCircumference * length * 2;
        const densityFactor = (sStitches * sRows) / 400;
        const baseYardage = (surfaceAreaSqIn * 0.08) * (densityFactor ** 0.5);
        const totalYardageWithBuffer = Math.round(baseYardage * 1.10); // 10% safety buffer

        const skeinsNeeded = Math.ceil(totalYardageWithBuffer / sYardage);

        // Render Results
        resStitches.textContent = calculatedStitches;
        resRows.textContent = calculatedRows;
        resYardage.textContent = `${totalYardageWithBuffer} yds`;
        resSkeins.textContent = `${skeinsNeeded} skein(s)`;

        // Yarn substitution details
        const selectedYarnKey = yarnWeightSelect.value;
        const yarnInfo = yarnData[selectedYarnKey];
        subInfo.innerHTML = `
            <p><strong>Selected Category:</strong> ${yarnInfo.name}</p>
            <p><strong>Wraps Per Inch (WPI):</strong> ${yarnInfo.wpi}</p>
            <p><strong>Standard Needle Range:</strong> ${yarnInfo.recommendedNeedle}</p>
            <p><strong>Gauge Density:</strong> ${stitchesPerInch.toFixed(1)} sts/in &bull; ${rowsPerInch.toFixed(1)} rows/in</p>
        `;

        drawGaugeCanvas(sStitches, sRows);
    }

    function drawGaugeCanvas(sts, rows) {
        if (!gaugeCanvas.getContext) return;
        const ctx = gaugeCanvas.getContext('2d');
        const width = gaugeCanvas.width;
        const height = gaugeCanvas.height;

        ctx.clearRect(0, 0, width, height);

        // Background grid box
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Draw Grid representation
        const cols = Math.min(Math.max(Math.floor(sts), 10), 40);
        const rws = Math.min(Math.max(Math.floor(rows), 10), 40);

        const cellW = (width - 60) / cols;
        const cellH = (height - 60) / rws;

        ctx.strokeStyle = '#e5e0db';
        ctx.lineWidth = 1;

        // Draw grid lines
        for (let i = 0; i <= cols; i++) {
            ctx.beginPath();
            ctx.moveTo(30 + i * cellW, 30);
            ctx.lineTo(30 + i * cellW, 30 + rws * cellH);
            ctx.stroke();
        }
        for (let j = 0; j <= rws; j++) {
            ctx.beginPath();
            ctx.moveTo(30, 30 + j * cellH);
            ctx.lineTo(30 + cols * cellW, 30 + j * cellH);
            ctx.stroke();
        }

        // Draw sample knit stitches (dots/crosses)
        ctx.fillStyle = '#8b5cf6';
        for (let i = 0; i < cols; i += 2) {
            for (let j = 0; j < rws; j += 2) {
                ctx.beginPath();
                ctx.arc(30 + i * cellW + cellW/2, 30 + j * cellH + cellH/2, Math.min(cellW, cellH) * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Border frame
        ctx.strokeStyle = '#2c2927';
        ctx.lineWidth = 2;
        ctx.strokeRect(30, 30, cols * cellW, rws * cellH);

        // Labels
        ctx.fillStyle = '#6e6761';
        ctx.font = '12px system-ui';
        ctx.fillText(`4" Swatch Proportion Grid (${sts} sts x ${rows} rows)`, 30, 20);
    }

    // Stitch Counter interactive logic
    function updateCounterDisplay() {
        stitchCountValue.textContent = currentCount;
    }

    btnInc.addEventListener('click', () => {
        currentCount++;
        updateCounterDisplay();
    });

    btnDec.addEventListener('click', () => {
        if (currentCount > 0) currentCount--;
        updateCounterDisplay();
    });

    btnReset.addEventListener('click', () => {
        currentCount = 0;
        updateCounterDisplay();
    });

    // Local storage & project management
    function loadSavedProjects() {
        const saved = JSON.parse(localStorage.getItem('auraknit_projects') || '[]');
        projectListUl.innerHTML = '';
        if (saved.length === 0) {
            projectListUl.innerHTML = '<li>No saved projects yet.</li>';
            return;
        }
        saved.forEach((proj, idx) => {
            const li = document.createElement('li');
            li.innerHTML = `<span><strong>${proj.name}</strong> (${proj.chest}" chest, ${proj.yardage})</span>
                            <button class="btn danger" style="padding:0.2rem 0.5rem;font-size:0.75rem;" onclick="deleteProject(${idx})">Delete</button>`;
            projectListUl.appendChild(li);
        });
    }

    window.deleteProject = function(index) {
        let saved = JSON.parse(localStorage.getItem('auraknit_projects') || '[]');
        saved.splice(index, 1);
        localStorage.setItem('auraknit_projects', JSON.stringify(saved));
        loadSavedProjects();
    };

    btnSaveProject.addEventListener('click', () => {
        const projectName = prompt('Enter project name:', 'My Cozy Sweater');
        if (!projectName) return;

        const project = {
            name: projectName,
            chest: targetChestInput.value,
            length: targetLengthInput.value,
            yardage: resYardage.textContent,
            skeins: resSkeins.textContent,
            date: new Date().toLocaleDateString()
        };

        let saved = JSON.parse(localStorage.getItem('auraknit_projects') || '[]');
        saved.push(project);
        localStorage.setItem('auraknit_projects', JSON.stringify(saved));
        loadSavedProjects();
    });

    btnExportJSON.addEventListener('click', () => {
        const saved = localStorage.getItem('auraknit_projects') || '[]';
        const blob = new Blob([saved], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'auraknit_projects.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    // Event listeners for calculation inputs
    [targetChestInput, targetLengthInput, easeInput, swatchStitchesInput, swatchRowsInput, yarnWeightSelect, skeinYardageInput].forEach(element => {
        element.addEventListener('input', calculate);
        element.addEventListener('change', calculate);
    });

    // Initial run
    calculate();
    loadSavedProjects();
});
