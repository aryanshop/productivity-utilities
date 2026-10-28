/* AuraBake Application Logic */

document.addEventListener('DOMContentLoaded', () => {
    // Initial state data structure
    let recipeState = {
        name: 'Artisan Country Sourdough',
        targetWeight: 1800,
        scale: 1.0,
        flours: [
            { id: 'f1', name: 'Bread Flour', percent: 80 },
            { id: 'f2', name: 'Whole Wheat Flour', percent: 20 }
        ],
        liquids: [
            { id: 'l1', name: 'Water', percent: 75 },
            { id: 'l2', name: 'Levain (100% Hydration)', percent: 20 }
        ],
        others: [
            { id: 'o1', name: 'Fine Sea Salt', percent: 2.2 },
            { id: 'o2', name: 'Olive Oil', percent: 2.0 }
        ]
    };

    const PRESETS = {
        country: {
            name: 'Artisan Country Sourdough',
            targetWeight: 1800,
            scale: 1.0,
            flours: [
                { id: 'f1', name: 'Organic Bread Flour', percent: 85 },
                { id: 'f2', name: 'Dark Rye Flour', percent: 15 }
            ],
            liquids: [
                { id: 'l1', name: 'Filtered Water', percent: 78 },
                { id: 'l2', name: 'Active Sourdough Levain', percent: 20 }
            ],
            others: [
                { id: 'o1', name: 'Sea Salt', percent: 2.2 }
            ]
        },
        baguette: {
            name: 'Traditional French Baguette',
            targetWeight: 1050,
            scale: 1.0,
            flours: [
                { id: 'f1', name: 'French T65 Flour', percent: 100 }
            ],
            liquids: [
                { id: 'l1', name: 'Water', percent: 72 }
            ],
            others: [
                { id: 'o1', name: 'Sea Salt', percent: 2.0 },
                { id: 'o2', name: 'Instant Yeast', percent: 0.4 }
            ]
        },
        brioche: {
            name: 'Rich Artisan Brioche',
            targetWeight: 1500,
            scale: 1.0,
            flours: [
                { id: 'f1', name: 'Unbleached AP Flour', percent: 100 }
            ],
            liquids: [
                { id: 'l1', name: 'Whole Milk', percent: 25 },
                { id: 'l2', name: 'Whole Eggs', percent: 50 }
            ],
            others: [
                { id: 'o1', name: 'Unsalted Butter', percent: 60 },
                { id: 'o2', name: 'Sugar', percent: 12 },
                { id: 'o3', name: 'Salt', percent: 2.0 },
                { id: 'o4', name: 'Instant Yeast', percent: 1.5 }
            ]
        },
        pizza: {
            name: 'Neapolitan Pizza Dough',
            targetWeight: 1000,
            scale: 1.0,
            flours: [
                { id: 'f1', name: 'Italian Tipo 00 Flour', percent: 100 }
            ],
            liquids: [
                { id: 'l1', name: 'Cold Water', percent: 65 }
            ],
            others: [
                { id: 'o1', name: 'Fine Salt', percent: 3.0 },
                { id: 'o2', name: 'Active Dry Yeast', percent: 0.2 }
            ]
        }
    };

    // DOM Elements
    const inputRecipeName = document.getElementById('recipe-name');
    const inputTargetWeight = document.getElementById('target-dough-weight');
    const inputScaleFactor = document.getElementById('scaling-factor');
    
    const floursListEl = document.getElementById('flours-list');
    const liquidsListEl = document.getElementById('liquids-list');
    const othersListEl = document.getElementById('others-list');

    const valTotalFlour = document.getElementById('val-total-flour');
    const valTotalHydration = document.getElementById('val-total-hydration');
    const valTotalWeight = document.getElementById('val-total-weight');
    const valBakedWeight = document.getElementById('val-baked-weight');

    const compositionBar = document.getElementById('composition-bar');
    const compositionLegend = document.getElementById('composition-legend');
    const summaryTbody = document.getElementById('summary-tbody');

    const btnAddFlour = document.getElementById('btn-add-flour');
    const btnAddLiquid = document.getElementById('btn-add-liquid');
    const btnAddOther = document.getElementById('btn-add-other');
    const btnPresets = document.getElementById('btn-presets');
    const btnReset = document.getElementById('btn-reset');
    const btnSaveRecipe = document.getElementById('btn-save-recipe');
    const btnExportText = document.getElementById('btn-export-text');

    const presetModal = document.getElementById('preset-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const savedVaultContainer = document.getElementById('saved-recipes-container');
    const vaultCountBadge = document.getElementById('vault-count');

    // Generate unique ID helper
    const generateId = () => '_' + Math.random().toString(36.2, 9);

    // Initialize application
    function init() {
        bindEvents();
        renderAll();
        loadVaultFromStorage();
    }

    function bindEvents() {
        inputRecipeName.addEventListener('input', (e) => {
            recipeState.name = e.target.value;
        });

        inputTargetWeight.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value) || 0;
            recipeState.targetWeight = val;
            // Recalculate scale factor based on target vs base flour weight
            calculateAndUpdate();
        });

        inputScaleFactor.addEventListener('input', (e) => {
            const scale = parseFloat(e.target.value) || 1.0;
            recipeState.scale = scale;
            calculateAndUpdate();
        });

        btnAddFlour.addEventListener('click', () => {
            recipeState.flours.push({ id: generateId(), name: 'New Flour', percent: 10 });
            renderIngredients();
            calculateAndUpdate();
        });

        btnAddLiquid.addEventListener('click', () => {
            recipeState.liquids.push({ id: generateId(), name: 'Liquid/Juice', percent: 10 });
            renderIngredients();
            calculateAndUpdate();
        });

        btnAddOther.addEventListener('click', () => {
            recipeState.others.push({ id: generateId(), name: 'Ingredient', percent: 1.0 });
            renderIngredients();
            calculateAndUpdate();
        });

        btnPresets.addEventListener('click', () => {
            presetModal.classList.remove('hidden');
        });

        btnCloseModal.addEventListener('click', () => {
            presetModal.classList.add('hidden');
        });

        presetModal.addEventListener('click', (e) => {
            if (e.target === presetModal) {
                presetModal.classList.add('hidden');
            }
        });

        document.querySelectorAll('.preset-card').forEach(card => {
            card.addEventListener('click', () => {
                const presetKey = card.getAttribute('data-preset');
                if (PRESETS[presetKey]) {
                    // Deep clone preset
                    recipeState = JSON.parse(JSON.stringify(PRESETS[presetKey]));
                    inputRecipeName.value = recipeState.name;
                    inputTargetWeight.value = recipeState.targetWeight;
                    inputScaleFactor.value = recipeState.scale;
                    presetModal.classList.add('hidden');
                    renderIngredients();
                    calculateAndUpdate();
                }
            });
        });

        btnReset.addEventListener('click', () => {
            recipeState = {
                name: 'Basic Bread Formula',
                targetWeight: 1000,
                scale: 1.0,
                flours: [{ id: generateId(), name: 'Bread Flour', percent: 100 }],
                liquids: [{ id: generateId(), name: 'Water', percent: 65 }],
                others: [{ id: generateId(), name: 'Salt', percent: 2.0 }]
            };
            inputRecipeName.value = recipeState.name;
            inputTargetWeight.value = recipeState.targetWeight;
            inputScaleFactor.value = recipeState.scale;
            renderIngredients();
            calculateAndUpdate();
        });

        btnSaveRecipe.addEventListener('click', () => {
            saveCurrentRecipeToVault();
        });

        btnExportText.addEventListener('click', () => {
            exportFormulaText();
        });
    }

    function renderAll() {
        inputRecipeName.value = recipeState.name;
        inputTargetWeight.value = recipeState.targetWeight;
        inputScaleFactor.value = recipeState.scale;
        renderIngredients();
        calculateAndUpdate();
    }

    // Render ingredient row controls
    function renderIngredients() {
        renderList(recipeState.flours, floursListEl, 'flours');
        renderList(recipeState.liquids, liquidsListEl, 'liquids');
        renderList(recipeState.others, othersListEl, 'others');
    }

    function renderList(items, container, type) {
        container.innerHTML = '';
        items.forEach((item, index) => {
            const row = document.createElement('div');
            row.className = 'ingredient-row';

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = item.name;
            nameInput.placeholder = 'Ingredient Name';
            nameInput.addEventListener('input', (e) => {
                item.name = e.target.value;
                calculateAndUpdate();
            });

            const percentInput = document.createElement('input');
            percentInput.type = 'number';
            percentInput.value = item.percent;
            percentInput.step = '0.1';
            percentInput.min = '0';
            percentInput.addEventListener('input', (e) => {
                item.percent = parseFloat(e.target.value) || 0;
                calculateAndUpdate();
            });

            const weightDisplay = document.createElement('span');
            weightDisplay.className = 'calculated-weight-preview';
            weightDisplay.style.fontSize = '0.85rem';
            weightDisplay.style.fontWeight = '600';
            weightDisplay.style.color = 'var(--text-muted)';
            weightDisplay.id = `prev-${type}-${item.id}`;
            weightDisplay.textContent = '0g';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-del';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.title = 'Remove ingredient';
            deleteBtn.addEventListener('click', () => {
                // Ensure at least one flour remains
                if (type === 'flours' && recipeState.flours.length <= 1) {
                    alert('A recipe must contain at least one flour.');
                    return;
                }
                recipeState[type] = recipeState[type].filter(i => i.id !== item.id);
                renderIngredients();
                calculateAndUpdate();
            });

            row.appendChild(nameInput);
            row.appendChild(percentInput);
            row.appendChild(weightDisplay);
            row.appendChild(deleteBtn);

            container.appendChild(row);
        });
    }

    // Core Mathematical Calculations
    function calculateAndUpdate() {
        // 1. Calculate total flour percentage (always sums to base for percentages)
        const totalFlourPercent = recipeState.flours.reduce((acc, curr) => acc + curr.percent, 0) || 100;

        // 2. Sum all baker's percentages relative to total flour (100%)
        const totalLiquidPercent = recipeState.liquids.reduce((acc, curr) => acc + curr.percent, 0);
        const totalOtherPercent = recipeState.others.reduce((acc, curr) => acc + curr.percent, 0);
        const grandTotalPercent = totalFlourPercent + totalLiquidPercent + totalOtherPercent;

        // 3. Determine Scaling Factor and Flour Weight needed to hit Target Dough Weight
        // Formula: Target Weight = Total Flour Weight * (Grand Total Percent / 100) * Scale
        // Therefore: Base Flour Weight = Target Weight / ((Grand Total Percent / 100) * Scale)
        const percentFactor = grandTotalPercent / 100;
        let baseFlourWeight = 0;
        if (percentFactor > 0) {
            baseFlourWeight = recipeState.targetWeight / (percentFactor * recipeState.scale);
        }

        // 4. Update UI metrics
        valTotalFlour.textContent = `${Math.round(baseFlourWeight * recipeState.scale)}g`;
        valTotalHydration.textContent = `${totalLiquidPercent.toFixed(1)}%`;

        const calculatedTotalWeight = baseFlourWeight * percentFactor * recipeState.scale;
        valTotalWeight.textContent = `${Math.round(calculatedTotalWeight)}g`;
        valBakedWeight.textContent = `${Math.round(calculatedTotalWeight * 0.88)}g`; // ~12% bake loss

        // 5. Populate ingredient preview weights & Summary table
        summaryTbody.innerHTML = '';
        let compositionItems = [];

        // Color palette for breakdown bar
        const colors = ['#c26a3c', '#d99b52', '#e6b361', '#3c825f', '#4a90e2', '#9013fe', '#b84a4a', '#50e3c2'];
        let colorIndex = 0;

        // Process Flours
        recipeState.flours.forEach(f => {
            const exactWeight = (baseFlourWeight * (f.percent / totalFlourPercent)) * recipeState.scale;
            const proportionOfTotal = (f.percent / grandTotalPercent) * 100;
            updateRowPreview('flours', f.id, exactWeight);
            addSummaryRow(f.name, 'Flour', f.percent, exactWeight);
            compositionItems.push({ name: f.name, weight: exactWeight, percent: proportionOfTotal, color: colors[colorIndex++ % colors.length] });
        });

        // Process Liquids
        recipeState.liquids.forEach(l => {
            const exactWeight = (baseFlourWeight * (l.percent / totalFlourPercent)) * recipeState.scale;
            const proportionOfTotal = (l.percent / grandTotalPercent) * 100;
            updateRowPreview('liquids', l.id, exactWeight);
            addSummaryRow(l.name, 'Liquid', l.percent, exactWeight);
            compositionItems.push({ name: l.name, weight: exactWeight, percent: proportionOfTotal, color: colors[colorIndex++ % colors.length] });
        });

        // Process Others
        recipeState.others.forEach(o => {
            const exactWeight = (baseFlourWeight * (o.percent / totalFlourPercent)) * recipeState.scale;
            const proportionOfTotal = (o.percent / grandTotalPercent) * 100;
            updateRowPreview('others', o.id, exactWeight);
            addSummaryRow(o.name, 'Additive', o.percent, exactWeight);
            compositionItems.push({ name: o.name, weight: exactWeight, percent: proportionOfTotal, color: colors[colorIndex++ % colors.length] });
        });

        // Render Composition Bar & Legend
        renderCompositionChart(compositionItems);
    }

    function updateRowPreview(type, id, weight) {
        const el = document.getElementById(`prev-${type}-${id}`);
        if (el) {
            el.textContent = `${weight.toFixed(1)}g`;
        }
    }

    function addSummaryRow(name, type, percent, weight) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${escapeHtml(name)}</strong></td>
            <td><span class="badge" style="font-size: 0.7rem;">${type}</span></td>
            <td>${percent.toFixed(1)}%</td>
            <td><strong>${weight.toFixed(1)}g</strong></td>
        `;
        summaryTbody.appendChild(tr);
    }

    function renderCompositionChart(items) {
        compositionBar.innerHTML = '';
        compositionLegend.innerHTML = '';

        items.forEach(item => {
            // Segment bar
            const seg = document.createElement('div');
            seg.className = 'comp-segment';
            seg.style.width = `${item.percent}%`;
            seg.style.backgroundColor = item.color;
            seg.title = `${item.name}: ${item.weight.toFixed(1)}g (${item.percent.toFixed(1)}%)`;
            compositionBar.appendChild(seg);

            // Legend item
            const leg = document.createElement('div');
            leg.className = 'legend-item';
            leg.innerHTML = `
                <span class="legend-color" style="background-color: ${item.color}"></span>
                <span>${escapeHtml(item.name)} (${item.weight.toFixed(0)}g)</span>
            `;
            compositionLegend.appendChild(leg);
        });
    }

    // LocalStorage Vault Management
    function saveCurrentRecipeToVault() {
        const vault = JSON.parse(localStorage.getItem('aurabake_vault') || '[]');
        const recipeCopy = JSON.parse(JSON.stringify(recipeState));
        recipeCopy.savedAt = new Date().toLocaleDateString();
        recipeCopy.id = generateId();

        vault.unshift(recipeCopy);
        // Keep max 20
        if (vault.length > 20) vault.pop();

        localStorage.setItem('aurabake_vault', JSON.stringify(vault));
        loadVaultFromStorage();
        alert(`Successfully saved "${recipeState.name}" to your local recipe vault!`);
    }

    function loadVaultFromStorage() {
        const vault = JSON.parse(localStorage.getItem('aurabake_vault') || '[]');
        vaultCountBadge.textContent = `${vault.length} saved`;
        savedVaultContainer.innerHTML = '';

        if (vault.length === 0) {
            savedVaultContainer.innerHTML = '<p class="empty-vault-text">No saved recipes in local storage yet. Click "Save to Vault" to store your current formula.</p>';
            return;
        }

        vault.forEach(rec => {
            const card = document.createElement('div');
            card.className = 'saved-recipe-card';
            card.innerHTML = `
                <div class="saved-recipe-title">${escapeHtml(rec.name)}</div>
                <div class="saved-recipe-meta">
                    <span>Target: ${rec.targetWeight}g</span>
                    <span>Saved: ${rec.savedAt || 'Recent'}</span>
                </div>
                <div class="saved-recipe-actions">
                    <button class="btn btn-xs btn-primary btn-load-vault" data-id="${rec.id}">Load</button>
                    <button class="btn btn-xs btn-outline btn-del-vault" data-id="${rec.id}">Delete</button>
                </div>
            `;
            savedVaultContainer.appendChild(card);
        });

        // Bind vault item action buttons
        document.querySelectorAll('.btn-load-vault').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const found = vault.find(r => r.id === id);
                if (found) {
                    recipeState = JSON.parse(JSON.stringify(found));
                    renderAll();
                }
            });
        });

        document.querySelectorAll('.btn-del-vault').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.getAttribute('data-id');
                const filtered = vault.filter(r => r.id !== id);
                localStorage.setItem('aurabake_vault', JSON.stringify(filtered));
                loadVaultFromStorage();
            });
        });
    }

    function exportFormulaText() {
        const totalFlourPercent = recipeState.flours.reduce((acc, curr) => acc + curr.percent, 0) || 100;
        const totalLiquidPercent = recipeState.liquids.reduce((acc, curr) => acc + curr.percent, 0);
        const totalOtherPercent = recipeState.others.reduce((acc, curr) => acc + curr.percent, 0);
        const grandTotalPercent = totalFlourPercent + totalLiquidPercent + totalOtherPercent;
        const percentFactor = grandTotalPercent / 100;
        const baseFlourWeight = recipeState.targetWeight / (percentFactor * recipeState.scale);

        let text = `=== ${recipeState.name.toUpperCase()} ===\n`;
        text += `Target Dough Weight: ${recipeState.targetWeight}g | Scale: ${recipeState.scale}x\n`;
        text += `Total Hydration: ${totalLiquidPercent.toFixed(1)}%\n\n`;
        text += `--- INGREDIENTS ---\n`;

        recipeState.flours.forEach(f => {
            const wt = (baseFlourWeight * (f.percent / totalFlourPercent)) * recipeState.scale;
            text += `${f.name}: ${f.percent}% -> ${wt.toFixed(1)}g\n`;
        });
        recipeState.liquids.forEach(l => {
            const wt = (baseFlourWeight * (l.percent / totalFlourPercent)) * recipeState.scale;
            text += `${l.name}: ${l.percent}% -> ${wt.toFixed(1)}g\n`;
        });
        recipeState.others.forEach(o => {
            const wt = (baseFlourWeight * (o.percent / totalFlourPercent)) * recipeState.scale;
            text += `${o.name}: ${o.percent}% -> ${wt.toFixed(1)}g\n`;
        });

        navigator.clipboard.writeText(text).then(() => {
            alert('Formula text copied to clipboard successfully!');
        }).catch(() => {
            alert('Could not copy to clipboard automatically.');
        });
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    // Run on startup
    init();
});
