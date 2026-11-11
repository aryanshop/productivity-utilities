document.addEventListener('DOMContentLoaded', () => {
  // Fluid Database (Density kg/m3, Dynamic Viscosity Pa*s)
  const FLUIDS = {
    'water-20': { name: 'Water (20°C)', density: 998.2, viscosity: 0.001002 },
    'water-60': { name: 'Water (60°C)', density: 983.2, viscosity: 0.000466 },
    'glycol-30': { name: 'Ethylene Glycol (30%)', density: 1040.0, viscosity: 0.002200 },
    'seawater': { name: 'Seawater (15°C)', density: 1025.0, viscosity: 0.001220 },
    'oil-olive': { name: 'Olive Oil (20°C)', density: 920.0, viscosity: 0.081000 }
  };

  // Elements
  const fluidSelect = document.getElementById('fluid-select');
  const flowRateInput = document.getElementById('flow-rate');
  const flowUnitSelect = document.getElementById('flow-unit');
  const pipeMaterialSelect = document.getElementById('pipe-material');
  const pipeSizeSelect = document.getElementById('pipe-size');
  const customDiaWrapper = document.getElementById('custom-dia-wrapper');
  const customDiaInput = document.getElementById('custom-dia');
  const pipeLengthInput = document.getElementById('pipe-length');
  const elevationDropInput = document.getElementById('elevation-drop');
  
  const fitElbow90 = document.getElementById('fit-elbow-90');
  const fitElbow45 = document.getElementById('fit-elbow-45');
  const fitValveGate = document.getElementById('fit-valve-gate');
  const fitTeeRun = document.getElementById('fit-tee-run');

  const btnCalculate = document.getElementById('btn-calculate');
  const btnPresets = document.getElementById('btn-presets');
  const btnExport = document.getElementById('btn-export');
  const btnReset = document.getElementById('btn-reset');
  const btnClearLog = document.getElementById('btn-clear-log');

  const outHeadLoss = document.getElementById('out-head-loss');
  const outPressureDrop = document.getElementById('out-pressure-drop');
  const outVelocity = document.getElementById('out-velocity');
  const outReynolds = document.getElementById('out-reynolds');
  const outRegime = document.getElementById('out-regime');
  
  const logTbody = document.getElementById('log-tbody');
  const presetModal = document.getElementById('preset-modal');
  const closeModalBtn = document.querySelector('.close-modal');
  const canvas = document.getElementById('flowCanvas');
  const ctx = canvas.getContext('2d');

  let calculationLog = [];

  // Pipe standard IDs in inches mapped to meters
  const STANDARD_IDS = {
    '0.5': 0.0158,
    '0.75': 0.0209,
    '1.0': 0.0266,
    '1.25': 0.0351,
    '1.5': 0.0409,
    '2.0': 0.0525,
    '3.0': 0.0779,
    '4.0': 0.1023
  };

  // Toggle custom diameter visibility
  pipeSizeSelect.addEventListener('change', () => {
    if (pipeSizeSelect.value === 'custom') {
      customDiaWrapper.style.display = 'flex';
    } else {
      customDiaWrapper.style.display = 'none';
    }
  });

  // Modal controls
  btnPresets.addEventListener('click', () => presetModal.classList.add('active'));
  closeModalBtn.addEventListener('click', () => presetModal.classList.remove('active'));
  window.addEventListener('click', (e) => {
    if (e.target === presetModal) presetModal.classList.remove('active');
  });

  // Preset buttons handler
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-preset');
      if (type === 'irrigation') {
        fluidSelect.value = 'water-20';
        flowRateInput.value = 25;
        flowUnitSelect.value = 'gpm';
        pipeMaterialSelect.value = '0.000005';
        pipeSizeSelect.value = '1.0';
        pipeLengthInput.value = 50;
        elevationDropInput.value = 2;
        fitElbow90.value = 4;
        fitElbow45.value = 2;
        fitValveGate.value = 1;
        fitTeeRun.value = 2;
      } else if (type === 'domestic') {
        fluidSelect.value = 'water-20';
        flowRateInput.value = 8;
        flowUnitSelect.value = 'gpm';
        pipeMaterialSelect.value = '0.0000015';
        pipeSizeSelect.value = '0.75';
        pipeLengthInput.value = 15;
        elevationDropInput.value = 4;
        fitElbow90.value = 6;
        fitElbow45.value = 1;
        fitValveGate.value = 2;
        fitTeeRun.value = 1;
      } else if (type === 'industrial') {
        fluidSelect.value = 'water-60';
        flowRateInput.value = 250;
        flowUnitSelect.value = 'gpm';
        pipeMaterialSelect.value = '0.045';
        pipeSizeSelect.value = '3.0';
        pipeLengthInput.value = 120;
        elevationDropInput.value = -5;
        fitElbow90.value = 8;
        fitElbow45.value = 4;
        fitValveGate.value = 3;
        fitTeeRun.value = 4;
      }
      presetModal.classList.remove('active');
      performCalculation();
    });
  });

  btnReset.addEventListener('click', () => {
    fluidSelect.value = 'water-20';
    flowRateInput.value = 25;
    flowUnitSelect.value = 'gpm';
    pipeMaterialSelect.value = '0.000005';
    pipeSizeSelect.value = '1.0';
    customDiaWrapper.style.display = 'none';
    pipeLengthInput.value = 30;
    elevationDropInput.value = 0;
    fitElbow90.value = 2;
    fitElbow45.value = 0;
    fitValveGate.value = 1;
    fitTeeRun.value = 0;
    performCalculation();
  });

  btnClearLog.addEventListener('click', () => {
    calculationLog = [];
    renderLog();
  });

  btnExport.addEventListener('click', () => {
    if (calculationLog.length === 0) {
      alert('No calculation records to export.');
      return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(calculationLog, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "auraflow_hydraulic_log.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  btnCalculate.addEventListener('click', performCalculation);

  function performCalculation() {
    // 1. Parse inputs
    const fluidKey = fluidSelect.value;
    const fluid = FLUIDS[fluidKey];
    let flowVal = parseFloat(flowRateInput.value) || 0;
    const flowUnit = flowUnitSelect.value;
    
    // Convert flow rate to m^3/s
    let qM3s = 0;
    if (flowUnit === 'gpm') {
      qM3s = flowVal * 0.0000630902;
    } else if (flowUnit === 'lpm') {
      qM3s = flowVal / 60000;
    } else if (flowUnit === 'm3h') {
      qM3s = flowVal / 3600;
    }

    // Pipe diameter in meters
    let diameterM = 0;
    if (pipeSizeSelect.value === 'custom') {
      diameterM = (parseFloat(customDiaInput.value) || 25) / 1000;
    } else {
      diameterM = STANDARD_IDS[pipeSizeSelect.value] || 0.0266;
    }

    const roughnessMm = parseFloat(pipeMaterialSelect.value) || 0.005;
    const roughnessM = roughnessMm / 1000;
    const lengthM = parseFloat(pipeLengthInput.value) || 0;
    const elevationM = parseFloat(elevationDropInput.value) || 0;

    // Equivalent lengths for fittings (Le/D values typical)
    const nElbow90 = parseFloat(fitElbow90.value) || 0;
    const nElbow45 = parseFloat(fitElbow45.value) || 0;
    const nValveGate = parseFloat(fitValveGate.value) || 0;
    const nTeeRun = parseFloat(fitTeeRun.value) || 0;

    const equivalentLength = diameterM * ( (nElbow90 * 30) + (nElbow45 * 16) + (nValveGate * 8) + (nTeeRun * 20) );
    const totalEffectiveLength = lengthM + equivalentLength;

    // 2. Hydraulics Calculations
    const crossArea = Math.PI * Math.pow(diameterM / 2, 2);
    const velocity = crossArea > 0 ? qM3s / crossArea : 0;
    const reynolds = (fluid.density * velocity * diameterM) / fluid.viscosity;

    // Friction Factor (Darcy-Weisbach)
    let frictionFactor = 0.02;
    if (reynolds < 2300 && reynolds > 0) {
      frictionFactor = 64 / reynolds;
    } else if (reynolds >= 2300) {
      // Colebrook-White approximation (Swamee-Jain equation)
      const relRoughness = roughnessM / diameterM;
      const term = (relRoughness / 3.7) + (5.74 / Math.pow(reynolds, 0.9));
      frictionFactor = 0.25 / Math.pow(Math.log10(term), 2);
    }

    // Head loss due to friction (Darcy-Weisbach equation: hf = f * (L/D) * (v^2 / 2g))
    const g = 9.81;
    const frictionHeadLoss = frictionFactor * (totalEffectiveLength / diameterM) * (Math.pow(velocity, 2) / (2 * g));
    const totalHeadLoss = frictionHeadLoss + elevationM;
    
    // Pressure drop
    const pressureDropBar = (totalHeadLoss * fluid.density * g) / 100000;
    const pressureDropPsi = pressureDropBar * 14.5038;

    // Flow regime text & badge styling
    let regimeText = 'Laminar';
    let badgeColor = 'var(--success)';
    if (reynolds > 4000) {
      regimeText = 'Turbulent';
      badgeColor = 'var(--danger)';
    } else if (reynolds >= 2300) {
      regimeText = 'Transitional';
      badgeColor = 'var(--warning)';
    }

    // 3. Update DOM output
    outHeadLoss.textContent = totalHeadLoss.toFixed(2);
    outPressureDrop.textContent = `${pressureDropBar.toFixed(2)} bar / ${pressureDropPsi.toFixed(1)} psi`;
    outVelocity.textContent = velocity.toFixed(2);
    outReynolds.textContent = Math.round(reynolds).toLocaleString();
    outRegime.textContent = regimeText;
    outRegime.style.color = badgeColor;
    outRegime.style.borderColor = badgeColor;

    // 4. Draw Canvas Schematic
    drawSchematic(velocity, reynolds, regimeText);

    // 5. Add to log
    const logEntry = {
      time: new Date().toLocaleTimeString(),
      fluid: fluid.name,
      flow: `${flowVal} ${flowUnit}`,
      size: pipeSizeSelect.value === 'custom' ? `${customDiaInput.value}mm` : `${pipeSizeSelect.value}"`,
      length: `${lengthM}m`,
      headLoss: `${totalHeadLoss.toFixed(2)} m`,
      velocity: `${velocity.toFixed(2)} m/s`
    };
    calculationLog.unshift(logEntry);
    if (calculationLog.length > 25) calculationLog.pop();
    renderLog();
  }

  function renderLog() {
    if (calculationLog.length === 0) {
      logTbody.innerHTML = `<tr class="empty-row"><td colspan="7">No calculations logged yet. Click 'Calculate System Hydraulics' to add entries.</td></tr>`;
      return;
    }
    let html = '';
    calculationLog.forEach(item => {
      html += `<tr>
        <td>${item.time}</td>
        <td>${item.fluid}</td>
        <td>${item.flow}</td>
        <td>${item.size}</td>
        <td>${item.length}</td>
        <td>${item.headLoss}</td>
        <td>${item.velocity}</td>
      </tr>`;
    });
    logTbody.innerHTML = html;
  }

  let animOffset = 0;
  function drawSchematic(velocity, reynolds, regime) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Pipe coordinates
    const pipeX = 60;
    const pipeY = 70;
    const pipeW = 520;
    const pipeH = 80;

    // Draw Pipe Body
    ctx.fillStyle = '#1b263b';
    ctx.fillRect(pipeX, pipeY, pipeW, pipeH);
    ctx.strokeStyle = '#415a77';
    ctx.lineWidth = 4;
    ctx.strokeRect(pipeX, pipeY, pipeW, pipeH);

    // Flow particles animation
    animOffset = (animOffset + Math.max(1, velocity * 3)) % 30;
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(pipeX + 2, pipeY + 2, pipeW - 4, pipeH - 4);
    ctx.clip();

    // Fluid color tint based on reynolds
    let fluidColor = 'rgba(76, 201, 240, 0.4)';
    if (reynolds > 4000) fluidColor = 'rgba(248, 113, 113, 0.4)';
    else if (reynolds >= 2300) fluidColor = 'rgba(250, 204, 21, 0.4)';

    ctx.fillStyle = fluidColor;
    ctx.fillRect(pipeX, pipeY, pipeW, pipeH);

    // Draw streamlines or turbulent eddies
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;

    if (reynolds < 2300) {
      // Laminar parallel lines
      for (let y = pipeY + 15; y < pipeY + pipeH; y += 20) {
        ctx.beginPath();
        for (let x = pipeX - animOffset; x < pipeX + pipeW + 30; x += 30) {
          ctx.moveTo(x, y);
          ctx.lineTo(x + 15, y);
        }
        ctx.stroke();
      }
    } else {
      // Turbulent chaotic flow lines
      for (let i = 0; i < 18; i++) {
        let startX = pipeX + (i * 35) - animOffset;
        ctx.beginPath();
        ctx.moveTo(startX, pipeY + 10);
        ctx.bezierCurveTo(
          startX + 15, pipeY + 70,
          startX + 20, pipeY + 10,
          startX + 35, pipeY + 70
        );
        ctx.stroke();
      }
    }

    ctx.restore();

    // Labels on canvas
    ctx.fillStyle = '#8d99ae';
    ctx.font = '12px sans-serif';
    ctx.fillText('Inlet (P1)', pipeX, pipeY - 10);
    ctx.fillText('Outlet (P2)', pipeX + pipeW - 60, pipeY - 10);
    ctx.fillText(`Flow Regime: ${regime} (Re: ${Math.round(reynolds).toLocaleString()})`, pipeX, pipeY + pipeH + 25);
  }

  // Initial calculation on load
  performCalculation();
});
