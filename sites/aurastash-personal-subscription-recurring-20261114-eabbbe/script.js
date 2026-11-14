document.addEventListener('DOMContentLoaded', () => {
    // Initial sample data if storage is empty
    const defaultSubscriptions = [
        { id: '1', name: 'Cloud Workspace', cost: 15.00, billing: 'monthly', category: 'software', status: 'active', notes: 'Renews on 12th' },
        { id: '2', name: 'Music Streaming', cost: 10.99, billing: 'monthly', category: 'entertainment', status: 'active', notes: 'Family plan' },
        { id: '3', name: 'VPS Hosting', cost: 60.00, billing: 'annual', category: 'utilities', status: 'active', notes: 'Billed yearly in March' },
        { id: '4', name: 'Cloud Storage 2TB', cost: 99.00, billing: 'annual', category: 'cloud', status: 'review', notes: 'Consider downgrading' },
        { id: '5', name: 'Design Pro Suite', cost: 22.00, billing: 'monthly', category: 'software', status: 'active', notes: 'Student discount' }
    ];

    let subscriptions = JSON.parse(localStorage.getItem('aurastash_subscriptions')) || defaultSubscriptions;

    // DOM Elements
    const statMonthly = document.getElementById('stat-monthly');
    const statMonthlySub = document.getElementById('stat-monthly-sub');
    const statAnnual = document.getElementById('stat-annual');
    const statAvg = document.getElementById('stat-avg');
    const statSavings = document.getElementById('stat-savings');
    const subscriptionsTbody = document.getElementById('subscriptions-tbody');
    const emptyState = document.getElementById('empty-state');
    const subscriptionForm = document.getElementById('subscription-form');
    const formTitle = document.getElementById('form-title');
    const btnSubmit = document.getElementById('btn-submit');
    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    const itemIdInput = document.getElementById('item-id');
    const itemNameInput = document.getElementById('item-name');
    const itemCostInput = document.getElementById('item-cost');
    const itemBillingSelect = document.getElementById('item-billing');
    const itemCategorySelect = document.getElementById('item-category');
    const itemStatusSelect = document.getElementById('item-status');
    const itemNotesInput = document.getElementById('item-notes');
    const searchInput = document.getElementById('search-input');
    const filterCategory = document.getElementById('filter-category');
    const filterStatus = document.getElementById('filter-status');
    const btnExport = document.getElementById('btn-export');
    const fileImport = document.getElementById('file-import');
    const btnReset = document.getElementById('btn-reset');
    const spendingCanvas = document.getElementById('spending-canvas');

    const categoryColors = {
        software: '#38bdf8',
        utilities: '#f59e0b',
        entertainment: '#10b981',
        cloud: '#8b5cf6',
        membership: '#ec4899',
        other: '#64748b'
    };

    const categoryLabels = {
        software: 'Software / SaaS',
        utilities: 'Utilities & Hosting',
        entertainment: 'Entertainment',
        cloud: 'Cloud Storage',
        membership: 'Memberships',
        other: 'Other'
    };

    // Helper: Convert any billing cycle to monthly cost
    function getMonthlyCost(cost, billing) {
        const val = parseFloat(cost) || 0;
        switch (billing) {
            case 'annual': return val / 12;
            case 'quarterly': return val / 3;
            case 'weekly': return val * 4.333;
            case 'monthly':
            default: return val;
        }
    }

    // Save to local storage
    function saveData() {
        localStorage.setItem('aurastash_subscriptions', JSON.stringify(subscriptions));
    }

    // Render all statistics, tables, and charts
    function render() {
        const searchQuery = searchInput.value.toLowerCase();
        const catFilter = filterCategory.value;
        const statusFilter = filterStatus.value;

        const filtered = subscriptions.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery) || (item.notes && item.notes.toLowerCase().includes(searchQuery));
            const matchesCat = catFilter === 'all' || item.category === catFilter;
            const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
            return matchesSearch && matchesCat && matchesStatus;
        });

        // Compute Stats across ALL subscriptions
        let totalMonthly = 0;
        let reviewMonthly = 0;
        let activeCount = 0;

        subscriptions.forEach(item => {
            const mCost = getMonthlyCost(item.cost, item.billing);
            if (item.status === 'active') {
                totalMonthly += mCost;
                activeCount++;
            }
            if (item.status === 'review') {
                reviewMonthly += mCost;
            }
        });

        const totalAnnual = totalMonthly * 12;
        const avgCost = activeCount > 0 ? totalMonthly / activeCount : 0;

        statMonthly.textContent = `$${totalMonthly.toFixed(2)}`;
        statMonthlySub.textContent = `${activeCount} active subscriptions`;
        statAnnual.textContent = `$${totalAnnual.toFixed(2)}`;
        statAvg.textContent = `$${avgCost.toFixed(2)}`;
        statSavings.textContent = `$${reviewMonthly.toFixed(2)}/mo`;

        // Render Table
        subscriptionsTbody.innerHTML = '';
        if (filtered.length === 0) {
            emptyState.style.display = 'block';
        } else {
            emptyState.style.display = 'none';
            filtered.forEach(item => {
                const mCost = getMonthlyCost(item.cost, item.billing);
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${escapeHtml(item.name)}</strong></td>
                    <td>${categoryLabels[item.category] || item.category}</td>
                    <td style="text-transform: capitalize;">${item.billing} ($${parseFloat(item.cost).toFixed(2)})</td>
                    <td><strong>$${mCost.toFixed(2)}</strong>/mo</td>
                    <td><span class="badge badge-${item.status}">${item.status === 'active' ? 'Active' : 'Review'}</span></td>
                    <td>${escapeHtml(item.notes || '-')}</td>
                    <td>
                        <div class="action-btns">
                            <button class="btn-icon" onclick="editSubscription('${item.id}')" title="Edit">✏️</button>
                            <button class="btn-icon delete" onclick="deleteSubscription('${item.id}')" title="Delete">🗑️</button>
                        </div>
                    </td>
                `;
                subscriptionsTbody.appendChild(tr);
            });
        }

        drawChart();
    }

    // Simple HTML escaper
    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // HTML5 Canvas Donut Chart rendering
    function drawChart() {
        if (!spendingCanvas) return;
        const ctx = spendingCanvas.getContext('2d');
        const width = spendingCanvas.parentElement.clientWidth;
        const height = 260;
        spendingCanvas.width = width * window.devicePixelRatio;
        spendingCanvas.height = height * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        spendingCanvas.style.width = width + 'px';
        spendingCanvas.style.height = height + 'px';

        ctx.clearRect(0, 0, width, height);

        // Aggregate monthly cost by category
        const categoryTotals = {};
        let grandTotal = 0;
        subscriptions.forEach(item => {
            const mCost = getMonthlyCost(item.cost, item.billing);
            categoryTotals[item.category] = (categoryTotals[item.category] || 0) + mCost;
            grandTotal += mCost;
        });

        const entries = Object.entries(categoryTotals).filter(([cat, val]) => val > 0);

        if (entries.length === 0 || grandTotal === 0) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = '14px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('No spending data to display', width / 2, height / 2);
            document.getElementById('chart-legend').innerHTML = '';
            return;
        }

        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(centerX, centerY) - 30;
        const innerRadius = radius * 0.6;

        let startAngle = -Math.PI / 2;

        entries.forEach(([cat, val]) => {
            const sliceAngle = (val / grandTotal) * (2 * Math.PI);
            const endAngle = startAngle + sliceAngle;

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
            ctx.closePath();
            ctx.fillStyle = categoryColors[cat] || '#64748b';
            ctx.fill();

            startAngle = endAngle;
        });

        // Draw center text
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 16px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`$${grandTotal.toFixed(0)}`, centerX, centerY - 8);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px system-ui';
        ctx.fillText('Monthly Total', centerX, centerY + 12);

        // Render custom HTML legend
        let legendHtml = '';
        entries.forEach(([cat, val]) => {
            const color = categoryColors[cat] || '#64748b';
            const label = categoryLabels[cat] || cat;
            const pct = ((val / grandTotal) * 100).toFixed(0);
            legendHtml += `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--text-muted);margin-left:10px;"><span style="width:8px;height:8px;background:${color};border-radius:50%;display:inline-block;"></span>${label} (${pct}%)</span>`;
        });
        document.getElementById('chart-legend').innerHTML = legendHtml;
    }

    // Form submit handler (Add or Update)
    subscriptionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = itemIdInput.value;
        const name = itemNameInput.value.trim();
        const cost = parseFloat(itemCostInput.value);
        const billing = itemBillingSelect.value;
        const category = itemCategorySelect.value;
        const status = itemStatusSelect.value;
        const notes = itemNotesInput.value.trim();

        if (!name || isNaN(cost)) return;

        if (id) {
            // Update existing
            const idx = subscriptions.findIndex(item => item.id === id);
            if (idx !== -1) {
                subscriptions[idx] = { id, name, cost, billing, category, status, notes };
            }
        } else {
            // Create new
            const newItem = {
                id: Date.now().toString(),
                name,
                cost,
                billing,
                category,
                status,
                notes
            };
            subscriptions.push(newItem);
        }

        saveData();
        resetForm();
        render();
    });

    // Reset form state
    function resetForm() {
        subscriptionForm.reset();
        itemIdInput.value = '';
        formTitle.textContent = 'Add New Subscription';
        btnSubmit.textContent = 'Add Subscription';
        btnCancelEdit.style.display = 'none';
    }

    btnCancelEdit.addEventListener('click', resetForm);

    // Global functions for table actions
    window.editSubscription = function(id) {
        const item = subscriptions.find(i => i.id === id);
        if (!item) return;
        itemIdInput.value = item.id;
        itemNameInput.value = item.name;
        itemCostInput.value = item.cost;
        itemBillingSelect.value = item.billing;
        itemCategorySelect.value = item.category;
        itemStatusSelect.value = item.status;
        itemNotesInput.value = item.notes || '';

        formTitle.textContent = 'Edit Subscription';
        btnSubmit.textContent = 'Update Subscription';
        btnCancelEdit.style.display = 'inline-block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.deleteSubscription = function(id) {
        if (confirm('Are you sure you want to delete this subscription?')) {
            subscriptions = subscriptions.filter(i => i.id !== id);
            saveData();
            render();
        }
    };

    // Search and filter listeners
    searchInput.addEventListener('input', render);
    filterCategory.addEventListener('change', render);
    filterStatus.addEventListener('change', render);

    // JSON Backup Export
    btnExport.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(subscriptions, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `aurastash_backup_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    // JSON Backup Import
    fileImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const parsed = JSON.parse(event.target.result);
                if (Array.isArray(parsed)) {
                    subscriptions = parsed;
                    saveData();
                    render();
                    alert('Subscriptions imported successfully!');
                } else {
                    alert('Invalid JSON structure.');
                }
            } catch (err) {
                alert('Error parsing JSON file.');
            }
            fileImport.value = '';
        };
        reader.readAsText(file);
    });

    // Reset data
    btnReset.addEventListener('click', () => {
        if (confirm('Reset all subscriptions to default sample data?')) {
            subscriptions = defaultSubscriptions;
            saveData();
            resetForm();
            render();
        }
    });

    // Initial render
    render();

    // Window resize handler for canvas redraw
    window.addEventListener('resize', () => {
        drawChart();
    });
});
