// Default presets
const PRESETS = {
  minimalist: [
    { name: "Laptop (14\" Pro)", category: "Computer", watts: 65, plugs: 1, cable: 6 },
    { name: "USB-C Hub / Monitor", category: "Display", watts: 35, plugs: 1, cable: 5 },
    { name: "Desk LED Bar", category: "Lighting", watts: 10, plugs: 1, cable: 4 }
  ],
  gaming: [
    { name: "Gaming PC (High-End)", category: "Computer", watts: 450, plugs: 1, cable: 6 },
    { name: "27\" 4K IPS Monitor", category: "Display", watts: 45, plugs: 1, cable: 5 },
    { name: "24\" Secondary Monitor", category: "Display", watts: 30, plugs: 1, cable: 5 },
    { name: "Powered Audio Monitors", category: "Audio", watts: 40, plugs: 2, cable: 8 },
    { name: "Mechanical Keyboard & Mouse", category: "Peripheral", watts: 5, plugs: 1, cable: 6 }
  ],
  creator: [
    { name: "Workstation Tower", category: "Computer", watts: 350, plugs: 1, cable: 6 },
    { name: "34\" Ultrawide Monitor", category: "Display", watts: 65, plugs: 1, cable: 6 },
    { name: "Studio Audio Interface", category: "Audio", watts: 15, plugs: 1, cable: 4 },
    { name: "Key Light & Fill Light", category: "Lighting", watts: 90, plugs: 2, cable: 8 },
    { name: "Fast Charger (Multi-port)", category: "Charger", watts: 100, plugs: 1, cable: 5 }
  ],
  clear: []
};

let devices = [];

// DOM Elements
const circuitVoltageEl = document.getElementById('circuitVoltage');
const circuitAmpsEl = document.getElementById('circuitAmps');
const electricityRateEl = document.getElementById('electricityRate');
const dailyUsageHoursEl = document.getElementById('dailyUsageHours');

const totalWattsEl = document.getElementById('totalWatts');
const totalAmpsEl = document.getElementById('totalAmps');
const capacityPercentEl = document.getElementById('capacityPercent');
const capacityBarEl = document.getElementById('capacityBar');
const monthlyCostEl = document.getElementById('monthlyCost');
const kwhMonthEl = document.getElementById('kwhMonth');
const surgeStatusEl = document.getElementById('surgeStatus');
const outletCountEl = document.getElementById('outletCount');

const deviceTableBody = document.getElementById('deviceTableBody');
const addDeviceBtn = document.getElementById('addDeviceBtn');
const deviceModal = document.getElementById('deviceModal');
const deviceForm = document.getElementById('deviceForm');
const cancelModalBtn = document.getElementById('cancelModal');
const modalTitle = document.getElementById('modalTitle');
const editIndexEl = document.getElementById('editIndex');

const totalCableLengthEl = document.getElementById('totalCableLength');
const maxCableLengthEl = document.getElementById('maxCableLength');
const routingCanvas = document.getElementById('routingCanvas');

const exportJsonBtn = document.getElementById('exportJsonBtn');
const importJsonBtn = document.getElementById('importJsonBtn');
const importFile = document.getElementById('importFile');

// Initialize
function init() {
  // Load from localStorage if available, else load default creator preset
  const saved = localStorage.getItem('aerogrid_devices');
  if (saved) {
    try {
      devices = JSON.parse(saved);
    } catch (e) {
      devices = [...PRESETS.creator];
    }
  } else {
    devices = [...PRESETS.creator];
  }

  setupEventListeners();
  render();
}

