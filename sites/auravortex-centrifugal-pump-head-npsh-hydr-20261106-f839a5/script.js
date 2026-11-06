document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const unitSystemEl = document.getElementById('unitSystem');
    const fluidTypeEl = document.getElementById('fluidType');
    const flowRateEl = document.getElementById('flowRate');
    const flowRateVal = document.getElementById('flowRateVal');
    const pipeDiameterEl = document.getElementById('pipeDiameter');
    const pipeMaterialEl = document.getElementById('pipeMaterial');
    const pipeLengthEl = document.getElementById('pipeLength');
    const pipeLengthVal = document.getElementById('pipeLengthVal');
    const staticLiftEl = document.getElementById('staticLift');
    const staticLiftVal = document.getElementById('staticLiftVal');
    const suctionHeadEl = document.getElementById('suctionHead');
    const suctionHeadVal = document.getElementById('suctionHeadVal');
    const fittingsCountEl = document.getElementById('fittingsCount');
    const fittingsCountVal = document.getElementById('fittingsCountVal');

    // Label spans for unit switching
    const unitFlowLabel = document.getElementById('unitFlowLabel');
    const unitLengthLabel = document.getElementById('unitLengthLabel');
    const unitLiftLabel = document.getElementById('unitLiftLabel');
    const unitSuctionLabel = document.getElementById('unitSuctionLabel');

    // Result metrics
    const resTDH = document.getElementById('resTDH');
    const resTDHSub = document.getElementById('resTDHSub');
    const resFriction = document.getElementById('resFriction');
    const resFrictionSub = document.getElementById('resFrictionSub');
    const resNPSHa = document.getElementById('resNPSHa');
    const resNPSHaSub = document.getElementById('resNPSHaSub');
    const resPower = document.getElementById('resPower');
    const resPowerSub = document.getElementById('resPowerSub');

    // Alert Box Elements
    const cavitationAlert = document.getElementById('cavitationAlert');
    const alertTitle = document.getElementById('alertTitle');
    const alertDesc = document.getElementById('alertDesc');

    // Action Buttons
    const btnExportData = document.getElementById('btnExportData');
    const btnResetDefaults = document.getElementById('btnResetDefaults');

    // Canvas
    const canvas = document.getElementById('systemCurveCanvas');
    const ctx = canvas.getContext('2d');

    // Fluid definitions (density kg/m3, kinematic viscosity m2/s, vapor pressure psi or kPa)
    const fluids = {
        water20: { density: 998.2, visc: 1.004e-6, vaporPsi: 0.34, name: 'Water (20°C)' },
        water60: { density: 983.2, visc: 0.474e-6, vaporPsi: 2.56, name: 'Water (60°C)' },
        glycol30: { density: 1038.0, visc: 2.80e-6, vaporPsi: 0.30, name: '30% Glycol' },
        oilLight: { density: 870.0, visc: 30.0e-6, vaporPsi: 0.05, name: 'Light Oil' }
    };

    // Pipe roughness in meters
    const roughness = {
        pvc: 0.000005,
        copper: 0.0000015,
        steel: 0.000045,
        castiron: 0.00026
    };

    // State tracking
    let lastCalculated = {};

    function updateUnits() {
        const isMetric = unitSystemEl.value === 'metric';
        if (isMetric) {
            unitFlowLabel.textContent = 'L/min';
            unitLengthLabel.textContent = 'm';
            unitLiftLabel.textContent = 'm';
            unitSuctionLabel.textContent = 'm';

            // Convert ranges if switching
            if (flowRate.max !== '1000') {
                flowRate.min = '20';
                flowRate.max = '1000';
                flowRate.step = '10';
                flowRate.value = '200';

                pipeLength.min = '3';
                pipeLength.max = '150';
                pipeLength.step = '3';
                pipeLength.value = '35';

                staticLift.min = '-6';
                staticLift.max = '25';
                staticLift.step = '1';
                staticLift.value = '5';

                suctionHead.min = '-5';
                suctionHead.max = '6';
                suctionHead.step = '0.5';
                suctionHead.value = '-1.5';
            }
        } else {
            unitFlowLabel.textContent = 'GPM';
            unitLengthLabel.textContent = 'ft';
            unitLiftLabel.textContent = 'ft';
            unitSuctionLabel.textContent = 'ft';

            if (flowRate.max !== '250') {
                flowRate.min = '5';
                flowRate.max = '250';
                flowRate.step = '5';
                flowRate.value = '50';

                pipeLength.min = '10';
                pipeLength.max = '500';
                pipeLength.step = '10';
                pipeLength.value = '120';

                staticLift.min = '-20';
                staticLift.max = '80';
                staticLift.step = '2';
                staticLift.value = '15';

                suctionHead.min = '-15';
                suctionHead.max = '20';
                suctionHead.step = '1';
                suctionHead.value = '-5';
            }
        }
        calculateHydraulics();
    }

    function calculateHydraulics() {
        const isMetric = unitSystemEl.value === 'metric';
        const fluidKey = fluidTypeEl.value;
        const fluid = fluids[fluidKey];

        let rawFlow = parseFloat(flowRate.value);
        let rawLength = parseFloat(pipeLength.value);
        let rawLift = parseFloat(staticLift.value);
        let rawSuction = parseFloat(suctionHead.value);
        let fittings = parseInt(fittingsCountEl.value);
        let inchDiameter = parseFloat(pipeDiameterEl.value);
        let roughVal = roughness[pipeMaterialEl.value];

        // Convert everything to US Customary internally for consistent calculation, then format output
        let flowGPM = isMetric ? rawFlow * 0.264172 : rawFlow;
        let lengthFt = isMetric ? rawLength * 3.28084 : rawLength;
        let liftFt = isMetric ? rawLift * 3.28084 : rawLift;
        let suctionFt = isMetric ? rawSuction * 3.28084 : rawSuction;

        // Pipe internal diameter in feet (approx ID based on nominal select)
        const idMap = { '0.75': 0.06867, '1.0': 0.08742, '1.25': 0.115, '1.5': 0.13417, '2.0': 0.17225, '3.0': 0.25567 };
        let pipeIDft = idMap[pipeDiameterEl.value] || 0.08742;
        let pipeIDm = pipeIDft * 0.3048;

        // Velocity in ft/s -> V = (0.4085 * GPM) / (ID_in^2)
        let idInches = inchDiameter;
        let velocityFtS = (0.4085 * flowGPM) / (idInches * idInches);
        let velocityMS = velocityFtS * 0.3048;

        // Reynolds Number Re = (V * D) / kinematic_viscosity
        let reynolds = (velocityMS * pipeIDm) / fluid.visc;

        // Darcy Friction Factor (Swamee-Jain approximation for Colebrook-White)
        let relRough = roughVal / pipeIDm;
        let frictionFactor = 0.25 / Math.pow(Math.log10(relRough / 3.7 + 5.74 / Math.pow(Math.max(reynolds, 1000), 0.9)), 2);
        if (reynolds < 2300) {
            frictionFactor = Math.max(64 / Math.max(reynolds, 1), 0.01);
        }

        // Major friction losses: hf = f * (L / D) * (V^2 / 2g)
        let g = 32.174; // ft/s2
        let majorLossFt = frictionFactor * (lengthFt / pipeIDft) * (velocityFtS * velocityFtS) / (2 * g);

        // Minor losses from fittings (equivalent length approach: ~15 ft per fitting for standard valves/elbows)
        let fittingEquivalentFt = fittings * 12 * (idInches / 12);
        let minorLossFt = frictionFactor * (fittingEquivalentFt / pipeIDft) * (velocityFtS * velocityFtS) / (2 * g);

        let totalFrictionFt = majorLossFt + minorLossFt;
        let tdhFt = liftFt + totalFrictionFt;

        // NPSHa calculation: NPSHa =大气压 head + static suction head - vapor pressure head - friction in suction line
        // Atmospheric approx 34 ft of water at sea level
        let atmosHeadFt = 33.9;
        let vaporHeadFt = (fluid.vaporPsi * 144) / (62.4 * (fluid.density / 1000));
        // If suctionHead is negative (flooded suction), it adds positive head
        let npshaFt = atmosHeadFt + (-suctionHeadVal) - vaporHeadFt - (totalFrictionFt * 0.2);
        if (suctionFt < 0) {
            npshaFt = atmosHeadFt + Math.abs(suctionFt) - vaporHeadFt - (totalFrictionFt * 0.1);
        } else {
            npshaFt = atmosHeadFt - suctionFt - vaporHeadFt - (totalFrictionFt * 0.2);
        }
        npshaFt = Math.max(npshaFt, 0.5);

        // Hydraulic Water Horsepower = (Q_gpm * TDH_ft * SG) / 3960
        let specificGravity = fluid.density / 998.2;
        let waterHP = (flowGPM * tdhFt * specificGravity) / 3960;
        let waterKW = waterHP * 0.7457;

        // Update UI Display
        if (isMetric) {
            let tdhM = tdhFt * 0.3048;
            let frictM = totalFrictionFt * 0.3048;
            let npshaM = npshaFt * 0.3048;
            resTDH.textContent = tdhM.toFixed(1) + ' m';
            resTDHSub.textContent = (tdhM * 9.80665).toFixed(1) + ' kPa';
            resFriction.textContent = frictM.toFixed(2) + ' m';
            resFrictionSub.textContent = 'Darcy Re: ' + Math.round(reynolds);
            resNPSHa.textContent = npshaM.toFixed(2) + ' m';
            resNPSHaSub.textContent = 'Vapor margin safe';
            resPower.textContent = waterKW.toFixed(2) + ' kW';
            resPowerSub.textContent = (waterHP).toFixed(1) + ' HP output';
        } else {
            resTDH.textContent = tdhFt.toFixed(1) + ' ft';
            resTDHSub.textContent = (tdhFt * 0.433 * specificGravity).toFixed(1) + ' psi';
            resFriction.textContent = totalFrictionFt.toFixed(1) + ' ft';
            resFrictionSub.textContent = 'Darcy Re: ' + Math.round(reynolds);
            resNPSHa.textContent = npshaFt.toFixed(1) + ' ft';
            resNPSHaSub.textContent = 'Vapor margin safe';
            resPower.textContent = waterHP.toFixed(2) + ' HP';
            resPowerSub.textContent = (waterKW).toFixed(2) + ' kW output';
        }

        // Update Sliders Text
        flowRateVal.textContent = flowRate.value + ' ' + (isMetric ? 'L/min' : 'GPM');
        pipeLengthVal.textContent = pipeLength.value + ' ' + (isMetric ? 'm' : 'ft');
        staticLiftVal.textContent = staticLift.value + ' ' + (isMetric ? 'm' : 'ft');
        let sVal = parseFloat(suctionHead.value);
        suctionHeadVal.textContent = suctionHead.value + ' ' + (isMetric ? 'm' : 'ft') + (sVal < 0 ? ' (Flooded)' : '');
        fittingsCountVal.textContent = fittingsCount.value + ' fittings';

        // Cavitation Check
        cavitationAlert.className = 'alert-box';
        if (npshaFt < 4.0) {
            cavitationAlert.classList.add('danger');
            alertTitle.textContent = 'Critical Cavitation Danger (NPSHa < 4 ft)';
            alertDesc.textContent = 'Net Positive Suction Head is critically low. Vapor bubbles will collapse and destroy the impeller. Increase pipe diameter, lower static lift, or flood suction.';
        } else if (npshaFt < 8.0) {
            cavitationAlert.classList.add('warning');
            alertTitle.textContent = 'Moderate Cavitation Warning';
            alertDesc.textContent = 'NPSHa is borderline. Ensure pump NPSHr specification is strictly verified before installation to prevent premature wear.';
        } else {
            alertTitle.textContent = 'NPSH Safety Status: Optimal';
            alertDesc.textContent = 'Healthy margin between NPSHa (' + npshaFt.toFixed(1) + ' ft) and fluid vapor pressure. Low risk of destructive cavitation.';
        }

        // Save state for export
        lastCalculated = {
            unitSystem: unitSystemEl.value,
            fluid: fluid.name,
            flowRate: rawFlow,
            pipeDiameterInches: inchDiameter,
            pipeLength: rawLength,
            staticLift: rawLift,
            suctionHead: rawSuction,
            fittings: fittings,
            calculatedTDH: isMetric ? (tdhFt * 0.3048).toFixed(2) + ' m' : tdhFt.toFixed(2) + ' ft',
            calculatedFriction: isMetric ? (totalFrictionFt * 0.3048).toFixed(2) + ' m' : totalFrictionFt.toFixed(2) + ' ft',
            calculatedNPSHa: isMetric ? (npshaFt * 0.3048).toFixed(2) + ' m' : npshaFt.toFixed(2) + ' ft',
            hydraulicPower: isMetric ? waterKW.toFixed(2) + ' kW' : waterHP.toFixed(2) + ' HP',
            reynoldsNumber: Math.round(reynolds),
            timestamp: new Date().toISOString()
        };

        drawSystemCurve(flowGPM, tdhFt, isMetric);
    }

    function drawSystemCurve(currentGPM, currentTDH, isMetric) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const w = canvas.width;
        const h = canvas.height;
        const padding = 50;

        // Draw background grid
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px system-ui, sans-serif';

        // Axes bounds
        let maxQ = isMetric ? 300 : 250;
        let maxH = Math.max(150, currentTDH * 1.6);

        // Vertical grid lines (Flow)
        for (let q = 0; q <= maxQ; q += maxQ / 5) {
            let x = padding + (q / maxQ) * (w - 2 * padding);
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, h - padding);
            ctx.stroke();
            ctx.fillText(Math.round(q), x - 10, h - padding + 20);
        }

        // Horizontal grid lines (Head)
        for (let head = 0; head <= maxH; head += maxH / 5) {
            let y = h - padding - (head / maxH) * (h - 2 * padding);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(w - padding, y);
            ctx.stroke();
            ctx.fillText(Math.round(head), padding - 35, y + 4);
        }

        // Axis Labels
        ctx.fillStyle = '#f8fafc';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText(isMetric ? 'Flow Rate (L/min)' : 'Flow Rate (GPM)', w / 2 - 50, h - 10);
        ctx.save();
        ctx.translate(15, h / 2 + 30);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(isMetric ? 'Head (m)' : 'Head (ft)', 0, 0);
        ctx.restore();

        // Plot System Curve (Quadratic: H = StaticLift + k * Q^2)
        let staticH = parseFloat(staticLift.value);
        if (isMetric) staticH *= 3.28084;
        let kCoeff = (currentTDH - Math.max(staticH, 0)) / Math.max(currentGPM * currentGPM, 1);

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let q = 0; q <= maxQ; q += 2) {
            let internalQ = isMetric ? q * 0.264172 : q;
            let hVal = Math.max(staticH, 0) + kCoeff * (internalQ * internalQ);
            let displayH = isMetric ? hVal * 0.3048 : hVal;

            let x = padding + (q / maxQ) * (w - 2 * padding);
            let y = h - padding - (displayH / maxH) * (h - 2 * padding);

            if (q === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Plot Pump Characteristic Curve (Typical Centrifugal: H_shutoff - a * Q^2)
        let shutoffH = currentTDH * 1.4;
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let q = 0; q <= maxQ; q += 2) {
            let internalQ = isMetric ? q * 0.264172 : q;
            let ratio = internalQ / Math.max(maxQ, 1);
            let pumpH = shutoffH * (1 - 0.7 * Math.pow(ratio, 1.8));
            let displayH = isMetric ? pumpH * 0.3048 : pumpH;

            let x = padding + (q / maxQ) * (w - 2 * padding);
            let y = h - padding - (displayH / maxH) * (h - 2 * padding);

            if (q === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Plot Operating Point Intersection
        let opQ = isMetric ? currentGPM / 0.264172 : currentGPM;
        let opH = currentTDH;
        let displayOpH = isMetric ? opH * 0.3048 : opH;
        let displayOpQ = isMetric ? currentGPM : currentGPM;

        let ox = padding + (displayOpQ / maxQ) * (w - 2 * padding);
        let oy = h - padding - (displayOpH / maxH) * (h - 2 * padding);

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(ox, oy, 7, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Legend
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(w - 180, 25, 12, 12);
        ctx.fillStyle = '#f8fafc';
        ctx.fillText('System Resistance Curve', w - 160, 35);

        ctx.fillStyle = '#10b981';
        ctx.fillRect(w - 180, 45, 12, 12);
        ctx.fillStyle = '#f8fafc';
        ctx.fillText('Pump Characteristic Curve', w - 160, 55);

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(w - 174, 69, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#f8fafc';
        ctx.fillText('Operating Point', w - 160, 73);
    }

    // Event Listeners
    unitSystemEl.addEventListener('change', updateUnits);
    fluidTypeEl.addEventListener('change', calculateHydraulics);
    flowRateEl.addEventListener('input', calculateHydraulics);
    pipeDiameterEl.addEventListener('change', calculateHydraulics);
    pipeMaterialEl.addEventListener('change', calculateHydraulics);
    pipeLengthEl.addEventListener('input', calculateHydraulics);
    staticLiftEl.addEventListener('input', calculateHydraulics);
    suctionHeadEl.addEventListener('input', calculateHydraulics);
    fittingsCountEl.addEventListener('input', calculateHydraulics);

    btnResetDefaults.addEventListener('click', () => {
        unitSystemEl.value = 'us';
        fluidTypeEl.value = 'water20';
        updateUnits();
        flowRate.value = '50';
        pipeDiameterEl.value = '1.0';
        pipeMaterialEl.value = 'pvc';
        pipeLength.value = '120';
        staticLift.value = '15';
        suctionHead.value = '-5';
        fittingsCount.value = '6';
        calculateHydraulics();
    });

    btnExportData.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(lastCalculated, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", "auravortex_hydraulic_report.json");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    });

    // Initial calculation on load
    updateUnits();
});
