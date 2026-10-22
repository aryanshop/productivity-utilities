/**
 * SparkSplit - Dynamic Group Expense & Receipt Fairness Engine
 * Vanilla JavaScript Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  let state = {
    participants: [],
    expenses: []
  };

  // Load saved state if available
  try {
    const saved = localStorage.getItem('sparksplit_state');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.participants) && Array.isArray(parsed.expenses)) {
        state = parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load local storage', e);
  }

  // DOM Elements - Navigation
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // DOM Elements - Participants
  const addParticipantForm = document.getElementById('add-participant-form');
  const participantNameInput = document.getElementById('participant-name');
  const participantList = document.getElementById('participant-list');
  const participantEmpty = document.getElementById('participant-empty');
  const gotoExpensesBtn = document.getElementById('goto-expenses');

  // DOM Elements - Expenses
  const expenseForm = document.getElementById('expense-form');
  const expenseTitleInput = document.getElementById('expense-title');
  const expenseAmountInput = document.getElementById('expense-amount');
  const expensePayerSelect = document.getElementById('expense-payer');
  const splitMethodRadios = document.querySelectorAll('input[name="split-method"]');
  const splitDetailsContainer = document.getElementById('split-details-container');
  const expenseList = document.getElementById('expense-list');
  const expenseEmpty = document.getElementById('expense-empty');
  const gotoBalancesBtn = document.getElementById('goto-balances');

  // DOM Elements - Balances & Settlements
  const balanceList = document.getElementById('balance-list');
  const balanceEmpty = document.getElementById('balance-empty');
  const settlementList = document.getElementById('settlement-list');
  const settlementEmpty = document.getElementById('settlement-empty');
  const debtNetworkSvg = document.getElementById('debt-network-svg');
  const networkEdges = document.getElementById('network-edges');
  const networkNodes = document.getElementById('network-nodes');
  const networkEmpty = document.getElementById('network-empty');
  const resetDataBtn = document.getElementById('reset-data-btn');
  const exportJsonBtn = document.getElementById('export-json-btn');

  // DOM Elements - Modal
  const receiptModal = document.getElementById('receipt-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalBodyContent = document.getElementById('modal-body-content');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalCloseAction = document.getElementById('modal-close-action');
  const modalDeleteBtn = document.getElementById('modal-delete-btn');
  let activeModalExpenseId = null;

  // Persistence Helper
  function saveState() {
    try {
      localStorage.setItem('sparksplit_state', JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state', e);
    }
  }

  // Tab Switching
  function switchTab(targetTabId) {
    tabBtns.forEach(btn => {
      const isTarget = btn.getAttribute('data-tab') === targetTabId;
      btn.classList.toggle('active', isTarget);
      btn.setAttribute('aria-selected', isTarget);
    });
    tabContents.forEach(content => {
      content.classList.toggle('active', content.id === targetTabId + '-tab');
    });
    if (targetTabId === 'balances') {
      renderBalancesAndSettlements();
    } else if (targetTabId === 'expenses') {
      updatePayerDropdown();
      renderSplitDetails();
    }
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.getAttribute('data-tab'));
    });
  });

  gotoExpensesBtn.addEventListener('click', () => switchTab('expenses'));
  gotoBalancesBtn.addEventListener('click', () => switchTab('balances'));

  // --- 1. PARTICIPANTS MANAGEMENT ---
  addParticipantForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = participantNameInput.value.trim();
    if (!name) return;

    if (state.participants.includes(name)) {
      alert('A participant with this name already exists.');
      return;
    }

    state.participants.push(name);
    participantNameInput.value = '';
    saveState();
    renderParticipants();
    updatePayerDropdown();
    renderSplitDetails();
  });

  function removeParticipant(name) {
    // Check if participant is involved in expenses
    const involved = state.expenses.some(exp => 
      exp.payer === name || 
      Object.keys(exp.splits).includes(name)
    );

    if (involved) {
      if (!confirm(`${name} is involved in recorded expenses. Removing them may affect balance calculations. Proceed?`)) {
        return;
      }
    }

    state.participants = state.participants.filter(p => p !== name);
    saveState();
    renderParticipants();
    updatePayerDropdown();
    renderSplitDetails();
  }

  function renderParticipants() {
    participantList.innerHTML = '';
    if (state.participants.length === 0) {
      participantEmpty.style.display = 'block';
      participantList.style.display = 'none';
      return;
    }

    participantEmpty.style.display = 'none';
    participantList.style.display = 'block';

    state.participants.forEach(name => {
      const li = document.createElement('li');
      li.innerHTML = `
        <span class="item-name">${escapeHtml(name)}</span>
        <button type="button" class="icon-btn" title="Remove Member" aria-label="Remove ${escapeHtml(name)}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      `;
      li.querySelector('button').addEventListener('click', () => removeParticipant(name));
      participantList.appendChild(li);
    });
  }

  // --- 2. EXPENSES & RECEIPTS MANAGEMENT ---
  function updatePayerDropdown() {
    const currentVal = expensePayerSelect.value;
    expensePayerSelect.innerHTML = '<option value="" disabled selected>Select member</option>';
    state.participants.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      if (p === currentVal) opt.selected = true;
      expensePayerSelect.appendChild(opt);
    });
  }

  function getSelectedSplitMethod() {
    let method = 'equal';
    splitMethodRadios.forEach(radio => {
      if (radio.checked) method = radio.value;
    });
    return method;
  }

  splitMethodRadios.forEach(radio => {
    radio.addEventListener('change', renderSplitDetails);
  });

  expenseAmountInput.addEventListener('input', renderSplitDetails);

  function renderSplitDetails() {
    if (state.participants.length === 0) {
      splitDetailsContainer.innerHTML = '<p class="hint-text">Add participants first to configure splits.</p>';
      return;
    }

    const method = getSelectedSplitMethod();
    const totalAmount = parseFloat(expenseAmountInput.value) || 0;

    if (method === 'equal') {
      const share = state.participants.length > 0 ? (totalAmount / state.participants.length).toFixed(2) : '0.00';
      splitDetailsContainer.innerHTML = `
        <p class="hint-text">Split equally: $${share} per person across ${state.participants.length} members.</p>
      `;
    } else if (method === 'exact') {
      let html = `<p class="hint-text" style="margin-bottom: 8px;">Enter exact dollar amounts for each participant (Total must equal $${totalAmount.toFixed(2)}):</p>`;
      state.participants.forEach(p => {
        html += `
          <div class="split-row">
            <span>${escapeHtml(p)}</span>
            <input type="number" class="exact-split-input" data-person="${escapeHtml(p)}" step="0.01" min="0" placeholder="0.00">
          </div>
        `;
      });
      html += `<div id="exact-sum-warning" class="hint-text" style="margin-top: 6px; font-weight: 600;"></div>`;
      splitDetailsContainer.innerHTML = html;

      // Add listeners to validate exact sum
      const exactInputs = splitDetailsContainer.querySelectorAll('.exact-split-input');
      exactInputs.forEach(inp => {
        inp.addEventListener('input', updateExactSumFeedback);
      });
      updateExactSumFeedback();
    } else if (method === 'shares') {
      let html = `<p class="hint-text" style="margin-bottom: 8px;">Assign relative shares (e.g., 1, 2, 1.5):</p>`;
      state.participants.forEach(p => {
        html += `
          <div class="split-row">
            <span>${escapeHtml(p)}</span>
            <input type="number" class="share-split-input" data-person="${escapeHtml(p)}" step="0.1" min="0" value="1">
          </div>
        `;
      });
      splitDetailsContainer.innerHTML = html;
    }
  }

  function updateExactSumFeedback() {
    const totalAmount = parseFloat(expenseAmountInput.value) || 0;
    const exactInputs = splitDetailsContainer.querySelectorAll('.exact-split-input');
    let sum = 0;
    exactInputs.forEach(inp => {
      sum += parseFloat(inp.value) || 0;
    });
    const warningEl = document.getElementById('exact-sum-warning');
    if (warningEl) {
      const diff = Math.abs(sum - totalAmount);
      if (diff < 0.01) {
        warningEl.textContent = `Sum matches total ($${sum.toFixed(2)})`;
        warningEl.style.color = 'var(--success)';
      } else {
        warningEl.textContent = `Current sum: $${sum.toFixed(2)} (Diff: $${(totalAmount - sum).toFixed(2)})`;
        warningEl.style.color = 'var(--danger)';
      }
    }
  }

  expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (state.participants.length === 0) {
      alert('Please add participants before recording expenses.');
      return;
    }

    const title = expenseTitleInput.value.trim();
    const amount = parseFloat(expenseAmountInput.value);
    const payer = expensePayerSelect.value;
    const method = getSelectedSplitMethod();

    if (!title || isNaN(amount) || amount <= 0 || !payer) {
      alert('Please fill out all required fields correctly.');
      return;
    }

    let splits = {};

    if (method === 'equal') {
      const share = amount / state.participants.length;
      state.participants.forEach(p => {
        splits[p] = Number(share.toFixed(2));
      });
    } else if (method === 'exact') {
      const exactInputs = splitDetailsContainer.querySelectorAll('.exact-split-input');
      let sum = 0;
      exactInputs.forEach(inp => {
        const val = parseFloat(inp.value) || 0;
        splits[inp.getAttribute('data-person')] = val;
        sum += val;
      });
      if (Math.abs(sum - amount) > 0.05) {
        alert(`Exact split sum ($${sum.toFixed(2)}) does not match total expense amount ($${amount.toFixed(2)}).`);
        return;
      }
    } else if (method === 'shares') {
      const shareInputs = splitDetailsContainer.querySelectorAll('.share-split-input');
      let totalShares = 0;
      const rawShares = {};
      shareInputs.forEach(inp => {
        const val = parseFloat(inp.value) || 0;
        rawShares[inp.getAttribute('data-person')] = val;
        totalShares += val;
      });

      if (totalShares <= 0) {
        alert('Total shares must be greater than zero.');
        return;
      }

      state.participants.forEach(p => {
        const ratio = (rawShares[p] || 0) / totalShares;
        splits[p] = Number((amount * ratio).toFixed(2));
      });
    }

    const newExpense = {
      id: 'exp_' + Date.now(),
      title,
      amount,
      payer,
      method,
      splits,
      date: new Date().toLocaleDateString()
    };

    state.expenses.push(newExpense);
    saveState();
    expenseForm.reset();
    updatePayerDropdown();
    renderSplitDetails();
    renderExpenses();
  });

  function renderExpenses() {
    expenseList.innerHTML = '';
    if (state.expenses.length === 0) {
      expenseEmpty.style.display = 'block';
      expenseList.style.display = 'none';
      return;
    }

    expenseEmpty.style.display = 'none';
    expenseList.style.display = 'block';

    state.expenses.slice().reverse().forEach(exp => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="ledger-info">
          <span class="ledger-title">${escapeHtml(exp.title)}</span>
          <span class="ledger-sub">Paid by <strong>${escapeHtml(exp.payer)}</strong> &bull; ${exp.date}</span>
        </div>
        <div class="ledger-right">
          <span class="ledger-amount">$${exp.amount.toFixed(2)}</span>
          <button type="button" class="icon-btn view-receipt-btn" title="View Details">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          </button>
        </div>
      `;
      li.querySelector('.view-receipt-btn').addEventListener('click', () => openReceiptModal(exp.id));
      expenseList.appendChild(li);
    });
  }

  // Modal Handling
  function openReceiptModal(expenseId) {
    const exp = state.expenses.find(e => e.id === expenseId);
    if (!exp) return;
    activeModalExpenseId = expenseId;
    modalTitle.textContent = exp.title;

    let splitDetailsHtml = '<ul style="list-style: none; margin-top: 10px;">';
    for (const [person, amt] of Object.entries(exp.splits)) {
      splitDetailsHtml += `<li style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border);"><span>${escapeHtml(person)}</span><strong>$${amt.toFixed(2)}</strong></li>`;
    }
    splitDetailsHtml += '</ul>';

    modalBodyContent.innerHTML = `
      <p><strong>Total Amount:</strong> $${exp.amount.toFixed(2)}</p>
      <p><strong>Paid By:</strong> ${escapeHtml(exp.payer)}</p>
      <p><strong>Method:</strong> ${exp.method.toUpperCase()}</p>
      <p><strong>Date:</strong> ${exp.date}</p>
      <div style="margin-top: 16px;">
        <strong>Split Breakdown:</strong>
        ${splitDetailsHtml}
      </div>
    `;

    receiptModal.style.display = 'flex';
  }

  function closeReceiptModal() {
    receiptModal.style.display = 'none';
    activeModalExpenseId = null;
  }

  modalCloseBtn.addEventListener('click', closeReceiptModal);
  modalCloseAction.addEventListener('click', closeReceiptModal);
  receiptModal.addEventListener('click', (e) => {
    if (e.target === receiptModal) closeReceiptModal();
  });

  modalDeleteBtn.addEventListener('click', () => {
    if (!activeModalExpenseId) return;
    if (confirm('Are you sure you want to delete this expense?')) {
      state.expenses = state.expenses.filter(e => e.id !== activeModalExpenseId);
      saveState();
      renderExpenses();
      closeReceiptModal();
    }
  });

  // --- 3. BALANCES & MINIMAL SETTLEMENT ENGINE ---
  function calculateBalances() {
    // Net balance per participant: total paid minus total owed
    const balances = {};
    state.participants.forEach(p => balances[p] = 0);

    state.expenses.forEach(exp => {
      if (balances[exp.payer] !== undefined) {
        balances[exp.payer] += exp.amount;
      }
      for (const [person, amt] of Object.entries(exp.splits)) {
        if (balances[person] !== undefined) {
          balances[person] -= amt;
        }
      }
    });

    return balances;
  }

  function computeMinimalSettlements(balances) {
    // Greedy debt simplification algorithm
    let debtors = [];
    let creditors = [];

    for (const [person, bal] of Object.entries(balances)) {
      // Round to 2 decimals to avoid floating point issues
      const rounded = Math.round(bal * 100) / 100;
      if (rounded < -0.01) {
        debtors.push({ name: person, amount: -rounded });
      } else if (rounded > 0.01) {
        creditors.push({ name: person, amount: rounded });
      }
    }

    // Sort descending by amount
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    let settlements = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      const settleAmount = Math.min(debtor.amount, creditor.amount);
      if (settleAmount > 0.01) {
        settlements.push({
          from: debtor.name,
          to: creditor.name,
          amount: Number(settleAmount.toFixed(2))
        });
      }

      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;

      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    return settlements;
  }

  function renderBalancesAndSettlements() {
    const balances = calculateBalances();
    const settlements = computeMinimalSettlements(balances);

    // Render Balances
    balanceList.innerHTML = '';
    const hasParticipants = state.participants.length > 0;
    if (!hasParticipants || Object.keys(balances).length === 0) {
      balanceEmpty.style.display = 'block';
      balanceList.style.display = 'none';
    } else {
      balanceEmpty.style.display = 'none';
      balanceList.style.display = 'block';

      for (const [person, bal] of Object.entries(balances)) {
        const rounded = Math.round(bal * 100) / 100;
        let cls = '';
        let text = `$${rounded.toFixed(2)}`;
        if (rounded > 0.01) {
          cls = 'positive-balance';
          text = `gets back +$${rounded.toFixed(2)}`;
        } else if (rounded < -0.01) {
          cls = 'negative-balance';
          text = `owes -$${Math.abs(rounded).toFixed(2)}`;
        } else {
          text = 'settled ($0.00)';
        }

        const li = document.createElement('li');
        li.className = 'balance-item';
        li.innerHTML = `
          <span class="item-name">${escapeHtml(person)}</span>
          <span class="${cls}">${text}</span>
        `;
        balanceList.appendChild(li);
      }
    }

    // Render Settlements
    settlementList.innerHTML = '';
    if (settlements.length === 0) {
      settlementEmpty.style.display = 'block';
      settlementList.style.display = 'none';
    } else {
      settlementEmpty.style.display = 'none';
      settlementList.style.display = 'block';

      settlements.forEach(s => {
        const li = document.createElement('li');
        li.innerHTML = `
          <div class="settlement-card">
            <span><strong>${escapeHtml(s.from)}</strong> pays <strong>${escapeHtml(s.to)}</strong></span>
            <span class="settlement-pill">$${s.amount.toFixed(2)}</span>
          </div>
        `;
        settlementList.appendChild(li);
      });
    }

    // Render SVG Debt Network
    renderDebtNetwork(balances, settlements);
  }

  function renderDebtNetwork(balances, settlements) {
    networkEdges.innerHTML = '';
    networkNodes.innerHTML = '';

    const participants = state.participants;
    if (participants.length === 0) {
      networkEmpty.style.display = 'block';
      return;
    }

    networkEmpty.style.display = 'none';

    // Compute node coordinates in a circle
    const cx = 300;
    const cy = 150;
    const radius = 100;
    const count = participants.length;
    const nodeCoords = {};

    participants.forEach((p, idx) => {
      const angle = (idx / count) * 2 * Math.PI - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      nodeCoords[p] = { x, y };
    });

    // Draw Edges (Settlements)
    settlements.forEach(s => {
      const fromCoord = nodeCoords[s.from];
      const toCoord = nodeCoords[s.to];
      if (fromCoord && toCoord) {
        // Draw arrow line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', fromCoord.x);
        line.setAttribute('y1', fromCoord.y);
        line.setAttribute('x2', toCoord.x);
        line.setAttribute('y2', toCoord.y);
        line.setAttribute('stroke', '#2563eb');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('stroke-dasharray', '4,4');
        networkEdges.appendChild(line);

        // Draw amount label at midpoint
        const midX = (fromCoord.x + toCoord.x) / 2;
        const midY = (fromCoord.y + toCoord.y) / 2;
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', midX);
        text.setAttribute('y', midY - 5);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#1e293b');
        text.setAttribute('font-size', '11');
        text.setAttribute('font-weight', '600');
        text.textContent = `$${s.amount.toFixed(2)}`;
        networkEdges.appendChild(text);
      }
    });

    // Draw Nodes
    participants.forEach(p => {
      const coord = nodeCoords[p];
      if (!coord) return;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', coord.x);
      circle.setAttribute('cy', coord.y);
      circle.setAttribute('r', '22');
      circle.setAttribute('fill', '#ffffff');
      circle.setAttribute('stroke', '#2563eb');
      circle.setAttribute('stroke-width', '2.5');
      g.appendChild(circle);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', coord.x);
      text.setAttribute('y', coord.y + 34);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#0f172a');
      text.setAttribute('font-size', '12');
      text.setAttribute('font-weight', '600');
      // Truncate name if too long
      text.textContent = p.length > 8 ? p.substring(0, 7) + '...' : p;
      g.appendChild(text);

      // Initials inside circle
      const initialText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      initialText.setAttribute('x', coord.x);
      initialText.setAttribute('y', coord.y + 4);
      initialText.setAttribute('text-anchor', 'middle');
      initialText.setAttribute('fill', '#2563eb');
      initialText.setAttribute('font-size', '11');
      initialText.setAttribute('font-weight', '700');
      initialText.textContent = p.substring(0, 2).toUpperCase();
      g.appendChild(initialText);

      networkNodes.appendChild(g);
    });
  }

  // --- UTILITIES & ACTIONS ---
  resetDataBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all participants and expenses?')) {
      state = { participants: [], expenses: [] };
      saveState();
      renderParticipants();
      renderExpenses();
      renderBalancesAndSettlements();
      updatePayerDropdown();
      renderSplitDetails();
      switchTab('participants');
    }
  });

  exportJsonBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sparksplit_summary_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Initial Render
  renderParticipants();
  renderExpenses();
  updatePayerDropdown();
  renderSplitDetails();
});