function setupEventListeners() {
  // Settings changes
  [circuitVoltageEl, circuitAmpsEl, electricityRateEl, dailyUsageHoursEl].forEach(el => {
    el.addEventListener('input', updateCalculations);
  });

  // Add Device Modal triggers
  addDeviceBtn.addEventListener('click', () => openModal(-1));
  cancelModalBtn.addEventListener('click', closeModal);
  deviceModal.addEventListener('click', (e) => {
    if (e.target === deviceModal) closeModal();
  });

  // Form submission
  deviceForm.addEventListener('submit', handleDeviceSubmit);

  // Presets
  document.querySelectorAll('.btn-subtle[data-preset]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const presetName = e.target.getAttribute('data-preset');
      if (PRESETS[presetName]) {
        devices = JSON.parse(JSON.stringify(PRESETS[presetName]));
        saveAndRender();
      }
    });
  });

  // Export / Import
  exportJsonBtn.addEventListener('click', exportJSON);
  importJsonBtn.addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', importJSON);
}

function openModal(index) {
  editIndexEl.value = index;
  if (index === -1) {
    modalTitle.textContent = 'Add Hardware Device';
    document.getElementById('deviceName').value = '';
    document.getElementById('deviceCategory').value = 'Display';
    document.getElementById('deviceWatts').value = '45';
    document.getElementById('devicePlugs').value = '1';
    document.getElementById('deviceCable').value = '5';
  } else {
    modalTitle.textContent = 'Edit Hardware Device';
    const d = devices[index];
    document.getElementById('deviceName').value = d.name;
    document.getElementById('deviceCategory').value = d.category;
    document.getElementById('deviceWatts').value = d.watts;
    document.getElementById('devicePlugs').value = d.plugs;
    document.getElementById('deviceCable').value = d.cable;
  }
  deviceModal.classList.add('active');
}

function closeModal() {
  deviceModal.classList.remove('active');
}

function handleDeviceSubmit(e) {
  e.preventDefault();
  const index = parseInt(editIndexEl.value, 10);
  const newDevice = {
    name: document.getElementById('deviceName').value.trim(),
    category: document.getElementById('deviceCategory').value,
    watts: parseFloat(document.getElementById('deviceWatts').value) || 0,
    plugs: parseInt(document.getElementById('devicePlugs').value, 10) || 1,
    cable: parseFloat(document.getElementById('deviceCable').value) || 5
  };

  if (index === -1) {
    devices.push(newDevice);
  } else {
    devices[index] = newDevice;
  }

  closeModal();
  saveAndRender();
}

function deleteDevice(index) {
  devices.splice(index, 1);
  saveAndRender();
}

function saveAndRender() {
  localStorage.setItem('aerogrid_devices', JSON.stringify(devices));
  render();
}

function render() {
  renderTable();
  updateCalculations();
  drawRoutingCanvas();
}

function renderTable() {
  deviceTableBody.innerHTML = '';
  if (devices.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No devices added yet. Add a device or load a preset above.</td>`;
    deviceTableBody.appendChild(tr);
    return;
  }

  devices.forEach((d, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${escapeHtml(d.name)}</strong></td>
      <td>${escapeHtml(d.category)}</td>
      <td>${d.watts} W</td>
      <td>${d.plugs}</td>
      <td>${d.cable} ft</td>
      <td>
        <button class="btn-icon" title="Edit" onclick="window.editDevice(${idx})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </button>
        <button class="btn-icon btn-danger" title="Delete" onclick="window.removeDevice(${idx})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </td>
    `;
    deviceTableBody.appendChild(tr);
  });
}

// Expose global handlers for inline table buttons
window.editDevice = (idx) => openModal(idx);
window.removeDevice = (idx) => deleteDevice(idx);

