/* AuraRoot Permaculture Companion Planting & Guild Layout Laboratory */

document.addEventListener('DOMContentLoaded', () => {
    // Plant Database
    const plantCatalog = [
        { id: 'apple', name: 'Apple Tree', category: 'Tree', layer: 'Canopy', color: '#ef4444', icon: '🍎', desc: 'Core fruit tree requiring pollination support.', nitrogenFixer: false, repels: [], dynamicAccumulator: false, spacing: 2 },
        { id: 'pear', name: 'Pear Tree', category: 'Tree', layer: 'Canopy', color: '#84cc16', icon: '🍐', desc: 'Robust fruit tree, excellent anchor for guilds.', nitrogenFixer: false, repels: [], dynamicAccumulator: false, spacing: 2 },
        { id: 'hazelnut', name: 'Hazelnut Shrub', category: 'Shrub', layer: 'Understory', color: '#d97706', icon: '🌰', desc: 'Nut producer and windbreak assistant.', nitrogenFixer: false, repels: [], dynamicAccumulator: false, spacing: 1.5 },
        { id: 'currant', name: 'Black Currant', category: 'Shrub', layer: 'Shrub', color: '#7c2d12', icon: '🫐', desc: 'Berry producer tolerant of partial shade.', nitrogenFixer: false, repels: [], dynamicAccumulator: false, spacing: 1 },
        { id: 'comfrey', name: 'Russian Comfrey', category: 'Herb', layer: 'Herbaceous', color: '#10b981', icon: '🌿', desc: 'Dynamic accumulator with deep mineral-mining taproots.', nitrogenFixer: false, repels: [], dynamicAccumulator: true, spacing: 0.5 },
        { id: 'nitrogen_fixer', name: 'Alfalfa / Clover', category: 'Herb', layer: 'Ground Cover', color: '#14b8a6', icon: '☘️', desc: 'Nitrogen-fixer that enriches surrounding soil.', nitrogenFixer: true, repels: [], dynamicAccumulator: false, spacing: 0.5 },
        { id: 'marigold', name: 'Marigold', category: 'Herb', layer: 'Herbaceous', color: '#f59e0b', icon: '🌼', desc: 'Natural pest deterrent for nematodes and insects.', nitrogenFixer: false, repels: ['aphids', 'nematodes'], dynamicAccumulator: false, spacing: 0.5 },
        { id: 'garlic', name: 'Garlic & Chives', category: 'Root', layer: 'Rhizosphere', color: '#a855f7', icon: '🧄', desc: 'Sulfur-scented bulb that deters fungal spores and pests.', nitrogenFixer: false, repels: ['borers', 'aphids'], dynamicAccumulator: false, spacing: 0.4 },
        { id: 'nasturtium', name: 'Nasturtium', category: 'Vining', layer: 'Ground Cover', color: '#f97316', icon: '🌻', desc: 'Trap crop for aphids and edible pollinator magnet.', nitrogenFixer: false, repels: ['squash bugs'], dynamicAccumulator: false, spacing: 0.5 },
        { id: 'mint', name: 'Peppermint', category: 'Herb', layer: 'Herbaceous', color: '#06b6d4', icon: '🌱', desc: 'Strong aromatic repellent for subterranean pests.', nitrogenFixer: false, repels: ['rodents', 'beetles'], dynamicAccumulator: false, spacing: 0.6 }
    ];

    // Application State
    let state = {
        plotName: 'Food Forest Guild Alpha',
        cols: 6,
        rows: 6,
        sunlight: 'Full Sun',
        activeCategory: 'all',
        selectedPlantId: plantCatalog[0].id,
        toolMode: 'plant', // 'plant' or 'erase'
        zoom: 1,
        grid: {} // key: "x,y" -> plantId
    };

    // DOM Elements
    const plotNameInput = document.getElementById('plot-name');
    const gridColsInput = document.getElementById('grid-cols');
    const gridRowsInput = document.getElementById('grid-rows');
    const sunlightSelect = document.getElementById('sunlight-condition');
    const plantCatalogList = document.getElementById('plant-catalog-list');
    const activeToolIndicator = document.getElementById('active-tool-indicator');
    const toolPlantBtn = document.getElementById('tool-plant');
    const toolEraseBtn = document.getElementById('tool-erase');
    const btnNewGuild = document.getElementById('btn-new-guild');
    const btnExport = document.getElementById('btn-export');
    const importFile = document.getElementById('import-file');
    const canvas = document.getElementById('guild-canvas');
    const ctx = canvas.getContext('2d');
    const selectedTileCoords = document.getElementById('selected-tile-coords');
    const synergyScoreBadge = document.getElementById('synergy-score-badge');
    const synergyBar = document.getElementById('synergy-bar');
    const synergySummary = document.getElementById('synergy-summary');
    const layerStats = document.getElementById('layer-stats');
    const auditLog = document.getElementById('audit-log');
    const btnRunAudit = document.getElementById('btn-run-audit');
    const filterTabs = document.querySelectorAll('.tab-btn');

    // Initialize default preset grid
    function initDefaultGrid() {
        state.grid = {
            "2,2": "apple",
            "2,3": "comfrey",
            "3,2": "nitrogen_fixer",
            "1,2": "garlic",
            "2,1": "marigold",
            "4,4": "hazelnut",
            "4,5": "nasturtium"
        };
    }

    // Render Plant Catalog Sidebar
    function renderCatalog() {
        plantCatalogList.innerHTML = '';
        const filtered = state.activeCategory === 'all' 
            ? plantCatalog 
            : plantCatalog.filter(p => p.category === state.activeCategory);

        filtered.forEach(plant => {
            const div = document.createElement('div');
            div.className = `plant-item ${state.selectedPlantId === plant.id ? 'selected' : ''}`;
            div.tabIndex = 0;
            div.setAttribute('role', 'button');
            div.setAttribute('aria-label', `Select ${plant.name}`);
            
            div.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <span style="font-size: 1.25rem;">${plant.icon}</span>
                    <div class="plant-info-brief">
                        <h4>${plant.name}</h4>
                        <p>${plant.layer} &bull; ${plant.category}</p>
                    </div>
                </div>
                <div class="plant-color-dot" style="background-color: ${plant.color};"></div>
            `;

            div.addEventListener('click', () => {
                state.selectedPlantId = plant.id;
                state.toolMode = 'plant';
                toolPlantBtn.classList.add('active');
                toolEraseBtn.classList.remove('active');
                activeToolIndicator.textContent = `Selected: ${plant.name}`;
                renderCatalog();
            });

            plantCatalogList.appendChild(div);
        });
    }

    // Canvas Rendering
    function drawGrid() {
        const width = canvas.width;
        const height = canvas.height;
        ctx.clearRect(0, 0, width, height);

        const cols = state.cols;
        const rows = state.rows;
        const cellWidth = width / cols;
        const cellHeight = height / rows;

        // Draw background grid cells
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = c * cellWidth;
                const y = r * cellHeight;

                ctx.strokeStyle = '#334155';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, cellWidth, cellHeight);

                // Check if plant exists
                const key = `${c},${r}`;
                if (state.grid[key]) {
                    const plantId = state.grid[key];
                    const plant = plantCatalog.find(p => p.id === plantId);
                    if (plant) {
                        // Draw plant node
                        ctx.fillStyle = plant.color;
                        ctx.beginPath();
                        ctx.arc(x + cellWidth / 2, y + cellHeight / 2, Math.min(cellWidth, cellHeight) * 0.35, 0, Math.PI * 2);
                        ctx.fill();

                        // Draw icon
                        ctx.font = `${Math.floor(Math.min(cellWidth, cellHeight) * 0.4)}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(plant.icon, x + cellWidth / 2, y + cellHeight / 2);
                    }
                } else {
                    // Subtle coordinate or dot
                    ctx.fillStyle = '#1e293b';
                    ctx.fillRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);
                }
            }
        }
    }

    // Canvas Interaction (Click to Place/Erase)
    function handleCanvasClick(e) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const cellWidth = canvas.width / state.cols;
        const cellHeight = canvas.height / state.rows;

        const c = Math.floor(x / cellWidth);
        const r = Math.floor(y / cellHeight);

        if (c >= 0 && c < state.cols && r >= 0 && r < state.rows) {
            const key = `${c},${r}`;
            selectedTileCoords.textContent = `Tile: [${c}, ${r}]`;

            if (state.toolMode === 'plant') {
                state.grid[key] = state.selectedPlantId;
            } else if (state.toolMode === 'erase') {
                delete state.grid[key];
            }

            drawGrid();
            updateMetrics();
        }
    }

    canvas.addEventListener('click', handleCanvasClick);

    // Calculate Guild Metrics & Synergy
    function updateMetrics() {
        const placedPlants = Object.values(state.grid);
        const totalCount = placedPlants.length;

        if (totalCount === 0) {
            synergyScoreBadge.textContent = 'Empty Plot (0%)';
            synergyScoreBadge.className = 'badge';
            synergyBar.style.width = '0%';
            synergySummary.textContent = 'Add plants to begin calculating guild synergy and ecological health.';
            layerStats.innerHTML = '<span class="layer-pill">No active layers</span>';
            return;
        }

        // Check criteria
        let hasNitrogenFixer = placedPlants.some(id => plantCatalog.find(p => p.id === id)?.nitrogenFixer);
        let hasDynamicAccumulator = placedPlants.some(id => plantCatalog.find(p => p.id === id)?.dynamicAccumulator);
        let pestRepellers = placedPlants.filter(id => plantCatalog.find(p => p.id === id)?.repels.length > 0).length;
        let canopyTrees = placedPlants.filter(id => plantCatalog.find(p => p.id === id)?.layer === 'Canopy').length;

        let score = 40;
        if (hasNitrogenFixer) score += 20;
        if (hasDynamicAccumulator) score += 15;
        if (pestRepellers > 0) score += 15;
        if (canopyTrees > 0) score += 10;
        score = Math.min(score, 100);

        synergyScoreBadge.textContent = `Synergy (${score}%)`;
        if (score >= 80) {
            synergyScoreBadge.className = 'badge badge-success';
            synergySummary.textContent = 'High ecological resilience! Excellent companion balance detected.';
        } else if (score >= 60) {
            synergyScoreBadge.className = 'badge badge-success';
            synergySummary.textContent = 'Moderate balance. Consider adding nitrogen fixers or accumulators.';
        } else {
            synergyScoreBadge.className = 'badge badge-warning';
            synergySummary.textContent = 'Low synergy. Add multi-layer companion species for pest and nutrient support.';
        }

        synergyBar.style.width = `${score}%`;

        // Layer counts
        const layers = {};
        placedPlants.forEach(id => {
            const p = plantCatalog.find(item => item.id === id);
            if (p) {
                layers[p.layer] = (layers[p.layer] || 0) + 1;
            }
        });

        layerStats.innerHTML = '';
        Object.entries(layers).forEach(([layerName, count]) => {
            const pill = document.createElement('div');
            pill.className = 'layer-pill';
            pill.innerHTML = `<span>🌳</span> <strong>${layerName}</strong>: ${count}`;
            layerStats.appendChild(pill);
        });
    }

    // Run Full Permaculture Audit Report
    function runAudit() {
        const placedPlants = Object.values(state.grid);
        auditLog.innerHTML = '';

        if (placedPlants.length === 0) {
            auditLog.innerHTML = '<p class="audit-placeholder">No plants placed in guild yet.</p>';
            return;
        }

        const audits = [];

        const hasFixer = placedPlants.some(id => plantCatalog.find(p => p.id === id)?.nitrogenFixer);
        if (hasFixer) {
            audits.push({ title: 'Nitrogen Cycling', desc: 'Nitrogen-fixing ground cover or companion detected. Soil fertility will naturally improve.', type: 'success' });
        } else {
            audits.push({ title: 'Nitrogen Deficiency Warning', desc: 'No nitrogen fixers (e.g., Alfalfa/Clover) present. Consider planting legumes or dynamic fixers nearby.', type: 'warning' });
        }

        const hasAccumulator = placedPlants.some(id => plantCatalog.find(p => p.id === id)?.dynamicAccumulator);
        if (hasAccumulator) {
            audits.push({ title: 'Dynamic Accumulation', desc: 'Deep-root mineral accumulator (Comfrey) present. Subsoil minerals are actively cycled to the topsoil.', type: 'success' });
        } else {
            audits.push({ title: 'Mineral Mining Gap', desc: 'Add Russian Comfrey or deep taproot plants to mine subsoil trace nutrients.', type: 'warning' });
        }

        const repellersCount = placedPlants.filter(id => plantCatalog.find(p => p.id === id)?.repels.length > 0).length;
        if (repellersCount > 0) {
            audits.push({ title: 'Pest Deterrence Shield', desc: `${repellersCount} aromatic pest-repelling species active in guild layout.`, type: 'success' });
        }

        audits.push({ title: 'Sunlight Compatibility', desc: `Current exposure (${state.sunlight}) is well-suited for temperate food forest polycultures.` });

        audits.forEach(item => {
            const div = document.createElement('div');
            div.className = 'audit-item';
            div.innerHTML = `
                <div>
                    <strong style="font-size: 0.85rem; color: var(--text-primary);">${item.title}</strong>
                    <p style="font-size: 0.75rem; color: var(--text-secondary);">${item.desc}</p>
                </div>
            `;
            auditLog.appendChild(div);
        });
    }

    // Event Listeners for UI Controls
    filterTabs.forEach(btn => {
        btn.addEventListener('click', () => {
            filterTabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activeCategory = btn.getAttribute('data-category');
            renderCatalog();
        });
    });

    toolPlantBtn.addEventListener('click', () => {
        state.toolMode = 'plant';
        toolPlantBtn.classList.add('active');
        toolEraseBtn.classList.remove('active');
        const activePlant = plantCatalog.find(p => p.id === state.selectedPlantId);
        activeToolIndicator.textContent = activePlant ? `Selected: ${activePlant.name}` : 'Plant Mode';
    });

    toolEraseBtn.addEventListener('click', () => {
        state.toolMode = 'erase';
        toolEraseBtn.classList.add('active');
        toolPlantBtn.classList.remove('active');
        activeToolIndicator.textContent = 'Mode: Eraser';
    });

    btnNewGuild.addEventListener('click', () => {
        if (confirm('Clear entire guild plot?')) {
            state.grid = {};
            drawGrid();
            updateMetrics();
            auditLog.innerHTML = '<p class="audit-placeholder">Plot cleared. Place plants to run audit.</p>';
        }
    });

    plotNameInput.addEventListener('input', (e) => {
        state.plotName = e.target.value;
    });

    gridColsInput.addEventListener('change', (e) => {
        state.cols = parseInt(e.target.value) || 6;
        drawGrid();
        updateMetrics();
    });

    gridRowsInput.addEventListener('change', (e) => {
        state.rows = parseInt(e.target.value) || 6;
        drawGrid();
        updateMetrics();
    });

    sunlightSelect.addEventListener('change', (e) => {
        state.sunlight = e.target.value;
    });

    btnRunAudit.addEventListener('click', runAudit);

    // Export JSON Backup
    btnExport.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", `${state.plotName.toLowerCase().replace(/\s+/g, '_')}_guild.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
    });

    // Import JSON Backup
    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                if (parsed.grid && parsed.cols && parsed.rows) {
                    state = parsed;
                    plotNameInput.value = state.plotName || 'Imported Guild';
                    gridColsInput.value = state.cols;
                    gridRowsInput.value = state.rows;
                    sunlightSelect.value = state.sunlight || 'Full Sun';
                    drawGrid();
                    updateMetrics();
                    alert('Guild plot successfully imported!');
                } else {
                    alert('Invalid guild JSON format.');
                }
            } catch (err) {
                alert('Error parsing JSON file.');
            }
        };
        reader.readAsText(file);
    });

    // Initial Setup
    initDefaultGrid();
    renderCatalog();
    drawGrid();
    updateMetrics();
});
