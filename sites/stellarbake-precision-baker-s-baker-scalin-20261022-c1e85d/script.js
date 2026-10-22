document.addEventListener('DOMContentLoaded', () => {
    // State
    let formula = {
        name: 'Artisan Sourdough Boule',
        targetFlour: 500,
        unit: 'g',
        ingredients: [
            { id: 1, name: 'Bread Flour', type: 'flour', percentage: 90 },
            { id: 2, name: 'Whole Wheat Flour', type: 'flour', percentage: 10 },
            { id: 3, name: 'Water', type: 'liquid', percentage: 75 },
            { id: 4, name: 'Sourdough Levain (100%)', type: 'levain', percentage: 20 },
            { id: 5, name: 'Fine Sea Salt', type: 'salt', percentage: 2.1 }
        ]
    };

    // Presets definition
    const presets = {
        sourdough: {
            name: 'Artisan Sourdough Boule',
            targetFlour: 500,
            ingredients: [
                { id: 1, name: 'Bread Flour', type: 'flour', percentage: 85 },
                { id: 2, name: 'Whole Wheat Flour', type: 'flour', percentage: 15 },
                { id: 3, name: 'Water', type: 'liquid', percentage: 75 },
                { id: 4, name: 'Active Levain', type: 'levain', percentage: 20 },
                { id: 5, name: 'Salt', type: 'salt', percentage: 2.0 }
            ]
        },
        baguette: {
            name: 'Traditional French Baguette',
            targetFlour: 600,
            ingredients: [
                { id: 1, name: 'French T65 Flour', type: 'flour', percentage: 100 },
                { id: 2, name: 'Water', type: 'liquid', percentage: 68 },
                { id: 3, name: 'Instant Yeast', type: 'yeast', percentage: 0.4 },
                { id: 4, name: 'Salt', type: 'salt', percentage: 2.0 }
            ]
        },
        brioche: {
            name: 'Rich French Brioche',
            targetFlour: 400,
            ingredients: [
                { id: 1, name: 'AP Flour', type: 'flour', percentage: 100 },
                { id: 2, name: 'Milk / Water', type: 'liquid', percentage: 35 },
                { id: 3, name: 'Whole Eggs', type: 'enrichment', percentage: 50 },
                { id: 4, name: 'Sugar', type: 'enrichment', percentage: 12 },
                { id: 5, name: 'Butter (Unsalted)', type: 'enrichment', percentage: 60 },
                { id: 6, name: 'Active Dry Yeast', type: 'yeast', percentage: 1.5 },
                { id: 7, name: 'Salt', type: 'salt', percentage: 1.8 }
            ]
        },
        pizza: {
            name: 'Neapolitan Pizza Dough',
            targetFlour: 1000,
            ingredients: [
                { id: 1, name: 'Tipo 00 Flour', type: 'flour', percentage: 100 },
                { id: 2, name: 'Water', type: 'liquid', percentage: 62 },
                { id: 3, name: 'Sea Salt', type: 'salt', percentage: 2.8 },
                { id: 4, name: 'Instant Yeast', type: 'yeast', percentage: 0.15 }
            ]
        }
    };

    // DOM Elements
    const recipeNameInput = document.getElementById('recipe-name');
    const targetFlourInput = document.getElementById('target-flour');
    const unitSelector = document.getElementById('unit-selector');
    const ingredientsListEl = document.getElementById('ingredients-list');
    const addIngredientBtn = document.getElementById('add-ingredient-btn');
    
    // Metrics
    const metricTotalWeight = document.getElementById('metric-total-weight');
    const metricHydration = document.getElementById('metric-hydration');
    const metricLevain = document.getElementById('metric-levain');
    const metricSalt = document.getElementById('metric-salt');

    // Temp wizard elements
    const targetDtInput = document.getElementById('target-dt');
    const roomTempInput = document.getElementById('room-temp');
    const flourTempInput = document.getElementById('flour-temp');
    const frictionFactorInput = document.getElementById('friction-factor');
    const resultWaterTemp = document.getElementById('result-water-temp');

    // Buttons & Modals
    const loadPresetBtn = document.getElementById('load-preset-btn');
    const newRecipeBtn = document.getElementById('new-recipe-btn');
    const saveFormulaBtn = document.getElementById('save-formula-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const printBtn = document.getElementById('print-btn');
    const presetModal = document.getElementById('preset-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const savedRecipesSelect = document.getElementById('saved-recipes-select');

    // Initialize
    function init() {
        bindEvents();
        render();
        updateWaterTemp();
        loadSavedRecipesDropdown();
    }

    function bindEvents() {
        recipeNameInput.addEventListener('input', (e) => {
            formula.name = e.target.value;
        });

        targetFlourInput.addEventListener('input', (e) => {
            formula.targetFlour = parseFloat(e.target.value) || 0;
            render();
        });

        unitSelector.addEventListener('change', (e) => {
            formula.unit = e.target.value;
            render();
        });

        addIngredientBtn.addEventListener('click', () => {
            const newId = formula.ingredients.length > 0 ? Math.max(...formula.ingredients.map(i => i.id)) + 1 : 1;
            formula.ingredients.push({
                id: newId,
                name: 'New Ingredient',
                type: 'other',
                percentage: 5
            });
            render();
        });

        // Temp Wizard Listeners
        [targetDtInput, roomTempInput, flourTempInput, frictionFactorInput].forEach(el => {
            el.addEventListener('input', updateWaterTemp);
        });

        // Modal controls
        loadPresetBtn.addEventListener('click', () => presetModal.classList.remove('hidden'));
        closeModalBtn.addEventListener('click', () => presetModal.classList.add('hidden'));
        presetModal.addEventListener('click', (e) => {
            if (e.target === presetModal) presetModal.classList.add('hidden');
        });

        document.querySelectorAll('.preset-card').forEach(card => {
            card.addEventListener('click', () => {
                const presetKey = card.getAttribute('data-preset');
                if (presets[presetKey]) {
                    formula = JSON.parse(JSON.stringify(presets[presetKey]));
                    recipeNameInput.value = formula.name;
                    targetFlourInput.value = formula.targetFlour;
                    presetModal.classList.add('hidden');
                    render();
                }
            });
        });

        newRecipeBtn.addEventListener('click', () => {
            if (confirm('Start a fresh blank formula?')) {
                formula = {
                    name: 'Custom Formula',
                    targetFlour: 500,
                    unit: 'g',
                    ingredients: [
                        { id: 1, name: 'Flour', type: 'flour', percentage: 100 },
                        { id: 2, name: 'Water', type: 'liquid', percentage: 65 },
                        { id: 3, name: 'Salt', type: 'salt', percentage: 2 }
                    ]
                };
                recipeNameInput.value = formula.name;
                targetFlourInput.value = formula.targetFlour;
                render();
            }
        });

        saveFormulaBtn.addEventListener('click', saveCurrentFormula);
        savedRecipesSelect.addEventListener('change', loadSelectedRecipe);
        exportJsonBtn.addEventListener('click', exportJSON);
        printBtn.addEventListener('click', () => window.print());
    }

    // Render Ingredients & Calculations
    function render() {
        ingredientsListEl.innerHTML = '';

        let totalFlourWeight = formula.targetFlour;
        let totalDoughWeight = 0;
        let totalHydrationPct = 0;
        let totalLevainPct = 0;
        let totalSaltPct = 0;

        // First pass to calculate total flour if multiple flours exist
        // Baker's percentage is relative to total flour. Let's find flour sum if user marks multiple as flour.
        let flourSumPct = formula.ingredients
            .filter(i => i.type === 'flour')
            .reduce((acc, curr) => acc + curr.percentage, 0);
        
        if (flourSumPct <= 0) flourSumPct = 100; // fallback

        formula.ingredients.forEach((ing, index) => {
            if (ing.type === 'liquid') totalHydrationPct += ing.percentage;
            if (ing.type === 'levain') totalLevainPct += ing.percentage;
            if (ing.type === 'salt') totalSaltPct += ing.percentage;

            // Weight calculation
            let rawWeight = (formula.targetFlour * ing.percentage) / 100;
            let displayWeight = formatWeight(rawWeight, formula.unit);
            totalDoughWeight += rawWeight;

            const row = document.createElement('div');
            row.className = 'ingredient-row';
            row.innerHTML = `
                <input type="text" value="${escapeHtml(ing.name)}" data-id="${ing.id}" data-field="name">
                <select data-id="${ing.id}" data-field="type">
                    <option value="flour" ${ing.type === 'flour' ? 'selected' : ''}>Flour</option>
                    <option value="liquid" ${ing.type === 'liquid' ? 'selected' : ''}>Liquid / Water</option>
                    <option value="levain" ${ing.type === 'levain' ? 'selected' : ''}>Levain / Starter</option>
                    <option value="salt" ${ing.type === 'salt' ? 'selected' : ''}>Salt</option>
                    <option value="yeast" ${ing.type === 'yeast' ? 'selected' : ''}>Yeast</option>
                    <option value="enrichment" ${ing.type === 'enrichment' ? 'selected' : ''}>Enrichment / Butter / Egg</option>
                    <option value="other" ${ing.type === 'other' ? 'selected' : ''}>Other</option>
                </select>
                <input type="number" value="${ing.percentage}" min="0" max="500" step="0.1" data-id="${ing.id}" data-field="percentage">
                <span class="weight-display">${displayWeight}</span>
                <button class="icon-btn delete-btn" data-id="${ing.id}" title="Remove ingredient">&times;</button>
            `;
            ingredientsListEl.appendChild(row);
        });

        // Update metrics display
        metricTotalWeight.textContent = formatWeight(totalDoughWeight, formula.unit);
        metricHydration.textContent = totalHydrationPct.toFixed(1) + '%';
        metricLevain.textContent = totalLevainPct.toFixed(1) + '%';
        metricSalt.textContent = totalSaltPct.toFixed(1) + '%';

        // Bind row input changes
        ingredientsListEl.querySelectorAll('input, select').forEach(input => {
            input.addEventListener('input', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                const field = e.target.getAttribute('data-field');
                const val = e.target.value;

                const targetIng = formula.ingredients.find(i => i.id === id);
                if (targetIng) {
                    if (field === 'name') targetIng.name = val;
                    if (field === 'type') targetIng.type = val;
                    if (field === 'percentage') targetIng.percentage = parseFloat(val) || 0;
                    
                    // Re-render dynamically to update weights
                    renderMetricsOnly();
                }
            });
        });

        // Bind delete buttons
        ingredientsListEl.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                formula.ingredients = formula.ingredients.filter(i => i.id !== id);
                render();
            });
        });
    }

    // Quick lightweight metrics updater without rebuilding whole DOM tree during typing
    function renderMetricsOnly() {
        let totalDoughWeight = 0;
        let totalHydrationPct = 0;
        let totalLevainPct = 0;
        let totalSaltPct = 0;

        formula.ingredients.forEach(ing => {
            if (ing.type === 'liquid') totalHydrationPct += ing.percentage;
            if (ing.type === 'levain') totalLevainPct += ing.percentage;
            if (ing.type === 'salt') totalSaltPct += ing.percentage;

            let rawWeight = (formula.targetFlour * ing.percentage) / 100;
            totalDoughWeight += rawWeight;
        });

        metricTotalWeight.textContent = formatWeight(totalDoughWeight, formula.unit);
        metricHydration.textContent = totalHydrationPct.toFixed(1) + '%';
        metricLevain.textContent = totalLevainPct.toFixed(1) + '%';
        metricSalt.textContent = totalSaltPct.toFixed(1) + '%';

        // Update weight strings in rows
        const rows = ingredientsListEl.querySelectorAll('.ingredient-row');
        rows.forEach((row, idx) => {
            const ing = formula.ingredients[idx];
            if (ing) {
                const weightSpan = row.querySelector('.weight-display');
                let rawWeight = (formula.targetFlour * ing.percentage) / 100;
                weightSpan.textContent = formatWeight(rawWeight, formula.unit);
            }
        });
    }

    function formatWeight(grams, unit) {
        if (unit === 'oz') {
            let oz = grams * 0.035274;
            return oz.toFixed(1) + ' oz';
        } else if (unit === 'lb') {
            if (grams < 453.592) {
                let oz = grams * 0.035274;
                return oz.toFixed(1) + ' oz';
            } else {
                let lbs = Math.floor(grams / 453.592);
                let remOz = ((grams % 453.592) * 0.035274).toFixed(1);
                return `${lbs} lb ${remOz} oz`;
            }
        }
        return Math.round(grams) + ' g';
    }

    // Water Temperature Calculation
    // Formula: Water Temp = (Desired Dough Temp * 3) - (Room Temp + Flour Temp + Friction Factor)
    function updateWaterTemp() {
        const dt = parseFloat(targetDtInput.value) || 24;
        const rt = parseFloat(roomTempInput.value) || 22;
        const ft = parseFloat(flourTempInput.value) || 21;
        const ff = parseFloat(frictionFactorInput.value) || 3;

        const waterTemp = (dt * 3) - (rt + ft + ff);
        resultWaterTemp.textContent = waterTemp.toFixed(1) + ' °C (' + (waterTemp * 9/5 + 32).toFixed(1) + ' °F)';
    }

    // LocalStorage Formula Management
    function saveCurrentFormula() {
        try {
            const saved = JSON.parse(localStorage.getItem('stellarbake_formulas') || '{}');
            const recipeKey = formula.name.trim() || 'Untitled Formula';
            saved[recipeKey] = formula;
            localStorage.setItem('stellarbake_formulas', JSON.stringify(saved));
            loadSavedRecipesDropdown();
            alert(`Formula "${recipeKey}" saved successfully!`);
        } catch (e) {
            alert('Could not save formula to local storage.');
        }
    }

    function loadSavedRecipesDropdown() {
        try {
            const saved = JSON.parse(localStorage.getItem('stellarbake_formulas') || '{}');
            savedRecipesSelect.innerHTML = '<option value="">-- Select a saved recipe --</option>';
            Object.keys(saved).forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                savedRecipesSelect.appendChild(opt);
            });
        } catch (e) {
            console.error(e);
        }
    }

    function loadSelectedRecipe(e) {
        const recipeName = e.target.value;
        if (!recipeName) return;
        try {
            const saved = JSON.parse(localStorage.getItem('stellarbake_formulas') || '{}');
            if (saved[recipeName]) {
                formula = JSON.parse(JSON.stringify(saved[recipeName]));
                recipeNameInput.value = formula.name;
                targetFlourInput.value = formula.targetFlour;
                unitSelector.value = formula.unit || 'g';
                render();
            }
        } catch (err) {
            alert('Error loading saved recipe.');
        }
    }

    function exportJSON() {
        const dataStr = "data:text/json;charset=utf-8,"+ encodeURIComponent(JSON.stringify(formula, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `${formula.name.toLowerCase().replace(/\s+/g, '_')}_formula.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    init();
});
