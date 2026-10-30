document.addEventListener('DOMContentLoaded', () => {
  // Default initial pieces
  const defaultPieces = [
    { name: 'Front Bodice / Tunic', length: 28, width: 22, qty: 2 },
    { name: 'Back Bodice / Tunic', length: 28, width: 22, qty: 1 },
    { name: 'Trouser Leg', length: 40, width: 18, qty: 2 },
    { name: 'Waistband / Facing', length: 34, width: 5, qty: 1 }
  ];

  let pieces = JSON.parse(JSON.stringify(defaultPieces));

  // DOM Elements
  const fabricNameInput = document.getElementById('fabricName');
  const unitSystemSelect = document.getElementById('unitSystem');
  const fabricWidthInput = document.getElementById('fabricWidth');
  const shrinkWarpInput = document.getElementById('shrinkWarp');
  const shrinkWeftInput = document.getElementById('shrinkWeft');
  const patternMatchingInput = document.getElementById('patternMatching');
  const fabricCostInput = document.getElementById('fabricCost');
  const addPieceBtn = document.getElementById('addPieceBtn');
  const piecesListContainer = document.getElementById('piecesList');
  
  const totalYardageEl = document.getElementById('totalYardage');
  const totalYardageUnitEl = document.getElementById('totalYardageUnit');
  const totalCostEl = document.getElementById('totalCost');
  const costPerPieceEl = document.getElementById('costPerPiece');
  const totalAreaEl = document.getElementById('totalArea');
  const totalAreaUnitEl = document.getElementById('totalAreaUnit');
  const wasteRateEl = document.getElementById('wasteRate');
  const boltDimensionsTag = document.getElementById('boltDimensionsTag');
  const layoutSvg = document.getElementById('layoutSvg');
  const breakdownTableBody = document.querySelector('#breakdownTable tbody');
  const resetDefaultBtn = document.getElementById('resetDefaultBtn');
  const exportSummaryBtn = document.getElementById('exportSummaryBtn');
  const widthUnitLabels = document.querySelectorAll('.width-unit-label');

  // Render pattern pieces inputs
  function renderPiecesList() {
    piecesListContainer.innerHTML = '';
    pieces.forEach((piece, index) => {
      const row = document.createElement('div');
      row.className = 'piece-row';
      row.innerHTML = `
        <input type="text" value="${piece.name}" data-index="${index}" data-field="name" placeholder="Piece Name">
        <div class="unit-suffix">
          <input type="number" value="${piece.length}" min="1" max="300" step="0.5" data-index="${index}" data-field="length" title="Length">
        </div>
        <div class="unit-suffix">
          <input type="number" value="${piece.width}" min="1" max="200" step="0.5" data-index="${index}" data-field="width" title="Width">
        </div>
        <button type="button" class="btn-icon" data-index="${index}" title="Remove Piece">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      `;
      piecesListContainer.appendChild(row);
    });
  }

  // Calculations and UI update
  function calculateAndRender() {
    const unitSystem = unitSystemSelect.value;
    const isMetric = unitSystem === 'metric';
    
    // Update unit labels
    widthUnitLabels.forEach(el => el.textContent = isMetric ? 'cm' : 'in');

    const boltWidth = parseFloat(fabricWidthInput.value) || 54;
    const shrinkWarp = parseFloat(shrinkWarpInput.value) || 0;
    const shrinkWeft = parseFloat(shrinkWeftInput.value) || 0;
    const patternMatch = parseFloat(patternMatchingInput.value) || 0;
    const costPerUnit = parseFloat(fabricCostInput.value) || 0;

    let totalPieceArea = 0;
    let totalWeightedLength = 0;
    let breakdownRowsHTML = '';

    const processedPieces = pieces.map(piece => {
      const qty = piece.qty || 1;
      const len = parseFloat(piece.length) || 0;
      const wid = parseFloat(piece.width) || 0;
      
      // Post-wash dimensions (Finished size)
      // If finished size is X, pre-wash cut size must be X / (1 - shrink/100)
      const cutLen = len / (1 - shrinkWarp / 100);
      const cutWid = wid / (1 - shrinkWeft / 100);

      const pieceArea = cutLen * cutWid * qty;
      totalPieceArea += pieceArea;

      // Simple heuristic for linear layout requirement along bolt width
      // How many pieces fit side by side across the bolt width?
      const fitAcross = Math.max(1, Math.floor(boltWidth / Math.max(cutWid, 1)));
      const rowsNeeded = Math.ceil(qty / fitAcross);
      const linearLengthNeeded = rowsNeeded * cutLen;
      
      totalWeightedLength += linearLengthNeeded;

      breakdownRowsHTML += `
        <tr>
          <td><strong>${piece.name}</strong> (${qty}x)</td>
          <td>${cutLen.toFixed(1)} &times; ${cutWid.toFixed(1)} ${isMetric ? 'cm' : 'in'}</td>
          <td>${len.toFixed(1)} &times; ${wid.toFixed(1)} ${isMetric ? 'cm' : 'in'}</td>
          <td>${qty}</td>
        </tr>
      `;

      return {
        ...piece,
        cutLen,
        cutWid,
        qty,
        linearLengthNeeded
      };
    });

    // Apply pattern matching & waste allowance
    const wasteMultiplier = 1 + (patternMatch / 100) + 0.08; // 8% standard nesting buffer
    const netRequiredLength = totalWeightedLength * wasteMultiplier;

    // Convert to standard retail units (Yards or Meters)
    const unitLengthDivider = isMetric ? 100 : 36;
    const rawTotalLength = netRequiredLength / unitLengthDivider;
    const recommendedLength = Math.ceil(rawTotalLength * 4) / 4; // Round up to nearest quarter unit

    const totalCost = recommendedLength * costPerUnit;
    const totalPiecesCount = pieces.reduce((sum, p) => sum + p.qty, 0);
    const avgCostPerPiece = totalPiecesCount > 0 ? totalCost / totalPiecesCount : 0;

    // Estimate overall waste percentage
    const boltTotalArea = boltWidth * netRequiredLength;
    const calculatedWasteRate = boltTotalArea > 0 ? Math.max(5, Math.min(45, ((boltTotalArea - totalPieceArea) / boltTotalArea) * 100)) : 15;

    // Render metrics
    totalYardageEl.textContent = recommendedLength.toFixed(2);
    totalYardageUnitEl.textContent = isMetric ? `Meters (${isMetric ? 'cm' : 'in'} cut)` : `Yards (${isMetric ? 'cm' : 'in'} cut)`;
    totalCostEl.textContent = `$${totalCost.toFixed(2)}`;
    costPerPieceEl.textContent = `~$${avgCostPerPiece.toFixed(2)} / piece avg`;
    totalAreaEl.textContent = totalPieceArea.toLocaleString(undefined, {maximumFractionDigits: 0});
    totalAreaUnitEl.textContent = isMetric ? 'sq. centimeters' : 'sq. inches';
    wasteRateEl.textContent = `${calculatedWasteRate.toFixed(1)}%`;
    boltDimensionsTag.textContent = `Bolt: ${boltWidth}"${isMetric ? ' cm' : ' width'}`;

    breakdownTableBody.innerHTML = breakdownRowsHTML;

    // Render SVG Cut Layout Map
    renderSvgLayout(processedPieces, boltWidth, netRequiredLength, isMetric);
  }

  function renderSvgLayout(processedPieces, boltWidth, totalLen, isMetric) {
    const svgWidth = 700;
    const svgHeight = 220;
    
    // Clear SVG
    layoutSvg.innerHTML = '';

    // Draw bolt background
    const boltBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    boltBg.setAttribute('x', '20');
    boltBg.setAttribute('y', '30');
    boltBg.setAttribute('width', '660');
    boltBg.setAttribute('height', '140');
    boltBg.setAttribute('rx', '6');
    boltBg.setAttribute('fill', '#f8fafc');
    boltBg.setAttribute('stroke', '#cbd5e1');
    boltBg.setAttribute('stroke-dasharray', '4 4');
    layoutSvg.appendChild(boltBg);

    // Bolt Label
    const boltLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    boltLabel.setAttribute('x', '30');
    boltLabel.setAttribute('y', '50');
    boltLabel.setAttribute('fill', '#64748b');
    boltLabel.setAttribute('font-size', '10');
    boltLabel.setAttribute('font-weight', '600');
    boltLabel.textContent = `FABRIC BOLT BOUNDARY (${boltWidth}" WIDE)`;
    layoutSvg.appendChild(boltLabel);

    // Colors for pattern blocks
    const colors = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

    // Simulated nesting placement
    let cursorX = 40;
    let cursorY = 65;
    let rowMaxHeight = 0;

    processedPieces.forEach((piece, pIdx) => {
      const color = colors[pIdx % colors.length];
      for (let i = 0; i < piece.qty; i++) {
        // Scale dimensions to fit SVG preview
        const boxW = Math.max(35, Math.min(120, piece.cutLen * 2.2));
        const boxH = Math.max(25, Math.min(90, piece.cutWid * 2.2));

        if (cursorX + boxW > 660) {
          cursorX = 40;
          cursorY += rowMaxHeight + 12;
          rowMaxHeight = 0;
        }

        if (cursorY + boxH > 165) {
          // Stop drawing if out of preview bounds
          break;
        }

        if (boxH > rowMaxHeight) {
          rowMaxHeight = boxH;
        }

        // Draw pattern rect
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', cursorX);
        rect.setAttribute('y', cursorY);
        rect.setAttribute('width', boxW);
        rect.setAttribute('height', boxH);
        rect.setAttribute('rx', '4');
        rect.setAttribute('fill', color);
        rect.setAttribute('fill-opacity', '0.15');
        rect.setAttribute('stroke', color);
        rect.setAttribute('stroke-width', '1.5');
        layoutSvg.appendChild(rect);

        // Draw Grainline arrow
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', cursorX + boxW / 2);
        line.setAttribute('y1', cursorY + 6);
        line.setAttribute('x2', cursorX + boxW / 2);
        line.setAttribute('y2', cursorY + boxH - 6);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '1');
        line.setAttribute('stroke-dasharray', '2 2');
        layoutSvg.appendChild(line);

        // Draw piece label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', cursorX + 6);
        text.setAttribute('y', cursorY + 16);
        text.setAttribute('fill', color);
        text.setAttribute('font-size', '9');
        text.setAttribute('font-weight', '700');
        // Shorten name if too long
        text.textContent = piece.name.length > 12 ? piece.name.substring(0, 10) + '...' : piece.name;
        layoutSvg.appendChild(text);

        cursorX += boxW + 10;
      }
    });
  }

  // Event Listeners for inputs
  [fabricNameInput, unitSystemSelect, fabricWidthInput, shrinkWarpInput, shrinkWeftInput, patternMatchingInput, fabricCostInput].forEach(el => {
    el.addEventListener('input', calculateAndRender);
    el.addEventListener('change', calculateAndRender);
  });

  // Event Delegation for pieces list edits
  piecesListContainer.addEventListener('input', (e) => {
    const target = e.target;
    const index = parseInt(target.getAttribute('data-index'), 10);
    const field = target.getAttribute('data-field');
    if (!isNaN(index) && field) {
      if (field === 'name') {
        pieces[index].name = target.value;
      } else {
        pieces[index][field] = parseFloat(target.value) || 0;
      }
      calculateAndRender();
    }
  });

  // Event Delegation for piece removal
  piecesListContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-icon');
    if (btn) {
      const index = parseInt(btn.getAttribute('data-index'), 10);
      if (!isNaN(index)) {
        pieces.splice(index, 1);
        renderPiecesList();
        calculateAndRender();
      }
    }
  });

  // Add Piece Button
  addPieceBtn.addEventListener('click', () => {
    pieces.push({ name: 'New Pattern Panel', length: 20, width: 15, qty: 1 });
    renderPiecesList();
    calculateAndRender();
  });

  // Reset Defaults Button
  resetDefaultBtn.addEventListener('click', () => {
    fabricNameInput.value = 'Linen Summer Trousers & Tunic';
    unitSystemSelect.value = 'imperial';
    fabricWidthInput.value = '54';
    shrinkWarpInput.value = '6';
    shrinkWeftInput.value = '3';
    patternMatchingInput.value = '10';
    fabricCostInput.value = '14.50';
    pieces = JSON.parse(JSON.stringify(defaultPieces));
    renderPiecesList();
    calculateAndRender();
  });

  // Export Summary (TXT)
  exportSummaryBtn.addEventListener('click', () => {
    const unit = unitSystemSelect.value === 'metric' ? 'cm / meters' : 'inches / yards';
    let report = `=== AURASTITCH TEXTILE PROJECT REPORT ===\n`;
    report += `Project Name: ${fabricNameInput.value}\n`;
    report += `Unit System: ${unit}\n`;
    report += `Bolt Width: ${fabricWidthInput.value}\n`;
    report += `Warp Shrinkage: ${shrinkWarpInput.value}% | Weft Shrinkage: ${shrinkWeftInput.value}%\n`;
    report += `Pattern Match Allowance: ${patternMatchingInput.value}%\n`;
    report += `Fabric Cost per Unit: $${fabricCostInput.value}\n\n`;
    report += `RECOMMENDED YARDAGE: ${totalYardageEl.textContent} ${totalYardageUnitEl.textContent}\n`;
    report += `ESTIMATED TOTAL COST: ${totalCostEl.textContent}\n\n`;
    report += `--- PATTERN PIECES CUT SPECIFICATION ---\n`;
    
    pieces.forEach(p => {
      const cutLen = p.length / (1 - parseFloat(shrinkWarpInput.value)/100);
      const cutWid = p.width / (1 - parseFloat(shrinkWeftInput.value)/100);
      report += `- ${p.name} (Qty: ${p.qty}): Cut Size: ${cutLen.toFixed(1)} x ${cutWid.toFixed(1)} | Finished Size: ${p.length} x ${p.width}\n`;
    });

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fabricNameInput.value.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_cut_sheet.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Initial render on load
  renderPiecesList();
  calculateAndRender();
});
