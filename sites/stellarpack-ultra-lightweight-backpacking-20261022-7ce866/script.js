/* StellarPack: Backpacking & Gear Rigidity Analyzer */

document.addEventListener('DOMContentLoaded', () => {
  // State Management
  let currentUnit = 'metric'; // 'metric' (grams/kg) or 'imperial' (oz/lbs)
  let activeFilter = 'all';
  let searchQuery = '';

  // Default Sample Gear Items
  const ultralightPreset = [
    { id: '1', name: 'Tarp Tent (1P)', category: 'Shelter', type: 'base', weightGrams: 520, volumeLiters: 2.0 },
    { id: '2', name: 'Quilt (Down 20F)', category: 'Sleep', type: 'base', weightGrams: 580, volumeLiters: 4.5 },
    { id: '3', name: 'Inflatable Pad', category: 'Sleep', type: 'base', weightGrams: 350, volumeLiters: 1.8 },
    { id: '4', name: 'Ultralight Backpack (45L)', category: 'Shelter', type: 'base', weightGrams: 650, volumeLiters: 1.2 },
    { id: '5', name: 'Titanium Pot & Stove', category: 'Kitchen', type: 'base', weightGrams: 180, volumeLiters: 1.0 },
    { id: '6', name: 'Water Filter (Squeeze)', category: 'Cook', type: 'base', weightGrams: 90, volumeLiters: 0.3 },
    { id: '7', name: 'Headlamp & Charger', category: 'Electronics', type: 'base', weightGrams: 75, volumeLiters: 0.2 },
    { id: '8', name: 'Trail Runners & Socks', category: 'Wear', type: 'worn', weightGrams: 620, volumeLiters: 0.0 },
    { id: '9', name: 'Merino Sun Hoodie', category: 'Wear', type: 'worn', weightGrams: 190, volumeLiters: 0.0 },
    { id: '10', name: 'Freeze-Dried Meals (3 Days)', category: 'Cook', type: 'consumable', weightGrams: 1200, volumeLiters: 6.0 },
    { id: '11', name: 'Water Carry (2L)', category: 'Cook', type: 'consumable', weightGrams: 2000, volumeLiters: 2.0 },
  ];

  const weekendPreset = [
    { id: '101', name: 'Dome Tent (2P)', category: 'Shelter', type: 'base', weightGrams: 2100, volumeLiters: 6.5 },
    { id: '102', name: 'Synthetic Sleeping Bag', category: 'Sleep', type: 'base', weightGrams: 1400, volumeLiters: 8.0 },
    { id: '103', name: 'Self-Inflating Mat', category: 'Sleep', type: 'base', weightGrams: 850, volumeLiters: 4.0 },
    { id: '104', name: 'Trekking Pack (65L)', category: 'Shelter', type: 'base', weightGrams: 2200, volumeLiters: 3.0 },
    { id: '105', name: 'Camping Stove & Gas', category: 'Kitchen', type: 'base', weightGrams: 550, volumeLiters: 1.5 },
    { id: '106', name: 'Pumice Water Filter', category: 'Cook', type: 'base', weightGrams: 320, volumeLiters: 0.8 },
    { id: '107', name: 'Power Bank 20000mAh', category: 'Electronics', type: 'base', weightGrams: 380, volumeLiters: 0.5 },
    { id: '108', name: 'Heavy Hiking Boots', category: 'Wear', type: 'worn', weightGrams: 1400, volumeLiters: 0.0 },
    { id: '109', name: 'Fleece Jacket & Pants', category: 'Wear', type: 'base', weightGrams: 850, volumeLiters: 4.0 },
    { id: '110', name: 'Trail Food & Snacks', category: 'Cook', type: 'consumable', weightGrams: 2500, volumeLiters: 9.0 },
    { id: '111', name: 'Water Carry (3L)', category: 'Cook', type: 'consumable', weightGrams: 3000, volumeLiters: 3.0 },
  ];

  let gearInventory = [...ultralightPreset];

  // DOM Elements
  const gearTbody = document.getElementById('gear-tbody');
  const gearForm = document.getElementById('gear-form');
  const searchInput = document.getElementById('search-input');
  const unitBtns = document.querySelectorAll('.unit-btn');
  const labelUnitWeight = document.getElementById('label-unit-weight');
  const chipBtns = document.querySelectorAll('.chip');

  // Metrics Elements
  const metricTotalWeight = document.getElementById('metric-total-weight');
  const metricTotalOz = document.getElementById('metric-total-oz');
  const metricBaseWeight = document.getElementById('metric-base-weight');
  const metricBaseRating = document.getElementById('metric-base-rating');
  const metricVolume = document.getElementById('metric-volume');
  const metricPackFit = document.getElementById('metric-pack-fit');
  const metricCog = document.getElementById('metric-cog');
  const metricCogDesc = document.getElementById('metric-cog-desc');

  // Analytics
  const categoryBreakdown = document.getElementById('category-breakdown');
  const statBalanceScore = document.getElementById('stat-balance-score');
  const cogAdvice = document.getElementById('cog-advice');
  const cogCanvas = document.getElementById('cog-canvas');

  // Buttons
  const btnPresetUltralight = document.getElementById('btn-preset-ultralight');
  const btnPresetWeekend = document.getElementById('btn-preset-weekend');
  const btnReset = document.getElementById('btn-reset');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnPrint = document.getElementById('btn-print');

  // Conversion Helpers
  function gramsToDisplay(grams) {
    if (currentUnit === 'imperial') {
      const totalOz = grams * 0.035274;
      if (totalOz >= 16) {
        const lbs = (totalOz / 16).toFixed(1);
        return `${lbs} lbs`;
      }
      return `${totalOz.toFixed(1)} oz`;
    } else {
      if (grams >= 1000) {
        return `${(grams / 1000).toFixed(2)} kg`;
      }
      return `${Math.round(grams)} g`;
    }
  }

  function formatWeightNumber(grams) {
    if (currentUnit === 'imperial') {
      return (grams * 0.035274).toFixed(1);
    }
    return grams >= 1000 ? (grams / 1000).toFixed(2) : Math.round(grams);
  }

  // Event Listeners for Unit Toggles
  unitBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      unitBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentUnit = btn.getAttribute('data-unit');
      labelUnitWeight.textContent = currentUnit === 'imperial' ? 'ounces (oz)' : 'grams (g)';
      renderApp();
    });
  });

  // Filter Chips
  chipBtns.forEach(chip => {
    chip.addEventListener('click', () => {
      chipBtns.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.getAttribute('data-filter');
      renderTable();
    });
  });

  // Search Input
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderTable();
  });

  // Form Submission
  gearForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('gear-name');
    const categoryInput = document.getElementById('gear-category');
    const weightInput = document.getElementById('gear-weight');
    const volumeInput = document.getElementById('gear-volume');
    const typeInput = document.getElementById('gear-type');

    let rawWeight = parseFloat(weightInput.value);
    let weightGrams = currentUnit === 'imperial' ? rawWeight / 0.035274 : rawWeight;
    let volumeLiters = parseFloat(volumeInput.value) || 0.0;

    const newItem = {
      id: Date.now().toString(),
      name: nameInput.value.trim(),
      category: categoryInput.value,
      type: typeInput.value,
      weightGrams: weightGrams,
      volumeLiters: volumeLiters
    };

    gearInventory.push(newItem);
    gearForm.reset();
    renderApp();
  });

  // Preset Buttons
  btnPresetUltralight.addEventListener('click', () => {
    gearInventory = [...ultralightPreset];
    renderApp();
  });

  btnPresetWeekend.addEventListener('click', () => {
    gearInventory = [...weekendPreset];
    renderApp();
  });

  btnReset.addEventListener('click', () => {
    gearInventory = [];
    renderApp();
  });

  // Export JSON
  btnExportJson.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(gearInventory, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "stellarpack_gear_list.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  // Print Report
  btnPrint.addEventListener('click', () => {
    window.print();
  });

  // Delete Item Function
  window.deleteGearItem = function(id) {
    gearInventory = gearInventory.filter(item => item.id !== id);
    renderApp();
  };

  // Main Render Controller
  function renderApp() {
    renderTable();
    renderMetrics();
    renderCategoryBreakdown();
    renderCogVisualizer();
  }

  // Render Table
  function renderTable() {
    gearTbody.innerHTML = '';

    const filtered = gearInventory.filter(item => {
      const matchesFilter = activeFilter === 'all' || item.category === activeFilter;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery);
      return matchesFilter && matchesSearch;
    });

    if (filtered.length === 0) {
      gearTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No gear items found. Add items above or load a preset.</td></tr>`;
      return;
    }

    filtered.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(item.name)}</strong></td>
        <td><span class="chip" style="pointer-events: none;">${escapeHtml(item.category)}</span></td>
        <td><span style="text-transform: capitalize; font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(item.type)}</span></td>
        <td>${gramsToDisplay(item.weightGrams)}</td>
        <td>${item.volumeLiters > 1e-3 ? item.volumeLiters.toFixed(1) + ' L' : '--'}</td>
        <td>
          <button class="btn-icon" onclick="deleteGearItem('${item.id}')" title="Delete item">✕</button>
        </td>
      `;
      gearTbody.appendChild(tr);
    });
  }

  // Render Metrics Bar
  function renderMetrics() {
    let totalGrams = 0;
    let baseGrams = 0;
    let totalVol = 0;

    gearInventory.forEach(item => {
      totalGrams += item.weightGrams;
      if (item.type === 'base') {
        baseGrams += item.weightGrams;
      }
      if (item.type !== 'worn') {
        totalVol += item.volumeLiters;
      }
    });

    metricTotalWeight.textContent = gramsToDisplay(totalGrams);
    metricTotalOz.textContent = `(${(totalGrams * 0.035274).toFixed(1)} oz / ${(totalGrams / 453.59237).toFixed(2)} lbs)`;
    
    metricBaseWeight.textContent = gramsToDisplay(baseGrams);

    // Base Weight Rating Algorithm
    let baseKg = baseGrams / 1000;
    let rating = "Standard";
    let ratingColor = "var(--text-muted)";
    if (baseKg < 4.5 && baseKg > 0) {
      rating = "Ultralight (< 4.5 kg)";
      ratingColor = "var(--success)";
    } else if (baseKg < 6.8) {
      rating = "Lightweight (< 6.8 kg)";
      ratingColor = "var(--accent)";
    } else if (baseKg < 10) {
      rating = "Traditional / Moderate";
      ratingColor = "var(--warning)";
    } else if (baseKg >= 10) {
      rating = "Heavy / Traditional";
      ratingColor = "var(--danger)";
    }
    metricBaseRating.textContent = rating;
    metricBaseRating.style.color = ratingColor;

    metricVolume.textContent = `${totalVol.toFixed(1)} L`;
    
    // Recommended Pack sizing (add 15L buffer for food/comfort)
    let suggestedPack = Math.ceil((totalVol + 10) / 10) * 10;
    if (suggestedPack < 30) suggestedPack = 30;
    if (suggestedPack > 85) suggestedPack = 85;
    metricPackFit.textContent = `Recommended Pack: ~${suggestedPack}L capacity`;
  }

  // Render Category Breakdown Bars
  function renderCategoryBreakdown() {
    categoryBreakdown.innerHTML = '';
    const categories = {};
    let totalWeight = 0;

    gearInventory.forEach(item => {
      totalWeight += item.weightGrams;
      categories[item.category] = (categories[item.category] || 0) + item.weightGrams;
    });

    if (totalWeight === 0) {
      categoryBreakdown.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">No weight distributed yet.</p>`;
      return;
    }

    Object.keys(categories).forEach(cat => {
      const weight = categories[cat];
      const percentage = ((weight / totalWeight) * 100).toFixed(1);

      const div = document.createElement('div');
      div.className = 'breakdown-item';
      div.innerHTML = `
        <div class="breakdown-info">
          <span>${escapeHtml(cat)}</span>
          <span>${gramsToDisplay(weight)} (${percentage}%)</span>
        </div>
        <div class="breakdown-bar-bg">
          <div class="breakdown-bar-fill" style="width: ${percentage}%"></div>
        </div>
      `;
      categoryBreakdown.appendChild(div);
    });
  }

  // Render Ergonomic COG Visualizer
  function renderCogVisualizer() {
    const ctx = cogCanvas.getContext('2d');
    const width = cogCanvas.width;
    const height = cogCanvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw Backpack Outline
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#1e293b';

    // Backpack body shape
    ctx.beginPath();
    ctx.roundRect(60, 40, 100, 240, [16, 16, 8, 8]);
    ctx.fill();
    ctx.stroke();

    // Top lid pocket
    ctx.beginPath();
    ctx.roundRect(70, 25, 80, 25, [8, 8, 4, 4]);
    ctx.fillStyle = '#283548';
    ctx.fill();
    ctx.stroke();

    // Spine line representation
    ctx.strokeStyle = '#475569';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(110, 50);
    ctx.lineTo(110, 280);
    ctx.stroke();
    ctx.setLineDash([]);

    // Calculate Center of Gravity based on item categories and weights
    // Heavy items (Shelter, Cook/Water) should ideally be centered close to the spine and mid-back.
    let totalWeight = 0;
    let weightedXSum = 0;
    let weightedYSum = 0;

    // Assign relative coordinate map for categories inside the pack
    // X: 60 (left wall) to 160 (right wall), Center = 110
    // Y: 50 (top) to 270 (bottom)
    const catPositionMap = {
      'Shelter': { x: 110, y: 220 },   // Usually packed at bottom or middle-bottom
      'Sleep': { x: 110, y: 240 },     // Bottom of pack
      'Kitchen': { x: 100, y: 150 },   // Mid pack close to spine
      'Cook': { x: 110, y: 130 },      // Heavy water/food near spine middle
      'Electronics': { x: 120, y: 70 }, // Top pocket / easily accessible
      'Misc': { x: 95, y: 90 },        // Side pockets / top
      'Wear': { x: 110, y: 180 }
    };

    gearInventory.forEach(item => {
      if (item.type === 'worn') return; // worn items don't sit in pack
      const pos = catPositionMap[item.category] || { x: 110, y: 160 };
      const w = item.weightGrams || 1;
      totalWeight += w;
      weightedXSum += pos.x * w;
      weightedYSum += pos.y * w;
    });

    if (totalWeight === 0) {
      statBalanceScore.textContent = 'No Pack Load';
      cogAdvice.textContent = 'Add gear items to simulate backpack load distribution and spine alignment.';
      return;
    }

    let cogX = weightedXSum / totalWeight;
    let cogY = weightedYSum / totalWeight;

    // Draw COG crosshair
    ctx.strokeStyle = '#f43f5e';
    ctx.fillStyle = '#f43f5e';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(cogX, cogY, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cogX - 12, cogY);
    ctx.lineTo(cogX + 12, cogY);
    ctx.moveTo(cogX, cogY - 12);
    ctx.lineTo(cogX, cogY + 12);
    ctx.stroke();

    // Evaluate balance and posture impact
    // Ideal COG X is around 110 (spine), Ideal Y is around 140-170 (mid back, shoulder blade height)
    let distanceYFromIdeal = Math.abs(cogY - 155);
    let balanceScore = Math.max(0, Math.min(100, Math.round(100 - (distanceYFromIdeal * 0.8))));

    statBalanceScore.textContent = `${balanceScore} / 100`;

    if (cogY > 200) {
      cogAdvice.textContent = '⚠️ Load is too low! Pulls shoulders backward and destabilizes hips. Move dense items higher and closer to the spine.';
      statBalanceScore.style.color = 'var(--warning)';
    } else if (cogY < 100) {
      cogAdvice.textContent = '⚠️ Load is too high! Can cause forward lean and balance loss. Lower heavy items slightly.';
      statBalanceScore.style.color = 'var(--warning)';
    } else if (balanceScore >= 80) {
      cogAdvice.textContent = '✨ Excellent ergonomic balance! Center of gravity is aligned with your natural spine axis, reducing lower back strain.';
      statBalanceScore.style.color = 'var(--success)';
    } else {
      cogAdvice.textContent = '👍 Moderate balance. Ensure dense items (food, water) are pushed directly against the back panel.';
      statBalanceScore.style.color = 'var(--accent)';
    }
  }

  // Utility Escape HTML
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Initial Render
  renderApp();
});
