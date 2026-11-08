/**
 * AuraFrost: Refrigeration & Thermal Heat Load Laboratory
 * Pure client-side calculations and canvas visualization.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Element references
  const elLength = document.getElementById('room-length');
  const elWidth = document.getElementById('room-width');
  const elHeight = document.getElementById('room-height');
  const elUnitLength = document.getElementById('unit-length');
  const elUnitSystem = document.getElementById('unit-system');
  
  const elTempInternal = document.getElementById('temp-internal');
  const elTempAmbient = document.getElementById('temp-ambient');
  const elInsulationPreset = document.getElementById('insulation-preset');
  const elInsulationRVal = document.getElementById('insulation-r-val');
  const elSunExposure = document.getElementById('sun-exposure');
  
  const elProductType = document.getElementById('product-type');
  const elProductMass = document.getElementById('product-mass');
  const elDoorOpenings = document.getElementById('door-openings');
  const elInternalWatts = document.getElementById('internal-watts');
  const elOccupancy = document.getElementById('occupancy');

  // Metric outputs
  const metricTotalLoad = document.getElementById('metric-total-load');
  const metricTotalUnit = document.getElementById('metric-total-unit');
  const metricHp = document.getElementById('metric-hp');
  const metricTons = document.getElementById('metric-tons');
  const metricShr = document.getElementById('metric-shr');
  
  const tbodyBreakdown = document.getElementById('breakdown-tbody');
  const recommendationList = document.getElementById('recommendation-list');
  
  // Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // Modals
  const modalPresets = document.getElementById('preset-modal');
  const modalExport = document.getElementById('export-modal');
  const btnPresets = document.getElementById('btn-presets');
  const btnReset = document.getElementById('btn-reset');
  const btnExport = document.getElementById('btn-export');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCloseExport = document.getElementById('btn-close-export');
  const btnCopyReport = document.getElementById('btn-copy-report');
  const exportReportText = document.getElementById('export-report-text');

  // Canvas
  const canvas = document.getElementById('load-chart');
  const ctx = canvas.getContext('2d');

  // Tab switching logic
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(btn.getAttribute('aria-controls'));
      if (target) target.classList.add('active');
    });
  });

  // Insulation preset handler
  elInsulationPreset.addEventListener('change', () => {
    const val = elInsulationPreset.value;
    if (val !== 'custom') {
      elInsulationRVal.value = val;
      calculateAndRender();
    }
  });

  elInsulationRVal.addEventListener('input', () => {
    elInsulationPreset.value = 'custom';
    calculateAndRender();
  });

  // Unit system change handler (adjust defaults slightly if needed or convert)
  elUnitSystem.addEventListener('change', () => {
    const isMetric = elUnitSystem.value === 'metric';
    if (isMetric) {
      // Convert default 35F to ~1.7C, 90F to ~32C
      elTempInternal.value = '2';
      elTempAmbient.value = '32';
    } else {
      elTempInternal.value = '35';
      elTempAmbient.value = '90';
    }
    calculateAndRender();
  });

  // Input listeners for real-time recalculation
  const allInputs = document.querySelectorAll('input, select');
  allInputs.forEach(input => {
    if (input !== elUnitSystem && input !== elInsulationPreset) {
      input.addEventListener('input', calculateAndRender);
      input.addEventListener('change', calculateAndRender);
    }
  });

  // Presets data
  const presets = {
    walkin: { length: 12, width: 10, height: 8, unitLength: 'ft', internal: 35, ambient: 90, rVal: 15, sun: 1.0, prodType: 'produce', prodMass: 500, doors: 25, watts: 150, occ: 2, system: 'imperial' },
    freezer: { length: 8, width: 8, height: 8, unitLength: 'ft', internal: -10, ambient: 90, rVal: 40, sun: 1.0, prodType: 'frozen', prodMass: 300, doors: 15, watts: 100, occ: 1, system: 'imperial' },
    florist: { length: 15, width: 12, height: 9, unitLength: 'ft', internal: 38, ambient: 92, rVal: 15, sun: 1.2, prodType: 'produce', prodMass: 200, doors: 50, watts: 250, occ: 3, system: 'imperial' },
    brewery: { length: 20, width: 15, height: 10, unitLength: 'ft', internal: 50, ambient: 85, rVal: 28, sun: 1.0, prodType: 'meat', prodMass: 1200, doors: 10, watts: 400, occ: 2, system: 'imperial' }
  };

  document.querySelectorAll('.preset-card').forEach(card => {
    card.addEventListener('click', () => {
      const key = card.getAttribute('data-preset');
      const p = presets[key];
      if (p) {
        elLength.value = p.length;
        elWidth.value = p.width;
        elHeight.value = p.height;
        elUnitLength.value = p.unitLength;
        elUnitSystem.value = p.system;
        elTempInternal.value = p.internal;
        elTempAmbient.value = p.ambient;
        elInsulationPreset.value = p.rVal;
        elInsulationRVal.value = p.rVal;
        elSunExposure.value = p.sun;
        elProductType.value = p.prodType;
        elProductMass.value = p.prodMass;
        elDoorOpenings.value = p.doors;
        elInternalWatts.value = p.watts;
        elOccupancy.value = p.occ;
        modalPresets.classList.remove('open');
        calculateAndRender();
      }
    });
  });

  // Modal controls
  btnPresets.addEventListener('click', () => modalPresets.classList.add('open'));
  btnCloseModal.addEventListener('click', () => modalPresets.classList.remove('open'));
  btnExport.addEventListener('click', () => {
    generateReportText();
    modalExport.classList.add('open');
  });
  btnCloseExport.addEventListener('click', () => modalExport.classList.remove('open'));

  window.addEventListener('click', (e) => {
    if (e.target === modalPresets) modalPresets.classList.remove('open');
    if (e.target === modalExport) modalExport.classList.remove('open');
  });

  btnReset.addEventListener('click', () => {
    elLength.value = 12;
    elWidth.value = 10;
    elHeight.value = 8;
    elTempInternal.value = 35;
    elTempAmbient.value = 90;
    elInsulationRVal.value = 15;
    elInsulationPreset.value = 15;
    elProductMass.value = 500;
    elDoorOpenings.value = 25;
    elInternalWatts.value = 150;
    elOccupancy.value = 2;
    calculateAndRender();
  });

  btnCopyReport.addEventListener('click', () => {
    navigator.clipboard.writeText(exportReportText.textContent).then(() => {
      btnCopyReport.textContent = '✅ Copied!';
      setTimeout(() => btnCopyReport.textContent = '📋 Copy to Clipboard', 2000);
    });
  });

  let lastCalculation = {};

  function calculateAndRender() {
    // 1. Gather inputs with conversions to Imperial (BTU/hr, ft, °F) for core physics
    const isMetric = elUnitSystem.value === 'metric';
    const isMeter = elUnitLength.value === 'm';

    let L = parseFloat(elLength.value) || 1;
    let W = parseFloat(elWidth.value) || 1;
    let H = parseFloat(elHeight.value) || 1;

    if (isMeter) {
      L *= 3.28084;
      W *= 3.28084;
      H *= 3.28084;
    }

    let tempInt = parseFloat(elTempInternal.value) || 35;
    let tempAmb = parseFloat(elTempAmbient.value) || 90;

    if (isMetric) {
      tempInt = (tempInt * 9/5) + 32;
      tempAmb = (tempAmb * 9/5) + 32;
    }

    const R = parseFloat(elInsulationRVal.value) || 15;
    const sunFactor = parseFloat(elSunExposure.value) || 1.0;
    const prodMassInput = parseFloat(elProductMass.value) || 0;
    // Convert kg to lbs if metric
    const prodMass = isMetric ? prodMassInput * 2.20462 : prodMassInput;
    const doors = parseFloat(elDoorOpenings.value) || 0;
    const watts = parseFloat(elInternalWatts.value) || 0;
    const occupancy = parseFloat(elOccupancy.value) || 0;
    const prodType = elProductType.value;

    // 2. Surface Area Calculations
    const surfaceAreaFloorCeiling = 2 * (L * W);
    const surfaceAreaWalls = 2 * (H * L) + 2 * (H * W);
    const totalSurfaceArea = surfaceAreaFloorCeiling + surfaceAreaWalls;

    // 3. Transmission Load (BTU/hr)
    const deltaT = Math.max(0, tempAmb - tempInt);
    // U-factor = 1 / R
    const uFactor = 1 / R;
    const transmissionLoad = totalSurfaceArea * uFactor * deltaT * sunFactor;

    // 4. Product Heat Load (BTU/hr based on 24hr pull-down)
    // Specific heats (BTU/lb°F): produce ~0.9, meat ~0.8, dairy ~0.85, frozen ~0.4
    // Respiration heat for produce: ~10 BTU/lb/day at 35-40F
    let specificHeat = 0.85;
    let respirationPerDay = 0; // BTU/lb/day
    if (prodType === 'produce') {
      specificHeat = 0.9;
      respirationPerDay = 12;
    } else if (prodType === 'meat') {
      specificHeat = 0.8;
      respirationPerDay = 0;
    } else if (prodType === 'dairy') {
      specificHeat = 0.85;
      respirationPerDay = 0;
    } else if (prodType === 'frozen') {
      specificHeat = 0.4;
      respirationPerDay = 0;
    } else {
      specificHeat = 0;
    }

    // Sensible heat of product cooling (assume 20°F pulldown if warm loaded)
    const productSensible = (prodMass * specificHeat * 20) / 24;
    const productRespiration = (prodMass * respirationPerDay) / 24;
    const productLoad = productSensible + productRespiration;

    // 5. Infiltration Load (Door openings)
    // Simplified rule of thumb: ~300 to 500 BTU per opening for medium rooms
    const infiltrationLoad = doors * 350;

    // 6. Internal Heat Loads (Lighting & Occupancy)
    // 1 Watt = 3.412 BTU/hr
    const lightingLoad = watts * 3.412;
    // Person emits ~750 BTU/hr in cold rooms
    const occupancyLoad = occupancy * 750 * (24 / 24); // distributed
    const internalLoad = lightingLoad + occupancyLoad;

    // Subtotal before safety factor
    const subtotalLoad = transmissionLoad + productLoad + infiltrationLoad + internalLoad;
    
    // Add 10% safety contingency factor
    const safetyFactor = 1.10;
    const totalLoadBTU = subtotalLoad * safetyFactor;

    // Convert to Metric if requested for display
    // 1 BTU/hr = 0.000293071 kW
    const totalLoadKW = totalLoadBTU * 0.000293071;
    // 1 Ton of Refrigeration = 12,000 BTU/hr
    const tonsOfRefrigeration = totalLoadBTU / 12000;
    // Approximate HP (typically 1 HP per 1.2 to 1.5 TR for commercial medium temp)
    const compressorHP = tonsOfRefrigeration * 1.35;

    // Sensible-to-Latent Ratio estimation
    const sensibleSubtotal = transmissionLoad + productSensible + lightingLoad + (occupancyLoad * 0.7) + (infiltrationLoad * 0.6);
    const shr = Math.min(100, Math.max(50, (sensibleSubtotal / subtotalLoad) * 100));

    // Store for export
    lastCalculation = {
      isMetric,
      totalLoadBTU,
      totalLoadKW,
      compressorHP,
      tonsOfRefrigeration,
      shr,
      breakdown: [
        { name: 'Transmission', desc: 'Walls, Roof & Floor Heat Gain', valBTU: transmissionLoad },
        { name: 'Product Load', desc: 'Pulldown & Respiration', valBTU: productLoad },
        { name: 'Infiltration', desc: 'Door Openings Air Exchange', valBTU: infiltrationLoad },
        { name: 'Internal Load', desc: 'Lighting & Personnel', valBTU: internalLoad },
        { name: 'Safety Margin', desc: '10% Contingency Allowance', valBTU: subtotalLoad * 0.1 }
      ]
    };

    // Update DOM Metrics
    if (isMetric) {
      metricTotalLoad.textContent = totalLoadKW.toFixed(2);
      metricTotalUnit.textContent = 'kW';
    } else {
      metricTotalLoad.textContent = Math.round(totalLoadBTU).toLocaleString();
      metricTotalUnit.textContent = 'BTU/hr';
    }

    metricHp.textContent = Math.max(0.25, compressorHP).toFixed(2);
    metricTons.textContent = tonsOfRefrigeration.toFixed(2);
    metricShr.textContent = shr.toFixed(1) + '%';

    // Render Breakdown Table
    tbodyBreakdown.innerHTML = '';
    lastCalculation.breakdown.forEach(item => {
      const share = ((item.valBTU / totalLoadBTU) * 100).toFixed(1);
      const displayVal = isMetric ? (item.valBTU * 0.000293071).toFixed(2) + ' kW' : Math.round(item.valBTU).toLocaleString() + ' BTU/hr';
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${item.name}</strong></td>
        <td><span style="color: var(--text-muted); font-size: 0.8rem;">${item.desc}</span></td>
        <td class="text-right">${displayVal}</td>
        <td class="text-right">${share}%</td>
      `;
      tbodyBreakdown.appendChild(tr);
    });

    // Generate dynamic engineering recommendations
    recommendationList.innerHTML = '';
    const recs = [];
    recs.push('Calculations include a standard 10% safety contingency factor for peak ambient surges.');
    if (deltaT > 50) {
      recs.push('⚠️ High temperature delta (>50°F). Consider upgrading insulation R-value to reduce operating compressor runtime.');
    }
    if (doors > 30) {
      recs.push('⚠️ High frequency of door openings. Air curtains or strip curtains are strongly recommended to curb infiltration load.');
    }
    if (prodType === 'produce' && prodMass > 300) {
      recs.push('🌱 Produce respiration heat load is significant. Ensure adequate evaporator airflow for humidity & ethylene management.');
    }
    if (compressorHP > 3.0) {
      recs.push('💡 Consider multi-compressor staging or variable-speed inverter condensing units for part-load energy efficiency.');
    } else {
      recs.push('✅ Standard hermetic or semi-hermetic condensing unit suitable for this load class.');
    }

    recs.forEach(r => {
      const li = document.createElement('li');
      li.textContent = r;
      recommendationList.appendChild(li);
    });

    // Render Canvas Chart
    renderDonutChart(lastCalculation.breakdown);
  }

  function renderDonutChart(breakdown) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const total = breakdown.reduce((acc, curr) => acc + curr.valBTU, 0);
    if (total <= 0) return;

    const colors = ['#38bdf8', '#34d399', '#60a5fa', '#fbbf24', '#f43f5e'];
    let startAngle = -Math.PI / 2;

    const centerX = 130;
    const centerY = 110;
    const radius = 80;
    const cutout = 45;

    breakdown.forEach((item, index) => {
      const sliceAngle = (item.valBTU / total) * (2 * Math.PI);
      const endAngle = startAngle + sliceAngle;

      // Draw slice
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.arc(centerX, centerY, cutout, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = colors[index % colors.length];
      ctx.fill();

      startAngle = endAngle;
    });

    // Draw legend on the right side of canvas
    let legendX = 250;
    let legendY = 35;
    breakdown.forEach((item, index) => {
      const pct = ((item.valBTU / total) * 100).toFixed(1);
      
      // Color box
      ctx.fillStyle = colors[index % colors.length];
      ctx.fillRect(legendX, legendY, 12, 12);
      
      // Text
      ctx.fillStyle = '#f8fafc';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(`${item.name} (${pct}%)`, legendX + 18, legendY + 10);
      
      legendY += 28;
    });
  }

  function generateReportText() {
    const isMetric = lastCalculation.isMetric;
    const totalStr = isMetric ? `${lastCalculation.totalLoadKW.toFixed(2)} kW` : `${Math.round(lastCalculation.totalLoadBTU).toLocaleString()} BTU/hr`;
    
    let text = `=========================================
  AURAFROST THERMAL LOAD ENGINEERING REPORT
=========================================
Target Internal Temp: ${elTempInternal.value}°${isMetric ? 'C' : 'F'}
Peak Ambient Temp:    ${elTempAmbient.value}°${isMetric ? 'C' : 'F'}
Room Dimensions:      ${elLength.value} x ${elWidth.value} x ${elHeight.value} ${elUnitLength.value}
Insulation R-Value:   R-${elInsulationRVal.value}
-----------------------------------------
RESULTS & SIZING:
- Total Peak Heat Gain: ${totalStr}
- Cooling Capacity:     ${lastCalculation.tonsOfRefrigeration.toFixed(2)} TR (Tons of Refrigeration)
- Compressor Sizing:    ${Math.max(0.25, lastCalculation.compressorHP).toFixed(2)} HP
- Sensible/Latent Ratio:${lastCalculation.shr.toFixed(1)}% SHR
-----------------------------------------
COMPONENT BREAKDOWN:
`;

    lastCalculation.breakdown.forEach(item => {
      const pct = ((item.valBTU / lastCalculation.totalLoadBTU) * 100).toFixed(1);
      const valStr = isMetric ? `${(item.valBTU * 0.000293071).toFixed(2)} kW` : `${Math.round(item.valBTU).toLocaleString()} BTU/hr`;
      text += `• ${item.name.padEnd(16)} : ${valStr.padEnd(16)} (${pct}%)
`;
    });

    text += `=========================================
Generated via AuraFrost Laboratory
Client-Side Thermal Analytics Studio
=========================================
`;

    exportReportText.textContent = text;
  }

  // Initial calculation on load
  calculateAndRender();
});
