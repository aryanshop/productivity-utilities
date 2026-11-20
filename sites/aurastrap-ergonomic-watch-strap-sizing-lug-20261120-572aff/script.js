document.addEventListener('DOMContentLoaded', () => {
  const inputs = {
    wristCirc: document.getElementById('wrist-circ'),
    lugWidth: document.getElementById('lug-width'),
    buckleWidth: document.getElementById('buckle-width'),
    lugToLug: document.getElementById('lug-to-lug'),
    strapMat: document.getElementById('strap-mat'),
    matThick: document.getElementById('mat-thick'),
    claspType: document.getElementById('clasp-type'),
    holeCount: document.getElementById('hole-count'),
    keeperStyle: document.getElementById('keeper-style'),
    tailShape: document.getElementById('tail-shape')
  };

  const outputs = {
    shortLen: document.getElementById('val-short-len'),
    longLen: document.getElementById('val-long-len'),
    fitRange: document.getElementById('val-fit-range'),
    blankArea: document.getElementById('val-blank-area'),
    summaryList: document.getElementById('summary-list')
  };

  const canvas = document.getElementById('blueprint-canvas');
  const ctx = canvas ? canvas.getContext('2d') : null;

  const btnExport = document.getElementById('btn-export');
  const btnReset = document.getElementById('btn-reset');

  const DEFAULTS = {
    wristCirc: 175,
    lugWidth: 20,
    buckleWidth: 16,
    lugToLug: 48,
    strapMat: 'leather',
    matThick: 3.2,
    claspType: 'tang',
    holeCount: 7,
    keeperStyle: 'double',
    tailShape: 'pointed'
  };

  function loadState() {
    try {
      const saved = localStorage.getItem('aurastrap_state');
      if (saved) {
        const data = JSON.parse(saved);
        Object.keys(inputs).forEach(key => {
          if (data[key] !== undefined && inputs[key]) {
            inputs[key].value = data[key];
          }
        });
      }
    } catch (e) {
      console.error('Failed to load saved state', e);
    }
  }

  function saveState() {
    try {
      const data = {};
      Object.keys(inputs).forEach(key => {
        if (inputs[key]) {
          data[key] = inputs[key].value;
        }
      });
      localStorage.setItem('aurastrap_state', JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save state', e);
    }
  }

  function calculateAndRender() {
    const wrist = parseFloat(inputs.wristCirc.value) || 175;
    const lug = parseFloat(inputs.lugWidth.value) || 20;
    const buckle = parseFloat(inputs.buckleWidth.value) || 16;
    const l2l = parseFloat(inputs.lugToLug.value) || 48;
    const thick = parseFloat(inputs.matThick.value) || 3.2;
    const holes = parseInt(inputs.holeCount.value) || 7;

    // Horology math for standard watch strap sizing:
    // Wrist radius approx = wrist / (2 * PI)
    // Available flat wrist arc = wrist - l2l
    // Ideal short piece (12 o'clock side) is typically 70mm to 80mm depending on wrist.
    // Ideal long piece (6 o'clock side) covers remainder + overlap.
    
    let idealShort = 75;
    if (wrist < 150) idealShort = 65;
    if (wrist > 200) idealShort = 85;

    const totalStrapNeeded = (wrist - l2l);
    let idealLong = Math.round(totalStrapNeeded - idealShort + 35); // 35mm overlap & tuck
    if (idealLong < 105) idealLong = 105;
    if (idealLong > 140) idealLong = 140;

    // Fit range calculation
    // Sizing holes typically start 30mm from tip and spaced 6mm apart.
    const centerHoleOffset = idealLong - 40;
    const holeSpacing = 6;
    const minFit = wrist - ((holes / 2) * holeSpacing);
    const maxFit = wrist + ((holes / 2) * holeSpacing);

    // Blank area calculation (approximate rectangular strips with taper)
    // Short piece area = avgWidth * length
    const shortAvgW = (lug + buckle) / 2;
    const longAvgW = (lug + buckle) / 2;
    const shortArea = shortAvgW * idealShort;
    const longArea = longAvgW * idealLong;
    const totalBlankArea = Math.round(shortArea + longArea);

    // Update UI text metrics
    if (outputs.shortLen) outputs.shortLen.textContent = `${idealShort} mm`;
    if (outputs.longLen) outputs.longLen.textContent = `${idealLong} mm`;
    if (outputs.fitRange) outputs.fitRange.textContent = `${Math.round(minFit)} - ${Math.round(maxFit)} mm`;
    if (outputs.blankArea) outputs.blankArea.textContent = `${totalBlankArea.toLocaleString()} mm²`;

    // Summary notes updates
    if (outputs.summaryList) {
      outputs.summaryList.innerHTML = `
        <li>Calculated for a ${wrist}mm wrist circumference and ${l2l}mm watch case span.</li>
        <li>Recommended hole spacing of 6mm provides ${holes} sizing positions across a ${Math.round(maxFit - minFit)}mm adjustment window.</li>
        <li>Material thickness of ${thick}mm requires ${thick > 3.5 ? 'skiving/beveling at the lug ends for smooth spring bar clearance' : 'standard straight edge finishing'}.</li>
        <li>Minimum leather blank sizing required: ~${Math.round(shortAvgW + 10)}mm width by ${idealShort + idealLong + 30}mm length.</li>
      `;
    }

    // Render Canvas Blueprint
    if (ctx && canvas) {
      drawBlueprint(ctx, canvas.width, canvas.height, lug, buckle, idealShort, idealLong, holes, inputs.tailShape.value);
    }

    saveState();
  }

  function drawBlueprint(c, w, h, lug, buckle, shortLen, longLen, holes, tailStyle) {
    c.clearRect(0, 0, w, h);

    // Background grid
    c.strokeStyle = '#273447';
    c.lineWidth = 1;
    c.beginPath();
    for (let x = 0; x < w; x += 20) {
      c.moveTo(x, 0);
      c.lineTo(x, h);
    }
    for (let y = 0; y < h; y += 20) {
      c.moveTo(0, y);
      c.lineTo(w, y);
    }
    c.stroke();

    // Scale factor to fit canvas
    // Max length is ~210mm total. Canvas width is 700px. Let's use 2.5 pixels per mm.
    const scale = 2.4;
    const startX = 60;
    const startY = h / 2;

    // Draw Short Piece (Top)
    const sLenPx = shortLen * scale;
    const lugPx = lug * scale;
    const buckPx = buckle * scale;

    c.save();
    c.translate(startX, startY - 50);

    // Short piece polygon
    c.fillStyle = 'rgba(74, 144, 226, 0.15)';
    c.strokeStyle = '#4a90e2';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, -lugPx / 2);
    c.lineTo(sLenPx - 15, -buckPx / 2);
    c.lineTo(sLenPx, 0); // buckle end tab
    c.lineTo(sLenPx - 15, buckPx / 2);
    c.lineTo(0, lugPx / 2);
    c.closePath();
    c.fill();
    c.stroke();

    // Spring bar loop notch at left
    c.fillStyle = '#0f141c';
    c.fillRect(-4, -lugPx / 2 + 4, 8, lugPx - 8);

    // Label
    c.fillStyle = '#f0f4f8';
    c.font = '12px sans-serif';
    c.fillText(`Short Piece (${shortLen}mm)`, 10, -15);
    c.restore();

    // Draw Long Piece (Bottom)
    const lLenPx = longLen * scale;

    c.save();
    c.translate(startX, startY + 50);

    // Long piece polygon
    c.fillStyle = 'rgba(226, 125, 96, 0.15)';
    c.strokeStyle = '#e27d60';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, -lugPx / 2);
    
    // Taper towards tail
    const tailWidth = lug * 0.8 * scale;
    c.lineTo(lLenPx - 30, -tailWidth / 2);

    // Tail shape
    if (tailStyle === 'pointed') {
      c.lineTo(lLenPx, 0);
    } else if (tailStyle === 'rounded') {
      c.arc(lLenPx - 15, 0, tailWidth / 2, -Math.PI / 2, Math.PI / 2, false);
    } else {
      // flat
      c.lineTo(lLenPx, -tailWidth / 2);
      c.lineTo(lLenPx, tailWidth / 2);
    }

    c.lineTo(lLenPx - 30, tailWidth / 2);
    c.lineTo(0, lugPx / 2);
    c.closePath();
    c.fill();
    c.stroke();

    // Spring bar notch
    c.fillStyle = '#0f141c';
    c.fillRect(-4, -lugPx / 2 + 4, 8, lugPx - 8);

    // Draw sizing holes
    c.fillStyle = '#d4af37';
    const holeStartFromTip = 35 * scale;
    const spacingPx = 6 * scale;
    const firstHoleX = lLenPx - holeStartFromTip - ((holes - 1) * spacingPx);

    for (let i = 0; i < holes; i++) {
      const hx = firstHoleX + (i * spacingPx);
      c.beginPath();
      c.arc(hx, 0, 2.5, 0, Math.PI * 2);
      c.fill();
    }

    // Label
    c.fillStyle = '#f0f4f8';
    c.font = '12px sans-serif';
    c.fillText(`Long Piece (${longLen}mm, ${holes} holes)`, 10, -15);

    c.restore();
  }

  // Event Listeners
  Object.values(inputs).forEach(input => {
    if (input) {
      input.addEventListener('input', calculateAndRender);
      input.addEventListener('change', calculateAndRender);
    }
  });

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      Object.keys(DEFAULTS).forEach(key => {
        if (inputs[key]) {
          inputs[key].value = DEFAULTS[key];
        }
      });
      localStorage.removeItem('aurastrap_state');
      calculateAndRender();
    });
  }

  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const data = {};
      Object.keys(inputs).forEach(key => {
        if (inputs[key]) data[key] = inputs[key].value;
      });
      data.calculatedShortLen = outputs.shortLen.textContent;
      data.calculatedLongLen = outputs.longLen.textContent;
      data.calculatedFitRange = outputs.fitRange.textContent;

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'aurastrap-blueprint-spec.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  // Initial load
  loadState();
  calculateAndRender();
});
