document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const projectTypeEl = document.getElementById('project-type');
  const targetWidthEl = document.getElementById('target-width');
  const targetHeightEl = document.getElementById('target-height');
  const yarnWeightEl = document.getElementById('yarn-weight');
  const gaugeStitchesEl = document.getElementById('gauge-stitches');
  const gaugeRowsEl = document.getElementById('gauge-rows');
  const skeinYardageEl = document.getElementById('skein-yardage');
  const skeinCostEl = document.getElementById('skein-cost');
  const bufferPctEl = document.getElementById('buffer-pct');
  const bufferValEl = document.getElementById('buffer-val');

  const outYardageEl = document.getElementById('out-yardage');
  const outMetersEl = document.getElementById('out-meters');
  const outSkeinsEl = document.getElementById('out-skeins');
  const outSkeinNoteEl = document.getElementById('out-skein-note');
  const outCostEl = document.getElementById('out-cost');
  const outWeightEl = document.getElementById('out-weight');
  const outStitchesEl = document.getElementById('out-stitches');
  const outRowsEl = document.getElementById('out-rows');
  const outTotalStEl = document.getElementById('out-total-st');
  const canvasCaptionEl = document.getElementById('canvas-caption');

  const btnReset = document.getElementById('btn-reset');
  const btnExport = document.getElementById('btn-export');
  const exportModal = document.getElementById('export-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCopy = document.getElementById('btn-copy');
  const exportText = document.getElementById('export-text');

  const canvas = document.getElementById('preview-canvas');
  const ctx = canvas.getContext('2d');

  // Presets for Project Types (Default dimensions & yarn weights)
  const projectPresets = {
    scarf: { w: 10, h: 60, weight: 'worsted', st: 20, rows: 26, sYd: 220, sCost: 12 },
    hat: { w: 18, h: 9, weight: 'worsted', st: 18, rows: 24, sYd: 200, sCost: 12 },
    sweater: { w: 40, h: 26, weight: 'worsted', st: 18, rows: 24, sYd: 200, sCost: 14 },
    cardigan: { w: 42, h: 28, weight: 'dk', st: 22, rows: 30, sYd: 250, sCost: 16 },
    socks: { w: 8, h: 9, weight: 'fingering', st: 32, rows: 44, sYd: 400, sCost: 24 },
    blanket: { w: 45, h: 60, weight: 'bulky', st: 12, rows: 16, sYd: 130, sCost: 10 },
    shawl: { w: 60, h: 30, weight: 'fingering', st: 24, rows: 32, sYd: 400, sCost: 22 },
    custom: { w: 12, h: 12, weight: 'dk', st: 20, rows: 28, sYd: 220, sCost: 14 }
  };

  // Yarn weight default profiles (approximate grams per 100yd and grams per 100g standard)
  const yarnWeights = {
    lace: { gramsPer100Yd: 12 },
    fingering: { gramsPer100Yd: 25 },
    sport: { gramsPer100Yd: 33 },
    dk: { gramsPer100Yd: 40 },
    worsted: { gramsPer100Yd: 50 },
    bulky: { gramsPer100Yd: 75 },
    'super-bulky': { gramsPer100Yd: 125 }
  };

  function handleProjectTypeChange() {
    const type = projectTypeEl.value;
    if (projectPresets[type]) {
      const p = projectPresets[type];
      targetWidthEl.value = p.w;
      targetHeightEl.value = p.h;
      yarnWeightEl.value = p.weight;
      gaugeStitchesEl.value = p.st;
      gaugeRowsEl.value = p.rows;
      skeinYardageEl.value = p.sYd;
      skeinCostEl.value = p.sCost;
    }
    calculate();
  }

  function calculate() {
    const w = parseFloat(targetWidthEl.value) || 0;
    const h = parseFloat(targetHeightEl.value) || 0;
    const gSt = parseFloat(gaugeStitchesEl.value) || 1;
    const gRow = parseFloat(gaugeRowsEl.value) || 1;
    const sYd = parseFloat(skeinYardageEl.value) || 100;
    const sCost = parseFloat(skeinCostEl.value) || 0;
    const buffer = parseFloat(bufferPctEl.value) / 100;
    const selectedWeight = yarnWeightEl.value;

    bufferValEl.textContent = `${Math.round(buffer * 100)}%`;

    // Calculations
    // Stitches per inch = gSt / 4, Rows per inch = gRow / 4
    const stPerInch = gSt / 4;
    const rowPerInch = gRow / 4;

    const castOnStitches = Math.round(w * stPerInch);
    const totalRows = Math.round(h * rowPerInch);
    const totalStitches = castOnStitches * totalRows;

    // Approximation of yarn length based on stitch dimensions and gauge
    // Standard average yarn length per 1 knit stitch ~ (stitch width + row height) * 1.25
    const stitchWidth = 4 / gSt;
    const rowHeight = 4 / gRow;
    const inchesPerStitch = (stitchWidth + rowHeight) * 1.35;
    
    const rawInches = totalStitches * inchesPerStitch;
    const rawYards = rawInches / 36;
    const bufferedYards = Math.ceil(rawYards * (1 + buffer));
    const bufferedMeters = Math.round(bufferedYards * 0.9144);

    const exactSkeins = bufferedYards / sYd;
    const totalSkeins = Math.ceil(exactSkeins);
    const totalCost = totalSkeins * sCost;

    // Estimated weight in grams
    const gPerYd = (yarnWeights[selectedWeight] ? yarnWeights[selectedWeight].gramsPer100Yd : 40) / 100;
    const totalGrams = Math.round(bufferedYards * gPerYd);

    // Update DOM Outputs
    outYardageEl.textContent = `${bufferedYards.toLocaleString()} yd`;
    outMetersEl.textContent = `${bufferedMeters.toLocaleString()} m`;
    outSkeinsEl.textContent = `${totalSkeins} skein${totalSkeins !== 1 ? 's' : ''}`;
    outSkeinNoteEl.textContent = `Exact calculated: ${exactSkeins.toFixed(1)} skeins`;
    outCostEl.textContent = `$${totalCost.toFixed(2)}`;
    outWeightEl.textContent = `${totalGrams} g (${(totalGrams / 28.35).toFixed(1)} oz)`;

    outStitchesEl.textContent = castOnStitches.toLocaleString();
    outRowsEl.textContent = totalRows.toLocaleString();
    outTotalStEl.textContent = totalStitches.toLocaleString();

    canvasCaptionEl.textContent = `${w}" wide × ${h}" long (${projectTypeEl.options[projectTypeEl.selectedIndex].text})`;

    drawPreview(w, h);
  }

  function drawPreview(w, h) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const maxCanvasW = 260;
    const maxCanvasH = 160;

    if (w <= 0 || h <= 0) return;

    let drawW = maxCanvasW;
    let drawH = (h / w) * drawW;

    if (drawH > maxCanvasH) {
      drawH = maxCanvasH;
      drawH_ratio = maxCanvasH / h;
      drawW = (w / h) * drawH;
    }

    const startX = (canvas.width - drawW) / 2;
    const startY = (canvas.height - drawH) / 2;

    // Draw yarn background pattern
    ctx.fillStyle = '#f5ece4';
    ctx.strokeStyle = '#8c5830';
    ctx.lineWidth = 2;
    ctx.fillRect(startX, startY, drawW, drawH);
    ctx.strokeRect(startX, startY, drawW, drawH);

    // Draw knit lines effect
    ctx.strokeStyle = '#e5d3c5';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = startY + 10; i < startY + drawH; i += 10) {
      ctx.moveTo(startX, i);
      ctx.lineTo(startX + drawW, i);
    }
    ctx.stroke();
  }

  function resetDefaults() {
    projectTypeEl.value = 'scarf';
    handleProjectTypeChange();
    bufferPctEl.value = 10;
    calculate();
  }

  function openExportModal() {
    const typeName = projectTypeEl.options[projectTypeEl.selectedIndex].text;
    const text = `--- KNITCALC PROJECT SUMMARY ---
Project Type: ${typeName}
Dimensions: ${targetWidthEl.value}" width × ${targetHeightEl.value}" length
Yarn Weight: ${yarnWeightEl.value.toUpperCase()}
Gauge: ${gaugeStitchesEl.value} sts × ${gaugeRowsEl.value} rows per 4"

ESTIMATES:
- Total Yardage: ${outYardageEl.textContent}
- Skeins Required: ${outSkeinsEl.textContent} (${skeinYardageEl.value}yd/skein)
- Estimated Cost: ${outCostEl.textContent}
- Total Project Weight: ${outWeightEl.textContent}

PATTERN DETAILS:
- Cast-on Stitches: ${outStitchesEl.textContent}
- Total Rows: ${outRowsEl.textContent}
- Total Stitches: ${outTotalStEl.textContent}
----------------------------------`;
    
    exportText.value = text;
    exportModal.classList.remove('hidden');
  }

  // Event Listeners
  projectTypeEl.addEventListener('change', handleProjectTypeChange);
  targetWidthEl.addEventListener('input', calculate);
  targetHeightEl.addEventListener('input', calculate);
  yarnWeightEl.addEventListener('change', calculate);
  gaugeStitchesEl.addEventListener('input', calculate);
  gaugeRowsEl.addEventListener('input', calculate);
  skeinYardageEl.addEventListener('input', calculate);
  skeinCostEl.addEventListener('input', calculate);
  bufferPctEl.addEventListener('input', calculate);

  btnReset.addEventListener('click', resetDefaults);
  btnExport.addEventListener('click', openExportModal);
  btnCloseModal.addEventListener('click', () => exportModal.classList.add('hidden'));
  exportModal.addEventListener('click', (e) => {
    if (e.target === exportModal) exportModal.classList.add('hidden');
  });

  btnCopy.addEventListener('click', () => {
    exportText.select();
    navigator.clipboard.writeText(exportText.value).then(() => {
      btnCopy.textContent = 'Copied successfully!';
      setTimeout(() => {
        btnCopy.textContent = 'Copy to Clipboard';
      }, 2000);
    });
  });

  // Initial calculation
  handleProjectTypeChange();
});
