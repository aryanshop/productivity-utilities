document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const inputCfmi = document.getElementById('airflow-cfm');
  const selectShape = document.getElementById('duct-shape');
  const groupRound = document.getElementById('group-round');
  const groupRect = document.getElementById('group-rectangular');
  const inputDiameter = document.getElementById('duct-diameter');
  const inputWidth = document.getElementById('duct-width');
  const inputHeight = document.getElementById('duct-height');
  const selectMaterial = document.getElementById('duct-material');
  const inputRunLength = document.getElementById('run-length');
  const inputElbows90 = document.getElementById('elbows-90');
  const inputElbows45 = document.getElementById('elbows-45');
  const inputBranchTees = document.getElementById('branch-tees');
  const inputGrilles = document.getElementById('grilles-registers');

  // Metric Display Elements
  const valVelocity = document.getElementById('val-velocity');
  const statusVelocity = document.getElementById('status-velocity');
  const valFrictionRate = document.getElementById('val-friction-rate');
  const valEquivLength = document.getElementById('val-equiv-length');
  const valTotalPressure = document.getElementById('val-total-pressure');
  const specDh = document.getElementById('spec-dh');
  const specArea = document.getElementById('spec-area');
  const specRe = document.getElementById('spec-re');
  const specRegime = document.getElementById('spec-regime');
  const insightText = document.getElementById('insight-text');

  // Canvas
  const canvas = document.getElementById('pressure-canvas');
  const ctx = canvas.getContext('2d');

  // Modal Elements
  const btnPresets = document.getElementById('btn-presets');
  const presetModal = document.getElementById('preset-modal');
  const modalClose = document.getElementById('modal-close');
  const btnExport = document.getElementById('btn-export');

  // Toggle shape visibility
  selectShape.addEventListener('change', () => {
    if (selectShape.value === 'round') {
      groupRound.style.display = 'block';
      groupRect.style.display = 'none';
    } else {
      groupRound.style.display = 'none';
      groupRect.style.display = 'block';
    }
    calculateDuct();
  });

  // Input listeners
  const allInputs = [
    inputCfmi, inputDiameter, inputWidth, inputHeight,
    selectMaterial, inputRunLength, inputElbows90,
    inputElbows45, inputBranchTees, inputGrilles
  ];

  allInputs.forEach(el => {
    el.addEventListener('input', calculateDuct);
  });

  function calculateDuct() {
    const cfm = parseFloat(inputCfmi.value) || 0;
    const shape = selectShape.value;
    const roughness = parseFloat(selectMaterial.value) || 0.0003;
    const runLength = parseFloat(inputRunLength.value) || 0;
    const e90 = parseFloat(inputElbows90.value) || 0;
    const e45 = parseFloat(inputElbows45.value) || 0;
    const tees = parseFloat(inputBranchTees.value) || 0;
    const grilles = parseFloat(inputGrilles.value) || 0;

    let areaSqFt = 0;
    let dhInches = 0;
    let velocityFPM = 0;

    if (shape === 'round') {
      const diaIn = parseFloat(inputDiameter.value) || 1;
      const radiusFt = (diaIn / 2) / 12;
      areaSqFt = Math.PI * Math.pow(radiusFt, 2);
      dhInches = diaIn;
    } else {
      const wIn = parseFloat(inputWidth.value) || 1;
      const hIn = parseFloat(inputHeight.value) || 1;
      areaSqFt = (wIn * hIn) / 144;
      // Hydraulic diameter for rectangular duct = 2 * W * H / (W + H)
      dhInches = (2 * wIn * hIn) / (wIn + hIn);
    }

    if (areaSqFt > 0) {
      velocityFPM = cfm / areaSqFt;
    }

    // Equivalent Lengths of fittings (expressed in feet of straight duct per unit)
    // Standard estimations: 90 elbow ~ 10 ft, 45 elbow ~ 5 ft, Tee ~ 15 ft, Grille ~ 20 ft
    const equivFittings = (e90 * 10) + (e45 * 5) + (tees * 15) + (grilles * 20);
    const totalEquivLength = runLength + equivFittings;

    // Friction Loss Calculation (Darcy-Weisbach approximation for HVAC)
    // Simplified friction rate per 100 ft (in. w.g. / 100 ft)
    // Formula approximation based on standard HVAC air friction charts
    const dhFt = dhInches / 12;
    let frictionRate100 = 0;
    if (dhFt > 0 && velocityFPM > 0) {
      // Friction per 100ft ~ 1.09 * (roughness^0.18) * (velocity^1.85) / (dh^1.22)
      frictionRate100 = 1.09 * Math.pow(roughness, 0.18) * Math.pow(velocityFPM / 1000, 1.85) / Math.pow(dhFt, 1.22) * 0.55;
    }

    const totalStaticPressure = (frictionRate100 * totalEquivLength) / 100;

    // Reynolds Number & Flow Regime (approx for air at standard temp)
    // Re = (V * Dh) / kinematic viscosity (~0.000158 ft2/s)
    const velocityFPS = velocityFPM / 60;
    const reynolds = dhFt > 0 ? (velocityFPS * dhFt) / 0.000158 : 0;
    let regime = "Turbulent";
    if (reynolds < 2300) regime = "Laminar";
    else if (reynolds < 4000) regime = "Transition";

    // Update UI Metrics
    valVelocity.textContent = Math.round(velocityFPM);
    updateVelocityStatus(velocityFPM);

    valFrictionRate.textContent = frictionRate100.toFixed(3);
    valEquivLength.textContent = Math.round(totalEquivLength);
    valTotalPressure.textContent = totalStaticPressure.toFixed(3);

    specDh.textContent = `${dhInches.toFixed(1)} in`;
    specArea.textContent = `${areaSqFt.toFixed(2)} sq. ft`;
    specRe.textContent = Math.round(reynolds).toLocaleString();
    specRegime.textContent = regime;

    updateInsights(velocityFPM, frictionRate100, totalStaticPressure);
    drawPressureCanvas(totalStaticPressure, runLength, totalEquivLength);
  }

  function updateVelocityStatus(v) {
    statusVelocity.className = 'metric-status';
    if (v < 400) {
      statusVelocity.textContent = 'Low / Stagnant';
      statusVelocity.classList.add('warning');
    } else if (v <= 900) {
      statusVelocity.textContent = 'Optimal (Res)';
      statusVelocity.classList.add();
    } else if (v <= 1500) {
      statusVelocity.textContent = 'Acceptable (Comm)';
      statusVelocity.classList.add('warning');
    } else {
      statusVelocity.textContent = 'High / Noisy';
      statusVelocity.classList.add('danger');
    }
  }

  function updateInsights(v, fRate, tsp) {
    let text = "";
    if (v > 1200) {
      text = `Velocity is high (${Math.round(v)} FPM). This may cause noticeable air noise and whistling at grilles. Consider increasing duct dimensions to lower velocity below 900 FPM.`;
    } else if (v < 400) {
      text = `Velocity is low (${Math.round(v)} FPM). Dust and particulate matter may settle in horizontal duct runs over time.`;
    } else {
      text = `Duct velocity is within comfortable ASHRAE residential/commercial standards. Friction rate of ${fRate.toFixed(3)} in. w.g./100ft provides an efficient balance between fan energy consumption and duct sizing costs.`;
    }
    if (tsp > 0.5) {
      text += ` Note: Total static pressure drop exceeds 0.5 in. w.g., requiring careful fan selection to ensure adequate blower performance.`;
    }
    insightText.textContent = text;
  }

  function drawPressureCanvas(tsp, runLength, totalEquiv) {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const w = canvas.width;
    const h = canvas.height;
    const padding = 40;
    const graphW = w - padding * 2;
    const graphH = h - padding * 2;

    // Draw grid background
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const y = padding + (graphH / 4) * i;
      ctx.moveTo(padding, y);
      ctx.lineTo(w - padding, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Pressure Drop Curve (Linear drop along equivalent length)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();

    const steps = 50;
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const x = padding + graphW * progress;
      // Pressure drops from TSP down to 0
      const currentP = tsp * (1 - progress);
      const y = padding + graphH * (1 - (tsp > 0 ? currentP / (tsp * 1.2) : 0));

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui';
    ctx.fillText('0 ft (Fan Discharge)', padding, h - 15);
    ctx.fillText(`${Math.round(totalEquiv)} ft (Total Equiv)`, w - padding - 110, h - 15);
    ctx.fillText(`Max: ${tsp.toFixed(3)} in. w.g.`, padding, padding - 10);
  }

  // Preset Modal Actions
  btnPresets.addEventListener('click', () => presetModal.classList.add('active'));
  modalClose.addEventListener('click', () => presetModal.classList.remove('active'));
  window.addEventListener('click', (e) => {
    if (e.target === presetModal) presetModal.classList.remove('active');
  });

  document.querySelectorAll('.preset-item').forEach(item => {
    item.addEventListener('click', () => {
      const p = item.dataset.preset;
      loadPreset(p);
      presetModal.classList.remove('active');
    });
  });

  function loadPreset(name) {
    if (name === 'residential-trunk') {
      inputCfmi.value = 800;
      selectShape.value = 'round';
      groupRound.style.display = 'block';
      groupRect.style.display = 'none';
      inputDiameter.value = 10;
      selectMaterial.value = '0.0003';
      inputRunLength.value = 40;
      inputElbows90.value = 2;
      inputElbows45.value = 1;
      inputBranchTees.value = 1;
      inputGrilles.value = 1;
    } else if (name === 'bedroom-branch') {
      inputCfmi.value = 150;
      selectShape.value = 'round';
      groupRound.style.display = 'block';
      groupRect.style.display = 'none';
      inputDiameter.value = 6;
      selectMaterial.value = '0.013';
      inputRunLength.value = 25;
      inputElbows90.value = 3;
      inputElbows45.value = 0;
      inputBranchTees.value = 0;
      inputGrilles.value = 1;
    } else if (name === 'commercial-supply') {
      inputCfmi.value = 2400;
      selectShape.value = 'rectangular';
      groupRound.style.display = 'none';
      groupRect.style.display = 'block';
      inputWidth.value = 20;
      inputHeight.value = 12;
      selectMaterial.value = '0.0003';
      inputRunLength.value = 100;
      inputElbows90.value = 4;
      inputElbows45.value = 2;
      inputBranchTees.value = 2;
      inputGrilles.value = 4;
    } else if (name === 'exhaust-bath') {
      inputCfmi.value = 80;
      selectShape.value = 'round';
      groupRound.style.display = 'block';
      groupRect.style.display = 'none';
      inputDiameter.value = 4;
      selectMaterial.value = '0.003';
      inputRunLength.value = 15;
      inputElbows90.value = 2;
      inputElbows45.value = 0;
      inputBranchTees.value = 0;
      inputGrilles.value = 1;
    }
    calculateDuct();
  }

  // Export Report action
  btnExport.addEventListener('click', () => {
    const report = `--- AURAVANE HVAC DUCT REPORT ---
Airflow: ${inputCfmi.value} CFM
Shape: ${selectShape.value}
Dimensions: ${selectShape.value === 'round' ? inputDiameter.value + ' in diameter' : inputWidth.value + 'x' + inputHeight.value + ' in'}
Material Roughness: ${selectMaterial.options[selectMaterial.selectedIndex].text}
Straight Run: ${inputRunLength.value} ft
Total Equivalent Length: ${valEquivLength.textContent} ft
Air Velocity: ${valVelocity.textContent} FPM
Friction Rate: ${valFrictionRate.textContent} in. w.g./100ft
Total Static Pressure: ${valTotalPressure.textContent} in. w.g.
-----------------------------------`;
    
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AuraVane_Duct_Report.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Initial Calculation on load
  calculateDuct();
});
