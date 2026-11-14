document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const projectNameInput = document.getElementById('projectName');
    const garmentTypeSelect = document.getElementById('garmentType');
    const targetChestInput = document.getElementById('targetChest');
    const easeInchesInput = document.getElementById('easeInches');
    const bodyLengthInput = document.getElementById('bodyLength');
    const sleeveLengthInput = document.getElementById('sleeveLength');
    const swatchStitchesInput = document.getElementById('swatchStitches');
    const swatchRowsInput = document.getElementById('swatchRows');
    const unitSystemSelect = document.getElementById('unitSystem');
    const yarnWeightCategorySelect = document.getElementById('yarnWeightCategory');
    const skeinYardsInput = document.getElementById('skeinYards');
    const skeinGramsInput = document.getElementById('skeinGrams');

    // KPI Outputs
    const resTotalYards = document.getElementById('resTotalYards');
    const resTotalMeters = document.getElementById('resTotalMeters');
    const resTotalSkeins = document.getElementById('resTotalSkeins');
    const resTotalWeight = document.getElementById('resTotalWeight');
    const resStitchDensity = document.getElementById('resStitchDensity');
    const resRowDensity = document.getElementById('resRowDensity');
    const resWpiEstimate = document.getElementById('resWpiEstimate');

    // Breakdown Outputs
    const calcCircumference = document.getElementById('calcCircumference');
    const calcCastOnStitches = document.getElementById('calcCastOnStitches');
    const calcRowTotal = document.getElementById('calcRowTotal');
    const calcBufferYards = document.getElementById('calcBufferYards');

    // Buttons & Table
    const saveProjectBtn = document.getElementById('saveProjectBtn');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const projectTableBody = document.getElementById('projectTableBody');
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetZoomBtn = document.getElementById('resetZoomBtn');
    const canvas = document.getElementById('swatchCanvas');
    const ctx = canvas.getContext('2d');

    let zoomScale = 1.0;
    let savedProjects = JSON.parse(localStorage.getItem('auraknit_projects') || '[]');

    function calculateLab() {
        const chest = parseFloat(targetChestInput.value) || 40;
        const ease = parseFloat(easeInchesInput.value) || 4;
        const bodyLen = parseFloat(bodyLengthInput.value) || 24;
        const sleeveLen = parseFloat(sleeveLengthInput.value) || 18;
        const swSt = parseFloat(swatchStitchesInput.value) || 20;
        const swRo = parseFloat(swatchRowsInput.value) || 28;
        const garment = garmentTypeSelect.value;
        const skeinYd = parseFloat(skeinYardsInput.value) || 220;
        const skeinGr = parseFloat(skeinGramsInput.value) || 100;

        // Density per inch
        const stPerInch = swSt / 4.0;
        const roPerInch = swRo / 4.0;

        // Dimensions based on garment type
        let totalCirc = chest + ease;
        let surfaceAreaSqIn = 0;

        if (garment === 'sweater') {
            // Front + Back + 2 Sleeves rough surface area
            const bodyArea = (totalCirc * bodyLen * 2);
            const sleeveAvgCirc = chest * 0.45;
            const sleeveArea = (sleeveAvgCirc * sleeveLength * 2);
            surfaceAreaSqIn = bodyArea + sleeveArea;
        } else if (garment === 'cardigan') {
            const bodyArea = (totalCirc * bodyLen * 2) * 1.05;
            const sleeveAvgCirc = chest * 0.45;
            const sleeveArea = (sleeveAvgCirc * sleeveLength * 2);
            surfaceAreaSqIn = bodyArea + sleeveArea;
        } else if (garment === 'scarf') {
            const width = chest * 0.25;
            surfaceAreaSqIn = width * (bodyLen * 1.5);
        } else if (garment === 'hat') {
            surfaceAreaSqIn = chest * bodyLen * 0.6;
        } else if (garment === 'socks') {
            surfaceAreaSqIn = chest * bodyLen * 0.4;
        }

        // Yardage estimation formula: Square Inches * Stitches/Inch * Rows/Inch factor * yarn weight adjustment
        // Approximate constant for yarn consumption per square inch
        const stitchAreaFactor = (stPerInch * roPerInch) / 140;
        let estimatedYards = surfaceAreaSqIn * stitchAreaFactor * 0.85;
        if (estimatedYards < 50) estimatedYards = 50;

        const bufferYards = estimatedYards * 0.15;
        const totalNeededYards = estimatedYards + bufferYards;
        const totalMeters = totalNeededYards * 0.9144;

        const totalSkeins = Math.ceil(totalNeededYards / skeinYd);
        const totalGrams = totalSkeins * skeinGr;

        const castOn = Math.round(totalCirc * stPerInch);
        const totalRows = Math.round(bodyLen * roPerInch);

        // WPI estimation based on stPerInch
        let wpiEst = Math.round(stPerInch * 1.5);
        if (wpiEst < 4) wpiEst = 4;
        if (wpiEst > 20) wpiEst = 20;

        // Update UI KPIs
        resTotalYards.textContent = Math.round(totalNeededYards).toLocaleString() + ' yds';
        resTotalMeters.textContent = Math.round(totalMeters).toLocaleString() + ' meters';
        resTotalSkeins.textContent = totalSkeins + (totalSkeins === 1 ? ' skein' : ' skeins');
        resTotalWeight.textContent = totalGrams + ' grams total';
        resStitchDensity.textContent = stPerInch.toFixed(1) + ' st / in';
        resRowDensity.textContent = roPerInch.toFixed(1) + ' ro / in';
        resWpiEstimate.textContent = wpiEst + ' WPI';

        calcCircumference.textContent = totalCirc.toFixed(1) + ' inches';
        calcCastOnStitches.textContent = castOn + ' stitches';
        calcRowTotal.textContent = totalRows + ' rows';
        calcBufferYards.textContent = '+' + Math.round(bufferYards) + ' yds safety';

        drawSwatchCanvas(stPerInch, roPerInch);
    }

    function drawSwatchCanvas(stPerInch, roPerInch) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Background grid
        ctx.fillStyle = '#1a1f2c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw knit loop texture simulation
        const cols = Math.floor(24 * zoomScale);
        const rows = Math.floor(12 * zoomScale);
        const cellWidth = (canvas.width - 60) / cols;
        const cellHeight = (canvas.height - 60) / rows;

        const startX = 30;
        const startY = 30;

        // Draw axes / grid lines
        ctx.strokeStyle = '#2f374d';
        ctx.lineWidth = 1;
        for (let i = 0; i <= cols; i++) {
            ctx.beginPath();
            ctx.moveTo(startX + i * cellWidth, startY);
            ctx.lineTo(startX + i * cellWidth, startY + rows * cellHeight);
            ctx.stroke();
        }
        for (let j = 0; j <= rows; j++) {
            ctx.beginPath();
            ctx.moveTo(startX, startY + j * cellHeight);
            ctx.lineTo(startX + cols * cellWidth, startY + j * cellHeight);
            ctx.stroke();
        }

        // Draw knitted V stitches
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = startX + c * cellWidth + cellWidth / 2;
                const y = startY + r * cellHeight + cellHeight / 2;

                ctx.strokeStyle = '#f43f5e';
                ctx.lineWidth = 2;
                ctx.beginPath();
                // 'V' shape stitch
                ctx.moveTo(x - cellWidth * 0.35, y - cellHeight * 0.35);
                ctx.lineTo(x, y + cellHeight * 0.35);
                ctx.lineTo(x + cellWidth * 0.35, y - cellHeight * 0.35);
                ctx.stroke();
            }
        }

        // Draw label overlay
        ctx.fillStyle = '#f0f4f8';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText(`Swatch Grid: ${stPerInch.toFixed(1)} st/in × ${roPerInch.toFixed(1)} ro/in (Zoom: ${zoomScale.toFixed(1)}x)`, 30, canvas.height - 10);
    }

    // Save project to local storage table
    saveProjectBtn.addEventListener('click', () => {
        const newProj = {
            name: projectNameInput.value || 'Untitled Project',
            style: garmentTypeSelect.options[garmentTypeSelect.selectedIndex].text,
            gauge: `${swatchStitchesInput.value}st × ${swatchRowsInput.value}ro`,
            yarn: `${yarnWeightCategorySelect.options[yarnWeightCategorySelect.selectedIndex].text}`,
            yards: resTotalYards.textContent,
            date: new Date().toLocaleDateString()
        };
        savedProjects.unshift(newProj);
        if (savedProjects.length > 10) savedProjects.pop();
        localStorage.setItem('auraknit_projects', JSON.stringify(savedProjects));
        renderProjectTable();
    });

    function renderProjectTable() {
        projectTableBody.innerHTML = '';
        if (savedProjects.length === 0) {
            projectTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No saved projects yet. Click Save Project above.</td></tr>';
            return;
        }
        savedProjects.forEach((p, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${p.name}</strong><br><small style="color:var(--text-muted);">${p.date}</small></td>
                <td>${p.style}</td>
                <td>${p.gauge}</td>
                <td>${p.yarn}</td>
                <td><strong>${p.yards}</strong></td>
                <td><button class="btn btn-small" onclick="window.deleteProject(${idx})">Delete</button></td>
            `;
            projectTableBody.appendChild(tr);
        });
    }

    window.deleteProject = function(idx) {
        savedProjects.splice(idx, 1);
        localStorage.setItem('auraknit_projects', JSON.stringify(savedProjects));
        renderProjectTable();
    };

    // Export JSON backup
    exportJsonBtn.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedProjects, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "auraknit_projects_backup.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    // Zoom controls
    zoomInBtn.addEventListener('click', () => {
        if (zoomScale < 2.0) {
            zoomScale += 0.25;
            calculateLab();
        }
    });

0    zoomOutBtn.addEventListener('click', () => {
        if (zoomScale > 0.5) {
            zoomScale -= 0.25;
            calculateLab();
        }
    });

    resetZoomBtn.addEventListener('click', () => {
        zoomScale = 1.0;
        calculateLab();
    });

    // Event listeners for real-time recalculation
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('input', calculateLab);
        input.addEventListener('change', calculateLab);
    });

    // Initial render
    renderProjectTable();
    calculateLab();
});
