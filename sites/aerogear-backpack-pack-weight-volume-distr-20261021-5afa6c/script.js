document.addEventListener('DOMContentLoaded', () => {
    // State
    let gearItems = [
        { id: 1, name: 'Ultralight Tent (2P)', category: 'Shelter', weight: 1200, volume: 4.5, type: 'base' },
        { id: 2, name: 'Down Sleeping Quilt', category: 'Sleep', weight: 650, volume: 5.0, type: 'base' },
        { id: 3, name: 'Inflatable Sleeping Pad', category: 'Sleep', weight: 380, volume: 2.2, type: 'base' },
        { id: 4, name: 'Titanium Stove & Pot', category: 'Kitchen', weight: 210, volume: 1.2, type: 'base' },
        { id: 5, name: 'Merino Wool Base Layer', category: 'Wear', weight: 220, volume: 1.5, type: 'worn' },
        { id: 6, name: 'Trail Running Shoes', category: 'Wear', weight: 620, volume: 3.0, type: 'worn' },
        { id: 7, name: 'Water Filter & Flask', category: 'Kitchen', weight: 150, volume: 1.0, type: 'base' },
        { id: 8, name: 'Trail Snacks & Food', category: 'Misc', weight: 1500, volume: 3.5, type: 'consumable' }
    ];

    let currentUnit = 'metric'; // metric (g, kg, L) or imperial (oz, lb, L)
    let currentFilter = 'all';
    let targetPackVolume = 58;

    // Preset data
    const presets = {
        ultralight: [
            { id: 101, name: 'Cuben Fiber Tarp', category: 'Shelter', weight: 300, volume: 1.5, type: 'base' },
            { id: 102, name: 'Down Quilt 30F', category: 'Sleep', weight: 500, volume: 3.8, type: 'base' },
            { id: 103, name: 'Foam Pad', category: 'Sleep', weight: 250, volume: 3.0, type: 'base' },
            { id: 104, name: 'Micro Stove', category: 'Kitchen', weight: 95, volume: 0.5, type: 'base' },
            { id: 105, name: 'Trail Runners', category: 'Wear', weight: 580, volume: 2.5, type: 'worn' },
            { id: 106, name: 'Water Filter', category: 'Kitchen', weight: 60, volume: 0.3, type: 'base' },
            { id: 107, name: 'Energy Bars (2 days)', category: 'Misc', weight: 1200, volume: 2.8, type: 'consumable' }
        ],
        weekend: [
            { id: 201, name: '3-Season Backpacking Tent', category: 'Shelter', weight: 1850, volume: 6.0, type: 'base' },
            { id: 202, name: 'Synthetic Sleeping Bag', category: 'Sleep', weight: 1100, volume: 7.5, type: 'base' },
            { id: 203, name: 'Self-Inflating Pad', category: 'Sleep', weight: 680, volume: 3.5, type: 'base' },
            { id: 204, name: 'Gas Stove & Cookset', category: 'Kitchen', weight: 450, volume: 2.0, type: 'base' },
            { id: 205, name: 'Rain Jacket', category: 'Wear', weight: 340, volume: 1.2, type: 'base' },
            { id: 206, name: 'Boots', category: 'Wear', weight: 1100, volume: 4.5, type: 'worn' },
            { id: 207, name: 'Food & 2L Water', category: 'Misc', weight: 3200, volume: 5.5, type: 'consumable' }
        ]
    };

    // DOM Elements
    const gearTbody = document.getElementById('gear-tbody');
    const emptyState = document.getElementById('empty-state');
    const valBaseWeight = document.getElementById('val-base-weight');
    const valTotalWeight = document.getElementById('val-total-weight');
    const valTotalVolume = document.getElementById('val-total-volume');
    const unitMetricBtn = document.getElementById('unit-metric');
    const unitImperialBtn = document.getElementById('unit-imperial');
    const labelWeight = document.getElementById('label-weight');
    const packCapacitySelect = document.getElementById('pack-capacity-limit');
    const volumeBarFill = document.getElementById('volume-bar-fill');
    const volumeUsedText = document.getElementById('volume-used-text');
    const volumeLimitText = document.getElementById('volume-limit-text');
    const comfortStatus = document.getElementById('comfort-status');
    const comfortText = document.getElementById('comfort-text');
    const addItemForm = document.getElementById('add-item-form');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const btnPresetUltralight = document.getElementById('btn-preset-ultralight');
    const btnPresetWeekend = document.getElementById('btn-preset-weekend');
    const btnClear = document.getElementById('btn-clear');
    const btnExportJson = document.getElementById('btn-export-json');
    const btnPrint = document.getElementById('btn-print');

    // Helper formatting functions
    function formatWeight(grams) {
        if (currentUnit === 'metric') {
            if (grams >= 1000) {
                return (grams / 1000).toFixed(2) + ' kg';
            }
            return Math.round(grams) + ' g';
        } else {
            // Imperial: grams to oz and lbs
            const totalOz = grams * 0.035274;
            if (totalOz >= 16) {
                const lbs = Math.floor(totalOz / 16);
                const oz = (totalOz % 16).toFixed(1);
                return `${lbs} lb ${oz} oz`;
            }
            return totalOz.toFixed(1) + ' oz';
        }
    }

    function parseInputWeight(val, unit) {
        const num = parseFloat(val) || 0;
        if (unit === 'imperial') {
            // Assume input in oz for small values or lb if specified, let's treat input as oz if imperial selected, or prompt
            // For simplicity in this demo, let's treat imperial input as ounces if small, or let's convert oz to grams (1 oz = 28.3495g)
            return num * 28.3495;
        }
        return num; // input in grams
    }

    // Render function
    function render() {
        // Filter items
        const filtered = gearItems.filter(item => {
            if (currentFilter === 'all') return true;
            return item.category === currentFilter;
        });

        gearTbody.innerHTML = '';

        if (filtered.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
            filtered.forEach(item => {
                const tr = document.createElement('tr');
                
                let tagClass = 'tag-base';
                let typeLabel = 'Base';
                if (item.type === 'worn') {
                    tagClass = 'tag-worn';
                    typeLabel = 'Worn';
                } else if (item.type === 'consumable') {
                    tagClass = 'tag-consumable';
                    typeLabel = 'Consumable';
                }

                tr.innerHTML = `
                    <td><strong>${escapeHtml(item.name)}</strong></td>
                    <td>${escapeHtml(item.category)}</td>
                    <td>${formatWeight(item.weight)}</td>
                    <td>${(item.volume || 0).toFixed(1)} L</td>
                    <td><span class="tag ${tagClass}">${typeLabel}</span></td>
                    <td>
                        <button class="btn-icon" title="Delete item" data-id="${item.id}">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </td>
                `;
                gearTbody.appendChild(tr);
            });
        }

        // Calculate Stats
        let baseWeightGrams = 0;
        let totalWeightGrams = 0;
        let totalVolumeLiters = 0;

        gearItems.forEach(item => {
            const w = item.weight || 0;
            const v = item.volume || 0;
            totalWeightGrams += w;
            if (item.type === 'base') {
                baseWeightGrams += w;
                totalVolumeLiters += v;
            } else if (item.type === 'consumable') {
                baseWeightGrams += w; // or track separately, standard base weight includes pack contents except worn/consumables sometimes, let's include consumables in total pack weight
                totalVolumeLiters += v;
            }
        });

        valBaseWeight.textContent = formatWeight(baseWeightGrams);
        valTotalWeight.textContent = formatWeight(totalWeightGrams);
        valTotalVolume.textContent = totalVolumeLiters.toFixed(1) + ' L';

        // Volume Bar & Comfort
        targetPackVolume = parseFloat(packCapacitySelect.value) || 58;
        const volumePercentage = Math.min(100, Math.round((totalVolumeLiters / targetPackVolume) * 100));
        volumeBarFill.style.width = volumePercentage + '%';
        volumeUsedText.textContent = totalVolumeLiters.toFixed(1) + ' L Used';
        volumeLimitText.textContent = targetPackVolume + ' L Capacity';

        // Color coding volume bar
        if (volumePercentage > 100) {
            volumeBarFill.style.backgroundColor = 'var(--danger-color)';
        } else if (volumePercentage > 85) {
            volumeBarFill.style.backgroundColor = 'var(--warning-color)';
        } else {
            volumeBarFill.style.backgroundColor = 'var(--accent-color)';
        }

        // Comfort & Pack rating
        const baseKg = baseWeightGrams / 1000;
        comfortStatus.className = 'comfort-badge';
        if (baseKg === 0) {
            comfortText.textContent = 'Add gear to evaluate pack comfort.';
        } else if (baseKg < 4.5) {
            comfortStatus.classList.add('optimal');
            comfortText.textContent = 'Ultralight Setup! Extremely agile and fast.';
        } else if (baseKg < 7.0) {
            comfortStatus.classList.add('optimal');
            comfortText.textContent = 'Lightweight Setup. Great balance of comfort & weight.';
        } else if (baseKg < 11.0) {
            comfortStatus.classList.add('warning');
            comfortText.textContent = 'Moderate Base Weight. Consider trimming heavy items.';
        } else {
            comfortStatus.classList.add('danger');
            comfortText.textContent = 'Heavy Load! High strain on joints and stamina.';
        }
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // Event Listeners for Unit Switch
    unitMetricBtn.addEventListener('click', () => {
        currentUnit = 'metric';
        unitMetricBtn.classList.add('active');
        unitImperialBtn.classList.remove('active');
        labelWeight.textContent = 'Weight (grams)';
        document.getElementById('item-weight').placeholder = '850';
        render();
    });

    unitImperialBtn.addEventListener('click', () => {
        currentUnit = 'imperial';
        unitImperialBtn.classList.add('active');
        unitMetricBtn.classList.remove('active');
        labelWeight.textContent = 'Weight (ounces)';
        document.getElementById('item-weight').placeholder = '30';
        render();
    });

    // Filter tabs
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.getAttribute('data-filter');
            render();
        });
    });

    // Pack capacity change
    packCapacitySelect.addEventListener('change', () => {
        render();
    });

    // Add item form submission
    addItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('item-name');
        const categoryInput = document.getElementById('item-category');
        const weightInput = document.getElementById('item-weight');
        const volumeInput = document.getElementById('item-volume');
        const typeInput = document.getElementById('item-type');

        const rawWeight = parseFloat(weightInput.value) || 0;
        const weightInGrams = currentUnit === 'imperial' ? rawWeight * 28.3495 : rawWeight;

        const newItem = {
            id: Date.now(),
            name: nameInput.value.trim(),
            category: categoryInput.value,
            weight: weightInGrams,
            volume: parseFloat(volumeInput.value) || 0,
            type: typeInput.value
        };

        gearItems.push(newItem);
        addItemForm.reset();
        render();
    });

    // Delete item listener
    gearTbody.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-icon');
        if (!btn) return;
        const id = parseInt(btn.getAttribute('data-id'), 10);
        gearItems = gearItems.filter(item => item.id !== id);
        render();
    });

    // Presets
    btnPresetUltralight.addEventListener('click', () => {
        gearItems = JSON.parse(JSON.stringify(presets.ultralight));
        render();
    });

    btnPresetWeekend.addEventListener('click', () => {
        gearItems = JSON.parse(JSON.stringify(presets.weekend));
        render();
    });

    btnClear.addEventListener('click', () => {
        if (confirm('Clear all gear items?')) {
            gearItems = [];
            render();
        }
    });

    // Export JSON
    btnExportJson.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gearItems, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "aerogear_blueprint.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    // Print
    btnPrint.addEventListener('click', () => {
        window.print();
    });

    // Initial render
    render();
});
