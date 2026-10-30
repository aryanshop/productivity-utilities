document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const shapeSelect = document.getElementById('shapeSelect');
    const dimFieldsFlat = document.getElementById('dimFieldsFlat');
    const dimFieldsPipe = document.getElementById('dimFieldsPipe');
    const dimFieldsCustom = document.getElementById('dimFieldsCustom');
    
    const lengthInput = document.getElementById('lengthInput');
    const widthInput = document.getElementById('widthInput');
    const pipeLength = document.getElementById('pipeLength');
    const pipeDiameter = document.getElementById('pipeDiameter');
    const customAreaInput = document.getElementById('customAreaInput');
    
    const unitSystem = document.getElementById('unitSystem');
    const unitPressureLabel = document.getElementById('unitPressureLabel');
    const unitCurrencyLabel = document.getElementById('unitCurrencyLabel');
    const sidesFactor = document.getElementById('sidesFactor');
    const substrateType = document.getElementById('substrateType');
    const conditionLevel = document.getElementById('conditionLevel');
    
    const mediaSelect = document.getElementById('mediaSelect');
    const mediaInfoDesc = document.getElementById('mediaInfoDesc');
    const nozzleSize = document.getElementById('nozzleSize');
    const targetPSI = document.getElementById('targetPSI');
    const recoveryCycles = document.getElementById('recoveryCycles');
    const mediaCostPerUnit = document.getElementById('mediaCostPerUnit');
    const operatorLaborRate = document.getElementById('operatorLaborRate');

    // Output Elements
    const outArea = document.getElementById('outArea');
    const outAreaSub = document.getElementById('outAreaSub');
    const outAbrasiveWeight = document.getElementById('outAbrasiveWeight');
    const outAbrasiveSub = document.getElementById('outAbrasiveSub');
    const outCFM = document.getElementById('outCFM');
    const outCFMSub = document.getElementById('outCFMSub');
    const outTime = document.getElementById('outTime');
    const outTimeSub = document.getElementById('outTimeSub');
    const outCost = document.getElementById('outCost');
    const outCostSub = document.getElementById('outCostSub');
    const outRecycleValue = document.getElementById('outRecycleValue');
    const outRecycleSub = document.getElementById('outRecycleSub');

    const barMedia = document.getElementById('barMedia');
    const barLabor = document.getElementById('barLabor');
    const barEnergy = document.getElementById('barEnergy');
    const breakdownDetails = document.getElementById('breakdownDetails');

    const btnSaveJob = document.getElementById('btnSaveJob');
    const btnPrintReport = document.getElementById('btnPrintReport');
    const btnClearLog = document.getElementById('btnClearLog');
    const jobTableBody = document.getElementById('jobTableBody');

    // Media metadata dictionary
    const mediaData = {
        alum_oxide: {
            name: "Aluminum Oxide",
            desc: "Extremely hard and angular. Cuts fast, highly durable, ideal for heavy rust and preparing surfaces for high-performance coatings. Reusable 5-10 times.",
            consumptionRate: 3.5, // lbs per sq ft at standard condition
            reusabilityFactor: 0.75,
            density: 120 // lbs/cu ft
        },
        glass_bead: {
            name: "Glass Beads",
            desc: "Spherical soda-lime glass. Produces bright satin/matte finish without removing base metal. Ideal for cleaning soft metals, deburring. Moderate reuse.",
            consumptionRate: 4.0,
            reusabilityFactor: 0.60,
            density: 95
        },
        garnet: {
            name: "Garnet Sand",
            desc: "High-density, low-dust natural mineral abrasive. Fast production rate with minimal consumption. Excellent for steel tanks, shipyards, and bridges.",
            consumptionRate: 2.8,
            reusabilityFactor: 0.50,
            density: 135
        },
        walnut: {
            name: "Walnut Shells",
            desc: "Soft organic abrasive. Cleans and strips coatings (paint, carbon) without gouging soft substrates like aluminum, fiberglass, or wood.",
            consumptionRate: 2.0,
            reusabilityFactor: 0.30,
            density: 45
        },
        steel_shot: {
            name: "Steel Shot / Grit",
            desc: "Heavy industrial spherical/angular steel. Designed for closed blast rooms. Exceptional longevity, recycled up to 50+ times.",
            consumptionRate: 5.0,
            reusabilityFactor: 0.95,
            density: 280
        }
    };

    // Nozzle Air CFM requirements at 90 PSI
    const nozzleCFMTable = {
        "3": 40,
        "4": 75,
        "5": 115,
        "6": 165,
        "8": 300
    };

    let savedJobs = [];

    // Toggle dimension fields based on shape selection
    function handleShapeChange() {
        const shape = shapeSelect.value;
        dimFieldsFlat.style.display = shape === 'flat' ? 'block' : 'none';
        dimFieldsPipe.style.display = shape === 'pipe' ? 'block' : 'none';
        dimFieldsCustom.style.display = shape === 'custom' ? 'block' : 'none';
        calculate();
    }

    // Handle unit system conversion labels
    function handleUnitChange() {
        const isMetric = unitSystem.value === 'metric';
        unitPressureLabel.textContent = isMetric ? 'Bar' : 'PSI';
        unitCurrencyLabel.textContent = '$';
        calculate();
    }

    // Update media info banner
    function updateMediaInfo() {
        const key = mediaSelect.value;
        const info = mediaData[key];
        if (info) {
            mediaInfoDesc.textContent = info.desc;
        }
        calculate();
    }

    // Main calculation engine
    function calculate() {
        const isMetric = unitSystem.value === 'metric';
        const shape = shapeSelect.value;
        const sides = parseFloat(sidesFactor.value);
        
        // 1. Calculate Surface Area in sq ft (base internal unit)
        let areaSqFt = 0;
        let areaSqM = 0;

        if (shape === 'flat') {
            const l = parseFloat(lengthInput.value) || 0;
            const w = parseFloat(widthInput.value) || 0;
            const rawArea = l * w;
            if (isMetric) {
                // convert sq meters to sq ft (1 sq m = 10.7639 sq ft)
                areaSqM = rawArea * sides;
                areaSqFt = areaSqM * 10.7639;
            } else {
                areaSqFt = rawArea * sides;
                areaSqM = areaSqFt / 10.7639;
            }
        } else if (shape === 'pipe') {
            const pLen = parseFloat(pipeLength.value) || 0;
            const pDiam = parseFloat(pipeDiameter.value) || 0;
            // Surface area of cylinder = Pi * Diameter * Length
            const rawArea = Math.PI * pDiam * pLen;
            if (isMetric) {
                areaSqM = rawArea * sides;
                areaSqFt = areaSqM * 10.7639;
            } else {
                areaSqFt = rawArea * sides;
                areaSqM = areaSqFt / 10.7639;
            }
        } else if (shape === 'custom') {
            const customVal = parseFloat(customAreaInput.value) || 0;
            if (isMetric) {
                areaSqM = customVal * sides;
                areaSqFt = areaSqM * 10.7639;
            } else {
                areaSqFt = customVal * sides;
                areaSqM = areaSqFt / 10.7639;
            }
        }

        // 2. Substrate & Condition Multipliers
        const subMultiplier = {
            steel: 1.0,
            aluminum: 0.8,
            hardwood: 0.6,
            stone: 1.3
        }[substrateType.value] || 1.0;

        const condMultiplier = {
            light: 0.8,
            heavy: 1.2,
            paint: 1.5,
            pitting: 1.8
        }[conditionLevel.value] || 1.0;

        const mediaKey = mediaSelect.value;
        const media = mediaData[mediaKey];

        // 3. Abrasive Consumption Weight
        // Base rate * Area * Substrate * Condition
        const baseConsumptionLbs = areaSqFt * media.consumptionRate * subMultiplier * condMultiplier;
        const baseConsumptionKg = baseConsumptionLbs * 0.453592;

        const netWeight = isMetric ? baseConsumptionKg : baseConsumptionLbs;
        const weightUnitLabel = isMetric ? 'kg' : 'lbs';

        // 4. Air Compressor CFM & Pressure adjustment
        const nzSize = nozzleSize.value;
        let baseCFM = nozzleCFMTable[nzSize] || 75;
        const psiVal = parseFloat(targetPSI.value) || 90;
        // Adjust CFM roughly by pressure ratio (P2 / P1)
        const adjustedCFM = Math.round(baseCFM * (psiVal / 90));

        // 5. Blast Time Estimation (sq ft per hour production rate ~ 50 sq ft/hr for standard setup)
        const productionRateSqFtHr = 45 / (condMultiplier * subMultiplier);
        const totalHours = areaSqFt / productionRateSqFtHr;

        // 6. Cost breakdown
        const costPerUnit = parseFloat(mediaCostPerUnit.value) || 1.0;
        const cycles = parseFloat(recoveryCycles.value) || 1;
        
        // Effective abrasive required accounting for recycling recovery
        const effectiveAbrasiveWeight = netWeight / Math.max(1, (cycles * media.reusabilityFactor));
        const mediaTotalCost = effectiveAbrasiveWeight * costPerUnit;

        // Labor Cost
        const laborRate = parseFloat(operatorLaborRate.value) || 40;
        const laborTotalCost = totalHours * laborRate;

        // Energy & Equipment wear (approx 15% of labor + media)
        const energyWearCost = (mediaTotalCost + laborTotalCost) * 0.12;

        const totalJobCost = mediaTotalCost + laborTotalCost + energyWearCost;
        const recyclingSavings = (netWeight - effectiveAbrasiveWeight) * costPerUnit;

        // Format outputs
        const areaDisplayStr = isMetric ? `${areaSqM.toFixed(1)} m²` : `${areaSqFt.toFixed(1)} sq ft`;
        outArea.textContent = areaDisplayStr;
        outAreaSub.textContent = `Sides factor: ${sides}x`;

        outAbrasiveWeight.textContent = `${effectiveAbrasiveWeight.toFixed(1)} ${weightUnitLabel}`;
        outAbrasiveSub.textContent = `Raw gross: ${netWeight.toFixed(1)} ${weightUnitLabel}`;

        outCFM.textContent = `${adjustedCFM} CFM`;
        outCFMSub.textContent = @ ${psiVal} ${isMetric ? 'Bar' : 'PSI'};

        // Format hours into hours and minutes
        const hrs = Math.floor(totalHours);
        const mins = Math.round((totalHours - hrs) * 60);
        outTime.textContent = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} mins`;
        outTimeSub.textContent = `Pacing: ~${Math.round(productionRateSqFtHr)} sq ft/hr`;

        outCost.textContent = `$${totalJobCost.toFixed(2)}`;
        outCostSub.textContent = `Incl. labor & power`;

        outRecycleValue.textContent = `$${recyclingSavings.toFixed(2)}`;
        outRecycleSub.textContent = `${cycles} recovery cycles`;

        // Update visual breakdown bar percentages
        const sumCost = mediaTotalCost + laborTotalCost + energyWearCost;
        const pMedia = sumCost > 0 ? (mediaTotalCost / sumCost) * 100 : 33;
        const pLabor = sumCost > 0 ? (laborTotalCost / sumCost) * 100 : 33;
        const pEnergy = sumCost > 0 ? (energyWearCost / sumCost) * 100 : 34;

        barMedia.style.width = `${pMedia}%`;
        barLabor.style.width = `${pLabor}%`;
        barEnergy.style.width = `${pEnergy}%`;

        breakdownDetails.textContent = `Media: $${mediaTotalCost.toFixed(2)} (${pMedia.toFixed(0)}%) | Labor: $${laborTotalCost.toFixed(2)} (${pLabor.toFixed(0)}%) | Energy/Wear: $${energyWearCost.toFixed(2)} (${pEnergy.toFixed(0)}%)`;

        // Store current calculated state for quick save
        window._currentJobState = {
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            shape: `${shape.toUpperCase()} (${areaDisplayStr})`,
            mediaName: media.name,
            area: areaDisplayStr,
            abrasive: `${effectiveAbrasiveWeight.toFixed(1)} ${weightUnitLabel}`,
            time: hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`,
            cost: `$${totalJobCost.toFixed(2)}`
        };
    }

    // Save job into session log table
    function saveJobToLog() {
        const job = window._currentJobState;
        if (!job) return;

        if (savedJobs.length === 0) {
            jobTableBody.innerHTML = '';
        }

        savedJobs.unshift(job);
        renderJobTable();
    }

    function renderJobTable() {
        if (savedJobs.length === 0) {
            jobTableBody.innerHTML = `<tr class="empty-row"><td colspan="8">No jobs saved in session memory yet. Click "Save Job to Log" above.</td></tr>`;
            return;
        }

        jobTableBody.innerHTML = '';
        savedJobs.forEach((j, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${j.timestamp}</td>
                <td><strong>${j.shape}</strong></td>
                <td>${j.mediaName}</td>
                <td>${j.area}</td>
                <td>${j.abrasive}</td>
                <td>${j.time}</td>
                <td><strong>${j.cost}</strong></td>
                <td><button class="btn-delete" data-index="${index}" title="Remove entry">✕</button></td>
            `;
            jobTableBody.appendChild(tr);
        });

        // Attach delete event listeners
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.currentTarget.getAttribute('data-index'));
                savedJobs.splice(idx, 1);
                renderJobTable();
            });
        });
    }

    // Event Listeners for inputs
    [shapeSelect, unitSystem, sidesFactor, substrateType, conditionLevel, mediaSelect, nozzleSize, targetPSI, recoveryCycles, mediaCostPerUnit, operatorLaborRate].forEach(el => {
        el.addEventListener('input', calculate);
        el.addEventListener('change', calculate);
    });

    [lengthInput, widthInput, pipeLength, pipeDiameter, customAreaInput].forEach(el => {
        el.addEventListener('input', calculate);
    });

    shapeSelect.addEventListener('change', handleShapeChange);
    unitSystem.addEventListener('change', handleUnitChange);
    mediaSelect.addEventListener('change', updateMediaInfo);

    btnSaveJob.addEventListener('click', saveJobToLog);

    btnClearLog.addEventListener('click', () => {
        savedJobs = [];
        renderJobTable();
    });

    btnPrintReport.addEventListener('click', () => {
        window.print();
    });

    // Initial setup
    updateMediaInfo();
    handleShapeChange();
});
