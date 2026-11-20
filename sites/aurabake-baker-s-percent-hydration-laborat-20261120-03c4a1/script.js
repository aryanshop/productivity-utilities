document.addEventListener('DOMContentLoaded', () => {
    // Initial state
    let recipe = {
        name: "Classic Country Sourdough",
        scalingMode: "flour",
        baseWeight: 500,
        unit: "g",
        targetTemp: 78,
        roomTemp: 72,
        flourTemp: 70,
        ingredients: [
            { name: "Bread Flour", type: "flour", percent: 90 },
            { name: "Whole Wheat Flour", type: "flour", percent: 10 },
            { name: "Water", type: "water", percent: 78 },
            { name: "Sourdough Levain (100% Hydration)", type: "levain", percent: 20 },
            { name: "Fine Sea Salt", type: "salt", percent: 2.0 }
        ]
    };

    const PRESETS = {
        country: {
            name: "Classic Country Sourdough",
            scalingMode: "flour",
            baseWeight: 500,
            unit: "g",
            targetTemp: 78,
            roomTemp: 72,
            flourTemp: 70,
            ingredients: [
                { name: "Bread Flour", type: "flour", percent: 90 },
                { name: "Whole Wheat Flour", type: "flour", percent: 10 },
                { name: "Water", type: "water", percent: 78 },
                { name: "Sourdough Levain (100% Hydration)", type: "levain", percent: 20 },
                { name: "Fine Sea Salt", type: "salt", percent: 2.0 }
            ]
        },
        brioche: {
            name: "Rich Artisan Brioche",
            scalingMode: "flour",
            baseWeight: 500,
            unit: "g",
            targetTemp: 76,
            roomTemp: 72,
            flourTemp: 70,
            ingredients: [
                { name: "Unbleached AP Flour", type: "flour", percent: 100 },
                { name: "Milk / Water", type: "water", percent: 30 },
                { name: "Whole Eggs", type: "other", percent: 55 },
                { name: "Granulated Sugar", type: "other", percent: 15 },
                { name: "Instant Yeast", type: "yeast", percent: 1.5 },
                { name: "Fine Sea Salt", type: "salt", percent: 2.0 },
                { name: "Unsalted Butter (Soft)", type: "fat", percent: 60 }
            ]
        },
        pizza: {
            name: "Neapolitan Pizza Dough",
            scalingMode: "flour",
            baseWeight: 600,
            unit: "g",
            targetTemp: 75,
            roomTemp: 72,
            flourTemp: 70,
            ingredients: [
                { name: "Tipo 00 Flour", type: "flour", percent: 100 },
                { name: "Cold Water", type: "water", percent: 62 },
                { name: "Fine Sea Salt", type: "salt", percent: 3.0 },
                { name: "Instant Yeast", type: "yeast", percent: 0.2 }
            ]
        },
        sandwich: {
            name: "Soft Honey Sandwich Loaf",
            scalingMode: "flour",
            baseWeight: 500,
            unit: "g",
            targetTemp: 78,
            roomTemp: 72,
            flourTemp: 70,
            ingredients: [
                { name: "Bread Flour", type: "flour", percent: 100 },
                { name: "Lukewarm Milk", type: "water", percent: 65 },
                { name: "Honey", type: "other", percent: 8 },
                { name: "Instant Yeast", type: "yeast", percent: 1.2 },
                { name: "Fine Sea Salt", type: "salt", percent: 2.0 },
                { name: "Unsalted Butter", type: "fat", percent: 10 }
            ]
        }
    };

    // DOM Elements
    const recipeNameInput = document.getElementById('recipe-name');
    const scalingModeSelect = document.getElementById('scaling-mode');
    const baseWeightLabel = document.getElementById('base-weight-label');
    const baseWeightInput = document.getElementById('base-weight-val');
    const unitSelector = document.getElementById('unit-selector');
    const ingredientsListEl = document.getElementById('ingredients-list');
    const btnAddIngredient = document.getElementById('btn-add-ingredient');
    
    const targetTempInput = document.getElementById('target-temp');
    const roomTempInput = document.getElementById('room-temp');
    const flourTempInput = document.getElementById('flour-temp');

    const outTotalWeight = document.getElementById('out-total-weight');
    const outTrueHydration = document.getElementById('out-true-hydration');
    const outInoculation = document.getElementById('out-inoculation');
    const formulaTableBody = document.querySelector('#formula-table tbody');

    const waterTempResultEl = document.querySelector('#water-temp-result .big-num');
    const valRoom = document.getElementById('val-room');
    const valFlour = document.getElementById('val-flour');

    const timelineList = document.getElementById('timeline-list');

    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Modal & Actions
    const presetModal = document.getElementById('preset-modal');
    const btnPresets = document.getElementById('btn-presets');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnSave = document.getElementById('btn-save');
    const btnExport = document.getElementById('btn-export');
    const savedRecipesContainer = document.getElementById('saved-recipes-container');
    const savedCountEl = document.getElementById('saved-count');

    // Event Listeners for Config
    recipeNameInput.addEventListener('input', (e) => { recipe.name = e.target.value; });
    scalingModeSelect.addEventListener('change', (e) => {
        recipe.scalingMode = e.target.value;
        baseWeightLabel.textContent = recipe.scalingMode === 'flour' ? `Total Flour (${recipe.unit})` : `Total Dough (${recipe.unit})`;
        calculateAndRender();
    });
    baseWeightInput.addEventListener('input', (e) => {
        recipe.baseWeight = parseFloat(e.target.value) || 0;
        calculateAndRender();
    });
    unitSelector.addEventListener('change', (e) => {
        recipe.unit = e.target.value;
        baseWeightLabel.textContent = recipe.scalingMode === 'flour' ? `Total Flour (${recipe.unit})` : `Total Dough (${recipe.unit})`;
        calculateAndRender();
    });

    targetTempInput.addEventListener('input', (e) => { recipe.targetTemp = parseFloat(e.target.value) || 78; calculateAndRender(); });
    roomTempInput.addEventListener('input', (e) => { recipe.roomTemp = parseFloat(e.target.value) || 72; calculateAndRender(); });
    flourTempInput.addEventListener('input', (e) => { recipe.flourTemp = parseFloat(e.target.value) || 70; calculateAndRender(); });

    btnAddIngredient.addEventListener('click', () => {
        recipe.ingredients.push({ name: "New Ingredient", type: "other", percent: 5 });
        renderIngredientsEditor();
        calculateAndRender();
    });

    // Tabs navigation
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Modal handlers
    btnPresets.addEventListener('click', () => { presetModal.classList.add('open'); });
    btnCloseModal.addEventListener('click', () => { presetModal.classList.remove('open'); });
    document.querySelectorAll('.preset-card').forEach(card => {
        card.addEventListener('click', () => {
            const key = card.getAttribute('data-preset');
            if (PRESETS[key]) {
                recipe = JSON.parse(JSON.stringify(PRESETS[key]));
                syncUIFromRecipe();
                presetModal.classList.remove('open');
                calculateAndRender();
            }
        });
    });

    btnSave.addEventListener('click', () => {
        saveRecipeToLocalStorage();
    });

    btnExport.addEventListener('click', () => {
        exportRecipeJSON();
    });

    function syncUIFromRecipe() {
        recipeNameInput.value = recipe.name;
        scalingModeSelect.value = recipe.scalingMode;
        baseWeightInput.value = recipe.baseWeight;
        unitSelector.value = recipe.unit;
        baseWeightLabel.textContent = recipe.scalingMode === 'flour' ? `Total Flour (${recipe.unit})` : `Total Dough (${recipe.unit})`;
        targetTempInput.value = recipe.targetTemp;
        roomTempInput.value = recipe.roomTemp;
        flourTempInput.value = recipe.flourTemp;
        renderIngredientsEditor();
    }

    function renderIngredientsEditor() {
        ingredientsListEl.innerHTML = '';
        recipe.ingredients.forEach((ing, index) => {
            const row = document.createElement('div');
            row.className = 'ingredient-row';
            row.innerHTML = `
                <input type="text" value="${escapeHTML(ing.name)}" data-index="${index}" data-field="name" />
                <select data-index="${index}" data-field="type">
                    <option value="flour" ${ing.type === 'flour' ? 'selected' : ''}>Flour</option>
                    <option value="water" ${ing.type === 'water' ? 'selected' : ''}>Water</option>
                    <option value="levain" ${ing.type === 'levain' ? 'selected' : ''}>Levain</option>
                    <option value="salt" ${ing.type === 'salt' ? 'selected' : ''}>Salt</option>
                    <option value="yeast" ${ing.type === 'yeast' ? 'selected' : ''}>Yeast</option>
                    <option value="fat" ${ing.type === 'fat' ? 'selected' : ''}>Fat/Oil</option>
                    <option value="other" ${ing.type === 'other' ? 'selected' : ''}>Other</option>
                </select>
                <input type="number" value="${ing.percent}" step="0.1" min="0" max="500" data-index="${index}" data-field="percent" />
                <span class="weight-preview" id="preview-${index}">0g</span>
                <button class="btn-icon" data-index="${index}" title="Remove ingredient">&times;</button>
            `;
            ingredientsListEl.appendChild(row);
        });

        // Add listeners to dynamic inputs
        ingredientsListEl.querySelectorAll('input, select').forEach(el => {
            el.addEventListener('input', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                const field = e.target.getAttribute('data-field');
                if (field === 'name') recipe.ingredients[idx].name = e.target.value;
                if (field === 'type') recipe.ingredients[idx].type = e.target.value;
                if (field === 'percent') recipe.ingredients[idx].percent = parseFloat(e.target.value) || 0;
                calculateAndRender();
            });
        });

        ingredientsListEl.querySelectorAll('.btn-icon').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                if (recipe.ingredients.length > 1) {
                    recipe.ingredients.splice(idx, 1);
                    renderIngredientsEditor();
                    calculateAndRender();
                }
            });
        });
    }

    function calculateAndRender() {
        // 1. Calculate Total Flour % and Total Factor
        let totalFlourPercent = 0;
        let totalCombinedPercent = 0;

        recipe.ingredients.forEach(ing => {
            totalCombinedPercent += ing.percent;
            if (ing.type === 'flour') {
                totalFlourPercent += ing.percent;
            } else if (ing.type === 'levain') {
                // Levain typically consists of 50% flour, 50% water
                totalFlourPercent += ing.percent * 0.5;
            }
        });

        if (totalFlourPercent <= 0) totalFlourPercent = 100; // Prevent div by zero

        // Determine total flour weight based on scaling mode
        let totalFlourWeight = 0;
        if (recipe.scalingMode === 'flour') {
            totalFlourWeight = recipe.baseWeight;
        } else {
            // Base weight is total dough weight
            // Total Dough Weight = Total Flour Weight * (Total Combined Percent / 100)
            let combinedFactor = 0;
            recipe.ingredients.forEach(ing => combinedFactor += ing.percent);
            totalFlourWeight = recipe.baseWeight / (combinedFactor / 100);
        }

        // Calculate weights for each ingredient and true metrics
        let totalDoughWeight = 0;
        let totalWaterWeight = 0;
        let totalLevainWeight = 0;

        let tableHTML = '';
        recipe.ingredients.forEach((ing, index) => {
            let weight = (totalFlourWeight * ing.percent) / 100;
            totalDoughWeight += weight;

            if (ing.type === 'water') totalWaterWeight += weight;
            if (ing.type === 'levain') {
                totalLevainWeight += weight;
                totalWaterWeight += weight * 0.5; // Assuming 100% hydration levain
            }

            // Update preview in editor
            const previewEl = document.getElementById(`preview-${index}`);
            if (previewEl) {
                previewEl.textContent = `${weight.toFixed(1)}${recipe.unit}`;
            }

            tableHTML += `
                <tr>
                    <td><strong>${escapeHTML(ing.name)}</strong></td>
                    <td><span class="badge" style="background: var(--border-color)">${ing.type}</span></td>
                    <td>${ing.percent.toFixed(1)}%</td>
                    <td><strong>${weight.toFixed(1)} ${recipe.unit}</strong></td>
                </tr>
            `;
        });

        formulaTableBody.innerHTML = tableHTML;

        // True Hydration = (Total Water from water + water in levain) / Total Flour Weight * 100
        let totalFlourMassForHydration = 0;
        recipe.ingredients.forEach(ing => {
            if (ing.type === 'flour') totalFlourMassForHydration += (totalFlourWeight * ing.percent) / 100;
            if (ing.type === 'levain') totalFlourMassForHydration += ((totalFlourWeight * ing.percent) / 100) * 0.5;
        });

        let trueHydration = totalFlourMassForHydration > 0 ? (totalWaterWeight / totalFlourMassForHydration) * 100 : 0;
        let inoculation = totalFlourWeight > 0 ? (totalLevainWeight / totalFlourWeight) * 100 : 0;

        outTotalWeight.textContent = `${totalDoughWeight.toFixed(1)} ${recipe.unit}`;
        outTrueHydration.textContent = `${trueHydration.toFixed(1)}%`;
        outInoculation.textContent = `${inoculation.toFixed(1)}%`;

        // Water Temp Calculation (RAFT formula: Water Temp = (3 * DDT) - Room Temp - Flour Temp - Friction Factor)
        const frictionFactor = 5; // standard home kitchen mix
        let targetF = recipe.targetTemp;
        let roomF = recipe.roomTemp;
        let flourF = recipe.flourTemp;

        let calcWaterTemp = (3 * targetF) - roomF - flourF - frictionFactor;
        if (recipe.unit === 'oz') {
            // keep temperature display in Fahrenheit as standard for baking calculations
        }

        waterTempResultEl.textContent = `${Math.round(calcWaterTemp)} °F`;
        valRoom.textContent = `${roomF}°F`;
        valFlour.textContent = `${flourF}°F`;

        // Render Timeline
        renderTimeline(inoculation, roomF);
    }

    function renderTimeline(inoculation, roomTemp) {
        // Estimate bulk fermentation duration based on inoculation and temp
        let baseHours = 4;
        if (inoculation > 30) baseHours = 3;
        else if (inoculation < 15) baseHours = 6;

        // Temperature adjustment: every 5 deg below 76 adds ~1 hour, above subtracts ~1 hour
        let tempDiff = 76 - roomTemp;
        let estimatedBulkHours = Math.max(2, baseHours + (tempDiff * 0.25));

        const now = new Date();
        let currentTime = new Date(now.getTime());

        let steps = [
            { title: "Autolyse / Flour Hydration", duration: 0.5, desc: "Mix flour and water. Rest 30-60 mins before adding levain and salt." },
            { title: "Incorporate Levain & Salt", duration: 0.25, desc: "Add levain, rest 20 mins, then add salt with dimpling or slap-and-fold." },
            { title: "Bulk Fermentation (Stretches & Folds)", duration: estimatedBulkHours, desc: `Perform 4 sets of stretch-and-folds spaced 30 mins apart during the first 2 hours. Total bulk time: ~${estimatedBulkHours.toFixed(1)} hrs.` },
            { title: "Pre-shape & Bench Rest", duration: 0.5, desc: "Pre-shape into loose rounds. Rest uncovered for 20-30 minutes on the counter." },
            { title: "Final Shape & Cold Retard", duration: 12, desc: "Shape into bannetons and place in refrigerator (38°F) overnight (12-24 hours)." },
            { title: "Bake in Dutch Oven", duration: 1, desc: "Bake covered at 450°F for 20 mins, uncover and bake for 25 mins until deep mahogany crust." }
        ];

        let timelineHTML = '';
        steps.forEach(step => {
            let timeStr = formatTime(currentTime);
            currentTime.setMinutes(currentTime.getMinutes() + (step.duration * 60));
            let endTimeStr = formatTime(currentTime);

            timelineHTML += `
                <li class="timeline-item">
                    <div class="timeline-time">${timeStr} &ndash; ${endTimeStr} (${step.duration} hrs)</div>
                    <div class="timeline-title">${escapeHTML(step.title)}</div>
                    <div class="timeline-desc">${escapeHTML(step.desc)}</div>
                </li>
            `;
        });

        timelineList.innerHTML = timelineHTML;
    }

    function formatTime(date) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

    // Local Storage Saved Recipes
    function saveRecipeToLocalStorage() {
        let saved = JSON.parse(localStorage.getItem('aurabake_recipes') || '[]');
        // Check if recipe with same name exists, update or push
        const existingIndex = saved.findIndex(r => r.name === recipe.name);
        if (existingIndex >= 0) {
            saved[existingIndex] = recipe;
        } else {
            saved.push(recipe);
        }
        localStorage.setItem('aurabake_recipes', JSON.stringify(saved));
        loadSavedRecipesList();
        alert(`Recipe "${recipe.name}" successfully saved to browser local storage!`);
    }

    function loadSavedRecipesList() {
        let saved = JSON.parse(localStorage.getItem('aurabake_recipes') || '[]');
        savedCountEl.textContent = saved.length;

        if (saved.length === 0) {
            savedRecipesContainer.innerHTML = '<p class="empty-msg">No saved recipes yet. Click \'Save Recipe\' above to store your formula locally.</p>';
            return;
        } 

        let html = '';
        saved.forEach((r, idx) => {
            html += `
                <div class="saved-card">
                    <div class="saved-card-info">
                        <h4>${escapeHTML(r.name)}</h4>
                        <p>${r.ingredients.length} ingredients &bull; Base: ${r.baseWeight}${r.unit}</p>
                    </div>
                    <div class="saved-card-actions">
                        <button class="btn secondary" onclick="loadSavedRecipe(${idx})">Load</button>
                        <button class="btn secondary" style="color: #cc3333;" onclick="deleteSavedRecipe(${idx})">Delete</button>
                    </div>
                </div>
            `;
        });
        savedRecipesContainer.innerHTML = html;
    }

    window.loadSavedRecipe = function(idx) {
        let saved = JSON.parse(localStorage.getItem('aurabake_recipes') || '[]');
        if (saved[idx]) {
            recipe = JSON.parse(JSON.stringify(saved[idx]));
            syncUIFromRecipe();
            calculateAndRender();
            // switch to scaling tab
            document.querySelector('[data-tab="scaling-tab"]').click();
        }
    }

    window.deleteSavedRecipe = function(idx) {
        let saved = JSON.parse(localStorage.getItem('aurabake_recipes') || '[]');
        saved.splice(idx, 1);
        localStorage.setItem('aurabake_recipes', JSON.stringify(saved));
        loadSavedRecipesList();
    }

    function exportRecipeJSON() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(recipe, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `${recipe.name.toLowerCase().replace(/\s+/g, '_')}_formula.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }

    // Initial setup
    syncUIFromRecipe();
    calculateAndRender();
    loadSavedRecipesList();
});
