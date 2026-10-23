document.addEventListener('DOMContentLoaded', () => {
    // Input Elements
    const inputs = {
        payloadMass: document.getElementById('payloadMass'),
        targetSpeed: document.getElementById('targetSpeed'),
        canopyType: document.getElementById('canopyType'),
        dragCoeff: document.getElementById('dragCoeff'),
        goreCount: document.getElementById('goreCount'),
        fabricDensity: document.getElementById('fabricDensity'),
        airDensity: document.getElementById('airDensity'),
        safetyFactor: document.getElementById('safetyFactor'),
        ventRatio: document.getElementById('ventRatio')
    };

    // Output Metric Elements
    const outputs = {
        resDiameter: document.getElementById('resDiameter'),
        resArea: document.getElementById('resArea'),
        resForce: document.getElementById('resForce'),
        resForceKg: document.getElementById('resForceKg'),
        resYardage: document.getElementById('resYardage'),
        blueprintSvg: document.getElementById('blueprintSvg'),
        blueprintMeta: document.getElementById('blueprintMeta'),
        cutListTableBody: document.querySelector('#cutListTable tbody')
    };

    // View State
    let currentView = 'canopy';

    // Preset Cd values based on canopy type
    const defaultCd = {
        hemispherical: 0.75,
        flatCircular: 0.60,
        cruciform: 0.85,
        annular: 0.65
    };

    // Event Listeners for Inputs
    Object.keys(inputs).forEach(key => {
        if (!inputs[key]) return;
        inputs[key].addEventListener('input', () => {
            if (key === 'canopyType') {
                inputs.dragCoeff.value = defaultCd[inputs.canopyType.value] || 0.75;
            }
            calculateAndRender();
        });
    });

    // View Toggle Buttons
    document.querySelectorAll('.btn-toggle').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.btn-toggle').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentView = e.target.getAttribute('data-view');
            calculateAndRender();
        });
    });

    // Export & Print actions
    document.getElementById('btnExportJson').addEventListener('click', exportJson);
    document.getElementById('btnPrint').addEventListener('click', () => window.print());

    function calculateAndRender() {
        // Read values safely
        const m = parseFloat(inputs.payloadMass.value) || 1;
        const v = parseFloat(inputs.targetSpeed.value) || 4;
        const cd = parseFloat(inputs.dragCoeff.value) || 0.75;
        const nGores = parseInt(inputs.goreCount.value) || 8;
        const rho = parseFloat(inputs.airDensity.value) || 1.225;
        const sf = parseFloat(inputs.safetyFactor.value) || 3;
        const vent = parseFloat(inputs.ventRatio.value) || 5;
        const fabricKgM2 = (parseFloat(inputs.fabricDensity.value) || 45) / 1000;

        // Physics Calculations
        // Weight force W = m * g (g = 9.80665)
        const g = 9.80665;
        const weight = m * g;

        // Drag equation: F_d = 0.5 * rho * v^2 * S * Cd = weight (at terminal velocity)
        // Surface Area S = (2 * m * g) / (rho * v^2 * Cd)
        const surfaceArea = (2 * weight) / (rho * Math.pow(v, 2) * cd);

        // Nominal Diameter D = sqrt((4 * S) / pi)
        const diameter = Math.sqrt((4 * surfaceArea) / Math.PI);

        // Peak Opening Shock Force = Dynamic Pressure * S * Cd * safetyFactor
        // Approx dynamic pressure surge during deployment (approx 2.2x steady descent dynamic pressure or custom factor)
        const peakForce = 0.5 * rho * Math.pow(v * 1.8, 2) * surfaceArea * cd * sf;
        const peakForceKg = peakForce / g;

        // Material Yardage estimation (Fabric surface area + 15% waste allowance / standard 1.5m width)
        const totalFabricArea = surfaceArea * 1.15;
        const linearYardage = totalFabricArea / 1.5;

        // Update Metric Displays
        outputs.resDiameter.textContent = diameter.toFixed(2);
        outputs.resArea.textContent = surfaceArea.toFixed(2);
        outputs.resForce.textContent = peakForce.toFixed(0) + ' N';
        outputs.resForceKg.textContent = '(' + peakForceKg.toFixed(1) + ' kgf)';
        outputs.resYardage.textContent = linearYardage.toFixed(1);

        // Render SVG Blueprint
        renderSvgBlueprint(diameter, surfaceArea, nGores, vent, inputs.canopyType.value);

        // Render Cut List Table
        renderCutList(diameter, surfaceArea, nGores, vent, fabricKgM2, totalFabricArea);
    }

    function renderSvgBlueprint(dia, area, gores, ventPct, type) {
        const svg = outputs.blueprintSvg;
        svg.innerHTML = '';

        const width = 600;
        const height = 400;
        const cx = width / 2;
        const cy = height / 2;

        // Grid lines for blueprint aesthetic
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = `
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="1"/>
            </pattern>
        `;
        svg.appendChild(defs);

        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('width', '100%');
        bgRect.setAttribute('height', '100%');
        bgRect.setAttribute('fill', 'url(#grid)');
        svg.appendChild(bgRect);

        if (currentView === 'canopy') {
            // Draw Canopy Profile View
            const scale = 120 / Math.max(dia, 1);
            const r = (dia / 2) * scale;

            // Canopy Arc
            const canopyGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            
            if (type === 'cruciform') {
                // Square outline
                const side = r * 1.414;
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('x', cx - side/2);
                rect.setAttribute('y', cy - side/2 - 20);
                rect.setAttribute('width', side);
                rect.setAttribute('height', side);
                rect.setAttribute('fill', 'rgba(56, 189, 248, 0.15)');
                rect.setAttribute('stroke', '#38bdf8');
                rect.setAttribute('stroke-width', '2');
                canopyGroup.appendChild(rect);
            } else {
                // Dome arc path
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const startX = cx - r;
                const endX = cx + r;
                const arcY = cy - 20;
                path.setAttribute('d', `M ${startX} ${arcY} A ${r} ${r} 0 0 1 ${endX} ${arcY} Z`);
                path.setAttribute('fill', 'rgba(56, 189, 248, 0.15)');
                path.setAttribute('stroke', '#38bdf8');
                path.setAttribute('stroke-width', '2');
                canopyGroup.appendChild(path);
            }

            // Apex Vent
            if (ventPct > 0) {
                const ventR = r * (ventPct / 100);
                const ventCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                ventCircle.setAttribute('cx', cx);
                ventCircle.setAttribute('cy', cy - 20 - (type === 'cruciform' ? r*0.707 : 0));
                ventCircle.setAttribute('r', Math.max(ventR, 4));
                ventCircle.setAttribute('fill', '#0b1120');
                ventCircle.setAttribute('stroke', '#38bdf8');
                ventCircle.setAttribute('stroke-dasharray', '3,3');
                canopyGroup.appendChild(ventCircle);
            }

            // Suspension Lines & Payload
            const linesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            const skirtLeft = cx - r;
            const skirtRight = cx + r;
            const payloadY = cy + 120;

            // Suspension lines
            [skirtLeft, cx - r*0.5, cx, cx + r*0.5, skirtRight].forEach(lx => {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', lx);
                line.setAttribute('y1', cy - 20);
                line.setAttribute('x2', cx);
                line.setAttribute('y2', payloadY);
                line.setAttribute('stroke', '#94a3b8');
                line.setAttribute('stroke-width', '1');
                line.setAttribute('stroke-dasharray', '4,2');
                linesGroup.appendChild(line);
            });

            // Payload box
            const payloadBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            payloadBox.setAttribute('x', cx - 15);
            payloadBox.setAttribute('y', payloadY);
            payloadBox.setAttribute('width', 30);
            payloadBox.setAttribute('height', 25);
            payloadBox.setAttribute('rx', 4);
            payloadBox.setAttribute('fill', '#1e293b');
            payloadBox.setAttribute('stroke', '#38bdf8');
            payloadBox.setAttribute('stroke-width', '2');

            svg.appendChild(canopyGroup);
            svg.appendChild(linesGroup);
            svg.appendChild(payloadBox);

            outputs.blueprintMeta.innerHTML = `<span>Canopy Profile &bull; Nominal Dia: ${dia.toFixed(2)}m</span><span>Suspension Line Length: ${(dia * 1.1).toFixed(2)}m</span>`;

        } else {
            // Draw Single Gore Template View
            const goreGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            
            // Gore height (approx arc length) and top/bottom widths
            const goreHeight = (Math.PI * dia) / 2;
            const bottomWidth = (Math.PI * dia) / gores;
            const topWidth = bottomWidth * (ventPct / 100);

            const scale = 220 / Math.max(goreHeight, 1);
            const gh = goreHeight * scale;
            const bw = bottomWidth * scale;
            const tw = topWidth * scale;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            // Symmetrical gore polygon shape
            const dStr = `M ${cx - tw/2} ${cy - gh/2} 
                          L ${cx + tw/2} ${cy - gh/2} 
                          L ${cx + bw/2} ${cy + gh/2} 
                          L ${cx - bw/2} ${cy + gh/2} Z`;
            
            path.setAttribute('d', dStr);
            path.setAttribute('fill', 'rgba(56, 189, 248, 0.15)');
            path.setAttribute('stroke', '#38bdf8');
            path.setAttribute('stroke-width', '2');
            goreGroup.appendChild(path);

            // Centerline construction mark
            const centerLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            centerLine.setAttribute('x1', cx);
            centerLine.setAttribute('y1', cy - gh/2);
            centerLine.setAttribute('x2', cx);
            centerLine.setAttribute('y2', cy + gh/2);
            centerLine.setAttribute('stroke', '#f43f5e');
            centerLine.setAttribute('stroke-width', '1');
            centerLine.setAttribute('stroke-dasharray', '5,5');
            goreGroup.appendChild(centerLine);

            svg.appendChild(goreGroup);

            outputs.blueprintMeta.innerHTML = `<span>Gore Template &bull; Qty: ${gores} panels</span><span>Base Width: ${(bottomWidth*1000).toFixed(0)}mm &bull; Height: ${(goreHeight*1000).toFixed(0)}mm</span>`;
        }
    }

    function renderCutList(dia, area, gores, ventPct, fabricKgM2, totalArea) {
        const tbody = outputs.cutListTableBody;
        tbody.innerHTML = '';

        const goreHeightM = (Math.PI * dia) / 2;
        const bottomWidthM = (Math.PI * dia) / gores;
        const topWidthM = bottomWidthM * (ventPct / 100);
        const lineLengthM = dia * 1.1;
        const totalLinesLength = lineLengthM * gores;
        const fabricWeightTotal = totalArea * fabricKgM2;

        const items = [
            {
                comp: 'Canopy Panels (Gores)',
                dims: `Top: ${(topWidthM*1000).toFixed(0)}mm, Base: ${(bottomWidthM*1000).toFixed(0)}mm, H: ${(goreHeightM*1000).toFixed(0)}mm`,
                qty: gores,
                notes: 'Includes 15mm seam allowance on all edges'
            },
            {
                comp: 'Suspension Shroud Lines',
                dims: `Length: ${(lineLengthM*1000).toFixed(0)}mm each`,
                qty: gores,
                notes: 'Kevlar / Spectra braid (min 2x peak load rating)'
            },
            {
                comp: 'Apex Vent Reinforcement',
                dims: `Diameter: ${(dia * (ventPct/100) * 1000).toFixed(0)}mm ring`,
                qty: 1,
                notes: 'Webbing tape reinforcement around vent edge'
            },
            {
                comp: 'Bridle / Apex Attachment',
                dims: `Length: ${(dia * 0.75).toFixed(0)}m`,
                qty: 1,
                notes: 'Heavy duty nylon webbing strap'
            },
            {
                comp: 'Total Canopy Fabric Mass',
                dims: `Area: ${totalArea.toFixed(2)} $m^2$`,
                qty: '1 Batch',
                notes: `Estimated fabric mass: ~${(fabricWeightTotal * 1000).toFixed(0)} grams`
            }
        ];

        items.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${item.comp}</strong></td>
                <td>${item.dims}</td>
                <td>${item.qty}</td>
                <td>${item.notes}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function exportJson() {
        const data = {
            tool: "AeroStitch Parachute Designer",
            version: "1.0",
            timestamp: new Date().toISOString(),
            parameters: {
                payloadMassKg: parseFloat(inputs.payloadMass.value),
                targetSpeedMs: parseFloat(inputs.targetSpeed.value),
                canopyType: inputs.canopyType.value,
                dragCoefficient: parseFloat(inputs.dragCoeff.value),
                goreCount: parseInt(inputs.goreCount.value),
                airDensity: parseFloat(inputs.airDensity.value),
                safetyFactor: parseFloat(inputs.safetyFactor.value),
                ventRatioPct: parseFloat(inputs.ventRatio.value)
            },
            results: {
                nominalDiameterM: parseFloat(outputs.resDiameter.textContent),
                surfaceAreaM2: parseFloat(outputs.resArea.textContent),
                peakForceN: outputs.resForce.textContent,
                estimatedYardageM: parseFloat(outputs.resYardage.textContent)
            }
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aerostitch-blueprint-${inputs.canopyType.value}-${outputs.resDiameter.textContent}m.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Initial calculation on load
    calculateAndRender();
});
