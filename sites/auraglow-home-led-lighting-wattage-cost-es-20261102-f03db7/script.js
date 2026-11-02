/* AuraGlow Home LED Lighting Audit Lab - Vanilla JS */

document.addEventListener('DOMContentLoaded', () => {
    // State definition
    let electricityRate = 0.14;
    let rooms = [];

    // Bulb wattage reference map for current legacy bulbs
    const bulbReference = {
        'incandescent-60': { name: 'Incandescent 60W', defaultWatt: 60, lumens: 800 },
        'incandescent-100': { name: 'Incandescent 100W', defaultWatt: 100, lumens: 1600 },
        'cfl-15': { name: 'CFL 15W', defaultWatt: 15, lumens: 900 },
        'halogen-50': { name: 'Halogen 50W', defaultWatt: 50, lumens: 700 },
        'led-legacy': { name: 'Older LED 12W', defaultWatt: 12, lumens: 800 }
    };

    // Sample presets
    const presets = {
        apartment: [
            { id: '1', name: 'Living Room', count: 6, hours: 4.0, currentType: 'incandescent-60', currentWatt: 60, targetWatt: 9, colorTemp: 2700 },
            { id: '2', name: 'Kitchen', count: 4, hours: 3.5, currentType: 'cfl-15', currentWatt: 15, targetWatt: 10, colorTemp: 4000 },
            { id: '3', name: 'Bedroom', count: 2, hours: 2.5, currentType: 'incandescent-60', currentWatt: 60, targetWatt: 8, colorTemp: 2700 },
            { id: '4', name: 'Bathroom', count: 3, hours: 1.5, currentType: 'halogen-50', currentWatt: 50, targetWatt: 9, colorTemp: 3000 }
        ],
        house: [
            { id: 'h1', name: 'Great Room', count: 8, hours: 5.0, currentType: 'incandescent-100', currentWatt: 100, targetWatt: 15, colorTemp: 2700 },
            { id: 'h2', name: 'Kitchen & Island', count: 6, hours: 4.5, currentType: 'halogen-50', currentWatt: 50, targetWatt: 9, colorTemp: 4000 },
            { id: 'h3', name: 'Master Bedroom', count: 4, hours: 3.0, currentType: 'incandescent-60', currentWatt: 60, targetWatt: 9, colorTemp: 2700 },
            { id: 'h4', name: 'Home Office', count: 3, hours: 6.0, currentType: 'cfl-15', currentWatt: 15, targetWatt: 10, colorTemp: 4000 },
            { id: 'h5', name: 'Garage', count: 4, hours: 2.0, currentType: 'incandescent-100', currentWatt: 100, targetWatt: 18, colorTemp: 5000 },
            { id: 'h6', name: 'Hallways & Stairs', count: 5, hours: 6.0, currentType: 'incandescent-60', currentWatt: 60, targetWatt: 8, colorTemp: 3000 }
        ],
        office: [
            { id: 'o1', name: 'Open Workspace', count: 12, hours: 8.0, currentType: 'cfl-15', currentWatt: 15, targetWatt: 10, colorTemp: 4000 },
            { id: 'o2', name: 'Conference Room', count: 8, hours: 3.0, currentType: 'halogen-50', currentWatt: 50, targetWatt: 11, colorTemp: 3000 },
            { id: 'o3', name: 'Breakroom', count: 4, hours: 4.0, currentType: 'incandescent-60', currentWatt: 60, targetWatt: 9, colorTemp: 3000 }
        ]
    };

    // DOM Elements
    const rateInput = document.getElementById('electricity-rate');
    const roomForm = document.getElementById('room-form');
    const roomNameInput = document.getElementById('room-name');
    const fixtureCountInput = document.getElementById('fixture-count');
    const dailyHoursInput = document.getElementById('daily-hours');
    const currentTypeSelect = document.getElementById('current-type');
    const targetWattInput = document.getElementById('target-watt');
    const colorTempSelect = document.getElementById('color-temp');
    
    const roomTableBody = document.getElementById('room-table-body');
    const emptyState = document.getElementById('empty-state');
    const roomCountBadge = document.getElementById('room-count-badge');
    
    const statCurrentCost = document.getElementById('stat-current-cost');
    const statCurrentKwh = document.getElementById('stat-current-kwh');
    const statLedCost = document.getElementById('stat-led-cost');
    const statLedKwh = document.getElementById('stat-led-kwh');
    const statSavings = document.getElementById('stat-savings');
    const statPercentSaved = document.getElementById('stat-percent-saved');
    const statCo2 = document.getElementById('stat-co2');
    
    const btnReset = document.getElementById('btn-reset');
    const btnExport = document.getElementById('btn-export');
    const costCanvas = document.getElementById('costCanvas');

    // Load from LocalStorage if available
    function loadStorage() {
        try {
            const savedRate = localStorage.getItem('auraglow_rate');
            if (savedRate) {
                electricityRate = parseFloat(savedRate);
                rateInput.value = electricityRate;
            }
            const savedRooms = localStorage.getItem('auraglow_rooms');
            if (savedRooms) {
                rooms = JSON.parse(savedRooms);
            } else {
                // Default preset on first run
                rooms = presets.apartment;
            }
        } catch (e) {
            rooms = presets.apartment;
        }
    }

    function saveStorage() {
        try {
            localStorage.setItem('auraglow_rate', electricityRate);
            localStorage.setItem('auraglow_rooms', JSON.stringify(rooms));
        } catch (e) {
            // Ignore quota errors
        }
    }

    // Auto-update wattage suggestion when current bulb type changes
    currentTypeSelect.addEventListener('change', () => {
        const val = currentTypeSelect.value;
        if (bulbReference[val]) {
            const refWatt = bulbReference[val].defaultWatt;
            // Suggest reasonable LED replacement (approx 10-15% of incandescent or standard rule)
            if (refWatt >= 100) targetWattInput.value = 15;
            else if (refWatt >= 60) targetWattInput.value = 9;
            else if (refWatt >= 50) targetWattInput.value = 8;
            else targetWattInput.value = 7;
        }
    });

    rateInput.addEventListener('input', () => {
        const val = parseFloat(rateInput.value);
        if (!isNaN(val) && val > 0) {
            electricityRate = val;
            saveStorage();
            updateDashboard();
        }
    });

    roomForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = roomNameInput.value.trim();
        const count = parseInt(fixtureCountInput.value);
        const hours = parseFloat(dailyHoursInput.value);
        const currentType = currentTypeSelect.value;
        const currentWatt = bulbReference[currentType] ? bulbReference[currentType].defaultWatt : 60;
        const targetWatt = parseFloat(targetWattInput.value);
        const colorTemp = parseInt(colorTempSelect.value);

        if (!name || isNaN(count) || isNaN(hours) || isNaN(targetWatt)) return;

        const newRoom = {
            id: 'room_' + Date.now() + '_' + Math.floor(Math.random()*1000),
            name,
            count,
            hours,
            currentType,
            currentWatt,
            targetWatt,
            colorTemp
        };

        rooms.push(newRoom);
        saveStorage();
        updateDashboard();

        // Reset form name but keep convenient defaults
        roomNameInput.value = '';
        roomNameInput.focus();
    });

    // Preset button listeners
    document.querySelectorAll('[data-preset]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const presetKey = e.target.getAttribute('data-preset');
            if (presets[presetKey]) {
                rooms = JSON.parse(JSON.stringify(presets[presetKey]));
                saveStorage();
                updateDashboard();
            }
        });
    });

    btnReset.addEventListener('click', () => {
        if (confirm('Reset all configured room circuits?')) {
            rooms = [];
            saveStorage();
            updateDashboard();
        }
    });

    btnExport.addEventListener('click', () => {
        const report = {
            app: 'AuraGlow Lighting Audit Lab',
            version: '1.0',
            timestamp: new Date().toISOString(),
            electricityRatePerKwh: electricityRate,
            summary: calculateTotals(),
            rooms: rooms
        };

        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', 'auraglow_lighting_audit.json');
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    window.deleteRoom = function(id) {
        rooms = rooms.filter(r => r.id !== id);
        saveStorage();
        updateDashboard();
    };

    function calculateTotals() {
        let totalCurrentKwhYear = 0;
        let totalLedKwhYear = 0;

        rooms.forEach(r => {
            // kWh = (Watts * Quantity * Hours/day * 365 days) / 1000
            const kwhCurrent = (r.currentWatt * r.count * r.hours * 365) / 1000;
            const kwhLed = (r.targetWatt * r.count * r.hours * 365) / 1000;
            
            totalCurrentKwhYear += kwhCurrent;
            totalLedKwhYear += kwhLed;
        });

        const currentCost = totalCurrentKwhYear * electricityRate;
        const ledCost = totalLedKwhYear * electricityRate;
        const annualSavings = currentCost - ledCost;
        const percentSaved = totalCurrentKwhYear > 0 ? ((totalCurrentKwhYear - totalLedKwhYear) / totalCurrentKwhYear) * 100 : 0;
        // EPA average: ~0.85 lbs CO2 per kWh generated
        const co2OffsetLbs = (totalCurrentKwhYear - totalLedKwhYear) * 0.85;

        return {
            currentKwh: totalCurrentKwhYear,
            ledKwh: totalLedKwhYear,
            currentCost,
            ledCost,
            annualSavings,
            percentSaved,
            co2OffsetLbs
        };
    }

    function updateDashboard() {
        roomCountBadge.textContent = `${rooms.length} Room${rooms.length === 1 ? '' : 's'}`;

        if (rooms.length === 0) {
            emptyState.classList.remove('hidden');
            roomTableBody.innerHTML = '';
        } else {
            emptyState.classList.add('hidden');
            let html = '';
            rooms.forEach(r => {
                const currKwhYr = (r.currentWatt * r.count * r.hours * 365) / 1000;
                const ledKwhYr = (r.targetWatt * r.count * r.hours * 365) / 1000;
                const saving = (currKwhYr - ledKwhYr) * electricityRate;

                html += `
                    <tr>
                        <td>
                            <strong>${escapeHtml(r.name)}</strong><br>
                            <small style="color: var(--text-muted);">${r.colorTemp}K LED</small>
                        </td>
                        <td>${r.count} fixtures<br><small style="color: var(--text-muted);">${r.hours}h / day</small></td>
                        <td>${r.currentWatt}W</td>
                        <td>${r.targetWatt}W</td>
                        <td style="color: var(--accent-emerald); font-weight: 600;">+$${saving.toFixed(2)} /yr</td>
                        <td>
                            <div class="action-btns">
                                <button class="btn-icon danger" onclick="deleteRoom('${r.id}')" title="Remove room">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            roomTableBody.innerHTML = html;
        }

        const totals = calculateTotals();
        statCurrentCost.textContent = `$${totals.currentCost.toFixed(2)}`;
        statCurrentKwh.textContent = `${Math.round(totals.currentKwh).toLocaleString()} kWh / yr`;
        
        statLedCost.textContent = `$${totals.ledCost.toFixed(2)}`;
        statLedKwh.textContent = `${Math.round(totals.ledKwh).toLocaleString()} kWh / yr`;
        
        statSavings.textContent = `$${totals.annualSavings.toFixed(2)}`;
        statPercentSaved.textContent = `${totals.percentSaved.toFixed(1)}% reduction`;
        
        statCo2.textContent = `${Math.round(totals.co2OffsetLbs).toLocaleString()} lbs`;

        drawCanvasChart();
    }

    function drawCanvasChart() {
        const canvas = costCanvas;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        if (rooms.length === 0) {
            ctx.fillStyle = '#64748b';
            ctx.font = '14px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('Add rooms to visualize annual electricity costs', width / 2, height / 2);
            return;
        }

        // Compute room costs
        const roomData = rooms.map(r => {
            const currCost = ((r.currentWatt * r.count * r.hours * 365) / 1000) * electricityRate;
            const ledCost = ((r.targetWatt * r.count * r.hours * 365) / 1000) * electricityRate;
            return {
                name: r.name.length > 10 ? r.name.substring(0, 9) + '…' : r.name,
                currCost,
                ledCost
            };
        });

        const maxCost = Math.max(...roomData.map(d => Math.max(d.currCost, d.ledCost)), 10);
        
        const paddingLeft = 50;
        const paddingRight = 30;
        const paddingTop = 20;
        const paddingBottom = 40;
        
        const chartWidth = width - paddingLeft - paddingRight;
        const chartHeight = height - paddingTop - paddingBottom;
        
        const barGroupWidth = chartWidth / roomData.length;
        const barWidth = Math.max(8, Math.min(28, barGroupWidth * 0.35));

        // Draw grid lines
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = paddingTop + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(paddingLeft, y);
            ctx.lineTo(width - paddingRight, y);
            ctx.stroke();

            // Y-Axis labels
            const valLabel = maxCost * (1 - i / 4);
            ctx.fillStyle = '#64748b';
            ctx.font = '10px system-ui';
            ctx.textAlign = 'right';
            ctx.fillText(`$${Math.round(valLabel)}`, paddingLeft - 8, y + 4);
        }

        // Draw bars
        roomData.forEach((d, idx) => {
            const groupX = paddingLeft + idx * barGroupWidth + barGroupWidth / 2;
            
            const currHeight = (d.currCost / maxCost) * chartHeight;
            const ledHeight = (d.ledCost / maxCost) * chartHeight;
            
            const currX = groupX - barWidth - 3;
            const ledX = groupX + 3;
            
            const currY = paddingTop + chartHeight - currHeight;
            const ledY = paddingTop + chartHeight - ledHeight;

            // Current bulb cost bar (amber)
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(currX, currY, barWidth, currHeight);

            // LED retrofit cost bar (cyan glow)
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(ledX, ledY, barWidth, ledHeight);

            // Room name label
            ctx.fillStyle = '#94a3b8';
            ctx.font = '11px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText(d.name, groupX, height - 12);
        });
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Initial load
    loadStorage();
    updateDashboard();
});
