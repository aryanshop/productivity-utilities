document.addEventListener('DOMContentLoaded', () => {
    // Material database presets (R-value per inch, and vapor perm ratings)
    const materialPresets = [
        { name: 'Exterior Air Film (Winter)', rPerInch: 0, fixedR: 0.17, perm: 999 },
        { name: 'Interior Air Film', rPerInch: 0, fixedR: 0.68, perm: 999 },
        { name: 'Drywall (Gypsum Board)', rPerInch: 0.90, fixedR: 0, perm: 50 },
        { name: 'Fiberglass Batt Insulation', rPerInch: 3.14, fixedR: 0, perm: 60 },
        { name: 'Mineral Wool Insulation', rPerInch: 3.30, fixedR: 0, perm: 30 },
        { name: 'Expanded Polystyrene (EPS)', rPerInch: 4.00, fixedR: 0, perm: 2.0 },
        { name: 'Extruded Polystyrene (XPS)', rPerInch: 5.00, fixedR: 0, perm: 1.1 },
        { name: 'Polyisocyanurate Foam', rPerInch: 6.50, fixedR: 0, perm: 0.8 },
        { name: 'OSB Sheathing (7/16")', rPerInch: 1.40, fixedR: 0.62, perm: 0.7 },
        { name: 'Plywood (1/2")', rPerInch: 1.25, fixedR: 0.62, perm: 1.5 },
        { name: 'Polyethylene Vapor Barrier (6 mil)', rPerInch: 0, fixedR: 0.06, perm: 0.06 },
        { name: 'Brick Veneer (4")', rPerInch: 0.11, fixedR: 0.44, perm: 1.9 },
        { name: 'Concrete Wall (8")', rPerInch: 0.08, fixedR: 0.64, perm: 1.0 },
        { name: 'Custom Layer', rPerInch: 1.0, fixedR: 0, perm: 10 }
    ];

    // State for layers
    let layers = [
        { name: 'Interior Air Film', thickness: 1, rPerInch: 0, fixedR: 0.68, perm: 999 },
        { name: 'Drywall (Gypsum Board)', thickness: 0.5, rPerInch: 0.90, fixedR: 0, perm: 50 },
        { name: 'Fiberglass Batt Insulation', thickness: 3.5, rPerInch: 3.14, fixedR: 0, perm: 60 },
        { name: 'OSB Sheathing (7/16")', thickness: 0.4375, rPerInch: 1.40, fixedR: 0.62, perm: 0.7 },
        { name: 'Exterior Air Film (Winter)', thickness: 1, rPerInch: 0, fixedR: 0.17, perm: 999 }
    ];

    // DOM Elements
    const indoorTempInput = document.getElementById('indoorTemp');
    const indoorRHInput = document.getElementById('indoorRH');
    const outdoorTempInput = document.getElementById('outdoorTemp');
    const outdoorRHInput = document.getElementById('outdoorRH');
    const layersContainer = document.getElementById('layersContainer');
    const addLayerBtn = document.getElementById('addLayerBtn');
    const presetStandardBtn = document.getElementById('presetStandardBtn');
    const presetExtInsBtn = document.getElementById('presetExtInsBtn');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    
    const totalRValueEl = document.getElementById('totalRValue');
    const totalUFactorEl = document.getElementById('totalUFactor');
    const condRiskStatusEl = document.getElementById('condRiskStatus');
    const condRiskDescEl = document.getElementById('condRiskDesc');
    const condRiskBox = document.getElementById('condRiskBox');
    const layerTableBody = document.querySelector('#layerTable tbody');
    const gradientCanvas = document.getElementById('gradientCanvas');

    // Initialize UI
    function init() {
        renderLayers();
        calculateAndRender();

        // Event listeners
        [indoorTempInput, indoorRHInput, outdoorTempInput, outdoorRHInput].forEach(input => {
            if (input) input.addEventListener('input', calculateAndRender);
        });

        if (addLayerBtn) {
            addLayerBtn.addEventListener('click', () => {
                layers.push({ name: 'Fiberglass Batt Insulation', thickness: 3.5, rPerInch: 3.14, fixedR: 0, perm: 60 });
                renderLayers();
                calculateAndRender();
            });
        }

        if (presetStandardBtn) {
            presetStandardBtn.addEventListener('click', () => {
                layers = [
                    { name: 'Interior Air Film', thickness: 1, rPerInch: 0, fixedR: 0.68, perm: 999 },
                    { name: 'Drywall (Gypsum Board)', thickness: 0.5, rPerInch: 0.90, fixedR: 0, perm: 50 },
                    { name: 'Polyethylene Vapor Barrier (6 mil)', thickness: 0.1, rPerInch: 0, fixedR: 0.06, perm: 0.06 },
                    { name: 'Fiberglass Batt Insulation', thickness: 3.5, rPerInch: 3.14, fixedR: 0, perm: 60 },
                    { name: 'OSB Sheathing (7/16")', thickness: 0.4375, rPerInch: 1.40, fixedR: 0.62, perm: 0.7 },
                    { name: 'Exterior Air Film (Winter)', thickness: 1, rPerInch: 0, fixedR: 0.17, perm: 999 }
                ];
                renderLayers();
                calculateAndRender();
            });
        }

        if (presetExtInsBtn) {
            presetExtInsBtn.addEventListener('click', () => {
                layers = [
                    { name: 'Interior Air Film', thickness: 1, rPerInch: 0, fixedR: 0.68, perm: 999 },
                    { name: 'Drywall (Gypsum Board)', thickness: 0.5, rPerInch: 0.90, fixedR: 0, perm: 50 },
                    { name: 'Mineral Wool Insulation', thickness: 3.5, rPerInch: 3.30, fixedR: 0, perm: 30 },
                    { name: 'Extruded Polystyrene (XPS)', thickness: 1.5, rPerInch: 5.00, fixedR: 0, perm: 1.1 },
                    { name: 'Exterior Air Film (Winter)', thickness: 1, rPerInch: 0, fixedR: 0.17, perm: 999 }
                ];
                renderLayers();
                calculateAndRender();
            });
        }

        if (exportJsonBtn) {
            exportJsonBtn.addEventListener('click', exportReportJson);
        }
    }

    function renderLayers() {
        if (!layersContainer) return;
        layersContainer.innerHTML = '';

        layers.forEach((layer, index) => {
            const card = document.createElement('div');
            card.className = 'layer-card';

            // Build material options HTML
            let optionsHtml = '';
            materialPresets.forEach(preset => {
                const selected = preset.name === layer.name ? 'selected' : '';
                optionsHtml += `<option value="${preset.name}" ${selected}>${preset.name}</option>`;
            });

            card.innerHTML = `
                <div class="layer-row">
                    <select class="layer-preset-select" data-index="${index}">
                        ${optionsHtml}
                    </select>
                    <div class="input-group" style="margin:0;">
                        <label style="font-size:0.7rem;">Thickness (in)</label>
                        <input type="number" class="layer-thick-input" data-index="${index}" value="${layer.thickness}" step="0.125" min="0">
                    </div>
                    <button class="btn-danger-icon" data-index="${index}" title="Remove Layer">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
                <div class="layer-details-row">
                    <div class="input-group">
                        <label style="font-size:0.7rem;">R-Value per inch</label>
                        <input type="number" class="layer-r-input" data-index="${index}" value="${layer.rPerInch}" step="0.1" min="0">
                    </div>
                    <div class="input-group">
                        <label style="font-size:0.7rem;">Vapor Perm (Perms)</label>
                        <input type="number" class="layer-perm-input" data-index="${index}" value="${layer.perm}" step="0.1" min="0">
                    </div>
                </div>
            `;
            layersContainer.appendChild(card);
        });

        // Bind inputs inside layers
        layersContainer.querySelectorAll('.layer-preset-select').forEach(sel => {
            sel.addEventListener('change', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                const selectedName = e.target.value;
                const preset = materialPresets.find(p => p.name === selectedName);
                if (preset) {
                    layers[idx].name = preset.name;
                    layers[idx].rPerInch = preset.rPerInch;
                    layers[idx].fixedR = preset.fixedR || 0;
                    layers[idx].perm = preset.perm;
                    if (preset.fixedR > 0 && preset.rPerInch === 0) {
                        layers[idx].thickness = 1;
                    }
                    renderLayers();
                    calculateAndRender();
                }
            });
        });

        layersContainer.querySelectorAll('.layer-thick-input').forEach(inp => {
            inp.addEventListener('input', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                layers[idx].thickness = parseFloat(e.target.value) || 0;
                calculateAndRender();
            });
        });

        layersContainer.querySelectorAll('.layer-r-input').forEach(inp => {
            inp.addEventListener('input', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                layers[idx].rPerInch = parseFloat(e.target.value) || 0;
                calculateAndRender();
            });
        });

        layersContainer.querySelectorAll('.layer-perm-input').forEach(inp => {
            inp.addEventListener('input', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                layers[idx].perm = parseFloat(e.target.value) || 0;
                calculateAndRender();
            });
        });

        layersContainer.querySelectorAll('.btn-danger-icon').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                layers.splice(idx, 1);
                renderLayers();
                calculateAndRender();
            });
        });
    }

    // Dew point calculation function using Magnus formula approximation
    function calculateDewPoint(tempF, rhPercent) {
        const tempC = (tempF - 32) * 5 / 9;
        const a = 17.27;
        const b = 237.7;
        const alpha = ((a * tempC) / (b + tempC)) + Math.log(rhPercent / 100);
        const dewPointC = (b * alpha) / (a - alpha);
        const dewPointF = (dewPointC * 9 / 5) + 32;
        return dewPointF;
    }

    function calculateAndRender() {
        const indoorTemp = parseFloat(indoorTempInput.value) || 70;
        const indoorRH = parseFloat(indoorRHInput.value) || 40;
        const outdoorTemp = parseFloat(outdoorTempInput.value) || 20;
        const outdoorRH = parseFloat(outdoorRHInput.value) || 70;

        const indoorDewPoint = calculateDewPoint(indoorTemp, indoorRH);

        // Compute R-values for each layer
        let totalR = 0;
        const layerCalcs = layers.map(layer => {
            const rValue = (layer.thickness * layer.rPerInch) + (layer.fixedR || 0);
            totalR += rValue;
            return {
                ...layer,
                rValue
            };
        });

        const uFactor = totalR > 0 ? (1 / totalR) : 0;

        if (totalRValueEl) totalRValueEl.textContent = totalR.toFixed(2);
        if (totalUFactorEl) totalUFactorEl.textContent = uFactor.toFixed(3);

        // Temperature drop across layers
        const tempDiff = indoorTemp - outdoorTemp;
        let cumulativeR = 0;
        let currentTemp = indoorTemp;

        const detailedLayers = layerCalcs.map((layer, index) => {
            const startTemp = currentTemp;
            cumulativeR += layer.rValue;
            const drop = totalR > 0 ? tempDiff * (layer.rValue / totalR) : 0;
            currentTemp -= drop;
            const endTemp = currentTemp;

            // Approximate dew point at layer interface based on indoor moisture condition
            // In real building physics, vapor pressure drop depends on permeance.
            const dp = indoorDewPoint;
            const isCondensing = endTemp <= dp;

            return {
                ...layer,
                startTemp,
                endTemp,
                dewPoint: dp,
                isCondensing
            };
        });

        // Check risk
        let hasCondensation = detailedLayers.some(l => l.isCondensing);
        if (condRiskStatusEl && condRiskDescEl && condRiskBox) {
            if (hasCondensation) {
                condRiskStatusEl.textContent = 'HIGH RISK';
                condRiskStatusEl.style.color = 'var(--accent-rose)';
                condRiskDescEl.textContent = 'Intersects dew point temperature';
                condRiskBox.style.borderColor = 'var(--accent-rose)';
            } else {
                condRiskStatusEl.textContent = 'SAFE';
                condRiskStatusEl.style.color = 'var(--accent-emerald)';
                condRiskDescEl.textContent = 'No condensation point reached';
                condRiskBox.style.borderColor = 'var(--border-color)';
            }
        }

        // Render Table
        if (layerTableBody) {
            layerTableBody.innerHTML = '';
            detailedLayers.forEach(l => {
                const tr = document.createElement('tr');
                let statusBadge = '<span class="badge badge-success">Safe</span>';
                if (l.isCondensing) {
                    statusBadge = '<span class="badge badge-danger">Condensation Risk</span>';
                }
                tr.innerHTML = `
                    <td><strong>${l.name}</strong></td>
                    <td>${l.thickness}</td>
                    <td>${l.rValue.toFixed(2)}</td>
                    <td>${l.endTemp.toFixed(1)}°F</td>
                    <td>${l.dewPoint.toFixed(1)}°F</td>
                    <td>${statusBadge}</td>
                `;
                layerTableBody.appendChild(tr);
            });
        }

        // Render Canvas Graph
        renderCanvas(detailedLayers, indoorTemp, outdoorTemp, indoorDewPoint);
    }

    function renderCanvas(layersData, indoorT, outdoorT, dewPointF) {
        if (!gradientCanvas) return;
        const ctx = gradientCanvas.getContext('2d');
        const width = gradientCanvas.width;
        const height = gradientCanvas.height;

        ctx.clearRect(0, 0, width, height);

        if (layersData.length === 0) return;

        const padding = 40;
        const graphWidth = width - padding * 2;
        const graphHeight = height - padding * 2;

        // Temperature bounds for Y-axis
        const allTemps = [indoorT, outdoorT, dewPointF];
        layersData.forEach(l => allTemps.push(l.startTemp, l.endTemp));
        const minTemp = Math.floor(Math.min(...allTemps) - 10);
        const maxTemp = Math.ceil(Math.max(...allTemps) + 10);

        function tempToY(t) {
            return height - padding - ((t - minTemp) / (maxTemp - minTemp)) * graphHeight;
        }

        // Draw background grid
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px sans-serif';

        for (let t = Math.ceil(minTemp / 10) * 10; t <= maxTemp; t += 10) {
            const y = tempToY(t);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
            ctx.fillText(t + '°F', padding - 32, y + 4);
        }

        // Draw layers horizontal partitions
        const totalThickness = layersData.reduce((sum, l) => sum + l.thickness, 0) || 1;
        let currentX = padding;

        // Draw Dew Point Constant Line
        const dpY = tempToY(dewPointF);
        ctx.strokeStyle = '#fbbf24';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, dpY);
        ctx.lineTo(width - padding, dpY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Temperature Profile Line
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();

        let points = [];
        layersData.forEach((l, idx) => {
            const layerPixelWidth = (l.thickness / totalThickness) * graphWidth;
            if (idx === 0) {
                points.push({ x: currentX, y: tempToY(l.startTemp) });
            }
            currentX += layerPixelWidth;
            points.push({ x: currentX, y: tempToY(l.endTemp) });
        });

        points.forEach((pt, i) => {
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();

        // Draw points and boundaries
        currentX = padding;
        layersData.forEach((l, idx) => {
            const layerPixelWidth = (l.thickness / totalThickness) * graphWidth;
            
            // Layer separator line
            if (idx > 0) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(currentX, padding);
                ctx.lineTo(currentX, height - padding);
                ctx.stroke();
            }

            // Layer name label at top
            ctx.fillStyle = '#94a3b8';
            ctx.font = '9px sans-serif';
            ctx.save();
            ctx.translate(currentX + layerPixelWidth / 2, padding - 10);
            ctx.textAlign = 'center';
            // Truncate name if too long
            let displayName = l.name.length > 16 ? l.name.substring(0, 14) + '...' : l.name;
            ctx.fillText(displayName, 0, 0);
            ctx.restore();

            currentX += layerPixelWidth;
        });

        // Draw temperature coordinate dots
        points.forEach(pt => {
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    function exportReportJson() {
        const indoorTemp = parseFloat(indoorTempInput.value) || 70;
        const indoorRH = parseFloat(indoorRHInput.value) || 40;
        const outdoorTemp = parseFloat(outdoorTempInput.value) || 20;
        const outdoorRH = parseFloat(outdoorRHInput.value) || 70;

        const report = {
            app: "AuraVane Thermal Insulation & Vapor Barrier Laboratory",
            timestamp: new Date().toISOString(),
            conditions: { indoorTemp, indoorRH, outdoorTemp, outdoorRH },
            layers: layers
        };

        const dataStr = "data:text/json;charset=utf-8,"+ encodeURIComponent(JSON.stringify(report, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "auravane_thermal_report.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }

    init();
});
