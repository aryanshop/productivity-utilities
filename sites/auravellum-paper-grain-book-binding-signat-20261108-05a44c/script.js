document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const bookWidthInput = document.getElementById('bookWidth');
  const bookHeightInput = document.getElementById('bookHeight');
  const pageCountInput = document.getElementById('pageCount');
  const bindingStyleSelect = document.getElementById('bindingStyle');
  const paperStockSelect = document.getElementById('paperStock');
  const parentSheetSelect = document.getElementById('parentSheet');
  const grainPrefSelect = document.getElementById('grainPref');
  const pagesPerSigSelect = document.getElementById('pagesPerSig');
  
  const calcBtn = document.getElementById('calcBtn');
  const savePresetBtn = document.getElementById('savePresetBtn');
  
  const resSignatures = document.getElementById('resSignatures');
  const resSheets = document.getElementById('resSheets');
  const resSpineThickness = document.getElementById('resSpineThickness');
  const resGrainStatus = document.getElementById('resGrainStatus');
  const grainWarningBox = document.getElementById('grainWarningBox');
  const grainWarningText = document.getElementById('grainWarningText');
  
  const prevSigBtn = document.getElementById('prevSigBtn');
  const nextSigBtn = document.getElementById('nextSigBtn');
  const sigIndicator = document.getElementById('sigIndicator');
  const impositionCanvas = document.getElementById('impositionCanvas');
  const specList = document.getElementById('specList');
  const presetsContainer = document.getElementById('presetsContainer');

  let currentSignatureIndex = 0;
  let totalSignaturesCount = 1;
  let savedPresets = JSON.parse(localStorage.getItem('auravellum_presets') || '[]');

  // Parent sheet dimensions in mm
  const parentSheetDimensions = {
    a3: { width: 420, height: 297, name: 'A3 (420 × 297 mm)' },
    a4: { width: 297, height: 210, name: 'A4 (297 × 210 mm)' },
    letter: { width: 279.4, height: 215.9, name: 'US Letter (279 × 216 mm)' },
    tabloid: { width: 431.8, height: 279.4, name: 'US Tabloid (432 × 279 mm)' },
    custom_large: { width: 1000, height: 700, name: 'Large Press Sheet (1000 × 700 mm)' }
  };

  // Paper thickness in mm per sheet (2 pages)
  const paperThicknessMap = {
    '80': 0.10,
    '100': 0.13,
    '120': 0.16,
    '160': 0.22,
    '300': 0.40
  };

  function calculateBinding() {
    const width = parseFloat(bookWidthInput.value) || 148;
    const height = parseFloat(bookHeightInput.value) || 210;
    const pages = parseInt(pageCountInput.value) || 96;
    const bindingStyle = bindingStyleSelect.value;
    const paperWeight = paperStockSelect.value;
    const sheetKey = parentSheetSelect.value;
    const grainPref = grainPrefSelect.value;
    const pagesPerSig = parseInt(pagesPerSigSelect.value) || 16;

    const sheet = parentSheetDimensions[sheetKey] || parentSheetDimensions.a4;
    const sheetWidth = sheet.width;
    const sheetHeight = sheet.height;

    // 1. Signatures calculation
    totalSignaturesCount = Math.ceil(pages / pagesPerSig);
    resSignatures.textContent = `${totalSignaturesCount} signatures`;

    // 2. Sheets calculation (Assuming 4 pages per sheet folded in a signature)
    const sheetsPerSig = pagesPerSig / 4;
    const totalParentSheets = sheetsPerSig * totalSignaturesCount;
    resSheets.textContent = `${Math.ceil(totalParentSheets)} sheets`;

    // 3. Spine Bulk Thickness
    const thicknessPerSheet = paperThicknessMap[paperWeight] || 0.16;
    const totalSheetsInBook = pages / 2;
    const spineBulkMm = totalSheetsInBook * thicknessPerSheet;
    resSpineThickness.textContent = `${spineBulkMm.toFixed(2)} mm (${(spineBulkMm / 25.4).toFixed(2)} in)`;

    // 4. Grain check (Simplified rule: Book height should ideally run parallel to paper grain for best fold)
    // Assuming standard grain is long-grain parallel to the longer side of the parent sheet
    let grainCompliant = true;
    let grainMsg = "";

    if (grainPref === 'parallel') {
      grainCompliant = true;
      resGrainStatus.textContent = "Optimal (Parallel)";
      grainWarningBox.className = "warning-box success";
      grainWarningText.textContent = "Paper grain runs parallel to the spine. Pages will open smoothly and lie flat without buckling.";
    } else {
      grainCompliant = false;
      resGrainStatus.textContent = "Sub-optimal (Perpendicular)";
      grainWarningBox.className = "warning-box";
      grainWarningText.textContent = "Grain is perpendicular to spine. Pages will offer stiff resistance when turning and may curl over time.";
    }

    // Ensure current signature index is valid
    if (currentSignatureIndex >= totalSignaturesCount) {
      currentSignatureIndex = Math.max(0, totalSignaturesCount - 1);
    }
    sigIndicator.textContent = `Signature ${currentSignatureIndex + 1} of ${totalSignaturesCount}`;

    // 5. Populate Bindery Specs List
    updateSpecList(width, height, pages, bindingStyle, spineBulkMm, sheetWidth, sheetHeight, pagesPerSig);

    // 6. Draw Canvas
    drawImposition(currentSignatureIndex, width, height, sheetWidth, sheetHeight, pagesPerSig);
  }

  function updateSpecList(width, height, pages, binding, spineBulk, sheetW, sheetH, pps) {
    specList.innerHTML = '';

    const specs = [
      { label: 'Finished Trim Size', value: `${width} × ${height} mm` },
      { label: 'Total Signature Count', value: `${Math.ceil(pages / pps)} signatures (${pps} pages each)` },
      { label: 'Uncut Imposition Sheet', value: `${sheetW} × ${sheetH} mm` },
      { label: 'Estimated Spine Bulk', value: `${spineBulk.toFixed(2)} mm` },
      { label: 'Recommended Board Thickness', value: `${(spineBulk * 1.5).toFixed(1)} mm (Greyboard)` },
      { label: 'Headband & Ribbon Size', value: `${Math.ceil(width * 0.1)}mm width ribbon` },
      { label: 'Glue / Adhesive Type', value: binding === 'case' ? 'PVA Neutral pH & Mull Cloth' : 'Coptic Waxed Linen Thread' }
    ];

    specs.forEach(s => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${s.label}:</strong> <span>${s.value}</span>`;
      specList.appendChild(li);
    });
  }

  function drawImposition(sigIdx, bW, bH, sW, sH, pps) {
    if (!impositionCanvas.getContext) return;
    const ctx = impositionCanvas.getContext('2d');
    const cw = impositionCanvas.width;
    const ch = impositionCanvas.height;

    ctx.clearRect(0, 0, cw, ch);

    // Scale factor to fit parent sheet inside canvas (leaving margin)
    const margin = 30;
    const availW = cw - (margin * 2);
    const availH = ch - (margin * 2);

    const scaleX = availW / sW;
    const scaleY = availH / sH;
    const scale = Math.min(scaleX, scaleY);

    const drawW = sW * scale;
    const drawH = sH * scale;
    const startX = (cw - drawW) / 2;
    const startY = (ch - drawH) / 2;

    // Draw Parent Sheet Background
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#2c2925';
    ctx.lineWidth = 2;
    ctx.fillRect(startX, startY, drawW, drawH);
    ctx.strokeRect(startX, startY, drawW, drawH);

    // Draw Grain Direction Indicators (Parallel dashed lines)
    ctx.strokeStyle = '#d4a373';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(startX + drawW * 0.2, startY + 10);
    ctx.lineTo(startX + drawW * 0.2, startY + drawH - 10);
    ctx.moveTo(startX + drawW * 0.8, startY + 10);
    ctx.lineTo(startX + drawW * 0.8, startY + drawH - 10);
    ctx.stroke();
    ctx.setLineDash([]);

    // Grain label
    ctx.fillStyle = '#8b5a2b';
    ctx.font = '11px sans-serif';
    ctx.fillText('↑ Grain Direction (Long)', startX + 10, startY + 20);

    // Draw Imposition Folios on Sheet (Assuming 2x2 grid layout of pages for folding)
    const scaledPageW = bW * scale;
    const scaledPageH = bH * scale;

    const gridStartX = startX + (drawW - (scaledPageW * 2)) / 2;
    const gridStartY = startY + (drawH - (scaledPageH * 2)) / 2;

    // Draw 4 pages in the signature sheet representation
    const startPageNum = (sigIdx * pps) + 1;
    const pagesInSheet = [startPageNum, startPageNum + 1, startPageNum + 2, startPageNum + 3];

    const positions = [
      { x: gridStartX, y: gridStartY },
      { x: gridStartX + scaledPageW, y: gridStartY },
      { x: gridStartX, y: gridStartY + scaledPageH },
      { x: gridStartX + scaledPageW, y: gridStartY + scaledPageH }
    ];

    positions.forEach((pos, idx) => {
      ctx.fillStyle = '#faf9f6';
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 1;
      ctx.fillRect(pos.x, pos.y, scaledPageW, scaledPageH);
      ctx.strokeRect(pos.x, pos.y, scaledPageW, scaledPageH);

      ctx.fillStyle = '#2c2925';
      ctx.font = 'bold 12px sans-serif';
      const pageLabel = pagesInSheet[idx] ? `Page ${pagesInSheet[idx]}` : 'Blank';
      ctx.fillText(pageLabel, pos.x + 10, pos.y + 25);
      
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#666158';
      ctx.fillText(`Sig #${sigIdx + 1}`, pos.x + 10, pos.y + 42);
    });

    // Center fold crosshairs
    ctx.strokeStyle = '#e07a5f';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(gridStartX + scaledPageW, gridStartY - 10);
    ctx.lineTo(gridStartX + scaledPageW, gridStartY + (scaledPageH * 2) + 10);
    ctx.moveTo(gridStartX - 10, gridStartY + scaledPageH);
    ctx.lineTo(gridStartX + (scaledPageW * 2) + 10, gridStartY + scaledPageH);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Navigation event listeners for signatures
  prevSigBtn.addEventListener('click', () => {
    if (currentSignatureIndex > 0) {
      currentSignatureIndex--;
      calculateBinding();
    }
  });

  nextSigBtn.addEventListener('click', () => {
    if (currentSignatureIndex < totalSignaturesCount - 1) {
      currentSignatureIndex++;
      calculateBinding();
    }
  });

  // Preset saving & loading
  savePresetBtn.addEventListener('click', () => {
    const presetName = prompt('Enter a name for this book project preset:', `Journal ${bookWidthInput.value}x${bookHeightInput.value}mm`);
    if (!presetName) return;

    const presetData = {
      id: Date.now(),
      name: presetName,
      width: bookWidthInput.value,
      height: bookHeightInput.value,
      pages: pageCountInput.value,
      binding: bindingStyleSelect.value,
      paper: paperStockSelect.value,
      sheet: parentSheetSelect.value,
      grain: grainPrefSelect.value,
      pps: pagesPerSigSelect.value
    };

    savedPresets.push(presetData);
    localStorage.setItem('auravellum_presets', JSON.stringify(savedPresets));
    renderPresets();
  });

  function renderPresets() {
    if (savedPresets.length === 0) {
      presetsContainer.innerHTML = '<p class="empty-notice">No saved projects yet. Configure specs and click \'Save Project Preset\'.</p>';
      return;
    }

    presetsContainer.innerHTML = '';
    savedPresets.forEach(p => {
      const div = document.createElement('div');
      div.className = 'preset-chip';
      div.innerHTML = `
        <span class="preset-title">📓 ${escapeHtml(p.name)}</span>
        <span class="preset-meta">${p.width}×${p.height}mm &bull; ${p.pages} pages &bull; ${p.pps} pps</span>
        <div class="preset-actions">
          <button class="btn-sm" onclick="loadPreset(${p.id})">Load</button>
          <button class="btn-sm" onclick="deletePreset(${p.id})">Delete</button>
        </div>
      `;
      presetsContainer.appendChild(div);
    });
  }

  window.loadPreset = function(id) {
    const p = savedPresets.find(item => item.id === id);
    if (!p) return;

    bookWidthInput.value = p.width;
    bookHeightInput.value = p.height;
    pageCountInput.value = p.pages;
    bindingStyleSelect.value = p.binding;
    paperStockSelect.value = p.paper;
    parentSheetSelect.value = p.sheet;
    grainPrefSelect.value = p.grain;
    pagesPerSigSelect.value = p.pps;
    currentSignatureIndex = 0;

    calculateBinding();
  };

  window.deletePreset = function(id) {
    savedPresets = savedPresets.filter(item => item.id !== id);
    localStorage.setItem('auravellum_presets', JSON.stringify(savedPresets));
    renderPresets();
  };

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Auto-calculate on input changes
  [bookWidthInput, bookHeightInput, pageCountInput, bindingStyleSelect, paperStockSelect, parentSheetSelect, grainPrefSelect, pagesPerSigSelect].forEach(el => {
    el.addEventListener('change', () => {
      currentSignatureIndex = 0;
      calculateBinding();
    });
    el.addEventListener('input', () => {
      calculateBinding();
    });
  });

  // Initial calculation & render
  calculateBinding();
  renderPresets();
});
