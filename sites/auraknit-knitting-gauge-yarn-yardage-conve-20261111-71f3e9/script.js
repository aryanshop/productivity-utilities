document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const projectNameInput = document.getElementById('projectName');
    const targetWidthInput = document.getElementById('targetWidth');
    const targetHeightInput = document.getElementById('targetHeight');
    const swatchStitchesInput = document.getElementById('swatchStitches');
    const swatchRowsInput = document.getElementById('swatchRows');
    const yarnWeightSelect = document.getElementById('yarnWeight');
    const bufferPercentInput = document.getElementById('bufferPercent');
    const skeinYardsInput = document.getElementById('skeinYards');
    const skeinGramsInput = document.getElementById('skeinGrams');

    const resYardage = document.getElementById('resYardage');
    const resSkeins = document.getElementById('resSkeins');
    const resWeight = document.getElementById('resWeight');
    const resStitches = document.getElementById('resStitches');

    const statStitchDensity = document.getElementById('statStitchDensity');
    const statRowDensity = document.getElementById('statRowDensity');
    const statTotalRows = document.getElementById('statTotalRows');
    const statBufferYards = document.getElementById('statBufferYards');
    const substitutionMatrix = document.getElementById('substitutionMatrix');

    const btnCalculate = document.getElementById('btnCalculate');
    const btnSavePreset = document.getElementById('btnSavePreset');
    const btnClearPresets = document.getElementById('btnClearPresets');
    const presetsContainer = document.getElementById('presetsContainer');
    const presetCount = document.getElementById('presetCount');

    // Yarn weight baseline yardage multipliers (relative to Worsted)
    const yarnMultipliers = {
        'lace': { name: 'Lace (0)', factor: 2.2 },
        'fingering': { name: 'Fingering (1)', factor: 1.6 },
        'sport': { name: 'Sport (2)', factor: 1.3 },
        'dk': { name: 'DK (3)', factor: 1.15 },
        'worsted': { name: 'Worsted (4)', factor: 1.0 },
        'bulky': { name: 'Bulky (5)', factor: 0.7 },
        'superbulky': { name: 'Super Bulky (6)', factor: 0.5 }
    };

    function calculateProject() {
        const width = parseFloat(targetWidthInput.value) || 0;
        const height = parseFloat(targetHeightInput.value) || 0;
        const swatchSts = parseFloat(swatchStitchesInput.value) || 20;
        const swatchRws = parseFloat(swatchRowsInput.value) || 28;
        const buffer = parseFloat(bufferPercentInput.value) || 0;
        const ydsPerSkein = parseFloat(skeinYardsInput.value) || 200;
        const gPerSkein = parseFloat(skeinGramsInput.value) || 100;

        // Gauge calculation (per inch)
        const stsPerInch = swatchSts / 4;
        const rwsPerInch = swatchRws / 4;

        // Total cast-on stitches (approx circumference or flat width * 2 for garments)
        // For simplicity in a general sweater panel approximation: width is total circumference, cast on = width * stsPerInch
        const totalSts = Math.round(width * stsPerInch);
        const totalRws = Math.round(height * rwsPerInch);

        // Approximate yardage: Area in sq inches * stitch complexity factor
        // A standard sweater approximation formula: (Width * 2 * Height * stsPerInch * rwsPerInch factor) -> simplified
        // Let's use standard perimeter-based linear yarn calculation: (Width * Height * 2 * factor) adjusted by gauge density
        const baseInchesOfYarn = (width * 2) * totalRws;
        const baseYards = (baseInchesOfYarn / 36) * (stsPerInch / 5);
        
        const bufferYardsCalc = baseYards * (buffer / 100);
        const totalYards = Math.round(baseYards + bufferYardsCalc);
        
        const totalSkeins = Math.ceil(totalYards / ydsPerSkein);
        const totalGramsEst = totalSkeins * gPerSkein;

        // Update UI metrics
        resYardage.textContent = `${totalYards.toLocaleString()} yds`;
        resSkeins.textContent = `${totalSkeins} skein${totalSkeins === 1 ? '' : 's'}`;
        resWeight.textContent = `${totalGramsEst.toLocaleString()} g`;
        resStitches.textContent = `${totalSts.toLocaleString()} sts`;

        statStitchDensity.textContent = `${stsPerInch.toFixed(2)} stitches / in`;
        statRowDensity.textContent = `${rwsPerInch.toFixed(2)} rows / in`;
        statTotalRows.textContent = `${totalRws.toLocaleString()} rows`;
        statBufferYards.textContent = `${Math.round(bufferYardsCalc)} yds`;

        // Render Substitution Matrix
        renderSubstitutionMatrix(totalYards);
    }

    function renderSubstitutionMatrix(currentYards) {
        substitutionMatrix.innerHTML = '';
        const selectedWeight = yarnWeightSelect.value;
        const currentFactor = yarnMultipliers[selectedWeight].factor;

        for (const [key, data] of Object.entries(yarnMultipliers)) {
            const adjustedYards = Math.round(currentYards * (data.factor / currentFactor));
            const item = document.createElement('div');
            item.className = 'sub-item';
            if (key === selectedWeight) {
                item.style.fontWeight = 'bold';
                item.style.backgroundColor = 'var(--accent-light)';
            }
            item.innerHTML = `<span>${data.name}</span><strong>~${adjustedYards.toLocaleString()} yds</strong>`;
            substitutionMatrix.appendChild(item);
        }
    }

    // Local Storage Preset Management
    function getPresets() {
        try {
            const stored = localStorage.getItem('auraknit_presets');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            return [];
        }
    }

    function savePresets(presets) {
        try {
            localStorage.setItem('auraknit_presets', JSON.stringify(presets));
        } catch (e) {}
    }

    function renderPresets() {
        const presets = getPresets();
        presetCount.textContent = presets.length;
        presetsContainer.innerHTML = '';

        if (presets.length === 0) {
            presetsContainer.innerHTML = '<p class="empty-state">No saved project presets yet. Configure your project and click \'Save to Local Presets\'.</p>';
            return;
        }

        presets.forEach((preset, index) => {
            const div = document.createElement('div');
            div.className = 'preset-card';
            div.innerHTML = `
                <div class="preset-title">${escapeHTML(preset.name)}</div>
                <div class="preset-details">${preset.width}"w × ${preset.height}"h | ${preset.swatchSts} sts/${preset.swatchRws} rows (4")</div>
                <div class="preset-actions">
                    <button class="preset-btn load" data-index="${index}">Load</button>
                    <button class="preset-btn delete" data-index="${index}">Delete</button>
                </div>
            `;
            presetsContainer.appendChild(div);
        });
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }

    btnCalculate.addEventListener('click', calculateProject);

    // Auto calculate on input change for responsiveness
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('input', calculateProject);
    });

    btnSavePreset.addEventListener('click', () => {
        const preset = {
            name: projectNameInput.value || 'Untitled Project',
            width: targetWidthInput.value,
            height: targetHeightInput.value,
            swatchSts: swatchStitchesInput.value,
            swatchRws: swatchRowsInput.value,
            yarnWeight: yarnWeightSelect.value,
            bufferPercent: bufferPercentInput.value,
            skeinYards: skeinYardsInput.value,
            skeinGrams: skeinGramsInput.value
        };

        const presets = getPresets();
        presets.unshift(preset);
        if (presets.length > 10) presets.pop(); // Keep max 10
        savePresets(presets);
        renderPresets();
    });

    btnClearPresets.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all saved project presets?')) {
            savePresets([]);
            renderPresets();
        }
    });

    presetsContainer.addEventListener('click', (e) => {
        const index = e.target.getAttribute('data-index');
        if (index === null) return;

        const presets = getPresets();

        if (e.target.classList.contains('load')) {
            const p = presets[index];
            if (p) {
                projectNameInput.value = p.name;
                targetWidthInput.value = p.width;
                targetHeightInput.value = p.height;
                swatchStitchesInput.value = p.swatchSts;
                swatchRowsInput.value = p.swatchRws;
                yarnWeightSelect.value = p.yarnWeight;
                bufferPercentInput.value = p.bufferPercent;
                skeinYardsInput.value = p.skeinYards;
                skeinGramsInput.value = p.skeinGrams;
                calculateProject();
            }
        } else if (e.target.classList.contains('delete')) {
            presets.splice(index, 1);
            savePresets(presets);
            renderPresets();
        }
    });

    // Initial calculation and preset load
    calculateProject();
    renderPresets();
});
