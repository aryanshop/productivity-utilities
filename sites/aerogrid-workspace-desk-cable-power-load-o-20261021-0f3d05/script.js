document.addEventListener('DOMContentLoaded', () => {
  // State management
  let devices = [
    { id: 1, name: 'MacBook Pro 16"', watts: 96, category: 'Computing', plugs: 'USB-C PD', cable: 6 },
    { id: 2, name: 'Dell 27" 4K Monitor', watts: 45, category: 'Display', plugs: 'Standard Adapter', cable: 6 },
    { id: 3, name: 'Studio Audio Monitors (Pair)', watts: 30, category: 'Audio', plugs: 'Direct AC', cable: 8 },
    { id: 4, name: 'LED Desk Light Bar', watts: 10, category: 'Lighting', plugs: 'USB-A', cable: 5 },
    { id: 5, name: 'Mechanical Keyboard & Mouse', watts: 5, category: 'Peripherals', plugs: 'USB-A', cable: 6 }
  ];

  let settings = {
    voltage: 120,
    kwhRate: 0.14,
    avgHours: 8
  };

  // DOM Elements
  const totalWattsEl = document.getElementById('total-watts');
  const totalAmpsEl = document.getElementById('total-amps');
  const monthlyCostEl = document.getElementById('monthly-cost');
  const loadStatusEl = document.getElementById('load-status');
  const deviceCountEl = document.getElementById('device-count');
  const inventoryTbody = document.getElementById('inventory-tbody');
  const inventoryEmpty = document.getElementById('inventory-empty');
  const deviceForm = document.getElementById('device-form');
  
  const circuitVoltageSelect = document.getElementById('circuit-voltage');
  const kwhRateInput = document.getElementById('kwh-rate');
  const avgHoursInput = document.getElementById('avg-hours');
  
  const outletSlotsContainer = document.getElementById('outlet-slots');
  const deskDevicesGrid = document.getElementById('desk-devices-grid');
  
  const auditList = document.getElementById('audit-list');
  const totalCableEl = document.getElementById('total-cable');
  const totalBricksEl = document.getElementById('total-bricks');
  const surgeRecEl = document.getElementById('surge-rec');
  const checklistContainer = document.getElementById('checklist-container');
  const printBtn = document.getElementById('print-btn');

  // Tab Navigation
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById(`tab-${btn.dataset.tab}`);
      if (target) target.classList.add('active');
    });
  });

  // Event Listeners for Settings
  circuitVoltageSelect.addEventListener('change', (e) => {
    settings.voltage = parseFloat(e.target.value);
    updateCalculations();
  });

  kwhRateInput.addEventListener('input', (e) => {
    settings.kwhRate = parseFloat(e.target.value) || 0;
    updateCalculations();
  });

  avgHoursInput.addEventListener('input', (e) => {
    settings.avgHours = parseFloat(e.target.value) || 0;
    updateCalculations();
  });

  // Add Device Form Submission
  deviceForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('device-name').value.trim();
    const watts = parseFloat(document.getElementById('device-watts').value);
    const plugs = document.getElementById('device-plugs').value;
    const cable = parseFloat(document.getElementById('device-cable').value);
    const category = document.getElementById('device-category').value;

    if (!name || isNaN(watts)) return;

    const newDevice = {
      id: Date.now(),
      name,
      watts,
      category,
      plugs,
      cable: isNaN(cable) ? 6 : cable
    };

    devices.push(newDevice);
    deviceForm.reset();
    document.getElementById('device-cable').value = 6;
    updateCalculations();
  });

  // Preset Buttons
  document.querySelectorAll('.preset-buttons button').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      if (preset === 'minimalist') {
        devices = [
          { id: 1, name: 'MacBook Air M2', watts: 30, category: 'Computing', plugs: 'USB-C PD', cable: 6 },
          { id: 2, name: 'Portable USB-C Monitor', watts: 15, category: 'Display', plugs: 'USB-C PD', cable: 4 },
          { id: 3, name: 'Desk LED Lamp', watts: 8, category: 'Lighting', plugs: 'USB-A', cable: 5 }
        ];
      } else if (preset === 'powerdev') {
        devices = [
          { id: 1, name: 'Custom Desktop Workstation', watts: 450, category: 'Computing', plugs: 'Direct AC', cable: 6 },
          { id: 2, name: 'Dual 32" 4K Monitors', watts: 120, category: 'Display', plugs: 'Standard Adapter', cable: 6 },
          { id: 3, name: 'Thunderbolt Dock', watts: 60, category: 'Peripherals', plugs: 'Direct AC', cable: 3 },
          { id: 4, name: 'Audio Interface & Studio Monitors', watts: 40, category: 'Audio', plugs: 'Direct AC', cable: 8 },
          { id: 5, name: 'RGB Desk Strip', watts: 15, category: 'Lighting', plugs: 'USB-A', cable: 10 }
        ];
      } else if (preset === 'creator') {
        devices = [
          { id: 1, name: 'Editing Rig & GPU', watts: 350, category: 'Computing', plugs: 'Direct AC', cable: 6 },
          { id: 2, name: 'Color-Accurate Monitor', watts: 65, category: 'Display', plugs: 'Standard Adapter', cable: 6 },
          { id: 3, name: 'Key Light & Fill Light', watts: 90, category: 'Lighting', plugs: 'Direct AC', cable: 8 },
          { id: 4, name: 'XLR Mic & Preamp', watts: 20, category: 'Audio', plugs: 'Standard Adapter', cable: 6 },
          { id: 5, name: 'Stream Deck & Peripherals', watts: 15, category: 'Peripherals', plugs: 'USB-A', cable: 4 }
        ];
      } else if (preset === 'clear') {
        devices = [];
      }
      updateCalculations();
    });
  });

  // Delete device helper
  window.deleteDevice = function(id) {
    devices = devices.filter(d => d.id !== id);
    updateCalculations();
  };

  // Main calculation & rendering function
  function updateCalculations() {
    // 1. Math calculations
    const totalWatts = devices.reduce((sum, d) => sum + d.watts, 0);
    const totalAmps = totalWatts / settings.voltage;
    const monthlyKwh = (totalWatts * settings.avgHours * 30) / 1000;
    const monthlyCost = monthlyKwh * settings.kwhRate;
    const totalCable = devices.reduce((sum, d) => sum + d.cable, 0);
    const powerBricksCount = devices.filter(d => d.plugs === 'Standard Adapter').length;

    // 2. Update Header Stats
    totalWattsEl.textContent = `${totalWatts} W`;
    totalAmpsEl.textContent = `${totalAmps.toFixed(1)} A`;
    monthlyCostEl.textContent = `$${monthlyCost.toFixed(2)}`;
    deviceCountEl.textContent = `${devices.length} device${devices.length === 1 ? '' : 's'} connected`;

    // Load Status determination
    // Assuming standard 15A circuit at 120V = 1800W max continuous safe load (80% rule = 1440W)
    const maxSafeWatts = (settings.voltage * 15) * 0.8;
    if (totalWatts > maxSafeWatts) {
      loadStatusEl.textContent = 'High Load Warning';
      loadStatusEl.className = 'stat-badge danger';
    } else if (totalWatts > maxSafeWatts * 0.7) {
      loadStatusEl.textContent = 'Moderate';
      loadStatusEl.className = 'stat-badge warning';
    } else {
      loadStatusEl.textContent = 'Optimal';
      loadStatusEl.className = 'stat-badge optimal';
    }

    // 3. Render Inventory Table
    inventoryTbody.innerHTML = '';
    if (devices.length === 0) {
      inventoryEmpty.classList.remove('hidden');
    } else {
      inventoryEmpty.classList.add('hidden');
      devices.forEach(d => {
        const monthlyDevKwh = (d.watts * settings.avgHours * 30) / 1000;
        const monthlyDevCost = monthlyDevKwh * settings.kwhRate;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${escapeHtml(d.name)}</strong></td>
          <td><span class="badge-category badge-${d.category}">${d.category}</span></td>
          <td>${escapeHtml(d.plugs)}</td>
          <td>${d.watts} W</td>
          <td>${d.cable} ft</td>
          <td>$${monthlyDevCost.toFixed(2)}</td>
          <td>
            <button class="btn-icon" onclick="deleteDevice(${d.id})" title="Remove device">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </td>
        `;
        inventoryTbody.appendChild(tr);
      });
    }

    // 4. Render Desk Layout & Surge Protector Slots
    outletSlotsContainer.innerHTML = '';
    for (let i = 0; i < 8; i++) {
      const slot = document.createElement('div');
      slot.className = 'outlet-slot';
      if (i < devices.length) {
        slot.classList.add('occupied');
        slot.textContent = devices[i].name.split(' ')[0];
        slot.title = devices[i].name;
      } else {
        slot.textContent = `Outlet ${i + 1}`;
      }
      outletSlotsContainer.appendChild(slot);
    }

    deskDevicesGrid.innerHTML = '';
    devices.forEach(d => {
      const pill = document.createElement('div');
      pill.className = 'desk-device-pill';
      pill.innerHTML = `<span class="dot ${d.category.toLowerCase()}"></span> ${escapeHtml(d.name)} (${d.watts}W)`;
      deskDevicesGrid.appendChild(pill);
    });

    // 5. Render Report & Blueprint
    totalCableEl.textContent = `${totalCable} ft`;
    totalBricksEl.textContent = powerBricksCount;
    const recommendedSurge = Math.ceil(totalWatts * 1.3 / 100) * 100;
    surgeRecEl.textContent = `${Math.max(recommendedSurge, 1500)}W / 15A Surge Protector`;

    // Audit Checklist
    auditList.innerHTML = '';
    const auditItems = [];

    if (totalWatts <= maxSafeWatts) {
      auditItems.push({ text: `Total wattage (${totalWatts}W) is safely within standard circuit limits.`, type: 'success' });
    } else {
      auditItems.push({ text: `Warning: Total wattage (${totalWatts}W) exceeds 80% safe continuous load threshold for standard circuits.`, type: 'danger' });
    }

    if (powerBricksCount > 4) {
      auditItems.push({ text: `High power brick density detected (${powerBricksCount} adapters). Consider spacing them out on the surge strip to avoid blocking adjacent outlets.`, type: 'warning' });
    } else {
      auditItems.push({ text: `Power adapter distribution is manageable with standard surge protectors.`, type: 'success' });
    }

    if (totalCable > 45) {
      auditItems.push({ text: `Extensive total cable length (${totalCable} ft). Recommend cable raceways or velcro ties to prevent tangles.`, type: 'warning' });
    } else {
      auditItems.push({ text: `Cable length footprint is clean and compact.`, type: 'success' });
    }

    auditItems.forEach(item => {
      const li = document.createElement('li');
      li.className = `audit-item ${item.type}`;
      let iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
      if (item.type === 'danger' || item.type === 'warning') {
        iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
      }
      li.innerHTML = `${iconSvg} <span>${item.text}</span>`;
      auditList.appendChild(li);
    });

    // Shopping & Organization Checklist items
    checklistContainer.innerHTML = '';
    const checklistItems = [
      `1x Heavy-Duty Surge Protector (${Math.max(recommendedSurge, 1500)}W rating with spaced brick outlets)`,
      `Velcro Cable Tie Roll (15ft for wire management)`,
      powerBricksCount > 2 ? '1x Under-Desk Cable Management Tray / Basket' : 'Desk Cable Clips & Adhesive Organizers',
      totalCable > 40 ? 'Outlet Power Strip Wall Mount Brackets' : 'Power Strip Cable Sleeve Cover'
    ];

    checklistItems.forEach(text => {
      const div = document.createElement('div');
      div.className = 'checklist-item';
      div.innerHTML = `<input type="checkbox"> <span>${escapeHtml(text)}</span>`;
      checklistContainer.appendChild(div);
    });
  }

  // Utility to escape HTML
  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  // Print Button Handler
  printBtn.addEventListener('click', () => {
    window.print();
  });

  // Initial render
  updateCalculations();
});
