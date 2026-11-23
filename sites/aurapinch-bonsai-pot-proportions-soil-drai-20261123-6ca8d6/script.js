document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const inputHeight = document.getElementById('tree-height');
  const inputCaliper = document.getElementById('trunk-caliper');
  const inputSpread = document.getElementById('canopy-spread');
  const selectStyle = document.getElementById('bonsai-style');

  const soilAkadama = document.getElementById('soil-akadama');
  const soilPumice = document.getElementById('soil-pumice');
  const soilLava = document.getElementById('soil-lava');
  const soilCompost = document.getElementById('soil-compost');

  const valAkadama = document.getElementById('val-akadama');
  const valPumice = document.getElementById('val-pumice');
  const valLava = document.getElementById('val-lava');
  const valCompost = document.getElementById('val-compost');

  const soilWarning = document.getElementById('soil-warning');
  const soilSum = document.getElementById('soil-sum');

  const outPotLength = document.getElementById('out-pot-length');
  const outPotDepth = document.getElementById('out-pot-depth');
  const outPotShape = document.getElementById('out-pot-shape');
  const outOffset = document.getElementById('out-offset');

  const scoreDrainage = document.getElementById('score-drainage');
  const scoreWater = document.getElementById('score-water');
  const scoreCec = document.getElementById('score-cec');

  const barDrainage = document.getElementById('bar-drainage');
  const barWater = document.getElementById('bar-water');
  const barCec = document.getElementById('bar-cec');

  const soilRecText = document.getElementById('soil-rec-text');
  const canvas = document.getElementById('bonsai-canvas');
  const ctx = canvas.getContext('2d');

  const btnReset = document.getElementById('btn-reset');
  const btnSave = document.getElementById('btn-save');
  const presetContainer = document.getElementById('preset-container');

  // State / Presets storage key
  const STORAGE_KEY = 'aurapinch_presets_v1';

  function init() {
    attachListeners();
    updateAll();
    renderPresetsList();
  }

  function attachListeners() {
    const inputs = [inputHeight, inputCaliper, inputSpread, selectStyle];
    inputs.forEach(el => el.addEventListener('input', updateAll));

    const sliders = [soilAkadama, soilPumice, soilLava, soilCompost];
    sliders.forEach(el => el.addEventListener('input', () => {
      syncSliders(el);
      updateAll();
    }));

    btnReset.addEventListener('click', resetDefaults);
    btnSave.addEventListener('click', savePreset);
  }

  function syncSliders(changedSlider) {
    // Ensure smooth distribution or simple warning validation
    valAkadama.textContent = soilAkadama.value;
    valPumice.textContent = soilPumice.value;
    valLava.textContent = soilLava.value;
    valCompost.textContent = soilCompost.value;
  }

  function getSoilValues() {
    return {
      akadama: parseInt(soilAkadama.value, 10),
      pumice: parseInt(soilPumice.value, 10),
      lava: parseInt(soilLava.value, 10),
      compost: parseInt(soilCompost.value, 10)
    };
  }

  function updateAll() {
    const height = parseFloat(inputHeight.value) || 50;
    const caliper = parseFloat(inputCaliper.value) || 5;
    const spread = parseFloat(inputSpread.value) || 40;
    const style = selectStyle.value;

    const soil = getSoilValues();
    const totalSoil = soil.akadama + soil.pumice + soil.lava + soil.compost;

    if (totalSoil !== 100) {
      soilWarning.classList.remove('hidden');
      soilSum.textContent = totalSoil;
    } else {
      soilWarning.classList.add('hidden');
    }

    // Bonsai Aesthetic Calculations
    // Pot length: 2/3 of tree height for conifers/upright, or 2/3 of spread for broad canopy.
    let baseMetric = Math.max(height * 0.65, spread * 0.7);
    if (style === 'cascade') baseMetric = height * 0.4; // Cascade pots are smaller/square/deep
    if (style === 'bunjin') baseMetric = spread * 0.5;

    let potLength = baseMetric;
    let potDepth = caliper * 1.0; // Rule of thumb: pot depth roughly equals trunk caliper
    if (style === 'cascade') potDepth = potLength * 1.2;
    if (style === 'chokkan') potDepth = Math.max(caliper * 0.9, 3);

    // Shape & offset recommendations
    let shapeText = 'Oval or Rectangular';
    let offsetText = 'Golden Ratio (38% from left/right)';

    if (style === 'chokkan') {
      shapeText = 'Rectangular or Oval (Deep/Medium)';
      offsetText = 'Slightly off-center (approx 40%)';
    } else if (style === 'moyogi') {
      shapeText = 'Oval or Rounded Rectangular';
      offsetText = 'Balanced Asymmetry (35-40% from edge)';
    } else if (style === 'shakan') {
      shapeText = 'Oval, Rectangular or Tray';
      offsetText = 'Opposite direction of lean (Counter-balance)';
    } else if (style === 'cascade') {
      shapeText = 'Tall Round or Hexagonal Pot';
      offsetText = 'Top corner, opposite cascade flow';
    } else if (style === 'bunjin') {
      shapeText = 'Small Round or Oval Accent Pot';
      offsetText = 'Dramatic Asymmetry (Near edge)';
    }

    outPotLength.textContent = `${potLength.toFixed(1)} cm`;
    outPotDepth.textContent = `${potDepth.toFixed(1)} cm`;
    outPotShape.textContent = shapeText;
    outOffset.textContent = offsetText;

    // Soil Hydraulic Metrics Calculation
    // Drainage: Pumice (high) + Lava (high) + Akadama (med) - Compost (low)
    const drainageScore = Math.min(100, Math.max(10, (soil.pumice * 1.1) + (soil.lava * 1.2) + (soil.akadama * 0.6) - (soil.compost * 0.8)));
    // Water Retention: Akadama (high) + Compost (high) - Pumice (low) - Lava (low)
    const waterScore = Math.min(100, Math.max(10, (soil.akadama * 1.1) + (soil.compost * 1.5) - (soil.pumice * 0.3) - (soil.lava * 0.2)));
    // CEC (Cation Exchange Capacity): Akadama (high) + Compost (high) - Pumice (low) - Lava (low)
    const cecScore = Math.min(100, Math.max(5, (soil.akadama * 1.2) + (soil.compost * 1.8) - (soil.pumice * 0.1) - (soil.lava * 0.1)));

    scoreDrainage.textContent = `${drainageScore.toFixed(0)}%`;
    barDrainage.style.width = `${drainageScore}%`;

    scoreWater.textContent = `${waterScore.toFixed(0)}%`;
    barWater.style.width = `${waterScore}%`;

    scoreCec.textContent = `${cecScore.toFixed(0)}%`;
    barCec.style.width = `${cecScore}%`;

    // Generate dynamic recommendation
    let recMessage = '';
    if (drainageScore > 75) {
      recMessage = 'High drainage mix. Ideal for conifers (Pine, Juniper) in humid climates or heavy rainfall zones. Ensure regular watering.';
    } else if (waterScore > 65) {
      recMessage = 'High moisture retention mix. Excellent for deciduous trees (Maple, Elm) and tropical bonsai during active growth seasons.';
    } else {
      recMessage = 'Balanced all-purpose bonsai soil mix. Suitable for most established broadleaf evergreens and intermediate styling.';
    }
    soilRecText.textContent = recMessage;

    renderCanvas(height, caliper, spread, style, potLength, potDepth);
  }

  function renderCanvas(height, caliper, spread, style, potLength, potDepth) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height - 70;

    // Draw Grid Background
    ctx.strokeStyle = '#1e2420';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 30) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Scale factor for drawing
    const scale = 2.2;
    const pLenScaled = Math.min(potLength * scale, 350);
    const pDepScaled = Math.max(potDepth * scale, 25);

    // Draw Pot
    ctx.fillStyle = '#6b4f3b';
    ctx.strokeStyle = '#8c674e';
    ctx.lineWidth = 2;

    // Pot rim & body
    ctx.beginPath();
    ctx.roundRect(cx - pLenScaled / 2, cy - pDepScaled, pLenScaled, pDepScaled, [4, 4, 8, 8]);
    ctx.fill();
    ctx.stroke();

    // Soil line inside pot
    ctx.fillStyle = '#3a2d24';
    ctx.beginPath();
    ctx.ellipse(cx, cy - pDepScaled + 4, pLenScaled / 2 - 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw Tree Trunk & Canopy
    ctx.strokeStyle = '#4a3728';
    ctx.lineWidth = Math.max(caliper * 1.5, 3);
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(cx, cy - pDepScaled + 4);

    if (style === 'chokkan') {
      ctx.lineTo(cx, cy - pDepScaled - height * scale * 0.7);
      ctx.stroke();
      drawCanopy(cx, cy - pDepScaled - height * scale * 0.7, spread * scale * 0.8);
    } else if (style === 'moyogi') {
      ctx.bezierCurveTo(cx + 25, cy - pDepScaled - height * scale * 0.3,
                        cx - 20, cy - pDepScaled - height * scale * 0.6,
                        cx + 5, cy - pDepScaled - height * scale * 0.8);
      ctx.stroke();
      drawCanopy(cx + 5, cy - pDepScaled - height * scale * 0.8, spread * scale * 0.85);
    } else if (style === 'shakan') {
      ctx.lineTo(cx - 50, cy - pDepScaled - height * scale * 0.6);
      ctx.stroke();
      drawCanopy(cx - 50, cy - pDepScaled - height * scale * 0.6, spread * scale * 0.75);
    } else if (style === 'cascade') {
      ctx.bezierCurveTo(cx + 40, cy - pDepScaled - 10,
                        cx + 80, cy - pDepScaled + 60,
                        cx + 90, cy - pDepScaled + 90);
      ctx.stroke();
      drawCanopy(cx + 90, cy - pDepScaled + 90, spread * scale * 0.6);
    } else {
      // Bunjin
      ctx.bezierCurveTo(cx - 30, cy - pDepScaled - height * scale * 0.4,
                        cx + 30, cy - pDepScaled - height * scale * 0.7,
                        cx, cy - pDepScaled - height * scale * 0.85);
      ctx.stroke();
      drawCanopy(cx, cy - pDepScaled - height * scale * 0.85, spread * scale * 0.5);
    }

    // Dimension labels on canvas
    ctx.fillStyle = '#9aa39d';
    ctx.font = '11px system-ui';
    ctx.fillText(`Pot: ${potLength.toFixed(1)}cm`, cx - 35, cy + 18);
  }

  function drawCanopy(x, y, radius) {
    ctx.fillStyle = 'rgba(82, 163, 99, 0.45)';
    ctx.strokeStyle = '#52a363';
    ctx.lineWidth = 1.5;

    // Multi-lobed bonsai foliage pads
    const pads = [
      { dx: 0, dy: 0, r: radius * 0.5 },
      { dx: -radius * 0.4, dy: radius * 0.2, r: radius * 0.35 },
      { dx: radius * 0.4, dy: radius * 0.1, r: radius * 0.35 },
      { dx: 0, dy: -radius * 0.3, r: radius * 0.4 }
    ];

    pads.forEach(pad => {
      ctx.beginPath();
      ctx.arc(x + pad.dx, y + pad.dy, pad.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
  }

  function resetDefaults() {
    inputHeight.value = 50;
    inputCaliper.value = 5;
    inputSpread.value = 40;
    selectStyle.value = 'moyogi';

    soilAkadama.value = 50;
    soilPumice.value = 30;
    soilLava.value = 15;
    soilCompost.value = 5;

    valAkadama.textContent = '50';
    valPumice.textContent = '30';
    valLava.textContent = '15';
    valCompost.textContent = '5';

    updateAll();
  }

  function savePreset() {
    const presets = loadPresets();
    const name = prompt('Enter a name for this Bonsai Lab preset:', `Bonsai Setup ${presets.length + 1}`);
    if (!name) return;

    const currentConfig = {
      id: Date.now(),
      name,
      height: inputHeight.value,
      caliper: inputCaliper.value,
      spread: inputSpread.value,
      style: selectStyle.value,
      akadama: soilAkadama.value,
      pumice: soilPumice.value,
      lava: soilLava.value,
      compost: soilCompost.value
    };

    presets.push(currentConfig);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
      renderPresetsList();
    } catch (e) {
      console.error('Failed to save preset to localStorage', e);
    }
  }

  function loadPresets() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  window.loadPresetItem = function(id) {
    const presets = loadPresets();
    const found = presets.find(p => p.id === id);
    if (!found) return;

    inputHeight.value = found.height;
    inputCaliper.value = found.caliper;
    inputSpread.value = found.spread;
    selectStyle.value = found.style;

    soilAkadama.value = found.akadama;
    soilPumice.value = found.pumice;
    soilLava.value = found.lava;
    soilCompost.value = found.compost;

    valAkadama.textContent = found.akadama;
    valPumice.textContent = found.pumice;
    valLava.textContent = found.lava;
    valCompost.textContent = found.compost;

    updateAll();
  };

  window.deletePresetItem = function(id) {
    let presets = loadPresets();
    presets = presets.filter(p => p.id !== id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
      renderPresetsList();
    } catch (e) {
      console.error('Failed to delete preset', e);
    }
  };

  function renderPresetsList() {
    const presets = loadPresets();
    if (presets.length === 0) {
      presetContainer.innerHTML = '<p class="empty-text">No saved presets yet.</p>';
      return;
    }

    presetContainer.innerHTML = presets.map(p => `
      <div class="preset-item">
        <span onclick="loadPresetItem(${p.id})" title="Click to load">
          <strong>${escapeHTML(p.name)}</strong> (${p.style})
        </span>
        <button onclick="deletePresetItem(${p.id})" title="Delete">
          &times;
        </button>
      </div>
    `).join('');
  }

  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag));
  }

  init();
});
