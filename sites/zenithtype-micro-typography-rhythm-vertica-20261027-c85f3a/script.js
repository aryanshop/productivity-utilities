document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const baseFontInput = document.getElementById('base-font');
  const valBaseFont = document.getElementById('val-base-font');
  const modularScaleSelect = document.getElementById('modular-scale');
  const baseLineHeightInput = document.getElementById('base-line-height');
  const valBaseLineHeight = document.getElementById('val-base-line-height');
  const gridUnitInput = document.getElementById('grid-unit');
  const valGridUnit = document.getElementById('val-grid-unit');
  const viewportMinInput = document.getElementById('viewport-min');
  const viewportMaxInput = document.getElementById('viewport-max');
  
  const toggleGridCheckbox = document.getElementById('toggle-grid');
  const toggleFluidCheckbox = document.getElementById('toggle-fluid');
  const previewFontFamilySelect = document.getElementById('preview-font-family');

  const baselineOverlay = document.getElementById('baseline-overlay');
  const editorialCanvas = document.getElementById('editorial-canvas');
  const canvasWidthIndicator = document.getElementById('canvas-width-indicator');
  const presetBtns = document.querySelectorAll('.preset-btn');

  const prevH1 = document.getElementById('prev-h1');
  const prevH2 = document.getElementById('prev-h2');
  const prevH3 = document.getElementById('prev-h3');
  const prevQuote = document.getElementById('prev-quote');
  const prevP1 = document.getElementById('prev-p1');
  const prevP2 = document.getElementById('prev-p2');
  const prevP3 = document.getElementById('prev-p3');
  const prevList = document.getElementById('prev-list');

  const scaleMatrixBody = document.getElementById('scale-matrix-body');
  const cssCodeOutput = document.getElementById('css-code-output');
  
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  const btnReset = document.getElementById('btn-reset');
  const btnExport = document.getElementById('btn-export');
  const btnCopyCss = document.getElementById('btn-copy-css');
  const toast = document.getElementById('toast');

  // State definition
  const state = {
    baseFont: 16,
    ratio: 1.25,
    lineHeight: 1.5,
    gridUnit: 8,
    vpMin: 320,
    vpMax: 1440,
    showGrid: true,
    isFluid: true,
    fontFamily: "Georgia, Cambria, serif",
    canvasWidth: 768
  };

  // Scale tier definitions relative to base (exponent offsets)
  const scaleTiers = [
    { name: 'Display (H1)', level: 3, tag: 'h1' },
    { name: 'Heading (H2)', level: 2, tag: 'h2' },
    { name: 'Subheading (H3)', level: 1, tag: 'h3' },
    { name: 'Body / Text (P)', level: 0, tag: 'p' },
    { name: 'Small / Caption', level: -1, tag: 'small' }
  ];

  // Helper function: calculate pixels for a level
  function calcSize(base, ratio, level) {
    return base * Math.pow(ratio, level);
  }

  // Helper function: snap to nearest baseline grid unit
  function snapToGrid(size, grid) {
    return Math.round(size / grid) * grid;
  }

  // Helper function for CSS clamp
  function generateClamp(minSize, maxSize, minVp, maxVp) {
    const remMin = (minSize / 16).toFixed(3);
    const remMax = (maxSize / 16).toFixed(3);
    
    // Fluid slope calculation
    const slope = (maxSize - minSize) / (maxVp - minVp);
    const vwPart = (slope * 100).toFixed(3);
    const remOffset = ((minSize - slope * minVp) / 16).toFixed(3);
    
    return `clamp(${remMin}rem, ${vwPart}vw + ${remOffset}rem, ${remMax}rem)`;
  }

  // Update UI and calculations
  function updateApp() {
    // Update slider readouts
    valBaseFont.textContent = `${state.baseFont}px`;
    valBaseLineHeight.textContent = state.lineHeight.toFixed(2);
    valGridUnit.textContent = `${state.gridUnit}px`;

    // Update baseline grid overlay CSS property
    baselineOverlay.style.backgroundImage = `linear-gradient(to bottom, rgba(56, 189, 248, 0.25) 1px, transparent 1px)`;
    baselineOverlay.style.backgroundSize = `100% ${state.gridUnit}px`;
    if (state.showGrid) {
      baselineOverlay.classList.remove('hidden');
    } else {
      baselineOverlay.classList.add('hidden');
    }

    // Update editorial canvas styles
    editorialCanvas.style.width = `${state.canvasWidth}px`;
    editorialCanvas.style.fontFamily = state.fontFamily;

    // Calculate sizes for all tiers
    const calculatedStyles = {};

    scaleTiers.forEach(tier => {
      const exactPx = calcSize(state.baseFont, state.ratio, tier.level);
      const snappedPx = snapToGrid(exactPx, state.gridUnit);
      
      // For fluid calculation, compute a min and max size based on min/max viewports
      const minPx = exactPx;
      const maxPx = exactPx * 1.25; // 25% scale growth across viewport
      const snappedMin = snapToGrid(minPx, state.gridUnit);
      const snappedMax = snapToGrid(maxPx, state.gridUnit);

      const clampVal = generateClamp(snappedMin, Math.max(snappedMin + 2, snappedMax), state.vpMin, state.vpMax);
      
      calculatedStyles[tier.tag] = {
        name: tier.name,
        level: tier.level,
        px: snappedPx,
        rem: (snappedPx / 16).toFixed(3),
        clamp: clampVal,
        lineHeight: (Math.ceil((snappedPx * state.lineHeight) / state.gridUnit) * state.gridUnit) / snappedPx
      };
    });

    // Apply to preview elements
    applyElementStyle(prevH1, calculatedStyles['h1']);
    applyElementStyle(prevH2, calculatedStyles['h2']);
    applyElementStyle(prevH3, calculatedStyles['h3']);
    applyElementStyle(prevQuote, calculatedStyles['h2']);
    applyElementStyle(prevP1, calculatedStyles['p']);
    applyElementStyle(prevP2, calculatedStyles['p']);
    applyElementStyle(prevP3, calculatedStyles['p']);
    applyElementStyle(prevList, calculatedStyles['p']);

    // Render Matrix Table
    renderScaleMatrix(calculatedStyles);

    // Render CSS Code
    renderCssOutput(calculatedStyles);
  }

  function applyElementStyle(el, styleObj) {
    if (!el) return;
    if (state.isFluid) {
      el.style.fontSize = styleObj.clamp;
    } else {
      el.style.fontSize = `${styleObj.px}px`;
    }
    el.style.lineHeight = styleObj.lineHeight;
    el.style.marginBottom = `${Math.round(styleObj.px * 0.5 / state.gridUnit) * state.gridUnit}px`;
  }

  function renderScaleMatrix(styles) {
    scaleMatrixBody.innerHTML = '';
    scaleTiers.forEach(tier => {
      const data = styles[tier.tag];
      if (!data) return;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${data.name}</strong></td>
        <td>&times; ${Math.pow(state.ratio, data.level).toFixed(3)}</td>
        <td>${data.px}px</td>
        <td>${data.rem}rem</td>
        <td>${data.lineHeight.toFixed(2)}</td>
        <td style="font-size: ${Math.min(data.px, 32)}px; line-height: 1.2;">Ag</td>
      `;
      scaleMatrixBody.appendChild(tr);
    });
  }

  function renderCssOutput(styles) {
    let css = `/* Generated by ZenithType Engine */
:root {
  --base-font-size: ${state.baseFont}px;
  --modular-ratio: ${state.ratio};
  --base-line-height: ${state.lineHeight};
  --grid-unit: ${state.gridUnit}px;

  /* Fluid Typography Clamp Variables */
`;

    scaleTiers.forEach(tier => {
      const data = styles[tier.tag];
      const varName = `--font-${tier.tag}`;
      css += `  ${varName}: ${data.clamp};
`;
    });

    css += `}

body {
  font-size: var(--font-p);
  line-height: var(--base-line-height);
}

h1 { font-size: var(--font-h1); }
h2 { font-size: var(--font-h2); }
h3 { font-size: var(--font-h3); }
`;

    cssCodeOutput.textContent = css;
  }

  // Event Listeners for controls
  baseFontInput.addEventListener('input', (e) => {
    state.baseFont = parseInt(e.target.value, 10);
    updateApp();
  });

  modularScaleSelect.addEventListener('change', (e) => {
    state.ratio = parseFloat(e.target.value);
    updateApp();
  });

  baseLineHeightInput.addEventListener('input', (e) => {
    state.lineHeight = parseFloat(e.target.value);
    updateApp();
  });

  gridUnitInput.addEventListener('input', (e) => {
    state.gridUnit = parseInt(e.target.value, 10);
    updateApp();
  });

  viewportMinInput.addEventListener('input', (e) => {
    state.vpMin = parseInt(e.target.value, 10) || 320;
    updateApp();
  });

  viewportMaxInput.addEventListener('input', (e) => {
    state.vpMax = parseInt(e.target.value, 10) || 1440;
    updateApp();
  });

  toggleGridCheckbox.addEventListener('change', (e) => {
    state.showGrid = e.target.checked;
    updateApp();
  });

  toggleFluidCheckbox.addEventListener('change', (e) => {
    state.isFluid = e.target.checked;
    updateApp();
  });

  previewFontFamilySelect.addEventListener('change', (e) => {
    state.fontFamily = e.target.value;
    updateApp();
  });

  // Preset width buttons
  presetBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      presetBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      const width = parseInt(e.target.getAttribute('data-width'), 10);
      state.canvasWidth = width;
      canvasWidthIndicator.textContent = `${width}px`;
      editorialCanvas.style.width = `${width}px`;
    });
  });

  // Tab Switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabContents.forEach(c => c.classList.remove('active'));

      const targetTabId = `tab-${e.target.getAttribute('data-tab')}`;
      e.target.classList.add('active');
      e.target.setAttribute('aria-selected', 'true');
      document.getElementById(targetTabId).classList.add('active');
    });
  });

  // Reset Button
  btnReset.addEventListener('click', () => {
    state.baseFont = 16;
    state.ratio = 1.25;
    state.lineHeight = 1.5;
    state.gridUnit = 8;
    state.vpMin = 320;
    state.vpMax = 1440;
    state.showGrid = true;
    state.isFluid = true;
    state.fontFamily = "Georgia, Cambria, serif";
    state.canvasWidth = 768;

    baseFontInput.value = state.baseFont;
    modularScaleSelect.value = state.ratio.toString();
    baseLineHeightInput.value = state.lineHeight;
    gridUnitInput.value = state.gridUnit;
    viewportMinInput.value = state.vpMin;
    viewportMaxInput.value = state.vpMax;
    toggleGridCheckbox.checked = state.showGrid;
    toggleFluidCheckbox.checked = state.isFluid;
    previewFontFamilySelect.value = state.fontFamily;

    presetBtns.forEach(b => b.classList.remove('active'));
    document.querySelector('.preset-btn[data-width="768"]').classList.add('active');
    canvasWidthIndicator.textContent = '768px';

    updateApp();
    showToast('Reset to default typography parameters');
  });

  // Export / Copy buttons
  function showToast(message) {
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 2500);
  }

  function copyCssToClipboard() {
    const textToCopy = cssCodeOutput.textContent;
    navigator.clipboard.writeText(textToCopy).then(() => {
      showToast('CSS Code Copied to Clipboard!');
    }).catch(() => {
      showToast('Failed to copy code');
    });
  }

  btnExport.addEventListener('click', () => {
    // Switch to CSS tab and copy
    document.querySelector('.tab-btn[data-tab="css-code"]').click();
    copyCssToClipboard();
  });

  btnCopyCss.addEventListener('click', copyCssToClipboard);

  // Initial render
  updateApp();
});
