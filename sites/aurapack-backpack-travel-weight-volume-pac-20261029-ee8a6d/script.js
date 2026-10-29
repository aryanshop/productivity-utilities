document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY = 'aurapack_inventory_v1';

  // Default initial gear items
  const defaultItems = [
    { id: '1', name: 'Ultralight Backpack (40L)', category: 'gear', type: 'pack', weight: 900, volume: 40, quantity: 1, priority: 'essential', packed: true },
    { id: '2', name: 'Down Sleeping Bag', category: 'sleep', type: 'pack', weight: 750, volume: 5, quantity: 1, priority: 'essential', packed: false },
    { id: '3', name: 'Rain Jacket', category: 'clothing', type: 'worn', weight: 320, volume: 1.5, quantity: 1, priority: 'essential', packed: true },
    { id: '4', name: 'Trail Running Shoes', category: 'clothing', type: 'worn', weight: 650, volume: 3, quantity: 1, priority: 'essential', packed: true },
    { id: '5', name: 'Power Bank 10000mAh', category: 'electronics', type: 'pack', weight: 210, volume: 0.4, quantity: 1, priority: 'essential', packed: false },
    { id: '6', name: 'Toiletries Kit', category: 'toiletries', type: 'pack', weight: 300, volume: 1.2, quantity: 1, priority: 'essential', packed: false },
    { id: '7', name: 'Trail Snacks (1 day)', category: 'consumables', type: 'consumable', weight: 500, volume: 1.5, quantity: 1, priority: 'essential', packed: false }
  ];

  let state = {
    items: loadItems(),
    limitWeight: 7, // kg
    limitVolume: 40, // Liters
    unitSystem: 'metric', // metric | imperial
    filterCategory: 'all',
    searchQuery: ''
  };

  function loadItems() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved items', e);
      }
    }
    return defaultItems;
  }

  function saveItems() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  }

  // DOM Elements
  const statTotalWeight = document.getElementById('stat-total-weight');
  const statTotalLbs = document.getElementById('stat-total-lbs');
  const statBaseWeight = document.getElementById('stat-base-weight');
  const statTotalVolume = document.getElementById('stat-total-volume');
  const statCapacityStatus = document.getElementById('stat-capacity-status');
  const statItemCount = document.getElementById('stat-item-count');
  const statPackedCount = document.getElementById('stat-packed-count');
  
  const limitWeightInput = document.getElementById('limit-weight');
  const limitVolumeInput = document.getElementById('limit-volume');
  const unitSystemSelect = document.getElementById('unit-system');
  const filterCategorySelect = document.getElementById('filter-category');
  const searchInput = document.getElementById('search-input');
  const labelWeight = document.getElementById('label-weight');
  
  const itemForm = document.getElementById('item-form');
  const itemsTbody = document.getElementById('items-tbody');
  const emptyState = document.getElementById('empty-state');
  const masterCheckbox = document.getElementById('master-checkbox');
  
  const btnCheckAll = document.getElementById('btn-check-all');
  const btnUncheckAll = document.getElementById('btn-uncheck-all');
  const btnExport = document.getElementById('btn-export');
  const btnImport = document.getElementById('btn-import');
  const importFile = document.getElementById('import-file');
  const btnReset = document.getElementById('btn-reset');
  const categoryBars = document.getElementById('category-bars');

  // Event Listeners
  limitWeightInput.addEventListener('input', (e) => {
    state.limitWeight = parseFloat(e.target.value) || 0;
    updateDashboard();
  });

  limitVolumeInput.addEventListener('input', (e) => {
    state.limitVolume = parseFloat(e.target.value) || 0;
    updateDashboard();
  });

  unitSystemSelect.addEventListener('change', (e) => {
    state.unitSystem = e.target.value;
    updateWeightLabels();
    render();
  });

  filterCategorySelect.addEventListener('change', (e) => {
    state.filterCategory = e.target.value;
    render();
  });

  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    render();
  });

  itemForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('item-name').value.trim();
    const category = document.getElementById('item-category').value;
    const type = document.getElementById('item-wearable').value;
    let rawWeight = parseFloat(document.getElementById('item-weight').value) || 0;
    const volume = parseFloat(document.getElementById('item-volume').value) || 0;
    const quantity = parseInt(document.getElementById('item-quantity').value) || 1;
    const priority = document.getElementById('item-priority').value;

    // Convert imperial input to grams if necessary
    let weightInGrams = rawWeight;
    if (state.unitSystem === 'imperial') {
      // if input is lbs, convert to grams (1 lb = 453.592g)
      weightInGrams = rawWeight * 453.592;
    }

    const newItem = {
      id: 'item_' + Date.now() + Math.random().toString(36.substring(2, 7)),
      name,
      category,
      type,
      weight: Math.round(weightInGrams),
      volume,
      quantity,
      priority,
      packed: false
    };

    state.items.push(newItem);
    saveItems();
    itemForm.reset();
    // Reset default form numbers cleanly
    document.getElementById('item-weight').value = state.unitSystem === 'imperial' ? '0.5' : '250';
    document.getElementById('item-volume').value = '1.0';
    document.getElementById('item-quantity').value = '1';
    render();
  });

  btnCheckAll.addEventListener('click', () => {
    state.items.forEach(i => i.packed = true);
    saveItems();
    render();
  });

  btnUncheckAll.addEventListener('click', () => {
    state.items.forEach(i => i.packed = false);
    saveItems();
    render();
  });

  btnExport.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.items, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "aurapack_inventory.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  btnImport.addEventListener('click', () => {
    importFile.click();
  });

  importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          state.items = imported;
          saveItems();
          render();
          alert('Inventory successfully imported!');
        } else {
          alert('Invalid file format.');
        }
      } catch (err) {
        alert('Error parsing JSON file.');
      }
      importFile.value = '';
    };
    reader.readAsText(file);
  });

  btnReset.addEventListener('click', () => {
    if (confirm('Reset inventory to default sample items?')) {
      state.items = [...defaultItems];
      saveItems();
      render();
    }
  });

  function updateWeightLabels() {
    if (state.unitSystem === 'imperial') {
      labelWeight.textContent = 'Weight (lbs)';
      if (document.getElementById('item-weight').value == 250) {
        document.getElementById('item-weight').value = '0.5';
      }
    } else {
      labelWeight.textContent = 'Weight (grams)';
      if (document.getElementById('item-weight').value == 0.5) {
        document.getElementById('item-weight').value = '250';
      }
    }
  }

  function formatWeight(grams) {
    if (state.unitSystem === 'imperial') {
      const lbs = grams / 453.592;
      return lbs.toFixed(2) + ' lbs';
    } else {
      if (grams >= 1000) {
        return (grams / 1000).toFixed(2) + ' kg';
      }
      return Math.round(grams) + ' g';
    }
  }

  function updateDashboard() {
    let totalGrams = 0;
    let baseGrams = 0;
    let totalVol = 0;
    let itemCount = state.items.length;
    let packedCount = 0;

    state.items.forEach(item => {
      const itemTotalWeight = item.weight * item.quantity;
      const itemTotalVol = item.volume * item.quantity;
      totalGrams += itemTotalWeight;
      totalVol += itemTotalVol;

      if (item.type !== 'consumable' && item.type !== 'worn') {
        baseGrams += itemTotalWeight;
      }

      if (item.packed) {
        packedCount += item.quantity;
      }
    });

    const totalKg = totalGrams / 1000;
    const totalLbs = totalGrams / 453.592;
    const baseKg = baseGrams / 1000;

    statTotalWeight.textContent = state.unitSystem === 'imperial' ? totalLbs.toFixed(2) + ' lbs' : totalKg.toFixed(2) + ' kg';
    statTotalLbs.textContent = state.unitSystem === 'imperial' ? totalKg.toFixed(2) + ' kg' : totalLbs.toFixed(2) + ' lbs';
    statBaseWeight.textContent = state.unitSystem === 'imperial' ? (baseGrams / 453.592).toFixed(2) + ' lbs' : baseKg.toFixed(2) + ' kg';
    statTotalVolume.textContent = totalVol.toFixed(1) + ' L';
    statItemCount.textContent = itemCount;
    statPackedCount.textContent = packedCount;

    // Check limits
    if (totalKg > state.limitWeight) {
      statTotalWeight.style.color = 'var(--danger)';
      statCapacityStatus.textContent = 'Overweight limit!';
      statCapacityStatus.style.color = 'var(--danger)';
    } else {
      statTotalWeight.style.color = 'var(--text-primary)';
      statCapacityStatus.textContent = totalVol > state.limitVolume ? 'Volume limit exceeded!' : 'Capacity: Optimal';
      statCapacityStatus.style.color = totalVol > state.limitVolume ? 'var(--warning)' : 'var(--success)';
    }

    renderCategoryBars(totalGrams);
  }

  function renderCategoryBars(totalGrams) {
    const categories = {
      clothing: { name: 'Clothing & Wear', weight: 0, color: '#0ea5e9' },
      sleep: { name: 'Sleep & Shelter', weight: 0, color: '#9333ea' },
      electronics: { name: 'Electronics', weight: 0, color: '#f97316' },
      toiletries: { name: 'Toiletries', weight: 0, color: '#14b8a6' },
      gear: { name: 'Gear & Misc', weight: 0, color: '#64748b' },
      consumables: { name: 'Consumables', weight: 0, color: '#22c55e' }
    };

    state.items.forEach(item => {
      if (categories[item.category]) {
        categories[item.category].weight += item.weight * item.quantity;
      }
    });

    categoryBars.innerHTML = '';
    Object.keys(categories).forEach(key => {
      const cat = categories[key];
      const percentage = totalGrams > 0 ? (cat.weight / totalGrams) * 100 : 0;
      
      const barDiv = document.createElement('div');
      barDiv.className = 'cat-bar-item';
      barDiv.innerHTML = `
        <div class="cat-bar-info">
          <span>${cat.name}</span>
          <span>${formatWeight(cat.weight)} (${percentage.toFixed(1)}%)</span>
        </div>
        <div class="cat-bar-track">
          <div class="cat-bar-fill" style="width: ${percentage}%; background-color: ${cat.color};"></div>
        </div>
      `;
      categoryBars.appendChild(barDiv);
    });
  }

  function renderItemsList() {
    itemsTbody.innerHTML = '';

    const filtered = state.items.filter(item => {
      const matchesCat = state.filterCategory === 'all' || item.category === state.filterCategory;
      const matchesSearch = item.name.toLowerCase().includes(state.searchQuery);
      return matchesCat && matchesSearch;
    });

    if (filtered.length === 0) {
      emptyState.style.display = 'block';
      return;
    } else {
      emptyState.style.display = 'none';
    }

    filtered.forEach(item => {
      const tr = document.createElement('tr');
      if (item.packed) {
        tr.className = 'packed-row';
      }

      const totalItemWeight = item.weight * item.quantity;
      const totalItemVol = item.volume * item.quantity;

      tr.innerHTML = `
        <td><input type="checkbox" class="item-checkbox" data-id="${item.id}" ${item.packed ? 'checked' : ''}></td>
        <td>
          <span class="item-title"><b>${escapeHTML(item.name)}</b></span><br>
          <small style="color: var(--text-secondary);">${item.type} &bull; ${item.priority}</small>
        </td>
        <td><span class="badge badge-${item.category}">${item.category}</span></td>
        <td>${formatWeight(totalItemWeight)}</td>
        <td>${totalItemVol.toFixed(1)} L</td>
        <td>${item.quantity}</td>
        <td>
          <button class="btn sm danger btn-delete" data-id="${item.id}">Delete</button>
        </td>
      `;

      itemsTbody.appendChild(tr);
    });

    // Bind row interactions
    document.querySelectorAll('.item-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        const item = state.items.find(i => i.id === id);
        if (item) {
          item.packed = e.target.checked;
          saveItems();
          render();
        }
      });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        state.items = state.items.filter(i => i.id !== id);
        saveItems();
        render();
      });
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

  function render() {
    updateDashboard();
    renderItemsList();
  }

  // Initial render
  render();
});
