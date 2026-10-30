document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const wheelSizeSelect = document.getElementById('wheel-size');
  const customCircGroup = document.getElementById('custom-circ-group');
  const customCircInput = document.getElementById('custom-circ');
  const unitSystemSelect = document.getElementById('unit-system');
  const targetCadenceSlider = document.getElementById('target-cadence');
  const cadenceValSpan = document.getElementById('cadence-val');
  const summaryCadenceLabel = document.getElementById('summary-cadence-label');
  const chartCadenceRef = document.getElementById('chart-cadence-ref');
  const tblCadenceSpan = document.getElementById('tbl-cadence');
  const crankLengthSelect = document.getElementById('crank-length');
  
  const chainringsInput = document.getElementById('chainrings-input');
  const chainringsChips = document.getElementById('chainrings-chips');
  const cogsInput = document.getElementById('cogs-input');
  const cogsChips = document.getElementById('cogs-chips');
  
  const metricMinRatio = document.getElementById('metric-min-ratio');
  const metricMinInches = document.getElementById('metric-min-inches');
  const metricMaxRatio = document.getElementById('metric-max-ratio');
  const metricMaxInches = document.getElementById('metric-max-inches');
  const metricMaxSpeed = document.getElementById('metric-max-speed');
  const metricSpeedUnit = document.getElementById('metric-speed-unit');
  const metricGearRange = document.getElementById('metric-gear-range');
  const tblUnitElements = document.querySelectorAll('.tbl-unit');
  
  const gearTableBody = document.getElementById('gear-table-body');
  const speedMatrixCanvas = document.getElementById('speed-matrix-canvas');
  
  const btnPresetModal = document.getElementById('btn-preset-modal');
  const presetModal = document.getElementById('preset-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnReset = document.getElementById('btn-reset');

  // Presets definition
  const presets = {
    road2x11: { wheel: '2136', chainrings: '50, 34', cogs: '11, 12, 13, 14, 15, 17, 19, 22, 25, 28, 34' },
    gravel1x12: { wheel: '2136', chainrings: '42', cogs: '10, 12, 14, 16, 18, 21, 24, 28, 32, 36, 42, 52' },
    mtb1x12: { wheel: '2255', chainrings: '32', cogs: '10, 12, 14, 16, 18, 21, 24, 28, 32, 36, 42, 51' },
    commuter3x8: { wheel: '2136', chainrings: '48, 38, 28', cogs: '11, 13, 15, 18, 21, 24, 28, 32' },
    track: { wheel: '2105', chainrings: '48', cogs: '16' }
  };

  // State variables
  let wheelCircumference = 2136;
  let unit = 'kmh';
  let targetCadence = 90;
  let chainrings = [50, 34];
  let cogs = [11, 12, 13, 14, 16, 18, 21, 24, 28, 32, 36];

  // Helper: Parse integer arrays from comma input
  function parseList(str) {
    return str.split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0)
      .sort((a, b) => b - a); // descending for chainrings and cogs usually
  }

  // Update UI chips
  function renderChips() {
    chainringsChips.innerHTML = '';
    chainrings.forEach((ring, idx) => {
      const chip = document.createElement('span');
      chip.className = 'chip ring-chip';
      chip.textContent = `${ring}T (Ring ${idx + 1})`;
      chainringsChips.appendChild(chip);
    });

    cogsChips.innerHTML = '';
    cogs.forEach(cog => {
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = `${cog}T`;
      cogsChips.appendChild(chip);
    });
  }

  // Main calculation engine
  function calculateData() {
    // Collect all valid gear combinations
    let allCombinations = [];
    
    chainrings.forEach((ring, ringIdx) => {
      cogs.forEach(cog => {
        const ratio = ring / cog;
        const developmentMeters = (ring / cog) * (wheelCircumference / 1000);
        const gearInches = (ring / cog) * (wheelCircumference / 25.4 / Math.PI);
        
        // Speed calculation
        // Development (m) * RPM * 60 min / 1000 = km/h
        let speed = (developmentMeters * targetCadence * 60) / 1000;
        if (unit === 'mph') {
          speed = speed * 0.621371;
        }

        allCombinations.push({
          ring,
          ringIdx,
          cog,
          ratio,
          developmentMeters,
          gearInches,
          speed
        });
      });
    });

    // Sort combinations by ratio ascending for step calculation
    allCombinations.sort((a, b) => a.ratio - b.ratio);

    // Calculate step percentages
    for (let i = 0; i < allCombinations.length; i++) {
      if (i === 0) {
        allCombinations[i].step = 0;
      } else {
        const prev = allCombinations[i - 1].ratio;
        const curr = allCombinations[i].ratio;
        allCombinations[i].step = ((curr - prev) / prev) * 100;
      }
    }

    return allCombinations;
  }

  // Render table and metrics
  function updateUI() {
    const combs = calculateData();
    if (combs.length === 0) return;

    const minGear = combs[0];
    const maxGear = combs[combs.length - 1];

    // Metrics update
    metricMinRatio.textContent = minGear.ratio.toFixed(2);
    metricMinInches.textContent = `${minGear.gearInches.toFixed(1)} in / ${minGear.developmentMeters.toFixed(2)}m`;
    
    metricMaxRatio.textContent = maxGear.ratio.toFixed(2);
    metricMaxInches.textContent = `${maxGear.gearInches.toFixed(1)} in / ${maxGear.developmentMeters.toFixed(2)}m`;
    
    metricMaxSpeed.textContent = maxGear.speed.toFixed(1);
    metricSpeedUnit.textContent = unit === 'kmh' ? 'km/h' : 'mph';
    
    const totalRange = (maxGear.ratio / minGear.ratio) * 100;
    metricGearRange.textContent = `${Math.round(totalRange)}%`;

    summaryCadenceLabel.textContent = targetCadence;
    chartCadenceRef.textContent = targetCadence;
    tblCadenceSpan.textContent = targetCadence;
    tblUnitElements.forEach(el => el.textContent = unit === 'kmh' ? 'km/h' : 'mph');

    // Populate Table (descending speed order for readability or ascending ratio)
    const displayCombs = [...combs].sort((a, b) => b.ratio - a.ratio);
    gearTableBody.innerHTML = '';
    displayCombs.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${item.ring}T</strong> / ${item.cog}T</td>
        <td>${item.ratio.toFixed(2)}</td>
        <td>${item.gearInches.toFixed(1)} in</td>
        <td>${item.developmentMeters.toFixed(2)} m</td>
        <td><strong>${item.speed.toFixed(1)}</strong></td>
        <td>${index === displayCombs.length - 1 ? '-' : '+' + item.step.toFixed(1) + '%'}</td>
      `;
      gearTableBody.appendChild(tr);
    });

    drawCanvasChart(combs);
  }

  // Canvas Chart Renderer
  function drawCanvasChart(combs) {
    const canvas = speedMatrixCanvas;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (combs.length === 0) return;

    const padding = { top: 30, right: 30, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Find max speed for scaling
    const maxSpeed = Math.max(...combs.map(c => c.speed)) * 1.1;

    // Draw grid lines
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px system-ui, sans-serif';

    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const val = (maxSpeed / gridSteps) * i;
      const y = padding.top + chartHeight - (chartHeight / gridSteps) * i;
      
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.textAlign = 'right';
      ctx.fillText(val.toFixed(0), padding.left - 8, y + 4);
    }

    // Group by Chainrings
    const ringGroups = {};
    chainrings.forEach(ring => ringGroups[ring] = []);
    combs.forEach(c => {
      if (ringGroups[c.ring]) ringGroups[c.ring].push(c);
    });

    const ringColors = ['#38bdf8', '#f43f5e', '#10b981', '#a855f7'];
    let colorIndex = 0;

    Object.keys(ringGroups).forEach(ring => {
      const group = ringGroups[ring];
      if (group.length === 0) return;

      const color = ringColors[colorIndex % ringColors.length];
      colorIndex++;

      // Sort group by cog size descending (largest cog = easiest gear first)
      group.sort((a, b) => b.cog - a.cog);

      const stepX = chartWidth / Math.max(1, group.length - 1);

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 2.5;

      // Draw line
      ctx.beginPath();
      group.forEach((item, idx) => {
        const x = padding.left + (group.length === 1 ? chartWidth / 2 : idx * stepX);
        const y = padding.top + chartHeight - (item.speed / maxSpeed) * chartHeight;
        
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw points & X labels
      group.forEach((item, idx) => {
        const x = padding.left + (group.length === 1 ? chartWidth / 2 : idx * stepX);
        const y = padding.top + chartHeight - (item.speed / maxSpeed) * chartHeight;

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // X Axis labels (Cog teeth) on first ring pass
        if (colorIndex === 1) {
          ctx.fillStyle = '#94a3b8';
          ctx.textAlign = 'center';
          ctx.fillText(`${item.cog}T`, x, height - 12);
        }
      });
    });

    // Axis titles
    ctx.save();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Rear Cassette Cogs (Largest to Smallest Gear Ratio)', padding.left + chartWidth / 2, height - 2);
    
    ctx.translate(15, padding.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`Speed (${unit === 'kmh' ? 'km/h' : 'mph'})`, 0, 0);
    ctx.restore();
  }

  // Event Listeners
  wheelSizeSelect.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
      customCircGroup.style.display = 'flex';
      wheelCircumference = parseFloat(customCircInput.value) || 2136;
    } else {
      customCircGroup.style.display = 'none';
      wheelCircumference = parseFloat(e.target.value);
    }
    updateUI();
  });

  customCircInput.addEventListener('input', (e) => {
    wheelCircumference = parseFloat(e.target.value) || 2136;
    updateUI();
  });

  unitSystemSelect.addEventListener('change', (e) => {
    unit = e.target.value;
    updateUI();
  });

  targetCadenceSlider.addEventListener('input', (e) => {
    targetCadence = parseInt(e.target.value, 10);
    cadenceValSpan.textContent = targetCadence;
    updateUI();
  });

  chainringsInput.addEventListener('input', (e) => {
    chainrings = parseList(e.target.value);
    if (chainrings.length === 0) chainrings = [50];
    renderChips();
    updateUI();
  });

  cogsInput.addEventListener('input', (e) => {
    cogs = parseList(e.target.value);
    if (cogs.length === 0) cogs = [16];
    renderChips();
    updateUI();
  });

  // Preset Modal Actions
  btnPresetModal.addEventListener('click', () => {
    presetModal.style.display = 'flex';
  });

  btnCloseModal.addEventListener('click', () => {
    presetModal.style.display = 'none';
  });

  presetModal.addEventListener('click', (e) => {
    if (e.target === presetModal) presetModal.style.display = 'none';
  });

  document.querySelectorAll('.preset-card').forEach(card => {
    card.addEventListener('click', () => {
      const pKey = card.getAttribute('data-preset');
      const p = presets[pKey];
      if (p) {
        wheelSizeSelect.value = p.wheel;
        customCircGroup.style.display = 'none';
        wheelCircumference = parseFloat(p.wheel);
        chainringsInput.value = p.chainrings;
        cogsInput.value = p.cogs;
        chainrings = parseList(p.chainrings);
        cogs = parseList(p.cogs);
        renderChips();
        updateUI();
        presetModal.style.display = 'none';
      }
    });
  });

  btnReset.addEventListener('click', () => {
    wheelSizeSelect.value = '2255';
    customCircGroup.style.display = 'none';
    wheelCircumference = 2255;
    unitSystemSelect.value = 'kmh';
    unit = 'kmh';
    targetCadenceSlider.value = 90;
    cadenceValSpan.textContent = 90;
    targetCadence = 90;
    chainringsInput.value = '50, 34';
    cogsInput.value = '11, 12, 13, 14, 16, 18, 21, 24, 28, 32, 36';
    chainrings = [50, 34];
    cogs = [11, 12, 13, 14, 16, 18, 21, 24, 28, 32, 36];
    renderChips();
    updateUI();
  });

  // Initial Load
  renderChips();
  updateUI();
});
