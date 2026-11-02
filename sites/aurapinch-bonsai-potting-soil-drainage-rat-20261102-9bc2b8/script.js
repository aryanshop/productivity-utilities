document.addEventListener('DOMContentLoaded', () => {
    const potVolumeInput = document.getElementById('pot-volume');
    const volumeUnitSelect = document.getElementById('volume-unit');
    const treeTypeSelect = document.getElementById('tree-type');
    
    const rangeAkadama = document.getElementById('range-akadama');
    const rangePumice = document.getElementById('range-pumice');
    const rangeLava = document.getElementById('range-lava');
    const rangeOrganic = document.getElementById('range-organic');

    const valAkadama = document.getElementById('val-akadama');
    const valPumice = document.getElementById('val-pumice');
    const valLava = document.getElementById('val-lava');
    const valOrganic = document.getElementById('val-organic');

    const metricAeration = document.getElementById('metric-aeration');
    const metricRetention = document.getElementById('metric-retention');
    const metricWeight = document.getElementById('metric-weight');
    const componentList = document.getElementById('component-list');

    const blueprintMid = document.getElementById('blueprint-mid');
    const blueprintBottom = document.getElementById('blueprint-bottom');

    const btnPreset = document.getElementById('btn-preset');
    const btnSave = document.getElementById('btn-save');
    const recipeContainer = document.getElementById('recipe-container');

    const presets = {
        conifer: { akadama: 25, pumice: 50, lava: 20, organic: 5 },
        deciduous: { akadama: 50, pumice: 30, lava: 10, organic: 10 },
        tropical: { akadama: 40, pumice: 30, lava: 10, organic: 20 },
        custom: { akadama: 40, pumice: 30, lava: 20, organic: 10 }
    };

    function applyPreset(type) {
        if (presets[type]) {
            const p = presets[type];
            rangeAkadama.value = p.akadama;
            rangePumice.value = p.pumice;
            rangeLava.value = p.lava;
            rangeOrganic.value = p.organic;
            updateLab();
        }
    }

    // Intelligent normalization when sliders move so total remains 100%
    function handleSliderChange(changedSlider) {
        let a = parseInt(rangeAkadama.value);
        let p = parseInt(rangePumice.value);
        let l = parseInt(rangeLava.value);
        let o = parseInt(rangeOrganic.value);

        let total = a + p + l + o;

        if (total !== 100) {
            // Simple proportional adjustment
            let diff = 100 - total;
            // Adjust others proportionally except the one just moved if possible
            let others = ['akadama', 'pumice', 'lava', 'organic'].filter(s => s !== changedSlider);
            let otherSum = others.reduce((acc, name) => {
                if (name === 'akadama') return acc + a;
                if (name === 'pumice') return acc + p;
                if (name === 'lava') return acc + l;
                if (name === 'organic') return acc + o;
                return acc;
            }, 0);

            if (otherSum > 0) {
                others.forEach(name => {
                    if (name === 'akadama') a = Math.max(0, Math.min(100, a + Math.round(diff * (a / otherSum))));
                    if (name === 'pumice') p = Math.max(0, Math.min(100, p + Math.round(diff * (p / otherSum))));
                    if (name === 'lava') l = Math.max(0, Math.min(100, l + Math.round(diff * (l / otherSum))));
                    if (name === 'organic') o = Math.max(0, Math.min(100, o + Math.round(diff * (o / otherSum))));
                });
            } else {
                // Fallback direct split
                if (changedSlider !== 'akadama') a = Math.max(0, 100 - (p + l + o));
                else if (changedSlider !== 'pumice') p = Math.max(0, 100 - (a + l + o));
            }

            // Final clamp check to exact 100
            let finalCheck = a + p + l + o;
            if (finalCheck !== 100 && finalCheck > 0) {
                a += (100 - finalCheck);
                a = Math.max(0, Math.min(100, a));
            }

            rangeAkadama.value = a;
            rangePumice.value = p;
            rangeLava.value = l;
            rangeOrganic.value = o;
        }

        treeTypeSelect.value = 'custom';
        updateLab();
    }

    function updateLab() {
        const a = parseInt(rangeAkadama.value);
        const p = parseInt(rangePumice.value);
        const l = parseInt(rangeLava.value);
        const o = parseInt(rangeOrganic.value);

        valAkadama.textContent = a + '%';
        valPumice.textContent = p + '%';
        valLava.textContent = l + '%';
        valOrganic.textContent = o + '%';

        const volume = parseFloat(potVolumeInput.value) || 0;
        const unit = volumeUnitSelect.value;

        // Calculate precise quantities
        const akadamaVol = (volume * (a / 100)).toFixed(2);
        const pumiceVol = (volume * (p / 100)).toFixed(2);
        const lavaVol = (volume * (l / 100)).toFixed(2);
        const organicVol = (volume * (o / 100)).toFixed(2);

        // Aeration & Retention indices
        // Pumice & lava provide high aeration; Akadama & organic provide retention
        const aerationScore = Math.round((p * 0.9) + (l * 1.0) + (akadama * 0.5) + (o * 0.1));
        const retentionScore = Math.round((akadama * 0.9) + (o * 1.0) + (p * 0.6) + (l * 0.2));

        metricAeration.textContent = aerationScore + '%';
        metricRetention.textContent = retentionScore + '%';

        // Estimated dry weight calculation (approximate density kg/L or lbs/qt)
        // Akadama ~0.7, Pumice ~0.6, Lava ~0.8, Organic ~0.4
        let densityFactor = 0.75; // baseline
        if (unit === 'liters') {
            const weightKg = (volume * ((a * 0.7 + p * 0.6 + l * 0.85 + o * 0.4) / 100)).toFixed(1);
            metricWeight.textContent = weightKg + ' kg';
        } else if (unit === 'quarts') {
            const weightLbs = (volume * 0.9 * ((a * 0.7 + p * 0.6 + l * 0.85 + o * 0.4) / 100)).toFixed(1);
            metricWeight.textContent = weightLbs + ' lbs';
        } else {
            const weightLbs = (volume * 3.785 * 2.2 * ((a * 0.7 + p * 0.6 + l * 0.85 + o * 0.4) / 100)).toFixed(1);
            metricWeight.textContent = weightLbs + ' lbs';
        }

        // Render component breakdown list
        componentList.innerHTML = `
            <li class="component-item"><span>Akadama (${a}%)</span> <strong>${akadamaVol} ${unit}</strong></li>
            <li class="component-item"><span>Pumice (${p}%)</span> <strong>${pumiceVol} ${unit}</strong></li>
            <li class="component-item"><span>Lava Rock (${l}%)</span> <strong>${lavaVol} ${unit}</strong></li>
            <li class="component-item"><span>Organic Compost (${o}%)</span> <strong>${organicVol} ${unit}</strong></li>
        `;

        // Update blueprint recommendations
        blueprintMid.textContent = `Balanced mid-layer mix (${a}% Akadama, ${p}% Pumice)`;
        blueprintBottom.textContent = `Coarse Lava/Pumice base (${Math.max(l, 15)}% coarse fraction)`;
    }

    // Event Listeners
    rangeAkadama.addEventListener('input', () => handleSliderChange('akadama'));
    rangePumice.addEventListener('input', () => handleSliderChange('pumice'));
    rangeLava.addEventListener('input', () => handleSliderChange('lava'));
    rangeOrganic.addEventListener('input', () => handleSliderChange('organic'));

    potVolumeInput.addEventListener('input', updateLab);
    volumeUnitSelect.addEventListener('change', updateLab);

    treeTypeSelect.addEventListener('change', (e) => {
        applyPreset(e.target.value);
    });

    btnPreset.addEventListener('click', () => {
        applyPreset(treeTypeSelect.value);
    });

    // Local storage recipe management
    function loadSavedRecipes() {
        const saved = JSON.parse(localStorage.getItem('aurapinch_recipes') || '[]');
        if (saved.length === 0) {
            recipeContainer.innerHTML = '<p class="empty-notice">No saved recipes yet. Configure your blend and click \'Save Recipe Locally\'.</p>';
            return;
        }

        recipeContainer.innerHTML = '';
        saved.forEach((recipe, idx) => {
            const card = document.createElement('div');
            card.className = 'recipe-card';
            card.innerHTML = `
                <div class="recipe-info">
                    <span class="recipe-title">${recipe.name}</span>
                    <span class="recipe-details">Akadama: ${recipe.a}%, Pumice: ${recipe.p}%, Lava: ${recipe.l}%, Organic: ${recipe.o}%</span>
                </div>
                <button class="recipe-delete" data-index="${idx}">Delete</button>
            `;
            recipeContainer.appendChild(card);
        });

        document.querySelectorAll('.recipe-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.getAttribute('data-index'));
                deleteRecipe(index);
            });
        });
    }

    function deleteRecipe(index) {
        const saved = JSON.parse(localStorage.getItem('aurapinch_recipes') || '[]');
        saved.splice(index, 1);
        localStorage.setItem('aurapinch_recipes', JSON.stringify(saved));
        loadSavedRecipes();
    }

    btnSave.addEventListener('click', () => {
        const recipeName = prompt('Enter a name for this bonsai soil blend recipe:', `${treeTypeSelect.options[treeTypeSelect.selectedIndex].text} Blend`);
        if (!recipeName) return;

        const newRecipe = {
            name: recipeName,
            a: rangeAkadama.value,
            p: rangePumice.value,
            l: rangeLava.value,
            o: rangeOrganic.value,
            date: new Date().toLocaleDateString()
        };

        const saved = JSON.parse(localStorage.getItem('aurapinch_recipes') || '[]');
        saved.push(newRecipe);
        localStorage.setItem('aurapinch_recipes', JSON.stringify(saved));
        loadSavedRecipes();
    });

    // Initial render
    applyPreset('deciduous');
    loadSavedRecipes();
});
