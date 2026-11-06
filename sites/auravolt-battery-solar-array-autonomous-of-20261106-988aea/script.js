/* AuraVolt: Battery Solar Array & Autonomous Off-Grid Energy Lab */

document.addEventListener('DOMContentLoaded', () => {
  // Default appliances dataset
  let appliances = [
    { id: 1, name: '12V Compressor Fridge', watts: 60, hours: 8, type: 'DC' },
    { id: 2, name: 'LED Lighting', watts: 20, hours: 5, type: 'DC' },
    { id: 3, name: 'Laptop Charger', watts: 65, hours: 4, type: 'AC' },
    { id: 4, name: 'Phone & Gadgets', watts: 15, hours: 3, type: 'DC' },
    { id: 5, name: 'Water Pump', watts: 80, hours: 0.5, type: 'DC' }
  ];

  // DOM Elements
  const peakSunHoursInput = document.getElementById('peak-sun-hours');
  const valPeakSunHours = document.getElementById('val-peak-sun-hours');
  const panelEffInput = document.getElementById('panel-efficiency');
  const valPanelEff = document.getElementById('val-panel-efficiency');
  const systemVoltageSelect = document.getElementById('system-voltage');
  const batteryChemSelect = document.getElementById('battery-chemistry');
  const dodSlider = document.getElementById('dod-slider');
  const valDod = document.getElementById('val-dod');
  const autonomyDaysInput = document.getElementById('autonomy-days');
  const valAutonomy = document.getElementById('val-autonomy');
  const inverterEffInput = document.getElementById('inverter-eff');
  const valInverterEff = document.getElementById('val-inverter-eff');

  // Table & Add elements
  const appliancesTbody = document.getElementById('appliances-tbody');
  const newNameInput = document.getElementById('new-name');
  const newWattsInput = document.getElementById('new-watts');
  const newHoursInput = document.getElementById('new-hours');
  const newTypeSelect = document.getElementById('new-type');
  const btnConfirmAdd = document.getElementById('btn-confirm-add');

  // Metrics elements
  const resTotalWh = document.getElementById('res-total-wh');
  const resTotalKwh = document.getElementById('res-total-kwh');
  const resSolarWatts = document.getElementById('res-solar-watts');
  const resSolarPanels = document.getElementById('res-solar-panels');
  const resBatteryAh = document.getElementById('res-battery-ah');
  const resBatteryWh = document.getElementById('res-battery-wh');
  const resInverterW = document.getElementById('res-inverter-w');
  const resSurgeW = document.getElementById('res-surge-w');

  // Buttons
  const btnPresetVan = document.getElementById('btn-preset-van');
  const btnPresetCabin = document.getElementById('btn-preset-cabin');
  const btnReset = document.getElementById('btn-reset');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnPrintSummary = document.getElementById('btn-print-summary');

  // Canvas
  const canvas = document.getElementById('energy-canvas');
  const ctx = canvas.getContext('2d');

  // Initialize event listeners
  function initEvents() {
    peakSunHoursInput.addEventListener('input', updateValues);
    panelEffInput.addEventListener('input', updateValues);
    systemVoltageSelect.addEventListener('change', updateValues);
    batteryChemSelect.addEventListener('change', onChemistryChange);
    dodSlider.addEventListener('input', updateValues);
    autonomyDaysInput.addEventListener('input', updateValues);
    inverterEffInput.addEventListener('input', updateValues);

    btnConfirmAdd.addEventListener('click', addAppliance);
    btnPresetVan.addEventListener('click', loadVanPreset);
    btnPresetCabin.addEventListener('click', loadCabinPreset);
    btnReset.addEventListener('click', resetDefaults);
    btnExportJson.addEventListener('click', exportJson);
    btnPrintSummary.addEventListener('click', () => window.print());

    // Allow enter key in quick add
    [newNameInput, newWattsInput, newHoursInput].forEach(el => {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addAppliance();
      });
    });
  }

  function onChemistryChange() {
    const chem = batteryChemSelect.value;
    if (chem === 'lifepo4') {
      dodSlider.value = 80;
    } else {
      dodSlider.value = 50;
    }
    updateValues();
  }

  function loadVanPreset() {
    appliances = [
      { id: Date.now() + 1, name: '12V Fridge', watts: 55, hours: 10, type: 'DC' },
      { id: Date.now() + 2, name: 'MaxxAir Fan', watts: 25, hours: 6, type: 'DC' },
      { id: Date.now() + 3, name: 'LED Lights', watts: 15, hours: 4, type: 'DC' },
      { id: Date.now() + 4, name: 'MacBook Pro', watts: 60, hours: 3, type: 'AC' }
    ];
    systemVoltageSelect.value = '12';
    batteryChemSelect.value = 'lifepo4';
    dodSlider.value = 80;
    autonomyDaysInput.value = 2;
    peakSunHoursInput.value = 5;
    renderTable();
    updateValues();
  }

  function loadCabinPreset() {
    appliances = [
      { id: Date.now() + 1, name: 'Energy Star Fridge', watts: 90, hours: 12, type: 'AC' },
      { id: Date.now() + 2, name: 'LED Cabin Lights', watts: 40, hours: 5, type: 'DC' },
      { id: Date.now() + 3, name: 'Water Pressure Pump', watts: 120, hours: 1, type: 'DC' },
      { id: Date.now() + 4, name: 'Router & Wi-Fi', watts: 12, hours: 24, type: 'AC' },
      { id: Date.now() + 5, name: 'Coffee Maker (Inverter)', watts: 1000, hours: 0.2, type: 'AC' }
    ];
    systemVoltageSelect.value = '24';
    batteryChemSelect.value = 'lifepo4';
    dodSlider.value = 80;
    autonomyDaysInput.value = 3;
    peakSunHoursInput.value = 4;
    renderTable();
    updateValues();
  }

  function resetDefaults() {
    loadVanPreset();
  }

  function renderTable() {
    appliancesTbody.innerHTML = '';
    if (appliances.length === 0) {
      appliancesTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">No appliances added yet.</td></tr>`;
      return;
    }

    appliances.forEach(item => {
      const dailyWh = Math.round(item.watts * item.hours);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(item.name)}</td>
        <td>${item.watts} W</td>
        <td>${item.hours} hrs</td>
        <td><span class="badge" style="min-width:40px;">${item.type}</span></td>
        <td><strong>${dailyWh}</strong> Wh</td>
        <td><button class="btn-icon" title="Remove" data-id="${item.id}">&times;</button></td>
      `;
      tr.querySelector('.btn-icon').addEventListener('click', () => removeAppliance(item.id));
      appliancesTbody.appendChild(tr);
    });
  }

  function addAppliance() {
    const name = newNameInput.value.trim() || 'Custom Device';
    const watts = parseFloat(newWattsInput.value);
    const hours = parseFloat(newHoursInput.value);
    const type = newTypeSelect.value;

    if (isNaN(watts) || watts <= 0 || isNaN(hours) || hours <= 0) {
      alert('Please enter valid positive numbers for Watts and Hours.');
      return;
    }

    appliances.push({
      id: Date.now(),
      name,
      watts,
      hours,
      type
    });

    newNameInput.value = '';
    newWattsInput.value = '';
    newHoursInput.value = '';
    newNameInput.focus();

    renderTable();
    updateValues();
  }

  function removeAppliance(id) {
    appliances = appliances.filter(item => item.id !== id);
    renderTable();
    updateValues();
  }

  function updateValues() {
    // Update badge text
    valPeakSunHours.textContent = `${peakSunHoursInput.value} hrs`;
    valPanelEff.textContent = `${panelEffInput.value}%`;
    valDod.textContent = `${dodSlider.value}%`;
    valAutonomy.textContent = `${autonomyDaysInput.value} Days`;
    valInverterEff.textContent = `${inverterEffInput.value}%`;

    // Calculate total daily watt-hours
    let totalWh = 0;
    let maxAcWatts = 0;
    let maxDcWatts = 0;

    appliances.forEach(item => {
      const itemWh = item.watts * item.hours;
      // Adjust for inverter efficiency if AC load
      const inverterEff = parseFloat(inverterEffInput.value) / 100;
      if (item.type === 'AC') {
        totalWh += itemWh / inverterEff;
        maxAcWatts += item.watts;
      } else {
        totalWh += itemWh;
        maxDcWatts += item.watts;
      }
    });

    const totalKwh = (totalWh / 1000).toFixed(2);
    resTotalWh.innerHTML = `${Math.round(totalWh)} <small>Wh/day</small>`;
    resTotalKwh.textContent = `${totalKwh} kWh`;

    // Solar array sizing
    const peakSunHours = parseFloat(peakSunHoursInput.value);
    const panelEff = parseFloat(panelEfficiency.value) / 100;
    const requiredSolarWatts = totalWh / (peakSunHours * panelEff);
    const recommendedPanelsCount = Math.ceil(requiredSolarWatts / 300);

    resSolarWatts.innerHTML = `${Math.round(requiredSolarWatts)} <small>W</small>`;
    resSolarPanels.textContent = `${recommendedPanelsCount} panels @ 300W`;

    // Battery bank sizing
    const systemVoltage = parseFloat(systemVoltageSelect.value);
    const dod = parseFloat(dodSlider.value) / 100;
    const autonomyDays = parseFloat(autonomyDaysInput.value);

    const requiredBatteryWh = (totalWh * autonomyDays) / dod;
    const requiredBatteryAh = requiredBatteryWh / systemVoltage;

    resBatteryAh.innerHTML = `${Math.round(requiredBatteryAh)} <small>Ah</small>`;
    resBatteryWh.textContent = `${Math.round(requiredBatteryWh)} Wh capacity (${systemVoltage}V)`;

    // Inverter sizing
    const totalContinuousWatts = maxAcWatts + maxDcWatts;
    const recommendedInverterW = Math.max(300, Math.ceil(maxAcWatts * 1.25 / 100) * 100);
    const surgeWatts = recommendedInverterW * 2;

    resInverterW.innerHTML = `${recommendedInverterW} <small>W</small>`;
    resSurgeW.textContent = `Surge: ${surgeWatts} W (Continuous AC max: ${maxAcWatts}W)`;

    drawCanvasSimulation(totalWh, peakSunHours, requiredBatteryWh);
  }

  function drawCanvasSimulation(totalWh, peakSunHours, batteryCapacityWh) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;

    // Draw grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      let y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Simulate 24 hours (0 to 24)
    // Solar bell curve centered around 13:00 (1 PM)
    let solarPoints = [];
    let batteryPoints = [];
    let currentBatteryWh = batteryCapacityWh * 0.7; // Start at 70%

    for (let hour = 0; hour <= 24; hour++) {
      // Solar generation curve (sunrise ~6am, sunset ~18pm)
      let solarGen = 0;
      if (hour >= 6 && hour <= 18) {
        let sunFactor = Math.sin(((hour - 6) / 12) * Math.PI);
        solarGen = sunFactor * (totalWh / peakSunHours) * 1.5; // Peak multiplier
      }

      // Average hourly load
      let hourlyLoad = totalWh / 24;
      // Add extra load during evening hours
      if (hour >= 18 || hour <= 7) {
        hourlyLoad *= 1.4;
      } else {
        hourlyLoad *= 0.7;
      }

      let netEnergy = solarGen - hourlyLoad;
      currentBatteryWh = Math.max(0, Math.min(batteryCapacityWh, currentBatteryWh + netEnergy));

      let socPercent = (currentBatteryWh / batteryCapacityWh) * 100;

      solarPoints.push({ x: (hour / 24) * width, y: height - (solarGen / (totalWh * 0.2)) * height });
      batteryPoints.push({ x: (hour / 24) * width, y: height - (socPercent / 100) * (height - 20) - 10 });
    }

    // Draw Battery SoC Curve (Green)
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.beginPath();
    batteryPoints.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // Draw Solar Generation Area (Yellow translucent)
    ctx.fillStyle = 'rgba(250, 204, 21, 0.15)';
    ctx.beginPath();
    ctx.moveTo(0, height);
    solarPoints.forEach(pt => ctx.lineTo(pt.x, Math.max(10, pt.y)));
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.beginPath();
    solarPoints.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, Math.max(10, pt.y));
      else ctx.lineTo(pt.x, Math.max(10, pt.y));
    });
    ctx.stroke();

    // Hour labels
    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.fillText('00:00', 5, height - 5);
    ctx.fillText('06:00', width * 0.25, height - 5);
    ctx.fillText('12:00', width * 0.5 - 12, height - 5);
    ctx.fillText('18:00', width * 0.75, height - 5);
    ctx.fillText('24:00', width - 32, height - 5);
  }

  function exportJson() {
    const systemData = {
      title: 'AuraVolt Off-Grid Energy Calculation',
      timestamp: new Date().toISOString(),
      parameters: {
        peakSunHours: peakSunHoursInput.value,
        panelEfficiency: panelEfficiency.value,
        systemVoltage: systemVoltageSelect.value,
        batteryChemistry: batteryChemistry.value,
        maxDod: dodSlider.value,
        autonomyDays: autonomyDaysInput.value,
        inverterEfficiency: inverterEffInput.value
      },
      appliances,
      results: {
        totalWh: resTotalWh.textContent,
        requiredSolarWatts: resSolarWatts.textContent,
        requiredBatteryAh: resBatteryAh.textContent,
        recommendedInverter: resInverterW.textContent
      }
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(systemData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "auravolt-system-design.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  // Initial render & calculation
  renderTable();
  updateValues();
  initEvents();
});
