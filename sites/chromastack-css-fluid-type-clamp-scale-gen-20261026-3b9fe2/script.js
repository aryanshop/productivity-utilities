document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const minVwInput = document.getElementById('min-vw');
  const maxVwInput = document.getElementById('max-vw');
  const minFontInput = document.getElementById('min-font');
  const maxFontInput = document.getElementById('max-font');
  const ratioSelect = document.getElementById('ratio-select');
  const stepsAboveInput = document.getElementById('steps-above');
  const stepsBelowInput = document.getElementById('steps-below');
  const resetBtn = document.getElementById('reset-btn');
  
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  const cssCodeOutput = document.getElementById('css-code-output');
  const copyCodeBtn = document.getElementById('copy-code-btn');
  const exportBtn = document.getElementById('export-btn');
  const themeToggle = document.getElementById('theme-toggle');
  const toast = document.getElementById('toast');
  
  const previewCanvas = document.getElementById('preview-canvas');

  // State defaults
  const defaults = {
    minVw: 320,
    maxVw: 1440,
    minFont: 1,
    maxFont: 1.25,
    ratio: 1.25,
    stepsAbove: 4,
    stepsBelow: 2
  };

  // Theme switching
  let isDarkMode = true;
  themeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
    themeToggle.textContent = isDarkMode ? 'Toggle Light Mode' : 'Toggle Dark Mode';
  });

  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab') + '-tab';
      document.getElementById(tabId).classList.add('active');
    });
  });

  // Calculation core
  function generateScale() {
    const minVw = parseFloat(minVwInput.value) || 320;
    const maxVw = parseFloat(maxVwInput.value) || 1440;
    const minBase = parseFloat(minFontInput.value) || 1;
    const maxBase = parseFloat(maxFontInput.value) || 1.25;
    const ratio = parseFloat(ratioSelect.value) || 1.25;
    const stepsAbove = parseInt(stepsAboveInput.value) || 4;
    const stepsBelow = parseInt(stepsBelowInput.value) || 2;

    const vwDiff = maxVw - minVw;
    const remDiff = maxBase - minBase;

    let cssOutput = `:root {
  /* Viewport Boundaries */
  --fluid-min-width: ${minVw}px;
  --fluid-max-width: ${maxVw}px;

  /* Base Fluid Scale */
  --fluid-screen: 100vw;
  --fluid-bp: calc(
    (var(--fluid-screen) - var(--fluid-min-width) / 16 * 1rem) /
    (var(--fluid-max-width) - var(--fluid-min-width))
  );
`;

    const scaleItems = [];

    // Generate steps below base
    for (let i = stepsBelow; i > 0; i--) {
      const stepIndex = -i;
      const minSize = minBase / Math.pow(ratio, i);
      const maxSize = maxBase / Math.pow(ratio, i);
      const clampStr = calculateClamp(minSize, maxSize, minVw, maxVw);
      
      scaleItems.push({
        index: stepIndex,
        name: `step-${stepIndex}`,
        minSize,
        maxSize,
        clamp: clampStr
      });
    }

    // Base step (step 0)
    const baseClamp = calculateClamp(minBase, maxBase, minVw, maxVw);
    scaleItems.push({
      index: 0,
      name: 'step-0',
      minSize: minBase,
      maxSize: maxBase,
      clamp: baseClamp
    });

    // Generate steps above base
    for (let i = 1; i <= stepsAbove; i++) {
      const minSize = minBase * Math.pow(ratio, i);
      const maxSize = maxBase * Math.pow(ratio, i);
      const clampStr = calculateClamp(minSize, maxSize, minVw, maxVw);
      
      scaleItems.push({
        index: i,
        name: `step-${i}`,
        minSize,
        maxSize,
        clamp: clampStr
      });
    }

    // Format CSS
    scaleItems.forEach(item => {
      cssOutput += `  --${item.name}: ${item.clamp}; /* min: ${item.minSize.toFixed(2)}rem, max: ${item.maxSize.toFixed(2)}rem */\n`;
    });

    cssOutput += `}`;

    cssCodeOutput.textContent = cssOutput;
    updatePreviewStyles(scaleItems);
  }

  function calculateClamp(minRem, maxRem, minVw, maxVw) {
    const minPx = minRem * 16;
    const maxPx = maxRem * 16;
    const slope = (maxPx - minPx) / (maxVw - minVw);
    const interceptRem = (minPx - slope * minVw) / 16;
    
    const slopeVw = (slope * 100).toFixed(4);
    const intercept = interceptRem.toFixed(4);
    
    return `clamp(${minRem.toFixed(3)}rem, ${intercept}rem + ${slopeVw}vw, ${maxRem.toFixed(3)}rem)`;
  }

  function updatePreviewStyles(scaleItems) {
    // Map scale items to preview items
    const previewItems = previewCanvas.querySelectorAll('.preview-item');
    
    // Find corresponding steps or defaults
    previewItems.forEach(el => {
      const level = el.getAttribute('data-level');
      let targetIndex = 0;
      if (level === 'h1') targetIndex = 4;
      else if (level === 'h2') targetIndex = 3;
      else if (level === 'h3') targetIndex = 2;
      else if (level === 'h4') targetIndex = 1;
      else if (level === 'body') targetIndex = 0;
      else if (level === 'small') targetIndex = -1;

      const found = scaleItems.find(s => s.index === targetIndex);
      const sample = el.querySelector('.type-sample');
      const tag = el.querySelector('.token-tag');
      
      if (found && sample && tag) {
        sample.style.fontSize = found.clamp;
        tag.textContent = `--step-${found.index} (${found.minSize.toFixed(2)}rem -> ${found.maxSize.toFixed(2)}rem)`;
      }
    });
  }

  // Toast notification helper
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  // Copy button action
  const copyHandler = () => {
    const codeText = cssCodeOutput.textContent;
    navigator.clipboard.writeText(codeText).then(() => {
      showToast('CSS variables copied to clipboard!');
    }).catch(() => {
      showToast('Failed to copy code.');
    });
  };

  copyCodeBtn.addEventListener('click', copyHandler);
  exportBtn.addEventListener('click', () => {
    // Switch to code tab and copy
    tabBtns[1].click();
    copyHandler();
  });

  // Reset defaults
  resetBtn.addEventListener('click', () => {
    minVwInput.value = defaults.minVw;
    maxVwInput.value = defaults.maxVw;
    minFontInput.value = defaults.minFont;
    maxFontInput.value = defaults.maxFont;
    ratioSelect.value = defaults.ratio;
    stepsAboveInput.value = defaults.stepsAbove;
    stepsBelowInput.value = defaults.stepsBelow;
    generateScale();
    showToast('Reset to default values');
  });

  // Input event listeners for realtime calculation
  [minVwInput, maxVwInput, minFontInput, maxFontInput, ratioSelect, stepsAboveInput, stepsBelowInput].forEach(input => {
    input.addEventListener('input', generateScale);
  });

  // Initial generation on load
  generateScale();
});
