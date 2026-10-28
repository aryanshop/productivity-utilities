document.addEventListener('DOMContentLoaded', () => {
    // State Management
    const state = {
        volume: 50,
        volumeUnit: 'gal', // 'gal' or 'L'
        cropStage: 'veg',
        targetEC: 1.6,
        sourceEC: 0.2,
        tdsScale: 500,
        currentVol: 35,
        currentEC: 2.2,
        nutrients: [
            { id: 1, name: 'FloraMicro (General)', rate: 2.0, ecPerUnit: 0.35, color: '#3b82f6' },
            { id: 2, name: 'FloraGro (Vegetative)', rate: 1.5, ecPerUnit: 0.30, color: '#10b981' },
            { id: 3, name: 'FloraBloom (Floral)', rate: 0.5, ecPerUnit: 0.25, color: '#f59e0b' },
            { id: 4, name: 'Cal-Mag Supplement', rate: 1.0, ecPerUnit: 0.15, color: '#8b5cf6' }
        ]
    };

    // DOM Elements
    const reservoirVolumeInput = document.getElementById('reservoir-volume');
    const volumeUnitSelect = document.getElementById('volume-unit');
    const cropStageSelect = document.getElementById('crop-stage');
    const customEcGroup = document.getElementById('custom-ec-group');
    const targetEcInput = document.getElementById('target-ec');
    const sourceEcInput = document.getElementById('source-ec');
    const tdsScaleSelect = document.getElementById('tds-scale');
    const nutrientsContainer = document.getElementById('nutrients-container');
    const btnAddNutrient = document.getElementById('btn-add-nutrient');

    // Results Elements
    const resTargetEc = document.getElementById('res-target-ec');
    const resTargetPpm = document.getElementById('res-target-ppm');
    const resPpmLabel = document.getElementById('res-ppm-label');
    const resTotalVol = document.getElementById('res-total-vol');
    const resVolUnit = document.getElementById('res-vol-unit');
    const prescriptionTableBody = document.querySelector('#prescription-table tbody');

    // Topoff Elements
    const currentVolInput = document.getElementById('current-vol');
    const currentEcInput = document.getElementById('current-ec');
    const topoffResult = document.getElementById('topoff-result');

    // Modals
    const presetModal = document.getElementById('preset-modal');
    const exportModal = document.getElementById('export-modal');
    const btnPresets = document.getElementById('btn-presets');
    const btnExport = document.getElementById('btn-export');
    const btnReset = document.getElementById('btn-reset');
    const btnCopyRecipe = document.getElementById('btn-copy-recipe');
    const exportText = document.getElementById('export-text');

    // Canvas
    const canvas = document.getElementById('ec-breakdown-canvas');
    const ctx = canvas.getContext('2d');

    // Preset Stage Target EC mappings
    const stageECTargets = {
        seedling: 0.6,
        veg: 1.6,
        bloom: 1.9,
        fruit: 2.2
    };

    // Initialize UI
    function init() {
        bindEvents();
        renderNutrientsList();
        calculateAndRender();
    }

    function bindEvents() {
        reservoirVolumeInput.addEventListener('input', (e) => {
            state.volume = Math.max(1, parseFloat(e.target.value) || 0);
            calculateAndRender();
        });

        volumeUnitSelect.addEventListener('change', (e) => {
            state.volumeUnit = e.target.value;
            resVolUnit.textContent = state.volumeUnit === 'gal' ? 'Gallons' : 'Liters';
            calculateAndRender();
        });

        cropStageSelect.addEventListener('change', (e) => {
            state.cropStage = e.target.value;
            if (state.cropStage === 'custom') {
                customEcGroup.style.display = 'block';
            } else {
                customEcGroup.style.display = 'none';
                state.targetEC = stageECTargets[state.cropStage];
                targetEcInput.value = state.targetEC;
            }
            calculateAndRender();
        });

        targetEcInput.addEventListener('input', (e) => {
            state.targetEC = Math.max(0.1, parseFloat(e.target.value) || 0);
            calculateAndRender();
        });

        sourceEcInput.addEventListener('input', (e) => {
            state.sourceEC = Math.max(0, parseFloat(e.target.value) || 0);
            calculateAndRender();
        });

        tdsScaleSelect.addEventListener('change', (e) => {
            state.tdsScale = parseInt(e.target.value, 10);
            resPpmLabel.textContent = `ppm (${state.tdsScale} scale)`;
            calculateAndRender();
        });

        btnAddNutrient.addEventListener('click', () => {
            const newNutrient = {
                id: Date.now(),
                name: 'Custom Boost',
                rate: 1.0,
                ecPerUnit: 0.20,
                color: getRandomColor()
            };
            state.nutrients.push(newNutrient);
            renderNutrientsList();
            calculateAndRender();
        });

        currentVolInput.addEventListener('input', calculateTopOff);
        currentEcInput.addEventListener('input', calculateTopOff);

        // Modals
        btnPresets.addEventListener('click', () => presetModal.classList.add('active'));
        btnExport.addEventListener('click', () => {
            generateExportText();
            exportModal.classList.add('active');
        });

        btnReset.addEventListener('click', () => {
            if (confirm('Reset reservoir values to default?')) {
                state.volume = 50;
                reservoirVolumeInput.value = 50;
                state.targetEC = 1.6;
                cropStageSelect.value = 'veg';
                customEcGroup.style.display = 'none';
                sourceEcInput.value = 0.2;
                state.sourceEC = 0.2;
                renderNutrientsList();
                calculateAndRender();
            }
        });

        btnCopyRecipe.addEventListener('click', () => {
            exportText.select();
            document.execCommand('copy');
            btnCopyRecipe.textContent = 'Copied to Clipboard!';
            setTimeout(() => btnCopyRecipe.textContent = 'Copy to Clipboard', 2000);
        });

        // Close modals
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                presetModal.classList.remove('active');
                exportModal.classList.remove('active');
            });
        });

        window.addEventListener('click', (e) => {
            if (e.target === presetModal) presetModal.classList.remove('active');
            if (e.target === exportModal) exportModal.classList.remove('active');
        });

        // Preset card selection
        document.querySelectorAll('.preset-card').forEach(card => {
            card.addEventListener('click', () => {
                applyPreset(card.getAttribute('data-preset'));
                presetModal.classList.remove('active');
            });
        });
    }

    function renderNutrientsList() {
        nutrientsContainer.innerHTML = '';
        state.nutrients.forEach((nut) => {
            const item = document.createElement('div');
            item.className = 'nutrient-item';
            item.innerHTML = `
                <div class="nutrient-row-top">
                    <input type="text" class="nutrient-name-input" value="${nut.name}" data-id="${nut.id}">
                    <button class="btn-icon-danger" data-id="${nut.id}" title="Remove Nutrient">&times;</button>
                </div>
                <div class="nutrient-row-bottom">
                    <div>
                        <label>Rate per ${state.volumeUnit === 'gal' ? 'Gallon' : 'Liter'}</label>
                        <input type="number" class="nutrient-rate-input" value="${nut.rate}" min="0" max="50" step="0.1" data-id="${nut.id}">
                    </div>
                    <div>
                        <label>EC / Unit (mS/cm)</label>
                        <input type="number" class="nutrient-ec-input" value="${nut.ecPerUnit}" min="0.01" max="2.0" step="0.05" data-id="${nut.id}">
                    </div>
                </div>
            `;
            nutrientsContainer.appendChild(item);
        });

        // Attach listeners to dynamic elements
        nutrientsContainer.querySelectorAll('.nutrient-name-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const id = parseInt(e.target.dataset.id, 10);
                const found = state.nutrients.find(n => n.id === id);
                if (found) found.name = e.target.value;
            });
        });

        nutrientsContainer.querySelectorAll('.nutrient-rate-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const id = parseInt(e.target.dataset.id, 10);
                const found = state.nutrients.find(n => n.id === id);
                if (found) {
                    found.rate = Math.max(0, parseFloat(e.target.value) || 0);
                    calculateAndRender();
                }
            });
        });

        nutrientsContainer.querySelectorAll('.nutrient-ec-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const id = parseInt(e.target.dataset.id, 10);
                const found = state.nutrients.find(n => n.id === id);
                if (found) {
                    found.ecPerUnit = Math.max(0.01, parseFloat(e.target.value) || 0.01);
                    calculateAndRender();
                }
            });
        });

        nutrientsContainer.querySelectorAll('.btn-icon-danger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.dataset.id, 10);
                state.nutrients = state.nutrients.filter(n => n.id !== id);
                renderNutrientsList();
                calculateAndRender();
            });
        });
    }

    function calculateAndRender() {
        const unitLabel = state.volumeUnit === 'gal' ? 'Gallons' : 'Liters';
        resTotalVol.textContent = state.volume;
        resTargetEc.textContent = state.targetEC.toFixed(2);
        const targetPpm = Math.round(state.targetEC * state.tdsScale);
        resTargetPpm.textContent = targetPpm;

        // Calculate EC from current nutrient ratios
        let totalNutrientEC = 0;
        const calculatedRows = state.nutrients.map(nut => {
            const totalAmount = nut.rate * state.volume;
            const ecContribution = nut.rate * nut.ecPerUnit;
            totalNutrientEC += ecContribution;
            return {
                name: nut.name,
                rate: nut.rate,
                totalAmount,
                ecContribution,
                color: nut.color
            };
        });

        const finalEC = state.sourceEC + totalNutrientEC;

        // Render prescription table
        prescriptionTableBody.innerHTML = '';
        calculatedRows.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${row.name}</strong></td>
                <td>${row.rate.toFixed(2)} mL/${state.volumeUnit === 'gal' ? 'gal' : 'L'}</td>
                <td><strong>${row.totalAmount.toFixed(1)} mL</strong></td>
                <td>+${row.ecContribution.toFixed(2)} mS</td>
            `;
            prescriptionTableBody.appendChild(tr);
        });

        // Add source water row
        const sourceTr = document.createElement('tr');
        sourceTr.innerHTML = `
            <td><span style="color: var(--text-muted)">Source Water Baseline</span></td>
            <td>-</td>
            <td>${state.volume} ${state.volumeUnit}</td>
            <td>${state.sourceEC.toFixed(2)} mS (Base)</td>
        `;
        prescriptionTableBody.appendChild(sourceTr);

        // Add total summary row
        const totalTr = document.createElement('tr');
        totalTr.style.borderTop = '2px solid var(--border)';
        totalTr.style.fontWeight = 'bold';
        totalTr.innerHTML = `
            <td>Total Solution Mix</td>
            <td>-</td>
            <td>-</td>
            <td style="color: var(--accent)">${finalEC.toFixed(2)} mS/cm (${Math.round(finalEC * state.tdsScale)} ppm)</td>
        `;
        prescriptionTableBody.appendChild(totalTr);

        calculateTopOff();
        drawCanvas(calculatedRows, state.sourceEC, finalEC);
    }

    function calculateTopOff() {
        const currentVol = parseFloat(currentVolInput.value) || 0;
        const currentEC = parseFloat(currentEcInput.value) || 0;

        if (currentVol >= state.volume || currentEC <= state.targetEC) {
            topoffResult.textContent = '0 (No top-off required)';
            return;
        }

        // Formula: V_target * EC_target = V_current * EC_current + V_add * EC_add (approx 0 for pure RO)
        // V_add = (V_target * EC_target - V_current * EC_current) / EC_add
        // Assuming pure top-off water EC is ~ 0.0
        const neededWater = ((state.volume * state.targetEC) - (currentVol * currentEC)) / 0.05;
        const suggestedTopOff = Math.max(0, state.volume - currentVol);
        
        topoffResult.textContent = `${suggestedTopOff.toFixed(1)} ${state.volumeUnit} (Pure Water)`;
    }

    function drawCanvas(rows, sourceEC, finalEC) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const width = canvas.width;
        const height = canvas.height;
        const barHeight = 36;
        const startY = 80;
        const startX = 30;
        const maxWidth = width - 60;

        if (finalEC <= 0) return;

        // Draw title
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('EC Contribution Distribution Ratio', startX, 35);

        // Background bar
        let currentX = startX;

        // Draw source water segment
        const sourceWidth = (sourceEC / finalEC) * maxWidth;
        ctx.fillStyle = '#64748b';
        ctx.fillRect(currentX, startY, sourceWidth, barHeight);

        ctx.fillStyle = '#ffffff';
        ctx.font = '11px sans-serif';
        if (sourceWidth > 50) {
            ctx.fillText(`Source (${sourceEC.toFixed(2)})`, currentX + 8, startY + 22);
        }
        currentX += sourceWidth;

        // Draw nutrient segments
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
        rows.forEach((row, index) => {
            const segWidth = (row.ecContribution / finalEC) * maxWidth;
            if (segWidth <= 0) return;

            ctx.fillStyle = colors[index % colors.length];
            ctx.fillRect(currentX, startY, segWidth, barHeight);

            if (segWidth > 55) {
                ctx.fillStyle = '#ffffff';
                ctx.fillText(`${row.name.split(' ')[0]}`, currentX + 8, startY + 22);
            }
            currentX += segWidth;
        });

        // Draw container border
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.strokeRect(startX, startY, maxWidth, barHeight);

        // Draw legend
        let legendX = startX;
        let legendY = startY + barHeight + 35;

        // Source legend
        ctx.fillStyle = '#64748b';
        ctx.fillRect(legendX, legendY - 10, 12, 12);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.fillText('Source Water', legendX + 18, legendY);
        legendX += 120;

        rows.forEach((row, index) => {
            if (legendX > width - 120) {
                legendX = startX;
                legendY += 20;
            }
            ctx.fillStyle = colors[index % colors.length];
            ctx.fillRect(legendX, legendY - 10, 12, 12);
            ctx.fillStyle = '#94a3b8';
            ctx.fillText(row.name.split(' ')[0], legendX + 18, legendY);
            legendX += 110;
        });
    }

    function applyPreset(type) {
        if (type === 'tomatoes') {
            state.targetEC = 2.2;
            state.nutrients = [
                { id: 1, name: 'FloraMicro', rate: 2.5, ecPerUnit: 0.35, color: '#3b82f6' },
                { id: 2, name: 'FloraGro', rate: 1.0, ecPerUnit: 0.30, color: '#10b981' },
                { id: 3, name: 'FloraBloom', rate: 3.5, ecPerUnit: 0.25, color: '#f59e0b' },
                { id: 4, name: 'Cal-Mag', rate: 1.2, ecPerUnit: 0.15, color: '#8b5cf6' }
            ];
            cropStageSelect.value = 'fruit';
        } else if (type === 'leafy') {
            state.targetEC = 1.0;
            state.nutrients = [
                { id: 1, name: 'FloraMicro', rate: 1.0, ecPerUnit: 0.35, color: '#3b82f6' },
                { id: 2, name: 'FloraGro', rate: 1.5, ecPerUnit: 0.30, color: '#10b981' },
                { id: 3, name: 'FloraBloom', rate: 0.5, ecPerUnit: 0.25, color: '#f59e0b' }
            ];
            cropStageSelect.value = 'seedling';
        } else if (type === 'cannabis') {
            state.targetEC = 1.8;
            state.nutrients = [
                { id: 1, name: 'Base Micro', rate: 2.2, ecPerUnit: 0.35, color: '#3b82f6' },
                { id: 2, name: 'Base Grow', rate: 1.8, ecPerUnit: 0.30, color: '#10b981' },
                { id: 3, name: 'Base Bloom', rate: 2.0, ecPerUnit: 0.25, color: '#f59e0b' },
                { id: 4, name: 'Magnesium Plus', rate: 1.0, ecPerUnit: 0.15, color: '#8b5cf6' }
            ];
            cropStageSelect.value = 'bloom';
        } else if (type === 'strawberries') {
            state.targetEC = 1.4;
            state.nutrients = [
                { id: 1, name: 'Berry Micro', rate: 1.5, ecPerUnit: 0.35, color: '#3b82f6' },
                { id: 2, name: 'Berry Gro/Bloom', rate: 2.0, ecPerUnit: 0.28, color: '#10b981' },
                { id: 3, name: 'Cal-Mag Pro', rate: 1.0, ecPerUnit: 0.15, color: '#8b5cf6' }
            ];
            cropStageSelect.value = 'veg';
        }

        customEcGroup.style.display = 'none';
        targetEcInput.value = state.targetEC;
        renderNutrientsList();
        calculateAndRender();
    }

    function generateExportText() {
        let text = `=== AURA-YIELD HYDROPONIC NUTRIENT RECIPE ===\n`;
        text += `Date: ${new Date().toLocaleDateString()}\n`;
        text += `Reservoir Volume: ${state.volume} ${state.volumeUnit}\n`;
        text += `Target EC: ${state.targetEC.toFixed(2)} mS/cm (${Math.round(state.targetEC * state.tdsScale)} ppm - ${state.tdsScale} scale)\n`;
        text += `Source Water EC: ${state.sourceEC.toFixed(2)} mS/cm\n\n`;
        text += `--- DOSING INSTRUCTIONS ---\n`;
        state.nutrients.forEach(nut => {
            const total = (nut.rate * state.volume).toFixed(1);
            text += `- ${nut.name}: ${nut.rate} mL/${state.volumeUnit === 'gal' ? 'gal' : 'L'} (Total: ${total} mL)\n`;
        });
        text += `\nMixing Order Note: Fill reservoir with water, add Micro first (mix thoroughly), followed by Grow and Bloom. Adjust pH to 5.5 - 6.5 after mixing.`;
        exportText.value = text;
    }

    function getRandomColor() {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    init();
});
