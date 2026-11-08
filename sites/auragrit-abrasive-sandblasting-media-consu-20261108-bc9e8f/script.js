document.addEventListener('DOMContentLoaded', () => {
    const surfaceAreaInput = document.getElementById('surfaceArea');
    const areaUnitSelect = document.getElementById('areaUnit');
    const substrateTypeSelect = document.getElementById('substrateType');
    const coatingConditionSelect = document.getElementById('coatingCondition');
    const mediaTypeSelect = document.getElementById('mediaType');
    const nozzleSizeSelect = document.getElementById('nozzleSize');
    const operatingPsiInput = document.getElementById('operatingPsi');
    
    const calculateBtn = document.getElementById('calculateBtn');
    const saveLogBtn = document.getElementById('saveLogBtn');
    const resetBtn = document.getElementById('resetBtn');
    const clearLogBtn = document.getElementById('clearLogBtn');
    
    const resAbrasiveWeight = document.getElementById('resAbrasiveWeight');
    const resAbrasiveKg = document.getElementById('resAbrasiveKg');
    const resCfm = document.getElementById('resCfm');
    const resTime = document.getElementById('resTime');
    const resRecycle = document.getElementById('resRecycle');
    const resVelocity = document.getElementById('resVelocity');
    const resHardness = document.getElementById('resHardness');
    const resHelmet = document.getElementById('resHelmet');
    const resDust = document.getElementById('resDust');
    
    const logList = document.getElementById('logList');
    
    let savedLogs = JSON.parse(localStorage.getItem('auragrit_logs')) || [];
    
    const mediaData = {
        glassBead: { name: 'Glass Bead', lbsPerSqFt: 2.2, cfmMultiplier: 0.9, recycleCount: '4 - 6 cycles', hardness: 'Mohs 5.5', dust: 'Low' },
        aluminumOxide: { name: 'Aluminum Oxide', lbsPerSqFt: 3.5, cfmMultiplier: 1.2, recycleCount: '8 - 10 cycles', hardness: 'Mohs 9.0', dust: 'Moderate' },
        garnet: { name: 'Garnet', lbsPerSqFt: 2.8, cfmMultiplier: 1.0, recycleCount: '5 - 7 cycles', hardness: 'Mohs 8.0', dust: 'Very Low' },
        walnutShell: { name: 'Walnut Shell', lbsPerSqFt: 1.2, cfmMultiplier: 0.8, recycleCount: '2 - 3 cycles', hardness: 'Mohs 3.0', dust: 'Minimal' },
        steelShot: { name: 'Steel Shot', lbsPerSqFt: 5.0, cfmMultiplier: 1.4, recycleCount: '50+ cycles', hardness: 'Mohs 6.0 (HRC 40-50)', dust: 'Very Low' }
    };
    
    const coatingFactors = {
        light: 0.7,
        medium: 1.0,
        heavy: 1.6,
        sensitive: 0.4
    };
    
    const nozzleCfms = {
        nozzle2: 26,
        nozzle3: 52,
        nozzle4: 92,
        nozzle5: 145,
        nozzle6: 215,
        nozzle8: 380
    };
    
    function calculate() {
        let area = parseFloat(surfaceAreaInput.value) || 0;
        const unit = areaUnitSelect.value;
        
        // Convert to sq ft for baseline calc if sq meters
        if (unit === 'sqm') {
            area = area * 10.7639;
        }
        
        const mediaKey = mediaTypeSelect.value;
        const coatingKey = coatingConditionSelect.value;
        const nozzleKey = nozzleSizeSelect.value;
        const psi = parseFloat(operatingPsiInput.value) || 90;
        
        const media = mediaData[mediaKey] || mediaData.aluminumOxide;
        const coatingMult = coatingFactors[coatingKey] || 1.0;
        
        // Consumption calculation
        const totalLbs = area * media.lbsPerSqFt * coatingMult;
        const totalKg = totalLbs * 0.453592;
        
        // CFM requirement adjusted by operating pressure relative to standard 90 PSI
        const baseCfm = nozzleCfms[nozzleKey] || 92;
        const psiRatio = Math.sqrt(psi / 90);
        const requiredCfm = Math.round(baseCfm * psiRatio * media.cfmMultiplier);
        
        // Blast Duration estimate (sq ft per minute cleaned approx based on media & coating)
        const cleanRateSqFtPerMin = (15 / coatingMult) * (90 / psi) * (media.lbsPerSqFt > 3 ? 0.8 : 1.2);
        const totalMinutes = area / cleanRateSqFtPerMin;
        
        let timeFormatted = '';
        if (totalMinutes < 60) {
            timeFormatted = `${Math.round(totalMinutes)} minutes`;
        } else {
            const hrs = Math.floor(totalMinutes / 60);
            const mins = Math.round(totalMinutes % 60);
            timeFormatted = `${hrs} hr ${mins} min`;
        }
        
        // Nozzle exit velocity approximation (FPS)
        const velocityFps = Math.round(Math.sqrt(psi * 200) * (baseCfm / 50));
        
        // Display Results
        resAbrasiveWeight.textContent = `${Math.round(totalLbs).toLocaleString()} lbs`;
        resAbrasiveKg.textContent = `(${Math.round(totalKg).toLocaleString()} kg)`;
        resCfm.textContent = `${requiredCfm} CFM`;
        resTime.textContent = timeFormatted;
        resRecycle.textContent = media.recycleCount;
        resVelocity.textContent = `${velocityFps} ft/sec (~${Math.round(velocityFps * 0.3048)} m/s)`;
        resHardness.textContent = media.hardness;
        resDust.textContent = media.dust;
        
        return {
            area: surfaceAreaInput.value + ' ' + (unit === 'sqft' ? 'sq ft' : 'sq m'),
            media: media.name,
            weight: Math.round(totalLbs) + ' lbs',
            cfm: requiredCfm + ' CFM'
        };
    }
    
    function renderLogs() {
        if (savedLogs.length === 0) {
            logList.innerHTML = '<p class="empty-log">No saved runs yet. Configure parameters and click Save Session.</p>';
            return;
        }
        
        logList.innerHTML = '';
        savedLogs.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'log-item';
            div.innerHTML = `
                <div class="log-details">
                    <span><strong>Area:</strong> ${item.area}</span>
                    <span><strong>Media:</strong> ${item.media}</span>
                    <span><strong>Est. Weight:</strong> ${item.weight}</span>
                    <span><strong>CFM:</strong> ${item.cfm}</span>
                </div>
                <button class="text-btn delete-log" data-index="${index}">Remove</button>
            `;
            logList.appendChild(div);
        });
        
        document.querySelectorAll('.delete-log').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                savedLogs.splice(idx, 1);
                localStorage.setItem('auragrit_logs', JSON.stringify(savedLogs));
                renderLogs();
            });
        });
    }
    
    calculateBtn.addEventListener('click', calculate);
    
    // Auto calculate on change
    [surfaceAreaInput, areaUnitSelect, substrateTypeSelect, coatingConditionSelect, mediaTypeSelect, nozzleSizeSelect, operatingPsiInput].forEach(el => {
        el.addEventListener('change', calculate);
    });
    
    saveLogBtn.addEventListener('click', () => {
        const currentRun = calculate();
        savedLogs.unshift(currentRun);
        if (savedLogs.length > 20) savedLogs.pop();
        localStorage.setItem('auragrit_logs', JSON.stringify(savedLogs));
        renderLogs();
    });
    
    clearLogBtn.addEventListener('click', () => {
        savedLogs = [];
        localStorage.removeItem('auragrit_logs');
        renderLogs();
    });
    
    resetBtn.addEventListener('click', () => {
        surfaceAreaInput.value = '120';
        areaUnitSelect.value = 'sqft';
        substrateTypeSelect.value = 'steel';
        coatingConditionSelect.value = 'medium';
        mediaTypeSelect.value = 'aluminumOxide';
        nozzleSizeSelect.value = 'nozzle4';
        operatingPsiInput.value = '90';
        calculate();
    });
    
    // Initial calculation
    calculate();
    renderLogs();
});
