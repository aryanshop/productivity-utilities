document.addEventListener('DOMContentLoaded', () => {
    // Default state & presets
    const presets = [
        {
            name: "Artisan Country Sourdough",
            totalFlour: 1000,
            ingredients: [
                { name: "Bread Flour", percent: 80, type: "flour" },
                { name: "Whole Wheat Flour", percent: 20, type: "flour" },
                { name: "Water", percent: 78, type: "liquid" },
                { name: "Active Sourdough Levain", percent: 20, type: "levain" },
                { name: "Fine Sea Salt", percent: 2.1, type: "salt" }
            ]
        },
        {
            name: "Classic Neapolitan Pizza Dough",
            totalFlour: 1000,
            ingredients: [
                { name: "Tipo 00 Flour", percent: 100, type: "flour" },
                { name: "Water", percent: 62, type: "liquid" },
                { name: "Fine Sea Salt", percent: 3.0, type: "salt" },
                { name: "Instant Yeast", percent: 0.2, type: "yeast" }
            ]
        },
        {
            name: "Enriched Brioche Loaf",
            totalFlour: 1000,
            ingredients: [
                { name: "Bread Flour", percent: 100, type: "flour" },
                { name: "Milk", percent: 50, type: "liquid" },
                { name: "Whole Eggs", percent: 55, type: "inclusion" },
                { name: "Granulated Sugar", percent: 15, type: "inclusion" },
                { name: "Fine Sea Salt", percent: 2.0, type: "salt" },
                { name: "Instant Yeast", percent: 1.5, type: "yeast" },
                { name: "Unsalted Butter (Soft)", percent: 45, type: "inclusion" }
            ]
        },
        {
            name: "Rustic Ciabatta",
            totalFlour: 1000,
            ingredients: [
                { name: "High Protein Flour", percent: 100, type: "flour" },
                { name: "Water", percent: 85, type: "liquid" },
                { name: "Fine Sea Salt", percent: 2.2, type: "salt" },
                { name: "Active Dry Yeast", percent: 0.8, type: "yeast" },
                { name: "Olive Oil", percent: 3.0, type: "inclusion" }
            ]
        }
    ];

    // Application State
    let state = {
        recipeName: "Artisan Country Sourdough",
        totalFlour: 1000,
        unitMode: "g",
        ingredients: [
            { name: "Bread Flour", percent: 80, type: "flour" },
            { name: "Whole Wheat Flour", percent: 20, type: "flour" },
            { name: "Water", percent: 78, type: "liquid" },
            { name: "Active Sourdough Levain", percent: 20, type: "levain" },
            { name: "Fine Sea Salt", percent: 2.1, type: "salt" }
        ],
        ddt: { target: 24, room: 21, flour: 20, friction: 3 }
    };

    // DOM Elements
    const recipeNameInput = document.getElementById('recipe-name');
    const totalFlourInput = document.getElementById('total-flour');
    const unitModeSelect = document.getElementById('unit-mode');
    const ingredientsListEl = document.getElementById('ingredients-list');
    const btnAddIngredient = document.getElementById('btn-add-ingredient');
    const btnSave = document.getElementById('btn-save');
    const btnExport = document.getElementById('btn-export');
    const btnPresets = document.getElementById('btn-presets');
    const btnClearVault = document.getElementById('btn-clear-vault');
    
    // DDT elements
    const targetDtInput = document.getElementById('target-dt');
    const roomTInput = document.getElementById('room-t');
    const flourTInput = document.getElementById('flour-t');
    const frictionInput = document.getElementById('friction-factor');
    const computedWaterTempEl = document.getElementById('computed-water-temp');

    // KPI elements
    const kpiTotalWeight = document.getElementById('kpi-total-weight');
    const kpiHydration = document.getElementById('kpi-hydration');
    const kpiInclusions = document.getElementById('kpi-inclusions');

    // Modal Elements
    const presetModal = document.getElementById('preset-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const presetGrid = document.getElementById('preset-grid');
    const vaultListEl = document.getElementById('vault-list');
    const timelineListEl = document.getElementById('timeline-list');
    const canvas = document.getElementById('dough-canvas');

    // Conversion multipliers relative to grams
    const unitMultipliers = {
        g: 1,
        kg: 0.001,
        oz: 0.035274,
        lb: 0.00220462
    };

    const unitDecimals = {
        g: 0,
        kg: 3,
        oz: 1,
        lb: 2
    };

    // Initialize application
    function init() {
        loadFromLocalStorage();
        bindEvents();
        render();
    }

    function bindEvents() {
        recipeNameInput.addEventListener('input', (e) => {
            state.recipeName = e.target.value;
        });

        totalFlourInput.addEventListener('input', (e) => {
            state.totalFlour = Math.max(1, parseFloat(e.target.value) || 0);
            render();
        });

        unitModeSelect.addEventListener('change', (e) => {
            state.unitMode = e.target.value;
            render();
        });

        btnAddIngredient.addEventListener('click', () => {
            state.ingredients.push({ name: "New Ingredient", percent: 5, type: "inclusion" });
            render();
        });

        // DDT inputs
        [targetDtInput, roomTInput, flourTInput, frictionInput].forEach(el => {
            el.addEventListener('input', () => {
                state.ddt.target = parseFloat(targetDtInput.value) || 0;
                state.ddt.room = parseFloat(roomTInput.value) || 0;
                state.ddt.flour = parseFloat(flourTInput.value) || 0;
                state.ddt.friction = parseFloat(frictionInput.value) || 0;
                updateDDT();
            });
        });

        btnPresets.addEventListener('click', () => openModal());
        btnCloseModal.addEventListener('click', () => closeModal());
        presetModal.addEventListener('click', (e) => {
            if (e.target === presetModal) closeModal();
        });

        btnSave.addEventListener('click', () => saveToVault());
        btnExport.addEventListener('click', () => exportMarkdown());
        btnClearVault.addEventListener('click', () => clearVault());
    }

    function render() {
        recipeNameInput.value = state.recipeName;
        totalFlourInput.value = state.totalFlour;
        unitModeSelect.value = state.unitMode;

        renderIngredients();
        updateCalculations();
        updateDDT();
        renderTimeline();
        renderVault();
        drawCanvas();
    }

    function renderIngredients() {
        ingredientsListEl.innerHTML = '';
        state.ingredients.forEach((ing, index) => {
            const mult = unitMultipliers[state.unitMode];
            const dec = unitDecimals[state.unitMode];
            // For flour base, weight is based on 100% flour. For others, it's % of total flour.
            // Note: In baker's math, all percentages are relative to total flour weight.
            const weight = (state.totalFlour * (ing.percent / 100)) * mult;

            const row = document.createElement('div');
            row.className = 'ingredient-row';
            row.innerHTML = `
                <input type="text" value="${escapeHtml(ing.name)}" data-index="${index}" data-field="name" />
                <div class="control-group">
                    <input type="number" value="${ing.percent}" step="0.1" min="0" max="500" data-index="${index}" data-field="percent" />
                </div>
                <div class="ingredient-info">
                    <span class="ingredient-weight">${weight.toFixed(dec)} ${state.unitMode}</span>
                </div>
                <button class="btn small danger" data-index="${index}" title="Remove Ingredient">&times;</button>
            `;

            // Event listeners for ingredient inputs
            const nameInput = row.querySelector('[data-field="name"]');
            nameInput.addEventListener('input', (e) => {
                state.ingredients[index].name = e.target.value;
            });

            const pctInput = row.querySelector('[data-field="percent"]');
            pctInput.addEventListener('input', (e) => {
                state.ingredients[index].percent = parseFloat(e.target.value) || 0;
                updateCalculations();
                drawCanvas();
            });

            const removeBtn = row.querySelector('.danger');
            removeBtn.addEventListener('click', () => {
                state.ingredients.splice(index, 1);
                render();
            });

            ingredientsListEl.appendChild(row);
        });
    }

    function updateCalculations() {
        let totalFlourWeight = state.totalFlour;
        let totalWeightGrams = state.totalFlour;
        let totalHydration = 0;
        let totalInclusions = 0;

        state.ingredients.forEach(ing => {
            const ingWeight = state.totalFlour * (ing.percent / 100);
            totalWeightGrams += ingWeight;

            const lowerName = ing.name.toLowerCase();
            if (ing.type === 'liquid' || lowerName.includes('water') || lowerName.includes('milk') || lowerName.includes('whey')) {
                totalHydration += ing.percent;
            } else if (ing.type === 'levain' || lowerName.includes('levain') || lowerName.includes('starter')) {
                // Levain typically contributes 50% flour and 50% water
                totalHydration += (ing.percent * 0.5);
            } else if (ing.type === 'inclusion' || ing.type === 'salt' || ing.type === 'yeast') {
                if (!lowerName.includes('salt') && !lowerName.includes('yeast')) {
                    totalInclusions += ing.percent;
                }
            }
        });

        const mult = unitMultipliers[state.unitMode];
        const dec = unitDecimals[state.unitMode];
        const convertedTotal = totalWeightGrams * mult;

        kpiTotalWeight.textContent = `${convertedTotal.toFixed(dec)} ${state.unitMode}`;
        kpiHydration.textContent = `${totalHydration.toFixed(1)}%`;
        kpiInclusions.textContent = `${totalInclusions.toFixed(1)}%`;
    }

    function updateDDT() {
        const target = state.ddt.target;
        const room = state.ddt.room;
        const flour = state.ddt.flour;
        const friction = state.ddt.friction;

        // Formula: Water Temp = (Target * 3) - (Room + Flour + Friction)
        // For sourdough with levain, water temp formula can factor levain temp, but standard is 3-factor or 4-factor.
        const waterTemp = (target * 4) - (room + flour + friction);
        computedWaterTempEl.textContent = `${waterTemp.toFixed(1)} °C (${(waterTemp * 9/5 + 32).toFixed(1)} °F)`;
    }

    function renderTimeline() {
        timelineListEl.innerHTML = `
            <div class="timeline-step">
                <span class="timeline-title">1. Autolyse / Mix Flours & Water</span>
                <span class="timeline-time">0 mins</span>
            </div>
            <div class="timeline-step">
                <span class="timeline-title">2. Inoculate / Add Levain & Salt</span>
                <span class="timeline-time">+30 mins</span>
            </div>
            <div class="timeline-step">
                <span class="timeline-title">3. Bulk Fermentation & Stretch/Folds</span>
                <span class="timeline-time">+1h - 4h</span>
            </div>
            <div class="timeline-step">
                <span class="timeline-title">4. Pre-shape & Bench Rest</span>
                <span class="timeline-time">+4h 30m</span>
            </div>
            <div class="timeline-step">
                <span class="timeline-title">5. Final Shape & Cold Retard (Fridge)</span>
                <span class="timeline-time">+5h (Overnight)</span>
            </div>
        `;
    }

    function drawCanvas() {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        // Calculate proportions for stacked bar chart
        let totalPercent = 0;
        state.ingredients.forEach(i => totalPercent += i.percent);
        let flourBase = 100;
        let grandTotal = flourBase + totalPercent;

        let currentX = 20;
        const barY = 35;
        const barHeight = 40;
        const maxBarWidth = width - 40;

        // Draw Flour Segment first (100%)
        let flourWidth = (flourBase / grandTotal) * maxBarWidth;
        ctx.fillStyle = '#f39c12';
        ctx.fillRect(currentX, barY, flourWidth, barHeight);
        ctx.fillStyle = '#fff';
        ctx.font = '11px sans-serif';
        if (flourWidth > 50) {
            ctx.fillText('Flour 100%', currentX + 8, barY + 25);
        }
        currentX += flourWidth;

        const colors = ['#3498db', '#2ecc71', '#9b59b6', '#e74c3c', '#1abc9c', '#e67e22'];

        state.ingredients.forEach((ing, idx) => {
            let w = (ing.percent / grandTotal) * maxBarWidth;
            ctx.fillStyle = colors[idx % colors.length];
            ctx.fillRect(currentX, barY, w, barHeight);

            ctx.fillStyle = '#fff';
            if (w > 45) {
                // Truncate name if needed
                let shortName = ing.name.length > 8 ? ing.name.substring(0, 7) + '..' : ing.name;
                ctx.fillText(`${shortName}`, currentX + 6, barY + 25);
            }
            currentX += w;
        });

        // Border around bar
        ctx.strokeStyle = '#2f3542';
        ctx.lineWidth = 2;
        ctx.strokeRect(20, barY, maxBarWidth, barHeight);

        // Legend / Title text on canvas
        ctx.fillStyle = '#a4b0be';
        ctx.font = '12px sans-serif';
        ctx.fillText('Formula Ratio Breakdown (Proportional Weight Distribution)', 20, 20);
    }

    function openModal() {
        presetGrid.innerHTML = '';
        presets.forEach(p => {
            const card = document.createElement('div');
            card.className = 'preset-card';
            card.innerHTML = `
                <h4>${escapeHtml(p.name)}</h4>
                <p>${p.ingredients.length} ingredients &bull; Base Flour: ${p.totalFlour}g</p>
            `;
            card.addEventListener('click', () => {
                state.recipeName = p.name;
                state.totalFlour = p.totalFlour;
                state.ingredients = JSON.parse(JSON.stringify(p.ingredients));
                render();
                closeModal();
            });
            presetGrid.appendChild(card);
        });
        presetModal.classList.remove('hidden');
    }

    function closeModal() {
        presetModal.classList.add('hidden');
    }

    function saveToVault() {
        let vault = [];
        try {
            const stored = localStorage.getItem('aurabake_vault');
            if (stored) vault = JSON.parse(stored);
        } catch (e) {}

        const newRecipe = {
            id: Date.now(),
            name: state.recipeName,
            date: new Date().toLocaleDateString(),
            totalFlour: state.totalFlour,
            unitMode: state.unitMode,
            ingredients: JSON.parse(JSON.stringify(state.ingredients))
        };

        vault.unshift(newRecipe);
        if (vault.length > 20) vault.pop();

        try {
            localStorage.setItem('aurabake_vault', JSON.stringify(vault));
        } catch (e) {}

        renderVault();
        alert(`Successfully saved "${state.recipeName}" to local vault.`);
    }

    function renderVault() {
        let vault = [];
        try {
            const stored = localStorage.getItem('aurabake_vault');
            if (stored) vault = JSON.parse(stored);
        } catch (e) {}

        if (vault.length === 0) {
            vaultListEl.innerHTML = `<p class="empty-text">No saved recipes yet. Click 'Save Recipe' to store in local vault.</p>`;
            return;
        }

        vaultListEl.innerHTML = '';
        vault.forEach(item => {
            const el = document.createElement('div');
            el.className = 'vault-item';
            el.innerHTML = `
                <div>
                    <div class="vault-item-title">${escapeHtml(item.name)}</div>
                    <div class="vault-item-meta">Flour: ${item.totalFlour}g &bull; ${item.date}</div>
                </div>
                <button class="btn small secondary">Load</button>
            `;

            el.addEventListener('click', () => {
                state.recipeName = item.name;
                state.totalFlour = item.totalFlour;
                state.unitMode = item.unitMode || 'g';
                state.ingredients = JSON.parse(JSON.stringify(item.ingredients));
                render();
            });

            vaultListEl.appendChild(el);
        });
    }

    function clearVault() {
        if (confirm('Are you sure you want to clear all saved recipes from local storage?')) {
            localStorage.removeItem('aurabake_vault');
            renderVault();
        }
    }

    function loadFromLocalStorage() {
        // Optionally load last active session if exists
        try {
            const last = localStorage.getItem('aurabake_active');
            if (last) {
                const parsed = JSON.parse(last);
                state.recipeName = parsed.recipeName || state.recipeName;
                state.totalFlour = parsed.totalFlour || state.totalFlour;
                state.unitMode = parsed.unitMode || state.unitMode;
                state.ingredients = parsed.ingredients || state.ingredients;
            }
        } catch (e) {}
    }

    window.addEventListener('beforeunload', () => {
        try {
            localStorage.setItem('aurabake_active', JSON.stringify({
                recipeName: state.recipeName,
                totalFlour: state.totalFlour,
                unitMode: state.unitMode,
                ingredients: state.ingredients
            }));
        } catch (e) {}
    });

    function exportMarkdown() {
        const mult = unitMultipliers[state.unitMode];
        const dec = unitDecimals[state.unitMode];

        let md = `# ${state.recipeName}\n\n`;
        md += `**Total Flour Base:** ${state.totalFlour}g\n`;
        md += `**Unit Mode:** ${state.unitMode}\n\n`;
        md += `| Ingredient | Baker's % | Weight (${state.unitMode}) |\n`;
        md += `| :--- | :---: | :---: |\n`;
        md += `| Total Flour | 100.0% | ${(state.totalFlour * mult).toFixed(dec)} |\n`;

        state.ingredients.forEach(ing => {
            const w = (state.totalFlour * (ing.percent / 100)) * mult;
            md += `| ${ing.name} | ${ing.percent}% | ${w.toFixed(dec)} |\n`;
        });

        md += `\n*Generated with AuraBake Artisan Laboratory*`;

        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${state.recipeName.toLowerCase().replace(/\s+/g, '-')}-formula.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function escapeHtml(str) {
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

    init();
});
