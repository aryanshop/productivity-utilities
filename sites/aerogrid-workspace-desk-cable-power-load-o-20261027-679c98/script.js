/* AeroGrid: Workspace Desk Cable & Power Load Optimizer */

const STORAGE_KEY = 'aerogrid_workspace_data_v1';

const defaultDevices = [
    { id: 'dev-1', name: '27" 4K UltraHD Monitor', category: 'Display', watts: 45, cable: 6 },
    { id: 'dev-2', name: 'MacBook Pro 16 M-Series', category: 'Computer', watts: 96, cable: 6 },
    { id: 'dev-3', name: 'Studio Monitors (Pair)', category: 'Audio', watts: 30, cable: 8 },
    { id: 'dev-4', name: 'Desk LED Light Bar', category: 'Lighting', watts: 12, cable: 5 },
    { id: 'dev-5', name: 'USB-C Thunderbolt Dock', category: 'Peripherals', watts: 25, cable: 3 }
];

let state = {
    devices: [...defaultDevices],
    voltage: 120,
    kwhRate: 0.15,
    dailyHours: 8,
    routingStyle: 'tray'
};

// DOM Elements
const totalWattsEl = document.getElementById('total-watts');
const totalAmpsEl = document.getElementById('total-amps');
const monthlyCostEl = document.getElementById('monthly-cost');
const costDetailEl = document.getElementById('cost-detail');
const surgeStatusEl = document.getElementById('surge-status');
const surgeDetailEl = document.getElementById('surge-detail');
const totalCableEl = document.getElementById('total-cable');
const cableDetailEl = document.getElementById('cable-detail');

const deviceTbody = document.getElementById('device-tbody');
const loadPercentageEl = document.getElementById('load-percentage');
const loadProgressFill = document.getElementById('load-progress-fill');
const circuitAdviceEl = document.getElementById('circuit-advice');

const circuitVoltageSelect = document.getElementById('circuit-voltage');
const kwhRateInput = document.getElementById('kwh-rate');
const dailyHoursInput = document.getElementById('daily-hours');
const routingStyleSelect = document.getElementById('routing-style');
const cableBreakdownList = document.getElementById('cable-breakdown-list');

const jsonPreview = document.getElementById('json-preview');

// Modal Elements
const modal = document.getElementById('device-modal');
const modalTitle = document.getElementById('modal-title');
const btnAddDevice = document.getElementById('btn-add-device');
const modalClose = document.getElementById('modal-close');
const modalCancel = document.getElementById('modal-cancel');
const deviceForm = document.getElementById('device-form');
const deviceIdInput = document.getElementById('device-id');
const devNameInput = document.getElementById('dev-name');
const devCategorySelect = document.getElementById('dev-category');
const devWattsInput = document.getElementById('dev-watts');
const devCableInput = document.getElementById('dev-cable');

// Tabs
const tabBtns = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Initialize App
function init() {
    loadFromStorage();
    setupEventListeners();
    render();
}

function loadFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.devices) state.devices = parsed.devices;
            if (parsed.voltage) state.voltage = parsed.voltage;
            if (parsed.kwhRate !== undefined) state.kwhRate = parsed.kwhRate;
            if (parsed.dailyHours) state.dailyHours = parsed.dailyHours;
            if (parsed.routingStyle) state.routingStyle = parsed.routingStyle;
        }
    } catch (e) {
        console.error('Failed to load from storage', e);
    }
}

function saveToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('Failed to save to storage', e);
    }
}

