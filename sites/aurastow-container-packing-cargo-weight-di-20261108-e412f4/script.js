document.addEventListener('DOMContentLoaded', () => {
  // State management
  let state = {
    container: {
      type: 'van',
      length: 240,
      width: 140,
      height: 120,
      maxPayload: 650
    },
    items: [],
    viewMode: 'top' // 'top' or 'profile'
  };

  // DOM Elements
  const containerTypeEl = document.getElementById('container-type');
  const containerLengthEl = document.getElementById('container-length');
  const containerWidthEl = document.getElementById('container-width');
  const containerHeightEl = document.getElementById('container-height');
  const maxPayloadEl = document.getElementById('max-payload');

  const gearForm = document.getElementById('gear-form');
  const gearNameEl = document.getElementById('gear-name');
  const gearWeightEl = document.getElementById('gear-weight');
  const gearCategoryEl = document.getElementById('gear-category');
  const gearLEl = document.getElementById('gear-l');
  const gearWEl = document.getElementById('gear-w');
  const gearHEl = document.getElementById('gear-h');
  const gearPriorityEl = document.getElementById('gear-priority');
  const gearFragileEl = document.getElementById('gear-fragile');

  const statWeightEl = document.getElementById('stat-weight');
  const statWeightPctEl = document.getElementById('stat-weight-pct');
  const progressWeightEl = document.getElementById('progress-weight');
  
  const statVolumeEl = document.getElementById('stat-volume');
  const statVolumePctEl = document.getElementById('stat-volume-pct');
  const progressVolumeEl = document.getElementById('progress-volume');

  const statCgStatusEl = document.getElementById('stat-cg-status');
  const statCgDescEl = document.getElementById('stat-cg-desc');

  const inventoryTbody = document.getElementById('inventory-tbody');
  const itemCountEl = document.getElementById('item-count');

  const btnLoadPreset = document.getElementById('btn-load-preset');
  const btnReset = document.getElementById('btn-reset');
  const viewToggleBtns = document.querySelectorAll('.btn-view');
  const canvas = document.getElementById('stowage-canvas');
  const ctx = canvas.getContext('2d');

  // Load from localStorage if present
  const savedState = localStorage.getItem('aurastow_state');
  if (savedState) {
    try {
      state = JSON.parse(savedState);
      syncContainerForm();
    } catch (e) {
      console.error('Failed to parse saved state');
    }
  }

  function saveState() {
    localStorage.setItem('aurastow_state', JSON.stringify(state));
  }

  function syncContainerForm() {
    containerTypeEl.value = state.container.type;
    containerLengthEl.value = state.container.length;
    containerWidthEl.value = state.container.width;
    containerHeightEl.value = state.container.height;
    maxPayloadEl.value = state.container.maxPayload;
  }

  // Event listeners for container changes
  [containerTypeEl, containerLengthEl, containerWidthEl, containerHeightEl, maxPayloadEl].forEach(el => {
    el.addEventListener('input', () => {
      state.container.type = containerTypeEl.value;
      state.container.length = Math.max(50, parseFloat(containerLengthEl.value) || 200);
      state.container.width = Math.max(40, parseFloat(containerWidthEl.value) || 120);
      state.container.height = Math.max(30, parseFloat(containerHeightEl.value) || 100);
      state.container.maxPayload = Math.max(10, parseFloat(maxPayloadEl.value) || 500);
      saveState();
      updateCalculations();
    });
  });

  // Add gear form submit
  gearForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newItem = {
      id: 'item_' + Date.now() + Math.random().toString(36.substr(2, 5)),
      name: gearNameEl.value.trim(),
      weight: parseFloat(gearWeightEl.value) || 1,
      category: gearCategoryEl.value,
      l: parseFloat(gearLEl.value) || 30,
      w: parseFloat(gearWEl.value) || 30,
      h: parseFloat(gearHEl.value) || 30,
      priority: gearPriorityEl.value,
      fragile: gearFragileEl.checked
    };

    state.items.push(newItem);
    saveState();
    updateCalculations();
    gearForm.reset();
    gearNameEl.focus();
  });

  // View mode toggles
  viewToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      viewToggleBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.viewMode = btn.getAttribute('data-view');
      drawCanvas();
    });
  });

  // Preset sample trip
  btnLoadPreset.addEventListener('click', () => {
    state.container = { type: 'van', length: 240, width: 140, height: 120, maxPayload: 650 };
    state.items = [
      { id: 'p1', name: 'Fresh Water Tank (50L)', weight: 50, category: 'heavy', l: 80, w: 40, h: 30, priority: 'medium', fragile: false },
      { id: 'p2', name:'Dual Battery Bank', weight: 32, category: 'heavy', l: 50, w: 30, h: 25, priority: 'medium', fragile: false },
      { id: 'p3', name: 'Portable Fridge/Freezer', weight: 22, category: 'kitchen', l: 65, w: 40, h: 45, priority: 'high', fragile: false },
      { id: 'p4', name: 'Camping Stove & Cookware', weight: 8, category: 'kitchen', l: 40, w: 30, h: 25, priority: 'high', fragile: false },
      { id: 'p5', name: 'Sleeping Bag & Pads', weight: 6, category: 'clothing', l: 60, w: 40, h: 30, priority: 'low', fragile: false },
      { id: 'p6', name: 'Recovery Tracks & Shovel', weight: 14, category: 'safety', l: 110, w: 30, h: 10, priority: 'low', fragile: false },
      { id: 'p7', name: 'Tent & Canopy', weight: 12, category: 'gear', l: 70, w: 25, h: 25, priority: 'medium', fragile: false }
    ];
    syncContainerForm();
    saveState();
    updateCalculations();
  });

  // Reset all
  btnReset.addEventListener('click', () => {
    if (confirm('Clear all packed items and reset container?')) {
      state.items = [];
      saveState();
      updateCalculations();
    }
  });

  // Delete item helper
  window.deleteItem = function(id) {
    state.items = state.items.filter(item => item.id !== id);
    saveState();
    updateCalculations();
  };

  // Main calculation & rendering orchestrator
  function updateCalculations() {
    const totalWeight = state.items.reduce((acc, item) => acc + item.weight, 0);
    const totalVolumeCm3 = state.items.reduce((acc, item) => acc + (item.l * item.w * item.h), 0);
    const totalVolumeLiters = totalVolumeCm3 / 1000;

    const containerVolumeCm3 = state.container.length * state.container.width * state.container.height;
    const containerVolumeLiters = containerVolumeCm3 / 1000;

    const weightPct = Math.round((totalWeight / state.container.maxPayload) * 100);
    const volumePct = Math.round((totalVolumeLiters / containerVolumeLiters) * 100);

    // Update UI Metrics
    statWeightEl.textContent = totalWeight.toFixed(1) + ' kg';
    statWeightPctEl.textContent = weightPct + '%';
    progressWeightEl.style.width = Math.min(100, weightPct) + '%';
    progressWeightEl.style.backgroundColor = weightPct > 100 ? 'var(--danger)' : weightPct > 85 ? 'var(--warning)' : 'var(--primary)';

    statVolumeEl.textContent = Math.round(totalVolumeLiters) + ' L';
    statVolumePctEl.textContent = volumePct + '%';
    progressVolumeEl.style.width = Math.min(100, volumePct) + '%';

    // Center of gravity simulation logic
    // Assume front-to-back axis (0 to length). Heavy items should ideally sit around 40-50% for optimal weight distribution.
    let weightedLongitudinalSum = 0;
    state.items.forEach((item, index) => {
      // Simulated position based on priority & order
      let approxPos = (index + 0.5) * (state.container.length / Math.max(1, state.items.length));
      weightedLongitudinalSum += item.weight * approxPos;
    });

    const centerOfGravityX = totalWeight > 0 ? weightedLongitudinalSum / totalWeight : state.container.length / 2;
    const cgDeviation = Math.abs(centerOfGravityX - (state.container.length * 0.45));

    if (totalWeight === 0) {
      statCgStatusEl.textContent = 'Empty';
      statCgStatusEl.className = 'metric-num badge-ok';
      statCgDescEl.textContent = 'Add items to calculate balance';
    } else if (weightPct > 100) {
      statCgStatusEl.textContent = 'Overweight!';
      statCgStatusEl.className = 'metric-num badge-warn';
      statCgDescEl.textContent = 'Payload exceeds maximum container limit';
    } else if (cgDeviation < state.container.length * 0.1) {
      statCgStatusEl.textContent = 'Optimally Balanced';
      statCgStatusEl.className = 'metric-num badge-ok';
      statCgDescEl.textContent = 'Ideal weight distribution along axle';
    } else {
      statCgStatusEl.textContent = 'Slightly Forward/Aft';
      statCgStatusEl.className = 'metric-num badge-warn';
      statCgDescEl.textContent = 'Adjust heavy items toward center';
    }

    // Render Table
    renderTable();

    // Draw Canvas Map
    drawCanvas();
  }

  function renderTable() {
    itemCountEl.textContent = state.items.length;
    if (state.items.length === 0) {
      inventoryTbody.innerHTML = `<tr class="empty-row"><td colspan="6">No items added yet. Fill out the form or load sample trip.</td></tr>`;
      return;
    }

    inventoryTbody.innerHTML = state.items.map(item => `
      <tr>
        <td><strong>${escapeHtml(item.name)}</strong> ${item.fragile ? '<span title="Fragile">⚠️</span>' : ''}</td>
        <td><span class="dot ${item.category}"></span> ${capitalize(item.category)}</td>
        <td>${item.l} × ${item.w} × ${item.h} cm</td>
        <td>${item.weight} kg</td>
        <td>${capitalize(item.priority)}</td>
        <td>
          <button class="btn-icon" onclick="deleteItem('${item.id}')" title="Remove item">🗑️</button>
        </td>
      </tr>
    `).join('');
  }

  function drawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cLen = state.container.length;
    const cWid = state.container.width;
    const cHgt = state.container.height;

    const padding = 40;
    const drawWidth = canvas.width - (padding * 2);
    const drawHeight = canvas.height - (padding * 2);

    if (state.viewMode === 'top') {
      // Top-Down Plan view (Length horizontal, Width vertical)
      const scaleX = drawWidth / cLen;
      const scaleY = drawHeight / cWid;
      const scale = Math.min(scaleX, scaleY);

      const boxW = cLen * scale;
      const boxH = cWid * scale;
      const originX = (canvas.width - boxW) / 2;
      const originY = (canvas.height - boxH) / 2;

      // Draw container outline
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.strokeRect(originX, originY, boxW, boxH);

      // Draw cab / front indicator
      ctx.fillStyle = '#334155';
      ctx.fillRect(originX - 12, originY + boxH / 2 - 20, 12, 40);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      ctx.fillText('FRONT / CAB', originX - 75, originY + boxH / 2 + 4);

      // Layout items neatly in a packed grid simulation
      let cursorX = originX + 10;
      let cursorY = originY + 10;
      let rowMaxH = 0;

      state.items.forEach((item, idx) => {
        const itemW = item.l * scale;
        const itemH = item.w * scale;

        if (cursorX + itemW > originX + boxW - 10) {
          cursorX = originX + 10;
          cursorY += rowMaxH + 10;
          rowMaxH = 0;
        }

        if (itemH > rowMaxH) rowMaxH = itemH;

        // Color by category
        ctx.fillStyle = getCategoryColor(item.category);
        ctx.fillRect(cursorX, cursorY, Math.max(itemW, 15), Math.max(itemH, 15));

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(cursorX, cursorY, Math.max(itemW, 15), Math.max(itemH, 15));

        // Text label inside block if fits
        if (itemW > 35 && itemH > 25) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px sans-serif';
          ctx.fillText(truncate(item.name, 10), cursorX + 4, cursorY + 16);
        }

        cursorX += itemW + 10;
      });

    } else {
      // Side Profile view (Length horizontal, Height vertical)
      const scaleX = drawWidth / cLen;
      const scaleY = drawHeight / cHgt;
      const scale = Math.min(scaleX, scaleY);

      const boxW = cLen * scale;
      const boxH = cHgt * scale;
      const originX = (canvas.width - boxW) / 2;
      const originY = (canvas.height - boxH) / 2;

      // Draw container outline
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.strokeRect(originX, originY, boxW, boxH);

      // Draw ground line
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(originX - 20, originY + boxH);
      ctx.lineTo(originX + boxW + 20, originY + boxH);
      ctx.stroke();

      // Stack items bottom-up in profile
      let stackX = originX + 15;
      let bottomY = originY + boxH - 10;

      state.items.forEach((item, idx) => {
        const itemW = item.l * scale;
        const itemH = item.h * scale;

        if (stackX + itemW > originX + boxW - 15) {
          stackX = originX + 15;
        }

        const drawY = bottomY - itemH;

        ctx.fillStyle = getCategoryColor(item.category);
        ctx.fillRect(stackX, drawY, Math.max(itemW, 20), Math.max(itemH, 15));

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(stackX, drawY, Math.max(itemW, 20), Math.max(itemH, 15));

        if (itemW > 40 && itemH > 20) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px sans-serif';
          ctx.fillText(truncate(item.name, 8), stackX + 4, drawY + 14);
        }

        stackX += itemW + 10;
      });
    }
  }

  function getCategoryColor(cat) {
    switch(cat) {
      case 'heavy': return '#ef4444';
      case 'gear': return '#3b82f6';
      case 'kitchen': return '#10b981';
      case 'clothing': return '#8b5cf6';
      case 'safety': return '#f59e0b';
      default: return '#64748b';
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function truncate(str, max) {
    return str.length > max ? str.slice(0, max - 1) + '…' : str;
  }

  // Initial load check if empty, load sample preset
  if (state.items.length === 0) {
    btnLoadPreset.click();
  } else {
    syncContainerForm();
    updateCalculations();
  }
});
