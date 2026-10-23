document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const massInput = document.getElementById('payload-mass');
  const velInput = document.getElementById('descent-vel');
  const altInput = document.getElementById('altitude');
  const canopyTypeSelect = document.getElementById('canopy-type');
  const numGoresInput = document.getElementById('num-gores');
  const spillRatioInput = document.getElementById('spill-ratio');
  const spillRatioVal = document.getElementById('spill-ratio-val');
  const fabricWeightInput = document.getElementById('fabric-weight');
  const safetyFactorInput = document.getElementById('safety-factor');
  const shroudMultiplierInput = document.getElementById('shroud-multiplier');

  // Metrics Outputs
  const resDiameter = document.getElementById('res-diameter');
  const resArea = document.getElementById('res-area');
  const resWeight = document.getElementById('res-weight');
  const resEnergy = document.getElementById('res-energy');
  const goreSpecsList = document.getElementById('gore-specs');
  const cutlistBody = document.getElementById('cutlist-body');
  
  // Stress Outputs
  const resShockLoad = document.getElementById('res-shock-load');
  const resLineStrength = document.getElementById('res-line-strength');
  const resTotalLines = document.getElementById('res-total-lines');

  // SVG & Canvas
  const canopySvg = document.getElementById('canopy-svg');

  // Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // Modal
  const btnExport = document.getElementById('btn-export');
  const btnReset = document.getElementById('btn-reset');
  const exportModal = document.getElementById('export-modal');
  const modalClose = document.getElementById('modal-close');
  const btnCopy = document.getElementById('btn-copy');
  const exportText = document.getElementById('export-text');

  // Tab Switching Logic
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');
    });
  });

  // Physics & Calculation Engine
  function calculateDesign() {
    const massKg = parseFloat(massInput.value) / 1000 || 0.5;
    const targetVel = parseFloat(velInput.value) || 5.0;
    const altitude = parseFloat(altInput.value) || 300;
    const canopyType = canopyTypeSelect.value;
    const numGores = parseInt(numGoresInput.value) || 8;
    const spillRatio = parseFloat(spillRatioInput.value) / 100 || 0.1;
    const fabricWeight = parseFloat(fabricWeightInput.value) || 45;
    const safetyFactor = parseFloat(safetyFactorInput.value) || 3.5;
    const shroudMult = parseFloat(shroudMultiplierInput.value) || 1.1;

    spillRatioVal.textContent = `${Math.round(spillRatio * 100)}%`;

    // Air density adjustment with altitude (simplified barometric formula)
    const airDensity = 1.225 * Math.exp(-altitude / 8500);

    // Drag coefficients (Cd) based on canopy shape
    let cd = 0.75;
    if (canopyType === 'hemisphere') cd = 0.75;
    else if (canopyType === 'cruciform') cd = 1.15;
    else if (canopyType === 'annular') cd = 0.85;
    else if (canopyType === 'flat-circular') cd = 0.55;

    // Force balance: W = 0.5 * rho * v^2 * S * Cd
    // Weight in Newtons: W = massKg * 9.81
    const weightN = massKg * 9.81;
    const surfaceArea = (2 * weightN) / (airDensity * Math.pow(targetVel, 2) * cd);
    
    // Nominal Diameter (for circular/hemispherical projection)
    const diameter = Math.sqrt((4 * surfaceArea) / Math.PI);

    // Kinetic energy at touchdown (Joules): 0.5 * m * v^2
    const kineticEnergy = 0.5 * massKg * Math.pow(targetVel, 2);

    // Canopy material weight estimation
    const canopyFabricArea = surfaceArea * 1.15; // 15% buffer for seams and hems
    const canopyWeightGrams = canopyFabricArea * fabricWeight;

    // Gore dimensions calculation
    const radius = diameter / 2;
    const topRadius = radius * spillRatio;
    const goreSpanArc = (Math.PI * diameter) / numGores;
    const goreTopWidth = (2 * Math.PI * topRadius) / numGores;

    // Shock load estimation (dynamic pressure spike coefficient ~ 2.0 at deployment)
    const deploymentSpeed = targetVel * 3.5; // Estimated deployment velocity
    const dynamicPressure = 0.5 * airDensity * Math.pow(deploymentSpeed, 2);
    const shockLoadN = dynamicPressure * surfaceArea * cd * 1.5;
    
    // Shroud lines
    const shroudLineLength = diameter * shroudMult;
    const totalLineLength = shroudLineLength * numGores;
    const lineBreakingStrengthN = (shockLoadN / numGores) * safetyFactor;
    const lineBreakingStrengthKg = lineBreakingStrengthN / 9.81;

    // Update UI Metrics
    resDiameter.textContent = diameter.toFixed(2);
    resArea.textContent = surfaceArea.toFixed(2);
    resWeight.textContent = canopyWeightGrams.toFixed(1);
    resEnergy.textContent = kineticEnergy.toFixed(1);

    resShockLoad.textContent = `${Math.round(shockLoadN)} N (~${Math.round(shockLoadN / 9.81)} kgf)`;
    resLineStrength.textContent = `${Math.round(lineBreakingStrengthKg * 10) / 10} kg`;
    resTotalLines.textContent = `${totalLineLength.toFixed(1)} meters`;

    // Update Gore Specs List
    goreSpecsList.innerHTML = `
      <li>Gore Count: <span>${numGores} panels</span></li>
      <li>Base Width (W1): <span>${(goreSpanArc * 1000).toFixed(1)} mm</span></li>
      <li>Top Width (W2): <span>${(goreTopWidth * 1000).toFixed(1)} mm</span></li>
      <li>Gore Height (H): <span>${(radius * 1000).toFixed(1)} mm</span></li>
      <li>Seam Allowance: <span>+10 mm per side</span></li>
    `;

    // Update Cut List Table
    cutlistBody.innerHTML = `
      <tr>
        <td>Canopy Gores</td>
        <td>${numGores}</td>
        <td>Base: ${(goreSpanArc*1000).toFixed(0)}mm, Top: ${(goreTopWidth*1000).toFixed(0)}mm, H: ${(radius*1000).toFixed(0)}mm</td>
        <td>${canopyFabricWeightDesc(fabricWeight)}</td>
      </tr>
      <tr>
        <td>Suspension Lines</td>
        <td>${numGores}</td>
        <td>Length: ${shroudLineLength.toFixed(2)}m each</td>
        <td>Braided Kevlar / Spectra (Rated &gt;${Math.ceil(lineBreakingStrengthKg)}kg)</td>
      </tr>
      <tr>
        <td>Shock Cord / Bridle</td>
        <td>1</td>
        <td>Length: ${(diameter * 1.5).toFixed(1)}m</td>
        <td>Tubular Nylon (Rated &gt;${Math.ceil(shockLoadN/9.81)}kg)</td>
      </tr>
      ${spillRatio > 0 ? `
      <tr>
        <td>Spill Ring / Reinforcement</td>
        <td>1</td>
        <td>Diameter: ${(topRadius * 2 * 1000).toFixed(0)}mm</td>
        <td>Ripstop Nylon Tape</td>
      </tr>` : ''}
    `;

    // Render SVG Blueprint
    renderSvgBlueprint(goreSpanArc, goreTopWidth, radius, numGores, canopyType);
  }

  function canopyFabricWeightDesc(gsm) {
    if (gsm < 30) return 'Ultralight Ripstop Nylon (0.7 oz/yd²)';
    if (gsm < 60) return 'Standard Ripstop Nylon (1.1 - 1.5 oz/yd²)';
    return 'Heavy Duty Cordura / Nylon Canvas';
  }

  function renderSvgBlueprint(baseW, topW, height, numGores, type) {
    // Clear SVG
    canopySvg.innerHTML = '';
    
    const svgNS = "http://www.w3.org/2000/svg";
    
    // Draw a stylized vector gore panel inside 400x400 viewbox
    const padX = 100;
    const padY = 50;
    const drawW = 200;
    const drawH = 300;

    // Scale factors to fit in box
    const maxDim = Math.max(baseW, height);
    const scale = Math.min(drawW / (baseW * 1.3), drawH / height);

    const scaledBaseW = baseW * scale;
    const scaledTopW = topW * scale;
    const scaledH = height * scale;

    const centerX = 200;
    const startY = 50;
    const endY = startY + scaledH;
    const halfBase = scaledBaseW / 2;
    const halfTop = scaledTopW / 2;

    // Outer Seam allowance line (dashed)
    const offset = 10 * scale;
    const pathSeam = document.createElementNS(svgNS, 'path');
    pathSeam.setAttribute('d', `
      M ${centerX - halfTop - offset} ${startY}
      L ${centerX + halfTop + offset} ${startY}
      L ${centerX + halfBase + offset} ${endY}
      L ${centerX - halfBase - offset} ${endY}
      Z
    `);
    pathSeam.setAttribute('fill', 'rgba(16, 185, 129, 0.08)');
    pathSeam.setAttribute('stroke', '#10b981');
    pathSeam.setAttribute('stroke-width', '1.5');
    pathSeam.setAttribute('stroke-dasharray', '4,4');
    canopySvg.appendChild(pathSeam);

    // Main Gore Cut Line (solid)
    const pathGore = document.createElementNS(svgNS, 'path');
    pathGore.setAttribute('d', `
      M ${centerX - halfTop} ${startY}
      L ${centerX + halfTop} ${startY}
      L ${centerX + halfBase} ${endY}
      L ${centerX - halfBase} ${endY}
      Z
    `);
    pathGore.setAttribute('fill', 'rgba(59, 130, 246, 0.15)');
    pathGore.setAttribute('stroke', '#3b82f6');
    pathGore.setAttribute('stroke-width', '2.5');
    canopySvg.appendChild(pathGore);

    // Center guideline
    const centerLine = document.createElementNS(svgNS, 'line');
    centerLine.setAttribute('x1', centerX);
    centerLine.setAttribute('y1', startY);
    centerLine.setAttribute('x2', centerX);
    centerLine.setAttribute('y2', endY);
    centerLine.setAttribute('stroke', '#475569');
    centerLine.setAttribute('stroke-width', '1');
    centerLine.setAttribute('stroke-dasharray', '2,2');
    canopySvg.appendChild(centerLine);

    // Text labels
    const textTop = document.createElementNS(svgNS, 'text');
    textTop.setAttribute('x', centerX);
    textTop.setAttribute('y', startY - 10);
    textTop.setAttribute('fill', '#94a3b8');
    textTop.setAttribute('font-size', '11');
    textTop.setAttribute('text-anchor', 'middle');
    textTop.textContent = `Top: ${(topW * 1000).toFixed(0)}mm`;
    canopySvg.appendChild(textTop);

    const textBase = document.createElementNS(svgNS, 'text');
    textBase.setAttribute('x', centerX);
    textBase.setAttribute('y', endY + 20);
    textBase.setAttribute('fill', '#f8fafc');
    textBase.setAttribute('font-size', '12');
    textBase.setAttribute('font-weight', 'bold');
    textBase.setAttribute('text-anchor', 'middle');
    textBase.textContent = `Base: ${(baseW * 1000).toFixed(0)}mm (${numGores} Gores)`;
    canopySvg.appendChild(textBase);
  }

  // Event Listeners for inputs
  const allInputs = [massInput, velInput, altInput, canopyTypeSelect, numGoresInput, spillRatioInput, fabricWeightInput, safetyFactorInput, shroudMultiplierInput];
  allInputs.forEach(input => {
    input.addEventListener('input', calculateDesign);
  });

  // Reset Button
  btnReset.addEventListener('click', () => {
    massInput.value = 500;
    velInput.value = 5.0;
    altInput.value = 300;
    canopyTypeSelect.value = 'hemisphere';
    numGoresInput.value = 8;
    spillRatioInput.value = 10;
    fabricWeightInput.value = 45;
    safetyFactorInput.value = 3.5;
    shroudMultiplierInput.value = 1.1;
    calculateDesign();
  });

  // Export Modal Handlers
  btnExport.addEventListener('click', () => {
    const summary = `=== AEROSTITCH PARACHUTE BLUEPRINT ===
Payload Mass: ${massInput.value} g
Target Descent Rate: ${velInput.value} m/s
Deployment Altitude: ${altInput.value} m
Canopy Type: ${canopyTypeSelect.value}
Gore Count: ${numGoresInput.value}
Nominal Diameter: ${resDiameter.textContent} m
Total Surface Area: ${resArea.textContent} m²
Estimated Canopy Weight: ${resWeight.textContent} g
Estimated Shock Load: ${resShockLoad.textContent}
Minimum Line Strength: ${resLineStrength.textContent}
Total Shroud Line Length: ${resTotalLines.textContent}
=======================================`;
    exportText.textContent = summary;
    exportModal.classList.add('open');
    exportModal.setAttribute('aria-hidden', 'false');
  });

  modalClose.addEventListener('click', () => {
    exportModal.classList.remove('open');
    exportModal.setAttribute('aria-hidden', 'true');
  });

  btnCopy.addEventListener('click', () => {
    navigator.clipboard.writeText(exportText.textContent).then(() => {
      const originalText = btnCopy.textContent;
      btnCopy.textContent = 'Copied to Clipboard!';
      setTimeout(() => {
        btnCopy.textContent = originalText;
      }, 2000);
    });
  });

  window.addEventListener('click', (e) => {
    if (e.target === exportModal) {
      exportModal.classList.remove('open');
      exportModal.setAttribute('aria-hidden', 'true');
    }
  });

  // Initial calculation on load
  calculateDesign();
});
