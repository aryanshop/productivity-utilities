document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    const calcForm = document.getElementById('calc-form');
    const payloadMassInput = document.getElementById('payload-mass');
    const descentSpeedInput = document.getElementById('descent-speed');
    const canopyTypeSelect = document.getElementById('canopy-type');
    const goreCountSelect = document.getElementById('gore-count');
    const dragCoeffInput = document.getElementById('drag-coefficient');
    const airDensityInput = document.getElementById('air-density');
    const safetyFactorInput = document.getElementById('safety-factor');
    const resetDefaultsBtn = document.getElementById('reset-defaults');
    const goBlueprintBtn = document.getElementById('go-blueprint-btn');
    
    // Results Output Elements
    const resArea = document.getElementById('res-area');
    const resDiameter = document.getElementById('res-diameter');
    const resForce = document.getElementById('res-force');
    const resWeight = document.getElementById('res-weight');
    const resSummary = document.getElementById('res-summary');
    
    // Blueprint Elements
    const viewModeSelect = document.getElementById('view-mode');
    const specMaxWidth = document.getElementById('spec-max-width');
    const specGoreHeight = document.getElementById('spec-gore-height');
    const specVentDia = document.getElementById('spec-vent-dia');
    const specLineLen = document.getElementById('spec-line-len');
    const canopySvg = document.getElementById('canopy-svg');
    const exportSvgBtn = document.getElementById('export-svg-btn');
    
    // Cut List Elements
    const fabricTypeSelect = document.getElementById('fabric-type');
    const bomTbody = document.getElementById('bom-tbody');
    const printSummaryBtn = document.getElementById('print-summary-btn');

    // Default values mapping per canopy type
    const defaultCd = {
        'hemispherical': 0.75,
        'flat-circular': 1.50,
        'cruciform': 1.15,
        'annular': 0.80
    };

    // Fabric density specs (g/m²)
    const fabricSpecs = {
        'ripstop-silnylon-30d': { name: '30D Silnylon', density: 48 },
        'ripstop-nylon-70d': { name: '70D Ripstop Nylon', density: 75 },
        'poly-chiffon': { name: '1.1 oz Ripstop Polyester', density: 38 },
        'tyvek-1443r': { name: 'Tyvek 1443R', density: 42 }
    };

    // Tab Switching Logic
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`tab-${targetTab}`).classList.add('active');

            if (targetTab === 'blueprint') {
                updateBlueprint();
            } else if (targetTab === 'cutlist') {
                updateCutList();
            }
        });
    });

    if (goBlueprintBtn) {
        goBlueprintBtn.addEventListener('click', () => {
            document.querySelector('[data-tab="blueprint"]').click();
        });
    }

    // Canopy Type Change -> update default Cd
    canopyTypeSelect.addEventListener('change', () => {
        const type = canopyTypeSelect.value;
        if (defaultCd[type] !== undefined) {
            dragCoeffInput.value = defaultCd[type];
        }
        calculateMetrics();
    });

    // Reset Defaults
    resetDefaultsBtn.addEventListener('click', () => {
        payloadMassInput.value = 2.5;
        descentSpeedInput.value = 5.0;
        canopyTypeSelect.value = 'hemispherical';
        goreCountSelect.value = '8';
        dragCoeffInput.value = 0.75;
        airDensityInput.value = 1.225;
        safetyFactorInput.value = 2.0;
        calculateMetrics();
    });

    // Real-time calculation listeners
    [payloadMassInput, descentSpeedInput, goreCountSelect, dragCoeffInput, airDensityInput, safetyFactorInput].forEach(input => {
        input.addEventListener('input', calculateMetrics);
    });

    fabricTypeSelect.addEventListener('change', updateCutList);
    viewModeSelect.addEventListener('change', updateBlueprint);

    // Core Physics Calculations
    function getCalculatedData() {
        const m = parseFloat(payloadmass() || 2.5);
        const v = parseFloat(descentSpeedInput.value || 5.0);
        const cd = parseFloat(dragCoeffInput.value || 0.75);
        const rho = parseFloat(airDensityInput.value || 1.225);
        const sf = parseFloat(safetyFactorInput.value || 2.0);
        const gores = parseInt(goreCountSelect.value || 8, 10);

        const g = 9.81; // gravity
        const weightForce = m * g;
        const maxDynamicForce = weightForce * sf;

        // Aerodynamic Drag Formula: F = 0.5 * rho * v^2 * Cd * S  =>  S = (2 * m * g) / (rho * v^2 * Cd)
        const requiredArea = (2 * weightForce) / (rho * (v * v) * cd);
        
        // Nominal Diameter D_0 = sqrt((4 * S) / pi)
        const diameter = Math.sqrt((4 * requiredArea) / Math.PI);

        // Estimated fabric area including 15% waste/seam allowance
        const totalFabricArea = requiredArea * 1.15;

        return {
            mass: m,
            descentSpeed: v,
            cd: cd,
            rho: rho,
            safetyFactor: sf,
            gores: gores,
            weightForce: weightForce,
            maxDynamicForce: maxDynamicForce,
            requiredArea: requiredArea,
            diameter: diameter,
            totalFabricArea: totalFabricArea
        };
    }

    function payloadmass() {
        return payloadMassInput.value;
    }

    function calculateMetrics() {
        const data = getCalculatedData();

        resArea.textContent = data.requiredArea.toFixed(2);
        resDiameter.textContent = data.diameter.toFixed(2);
        resForce.textContent = data.maxDynamicForce.toFixed(1);

        // Fabric weight estimation based on default 30D silnylon
        const estWeightGrams = data.totalFabricArea * 48;
        resWeight.textContent = estWeightGrams.toFixed(0);

        // Generate dynamic engineering summary insight
        let rating = 'Optimal Performance';
        if (data.descentSpeed > 8) {
            rating = 'High-Speed Descent (Hard Landing Risk)';
        } else if (data.descentSpeed < 3) {
            rating = 'Ultra-Gentle Descent (Large Canopy Required)';
        }

        resSummary.innerHTML = `Designed for <strong>${data.mass} kg</strong> payload at <strong>${data.descentSpeed} m/s</strong> touchdown.<br>` +
            `Evaluated with a safety factor of <strong>${data.safetyFactor}x</strong>, peak tensile load on shroud lines is <strong>${data.maxDynamicForce.toFixed(1)} N</strong> (${(data.maxDynamicForce / 9.81).toFixed(1)} kg-equivalent). Status: <em>${rating}</em>.`;

        // Update live specs if blueprint tab is active
        updateBlueprintSpecs(data);
    }

    function updateBlueprintSpecs(data) {
        const radius = data.diameter / 2;
        const goreWidthMax = (Math.PI * data.diameter) / data.gores;
        const goreHeight = (Math.PI / 2) * radius;
        const ventDia = data.diameter * 0.08; // 8% apex vent
        const lineLen = data.diameter;

        specMaxWidth.textContent = `${(goreWidthMax * 100).toFixed(1)} cm`;
        specGoreHeight.textContent = `${(goreHeight * 100).toFixed(1)} cm`;
        specVentDia.textContent = `${(ventDia * 100).toFixed(1)} cm`;
        specLineLen.textContent = `${(lineLen * 100).toFixed(1)} cm`;
    }

    function updateBlueprint() {
        const data = getCalculatedData();
        updateBlueprintSpecs(data);
        
        const viewMode = viewModeSelect.value;
        canopySvg.innerHTML = '';

        if (viewMode === 'gore') {
            renderGoreTemplateSVG(data);
        } else {
            renderAssemblySVG(data);
        }
    }

    function renderGoreTemplateSVG(data) {
        const width = 600;
        const height = 500;
        
        // SVG Grid & Guidelines
        let svgContent = `
            <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="1"/>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="#080c14"/>
            <rect width="100%" height="100%" fill="url(#grid)"/>
        `;

        // Gore shape calculation (sinusoidal bell curve)
        const cx = width / 2;
        const topY = 60;
        const bottomY = 440;
        const hGorePx = bottomY - topY;
        
        const maxWVal = (Math.PI * data.diameter) / data.gores;
        const maxWpx = Math.min(180, (maxWVal * 100)); // scale factor
        const topWpx = maxWpx * 0.08; // vent opening at top

        // Construct smooth bezier curve for gore left and right boundaries
        // Left side: from (cx - topWpx/2, topY) to (cx - maxWpx/2, bottomY)
        // Right side: from (cx + topWpx/2, topY) to (cx + maxWpx/2, bottomY)
        svgContent += `
            <!-- Centerline -->
            <line x1="${cx}" y1="${topY - 20}" x2="${cx}" y2="${bottomY + 20}" stroke="#334155" stroke-dasharray="4 4" stroke-width="1.5" />
            
            <!-- Dimension markers -->
            <text x="${cx + 10}" y="${topY}" fill="#94a3b8" font-size="11">Apex Vent (Top)</text>
            <text x="${cx + maxWpx/2 + 10}" y="${bottomY}" fill="#94a3b8" font-size="11">Skirt Hem (Bottom)</text>
            <text x="${cx - 120}" y="${topY + 50}" fill="#38bdf8" font-size="12" font-weight="bold">Gore Panel #${data.gores} Req.</text>

            <!-- Gore Outline -->
            <path d="M ${cx - topWpx/2} ${topY} 
                     C ${cx - maxWpx*0.4} ${topY + hGorePx*0.4}, ${cx - maxWpx/2} ${topY + hGorePx*0.8}, ${cx - maxWpx/2} ${bottomY}
                     L ${cx + maxWpx/2} ${bottomY}
                     C ${cx + maxWpx/2} ${topY + hGorePx*0.8}, ${cx + maxWpx*0.4} ${topY + hGorePx*0.4}, ${cx + topWpx/2} ${topY}
                     Z" 
                  fill="rgba(56, 189, 248, 0.1)" stroke="#38bdf8" stroke-width="2.5" />

            <!-- Seam Allowance Outline (dashed) -->
            <path d="M ${cx - topWpx/2 - 8} ${topY} 
                     C ${cx - maxWpx*0.4 - 10} ${topY + hGorePx*0.4}, ${cx - maxWpx/2 - 12} ${topY + hGorePx*0.8}, ${cx - maxWpx/2 - 12} ${bottomY + 10}
                     L ${cx + maxWpx/2 + 12} ${bottomY + 10}
                     C ${cx + maxWpx/2 + 12} ${topY + hGorePx*0.8}, ${cx + maxWpx*0.4 + 10} ${topY + hGorePx*0.4}, ${cx + topWpx/2 + 8} ${topY}
                     Z" 
                  fill="none" stroke="#94a3b8" stroke-dasharray="3 3" stroke-width="1" />
            <text x="${cx + maxWpx/2 + 16}" y="${bottomY}" fill="#94a3b8" font-size="10">+1.5cm Seam</text>
        `;

        canopySvg.innerHTML = svgContent;
    }

    function renderAssemblySVG(data) {
        const width = 600;
        const height = 500;
        const cx = width / 2;
        const cy = 220;
        const r = 160;

        let svgContent = `
            <defs>
                <pattern id="grid2" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="1"/>
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="#080c14"/>
            <rect width="100%" height="100%" fill="url(#grid2)"/>

            <!-- Dome Circle -->
            <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8" stroke-width="2.5" />
            <circle cx="${cx}" cy="${cy}" r="${r * 0.15}" fill="#080c14" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="2 2" />

            <!-- Shroud Lines converging to payload -->
            <line x1="${cx - r}" y1="${cy}" x2="${cx}" y2="${cy + 220}" stroke="#94a3b8" stroke-width="1" />
            <line x1="${cx - r*0.7}" y1="${cy + Math.sqrt(r*r - (r*0.7)*(r*0.7))}" x2="${cx}" y2="${cy + 220}" stroke="#94a3b8" stroke-width="1" />
            <line x1="${cx}" y1="${cy + r}" x2="${cx}" y2="${cy + 220}" stroke="#94a3b8" stroke-width="1" />
            <line x1="${cx + r*0.7}" y1="${cy + Math.sqrt(r*r - (r*0.7)*(r*0.7))}" x2="${cx}" y2="${cy + 220}" stroke="#94a3b8" stroke-width="1" />
            <line x1="${cx + r}" y1="${cy}" x2="${cx}" y2="${cy + 220}" stroke="#94a3b8" stroke-width="1" />

            <!-- Payload Harness Box -->
            <rect x="${cx - 20}" y="${cy + 220}" width="40" height="35" rx="6" fill="#1e293b" stroke="#38bdf8" stroke-width="2" />
            <text x="${cx}" y="${cy + 242}" fill="#f8fafc" font-size="11" font-weight="bold" text-anchor="middle">Payload</text>

            <text x="${cx}" y="40" fill="#f8fafc" font-size="14" font-weight="bold" text-anchor="middle">Top-Down Fully Inflated Assembly Profile</text>
        `;

        canopySvg.innerHTML = svgContent;
    }

    // Export SVG File
    if (exportSvgBtn) {
        exportSvgBtn.addEventListener('click', () => {
            const svgData = canopySvg.outerHTML;
            const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `aerostitch-blueprint-${canopyTypeSelect.value}.svg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });
    }

    function updateCutList() {
        const data = getCalculatedData();
        const fabricKey = fabricTypeSelect.value;
        const fabricObj = fabricSpecs[fabricKey] || fabricSpecs['ripstop-silnylon-30d'];

        const goreWMax = (Math.PI * data.diameter) / data.gores;
        const goreHeight = (Math.PI / 2) * (data.diameter / 2);
        const totalArea = data.totalFabricArea;
        const estWeight = totalArea * fabricObj.density;

        let tbodyHtml = `
            <tr>
                <td><strong>Gore Panels (${data.gores}x)</strong></td>
                <td>${data.gores} panels</td>
                <td>Max W: ${(goreWMax*100).toFixed(1)} cm &times; H: ${(goreHeight*100).toFixed(1)} cm</td>
                <td>${(estWeight * 0.85).toFixed(0)} g</td>
            </tr>
            <tr>
                <td><strong>Apex Reinforcement Patch</strong></td>
                <td>1 disc</td>
                <td>Diameter: ${((data.diameter * 0.08) * 2 * 100).toFixed(1)} cm circle</td>
                <td>${(estWeight * 0.05).toFixed(0)} g</td>
            </tr>
            <tr>
                <td><strong>Shroud Lines (Kevlar/Spectra)</strong></td>
                <td>${data.gores} lines</td>
                <td>Length: ${(data.diameter * 100).toFixed(0)} cm each ($3\times$ safety)</td>
                <td>${(data.gores * 1.5).toFixed(0)} g</td>
            </tr>
            <tr>
                <td><strong>Bridle / Harness Loop</strong></td>
                <td>1 strap</td>
                <td>Length: 50 cm webbing</td>
                <td>12 g</td>
            </tr>
            <tr>
                <td><strong>Total Estimated Assembly</strong></td>
                <td><strong>Kit</strong></td>
                <td>Fabric: ${fabricObj.name} (${fabricObj.density} g/m²)</td>
                <td><strong>${(estWeight + (data.gores * 1.5) + 12).toFixed(0)} g</strong></td>
            </tr>
        `;

        bomTbody.innerHTML = tbodyHtml;
    }

    if (printSummaryBtn) {
        printSummaryBtn.addEventListener('click', () => {
            window.print();
        });
    }

    // Initial calculation on load
    calculateMetrics();
});
