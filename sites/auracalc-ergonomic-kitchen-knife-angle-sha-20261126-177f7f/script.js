document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const bladeTypeSelect = document.getElementById('blade-type');
    const bladeThicknessInput = document.getElementById('blade-thickness');
    const bladeHeightInput = document.getElementById('blade-height');
    const edgeAngleInput = document.getElementById('edge-angle');
    const stoneHeightInput = document.getElementById('stone-height');
    const steelHardnessSelect = document.getElementById('steel-hardness');
    const gritContainer = document.getElementById('grit-container');
    
    const resBevelWidth = document.getElementById('res-bevel-width');
    const resIncludedAngle = document.getElementById('res-included-angle');
    const resApexRadius = document.getElementById('res-apex-radius');
    const resMetalRemoval = document.getElementById('res-metal-removal');
    
    const canvas = document.getElementById('edge-canvas');
    const ctx = canvas.getContext('2d');
    
    const btnReset = document.getElementById('btn-reset');
    const btnExport = document.getElementById('btn-export');
    const btnAddSession = document.getElementById('btn-add-session');
    const sessionTbody = document.getElementById('session-tbody');

    // Preset profiles
    const profiles = {
        chef: { thickness: 2.2, height: 45, angle: 20 },
        santoku: { thickness: 1.8, height: 48, angle: 15 },
        paring: { thickness: 1.5, height: 25, angle: 17 },
        sujihiki: { thickness: 2.0, height: 35, angle: 12 },
        cleaver: { thickness: 4.0, height: 85, angle: 25 }
    };

    // Local storage session logs
    let sessionLogs = JSON.parse(localStorage.getItem('auracalc_knife_sessions')) || [
        {
            id: 1,
            timestamp: new Date(Date.now() - 86400000).toLocaleDateString(),
            profile: "Western Chef's Knife",
            angle: "20°",
            stones: "400, 1000, 3000",
            bevelWidth: "0.64 mm"
        }
    ];

    // Preset change handler
    bladeTypeSelect.addEventListener('change', () => {
        const val = bladeTypeSelect.value;
        if (profiles[val]) {
            bladeThicknessInput.value = profiles[val].thickness;
            bladeHeightInput.value = profiles[val].height;
            edgeAngleInput.value = profiles[val].angle;
        }
        calculateAndRender();
    });

    // Inputs listeners
    [bladeThicknessInput, bladeHeightInput, edgeAngleInput, stoneHeightInput, steelHardnessSelect].forEach(element => {
        if (element) {
            element.addEventListener('input', () => {
                if (bladeTypeSelect.value !== 'custom') {
                    bladeTypeSelect.value = 'custom';
                }
                calculateAndRender();
            });
        }
    });

    gritContainer.addEventListener('change', calculateAndRender);

    function calculateAndRender() {
        const thickness = parseFloat(bladeThicknessInput.value) || 2.0;
        const height = parseFloat(bladeHeightInput.value) || 40;
        const angle = parseFloat(edgeAngleInput.value) || 15;
        const hrc = parseFloat(steelHardnessSelect.value) || 58;

        // Math calculations
        // Bevel width calculation: thickness / (2 * sin(angle))
        const angleRad = (angle * Math.PI) / 180;
        const bevelWidthMm = (thickness / 2) / Math.sin(angleRad);
        const includedAngle = angle * 2;
        
        // Apex radius estimated by highest selected grit
        const checkedGrits = Array.from(gritContainer.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => parseInt(cb.value));
        const maxGrit = checkedGrits.length > 0 ? Math.max(...checkedGrits) : 400;
        
        // Higher grit -> finer apex radius (microns)
        const apexRadiusUm = Math.max(0.08, (500 / Math.sqrt(maxGrit))).toFixed(2);
        
        // Metal removal volume estimation based on thickness and angle reduction
        const metalRemovalMm3 = (thickness * height * 0.15 * (35 - angle) * (65 - hrc) * 0.05).toFixed(1);

        // Update metrics display
        resBevelWidth.textContent = bevelWidthMm.toFixed(2) + ' mm';
        resIncludedAngle.textContent = includedAngle.toFixed(1) + '°';
        resApexRadius.textContent = apexRadiusUm + ' µm';
        resMetalRemoval.textContent = Math.max(1.2, metalRemovalMm3) + ' mm³';

        drawKnifeCrossSection(thickness, height, angle);
    }

    function drawKnifeCrossSection(thickness, height, angle) {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const cx = canvas.width / 2;
        const cy = 30;
        const scale = 3.5;

        const tPx = (thickness * scale);
        const hPx = (height * scale);

        // Draw blade body cross-section
        ctx.save();
        ctx.translate(cx, cy);

        // Spine (top)
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(-tPx / 2, 0);
        ctx.lineTo(tPx / 2, 0);
        
        // Blade bevel taper down to apex
        const apexY = hPx;
        const bevelWidthOffset = tPx * 2.5;

        ctx.lineTo(bevelWidthOffset, apexY - 15);
        ctx.lineTo(0, apexY);
        ctx.lineTo(-bevelWidthOffset, apexY - 15);
        ctx.closePath();

        // Gradient fill for blade
        const grad = ctx.createLinearGradient(-tPx, 0, tPx, hPx);
        grad.addColorStop(0, '#475569');
        grad.addColorStop(0.5, '#334155');
        grad.addColorStop(1, '#1e293b');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Primary Bevel Highlight lines
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(bevelWidthOffset, apexY - 15);
        ctx.moveTo(0, 0);
        ctx.lineTo(-bevelWidthOffset, apexY - 15);
        ctx.stroke();

        // Apex glowing tip
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.arc(0, apexY, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // Session Logging
    function renderSessionTable() {
        if (!sessionTbody) return;
        sessionTbody.innerHTML = '';
        sessionLogs.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.timestamp}</td>
                <td>${item.profile}</td>
                <td>${item.angle}</td>
                <td>${item.stones}</td>
                <td>${item.bevelWidth}</td>
                <td><button class="btn-delete" data-index="${index}">Remove</button></td>
            `;
            sessionTbody.appendChild(tr);
        });

        localStorage.setItem('auracalc_knife_sessions', JSON.stringify(sessionLogs));
    }

    if (btnAddSession) {
        btnAddSession.addEventListener('click', () => {
            const checkedGrits = Array.from(gritContainer.querySelectorAll('input[type="checkbox"]:checked'))
                .map(cb => cb.value).join(', ');
            
            const newLog = {
                id: Date.now(),
                timestamp: new Date().toLocaleDateString(),
                profile: bladeTypeSelect.options[bladeTypeSelect.selectedIndex].text.split('(')[0].trim(),
                angle: edgeAngleInput.value + '°',
                stones: checkedGrits || 'None',
                bevelWidth: resBevelWidth.textContent
            };
            sessionLogs.unshift(newLog);
            renderSessionTable();
        });
    }

    if (sessionTbody) {
        sessionTbody.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-delete')) {
                const idx = parseInt(e.target.getAttribute('data-index'));
                sessionLogs.splice(idx, 1);
                renderSessionTable();
            }
        });
    }

    if (btnReset) {
        btnReset.addEventListener('click', () => {
            bladeTypeSelect.value = 'chef';
            bladeThicknessInput.value = '2.2';
            bladeHeightInput.value = '45';
            edgeAngleInput.value = '20';
            stoneHeightInput.value = '20';
            steelHardnessSelect.value = '58';
            gritContainer.querySelectorAll('input[type="checkbox"]').forEach((cb, idx) => {
                cb.checked = idx < 4;
            });
            calculateAndRender();
        });
    }

    if (btnExport) {
        btnExport.addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessionLogs, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", "auracalc_sharpening_sessions.json");
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
        });
    }

    // Initial run
    calculateAndRender();
    renderSessionTable();
});
