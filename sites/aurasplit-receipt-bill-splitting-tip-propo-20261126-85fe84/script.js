/**
 * AuraSplit Laboratory - Core Application Logic
 */

(function() {
  'use strict';

  // State Management
  let state = {
    participants: [],
    items: [],
    tax: 0,
    tipPercent: 18,
    tipCalcMode: 'subtotal',
    discount: 0
  };

  // DOM Elements
  const elParticipantCount = document.getElementById('participant-count');
  const elItemCount = document.getElementById('item-count');
  const formParticipant = document.getElementById('form-participant');
  const inputParticipantName = document.getElementById('input-participant-name');
  const participantsList = document.getElementById('participants-list');
  
  const formItem = document.getElementById('form-item');
  const inputItemName = document.getElementById('input-item-name');
  const inputItemPrice = document.getElementById('input-item-price');
  const itemAssigneesCheckboxes = document.getElementById('item-assignees-checkboxes');
  const receiptTbody = document.getElementById('receipt-tbody');
  
  const inputTax = document.getElementById('input-tax');
  const inputTipPercent = document.getElementById('input-tip-percent');
  const inputDiscount = document.getElementById('input-discount');
  const selectTipCalc = document.getElementById('select-tip-calc');
  const tipPresetButtons = document.querySelectorAll('.btn-tip-preset');
  
  const valSubtotal = document.getElementById('val-subtotal');
  const valTax = document.getElementById('val-tax');
  const valTip = document.getElementById('val-tip');
  const valDiscount = document.getElementById('val-discount');
  const valGrandTotal = document.getElementById('val-grand-total');
  
  const settlementStatus = document.getElementById('settlement-status');
  const individualBreakdownList = document.getElementById('individual-breakdown-list');
  
  const btnReset = document.getElementById('btn-reset');
  const btnSample = document.getElementById('btn-sample');
  const btnCopy = document.getElementById('btn-copy');
  const shareCanvas = document.getElementById('share-canvas');

  // Initialize LocalStorage Persistence
  function saveState() {
    try {
      localStorage.setItem('aurasplit_state', JSON.stringify(state));
    } catch (e) {
      console.error('Could not save to localStorage', e);
    }
  }

  function loadState() {
    try {
      const saved = localStorage.getItem('aurasplit_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.participants) && Array.isArray(parsed.items)) {
          state = parsed;
        }
      }
    } catch (e) {
      console.error('Could not load from localStorage', e);
    }
  }

  // Event Listeners Setup
  function initEvents() {
    formParticipant.addEventListener('submit', handleAddParticipant);
    formItem.addEventListener('submit', handleAddItem);
    
    inputTax.addEventListener('input', (e) => {
      state.tax = parseFloat(e.target.value) || 0;
      saveState();
      calculateAndRender();
    });

    inputTipPercent.addEventListener('input', (e) => {
      state.tipPercent = parseFloat(e.target.value) || 0;
      updateTipPresetButtonsActive();
      saveState();
      calculateAndRender();
    });

    inputDiscount.addEventListener('input', (e) => {
      state.discount = parseFloat(e.target.value) || 0;
      saveState();
      calculateAndRender();
    });

    selectTipCalc.addEventListener('change', (e) => {
      state.tipCalcMode = e.target.value;
      saveState();
      calculateAndRender();
    });

    tipPresetButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tip = parseFloat(e.target.getAttribute('data-tip'));
        state.tipPercent = tip;
        inputTipPercent.value = tip;
        updateTipPresetButtonsActive();
        saveState();
        calculateAndRender();
      });
    });

    btnReset.addEventListener('click', handleReset);
    btnSample.addEventListener('click', loadSampleData);
    btnCopy.addEventListener('click', copySummaryToClipboard);
  }

  function updateTipPresetButtonsActive() {
    tipPresetButtons.forEach(btn => {
      const tip = parseFloat(btn.getAttribute('data-tip'));
      if (tip === state.tipPercent) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Handlers
  function handleAddParticipant(e) {
    e.preventDefault();
    const name = inputParticipantName.value.trim();
    if (!name) return;
    
    if (state.participants.includes(name)) {
      alert('Participant already exists.');
      return;
    }

    state.participants.push(name);
    inputParticipantName.value = '';
    saveState();
    renderAll();
  }

  function removeParticipant(name) {
    state.participants = state.participants.filter(p => p !== name);
    // Clean up item assignees
    state.items.forEach(item => {
      item.assignees = item.assignees.filter(p => p !== name);
    });
    saveState();
    renderAll();
  }

  function handleAddItem(e) {
    e.preventDefault();
    if (state.participants.length === 0) {
      alert('Please add at least one participant before adding receipt items.');
      return;
    }

    const name = inputItemName.value.trim();
    const price = parseFloat(inputItemPrice.value);
    
    if (!name || isNaN(price) || price <= 0) return;

    // Gather checked assignees
    const checkboxes = itemAssigneesCheckboxes.querySelectorAll('input[type="checkbox"]');
    const assignees = [];
    checkboxes.forEach(cb => {
      if (cb.checked) {
        assignees.push(cb.value);
      }
    });

    state.items.push({
      id: 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name,
      price,
      assignees // If empty, will be split among all participants
    });

    inputItemName.value = '';
    inputItemPrice.value = '';
    checkboxes.forEach(cb => cb.checked = true);

    saveState();
    renderAll();
  }

  function removeItem(id) {
    state.items = state.items.filter(item => item.id !== id);
    saveState();
    renderAll();
  }

  function handleReset() {
    if (confirm('Are you sure you want to reset the current session?')) {
      state = {
        participants: [],
        items: [],
        tax: 0,
        tipPercent: 18,
        tipCalcMode: 'subtotal',
        discount: 0
      };
      localStorage.removeItem('aurasplit_state');
      inputTax.value = '0.00';
      inputTipPercent.value = '18.0';
      inputDiscount.value = '0.00';
      selectTipCalc.value = 'subtotal';
      updateTipPresetButtonsActive();
      renderAll();
    }
  }

  function loadSampleData() {
    state = {
      participants: ['Alex', 'Jordan', 'Taylor', 'Morgan'],
      items: [
        { id: 's1', name: 'Artisanal Cheese Board', price: 24.00, assignees: [] },
        { id: 's2', name: 'Wood-Fired Truffle Pizza', price: 28.50, assignees: ['Alex', 'Jordan'] },
        { id: 's3', name: 'Spicy Rigvodoni Pasta', price: 22.00, assignees: ['Taylor', 'Morgan'] },
        { id: 's4', name: 'House Red Wine (Bottle)', price: 45.00, assignees: [] },
        { id: 's5', name: 'Tiramisu Dessert', price: 12.00, assignees: ['Alex', 'Taylor'] }
      ],
      tax: 11.25,
      tipPercent: 20,
      tipCalcMode: 'subtotal',
      discount: 5.00
    };
    
    inputTax.value = state.tax.toFixed(2);
    inputTipPercent.value = state.tipPercent.toFixed(1);
    inputDiscount.value = state.discount.toFixed(2);
    selectTipCalc.value = state.tipCalcMode;
    updateTipPresetButtonsActive();

    saveState();
    renderAll();
  }

  // Calculation Engine
  function computeShares() {
    const participants = state.participants;
    const items = state.items;
    
    const result = {
      subtotal: 0,
      tax: state.tax,
      tip: 0,
      discount: state.discount,
      grandTotal: 0,
      participantSubtotals: {},
      participantTaxes: {},
      participantTips: {},
      participantDiscounts: {},
      participantTotals: {}
    };

    participants.forEach(p => {
      result.participantSubtotals[p] = 0;
      result.participantTaxes[p] = 0;
      result.participantTips[p] = 0;
      result.participantDiscounts[p] = 0;
      result.participantTotals[p] = 0;
    });

    if (participants.length === 0) return result;

    // 1. Calculate Subtotals per item
    items.forEach(item => {
      result.subtotal += item.price;
      const splitGroup = (item.assignees && item.assignees.length > 0) ? item.assignees : participants;
      const sharePrice = item.price / splitGroup.length;
      
      splitGroup.forEach(p => {
        if (result.participantSubtotals[p] !== undefined) {
          result.participantSubtotals[p] += sharePrice;
        }
      });
    });

    // 2. Effective Subtotal after discount
    const netSubtotal = Math.max(0, result.subtotal - result.discount);
    
    // 3. Tip calculation base
    let tipBase = state.tipCalcMode === 'total' 
      ? Math.max(0, result.subtotal + result.tax - result.discount) 
      : netSubtotal;
    
    result.tip = tipBase * (state.tipPercent / 100);
    result.grandTotal = Math.max(0, result.subtotal + result.tax + result.tip - result.discount);

    // Proportional distribution of tax, tip, and discount
    participants.forEach(p => {
      const pSub = result.participantSubtotals[p];
      const subRatio = result.subtotal > 0 ? (pSub / result.subtotal) : (1 / participants.length);
      
      // Proportional discount
      result.participantDiscounts[p] = result.discount * subRatio;
      
      // Proportional tax
      result.participantTaxes[p] = result.tax * subRatio;

      // Proportional tip
      const pTipBase = state.tipCalcMode === 'total'
        ? (pSub + result.participantTaxes[p] - result.participantDiscounts[p])
        : Math.max(0, pSub - result.participantDiscounts[p]);
      
      result.participantTips[p] = pTipBase * (state.tipPercent / 100);

      // Total per person
      result.participantTotals[p] = Math.max(0, pSub + result.participantTaxes[p] + result.participantTips[p] - result.participantDiscounts[p]);
    });

    return result;
  }

  // Rendering Engine
  function renderAll() {
    renderParticipants();
    renderItemFormCheckboxes();
    renderReceiptTable();
    calculateAndRender();
  }

  function renderParticipants() {
    elParticipantCount.textContent = `${state.participants.length} added`;
    if (state.participants.length === 0) {
      participantsList.innerHTML = '<span class="text-muted">No participants added yet.</span>';
      return;
    }

    participantsList.innerHTML = state.participants.map(p => `
      <div class="participant-tag">
        <span>${escapeHtml(p)}</span>
        <button type="button" title="Remove ${escapeHtml(p)}" onclick="window.auraRemoveParticipant('${escapeHtml(p)}')">&times;</button>
      </div>
    `).join('');
  }

  function renderItemFormCheckboxes() {
    if (state.participants.length === 0) {
      itemAssigneesCheckboxes.innerHTML = '<span class="text-muted" style="font-size: 0.85rem;">Add participants first</span>';
      return;
    }

    itemAssigneesCheckboxes.innerHTML = state.participants.map(p => `
      <label class="checkbox-pill">
        <input type="checkbox" value="${escapeHtml(p)}" checked>
        <span>${escapeHtml(p)}</span>
      </label>
    `).join('');
  }

  function renderReceiptTable() {
    elItemCount.textContent = `${state.items.length} items`;
    if (state.items.length === 0) {
      receiptTbody.innerHTML = '<tr class="empty-row"><td colspan="4">No items added yet. Add items above or load sample data.</td></tr>';
      return;
    }

    receiptTbody.innerHTML = state.items.map(item => {
      const assigneesText = (!item.assignees || item.assignees.length === 0) 
        ? 'All Participants'
        : item.assignees.join(', ');
      
      return `
        <tr>
          <td><strong>${escapeHtml(item.name)}</strong></td>
          <td>$${item.price.toFixed(2)}</td>
          <td><span class="text-muted" style="font-size: 0.85rem;">${escapeHtml(assigneesText)}</span></td>
          <td class="text-right">
            <button type="button" class="btn btn-danger" onclick="window.auraRemoveItem('${item.id}')">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function calculateAndRender() {
    const res = computeShares();

    // Update Summary Metrics
    valSubtotal.textContent = `$${res.subtotal.toFixed(2)}`;
    valTax.textContent = `$${res.tax.toFixed(2)}`;
    valTip.textContent = `$${res.tip.toFixed(2)} (${state.tipPercent}%)`;
    valDiscount.textContent = `-$${res.discount.toFixed(2)}`;
    valGrandTotal.textContent = `$${res.grandTotal.toFixed(2)}`;

    // Render Individual Breakdown
    if (state.participants.length === 0) {
      individualBreakdownList.innerHTML = '<div class="empty-state"><p>Add participants and items to view individual shares.</p></div>';
      settlementStatus.textContent = 'Awaiting Data';
      settlementStatus.className = 'badge';
      drawChart({});
      return;
    }

    settlementStatus.textContent = 'Balanced';
    settlementStatus.className = 'badge';

    individualBreakdownList.innerHTML = state.participants.map(p => {
      const total = res.participantTotals[p] || 0;
      const sub = res.participantSubtotals[p] || 0;
      const tax = res.participantTaxes[p] || 0;
      const tip = res.participantTips[p] || 0;
      const disc = res.participantDiscounts[p] || 0;

      return `
        <div class="breakdown-card">
          <div class="breakdown-info">
            <h3>${escapeHtml(p)}</h3>
            <div class="breakdown-details">
              Items: $${sub.toFixed(2)} &bull; Tax: $${tax.toFixed(2)} &bull; Tip: $${tip.toFixed(2)}${disc > 0 ? ` &bull; Disc: -$${disc.toFixed(2)}` : ''}
            </div>
          </div>
          <div class="breakdown-total">
            $${total.toFixed(2)}
          </div>
        </div>
      `;
    }).join('');

    drawChart(res.participantTotals);
  }

  // Canvas Chart Visualization
  function drawChart(totalsMap) {
    const ctx = shareCanvas.getContext('2d');
    const width = shareCanvas.width;
    const height = shareCanvas.height;

    ctx.clearRect(0, 0, width, height);

    const participants = state.participants;
    if (participants.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No share data to visualize', width / 2, height / 2);
      return;
    }

    const totalSum = Object.values(totalsMap).reduce((a, b) => a + b, 0);
    if (totalSum <= 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Total amount is zero', width / 2, height / 2);
      return;
    }

    // Color Palette
    const colors = ['#38bdf8', '#818cf8', '#c084fc', '#f43f5e', '#fbbf24', '#34d399', '#f472b6', '#60a5fa'];

    // Draw Donut Chart on left, legend on right
    const centerX = 110;
    const centerY = height / 2;
    const radius = 75;
    const innerRadius = 45;

    let currentAngle = -Math.PI / 2;

    participants.forEach((p, idx) => {
      const val = totalsMap[p] || 0;
      const sliceAngle = (val / totalSum) * (2 * Math.PI);
      const color = colors[idx % colors.length];

      // Draw slice
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();

      currentAngle += sliceAngle;
    });

    // Inner circle background
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius - 1, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();

    // Inner text
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPLIT', centerX, centerY - 6);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`${participants.length} People`, centerX, centerY + 10);

    // Draw Legend on right
    let legendX = 210;
    let legendY = 30;
    const maxLegendItems = 6;

    participants.forEach((p, idx) => {
      if (idx >= maxLegendItems) return;
      const val = totalsMap[p] || 0;
      const pct = totalSum > 0 ? ((val / totalSum) * 100).toFixed(1) : 0;
      const color = colors[idx % colors.length];

      // Color box
      ctx.fillStyle = color;
      ctx.fillRect(legendX, legendY, 12, 12);

      // Label
      ctx.fillStyle = '#f8fafc';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      const nameText = p.length > 10 ? p.substring(0, 9) + '...' : p;
      ctx.fillText(`${nameText}: $${val.toFixed(2)} (${pct}%)`, legendX + 20, legendY + 10);

      legendY += 26;
    });

    if (participants.length > maxLegendItems) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px italic sans-serif';
      ctx.fillText(`+ ${participants.length - maxLegendItems} more participants`, legendX, legendY + 5);
    }
  }

  // Copy summary to clipboard
  function copySummaryToClipboard() {
    const res = computeShares();
    if (state.participants.length === 0) {
      alert('No participants to summarize.');
      return;
    }

    let text = `=== AURA SPLIT SUMMARY ===\n`;
    text += `Subtotal: $${res.subtotal.toFixed(2)}\n`;
    text += `Tax: $${res.tax.toFixed(2)}\n`;
    text += `Tip (${state.tipPercent}%): $${res.tip.toFixed(2)}\n`;
    if (res.discount > 0) text += `Discount: -$${res.discount.toFixed(2)}\n`;
    text += `Grand Total: $${res.grandTotal.toFixed(2)}\n\n`;
    text += `INDIVIDUAL BREAKDOWN:\n`;

    state.participants.forEach(p => {
      const total = res.participantTotals[p] || 0;
      text += `- ${p}: $${total.toFixed(2)}\n`;
    });

    navigator.clipboard.writeText(text).then(() => {
      btnCopy.textContent = 'Copied!';
      setTimeout(() => {
        btnCopy.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy Summary';
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text', err);
      alert('Could not copy summary to clipboard.');
    });
  }

  // Utility Escape HTML
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(>g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Expose global handlers for dynamic onclicks
  window.auraRemoveParticipant = removeParticipant;
  window.auraRemoveItem = removeItem;

  // Initialize on load
  loadState();
  initEvents();
  renderAll();

})();
