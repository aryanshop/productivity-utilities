document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const inputs = {
        payloadMass: document.getElementById('payloadMass'),
        payloadMassRange: document.getElementById('payloadMassRange'),
        targetSpeed: document.getElementById('targetSpeed'),
        targetSpeedRange: document.getElementById('targetSpeedRange'),
        airDensity: document.getElementById('airDensity'),
        canopyType: document.getElementById('canopyType'),
        goreCount: document.getElementById('goreCount'),
        spillHole: document.getElementById('spillHole'),
        spillHoleRange: document.getElementById('spillHoleRange'),
        fabricWeight: document.getElementById('fabricWeight'),
        shroudLines: document.getElementById('shroudLines'),
        safetyFactor: document.getElementById('safetyFactor')
    };

    const results = {
        resDiameter: document.getElementById('resDiameter'),
        resArea: document.getElementById('resArea'),
        resWeight: document.getElementById('resWeight'),
        resEnergy: document.getElementById('resEnergy'),
        blueprintSpecs: document.getElementById('blueprintSpecs'),
        cutListTable: document.querySelector('#cutListTable tbody'),
        blueprintSvg: document.getElementById('blueprintSvg')
    };

    const tabBtns = document.querySelectorAll('.tab-btn');
    const btnReset = document.getElementById('btnReset');
    const btnPrint = document.getElementById('btnPrint');
    const exportModal = document.getElementById('exportModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnConfirmPrint = document.getElementById('btnConfirmPrint');
    const modalPrintArea = document.getElementById('modalPrintArea');

    let currentView = 'gore';

    // Sync range and number inputs
    function syncInputs(numEl, rangeEl, isFloat = false) {
        numEl.addEventListener('input', () => {
            rangeEl.value = numEl.value;
            calculateAndRender();
        });
        rangeEl.addEventListener('input', () => {
            numEl.value = rangeEl.value;
            calculateAndRender();
        });
    }

    syncInputs(inputs.payloadMass, inputs.payloadMassRange);
    syncInputs(inputs.targetSpeed, inputs.targetSpeedRange, true);
    syncInputs(inputs.spillHole, inputs.spillHoleRange);

    // Other input change listeners
    Object.values(inputs).forEach(el => {
        if (el && !el.id.includes('Range')) {
            el.addEventListener('change', calculateAndRender);
        }
    });

    // Tab switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.getAttribute('data-view');
            calculateAndRender();
        });
    });

    // Reset defaults
    btnReset.addEventListener('click', () => {
        inputs.payloadMass.value = 350;
        inputs.payloadMassRange.value = 350;
        inputs.targetSpeed.value = 4.5;
        inputs.targetSpeedRange.value = 4.5;
        inputs.airDensity.value = '1.225';
        inputs.canopyType.value = 'hemispherical';
        inputs.goreCount.value = '8';
        inputs.spillHole.value = 5;
        inputs.spillHoleRange.value = 5;
        inputs.fabricWeight.value = 45;
        inputs.shroudLines.value = '8';
        inputs.safetyFactor.value = 4.0;
        calculateAndRender();
    });

    // Drag Coefficient lookup
    function getCd(type) {
        switch(type) {
            case 'hemispherical': return 0.75;
            case 'flatCircular': return 1.50;
            case 'annular': return 0.85;
            case 'cruciform': return 0.80;
            default: return 0.75;
        }
    }

    // Core Physics & Engineering Calculations
    function computeParachute() {
        const massKg = parseFloat(inputs.payloadMass.value) / 1000.0;
        const velocity = parseFloat(inputs.targetSpeed.value);
        const rho = parseFloat(inputs.airDensity.value);
        const canopyType = inputs.canopyType.value;
        const cd = getCd(canopyType);
        const g = 9.80665;

        const weightNewtons = massKg * g;

        // Drag equation: F_d = 0.5 * rho * v^2 * Cd * S => S = (2 * W) / (rho * v^2 * Cd)
        const surfaceArea = (2.0 * weightNewtons) / (rho * Math.pow(velocity, 2) * cd);

        // Equivalent Diameter (S = pi * D^2 / 4 => D = sqrt(4 * S / pi))
        const diameterMeters = Math.sqrt((4.0 * surfaceArea) / Math.PI);
        const diameterCm = diameterMeters * 100;

        // Canopy Fabric Weight Estimation
        const fabricGsm = parseFloat(inputs.fabricWeight.value);
        const canopyWeightGrams = surfaceArea * fabricGsm;

        // Kinetic Energy at impact: KE = 0.5 * m * v^2
        const kineticEnergy = 0.5 * massKg * Math.pow(velocity, 2);

        return {
            massKg,
            velocity,
            rho,
            cd,
            weightNewtons,
            surfaceArea,
            diameterMeters,
            diameterCm,
            canopyWeightGrams,
            kineticEnergy
        };
    }

    // Render SVG Blueprint & Metrics
    function calculateAndRender() {
        const data = computeParachute();

        // Update metrics cards
        results.resDiameter.textContent = data.diameterCm.toFixed(1);
        results.resArea.textContent = data.surfaceArea.toFixed(2);
        results.resWeight.textContent = data.canopyWeightGrams.toFixed(1);
        results.resEnergy.textContent = data.kineticEnergy.toFixed(1);

        // Blueprint specs bar
        const gores = parseInt(inputs.goreCount.value);
        const spillRatio = parseFloat(inputs.spillHole.value) / 100.0;
        results.blueprintSpecs.innerHTML = `
            <span><strong>Architecture:</strong> ${inputs.canopyType.options[inputs.canopyType.selectedIndex].text}</span>
            <span><strong>Gores:</strong> ${gores} panels</span>
            <span><strong>Spill Hole:</strong> ${(spillRatio * 100).toFixed(0)}%</span>
            <span><strong>Cd:</strong> ${data.cd}</span>
        `;

        // Render SVG
        renderSvg(data, gores, spillRatio);

        // Render Cut List Table
        renderCutList(data, gores);
    }

    function renderSvg(data, gores, spillRatio) {
        const svg = results.blueprintSvg;
        svg.innerHTML = '';

        if (currentView === 'gore') {
            renderGoreTemplate(svg, data, gores, spillRatio);
        } else {
            renderTopAssembly(svg, data, gores, spillRatio);
        }
    }

    function renderGoreTemplate(svg, data, gores, spillRatio) {
        // Gore mathematics for spherical/parabolic canopy sector
        // Top width = D * pi * spillRatio / gores
        // Bottom width = D * pi / gores
        // Height = D * pi / 2 (approx arc length)
        const dM = data.diameterMeters;
        const topWidthM = (dM * Math.PI * spillRatio) / gores;
        const bottomWidthM = (dM * Math.PI) / gores;
        const heightM = (dM * Math.PI) / 2.0;

        // Scale to SVG viewport (600 x 400)
        // Max drawing height ~ 320px
        const scale = 280 / heightM;
        const svgH = heightM * scale;
        const svgTopW = topWidthM * scale;
        const svgBotW = bottomWidthM * scale;

        const cx = 300;
        const startY = 50;
        const endY = startY + svgH;

        // Grid lines / Dimension markers
        let html = `
            <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8"/>
                </marker>
            </defs>
            <!-- Background Grid -->
            <line x1="100" y1="50" x2="100" y2="350" stroke="#1e293b" stroke-dasharray="4"/>
            <line x1="300" y1="50" x2="300" y2="350" stroke="#1e293b" stroke-dasharray="4"/>
            <line x1="500" y1="50" x2="500" y2="350" stroke="#1e293b" stroke-dasharray="4"/>
        `;

        // Gore polygon path (centered at cx)
        const halfTop = svgTopW / 2;
        const halfBot = svgBotW / 2;

        // Slight parabolic curve for gore side seams
        html += `
            <path d="M ${cx - halfTop} ${startY} 
                     Q ${cx - (halfTop + halfBot)/2 - 15} ${(startY + endY)/2}, ${cx - halfBot} ${endY} 
                     L ${cx + halfBot} ${endY} 
                     Q ${cx + (halfTop + halfBot)/2 + 15} ${(startY + endY)/2}, ${cx + halfTop} ${startY} Z" 
                  fill="rgba(56, 189, 248, 0.1)" stroke="#38bdf8" stroke-width="2"/>
        `;

        // Center seam line
        html += `<line x1="${cx}" y1="${startY}" x2="${cx}" y2="${endY}" stroke="#94a3b8" stroke-dasharray="2" stroke-width="1"/>`;

        // Dimension labels
        html += `
            <text x="${cx}" y="${startY - 15}" fill="#38bdf8" font-size="12" text-anchor="middle">Top Width: ${(topWidthM*100).toFixed(1)} cm</text>
            <text x="${cx}" y="${endY + 25}" fill="#38bdf8" font-size="12" text-anchor="middle">Base Width: ${(bottomWidthM*100).toFixed(1)} cm</text>
            <text x="${cx + Math.max(halfBot, halfTop) + 30}" y="${(startY + endY)/2}" fill="#94a3b8" font-size="12" text-anchor="middle" transform="rotate(90, ${cx + Math.max(halfBot, halfTop) + 30}, ${(startY + endY)/2})">Panel Length: ${(heightM*100).toFixed(1)} cm</text>
        `;

        svg.innerHTML = html;
    }

    function renderTopAssembly(svg, data, gores, spillRatio) {
        const cx = 300;
        const cy = 200;
        const radius = 140;
        const spillRadius = radius * spillRatio;

        let html = `
            <circle cx="${cx}" cy="${cy}" r="${radius}" fill="rgba(56, 189, 248, 0.08)" stroke="#38bdf8" stroke-width="2"/>
            <circle cx="${cx}" cy="${cy}" r="${spillRadius}" fill="#090d16" stroke="#f43f5e" stroke-width="2" stroke-dasharray="4"/>
        `;

        // Draw gore division lines
        for (let i = 0; i < gores; i++) {
            const angle = (i * 2 * Math.PI) / gores;
            const x2 = cx + radius * Math.cos(angle);
            const y2 = cy + radius * Math.sin(angle);
            html += `<line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" stroke="#334155" stroke-width="1.5"/>`;
        }

        // Center ring / spill hole label
        html += `
            <circle cx="${cx}" cy="${cy}" r="4" fill="#f43f5e"/>
            <text x="${cx}" y="${cy - radius - 15}" fill="#38bdf8" font-size="12" text-anchor="middle">Nominal Diameter: ${(data.diameterCm).toFixed(1)} cm</text>
            <text x="${cx}" y="${cy + radius + 25}" fill="#94a3b8" font-size="11" text-anchor="middle">${gores} Gores with Shroud Attachment Points</text>
        `;

        svg.innerHTML = html;
    }

    function renderCutList(data, gores) {
        const tbody = results.cutListTable;
        tbody.innerHTML = '';

        const dM = data.diameterMeters;
        const topWidthCm = ((dM * Math.PI * (parseFloat(inputs.spillHole.value)/100.0)) / gores) * 100;
        const botWidthCm = ((dM * Math.PI) / gores) * 100;
        const heightCm = ((dM * Math.PI) / 2.0) * 100;

        const lineCount = parseInt(inputs.shroudLines.value);
        const lineLengthM = dM * 1.25; // Standard 1.25x diameter rule
        const safety = parseFloat(inputs.safetyFactor.value);
        const breakingLoadN = data.weightNewtons * safety;

        const rows = [
            {
                comp: 'Canopy Gores (Panels)',
                qty: gores,
                dims: `Top: ${topWidthCm.toFixed(1)}cm | Base: ${botWidthCm.toFixed(1)}cm | Height: ${heightCm.toFixed(1)}cm (inc. 1cm hem)`,
                spec: `Ripstop Nylon / Polyester (${inputs.fabricWeight.value} g/m²)`
            },
            {
                comp: 'Shroud Lines',
                qty: lineCount,
                dims: `Length: ${(lineLengthM * 100).toFixed(0)} cm per line`,
                spec: `Kevlar / Spectra Cord (Min Break > ${breakingLoadN.toFixed(0)} N)`
            },
            {
                comp: 'Shock Cord',
                qty: '1 Piece',
                dims: `Length: ${(dM * 2.5 * 100).toFixed(0)} cm`,
                spec: `Heavy Duty Elastic / Tubular Nylon`
            },
            {
                comp: 'Apex Reinforcement Ring',
                qty: '1-2 Pieces',
                dims: `Outer Dia: ${(topWidthCm * 1.5).toFixed(1)} cm`,
                spec: `Doubled Ripstop Patch / Webbing`
            }
        ];

        rows.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${r.comp}</strong></td>
                <td>${r.qty}</td>
                <td>${r.dims}</td>
                <td>${r.spec}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Modal Export Actions
    btnPrint.addEventListener('click', () => {
        const data = computeParachute();
        const gores = inputs.goreCount.value;
        const spill = inputs.spillHole.value;

        modalPrintArea.innerHTML = `
            <h3 style="color: #38bdf8; margin-bottom: 0.50rem;">AeroStitch Engineering Blueprint</h3>
            <p><strong>Payload Mass:</strong> ${inputs.payloadMass.value} g</p>
            <p><strong>Target Descent Speed:</strong> ${inputs.targetSpeed.value} m/s</p>
            <p><strong>Canopy Type:</strong> ${inputs.canopyType.options[inputs.canopyType.selectedIndex].text}</p>
            <p><strong>Calculated Diameter:</strong> ${data.diameterCm.toFixed(1)} cm (${data.surfaceArea.toFixed(2)} m²)</p>
            <p><strong>Gore Configuration:</strong> ${gores} panels with ${spill}% spill hole</p>
            <p><strong>Estimated Canopy Weight:</strong> ${data.canopyWeightGrams.toFixed(1)} grams</p>
            <p><strong>Impact Kinetic Energy:</strong> ${data.kineticEnergy.toFixed(2)} Joules</p>
            <hr style="border-color: #334155; margin: 0.5rem 0;">
            <p style="font-size: 0.85rem; color: #94a3b8;">Generated securely via AeroStitch Decelerator Suite. All calculations use standard atmospheric and aerodynamic drag equations.</p>
        `;
        exportModal.classList.add('active');
    });

    btnCloseModal.addEventListener('click', () => {
        exportModal.classList.remove('active');
    });

    btnConfirmPrint.addEventListener('click', () => {
        window.print();
    });

    window.addEventListener('click', (e) => {
        if (e.target === exportModal) {
            exportModal.classList.remove('active');
        }
    });

    // Initial run
    calculateAndRender();
});
