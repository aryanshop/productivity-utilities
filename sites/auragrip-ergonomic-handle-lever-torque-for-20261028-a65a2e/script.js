document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const mechTypeSelect = document.getElementById('mechanism-type');
    const appliedForceInput = document.getElementById('applied-force');
    const valForce = document.getElementById('val-force');
    const leverLengthInput = document.getElementById('lever-length');
    const valLength = document.getElementById('val-length');
    const gripDiameterInput = document.getElementById('grip-diameter');
    const valDiam = document.getElementById('val-diam');
    const operatingAngleInput = document.getElementById('operating-angle');
    const valAngle = document.getElementById('val-angle');
    const surfaceFrictionInput = document.getElementById('surface-friction');
    const unitSystemSelect = document.getElementById('unit-system');
    const userStrengthTierSelect = document.getElementById('user-strength-tier');

    // Unit label spans
    const unitForceLbl = document.getElementById('unit-force-lbl');
    const unitLengthLbl = document.getElementById('unit-length-lbl');
    const unitDiamLbl = document.getElementById('unit-diam-lbl');
    const unitTorque = document.getElementById('unit-torque');

    // Metric outputs
    const resTorque = document.getElementById('res-torque');
    const resAdvantage = document.getElementById('res-advantage');
    const resComfort = document.getElementById('res-comfort');
    const resComfortSub = document.getElementById('res-comfort-sub');
    const resFatigue = document.getElementById('res-fatigue');
    const resFatiguePct = document.getElementById('res-fatigue-pct');
    const badgeMech = document.getElementById('badge-mech');
    const adviceContent = document.getElementById('advice-content');
    const blueprintGroup = document.getElementById('blueprint-group');

    // Action buttons
    const btnReset = document.getElementById('btn-reset');
    const btnExport = document.getElementById('btn-export');

    // State conversion factors
    let isImperial = false;

    function updateUnits() {
        isImperial = (unitSystemSelect.value === 'imperial');
        if (isImperial) {
            unitForceLbl.textContent = 'lbf';
            unitLengthLbl.textContent = 'in';
            unitDiamLbl.textContent = 'in';
            unitTorque.textContent = 'lbf·in';
            // Adjust min/max/steps and convert values roughly or reset
            appliedForceInput.min = '2';
            appliedForceInput.max = '110';
            appliedForceInput.step = '1';
            if (parseInt(appliedForceInput.value) > 110) appliedForceInput.value = 25;

            leverLengthInput.min = '1';
            leverLengthInput.max = '32';
            leverLengthInput.step = '0.5';
            if (parseFloat(leverLengthInput.value) > 32) leverLengthInput.value = 10;

            gripDiameterInput.min = '0.4';
            gripDiameterInput.max = '4.5';
            gripDiameterInput.step = '0.1';
            if (parseFloat(gripDiameterInput.value) > 4.5) gripDiameterInput.value = 1.4;
        } else {
            unitForceLbl.textContent = 'N';
            unitLengthLbl.textContent = 'mm';
            unitDiamLbl.textContent = 'mm';
            unitTorque.textContent = 'Nm';

            appliedForceInput.min = '10';
            appliedForceInput.max = '500';
            appliedForceInput.step = '5';
            if (parseInt(appliedForceInput.value) < 10) appliedForceInput.value = 120;

            leverLengthInput.min = '30';
            leverLengthInput.max = '800';
            leverLengthInput.step = '10';
            if (parseInt(leverLengthInput.value) < 30) leverLengthInput.value = 250;

            gripDiameterInput.min = '10';
            gripDiameterInput.max = '120';
            gripDiameterInput.step = '2';
            if (parseInt(gripDiameterInput.value) < 10) gripDiameterInput.value = 35;
        }
        calculate();
    }

    function calculate() {
        let force = parseFloat(appliedForceInput.value) || 0;
        let length = parseFloat(leverLengthInput.value) || 0;
        let diam = parseFloat(gripDiameterInput.value) || 0;
        let angle = parseFloat(operatingAngleInput.value) || 0;
        let friction = parseFloat(surfaceFrictionInput.value) || 0.4;
        let strengthTier = parseInt(userStrengthTierSelect.value) || 50;
        let mech = mechTypeSelect.value;

        // Convert imperial to metric for internal physics calculation if needed
        let forceMetric = isImperial ? force * 4.44822 : force;
        let lengthMetric = isImperial ? length * 25.4 : length;
        let diamMetric = isImperial ? diam * 25.4 : diam;

        // Torque Calculation: T = F * r * sin(angle)
        // For straight lever, angle factor is sin(angle in rad)
        let angleRad = (angle * Math.PI) / 180;
        let effectiveLength = lengthMetric * Math.sin(angleRad > 0 ? angleRad : Math.PI / 2);
        let torqueNm = (forceMetric * effectiveLength) / 1000; // Nm
        let torqueDisplay = isImperial ? torqueNm * 8.85075 : torqueNm; // lbf-in or Nm

        // Mechanical Advantage estimate relative to standard human finger pinch/grip baseline (approx 50N reference)
        let mechAdvantage = (lengthMetric / (diamMetric / 2)).toFixed(1);

        // Grip comfort analysis (ISO 11228-3 guidelines: optimal cylinder diameter 30-40mm for power grip)
        let comfortText = "Optimal";
        let comfortSub = "ISO 11228-3 Compliant";
        let comfortClass = "success";
        
        if (diamMetric < 20) {
            comfortText = "Too Thin";
            comfortSub = "High localized finger strain";
            comfortClass = "warning";
        } else if (diamMetric > 55 && mech !== 'crank') {
            comfortText = "Too Wide";
            comfortSub = "Reduced palm contact area";
            comfortClass = "warning";
        } else if (diamMetric >= 30 && diamMetric <= 42) {
            comfortText = "Ideal Span";
            comfortSub = "Max power grip efficiency";
            comfortClass = "success";
        }

        // Fatigue & Strength Threshold comparison
        // Maximum recommended continuous actuation force based on percentiles
        let maxRecommendedForce = strengthTier === 5 ? 75 : strengthTier === 50 ? 150 : 250; // in Newtons
        let forceRatio = (forceMetric / maxRecommendedForce) * 100;
        let fatigueText = "Low";
        if (forceRatio > 85) {
            fatigueText = "Critical";
        } else if (forceRatio > 60) {
            fatigueText = "Moderate";
        } else if (forceRatio > 35) {
            fatigueText = "Acceptable";
        }

        // Update UI Text
        valForce.textContent = force + (isImperial ? ' lbf' : ' N');
        valLength.textContent = length + (isImperial ? ' in' : ' mm');
        valDiam.textContent = diam + (isImperial ? ' in' : ' mm');
        valAngle.textContent = angle + '°';

        resTorque.textContent = torqueDisplay.toFixed(1);
        resAdvantage.textContent = mechAdvantage;
        resComfort.textContent = comfortText;
        resComfortSub.textContent = comfortSub;
        resFatigue.textContent = fatigueText;
        resFatiguePct.textContent = Math.round(forceRatio) + '% Capacity';

        badgeMech.textContent = mechTypeSelect.options[mechTypeSelect.selectedIndex].text;

        // Generate Advice HTML
        let adviceHTML = '';
        
        if (forceRatio > 80) {
            adviceHTML += `<div class="advice-item danger">
                <strong>High Exertion Warning:</strong> The applied force (${force} ${isImperial ? 'lbf' : 'N'}) exceeds 80% of the selected operator profile's sustainable threshold. Consider increasing the lever arm length to reduce required force.
            </div>`;
        } else {
            adviceHTML += `<div class="advice-item success">
                <strong>Force Within Safe Limits:</strong> Actuation force is well within ergonomic fatigue guidelines for frequent repetitive tasks.
            </div>`;
        }

        if (diamMetric < 25 && mech !== 'crank') {
            adviceHTML += `<div class="advice-item warning">
                <strong>Grip Ergonomics:</strong> A grip diameter below 25mm causes finger overlapping and concentrated contact pressure on digital phalanges. Increase grip thickness.
            </div>`;
        } else if (mech === 'lever' && lengthMetric < 100) {
            adviceHTML += `<div class="advice-item warning">
                <strong>Short Lever Arm:</strong> Lever length is compact, resulting in low mechanical advantage. Ensure high force application is intentional.
            </div>`;
        } else {
            adviceHTML += `<div class="advice-item">
                <strong>Mechanical Efficiency:</strong> Surface friction coefficient (µ = ${friction}) provides adequate non-slip tactile coupling with standard elastomer or knurled metallic finishes.
            </div>`;
        }

        adviceContent.innerHTML = adviceHTML;

        // Render SVG Schematic Blueprint
        renderBlueprint(mech, lengthMetric, diamMetric, angle);
    }

    function renderBlueprint(mech, length, diam, angle) {
        // Normalize dimensions for SVG canvas (Width: 500, Height: 280, Center: 250, 140)
        let cx = 150;
        let cy = 140;
        let maxLenPx = 180;
        let scalePxPerMm = maxLenPx / 500; // visual scaling
        let armLenPx = Math.min(200, Math.max(60, length * 0.4));
        let knobRadius = Math.min(30, Math.max(8, diam * 0.6));

        let svgHTML = '';

        if (mech === 'lever') {
            // Pivot point at (150, 140)
            let angleRad = (angle * Math.PI) / 180;
            let endX = cx + armLenPx * Math.cos(angleRad);
            let endY = cy - armLenPx * Math.sin(angleRad);

            svgHTML += `
                <!-- Pivot Mount -->
                <circle cx="${cx}" cy="${cy}" r="14" fill="#1e293b" stroke="#38bdf8" stroke-width="2" />
                <circle cx="${cx}" cy="${cy}" r="4" fill="#38bdf8" />
                
                <!-- Lever Arm -->
                <line x1="${cx}" y1="${cy}" x2="${endX}" y2="${endY}" stroke="#94a3b8" stroke-width="12" stroke-linecap="round" />
                <line x1="${cx}" y1="${cy}" x2="${endX}" y2="${endY}" stroke="#38bdf8" stroke-width="4" stroke-linecap="round" stroke-dasharray="4 4" />

                <!-- Handle Grip Knob -->
                <circle cx="${endX}" cy="${endY}" r="${knobRadius}" fill="#141b2d" stroke="#38bdf8" stroke-width="2.5" />
                <circle cx="${endX}" cy="${endY}" r="4" fill="#38bdf8" />

                <!-- Force Vector Arrow -->
                <path d="M ${endX} ${endY - 45} L ${endX} ${endY - 5} M ${endX - 5} ${endY - 15} L ${endX} ${endY - 5} L ${endX + 5} ${endY - 15}" stroke="#34d399" stroke-width="2.5" />
                <text x="${endX + 10}" y="${endY - 25}" fill="#34d399" font-size="12" font-weight="bold">Force (F)</text>

                <!-- Dimension Callout: Length -->
                <line x1="${cx}" y1="${cy + 35}" x2="${endX}" y2="${cy + 35}" stroke="#64748b" stroke-width="1" stroke-dasharray="2 2" />
                <text x="${(cx + endX) / 2}" y="${cy + 52}" fill="#94a3b8" font-size="11" text-anchor="middle">L = ${leverLengthInput.value} ${unitLengthLbl.textContent}</text>
            `;
        } else if (mech === 'crank') {
            // Handwheel Crank
            let radius = Math.min(90, Math.max(40, length * 0.35));
            let knobAngleRad = (angle * Math.PI) / 180;
            let knobX = cx + radius * Math.cos(knobAngleRad);
            let knobY = cy - radius * Math.sin(knobAngleRad);

            svgHTML += `
                <!-- Center Hub -->
                <circle cx="${cx}" cy="${cy}" r="20" fill="#1e293b" stroke="#38bdf8" stroke-width="2" />
                <circle cx="${cx}" cy="${cy}" r="5" fill="#38bdf8" />

                <!-- Wheel Rim -->
                <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#64748b" stroke-width="6" />
                <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="6 6" />

                <!-- Crank Spoke -->
                <line x1="${cx}" y1="${cy}" x2="${knobX}" y2="${knobY}" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" />

                <!-- Revolving Handle Knob -->
                <circle cx="${knobX}" cy="${knobY}" r="${knobRadius}" fill="#141b2d" stroke="#34d399" stroke-width="2.5" />
                <circle cx="${knobX}" cy="${knobY}" r="3" fill="#34d399" />
                <text x="${knobX + 15}" y="${knobY - 10}" fill="#34d399" font-size="11" font-weight="bold">Crank Grip</text>
            `;
        } else if (mech === 'plier') {
            // Pliers / Pinch Grips
            svgHTML += `
                <!-- Pivot Pin -->
                <circle cx="${cx + 40}" cy="${cy}" r="8" fill="#38bdf8" />

                <!-- Upper Handle -->
                <path d="M ${cx + 40} ${cy} Q ${cx - 50} ${cy - 50}, ${cx - 120} ${cy - 40}" fill="none" stroke="#94a3b8" stroke-width="14" stroke-linecap="round" />
                <!-- Lower Handle -->
                <path d="M ${cx + 40} ${cy} Q ${cx - 50} ${cy + 50}, ${cx - 120} ${cy + 40}" fill="none" stroke="#94a3b8" stroke-width="14" stroke-linecap="round" />

                <!-- Grip span dimension line -->
                <line x1="${cx - 120}" y1="${cy - 38}" x2="${cx - 120}" y2="${cy + 38}" stroke="#34d399" stroke-width="1.5" stroke-dasharray="2 2" />
                <text x="${cx - 130}" y="${cy + 4}" fill="#34d399" font-size="11" text-anchor="end">Span</text>
            `;
        } else {
            // Knob
            let knobR = Math.min(70, Math.max(30, diam));
            svgHTML += `
                <circle cx="${cx}" cy="${cy}" r="${knobR}" fill="#1e293b" stroke="#38bdf8" stroke-width="3" />
                <circle cx="${cx}" cy="${cy}" r="${knobR - 12}" fill="#141b2d" stroke="#64748b" stroke-width="1" />
                <line x1="${cx}" y1="${cy}" x2="${cx + knobR - 10}" y2="${cy}" stroke="#34d399" stroke-width="3" stroke-linecap="round" />
                <circle cx="${cx}" cy="${cy}" r="6" fill="#38bdf8" />
                <text x="${cx}" y="${cy + knobR + 20}" fill="#94a3b8" font-size="11" text-anchor="middle">Diameter: ${diam} ${unitDiamLbl.textContent}</text>
            `;
        }

        blueprintGroup.innerHTML = svgHTML;
    }

    // Event Listeners
    unitSystemSelect.addEventListener('change', updateUnits);
    mechTypeSelect.addEventListener('change', calculate);
    appliedForceInput.addEventListener('input', calculate);
    leverLengthInput.addEventListener('input', calculate);
    gripDiameterInput.addEventListener('input', calculate);
    operatingAngleInput.addEventListener('input', calculate);
    surfaceFrictionInput.addEventListener('input', calculate);
    userStrengthTierSelect.addEventListener('change', calculate);

    btnReset.addEventListener('click', () => {
        mechTypeSelect.value = 'lever';
        unitSystemSelect.value = 'metric';
        updateUnits();
        appliedForceInput.value = 120;
        leverLengthInput.value = 250;
        gripDiameterInput.value = 35;
        operatingAngleInput.value = 90;
        surfaceFrictionInput.value = 0.45;
        userStrengthTierSelect.value = '50';
        calculate();
    });

    btnExport.addEventListener('click', () => {
        const data = {
            app: "AuraGrip",
            timestamp: new Date().toISOString(),
            mechanism: mechTypeSelect.value,
            unitSystem: unitSystemSelect.value,
            appliedForce: appliedForceInput.value,
            leverLength: leverLengthInput.value,
            gripDiameter: gripDiameterInput.value,
            operatingAngle: operatingAngleInput.value,
            surfaceFriction: surfaceFrictionInput.value,
            calculatedTorque: resTorque.textContent + ' ' + unitTorque.textContent,
            mechanicalAdvantage: resAdvantage.textContent,
            comfortRating: resComfort.textContent,
            fatigueIndex: resFatigue.textContent
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `AuraGrip-report-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // Initial calculation run
    updateUnits();
});