function setupEventListeners() {
    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Inputs
    circuitVoltageSelect.value = state.voltage;
    circuitVoltageSelect.addEventListener('change', (e) => {
        state.voltage = parseInt(e.target.value);
        saveToStorage();
        render();
    });

    kwhRateInput.value = state.kwhRate;
    kwhRateInput.addEventListener('input', (e) => {
        state.kwhRate = parseFloat(e.target.value) || 0;
        saveToStorage();
        render();
    });

    dailyHoursInput.value = state.dailyHours;
    dailyHoursInput.addEventListener('input', (e) => {
        state.dailyHours = parseInt(e.target.value) || 1;
        saveToStorage();
        render();
    });

    routingStyleSelect.value = state.routingStyle;
    routingStyleSelect.addEventListener('change', (e) => {
        state.routingStyle = e.target.value;
        saveToStorage();
        renderCableMatrix();
    });

    // Modal open/close
    btnAddDevice.addEventListener('click', () => openDeviceModal());
    modalClose.addEventListener('click', () => closeModal());
    modalCancel.addEventListener('click', () => closeModal());
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    // Form submit
    deviceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveDeviceFromForm();
    });

    // Preset
    document.getElementById('btn-preset').addEventListener('click', () => {
        state.devices = [...defaultDevices];
        saveToStorage();
        render();
    });

    // Export & Backup
    document.getElementById('btn-export-json').addEventListener('click', () => {
        exportJSON();
    });

    document.getElementById('import-file').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(evt) {
            try {
                const imported = JSON.parse(evt.target.result);
                if (imported.devices) {
                    state.devices = imported.devices;
                    if (imported.voltage) state.voltage = imported.voltage;
                    if (imported.kwhRate) state.kwhRate = imported.kwhRate;
                    if (imported.dailyHours) state.dailyHours = imported.dailyHours;
                    saveToStorage();
                    render();
                    alert('Setup imported successfully!');
                } else {
                    alert('Invalid JSON structure.');
                }
            } catch (err) {
                alert('Failed to parse JSON file.');
            }
        };
        reader.readAsText(file);
    });

    document.getElementById('btn-print').addEventListener('click', () => {
        window.print();
    });

    document.getElementById('btn-clear').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all devices?')) {
            state.devices = [];
            saveToStorage();
            render();
        }
    });
}

function openDeviceModal(device = null) {
    if (device) {
        modalTitle.textContent = 'Edit Hardware Device';
        deviceIdInput.value = device.id;
        devNameInput.value = device.name;
        devCategorySelect.value = device.category;
        devWattsInput.value = device.watts;
        devCableInput.value = device.cable;
    } else {
        modalTitle.textContent = 'Add Hardware Device';
        deviceIdInput.value = '';
        devNameInput.value = '';
        devCategorySelect.value = 'Display';
        devWattsInput.value = 30;
        devCableInput.value = 6;
    }
    modal.classList.add('open');
    devNameInput.focus();
}

function closeModal() {
    modal.classList.remove('open');
}

function saveDeviceFromForm() {
    const id = deviceIdInput.value || 'dev-' + Date.now();
    const name = devNameInput.value.trim();
    const category = devCategorySelect.value;
    const watts = parseInt(devWattsInput.value) || 0;
    const cable = parseInt(devCableInput.value) || 0;

    if (!name) return;

    const existingIndex = state.devices.findIndex(d => d.id === id);
    if (existingIndex >= 0) {
        state.devices[existingIndex] = { id, name, category, watts, cable };
    } else {
        state.devices.push({ id, name, category, watts, cable });
    }

    saveToStorage();
    closeModal();
    render();
}

function deleteDevice(id) {
    state.devices = state.devices.filter(d => d.id !== id);
    saveToStorage();
    render();
}

function render() {
    renderDeviceTable();
    renderCalculations();
    renderCableMatrix();
    renderJSONPreview();
}

function renderDeviceTable() {
    deviceTbody.innerHTML = '';
    if (state.devices.length === 0) {
        deviceTbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No devices in inventory. Click "+ Add Device" to begin.</td></tr>`;
        return;
    }

    state.devices.forEach(dev => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${escapeHtml(dev.name)}</strong></td>
            <td><span class="badge-cat">${escapeHtml(dev.category)}</span></td>
            <td>${dev.watts} W</td>
            <td>${dev.cable} ft</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="editDevice('${dev.id}')">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="removeDevice('${dev.id}')">Del</button>
            </td>
        `;
        deviceTbody.appendChild(tr);
    });
}

window.editDevice = function(id) {
    const dev = state.devices.find(d => d.id === id);
    if (dev) openDeviceModal(dev);
};

window.removeDevice = function(id) {
    deleteDevice(id);
};

