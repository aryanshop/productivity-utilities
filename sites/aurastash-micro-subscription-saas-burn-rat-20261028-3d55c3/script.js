// AuraStash: Micro-Subscription & SaaS Burn Rate Auditor

(function() {
    'use strict';

    // Initial sample data if localStorage is empty
    const defaultSubscriptions = [
        { id: 'sub-1', name: 'GitHub Copilot', cost: 10.00, cycle: 'monthly', category: 'Developer Tools', renewal: '2025-05-01' },
        { id: 'sub-2', name: 'Vercel Pro', cost: 20.00, cycle: 'monthly', category: 'Cloud & Hosting', renewal: '2025-05-15' },
        { id: 'sub-3', name: 'Figma Professional', cost: 144.00, cycle: 'annual', category: 'Productivity', renewal: '2025-11-10' },
        { id: 'sub-4', name: 'Netflix Premium', cost: 22.99, cycle: 'monthly', category: 'Entertainment', renewal: '2025-05-05' },
        { id: 'sub-5', name: 'ChatGPT Plus', cost: 20.00, cycle: 'monthly', category: 'Productivity', renewal: '2025-05-12' },
        { id: 'sub-6', name: 'Cloudflare Workers', cost: 5.00, cycle: 'monthly', category: 'Cloud & Hosting', renewal: '2025-05-01' }
    ];

    let subscriptions = [];
    let disabledSimulationIds = new Set();

    // DOM Elements
    const subTableBody = document.getElementById('sub-table-body');
    const subForm = document.getElementById('sub-form');
    const formTitle = document.getElementById('form-title');
    const saveSubBtn = document.getElementById('save-sub-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const subIdInput = document.getElementById('sub-id');
    const subNameInput = document.getElementById('sub-name');
    const subCostInput = document.getElementById('sub-cost');
    const subCycleInput = document.getElementById('sub-cycle');
    const subCategoryInput = document.getElementById('sub-category');
    const subRenewalInput = document.getElementById('sub-renewal');
    
    const kpiMonthly = document.getElementById('kpi-monthly');
    const kpiAnnual = document.getElementById('kpi-annual');
    const kpiDaily = document.getElementById('kpi-daily');
    const kpiActiveCount = document.getElementById('kpi-active-count');
    
    const searchInput = document.getElementById('search-input');
    const filterCategory = document.getElementById('filter-category');
    const categoryBars = document.getElementById('category-bars');
    const simulatorList = document.getElementById('simulator-list');
    const simulatedSavings = document.getElementById('simulated-savings');
    
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    const resetBtn = document.getElementById('reset-btn');

    // Initialize App
    function init() {
        loadData();
        setupEventListeners();
        render();
    }

    // Load data from localStorage
    function loadData() {
        const saved = localStorage.getItem('aurastash_subscriptions');
        if (saved) {
            try {
                subscriptions = JSON.parse(saved);
            } catch (e) {
                subscriptions = defaultSubscriptions;
            }
        } else {
            subscriptions = defaultSubscriptions;
            saveData();
        }
    }

    // Save data to localStorage
    function saveData() {
        localStorage.setItem('aurastash_subscriptions', JSON.stringify(subscriptions));
    }

    // Event Listeners Setup
    function setupEventListeners() {
        subForm.addEventListener('submit', handleFormSubmit);
        cancelEditBtn.addEventListener('click', resetForm);
        searchInput.addEventListener('input', renderTable);
        filterCategory.addEventListener('change', renderTable);
        
        exportBtn.addEventListener('click', exportData);
        importBtn.addEventListener('click', () => importFile.click());
        importFile.addEventListener('change', importData);
        resetBtn.addEventListener('click', resetToDefaults);
    }

    // Convert any billing cycle to monthly equivalent
    function getMonthlyEquivalent(cost, cycle) {
        const val = parseFloat(cost) || 0;
        switch (cycle) {
            case 'weekly': return (val * 52) / 12;
            case 'monthly': return val;
            case 'quarterly': return val / 3;
            case 'annual': return val / 12;
            default: return val;
        }
    }

    // Format Currency
    function formatCurrency(amount) {
        return '$' + amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Handle Form Submit (Add or Update)
    function handleFormSubmit(e) {
        e.preventDefault();
        const id = subIdInput.value;
        const name = subNameInput.value.trim();
        const cost = parseFloat(subCostInput.value);
        const cycle = subCycleInput.value;
        const category = subCategoryInput.value;
        const renewal = subRenewalInput.value;

        if (!name || isNaN(cost)) return;

        if (id) {
            // Edit existing
            const index = subscriptions.findIndex(s => s.id === id);
            if (index !== -1) {
                subscriptions[index] = { id, name, cost, cycle, category, renewal };
            }
        } else {
            // Add new
            const newSub = {
                id: 'sub-' + Date.now(),
                name,
                cost,
                cycle,
                category,
                renewal: renewal || new Date().toISOString().split('T')[0]
            };
            subscriptions.push(newSub);
        }

        saveData();
        resetForm();
        render();
    }

    // Reset Form State
    function resetForm() {
        subForm.reset();
        subIdInput.value = '';
        formTitle.textContent = 'Add Subscription';
        saveSubBtn.textContent = 'Add Subscription';
        cancelEditBtn.style.display = 'none';
    }

    // Edit Subscription
    window.editSubscription = function(id) {
        const sub = subscriptions.find(s => s.id === id);
        if (!sub) return;

        subIdInput.value = sub.id;
        subNameInput.value = sub.name;
        subCostInput.value = sub.cost;
        subCycleInput.value = sub.cycle;
        subCategoryInput.value = sub.category;
        subRenewalInput.value = sub.renewal || '';

        formTitle.textContent = 'Edit Subscription';
        saveSubBtn.textContent = 'Update Subscription';
        cancelEditBtn.style.display = 'inline-block';
        subNameInput.focus();
    };

    // Delete Subscription
    window.deleteSubscription = function(id) {
        subscriptions = subscriptions.filter(s => s.id !== id);
        disabledSimulationIds.delete(id);
        saveData();
        render();
    };

    // Render all UI components
    function render() {
        renderKPIs();
        renderTable();
        renderCategoryBreakdown();
        renderSimulator();
    }

    // Render KPIs
    function renderKPIs() {
        let totalMonthly = 0;
        subscriptions.forEach(sub => {
            if (!disabledSimulationIds.has(sub.id)) {
                totalMonthly += getMonthlyEquivalent(sub.cost, sub.cycle);
            }
        });

        const totalAnnual = totalMonthly * 12;
        const totalDaily = totalAnnual / 365;

        kpiMonthly.textContent = formatCurrency(totalMonthly);
        kpiAnnual.textContent = formatCurrency(totalAnnual);
        kpiDaily.textContent = `${formatCurrency(totalDaily)} / day`;
        kpiActiveCount.textContent = `${subscriptions.length} active items`;
    }

    // Render Subscriptions Table with filters
    function renderTable() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedCategory = filterCategory.value;

        subTableBody.innerHTML = '';

        const filtered = subscriptions.filter(sub => {
            const matchesSearch = sub.name.toLowerCase().includes(searchTerm) || sub.category.toLowerCase().includes(searchTerm);
            const matchesCat = selectedCategory === 'all' || sub.category === selectedCategory;
            return matchesSearch && matchesCat;
        });

        if (filtered.length === 0) {
            subTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">No subscriptions found.</td></tr>`;
            return;
        }

        filtered.forEach(sub => {
            const monthlyEq = getMonthlyEquivalent(sub.cost, sub.cycle);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${escapeHtml(sub.name)}</strong></td>
                <td><span class="badge">${escapeHtml(sub.category)}</span></td>
                <td style="text-transform: capitalize;">${sub.cycle} ($${sub.cost.toFixed(2)})</td>
                <td><strong>${formatCurrency(monthlyEq)}</strong></td>
                <td>${sub.renewal || 'N/A'}</td>
                <td class="actions-cell">
                    <button class="icon-btn" onclick="editSubscription('${sub.id}')" title="Edit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="icon-btn delete" onclick="deleteSubscription('${sub.id}')" title="Delete">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </td>
            `;
            subTableBody.appendChild(tr);
        });
    }

    // Render Category Breakdown Bars
    function renderCategoryBreakdown() {
        categoryBars.innerHTML = '';

        const categoryTotals = {};
        let grandTotalMonthly = 0;

        subscriptions.forEach(sub => {
            const m = getMonthlyEquivalent(sub.cost, sub.cycle);
            grandTotalMonthly += m;
            categoryTotals[sub.category] = (categoryTotals[sub.category] || 0) + m;
        });

        if (grandTotalMonthly === 0) {
            categoryBars.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No active expenses to chart.</p>';
            return;
        } 

        Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]).forEach(cat => {
            const amount = categoryTotals[cat];
            const percentage = (amount / grandTotalMonthly) * 100;

            const row = document.createElement('div');
            row.className = 'cat-bar-row';
            row.innerHTML = `
                <div class="cat-bar-meta">
                    <span>${escapeHtml(cat)}</span>
                    <span>${formatCurrency(amount)}/mo (${percentage.toFixed(1)}%)</span>
                </div>
                <div class="cat-bar-track">
                    <div class="cat-bar-fill" style="width: ${percentage}%"></div>
                </div>
            `;
            categoryBars.appendChild(row);
        });
    }

    // Render Simulator Toggles
    function renderSimulator() {
        simulatorList.innerHTML = '';

        if (subscriptions.length === 0) {
            simulatorList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">Add subscriptions to run simulations.</p>';
            simulatedSavings.textContent = '$0.00';
            return;
        }

        let totalAnnualSavings = 0;

        subscriptions.forEach(sub => {
            const isCancelled = disabledSimulationIds.has(sub.id);
            if (isCancelled) {
                totalAnnualSavings += getMonthlyEquivalent(sub.cost, sub.cycle) * 12;
            }

            const item = document.createElement('div');
            item.className = 'simulator-item';
            item.innerHTML = `
                <label>
                    <input type="checkbox" data-sim-id="${sub.id}" ${isCancelled ? 'checked' : ''}>
                    <span>${escapeHtml(sub.name)}</span>
                </label>
                <span style="color: var(--text-muted); font-size: 0.8rem;">${formatCurrency(getMonthlyEquivalent(sub.cost, sub.cycle))} /mo</span>
            `;

            const checkbox = item.querySelector('input');
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    disabledSimulationIds.add(sub.id);
                } else {
                    disabledSimulationIds.delete(sub.id);
                } 
                render();
            });

            simulatorList.appendChild(item);
        });

        simulatedSavings.textContent = formatCurrency(totalAnnualSavings);
    }

    // Export JSON Data
    function exportData() {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(subscriptions, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", `aurastash_backup_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
    }

    // Import JSON Data
    function importData(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const parsed = JSON.parse(evt.target.result);
                if (Array.isArray(parsed)) {
                    subscriptions = parsed;
                    disabledSimulationIds.clear();
                    saveData();
                    render();
                    alert('Subscriptions imported successfully!');
                } else {
                    alert('Invalid JSON file format.');
                }
            } catch (err) {
                alert('Error parsing JSON file.');
            }
            importFile.value = '';
        };
        reader.readAsText(file);
    }

    // Reset to Defaults
    function resetToDefaults() {
        if (confirm('Reset all subscriptions to default sample data?')) {
            subscriptions = defaultSubscriptions;
            disabledSimulationIds.clear();
            saveData();
            resetForm();
            render();
        }
    }

    // Helper for HTML escaping
    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // Run on DOM ready
    document.addEventListener('DOMContentLoaded', init);
})();
