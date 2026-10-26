/**
 * AuraSplit: Biophilic Bill Splitter & Settlement Lab
 * Vanilla JavaScript application state & calculation engine.
 */

(function() {
  'use strict';

  // Application State
  let state = {
    participants: [],
    expenses: [],
    taxPercent: 0,
    tipPercent: 15
  };

  // DOM Elements
  const participantInput = document.getElementById('participant-input');
  const btnAddParticipant = document.getElementById('btn-add-participant');
  const participantList = document.getElementById('participant-list');
  const participantCount = document.getElementById('participant-count');
  const expensePayerSelect = document.getElementById('expense-payer');
  
  const expenseForm = document.getElementById('expense-form');
  const expenseTitleInput = document.getElementById('expense-title');
  const expenseAmountInput = document.getElementById('expense-amount');
  const customSplitContainer = document.getElementById('custom-split-container');
  const customSharesList = document.getElementById('custom-shares-list');
  const splitTypeRadios = document.getElementsByName('split-type');
  
  const expenseTbody = document.getElementById('expense-tbody');
  const expenseCount = document.getElementById('expense-count');
  
  const taxRange = document.getElementById('tax-range');
  const taxValue = document.getElementById('tax-value');
  const tipRange = document.getElementById('tip-range');
  const tipValue = document.getElementById('tip-value');
  
  const totalGrandAmount = document.getElementById('total-grand-amount');
  const statSubtotal = document.getElementById('stat-subtotal');
  const statTax = document.getElementById('stat-tax');
  const statTip = document.getElementById('stat-tip');
  const statTotal = document.getElementById('stat-total');
  
  const balanceTbody = document.getElementById('balance-tbody');
  const settlementList = document.getElementById('settlement-list');
  const transferCount = document.getElementById('transfer-count');
  
  const btnExport = document.getElementById('btn-export');
  const importFile = document.getElementById('import-file');
  const btnReset = document.getElementById('btn-reset');
  
  const svgLinks = document.getElementById('svg-links');
  const svgNodes = document.getElementById('svg-nodes');

  // Init & LocalStorage load
  function init() {
    loadFromStorage();
    setupEventListeners();
    renderAll();
  }

  function saveToStorage() {
    try {
      localStorage.setItem('aurasplit_state', JSON.stringify(state));
    } catch (e) {
      console.error('Could not save to localStorage', e);
    }
  }

  function loadFromStorage() {
    try {
      const saved = localStorage.getItem('aurasplit_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.participants)) {
          state = parsed;
          taxRange.value = state.taxPercent;
          taxValue.textContent = state.taxPercent + '%';
          tipRange.value = state.tipPercent;
          tipValue.textContent = state.tipPercent + '%';
        }
      }
    } catch (e) {
      console.error('Could not load from localStorage', e);
    }
  }

  // Event Listeners setup
  function setupEventListeners() {
    btnAddParticipant.addEventListener('click', handleAddParticipant);
    participantInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddParticipant();
      }
    });

    expenseForm.addEventListener('submit', handleAddExpense);

    splitTypeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
          customSplitContainer.classList.remove('hidden');
          renderCustomSharesInputs();
        } else {
          customSplitContainer.classList.add('hidden');
        }
      });
    });

    taxRange.addEventListener('input', (e) => {
      state.taxPercent = parseFloat(e.target.value) || 0;
      taxValue.textContent = state.taxPercent + '%';
      saveToStorage();
      renderAll();
    });

    tipRange.addEventListener('input', (e) => {
      state.tipPercent = parseFloat(e.target.value) || 0;
      tipValue.textContent = state.tipPercent + '%';
      saveToStorage();
      renderAll();
    });

    btnExport.addEventListener('click', handleExport);
    importFile.addEventListener('change', handleImport);
    btnReset.addEventListener('click', handleReset);
  }

  // Participant Actions
  function handleAddParticipant() {
    const name = participantInput.value.trim();
    if (!name) return;
    if (state.participants.includes(name)) {
      alert('Participant already exists.');
      return;
    }
    state.participants.push(name);
    participantInput.value = '';
    saveToStorage();
    renderAll();
  }

  window.removeParticipant = function(name) {
    state.participants = state.participants.filter(p => p !== name);
    // Clean up expenses involving this participant or re-assign
    state.expenses = state.expenses.filter(exp => exp.payer !== name);
    saveToStorage();
    renderAll();
  };

  // Expense Actions
  function handleAddExpense(e) {
    e.preventDefault();
    if (state.participants.length === 0) {
      alert('Please add at least one participant first.');
      return;
    }

    const title = expenseTitleInput.value.trim();
    const amount = parseFloat(expenseAmountInput.value);
    const payer = expensePayerSelect.value;
    const splitTypeInput = document.querySelector('input[name="split-type"]:checked').value;

    if (!title || isNaN(amount) || amount <= 0 || !payer) {
      alert('Please fill out all required expense fields correctly.');
      return;
    }

    let splitDetails = {};
    if (splitTypeInput === 'custom') {
      let totalWeight = 0;
      state.participants.forEach(p => {
        const input = document.getElementById(`share-${p}`);
        const val = parseFloat(input ? input.value : 0) || 0;
        splitDetails[p] = val;
        totalWeight += val;
      });

      if (totalWeight <= 0) {
        alert('Custom shares or weights must total greater than zero.');
        return;
      }
    } else {
      // Equal split default
      state.participants.forEach(p => {
        splitDetails[p] = 1;
      });
    }

    const newExpense = {
      id: Date.now().toString(),
      title,
      amount,
      payer,
      splitType: splitTypeInput,
      splitDetails
    };

    state.expenses.push(newExpense);
    expenseForm.reset();
    document.querySelector('input[name="split-type"][value="equal"]').checked = true;
    customSplitContainer.classList.add('hidden');
    saveToStorage();
    renderAll();
  }

  window.deleteExpense = function(id) {
    state.expenses = state.expenses.filter(exp => exp.id !== id);
    saveToStorage();
    renderAll();
  };

  function renderCustomSharesInputs() {
    customSharesList.innerHTML = '';
    state.participants.forEach(p => {
      const row = document.createElement('div');
      row.className = 'share-row';
      row.innerHTML = `
        <label>${escapeHtml(p)}</label>
        <input type="number" id="share-${escapeHtml(p)}" min="0" step="1" value="1">
      `;
      customSharesList.appendChild(row);
    });
  }

  // Export / Import / Reset
  function handleExport() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `aurasplit_session_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  function handleImport(e) {
    const fileReader = new FileReader();
    if (e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = function(event) {
        try {
          const imported = JSON.parse(event.target.result);
          if (imported && Array.isArray(imported.participants) && Array.isArray(imported.expenses)) {
            state = imported;
            taxRange.value = state.taxPercent || 0;
            taxValue.textContent = (state.taxPercent || 0) + '%';
            tipRange.value = state.tipPercent || 0;
            tipValue.textContent = (state.tipPercent || 0) + '%';
            saveToStorage();
            renderAll();
            alert('Data imported successfully!');
          } else {
            alert('Invalid file format.');
          }
        } catch (err) {
          alert('Error parsing JSON file.');
        }
      };
    }
  }

  function handleReset() {
    if (confirm('Are you sure you want to reset all data?')) {
      state = { participants: [], expenses: [], taxPercent: 0, tipPercent: 15 };
      taxRange.value = 0;
      taxValue.textContent = '0%';
      tipRange.value = 15;
      tipValue.textContent = '15%';
      saveToStorage();
      renderAll();
    }
  }

  // Master Render Function
  function renderAll() {
    renderParticipants();
    renderPayerSelect();
    renderExpensesTable();
    
    const calc = computeFinancials();
    renderSummary(calc);
    renderBalances(calc);
    renderSettlements(calc.netBalances);
    renderDebtGraph(calc.netBalances);
  }

  function renderParticipants() {
    participantCount.textContent = `${state.participants.length} added`;
    if (state.participants.length === 0) {
      participantList.innerHTML = '<span class="placeholder-text" style="padding:0;">No participants added.</span>';
      return;
    }

    participantList.innerHTML = state.participants.map(p => `
      <div class="chip">
        <span>${escapeHtml(p)}</span>
        <button class="remove-chip" onclick="removeParticipant('${escapeHtml(p)}')" title="Remove">&times;</button>
      </div>
    `).join('');
  }

  function renderPayerSelect() {
    const currentVal = expensePayerSelect.value;
    expensePayerSelect.innerHTML = '<option value="">Select person...</option>' +
      state.participants.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
    if (state.participants.includes(currentVal)) {
      expensePayerSelect.value = currentVal;
    }
  }

  function renderExpensesTable() {
    expenseCount.textContent = `${state.expenses.length} items`;
    if (state.expenses.length === 0) {
      expenseTbody.innerHTML = `
        <tr class="empty-row">
          <td colspan="5">No expenses logged yet. Add participants and bills above.</td>
        </tr>
      `;
      return;
    }

    expenseTbody.innerHTML = state.expenses.map(exp => `
      <tr>
        <td><strong>${escapeHtml(exp.title)}</strong></td>
        <td>${escapeHtml(exp.payer)}</td>
        <td>$${exp.amount.toFixed(2)}</td>
        <td><span class="badge">${exp.splitType}</span></td>
        <td><button class="btn danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" onclick="deleteExpense('${exp.id}')">Delete</button></td>
      </tr>
    `).join('');
  }

  // Financial Calculation Engine
  function computeFinancials() {
    let subtotal = 0;
    state.expenses.forEach(exp => subtotal += exp.amount);

    const taxAmount = subtotal * (state.taxPercent / 100);
    const subtotalWithTax = subtotal + taxAmount;
    const tipAmount = subtotalWithTax * (state.tipPercent / 100);
    const grandTotal = subtotalWithTax + tipAmount;

    // Multiplier for tax & tip proportional scaling
    const scalingFactor = subtotal > 0 ? grandTotal / subtotal : 1;

    // Track total paid per person & total owed share per person
    let totalPaid = {};
    let totalOwed = {};
    state.participants.forEach(p => {
      totalPaid[p] = 0;
      totalOwed[p] = 0;
    });

    state.expenses.forEach(exp => {
      if (totalPaid[exp.payer] !== undefined) {
        totalPaid[exp.payer] += exp.amount;
      }

      // Calculate split weights
      let totalWeight = 0;
      const details = exp.splitDetails || {};
      Object.keys(details).forEach(p => {
        totalWeight += (details[p] || 0);
      });

      if (totalWeight > 0) {
        Object.keys(details).forEach(p => {
          if (totalOwed[p] !== undefined) {
            const shareFraction = (details[p] / totalWeight);
            const personExpenseShare = exp.amount * shareFraction;
            // Apply tax & tip scaling factor
            totalOwed[p] += (personExpenseShare * scalingFactor);
          }
        });
      }
    });

    let netBalances = {};
    state.participants.forEach(p => {
      netBalances[p] = (totalPaid[p] || 0) - (totalOwed[p] || 0);
    });

    return {
      subtotal,
      taxAmount,
      tipAmount,
      grandTotal,
      totalPaid,
      totalOwed,
      netBalances
    };
  }

  function renderSummary(calc) {
    totalGrandAmount.textContent = `$${calc.grandTotal.toFixed(2)}`;
    statSubtotal.textContent = `$${calc.subtotal.toFixed(2)}`;
    statTax.textContent = `$${calc.taxAmount.toFixed(2)}`;
    statTip.textContent = `$${calc.tipAmount.toFixed(2)}`;
    statTotal.textContent = `$${calc.grandTotal.toFixed(2)}`;
  }

  function renderBalances(calc) {
    if (state.participants.length === 0) {
      balanceTbody.innerHTML = `
        <tr class="empty-row">
          <td colspan="4">Add participants to view balances.</td>
        </tr>
      `;
      return;
    }

    balanceTbody.innerHTML = state.participants.map(p => {
      const paid = calc.totalPaid[p] || 0;
      const owed = calc.totalOwed[p] || 0;
      const net = calc.netBalances[p] || 0;
      
      let netClass = '';
      let netFormatted = '';
      if (Math.abs(net) < 0.01) {
        netFormatted = '$0.00 (Settled)';
        netClass = 'color: var(--text-muted);';
      } else if (net > 0) {
        netFormatted = `+${net.toFixed(2)} (Gets back)`;
        netClass = 'color: var(--color-success); font-weight: 650;';
      } else {
        netFormatted = `-$${Math.abs(net).toFixed(2)} (Owes)`;
        netClass = 'color: var(--color-danger); font-weight: 650;';
      }

      return `
        <tr>
          <td><strong>${escapeHtml(p)}</strong></td>
          <td>$${paid.toFixed(2)}</td>
          <td>$${owed.toFixed(2)}</td>
          <td style="${netClass}">${netFormatted}</td>
        </tr>
      `;
    }).join('');
  }

  // Debt Minimisation Settlement Algorithm
  function renderSettlements(netBalances) {
    // Separate debtors and creditors
    let debtors = [];
    let creditors = [];

    Object.keys(netBalances).forEach(p => {
      const balance = netBalances[p];
      if (balance < -0.01) {
        debtors.push({ name: p, amount: -balance });
      } else if (balance > 0.01) {
        creditors.push({ name: p, amount: balance });
      }
    });

    // Sort descending for greedy matching
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    let transactions = [];
    let i = 0;
    let j = 0;

    while (i < debtors.length && j < creditors.length) {
      let debtor = debtors[i];
      let creditor = creditors[j];

      let settleAmount = Math.min(debtor.amount, creditor.amount);
      if (settleAmount > 0.01) {
        transactions.push({
          from: debtor.name,
          to: creditor.name,
          amount: settleAmount
        });
      }

      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;

      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    transferCount.textContent = `${transactions.length} transfers`;

    if (transactions.length === 0) {
      settlementList.innerHTML = '<p class="placeholder-text">All balanced or insufficient data for settlement.</p>';
      return;
    }

    settlementList.innerHTML = transactions.map(tx => `
      <div class="settlement-item">
        <span><strong>${escapeHtml(tx.from)}</strong> pays <strong>${escapeHtml(tx.to)}</strong></span>
        <span class="highlight-amount" style="font-size: 1.1rem;">$${tx.amount.toFixed(2)}</span>
      </div>
    `).join('');

    return transactions;
  }

  // SVG Network Graph Renderer
  function renderDebtGraph(netBalances) {
    svgLinks.innerHTML = '';
    svgNodes.innerHTML = '';

    const participants = state.participants;
    if (participants.length === 0) return;

    // Compute transactions for arrows
    let debtors = participants.map(p => ({ name: p, amount: -netBalances[p] })).filter(d => d.amount > 0.01);
    let creditors = participants.map(p => ({ name: p, amount: netBalances[p] })).filter(c => c.amount > 0.01);
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    let transactions = [];
    let i = 0, j = 0;
    let dCopy = debtors.map(d => ({ ...d }));
    let cCopy = creditors.map(c => ({ ...c }));
    while (i < dCopy.length && j < cCopy.length) {
      let amount = Math.min(dCopy[i].amount, cCopy[j].amount);
      if (amount > 0.01) {
        transactions.push({ from: dCopy[i].name, to: cCopy[j].name, amount });
      }
      dCopy[i].amount -= amount;
      cCopy[j].amount -= amount;
      if (dCopy[i].amount < 0.01) i++;
      if (cCopy[j].amount < 0.01) j++;
    }

    // Position nodes in a circle on SVG (Width: 400, Height: 250, Center: 200, 125)
    const cx = 200;
    const cy = 125;
    const radius = 80;
    const n = participants.length;

    let nodeCoords = {};
    participants.forEach((p, idx) => {
      const angle = (idx / n) * 2 * Math.PI;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      nodeCoords[p] = { x, y };
    });

    // Draw links (arrows)
    transactions.forEach(tx => {
      const fromCoord = nodeCoords[tx.from];
      const toCoord = nodeCoords[tx.to];
      if (fromCoord && toCoord) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', fromCoord.x);
        line.setAttribute('y1', fromCoord.y);
        line.setAttribute('x2', toCoord.x);
        line.setAttribute('y2', toCoord.y);
        line.setAttribute('stroke', 'var(--color-primary)');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('marker-end', 'url(#arrow)');
        svgLinks.appendChild(line);
      }
    });

    // Draw nodes (circles + text)
    participants.forEach(p => {
      const coord = nodeCoords[p];
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', coord.x);
      circle.setAttribute('cy', coord.y);
      circle.setAttribute('r', '18');
      circle.setAttribute('fill', 'var(--card-bg)');
      circle.setAttribute('stroke', 'var(--color-primary)');
      circle.setAttribute('stroke-width', '2');
      
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', coord.x);
      text.setAttribute('y', coord.y + 4);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', 'var(--text-main)');
      text.setAttribute('font-size', '10px');
      text.setAttribute('font-weight', '600');
      text.textContent = p.length > 5 ? p.substring(0, 4) + '.' : p;

      g.appendChild(circle);
      g.appendChild(text);
      svgNodes.appendChild(g);
    });
  }

  // Utility Escape Function
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Run on load
  init();

})();
