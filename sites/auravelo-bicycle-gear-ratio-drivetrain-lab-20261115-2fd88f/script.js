document.addEventListener('DOMContentLoaded', () => {
  // State definition
  const state = {
    wheelCircumference: 2096, // mm (700x25c default)
    chainrings: [50, 34],
    cassette: [11, 12, 13, 15, 17, 19, 21, 24, 28, 32, 36],
    cadence: 90,
    speedUnit: 'kmh', // 'kmh' or 'mph'
    showInches: true
  };

  // Wheel standard presets (circumference in mm)
  const wheelStandards = {
    '700x25': 2096,
    '700x32': 2155,
    '29er': 2288,
    '275': 2235,
    'bmx': 1545
  };

  // DOM Elements
  const bikeTypeSelect = document.getElementById('bikeType');
  const customCircGroup = document.getElementById('customCircGroup');
  const customCircInput = document.getElementById('customCirc');
  const chainringsInput = document.getElementById('chainrings');
  const cassetteInput = document.getElementById('cassette');
  const targetCadenceInput = document.getElementById('targetCadence');
  const speedUnitSelect = document.getElementById('speedUnit');
  const btnCalculate = document.getElementById('btnCalculate');
  const btnReset = document.getElementById('btnReset');

  const statGearRange = document.getElementById('statGearRange');
  const statMinSpeed = document.getElementById('statMinSpeed');
  const statMaxSpeed = document.getElementById('statMaxSpeed');
  const statCombos = document.getElementById('statCombos');

  const matrixBody = document.getElementById('matrixBody');
  const matrixTable = document.getElementById('matrixTable');
  const displayCadenceSpan = document.getElementById('displayCadence');
  const toggleInchesCheckbox = document.getElementById('toggleInches');

  const progressionBody = document.getElementById('progressionBody');
  const unitLbls = document.querySelectorAll('.unit-lbl');

  // Canvas Elements
  const speedCanvas = document.getElementById('speedCanvas');
  const jumpCanvas = document.getElementById('jumpCanvas');

  // Tab navigation
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(`tab-${tabId}`).classList.add('active');

      // Redraw canvases when switching tabs in case dimensions changed
      if (tabId === 'matrix') drawSpeedChart();
      if (tabId === 'progression') drawJumpChart();
    });
  });

  // Event Listeners for inputs
  bikeTypeSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      customCircGroup.style.display = 'block';
      state.wheelCircumference = parseFloat(customCircInput.value) || 2000;
    } else {
      customCircGroup.style.display = 'none';
      state.wheelCircumference = wheelStandards[val] || 2096;
      customCircInput.value = state.wheelCircumference;
    }
  });

  customCircInput.addEventListener('input', (e) => {
    state.wheelCircumference = parseFloat(e.target.value) || 2000;
  });

  speedUnitSelect.addEventListener('change', (e) => {
    state.speedUnit = e.target.value;
    unitLbls.forEach(lbl => lbl.textContent = state.speedUnit);
    runCalculations();
  });

  toggleInchesCheckbox.addEventListener('change', (e) => {
    state.showInches = e.target.checked;
    buildMatrixTable();
  });

  btnCalculate.addEventListener('click', () => {
    parseInputs();
    runCalculations();
  });

  btnReset.addEventListener('click', () => {
    bikeTypeSelect.value = '700x25';
    customCircGroup.style.display = 'none';
    chainringsInput.value = '50, 34';
    cassetteInput.value = '11, 12, 13, 15, 17, 19, 21, 24, 28, 32, 36';
    targetCadenceInput.value = 90;
    speedUnitSelect.value = 'kmh';
    state.wheelCircumference = 2096;
    state.speedUnit = 'kmh';
    unitLbls.forEach(lbl => lbl.textContent = 'km/h');
    toggleInchesCheckbox.checked = true;
    state.showInches = true;
    
    parseInputs();
    runCalculations();
  });

  // Preset load buttons
  document.querySelectorAll('.preset-card .btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.preset-card');
      const chain = card.getAttribute('data-chain');
      const cog = card.getAttribute('data-cog');
      const type = card.getAttribute('data-type');

      chainringsInput.value = chain;
      cassetteInput.value = cog;
      bikeTypeSelect.value = type;

      if (type === 'custom') {
        customCircGroup.style.display = 'block';
      } else {
        customCircGroup.style.display = 'none';
        state.wheelCircumference = wheelStandards[type] || 2096;
        customCircInput.value = state.wheelCircumference;
      }

      parseInputs();
      runCalculations();

      // Switch to matrix tab
      tabBtns[0].click();
    });
  });

  function parseInputs() {
    // Parse chainrings
    const chainText = chainringsInput.value;
    state.chainrings = chainText
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n > 0)
      .sort((a, b) => b - a); // largest to smallest

    if (state.chainrings.length === 0) state.chainrings = [50];

    // Parse cassette
    const cogText = cassetteInput.value;
    state.cassette = cogText
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n > 0)
      .sort((a, b) => a - b); // smallest to largest

    if (state.cassette.length === 0) state.cassette = [11, 28];

    state.cadence = parseFloat(targetCadenceInput.value) || 90;
    displayCadenceSpan.textContent = state.cadence;
  }

  // Math calculations
  function calculateSpeed(chainring, cog, cadence)
  let speedKmh = (chainring / cog) * state.wheelCircumference * cadence * 60 / 1000000;
  if (state.speedUnit === 'mph') {
    return speedKmh * 0.621371;
  }
  return speedKmh;

  function calculateGearInches(chainring, cog) {
    // Gear Inches = (Chainring / Cog) * Wheel Diameter in inches
    // Wheel Diameter in inches = Circumference in mm / (Math.PI * 25.4)
    const wheelDiamInches = state.wheelCircumference / (Math.PI * 25.4);
    return (chainring / cog) * wheelDiamInches;
  }

  function calculateDevelopment(chainring, cog) {
    // Development in meters = (Chainring / Cog) * Circumference in meters
    return (chainring / cog) * (state.wheelCircumference / 1000);
  }

  let allCombos = [];

  function runCalculations() {
    allCombos = [];

    state.chainrings.forEach(chain => {
      state.cassette.forEach(cog => {
        const ratio = chain / cog;
        const gearInches = calculateGearInches(chain, cog);
        const development = calculateDevelopment(chain, cog);
        const speed = calculateSpeed(chain, cog, state.cadence);

        allCombos.push({
          chainring: chain,
          cog: cog,
          ratio: ratio,
          gearInches: gearInches,
          development: development,
          speed: speed
        });
      });
    });

    // Sort by gear inches / ratio ascending for progression analysis
    allCombos.sort((a, b) => a.ratio - b.ratio);

    updateStats();
    buildMatrixTable();
    buildProgressionTable();
    drawSpeedChart();
    drawJumpChart();
  }

  function updateStats() {
    if (allCombos.length === 0) return;
    const minGear = allCombos[0];
    const maxGear = allCombos[allCombos.length - 1];

    statGearRange.textContent = `${minGear.gearInches.toFixed(1)}" - ${maxGear.gearInches.toFixed(1)}"`;
    statMinSpeed.textContent = `${minGear.speed.toFixed(1)} ${state.speedUnit}`;
    statMaxSpeed.textContent = `${maxGear.speed.toFixed(1)} ${state.speedUnit}`;
    statCombos.textContent = `${state.chainrings.length} × ${state.cassette.length} (${allCombos.length})`;
  }

  function buildMatrixTable() {
    matrixBody.innerHTML = '';

    // Header row: cogs
    let headerHtml = '<tr><th>Chain \ Cog</th>';
    state.cassette.forEach(cog => {
      headerHtml += `<th>${cog}T</th>`;
    });
    headerHtml += '</tr>';

    let rowsHtml = headerHtml;

    state.chainrings.forEach(chain => {
      rowsHtml += `<tr><th>${chain}T</th>`;
      state.cassette.forEach(cog => {
        const speed = calculateSpeed(chain, cog, state.cadence);
        const inches = calculateGearInches(chain, cog);
        rowsHtml += `
          <td>
            <div class="matrix-cell">
              <span class="matrix-speed">${speed.toFixed(1)} <small>${state.speedUnit}</small></span>
              ${state.showInches ? `<span class="matrix-inches">${inches.toFixed(1)}"</span>` : ''}
            </div>
          </td>
        `;
      });
      rowsHtml += '</tr>';
    });

    matrixBody.innerHTML = rowsHtml;
  }

  function buildProgressionTable() {
    progressionBody.innerHTML = '';

    for (let i = 0; i < allCombos.length; i++) {
      const curr = allCombos[i];
      let jumpPercent = '--';

      if (i < allCombos.length - 1) {
        const next = allCombos[i + 1];
        // Jump calculation: ((Next Ratio / Curr Ratio) - 1) * 100
        const jump = ((next.ratio / curr.ratio) - 1) * 100;
        jumpPercent = `${jump.toFixed(1)}%`;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${curr.chainring}T</td>
        <td>${curr.cog}T</td>
        <td>${curr.ratio.toFixed(2)}</td>
        <td>${curr.gearInches.toFixed(1)}"</td>
        <td>${curr.development.toFixed(2)} m</td>
        <td>${curr.speed.toFixed(1)}</td>
        <td>${jumpPercent}</td>
      `;
      progressionBody.appendChild(tr);
    }
  }

  function drawSpeedChart() {
    if (!speedCanvas) return;
    const ctx = speedCanvas.getContext('2d');
    const width = speedCanvas.width;
    const height = speedCanvas.height;

    ctx.clearRect(0, 0, width, height);

    if (allCombos.length === 0) return;

    // We will plot Cadence (40 to 120 RPM) vs Speed for Max Gear and Min Gear
    const maxGear = allCombos[allCombos.length - 1];
    const minGear = allCombos[0];

    const cadences = [40, 50, 60, 70, 80, 90, 100, 110, 120];
    const maxSpeeds = cadences.map(c => calculateSpeed(maxGear.chainring, maxGear.cog, c));
    const minSpeeds = cadences.map(c => calculateSpeed(minGear.chainring, minGear.cog, c));

    const topSpeedVal = Math.max(...maxSpeeds) * 1.1;

    // Margins
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Draw axes
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Draw grid lines & labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const val = (topSpeedVal / 4) * i;
      const y = height - padding - (chartHeight / 4) * i;
      ctx.fillText(`${val.toFixed(0)}`, padding - 8, y + 4);

      ctx.strokeStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // X-axis labels (Cadence)
    ctx.textAlign = 'center';
    cadences.forEach((cad, idx) => {
      const x = padding + (chartWidth / (cadences.length - 1)) * idx;
      ctx.fillText(`${cad}`, x, height - padding + 16);
    });
    ctx.fillText('Cadence (RPM)', width / 2, height - 8);

    // Helper to plot line
    function plotLine(data, color, label) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      data.forEach((val, idx) => {
        const x = padding + (chartWidth / (cadences.length - 1)) * idx;
        const y = height - padding - (val / topSpeedVal) * chartHeight;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw points
      data.forEach((val, idx) => {
        const x = padding + (chartWidth / (cadences.length - 1)) * idx;
        const y = height - padding - (val / topSpeedVal) * chartHeight;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    plotLine(maxSpeeds, '#38bdf8', `Max Gear (${maxGear.chainring}x${maxGear.cog})`);
    plotLine(minSpeeds, '#10b981', `Min Gear (${minGear.chainring}x${minGear.cog})`);

    // Legend
    ctx.font = '11px system-ui';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(width - 160, padding, 12, 12);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`Max (${maxGear.chainring}T/${maxGear.cog}T)`, width - 140, padding + 10);

    ctx.fillStyle = '#10b981';
    ctx.fillRect(width - 160, padding + 20, 12, 12);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`Min (${minGear.chainring}T/${minGear.cog}T)`, width - 140, padding + 30);
  }

  function drawJumpChart() {
    if (!jumpCanvas) return;
    const ctx = jumpCanvas.getContext('2d');
    const width = jumpCanvas.width;
    const height = jumpCanvas.height;

    ctx.clearRect(0, 0, width, height);

    if (allCombos.length < 2) return;

    let jumps = [];
    for (let i = 0; i < allCombos.length - 1; i++) {
      const jump = ((allCombos[i+1].ratio / allCombos[i].ratio) - 1) * 100;
      jumps.push({
        val: jump,
        label: `${allCombos[i].chainring}x${allCombos[i].cog} → ${allCombos[i+1].cog}`
      });
    }

    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const maxJump = Math.max(25, ...jumps.map(j => j.val)) * 1.1;

    // Axes
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    // Ideal jump guideline (12%)
    const idealY = height - padding - (12 / maxJump) * chartHeight;
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding, idealY);
    ctx.lineTo(width - padding, idealY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#10b981';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    ctx.fillText('Ideal Jump (12%)', width - padding - 10, idealY - 5);

    // Draw bars
    const barWidth = chartWidth / jumps.length * 0.7;
    const spacing = chartWidth / jumps.length;

    jumps.forEach((j, idx) => {
      const x = padding + spacing * idx + (spacing - barWidth) / 2;
      const barH = (j.val / maxJump) * chartHeight;
      const y = height - padding - barH;

      ctx.fillStyle = j.val > 20 ? '#f43f5e' : (j.val < 8 ? '#f59e0b' : '#38bdf8');
      ctx.fillRect(x, y, barWidth, barH);

      // Value on top
      ctx.fillStyle = '#f8fafc';
      ctx.font = '9px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`${j.val.toFixed(0)}%`, x + barWidth / 2, y - 5);
    });

    // Y-axis labels
    ctx.textAlign = 'right';
    ctx.fillStyle = '#94a3b8';
    for (let i = 0; i <= 4; i++) {
      const val = (maxJump / 4) * i;
      const y = height - padding - (chartHeight / 4) * i;
      ctx.fillText(`${val.toFixed(0)}%`, padding - 8, y + 4);
    }
  }

  // Initial run
  parseInputs();
  runCalculations();
});
