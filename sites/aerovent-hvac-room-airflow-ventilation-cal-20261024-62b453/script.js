document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const roomNameInput = document.getElementById('roomName');
    const roomTypeSelect = document.getElementById('roomType');
    const roomLengthInput = document.getElementById('roomLength');
    const roomWidthInput = document.getElementById('roomWidth');
    const roomHeightInput = document.getElementById('roomHeight');
    const occupantCountInput = document.getElementById('occupantCount');
    const hasSmokerCheckbox = document.getElementById('hasSmoker');
    const hasAllergiesCheckbox = document.getElementById('hasAllergies');

    const calcBtn = document.getElementById('calcBtn');
    const saveRoomBtn = document.getElementById('saveRoomBtn');
    const clearLedgerBtn = document.getElementById('clearLedgerBtn');

    const resCfm = document.getElementById('resCfm');
    const resAch = document.getElementById('resAch');
    const resVolume = document.getElementById('resVolume');
    const resCadr = document.getElementById('resCadr');
    const recsList = document.getElementById('recsList');

    const ledgerBody = document.getElementById('ledgerBody');
    const canvas = document.getElementById('roomCanvas');
    const ctx = canvas ? canvas.getContext('2d') : null;

    // State for animation particles
    let particles = [];
    const particleCount = 45;

    function initParticles() {
        particles = [];
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.3) * 1.5,
                vy: (Math.random() - 0.5) * 1.0,
                radius: Math.random() * 2.5 + 1,
                life: Math.random() * 100
            });
        }
    }

    function calculateVentilation() {
        const length = parseFloat(roomLengthInput.value) || 10;
        const width = parseFloat(roomWidthInput.value) || 10;
        const height = parseFloat(roomHeightInput.value) || 8;
        const occupants = parseInt(occupantCountInput.value) || 0;
        const isSmoker = hasSmokerCheckbox.checked;
        const needsHEPA = hasAllergiesCheckbox.checked;

        // Get default ACH from selected room type
        const selectedOption = roomTypeSelect.options[roomTypeSelect.selectedIndex];
        let baseACH = parseFloat(selectedOption.getAttribute('data-ach')) || 4;

        // Adjust ACH for smokers or high occupancy
        if (isSmoker) baseACH += 4;
        if (occupants > 5) baseACH += 2;

        // Calculations
        const volume = length * width * height; // cubic feet
        // CFM = (Volume * ACH) / 60
        let requiredCFM = (volume * baseACH) / 60;

        // ASHRAE standard occupant ventilation add-on (~15 CFM per person outside of base ACH)
        requiredCFM += occupants * 15;

        // Recalculate effective ACH based on final CFM
        const effectiveACH = (requiredCFM * 60) / volume;

        // Air Purifier CADR recommendation (Roughly CFM * 1.5 or volume * ACH / 60 converted for particulate removal)
        const recommendedCADR = needsHEPA ? Math.round(volume * (effectiveACH / 2)) : 0;

        // Update UI metrics
        resCfm.textContent = Math.round(requiredCFM);
        resAch.textContent = effectiveACH.toFixed(1);
        resVolume.textContent = Math.round(volume).toLocaleString();
        resCadr.textContent = recommendedCADR > 0 ? recommendedCADR + ' CFM' : 'Optional';

        generateRecommendations(volume, effectiveACH, requiredCFM, occupants, isSmoker);

        return {
            name: roomNameInput.value || 'Unnamed Room',
            dimensions: `${length}' × ${width}' × ${height}'`,
            volume: Math.round(volume),
            ach: effectiveACH.toFixed(1),
            cfm: Math.round(requiredCFM),
            cadr: recommendedCADR > 0 ? recommendedCADR : 'N/A'
        };
    }

    function generateRecommendations(volume, ach, cfm, occupants, isSmoker) {
        recsList.innerHTML = '';

        const recs = [];

        if (ach < 4) {
            recs.push('Air exchange rate is relatively low. Ensure passive window trickle vents or mechanical extraction are active.');
        } else if (ach >= 10) {
            recs.push('High-intensity ventilation zone (kitchen/workshop). Verify continuous duct pressure and grease/particulate trap cleanliness.');
        } else {
            recs.push(`Balanced airflow achieved. Aim to maintain ${cfm.toFixed(0)} CFM continuous supply/exhaust balance.`);
        }

        if (occupants > 0) {
            recs.push(`For ${occupants} occupant(s), ensure CO2 levels remain below 1,000 ppm by supplementing with fresh outdoor air intake.`);
        }

        if (isSmoker) {
            recs.push('Heavy odor/smoke detected in parameters. Carbon filtration and direct exhaust venting are strongly recommended over recirculation.');
        }

        recs.push(`Total air volume is ${Math.round(volume).toLocaleString()} cu. ft. Complete room air flush occurs every approximately ${((volume / cfm)).toFixed(1)} minutes.`);
        recs.push('Inspect HVAC pre-filters every 90 days and HEPA modules annually.');

        recs.forEach(text => {
            const li = document.createElement('li');
            li.textContent = text;
            recsList.appendChild(li);
        });
    }

    // Canvas Animation Loop
    function drawRoomVisualizer() {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw Room Floorplan Outline
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 3;
        ctx.strokeRect(40, 30, canvas.width - 80, canvas.height - 60);

        // Draw Supply Vent (Top Left)
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(50, 25, 40, 10);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px system-ui';
        ctx.fillText('SUPPLY', 52, 20);

        // Draw Exhaust Vent (Bottom Right)
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(canvas.width - 90, canvas.height - 35, 40, 10);
        ctx.fillText('EXHAUST', canvas.width - 92, canvas.height - 40);

        // Update and draw particles
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;

            // Boundary wrapping inside room bounds
            if (p.x < 42) p.x = canvas.width - 42;
            if (p.x > canvas.width - 42) p.x = 42;
            if (p.y < 32) p.y = canvas.height - 32;
            if (p.y > canvas.height - 32) p.y = 32;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#10b981';
            ctx.fill();
        });

        requestAnimationFrame(drawRoomVisualizer);
    }

    // Local Storage Ledger Management
    function getSavedRooms() {
        try {
            const data = localStorage.getItem('aerovent_rooms');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    function saveRoomsToStorage(rooms) {
        try {
            localStorage.setItem('aerovent_rooms', JSON.stringify(rooms));
        } catch (e) {}
    }

    function renderLedger() {
        const rooms = getSavedRooms();
        ledgerBody.innerHTML = '';

        if (rooms.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="7" style="text-align: center; color: var(--text-secondary);">No saved configurations found.</td>`;
            ledgerBody.appendChild(tr);
            return;
        }

        rooms.forEach((r, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHtml(r.name)}</td>
                <td>${escapeHtml(r.dimensions)}</td>
                <td>${r.volume.toLocaleString()}</td>
                <td>${r.ach}</td>
                <td>${r.cfm} CFM</td>
                <td>${r.cadr}</td>
                <td>
                    <button class="load-row" data-index="${index}">Load</button>
                    <button class="delete-row" data-index="${index}">Delete</button>
                </td>
            `;
            ledgerBody.appendChild(tr);
        });
    }

    function escapeHtml(str) {
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // Event Listeners
    calcBtn.addEventListener('click', calculateVentilation);

    [roomLengthInput, roomWidthInput, roomHeightInput, occupantCountInput, roomTypeSelect, hasSmokerCheckbox, hasAllergiesCheckbox].forEach(el => {
        el.addEventListener('input', calculateVentilation);
    });

    saveRoomBtn.addEventListener('click', () => {
        const roomData = calculateVentilation();
        const rooms = getSavedRooms();
        rooms.push(roomData);
        saveRoomsToStorage(rooms);
        renderLedger();
    });

    clearLedgerBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all saved room configurations?')) {
            localStorage.removeItem('aerovent_rooms');
            renderLedger();
        }
    });

    ledgerBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-row')) {
            const index = parseInt(e.target.getAttribute('data-index'));
            const rooms = getSavedRooms();
            rooms.splice(index, 1);
            saveRoomsToStorage(rooms);
            renderLedger();
        } else if (e.target.classList.contains('load-row')) {
            const index = parseInt(e.target.getAttribute('data-index'));
            const rooms = getSavedRooms();
            const r = rooms[index];
            if (r) {
                roomNameInput.value = r.name;
                // Parse dimensions back if needed
                const parts = r.dimensions.replace(/['\s]/g, '').split('×');
                if (parts.length === 3) {
                    roomLengthInput.value = parts[0];
                    roomWidthInput.value = parts[1];
                    roomHeightInput.value = parts[2];
                }
                calculateVentilation();
            }
        }
    });

    // Initial Load
    initParticles();
    calculateVentilation();
    renderLedger();
    if (canvas) {
        drawRoomVisualizer();
    }
});
