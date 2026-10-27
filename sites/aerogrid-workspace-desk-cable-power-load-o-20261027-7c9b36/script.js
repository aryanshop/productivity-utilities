document.addEventListener('DOMContentLoaded', () => {
    // Default initial hardware inventory
    const defaultDevices = [
        { id: 1, name: 'Main Work Laptop', watts: 95, category: 'Computer', cable: 2.0, plugs: 1 },
        { id: 2, name: '27inch 4K Monitor', watts: 45, category: 'Display', cable: 1.8, plugs: 1 },
        { id: 3, name: 'Active Studio Monitors', watts: 30, category: 'Audio', cable: 2.5, plugs: 2 },
        { id: 4, name: 'Desk LED Light Bar', watts: 12, category: 'Lighting', cable: 1.5, plugs: 1 },
        { id: 5, name: 'USB-C Charging Hub', watts: 60, category: 'Charging', cable: 1.2, plugs: 1 }
    ];

    let state = {
        voltage: 230,
        maxAmps: 15,
        kwhRate: 0.18,
        deskWidth: 160,
        deskDepth: 80,
        devices: [...defaultDevices]
    };

    // Load from localStorage if available
    const savedState = localStorage.getItem('aerogrid_state');
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            state = { ...state, ...parsed };
        } catch (e) {
            console.error('Failed to parse saved state', e);
        }
    }

    // DOM Elements
    const voltageSelect = document.getElementById('circuit-voltage');
    const amperageSelect = document.getElementById('circuit-amperage');
    const kwhInput = document.getElementById('kwh-rate');
    const deskWidthInput = document.getElementById('desk-width');
    const deskDepthInput = document.getElementById('desk-depth');
    
    const deviceForm = document.getElementById('device-form');
    const devNameInput = document.getElementById('dev-name');
    const devWattsInput = document.getElementById('dev-watts');
    const devCatSelect = document.getElementById('dev-category');
    const devCableInput = document.getElementById('dev-cable');
    const devPlugsInput = document.getElementById('dev-plugs');
    
    const inventoryTbody = document.getElementById('inventory-tbody');
    const deviceCountBadge = document.getElementById('device-count-badge');
    
    const valWatts = document.getElementById('val-watts');
    const valAmps = document.getElementById('val-amps');
    const valCapacityPct = document.getElementById('val-capacity-pct');
    const valCapacityStatus = document.getElementById('val-capacity-status');
    const valMonthlyCost = document.getElementById('val-monthly-cost');
    const valTotalPlugs = document.getElementById('val-total-plugs');
    const valTotalCable = document.getElementById('val-total-cable');
    
    const warningBanner = document.getElementById('warning-banner');
    const warningText = document.getElementById('warning-text');
    
    const btnExport = document.getElementById('btn-export');
    const importFile = document.getElementById('import-file');
    const btnReset = document.getElementById('btn-reset');
    
    const canvas = document.getElementById('desk-canvas');
    const ctx = canvas.getContext('2d');

    // Initialize controls with state
    voltageSelect.value = state.voltage;
    amperageSelect.value = state.maxAmps;
    kwhInput.value = state.kwhRate;
    deskWidthInput.value = state.deskWidth;
    deskDepthInput.value = state.deskDepth;

    // Event Listeners
    voltageSelect.addEventListener('change', (e) => {
        state.voltage = parseInt(e.target.value);
        saveAndRender();
    });

    amperageSelect.addEventListener('change', (e) => {
        state.maxAmps = parseInt(e.target.value);
        saveAndRender();
    });

    kwhInput.addEventListener('input', (e) => {
        state.kwhRate = parseFloat(e.target.value) || 0;
        saveAndRender();
    });

    deskWidthInput.addEventListener('input', (e) => {
        state.deskWidth = parseInt(e.target.value) || 160;
        saveAndRender();
    });

    deskDepthInput.addEventListener('input', (e) => {
        state.deskDepth = parseInt(e.target.value) || 80;
        saveAndRender();
    });

    deviceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = devNameInput.value.trim();
        const watts = parseInt(devWattsInput.value);
        const category = devCatSelect.value;
        const cable = parseFloat(devCableInput.value);
        const plugs = parseInt(devPlugsInput.value);

        if (!name || isNaN(watts)) return;

        const newDevice = {
            id: Date.now(),
            name,
            watts,
            category,
            cable,
            plugs
        };

        state.devices.push(newDevice);
        deviceForm.reset();
        devWattsInput.value = "65";
        devCableInput.value = "1.8";
        devPlugsInput.value = "1";
        saveAndRender();
    });

    btnReset.addEventListener('click', () => {
        if (confirm('Reset workspace setup to default configuration?')) {
            state.devices = [...defaultDevices];
            state.voltage = 230;
            state.maxAmps = 15;
            state.kwhRate = 0.18;
            state.deskWidth = 160;
            state.deskDepth = 80;
            voltageSelect.value = state.voltage;
            amperageSelect.value = state.maxAmps;
            kwhInput.value = state.kwhRate;
            deskWidthInput.value = state.deskWidth;
            deskDepthInput.value = state.deskDepth;
            saveAndRender();
        }
    });

    btnExport.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "aerogrid_workspace_setup.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    importFile.addEventListener('change', (e) => {
        const fileReader = new FileReader();
        if (e.target.files[0]) {
            fileReader.readAsText(e.target.files[0], "UTF-8");
            fileReader.onload = (event) => {
                try {
                    const imported = JSON.parse(event.target.result);
                    if (imported.devices && Array.isArray(imported.devices)) {
                        state = { ...state, ...imported };
                        voltageSelect.value = state.voltage;
                        amperageSelect.value = state.maxAmps;
                        kwhInput.value = state.kwhRate;
                        deskWidthInput.value = state.deskWidth;
                        deskDepthInput.value = state.deskDepth;
                        saveAndRender();
                        alert('Workspace setup successfully imported!');
                    } else {
                        alert('Invalid configuration file structure.');
                    }
                } catch (err) {
                    alert('Failed to parse JSON configuration file.');
                }
            };
        }
    });

    window.removeDevice = function(id) {
        state.devices = state.devices.filter(d => d.id !== id);
        saveAndRender();
    };

    function saveAndRender() {
        localStorage.setItem('aerogrid_state', JSON.stringify(state));
        render();
    }

    function render() {
        // Calculations
        const totalWatts = state.devices.reduce((acc, d) => acc + d.watts, 0);
        const totalAmps = totalWatts / state.voltage;
        const maxAllowedWatts = state.voltage * state.maxAmps;
        const capacityPct = Math.round((totalWatts / maxAllowedWatts) * 100);
        
        // Monthly cost (Assuming 8 hours per day, 30 days per month)
        const monthlyKWh = (totalWatts * 8 * 30) / 1000;
        const monthlyCost = monthlyKWh * state.kwhRate;

        const totalPlugs = state.devices.reduce((acc, d) => acc + d.plugs, 0);
        const totalCableLength = state.devices.reduce((acc, d) => acc + d.cable, 0);

        // Update Metrics Display
        valWatts.textContent = `${totalWatts} W`;
        valAmps.textContent = `${totalAmps.toFixed(2)} Amps`;
        valCapacityPct.textContent = `${capacityPct}%`;
        valMonthlyCost.textContent = `$${monthlyCost.toFixed(2)}`;
        valTotalPlugs.textContent = `${totalPlugs} Outlets`;
        valTotalCable.textContent = `${totalCableLength.toFixed(1)}m total length`;

        // Circuit Safety Evaluation
        if (capacityPct > 80) {
            warningBanner.classList.remove('hidden');
            if (capacityPct > 100) {
                warningBanner.classList.add('danger');
                valCapacityStatus.textContent = 'Overload Hazard!';
                warningText.textContent = `CRITICAL: Total load (${totalWatts}W) exceeds maximum circuit capacity (${maxAllowedWatts}W). Risk of breaker trip!`;
            } else {
                warningBanner.classList.remove('danger');
                valCapacityStatus.textContent = 'High Load Warning';
                warningText.textContent = `Caution: Total load exceeds 80% continuous threshold of your ${state.voltage}V / ${state.maxAmps}A circuit. Consider redistributing equipment.`;
            }
        } else {
            warningBanner.classList.add('hidden');
            valCapacityStatus.textContent = 'Safe Circuit Load';
        }

        // Render Inventory Table
        deviceCountBadge.textContent = `${state.devices.length} devices`;
        inventoryTbody.innerHTML = '';
        if (state.devices.length === 0) {
            inventoryTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No devices in inventory. Add your first device above.</td></tr>`;
        } else {
            state.devices.forEach(d => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${escapeHtml(d.name)}</strong></td>
                    <td><span class="device-cat-badge">${escapeHtml(d.category)}</span></td>
                    <td>${d.watts} W</td>
                    <td>${d.cable}m</td>
                    <td>${d.plugs}</td>
                    <td>
                        <button class="btn-icon" onclick="removeDevice(${d.id})" title="Remove device">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </td>
                `;
                inventoryTbody.appendChild(tr);
            });
        }

        // Render Desk Canvas Visualizer
        drawDeskCanvas();
    }

    function drawDeskCanvas() {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Draw desk surface border
        ctx.fillStyle = '#111827';
        ctx.fillRect(40, 30, w - 80, h - 60);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(40, 30, w - 80, h - 60);

        // Desk label
        ctx.fillStyle = '#64748b';
        ctx.font = '11px sans-serif';
        ctx.fillText(`DESK SURFACE: ${state.deskWidth}cm × ${state.deskDepth}cm`, 50, 50);

        // Draw Surge Protector Hub (Center-Back)
        const hubX = w / 2;
        const hubY = 65;
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.roundRect(hubX - 35, hubY - 12, 70, 24, 4);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('SURGE HUB', hubX, hubY);

        // Draw devices distributed along desk arc / positions
        const count = state.devices.length;
        if (count === 0) return;

        const angleStep = Math.PI / (count + 1);
        state.devices.forEach((d, index) => {
            const angle = (index + 1) * angleStep;
            // Arc mapping along desk
            const radiusX = (w - 160) / 2;
            const radiusY = (h - 120) / 2;
            const devX = w / 2 + Math.cos(angle - Math.PI) * (radiusX * 0.7);
            const devY = h / 2 + Math.sin(angle) * (radiusY * 0.4) + 15;

            // Draw cable line to Hub
            ctx.strokeStyle = getCategoryColor(d.category);
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 2]);
            ctx.beginPath();
            ctx.moveTo(hubX, hubY + 12);
            ctx.quadraticCurveTo(hubX, devY - 30, devX, devY);
            ctx.stroke();
            ctx.setLineDash([]); // reset

            // Draw device node circle
            ctx.fillStyle = getCategoryColor(d.category);
            ctx.beginPath();
            ctx.arc(devX, devY, 14, 0, Math.PI * 2);
            ctx.fill();

            // Device initial / icon text
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(d.name.substring(0, 2).toUpperCase(), devX, devY);

            // Device label below node
            ctx.fillStyle = '#f8fafc';
            ctx.font = '10px sans-serif';
            ctx.fillText(`${d.name.length > 12 ? d.name.substring(0, 10) + '...' : d.name} (${d.watts}W)`, devX, devY + 24);
        });
    }

    function getCategoryColor(cat) {
        switch(cat) {
            case 'Computer': return '#38bdf8';
            case 'Display': return '#38bdf8';
            case 'Audio': return '#a855f7';
            case 'Lighting': return '#facc15';
            case 'Accessory': return '#34d399';
            case 'Charging': return '#fb923c';
            default: return '#94a3b8';
        }
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")
                  .replace(/"/g, "&quot;")
                  .replace(/'/g, "&#039;");
    }

    // Initial render
    render();
});
