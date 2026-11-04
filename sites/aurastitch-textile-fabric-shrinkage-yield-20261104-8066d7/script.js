document.addEventListener('DOMContentLoaded', () => {
  // Default state
  const DEFAULT_STATE = {
    fabricName: 'Linen Summer Dress & Lining',
    fabricWidth: 54,
    fabricCost: 14.50,
    shrinkWarp: 6,
    shrinkWeft: 3,
    patternMatching: 1.10,
    seamAllowance: 1.10,
    pieces: [
      { id: 1, name: 'Front Bodice', length: 24, width: 18, qty: 2 },
      { id: 2, name: 'Back Bodice', length: 26, width: 18, qty: 1 },
      { id: 3, name: 'Skirt Tier 1', length: 36, width: 52, qty: 2 },
      { id: 4, name: 'Facing Strips', length: 12, width: 4, qty: 4 }
    ]
  };

  let state = loadState() || DEFAULT_STATE;

  // DOM Elements
  const elFabricName = document.getElementById('fabric-name');
  const elFabricWidth = document.getElementById('fabric-width');
  const elFabricCost = document.getElementById('fabric-cost');
  const elShrinkWarp = document.getElementById('shrink-warp');
  const elValWarp = document.getElementById('val-warp');
  const elShrinkWeft = document.getElementById('shrink-weft');
  const elValWeft = document.getElementById('val-weft');
  const elPatternMatching = document.getElementById('pattern-matching');
  const elSeamAllowance = document.getElementById('seam-allowance');

  const elNewName = document.getElementById('new-piece-name');
  const elNewLength = document.getElementById('new-piece-length');
  const elNewWidth = document.getElementById('new-piece-width');
  const elNewQty = document.getElementById('new-piece-qty');
  const elBtnAddPiece = document.getElementById('btn-add-piece');
  const elPiecesTbody = document.getElementById('pieces-tbody');

  const elResYards = document.getElementById('res-yards');
  const elResCost = document.getElementById('res-cost');
  const elResUnitCost = document.getElementById('res-unit-cost');
  const elResShrinkAdd = document.getElementById('res-shrink-add');
  const elResArea = document.getElementById('res-area');
  const elVizWidthLabel = document.getElementById('viz-width-label');
  const elSummaryText = document.getElementById('summary-text');

  const elBtnReset = document.getElementById('btn-reset');
  const elBtnSave = document.getElementById('btn-save');
  const elBtnPrint = document.getElementById('btn-print');
  const elBtnCopy = document.getElementById('btn-copy');
  const canvas = document.getElementById('bolt-canvas');
  const ctx = canvas.getContext('2d');

  // Initialize UI from State
  function initUI() {
    if (!elFabricName) return;
    elFabricName.value = state.fabricName;
    elFabricWidth.value = state.fabricWidth;
    elFabricCost.value = state.fabricCost;
    elShrinkWarp.value = state.shrinkWarp;
    elValWarp.textContent = state.shrinkWarp;
    elShrinkWeft.value = state.shrinkWeft;
    elValWeft.textContent = state.shrinkWeft;
    elPatternMatching.value = state.patternMatching;
    elSeamAllowance.value = state.seamAllowance;
    renderPiecesTable();
    calculateAndRender();
  }

  function loadState() {
    try {
      const saved = localStorage.getItem('aurastitch_project');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }

  function saveState() {
    try {
      localStorage.setItem('aurastitch_project', JSON.stringify(state));
      showToast('Project saved successfully!');
    } catch (e) {
      alert('Could not save project to local storage.');
    }
  }

  function showToast(msg) {
    const orig = elBtnSave.textContent;
    elBtnSave.textContent = msg;
    elBtnSave.style.backgroundColor = 'var(--accent-hover)';
    setTimeout(() => {
      elBtnSave.textContent = orig;
      elBtnSave.style.backgroundColor = '';
    }, 2000);
  }

  // Event Listeners for inputs
  elFabricName.addEventListener('input', (e) => { state.fabricName = e.target.value; calculateAndRender(); });
  elFabricWidth.addEventListener('change', (e) => { state.fabricWidth = parseFloat(e.target.value); calculateAndRender(); });
  elFabricCost.addEventListener('input', (e) => { state.fabricCost = parseFloat(e.target.value) || 0; calculateAndRender(); });
  
  elShrinkWarp.addEventListener('input', (e) => {
    state.shrinkWarp = parseFloat(e.target.value);
    elValWarp.textContent = state.shrinkWarp;
    calculateAndRender();
  });

  elShrinkWeft.addEventListener('input', (e) => {
    state.shrinkWeft = parseFloat(e.target.value);
    elValWeft.textContent = state.shrinkWeft;
    calculateAndRender();
  });

  elPatternMatching.addEventListener('change', (e) => { state.patternMatching = parseFloat(e.target.value); calculateAndRender(); });
  elSeamAllowance.addEventListener('change', (e) => { state.seamAllowance = parseFloat(e.target.value); calculateAndRender(); });

  // Add Piece
  elBtnAddPiece.addEventListener('click', () => {
    const name = elNewName.value.trim() || `Piece ${state.pieces.length + 1}`;
    const length = parseFloat(elNewLength.value) || 12;
    const width = parseFloat(elNewWidth.value) || 12;
    const qty = parseInt(elNewQty.value) || 1;

    state.pieces.push({ id: Date.now(), name, length, width, qty });
    elNewName.value = '';
    renderPiecesTable();
    calculateAndRender();
  });

  window.removePiece = function(id) {
    state.pieces = state.pieces.filter(p => p.id !== id);
    renderPiecesTable();
    calculateAndRender();
  };

  function renderPiecesTable() {
    elPiecesTbody.innerHTML = '';
    if (state.pieces.length === 0) {
      elPiecesTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">No pattern pieces added yet.</td></tr>`;
      return;
    }

    state.pieces.forEach(p => {
      const tr = document.createElement('tr');
      const area = p.length * p.width * p.qty;
      tr.innerHTML = `
        <td>${escapeHtml(p.name)}</td>
        <td>${p.length}" &times; ${p.width}"</td>
        <td>${p.qty}</td>
        <td>${area.toLocaleString()}</td>
        <td><button class="btn-icon" onclick="removePiece(${p.id})" title="Delete Piece">&times;</button></td>
      `;
      elPiecesTbody.appendChild(tr);
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function calculateAndRender() {
    elVizWidthLabel.textContent = `${state.fabricWidth}"`;
    elResUnitCost.textContent = state.fabricCost.toFixed(2);

    // Total piece area in square inches
    let totalPieceArea = 0;
    state.pieces.forEach(p => {
      totalPieceArea += (p.length * p.width * p.qty);
    });

    elResArea.textContent = totalPieceArea.toLocaleString();

    // Shrinkage multiplier (warp & weft)
    const shrinkFactorWarp = 1 + (state.shrinkWarp / 100);
    const shrinkFactorWeft = 1 + (state.shrinkWeft / 100);
    const totalShrinkMultiplier = shrinkFactorWarp * shrinkFactorWeft;

    // Total required square inches including shrinkage, pattern matching waste, and seam allowances
    const effectiveMultiplier = totalShrinkMultiplier * state.patternMatching * state.seamAllowance;
    const totalRequiredSqIn = totalPieceArea * effectiveMultiplier;

    // Convert to linear yards
    // 1 linear yard = Fabric Width (in) * 36 inches
    const sqInPerYard = state.fabricWidth * 36;
    const exactYards = totalRequiredSqIn / sqInPerYard;

    // Round up to nearest 1/8 yard (0.125)
    const roundedYards = Math.ceil(exactYards * 8) / 8;
    const displayYards = Math.max(0.25, roundedYards);

    elResYards.textContent = displayYards.toFixed(2);

    // Cost calculation
    const totalCost = displayYards * state.fabricCost;
    elResCost.textContent = `$${totalCost.toFixed(2)}`;

    // Shrinkage add percentage display
    const extraPct = ((effectiveMultiplier - 1) * 100).toFixed(1);
    elResShrinkAdd.textContent = `+${extraPct}`;

    // Summary text
    const summaryString = `Project: ${state.fabricName}
Fabric Bolt Width: ${state.fabricWidth}" @ $${state.fabricCost.toFixed(2)}/yd
Pre-wash Shrinkage Allowance: Warp ${state.shrinkWarp}%, Weft ${state.shrinkWeft}%
Layout Waste & Seam Buffer: ${((state.patternMatching - 1)*100).toFixed(0)}% pattern match, ${((state.seamAllowance - 1)*100).toFixed(0)}% seam buffer

Total Piece Surface Area: ${totalPieceArea.toLocaleString()} sq in
Recommended Cut Yardage: ${displayYards.toFixed(2)} yards
Estimated Fabric Investment: $${totalCost.toFixed(2)}`;

    elSummaryText.textContent = summaryString;

    // Draw Canvas Visualizer
    drawVisualizer(displayYards, state.pieces, state.fabricWidth);
  }

  function drawVisualizer(yards, pieces, boltWidth) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background bolt rail
    ctx.fillStyle = '#18202d';
    ctx.fillRect(0, 0, w, h);

    // Draw bolt grid border
    ctx.strokeStyle = '#2c3a52';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText(`Bolt Length Simulation: ~${yards} yards (${Math.round(yards * 36)} inches total)`, 20, 32);

    if (pieces.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Add pattern pieces to visualize cut layout', w / 2, h / 2);
      ctx.textAlign = 'left';
      return;
    }

    // Render miniature simulated pieces along the bolt
    let cursorX = 25;
    let cursorY = 50;
    const maxRowWidth = w - 40;

    pieces.forEach((p, idx) => {
      for (let i = 0; i < p.qty; i++) {
        // Scale dimensions to canvas fitting
        const boxW = Math.max(25, Math.min(80, p.length * 1.5));
        const boxH = Math.max(20, Math.min(50, p.width * 0.8));

        if (cursorX + boxW > maxRowWidth) {
          cursorX = 25;
          cursorY += 60;
        }

        if (cursorY + boxH > h - 20) break;

        // Draw piece box
        ctx.fillStyle = idx % 2 === 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(59, 130, 246, 0.2)';
        ctx.strokeStyle = idx % 2 === 0 ? '#10b981' : '#3b82f6';
        ctx.lineWidth = 1.5;
        ctx.fillRect(cursorX, cursorY, boxW, boxH);
        ctx.strokeRect(cursorX, cursorY, boxW, boxH);

        // Label piece
        ctx.fillStyle = '#f0f4f8';
        ctx.font = '10px sans-serif';
        ctx.fillText(p.name.substring(0, 8), cursorX + 4, cursorY + 16);

        cursorX += boxW + 10;
      }
    });
  }

  elBtnReset.addEventListener('click', () => {
    if (confirm('Reset all values to default template?')) {
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      localStorage.removeItem('aurastitch_project');
      initUI();
    }
  });

  elBtnSave.addEventListener('click', () => {
    saveState();
  });

  elBtnPrint.addEventListener('click', () => {
    window.print();
  });

  elBtnCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(elSummaryText.textContent).then(() => {
      showToast('Summary copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy text.');
    });
  });

  // Initial load
  initUI();
});
