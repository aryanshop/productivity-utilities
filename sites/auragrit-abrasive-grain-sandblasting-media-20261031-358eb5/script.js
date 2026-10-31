document.addEventListener('DOMContentLoaded', () => {
    // Media database presets
    const MEDIA_PROFILES = {
        'garnet': {
            name: 'Garnet (#36 Mesh)',
            density: 140,
            hardness: 8.0,
            recycling: '3-5x',
            consumptionFactor: 2.2,
            costDefault: 0.75,
            description: 'High-efficiency natural almandine garnet. Fast cutting speed, low dust, ideal for structural steel and outdoor blasting.'
        },
        'aluminum-oxide': {
            name: 'Aluminum Oxide (#30/60)',
            density: 120,
            hardness: 9.0,
            recycling: '6-10x',
            consumptionFactor: 1.8,
            costDefault: 1.25,
            description: 'Extremely aggressive and durable angular media. Excellent for high-performance stripping and preparing surfaces for thermal spray.'
        },
        'glass-bead': {
            name: 'Glass Bead (A-Glass #8)',
            density: 95,
            hardness: 5.5,
            recycling: '4-6x',
            consumptionFactor: 2.5,
            costDefault: 0.90,
            description: 'Spherical soda-lime glass media. Produces a clean, satin, peened finish without dimensional loss on aluminum or stainless steel.'
        },
        'walnut': {
            name: 'Walnut Shell (Fine #16/30)',
            density: 45,
            hardness: 3.0,
            recycling: '2-4x',
            consumptionFactor: 1.5,
            costDefault: 0.60,
            description: 'Soft organic abrasive. Strips coatings, carbon, and paint from delicate substrates (aluminum, fiberglass, hardwoods) without pitting.'
        },
        'steel-shot': {
            name: 'Steel Shot (S-330)',
            density: 280,
            hardness: 7.5,
            recycling: '150+
            x',
            consumptionFactor: 3.5,
            costDefault: 1.10,
            description: 'Heavy round carbon steel shot used primarily in closed-loop blast rooms for rapid descaling and imparting compressive stress.'
        }
    };

    // Substrate & Coating difficulty multipliers
    const SUBSTRATE_FACTORS = {
        'steel': 1.0,
        'aluminum': 0.85,
        'hardwood': 0.6,
        'stone': 1.3
    };

    const COATING_FACTORS = {
        'light': 0.8,
        'medium': 1.0,
        'heavy': 1.4,
        'extreme': 1.8
    };

    // Compressor CFM requirements by nozzle orifice (at 100 PSI reference)
    // Orifice sizes: 3 (3/16"), 4 (1/4"), 5 (5/16"), 6 (3/8"), 8 (1/2")
    const NOZZLE_CFM = {
        '3': { cfm: 52, feed: 90, velocity: 850 },
        '4': { cfm: 105, feed: 180, velocity: 820 },
        '5': { cfm: 162, feed: 280, velocity: 800 },
        '6': { cfm: 235, feed: 400, velocity: 780 },
        '8': { cfm: 425, feed: 720, velocity: 750 }
    };

    // DOM Elements
    const shapeSelect = document.getElementById('shape-select');
    const unitSystem = document.getElementById('unit-system');
    const dimFlat = document.getElementById('dim-flat');
    const dimCylinder = document.getElementById('dim-cylinder');
    const dimComplex = document.getElementById('dim-complex');
    
    const inputLength = document.getElementById('input-length');
    const inputWidth = document.getElementById('input-width');
    const inputDiam = document.getElementById('input-diam');
    const inputHeight = document.getElementById('input-height');
    const inputSqft = document.getElementById('input-sqft');
    const inputSides = document.getElementById('input-sides');
    const inputComplexity = document.getElementById('input-complexity');
    
    const substrateSelect = document.getElementById('substrate-select');
    const coatingSelect = document.getElementById('coating-select');
    
    const mediaSelect = document.getElementById('media-select');
    const mediaCost = document.getElementById('media-cost');
    const mediaDensity = document.getElementById('media-density');
    const mediaHardness = document.getElementById('media-hardness');
    const mediaRecycling = document.getElementById('media-recycling');
    const mediaDesc = document.getElementById('media-desc');
    
    const nozzleSelect = document.getElementById('nozzle-select');
    const psiSelect = document.getElementById('psi-select');
    const inputRecovery = document.getElementById('input-recovery');
    const inputLabor = document.getElementById('input-labor');
    
    const btnReset = document.getElementById('btn-reset');
    const btnPrint = document.getElementById('btn-print');

    // Results Elements
    const resSqft = document.getElementById('res-sqft');
    const resSqm = document.getElementById('res-sqm');
    const resRawWt = document.getElementById('res-raw-wt');
    const resNetWt = document.getElementById('res-net-wt');
    const resTime = document.getElementById('res-time');
    
    const resCfm = document.getElementById('res-cfm');
    const resPsiLbl = document.getElementById('res-psi-lbl');
    const resVelocity = document.getElementById('res-velocity');
    const resFeedrate = document.getElementById('res-feedrate');
    
    const costWtDisplay = document.getElementById('cost-wt-display');
    const costUnitDisplay = document.getElementById('cost-unit-display');
    const costHoursDisplay = document.getElementById('cost-hours-display');
    const costLaborDisplay = document.getElementById('cost-labor-display');
    
    const costMediaTotal = document.getElementById('cost-media-total');
    const costLaborTotal = document.getElementById('cost-labor-total');
    const costEquipTotal = document.getElementById('cost-equip-total');
    const costGrandTotal = document.getElementById('cost-grand-total');
    
    const barRecycled = document.getElementById('bar-recycled');
    const barVirgin = document.getElementById('bar-virgin');
    const statVirginWt = document.getElementById('stat-virgin-wt');
    const statRecycledWt = document.getElementById('stat-recycled-wt');
    const statWasteWt = document.getElementById('stat-waste-wt');
    
    const unitLblDim = document.querySelectorAll('.unit-lbl-dim');
    const unitLblWt = document.querySelectorAll('.unit-lbl-wt');
    const unitLblWtRes = document.getElementById('unit-lbl-wt-res');
    const unitLblNetRes = document.getElementById('unit-lbl-net-res');

    // Handle Shape Switch
    function handleShapeChange() {
        const shape = shapeSelect.value;
        dimFlat.classList.add('hidden');
        dimCylinder.classList.add('hidden');
        dimComplex.classList.add('hidden');

        if (shape === 'flat') dimFlat.classList.remove('hidden');
        else if (shape === 'cylinder') dimCylinder.classList.remove('hidden');
        else if (shape === 'complex') dimComplex.classList.remove('hidden');

        calculate();
    }

    // Handle Unit System Switch
    function handleUnitSystemChange() {
        const isMetric = unitSystem.value === 'metric';
        unitLblDim.forEach(el => el.textContent = isMetric ? '(m)' : '(ft)');
        unitLblWt.forEach(el => el.textContent = isMetric ? 'kg' : 'lbs');
        unitLblWtRes.textContent = isMetric ? 'kg' : 'lbs';
        unitLblNetRes.textContent = isMetric ? 'kg' : 'lbs';
        calculate();
    }

    // Update Media Info Card when media changes
    function handleMediaChange() {
        const key = mediaSelect.value;
        const profile = MEDIA_PROFILES[key];
        if (profile) {
            mediaDensity.textContent = `Density: ${profile.density} lb/ft³`;
            mediaHardness.textContent = `Mohs Hardness: ${profile.hardness}`;
            mediaRecycling.textContent = `Recycle Cycles: ${profile.recycling}`;
            mediaDesc.textContent = profile.description;
            mediaCost.value = profile.costDefault;
        }
        calculate();
    }

    // Core Calculation Logic
    function calculate() {
        const isMetric = unitSystem.value === 'metric';
        const shape = shapeSelect.value;
        const sides = parseFloat(inputSides.value) || 1;
        const complexity = parseFloat(inputComplexity.value) || 1.0;
        
        // 1. Calculate Surface Area in sq ft (or convert metric to sq ft for baseline models)
        let areaSqFt = 0;

        if (shape === 'flat') {
            let l = parseFloat(inputLength.value) || 0;
            let w = parseFloat(inputWidth.value) || 0;
            if (isMetric) {
                l *= 3.28084;
                w *= 3.28084;
            }
            areaSqFt = l * w * sides;
        } else if (shape === 'cylinder') {
            let d = parseFloat(inputDiam.value) || 0;
            let h = parseFloat(inputHeight.value) || 0;
            if (isMetric) {
                d *= 3.28084;
                h *= 3.28084;
            }
            // Outer surface area of cylinder = Pi * d * h + end caps if necessary
            areaSqFt = Math.PI * d * h * sides;
        } else if (shape === 'complex') {
            let sq = parseFloat(inputSqft.value) || 0;
            if (isMetric) {
                sq *= 10.7639; // sq meters to sq ft
            }
            areaSqFt = sq * sides;
        }

        // Apply complexity multiplier
        const effectiveAreaSqFt = areaSqFt * complexity;
        const areaSqM = effectiveAreaSqFt / 10.7639;

        // 2. Abrasive Consumption Calculation
        const mediaKey = mediaSelect.value;
        const mediaProf = MEDIA_PROFILES[mediaKey] || MEDIA_PROFILES['garnet'];
        const substrateFactor = SUBSTRATE_FACTORS[substrateSelect.value] || 1.0;
        const coatingFactor = COATING_FACTORS[coatingSelect.value] || 1.0;

        // Base lbs per sq ft consumption factor modified by media type, substrate, and coating condition
        const rawConsumptionRate = mediaProf.consumptionFactor * substrateFactor * coatingFactor;
        let rawWeight = effectiveAreaSqFt * rawConsumptionRate;

        // If metric selected, convert lbs to kg (1 lb = 0.453592 kg)
        let weightMultiplier = isMetric ? 0.453592 : 1.0;
        let displayRawWeight = rawWeight * weightMultiplier;

        // Recovery & Recycling
        const recoveryPct = Math.min(100, Math.max(0, parseFloat(inputRecovery.value) || 0));
        const recyclingDecimal = recoveryPct / 100;
        
        // Net abrasive needed after recycling reclamation
        const netWeight = displayRawWeight * (1 - (recyclingDecimal * 0.75));
        const virginWeight = netWeight;
        const recycledWeight = displayRawWeight - virginWeight;
        const wasteWeight = displayRawWeight * 0.15; // Estimated dust and breakdown loss

        // 3. Blast Time & Pneumatics
        const nozzleKey = nozzleSelect.value;
        const nozzleData = NOZZLE_CFM[nozzleKey] || NOZZLE_CFM['4'];
        
        // Blast rate (sq ft per hour) based on nozzle and coating
        const baseCleanRateSqFtPerHr = (parseInt(nozzleKey) * 35) / coatingFactor;
        const estimatedHours = Math.max(0.1, effectiveAreaSqFt / baseCleanRateSqFtPerHr);

        // Compressor CFM adjustment based on PSI
        const psiVal = parseInt(psiSelect.value) || 100;
        const psiMultiplier = psiVal / 100;
        const adjustedCFM = Math.round(nozzleData.cfm * psiMultiplier);
        const adjustedFeedRate = Math.round(nozzleData.feed * (effectiveAreaSqFt > 0 ? 1 : 0));

        // 4. Financial Calculations
        const unitCost = parseFloat(mediaCost.value) || 0;
        const laborRate = parseFloat(inputLabor.value) || 0;
        
        const mediaTotalCost = netWeight * unitCost;
        const laborTotalCost = estimatedHours * laborRate;
        const equipmentOverheadCost = estimatedHours * 18.00; // Standard equipment depreciation & fuel
        const grandTotalCost = mediaTotalCost + laborTotalCost + equipmentOverheadCost;

        // Update UI DOM
        resSqft.textContent = effectiveAreaSqFt.toFixed(1);
        resSqm.textContent = `${areaSqM.toFixed(2)} m²`;
        resRawWt.textContent = Math.round(displayRawWeight);
        resNetWt.textContent = Math.round(netWeight);
        resTime.textContent = estimatedHours.toFixed(1);

        resCfm.textContent = `${adjustedCFM} CFM`;
        resPsiLbl.textContent = psiVal;
        resVelocity.textContent = `${Math.round(nozzleData.velocity * Math.sqrt(psiMultiplier))} fps`;
        resFeedrate.textContent = `${adjustedFeedRate} ${isMetric ? 'kg/hr' : 'lbs/hr'}`;

        costWtDisplay.textContent = Math.round(netWeight);
        costUnitDisplay.textContent = unitCost.toFixed(2);
        costHoursDisplay.textContent = estimatedHours.toFixed(1);
        costLaborDisplay.textContent = laborRate.toFixed(2);

        costMediaTotal.textContent = `$${mediaTotalCost.toFixed(2)}`;
        costLaborTotal.textContent = `$${laborTotalCost.toFixed(2)}`;
        costEquipTotal.textContent = `$${equipmentOverheadCost.toFixed(2)}`;
        costGrandTotal.textContent = `$${grandTotalCost.toFixed(2)}`;

        // Progress bar percentages
        const totalMatForBar = displayRawWeight || 1;
        const recPctBar = Math.round((recycledWeight / totalMatForBar) * 100);
        const virgPctBar = 100 - recPctBar;
        
        barRecycled.style.width = `${Math.max(5, recPctBar)}%`;
        barRecycled.textContent = `Recycled (${recPctBar}%)`;
        barVirgin.style.width = `${Math.max(5, virgPctBar)}%`;
        barVirgin.textContent = `Virgin (${virgPctBar}%)`;

        statVirginWt.textContent = `${Math.round(virginWeight)} ${isMetric ? 'kg' : 'lbs'}`;
        statRecycledWt.textContent = `${Math.round(recycledWeight)} ${isMetric ? 'kg' : 'lbs'}`;
        statWasteWt.textContent = `${Math.round(wasteWeight)} ${isMetric ? 'kg' : 'lbs'}`;
    }

    // Event Listeners for inputs
    const allInputs = document.querySelectorAll('input, select');
    allInputs.forEach(input => {
        input.addEventListener('input', calculate);
        input.addEventListener('change', calculate);
    });

    shapeSelect.addEventListener('change', handleShapeChange);
    unitSystem.addEventListener('change', handleUnitSystemChange);
    mediaSelect.addEventListener('change', handleMediaChange);

    // Reset Defaults
    btnReset.addEventListener('click', () => {
        shapeSelect.value = 'flat';
        unitSystem.value = 'imperial';
        inputLength.value = '12';
        inputWidth.value = '6';
        inputDiam.value = '4';
        inputHeight.value = '10';
        inputSqft.value = '150';
        inputSides.value = '2';
        inputComplexity.value = '1.2';
        substrateSelect.value = 'steel';
        coatingSelect.value = 'medium';
        mediaSelect.value = 'garnet';
        nozzleSelect.value = '4';
        psiSelect.value = '100';
        inputRecovery.value = '70';
        inputLabor.value = '45';
        handleShapeChange();
        handleUnitSystemChange();
        handleMediaChange();
    });

    // Print Report
    btnPrint.addEventListener('click', () => {
        window.print();
    });

    // Initial setup call
    handleShapeChange();
    handleMediaChange();
});