function renderCalculations() {
    const totalWatts = state.devices.reduce((acc, curr) => acc + curr.watts, 0);
    const totalAmps = totalWatts / state.voltage;
    
    // Monthly kWh = (Total Watts / 1000) * Daily Hours * 30 days
    const monthlyKWh = (totalWatts / 1000) * state.dailyHours * 30;
    const monthlyCost = monthlyKWh * state.kwhRate;

    // Circuit max capacity (15A for 120V = 1800W, 13A for 230V = 2990W)
    const maxCapacityWatts = state.voltage === 120 ? 1800 : 2990;
    const loadPercent = Math.min(100, Math.round((totalWatts / maxCapacityWatts) * 100));

    totalWattsEl.textContent = `${totalWatts} W`;
    totalAmpsEl.textContent = `${totalAmps.toFixed(2)} Amps @ ${state.voltage}V`;
    monthlyCostEl.textContent = `$${monthlyCost.toFixed(2)}`;
    costDetailEl.textContent = `Based on $${state.kwhRate.toFixed(2)}/kWh & ${state.dailyHours}h/day`;

    totalCableEl.textContent = `${calculateTotalCableLength()} ft`;
    cableDetailEl.textContent = `Across ${state.devices.length} connected devices`;

    loadPercentageEl.textContent = `${loadPercent}%`;
    loadProgressFill.style.width = `${loadPercent}%`;

    if (loadPercent >= 80) {
        loadProgressFill.style.backgroundColor = 'var(--danger)';
        surgeStatusEl.textContent = 'High Load Warning';
        surgeStatusEl.style.color = 'var(--danger)';
        circuitAdviceEl.innerHTML = `<span class="badge" style="background-color: var(--danger); color: #fff;">Warning</span> Your power load exceeds 80% of standard circuit capacity. Consider redistributing heavy gear to a separate wall outlet.`;
        circuitAdviceEl.style.borderColor = 'rgba(244, 63, 94, 0.4)';
        circuitAdviceEl.style.backgroundColor = 'rgba(244, 63, 94, 0.1)';
    } else if (loadPercent >= 50) {
        loadProgressFill.style.backgroundColor = 'var(--warning)';
        surgeStatusEl.textContent = 'Moderate Load';
        surgeStatusEl.style.color = 'var(--warning)';
        circuitAdviceEl.innerHTML = `<span class="badge" style="background-color: var(--warning); color: #000;">Notice</span> Moderate power draw. Ensure you use a quality surge protector with proper Joule rating.`;
        circuitAdviceEl.style.borderColor = 'rgba(245, 158, 11, 0.4)';
        circuitAdviceEl.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
    } else {
        loadProgressFill.style.backgroundColor = 'var(--success)';
        surgeStatusEl.textContent = 'Optimal';
        surgeStatusEl.style.color = 'var(--success)';
        circuitAdviceEl.innerHTML = `<span class="badge" style="background-color: var(--success); color: #000;">Safe</span> Your setup is well within safe operating thresholds for standard wall outlets.`;
        circuitAdviceEl.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        circuitAdviceEl.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
    }
}

function calculateTotalCableLength() {
    let multiplier = 1.0;
    if (state.routingStyle === 'tray') multiplier = 0.8; // Tighter bundling
    if (state.routingStyle === 'perimeter') multiplier = 1.3; // Longer path around legs
    const rawSum = state.devices.reduce((acc, curr) => acc + curr.cable, 0);
    return Math.round(rawSum * multiplier);
}

function renderCableMatrix() {
    cableBreakdownList.innerHTML = '';
    if (state.devices.length === 0) {
        cableBreakdownList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No devices to route.</p>';
        return;
    }

    state.devices.forEach(dev => {
        let slack = dev.cable - 3;
        let slackText = slack > 0 ? `${slack} ft slack buffer` : `Tension warning (Too short)`;
        let slackColor = slack > 0 ? 'var(--success)' : 'var(--danger)';

        const item = document.createElement('div');
        item.className = 'cable-item';
        item.innerHTML = `
            <div>
                <strong>${escapeHtml(dev.name)}</strong>
                <div style="font-size: 0.75rem; color: var(--text-muted);">Cord Length: ${dev.cable} ft (${state.routingStyle})</div>
            </div>
            <div style="font-size: 0.8rem; font-weight: 500; color: ${slackColor};">
                ${slackText}
            </div>
        `;
        cableBreakdownList.appendChild(item);
    });
}

function renderJSONPreview() {
    jsonPreview.value = JSON.stringify(state, null, 2);
}

function exportJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "aerogrid_workspace_config.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function escapeHtml(str) {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Run on load
init();