function updateCalculations() {
  const voltage = parseFloat(circuitVoltageEl.value) || 120;
  const maxAmps = parseFloat(circuitAmpsEl.value) || 15;
  const rate = parseFloat(electricityRateEl.value) || 0.15;
  const dailyHours = parseFloat(dailyUsageHoursEl.value) || 8;

  let totalWatts = 0;
  let totalPlugs = 0;
  let totalCable = 0;
  let maxCable = 0;

  devices.forEach(d => {
    totalWatts += d.watts;
    totalPlugs += d.plugs;
    totalCable += d.cable;
    if (d.cable > maxCable) maxCable = d.cable;
  });

  const totalAmps = totalWatts / voltage;
  const maxCircuitWatts = voltage * maxAmps;
  const capacityPercent = (totalAmps / maxAmps) * 100;

  // Monthly calculation
  const kwhDaily = (totalWatts * dailyHours) / 1000;
  const kwhMonth = kwhDaily * 30;
  const monthlyCost = kwhMonth * rate;

  // Update DOM metrics
  totalWattsEl.textContent = `${Math.round(totalWatts)} W`;
  totalAmpsEl.textContent = `${totalAmps.toFixed(2)} A`;
  capacityPercentEl.textContent = `${Math.round(capacityPercent)}%`;
  capacityBarEl.style.width = `${Math.min(capacityPercent, 100)}%`;

  if (capacityPercent > 85) {
    capacityBarEl.style.backgroundColor = 'var(--danger)';
  } else if (capacityPercent > 65) {
    capacityBarEl.style.backgroundColor = 'var(--warning)';
  } else {
    capacityBarEl.style.backgroundColor = 'var(--accent)';
  }

  monthlyCostEl.textContent = `$${monthlyCost.toFixed(2)}`;
  kwhMonthEl.textContent = `${Math.round(kwhMonth)} kWh / mo`;
  outletCountEl.textContent = `${totalPlugs} AC Plugs Required`;

  // Surge Protector Status
  if (capacityPercent > 95 || totalAmps > maxAmps) {
    surgeStatusEl.textContent = 'OVERLOAD RISK!';
    surgeStatusEl.className = 'metric-value status-danger';
  } else if (totalPlugs > 8) {
    surgeStatusEl.textContent = 'High Plug Count';
    surgeStatusEl.className = 'metric-value status-warning';
  } else {
    surgeStatusEl.textContent = 'Optimal';
    surgeStatusEl.className = 'metric-value status-safe';
  }

  totalCableLengthEl.textContent = `${totalCable} ft`;
  maxCableLengthEl.textContent = `${maxCable} ft`;
}

function drawRoutingCanvas() {
  const ctx = routingCanvas.getContext('2d');
  const w = routingCanvas.width;
  const h = routingCanvas.height;

  ctx.clearRect(0, 0, w, h);

  // Background grid styling
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  for (let x = 0; x < w; x += 40) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 0; y < h; y += 40) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw Center Power Strip Hub
  const centerX = w / 2;
  const centerY = h / 2 + 20;

  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(centerX - 35, centerY - 15, 70, 30, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = '11px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('Power Strip', centerX, centerY + 4);

  // Draw radiating cables to connected devices
  if (devices.length === 0) return;

  const angleStep = (Math.PI * 1.6) / Math.max(devices.length, 1);
  let startAngle = Math.PI * 1.1;

  devices.forEach((d, i) => {
    const angle = startAngle + (i * angleStep);
    const radius = 70 + Math.min(d.cable * 3, 50);
    const nodeX = centerX + Math.cos(angle) * radius;
    const nodeY = centerY + Math.sin(angle) * (radius * 0.7);

    // Cable line
    ctx.strokeStyle = d.watts > 200 ? '#ef4444' : '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(nodeX, nodeY);
    ctx.stroke();

    // Device node dot
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = d.watts > 200 ? '#ef4444' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(nodeX, nodeY, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Device label short
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui';
    ctx.textAlign = nodeX < centerX ? 'right' : 'left';
    const shortName = d.name.length > 12 ? d.name.substring(0, 10) + '..' : d.name;
    ctx.fillText(`${shortName} (${d.watts}W)`, nodeX + (nodeX < centerX ? -10 : 10), nodeY + 3);
  });
}

// Export / Import JSON
function exportJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(devices, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "aerogrid_workspace_setup.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importJSON(e) {
  const fileReader = new FileReader();
  if (e.target.files[0]) {
    fileReader.readAsText(e.target.files[0], "UTF-8");
    fileReader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          devices = imported;
          saveAndRender();
          alert('Setup imported successfully!');
        } else {
          alert('Invalid format. Expected a device array.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
}

// Run on load
init();
