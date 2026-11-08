document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const reservoirVolInput = document.getElementById('reservoir-vol');
    const volUnitSelect = document.getElementById('vol-unit');
    const sourceEcInput = document.getElementById('source-ec');
    const ppmScaleSelect = document.getElementById('ppm-scale');
    const cropSelect = document.getElementById('crop-select');
    const growthStageSelect = document.getElementById('growth-stage');
    const customEcGroup = document.getElementById('custom-ec-group');
    const targetEcInput = document.getElementById('target-ec-input');
    const nutrientLineSelect = document.getElementById('nutrient-line');
    const strengthSlider = document.getElementById('strength-slider');
    const strengthValSpan = document.getElementById('strength-val');
    const calcBtn = document.getElementById('calc-btn');
    const savePresetBtn = document.getElementById('save-preset-btn');
    const clearPresetsBtn = document.getElementById('clear-presets-btn');

    const resTargetEc = document.getElementById('res-target-ec');
    const resCalcEc = document.getElementById('res-calc-ec');
    const resPpm = document.getElementById('res-ppm');
    const resPpmLabel = document.getElementById('res-ppm-label');
    const resPh = document.getElementById('res-ph');
    const statusBadge = document.getElementById('status-badge');
    const dosageList = document.getElementById('dosage-list');
    const mixingProtocolText = document.getElementById('mixing-protocol-text');
    const presetsContainer = document.getElementById('presets-container');
    const ratioCanvas = document.getElementById('ratio-canvas');
    const ctx = ratioCanvas.getContext('2d');

    // Preset data database mapping
    const cropTargets = {
        'lettuce': { seedling: 0.6, veg: 0.9, 'lush-veg': 1.2, bloom: 1.2, 'heavy-bloom': 1.0 },
        'tomatoes': { seedling: 0.8, veg: 1.4, 'lush-veg': 2.0, bloom: 2.4, 'heavy-bloom': 2.6 },
        'cannabis': { seedling: 0.6, veg: 1.2, 'lush-veg': 1.8, bloom: 2.2, 'heavy-bloom': 2.5 },
        'herbs': { seedling: 0.5, veg: 1.0, 'lush-veg': 1.3, bloom: 1.3, 'heavy-bloom': 1.1 },
        'strawberries': { seedling: 0.7, veg: 1.2, 'lush-veg': 1.5, bloom: 1.8, 'heavy-bloom': 1.8 }
    };

    const nutrientFormulations = {
        'general-hydroponics': {
            name: 'GH FloraSeries (3-Part)',
            parts: [
                { name: 'FloraMicro', ratio: 2.0, unit: 'ml/gal' },
                { name: 'FloraGro', ratio: 1.0, unit: 'ml/gal' },
                { name: 'FloraBloom', ratio: 3.0, unit: 'ml/gal' }
            ],
            protocol: 'Add FloraMicro to fresh water first and stir thoroughly. Next, add FloraGro, and finally add FloraBloom. Never mix concentrated parts together directly.'
        },
        'advanced-nutrients': {
            name: 'Advanced Nutrients Sensi (2-Part)',
            parts: [
                { name: 'Sensi Grow / Bloom A', ratio: 4.0, unit: 'ml/gal' },
                { name: 'Sensi Grow / Bloom B', ratio: 4.0, unit: 'ml/gal' }
            ],
            protocol: 'Add Part A to reservoir, mix well, then add equal measure of Part B. Check pH after mixing.'
        },
        'masterblend': {
            name: 'Masterblend 4-18-38 Combo',
            parts: [
                { name: 'Masterblend 4-18-38', ratio: 2.4, unit: 'grams/gal' },
                { name: 'Calcium Nitrate 15.5-0-0', ratio: 2.4, unit: 'grams/gal' },
                { name: 'Epsom Salt (MgSO4)', ratio: 1.2, unit: 'grams/gal' }
            ],
            protocol: 'Dissolve Masterblend completely in water first, followed by Epsom Salt. Add Calcium Nitrate last to prevent calcium phosphate precipitation.'
        },
        'canna-aqua': {
            name: 'Canna Aqua Vega/Flores',
            parts: [
                { name: 'Aqua Vega/Flores Part A', ratio: 3.5, unit: 'ml/gal' },
                { name: 'Aqua Vega/Flores Part B', ratio: 3.5, unit: 'ml/gal' }
            ],
            protocol: 'Add Part A to reservoir and mix well. Then add Part B in equal quantities. Allow solution to rest for 15 minutes before measuring pH.'
        }
    };

    // Handle crop select change
    cropSelect.addEventListener('change', () => {
        if (cropSelect.value === 'custom') {
            customEcGroup.style.display = 'flex';
        } else {
            customEcGroup.style.display = 'none';
            updateTargetEcFromPreset();
        }
        calculateHydroponics();
    });

    growthStageSelect.addEventListener('change', () => {
        if (cropSelect.value !== 'custom') {
            updateTargetEcFromPreset();
        }
        calculateHydroponics();
    });

    strengthSlider.addEventListener('input', () => {
        strengthValSpan.textContent = Math.round(strengthSlider.value * 100) + '%';
        calculateHydroponics();
    });

    // Trigger calculation on any input change
    [reservoirVolInput, volUnitSelect, sourceEcInput, ppmScaleSelect, nutrientLineSelect, targetEcInput].forEach(element => {
        element.addEventListener('input', calculateHydroponics);
        element.addEventListener('change', calculateHydroponics);
    });

    function updateTargetEcFromPreset() {
        const crop = cropSelect.value;
        const stage = growthStageSelect.value;
        if (cropTargets[crop] && cropTargets[crop][stage]) {
            targetEcInput.value = cropTargets[crop][stage];
        }
    }

    function calculateHydroponics() {
        const volNum = parseFloat(reservoirVolInput.value) || 50;
        const volUnit = volUnitSelect.value;
        const sourceEc = parseFloat(sourceEcInput.value) || 0.2;
        const ppmMultiplier = parseInt(ppmScaleSelect.value, 10) || 500;
        
        let targetEc = cropSelect.value === 'custom' 
            ? (parseFloat(targetEcInput.value) || 1.8)
            : (parseFloat(targetEcInput.value) || 1.8);

        const lineKey = nutrientLineSelect.value;
        const formulation = nutrientFormulations[lineKey];
        const strengthMultiplier = parseFloat(strengthSlider.value) || 1.0;

        // Convert Liters to Gallons for internal formulation math if necessary (Formulations are per US Gal)
        let volumeInGallons = volUnit === 'L' ? volNum * 0.264172 : volNum;

        // Compute base EC contribution
        let calculatedEc = sourceEc;
        let dosages = [];

        formulation.parts.forEach(part => {
            // Scale dosage by strength multiplier and reservoir volume
            const adjustedRatio = part.ratio * strengthMultiplier;
            const totalAmount = adjustedRatio * volumeInGallons;
            
            dosages.push({
                name: part.name,
                amount: totalAmount.toFixed(1),
                unit: part.unit
            });

            // Approximate EC contribution (rough heuristic for simulator)
            calculatedEc += (adjustedRatio * 0.35);
        });

        // Bound calculated EC realistically
        calculatedEc = Math.round(calculatedEc * 100) / 100;
        const totalPpm = Math.round(calculatedEc * ppmMultiplier);

        // Estimated pH shift based on nutrient type
        let estPh = lineKey === 'masterblend' ? -0.4 : -0.7;
        estPh = Math.round(estPh * strengthMultiplier * 10) / 10;

        // Update UI metrics
        resTargetEc.textContent = targetEc.toFixed(2);
        resCalcEc.textContent = calculatedEc.toFixed(2);
        resPpm.textContent = totalPpm;
        resPpmLabel.textContent = `PPM (${ppmMultiplier} scale)`;
        resPh.textContent = (estPh > 0 ? '+' : '') + estPh;

        // Status badge assessment
        const diff = Math.abs(calculatedEc - targetEc);
        if (diff <= 0.2) {
            statusBadge.textContent = 'Optimal EC Zone';
            statusBadge.style.color = 'var(--accent-green)';
            statusBadge.style.borderColor = 'var(--accent-green)';
            statusBadge.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
        } else if (calculatedEc > targetEc) {
            statusBadge.textContent = 'High EC / Dilution Needed';
            statusBadge.style.color = 'var(--warning)';
            statusBadge.style.borderColor = 'var(--warning)';
            statusBadge.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
        } else {
            statusBadge.textContent = 'Low EC / Boost Needed';
            statusBadge.style.color = 'var(--accent-blue)';
            statusBadge.style.borderColor = 'var(--accent-blue)';
            statusBadge.style.backgroundColor = 'rgba(56, 189, 248, 0.15)';
        }

        // Render dosage list
        dosageList.innerHTML = '';
        dosages.forEach(d => {
            const item = document.createElement('div');
            item.className = 'dosage-item';
            item.innerHTML = `
                <span class="dosage-name">${d.name}</span>
                <span class="dosage-amount">${d.amount} ${d.unit}</span>
            `;
            dosageList.appendChild(item);
        });

        mixingProtocolText.textContent = formulation.protocol;

        // Render ratio canvas visualization
        drawRatioCanvas(formulation.parts, strengthMultiplier);
    }

    function drawRatioCanvas(parts, strength) {
        ctx.clearRect(0, 0, ratioCanvas.width, ratioCanvas.height);
        
        const width = ratioCanvas.width;
        const height = ratioCanvas.height;
        const barHeight = 24;
        const startY = 40;
        const colors = ['#10b981', '#38bdf8', '#f59e0b', '#ec4899', '#8b5cf6'];

        // Title inside canvas
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText('Nutrient Component Share Proportion', 16, 24);

        const totalRatio = parts.reduce((acc, p) => acc + p.ratio, 0);
        let currentX = 16;
        const maxBarWidth = width - 32;

        parts.forEach((part, index) => {
            const share = part.ratio / totalRatio;
            const segmentWidth = maxBarWidth * share;
            const color = colors[index % colors.length];

            // Draw bar segment
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(currentX, startY, segmentWidth, barHeight, index === 0 ? [6, 0, 0, 6] : (index === parts.length - 1 ? [0, 6, 6, 0] : 0));
            ctx.fill();

            // Label below bar
            ctx.fillStyle = '#f8fafc';
            ctx.font = '11px system-ui, sans-serif';
            ctx.fillText(`${part.name} (${Math.round(share * 100)}%)`, 16, startY + 55 + (index * 20));
            
            // Color indicator dot
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(8, startY + 51 + (index * 20), 4, 0, Math.PI * 2);
            ctx.fill();

            currentX += segmentWidth;
        });
    }

    // Local storage presets management
    function loadSavedPresets() {
        const saved = localStorage.getItem('aurayield_recipes');
        if (!saved) {
            presetsContainer.innerHTML = '<p class="empty-msg">No saved recipes yet. Calculate a mix and click \'Save Recipe\' to store it locally.</p>';
            return;
        }

        try {
            const recipes = JSON.parse(saved);
            if (recipes.length === 0) {
                presetsContainer.innerHTML = '<p class="empty-msg">No saved recipes yet.</p>';
                return;
            }

            presetsContainer.innerHTML = '';
            recipes.forEach((rec, idx) => {
                const card = document.createElement('div');
                card.className = 'preset-card';
                card.innerHTML = `
                    <div class="preset-info">
                        <h4>${rec.name}</h4>
                        <p>Vol: ${rec.volume}${rec.unit} | Target EC: ${rec.targetEc} | PPM: ${rec.ppm}</p>
                    </div>
                    <button class="preset-delete" data-index="${idx}">Remove</button>
                `;
                presetsContainer.appendChild(card);
            });

            // Attach delete handlers
            document.querySelectorAll('.preset-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.getAttribute('data-index'), 10);
                    deletePreset(index);
                });
            });
        } catch (e) {
            presetsContainer.innerHTML = '<p class="empty-msg">Error loading saved recipes.</p>';
        }
    }

    savePresetBtn.addEventListener('click', () => {
        const recipeName = prompt('Enter a name for this nutrient recipe (e.g., "Mid-Bloom Tomatoes Stage 3"):');
        if (!recipeName || recipeName.trim() === '') return;

        const newRecipe = {
            name: recipeName.trim(),
            volume: reservoirVolInput.value,
            unit: volUnitSelect.value,
            targetEc: resTargetEc.textContent,
            ppm: resPpm.textContent,
            date: new Date().toLocaleDateString()
        };

        let recipes = [];
        const existing = localStorage.getItem('aurayield_recipes');
        if (existing) {
            try { recipes = JSON.parse(existing); } catch(e) {}
        }

        recipes.push(newRecipe);
        localStorage.setItem('aurayield_recipes', JSON.stringify(recipes));
        loadSavedPresets();
    });

    clearPresetsBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all saved recipes?')) {
            localStorage.removeItem('aurayield_recipes');
            loadSavedPresets();
        }
    });

    function deletePreset(index) {
        const existing = localStorage.getItem('aurayield_recipes');
        if (!existing) return;
        try {
            let recipes = JSON.parse(existing);
            recipes.splice(index, 1);
            localStorage.setItem('aurayield_recipes', JSON.stringify(recipes));
            loadSavedPresets();
        } catch(e) {}
    }

    // Initial setup
    updateTargetEcFromPreset();
    calculateHydroponics();
    loadSavedPresets();
});
