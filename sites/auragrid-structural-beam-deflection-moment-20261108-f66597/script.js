document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const supportTypeSelect = document.getElementById('supportType');
    const beamSpanInput = document.getElementById('beamSpan');
    const profileTypeSelect = document.getElementById('profileType');
    const profileDimensionsContainer = document.getElementById('profileDimensionsContainer');
    const materialSelect = document.getElementById('materialSelect');
    const elasticModulusInput = document.getElementById('elasticModulus');
    const allowableStressInput = document.getElementById('allowableStress');
    const loadTypeSelect = document.getElementById('loadType');
    const loadMagnitudeInput = document.getElementById('loadMagnitude');
    const loadPositionGroup = document.getElementById('loadPositionGroup');
    const loadPositionInput = document.getElementById('loadPosition');
    const loadUnitLabel = document.getElementById('loadUnitLabel');
    
    const btnCalculate = document.getElementById('btnCalculate');
    const btnSavePreset = document.getElementById('btnSavePreset');
    const presetsContainer = document.getElementById('presetsContainer');
    
    // Metrics Elements
    const resDeflection = document.getElementById('resDeflection');
    const resDeflectionRatio = document.getElementById('resDeflectionRatio');
    const resStress = document.getElementById('resStress');
    const resSafetyFactor = document.getElementById('resSafetyFactor');
    const resMoment = document.getElementById('resMoment');
    const resInertia = document.getElementById('resInertia');
    const resArea = document.getElementById('resArea');
    
    // Canvas & Tabs
    const canvas = document.getElementById('beamCanvas');
    const ctx = canvas.getContext('2d');
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    let currentActiveView = 'deflection';
    let lastCalculation = null;
    let savedPresets = [];

    // Material Presets Data (E in GPa, Allowable in MPa)
    const materials = {
        'structural-steel': { e: 200, yield: 250 },
        'aluminum': { e: 69, yield: 270 },
        'douglas-fir': { e: 13, yield: 45 },
        'concrete': { e: 25, yield: 15 },
        'custom': { e: 200, yield: 200 }
    };

    // Render Profile Input Fields based on selection
    function renderProfileInputs() {
        const type = profileTypeSelect.value;
        let html = '';
        
        if (type === 'rectangular') {
            html = `
                <div class="dimension-row">
                    <div class="input-group">
                        <label for="profWidth">Width (b) [mm]</label>
                        <input type="number" id="profWidth" value="100" min="10" max="2000" step="5">
                    </div>
                    <div class="input-group">
                        <label for="profHeight">Height (h) [mm]</label>
                        <input type="number" id="profHeight" value="200" min="10" max="2000" step="5">
                    </div>
                </div>
            `;
        } else if (type === 'i-beam') {
            html = `
                <div class="dimension-row">
                    <div class="input-group">
                        <label for="profWidth">Flange Width [mm]</label>
                        <input type="number" id="profWidth" value="120" min="10" max="2000" step="5">
                    </div>
                    <div class="input-group">
                        <label for="profHeight">Total Height [mm]</label>
                        <input type="number" id="profHeight" value="250" min="10" max="2000" step="5">
                    </div>
                </div>
                <div class="dimension-row">
                    <div class="input-group">
                        <label for="profWebThick">Web Thickness [mm]</label>
                        <input type="number" id="profWebThick" value="8" min="2" max="100" step="1">
                    </div>
                    <div class="input-group">
                        <label for="profFlangeThick">Flange Thickness [mm]</label>
                        <input type="number" id="profFlangeThick" value="12" min="2" max="100" step="1">
                    </div>
                </div>
            `;
        } else if (type === 'hollow-tube') {
            html = `
                <div class="dimension-row">
                    <div class="input-group">
                        <label for="profWidth">Outer Width (b) [mm]</label>
                        <input type="number" id="profWidth" value="150" min="10" max="2000" step="5">
                    </div>
                    <div class="input-group">
                        <label for="profHeight">Outer Height (h) [mm]</label>
                        <input type="number" id="profHeight" value="150" min="10" max="2000" step="5">
                    </div>
                </div>
                <div class="input-group">
                    <label for="profWallThick">Wall Thickness (t) [mm]</label>
                    <input type="number" id="profWallThick" value="10" min="2" max="100" step="1">
                </div>
            `;
        } else if (type === 'circular') {
            html = `
                <div class="input-group">
                    <label for="profDiameter">Diameter (d) [mm]</label>
                    <input type="number" id="profDiameter" value="150" min="10" max="2000" step="5">
                </div>
            `;
        }
        
        profileDimensionsContainer.innerHTML = html;
        // Attach listeners to new inputs
        profileDimensionsContainer.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', calculateBeam);
        });
    }

    // Compute Section Properties (Area in cm^2, Inertia in cm^4, c in mm)
    function computeSectionProperties() {
        const type = profileTypeSelect.value;
        let I = 0; // cm^4
        let A = 0; // cm^2
        let c = 0; // mm (distance from neutral axis to extreme fiber)
        
        if (type === 'rectangular') {
            const b = parseFloat(document.getElementById('profWidth').value) / 10; // cm
            const h = parseFloat(document.getElementById('profHeight').value) / 10; // cm
            A = b * h;
            I = (b * Math.pow(h, 3)) / 12;
            c = (h * 10) / 2;
        } else if (type === 'i-beam') {
            const bf = parseFloat(document.getElementById('profWidth').value) / 10;
            const h = parseFloat(document.getElementById('profHeight').value) / 10;
            const tw = parseFloat(document.getElementById('profWebThick').value) / 10;
            const tf = parseFloat(document.getElementById('profFlangeThick').value) / 10;
            
            const hw = h - (2 * tf);
            A = (2 * bf * tf) + (hw * tw);
            // I = I_total - I_voids
            I = ((bf * Math.pow(h, 3)) / 12) - (((bf - tw) * Math.pow(hw, 3)) / 12);
            c = (h * 10) / 2;
        } else if (type === 'hollow-tube') {
            const B = parseFloat(document.getElementById('profWidth').value) / 10;
            const H = parseFloat(document.getElementById('profHeight').value) / 10;
            const t = parseFloat(document.getElementById('profWallThick').value) / 10;
            
            const b_inner = B - (2 * t);
            const h_inner = H - (2 * t);
            A = (B * H) - (b_inner * h_inner);
            I = ((B * Math.pow(H, 3)) / 12) - ((b_inner * Math.pow(h_inner, 3)) / 12);
            c = (H * 10) / 2;
        } else if (type === 'circular') {
            const d = parseFloat(document.getElementById('profDiameter').value) / 10; // cm
            A = (Math.PI * Math.pow(d, 2)) / 4;
            I = (Math.PI * Math.pow(d, 4)) / 64;
            c = (d * 10) / 2;
        }
        
        return { I, A, c };
    }

    // Main Calculation Engine
    function calculateBeam() {
        const support = supportTypeSelect.value;
        const L = parseFloat(beamSpanInput.value); // meters
        const E = parseFloat(elasticModulusInput.value) * 1e9; // Pa (N/m^2)
        const allowable = parseFloat(allowableStressInput.value) * 1e6; // Pa
        const loadType = loadTypeSelect.value;
        const q_or_p = parseFloat(loadMagnitudeInput.value); // kN/m or kN
        
        const sec = computeSectionProperties();
        // Convert I from cm^4 to m^4: 1 cm^4 = 1e-8 m^4
        const I_m4 = sec.I * 1e-8;
        const c_m = sec.c * 1e-3; // mm to m
        
        let maxDeflection = 0; // meters
        let maxMoment = 0;     // kN*m
        
        const L_mm = L * 1000;
        
        if (support === 'simply-supported') {
            if (loadType === 'udl') {
                // q in kN/m -> N/m is q_or_p * 1000
                const q = q_or_p * 1000;
                maxDeflection = (5 * q * Math.pow(L, 4)) / (384 * E * I_m4);
                maxMoment = (q_or_p * Math.pow(L, 2)) / 8;
            } else if (loadType === 'point-center') {
                const P = q_or_p * 1000; // N
                maxDeflection = (P * Math.pow(L, 3)) / (48 * E * I_m4);
                maxMoment = (q_or_p * L) / 4;
            } else if (loadType === 'point-arbitrary') {
                let a = parseFloat(loadPositionInput.value);
                if (a >= L) a = L - 0.1;
                if (a <= 0) a = 0.1;
                const b = L - a;
                const P = q_or_p * 1000;
                maxDeflection = (P * Math.pow(a, 2) * Math.pow(b, 2)) / (3 * E * I_m4 * L);
                maxMoment = (q_or_p * a * b) / L;
            }
        } else if (support === 'cantilever') {
            if (loadType === 'udl') {
                const q = q_or_p * 1000;
                maxDeflection = (q * Math.pow(L, 4)) / (8 * E * I_m4);
                maxMoment = (q_or_p * Math.pow(L, 2)) / 2;
            } else if (loadType === 'point-center' || loadType === 'point-arbitrary') {
                // For cantilever, treat loadPosition as distance from fixed base (or free end if configured, let's treat as distance from fixed wall)
                let a = parseFloat(loadPositionInput.value);
                if (a > L) a = L;
                const P = q_or_p * 1000;
                maxDeflection = (P * Math.pow(a, 3)) / (3 * E * I_m4);
                maxMoment = q_or_p * a;
            }
        } else if (support === 'fixed-fixed') {
            if (loadType === 'udl') {
                const q = q_or_p * 1000;
                maxDeflection = (q * Math.pow(L, 4)) / (384 * E * I_m4);
                maxMoment = (q_or_p * Math.pow(L, 2)) / 12;
            } else if (loadType === 'point-center') {
                const P = q_or_p * 1000;
                maxDeflection = (P * Math.pow(L, 3)) / (192 * E * I_m4);
                maxMoment = (q_or_p * L) / 8;
            } else if (loadType === 'point-arbitrary') {
                let a = parseFloat(loadPositionInput.value);
                if (a >= L) a = L - 0.1;
                const b = L - a;
                const P = q_or_p * 1000;
                maxDeflection = (P * Math.pow(a, 3) * Math.pow(b, 3)) / (3 * E * I_m4 * Math.pow(L, 3));
                maxMoment = (q_or_p * a * Math.pow(b, 2)) / Math.pow(L, 2);
            }
        }
        
        // Bending Stress sigma = (M * c) / I
        // M in kN*m -> N*m is maxMoment * 1000
        // I in m^4, c in m
        const maxStressPa = ((maxMoment * 1000) * c_m) / I_m4;
        const maxStressMPa = maxStressPa / 1e6;
        const safetyFactor = allowable / maxStressPa;
        const deflectionMm = maxDeflection * 1000;
        const spanRatio = L_mm / deflectionMm;
        
        // Update UI Metrics
        resDeflection.textContent = deflectionMm.toFixed(2) + ' mm';
        resDeflectionRatio.textContent = 'Span / ' + Math.round(spanRatio);
        resStress.textContent = maxStressMPa.toFixed(2) + ' MPa';
        resSafetyFactor.textContent = 'FS: ' + safetyFactor.toFixed(2) + (safetyFactor >= 1.5 ? ' (Safe)' : ' (Warning)');
        resSafetyFactor.style.color = safetyFactor >= 1.5 ? 'var(--success)' : 'var(--danger)';
        resMoment.textContent = maxMoment.toFixed(2) + ' kN·m';
        resInertia.textContent = sec.I.toFixed(1) + ' cm^4';
        resArea.textContent = 'Area: ' + sec.A.toFixed(1) + ' cm^2';
        
        lastCalculation = {
            support,
            L,
            loadType,
            q_or_p,
            deflectionMm,
            maxStressMPa,
            maxMoment,
            I: sec.I
        };
        
        drawCanvas();
    }

    // Canvas Drawing Routine
    function drawCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const width = canvas.width;
        const height = canvas.height;
        const padding = 60;
        const drawWidth = width - (padding * 2);
        const beamY = height / 2;
        
        // Draw neutral axis line
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(padding, beamY);
        ctx.lineTo(width - padding, beamY);
        ctx.stroke();
        ctx.setLineDash([]);
        
        if (!lastCalculation) return;
        
        const L = lastCalculation.L;
        const support = lastCalculation.support;
        
        // Draw Supports
        ctx.fillStyle = '#94a3b8';
        if (support === 'simply-supported') {
            // Left Pin
            ctx.beginPath();
            ctx.moveTo(padding, beamY + 15);
            ctx.lineTo(padding - 10, beamY + 30);
            ctx.lineTo(padding + 10, beamY + 30);
            ctx.closePath();
            ctx.fill();
            // Right Roller
            ctx.beginPath();
            ctx.moveTo(width - padding, beamY + 15);
            ctx.lineTo(width - padding - 10, beamY + 30);
            ctx.lineTo(width - padding + 10, beamY + 30);
            ctx.closePath();
            ctx.fill();
        } else if (support === 'cantilever') {
            // Wall on left
            ctx.fillStyle = '#334155';
            ctx.fillRect(padding - 15, beamY - 40, 15, 80);
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3;
            ctx.strokeRect(padding - 15, beamY - 40, 15, 80);
        } else if (support === 'fixed-fixed') {
            // Walls on both ends
            ctx.fillStyle = '#334155';
            ctx.fillRect(padding - 15, beamY - 40, 15, 80);
            ctx.fillRect(width - padding, beamY - 40, 15, 80);
        }

        if (currentActiveView === 'deflection') {
            // Draw Deflected Beam Profile (Exaggerated curve)
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 4;
            ctx.beginPath();
            
            const steps = 100;
            for (let i = 0; i <= steps; i++) {
                const ratio = i / steps;
                const xPos = padding + (drawWidth * ratio);
                
                // Shape function approximation for visual deformation
                let defFactor = Math.sin(ratio * Math.PI);
                if (support === 'cantilever') defFactor = Math.pow(ratio, 2);
                if (support === 'fixed-fixed') defFactor = Math.pow(Math.sin(ratio * Math.PI), 1.2);
                
                const maxDeflPx = 50; // visual scaling
                const yPos = beamY + (defFactor * (lastCalculation.deflectionMm / 10) * (maxDeflPx / 5));
                
                if (i === 0) ctx.moveTo(xPos, yPos);
                else ctx.lineTo(xPos, yPos);
            }
            ctx.stroke();
            
            // Label Max Deflection
            ctx.fillStyle = '#f8fafc';
            ctx.font = '12px system-ui';
            ctx.fillText(`Max Defl: ${lastCalculation.deflectionMm.toFixed(2)} mm`, width / 2 - 50, beamY + 70);
            
        } else if (currentActiveView === 'moment') {
            // Draw Bending Moment Diagram
            ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(padding, beamY);
            
            const steps = 100;
            for (let i = 0; i <= steps; i++) {
                const ratio = i / steps;
                const xPos = padding + (drawWidth * ratio);
                let mCurve = Math.sin(ratio * Math.PI);
                if (support === 'cantilever') mCurve = 1 - ratio;
                const yPos = beamY + (mCurve * 60);
                ctx.lineTo(xPos, yPos);
            }
            ctx.lineTo(width - padding, beamY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = '#f8fafc';
            ctx.font = '12px system-ui';
            ctx.fillText(`Max Bending Moment: ${lastCalculation.maxMoment.toFixed(2)} kN·m`, width / 2 - 80, beamY + 90);
            
        } else if (currentActiveView === 'shear') {
            // Draw Shear Force Diagram
            ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(padding, beamY);
            
            const steps = 100;
            for (let i = 0; i <= steps; i++) {
                const ratio = i / steps;
                const xPos = padding + (drawWidth * ratio);
                let vCurve = 1 - (2 * ratio);
                if (support === 'cantilever') vCurve = 1 - ratio;
                const yPos = beamY + (vCurve * 50);
                ctx.lineTo(xPos, yPos);
            }
            ctx.lineTo(width - padding, beamY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            ctx.fillStyle = '#f8fafc';
            ctx.font = '12px system-ui';
            ctx.fillText(`Shear Force Diagram (V)`, width / 2 - 60, beamY + 90);
        }
    }

    // Event Listeners for Controls
    supportTypeSelect.addEventListener('change', calculateBeam);
    beamSpanInput.addEventListener('input', calculateBeam);
    profileTypeSelect.addEventListener('change', () => {
        renderProfileInputs();
        calculateBeam();
    });
    
    materialSelect.addEventListener('change', () => {
        const mat = materials[materialSelect.value];
        if (mat) {
            elasticModulusInput.value = mat.e;
            allowableStressInput.value = mat.yield;
            calculateBeam();
        }
    });
    
    elasticModulusInput.addEventListener('input', calculateBeam);
    allowableStressInput.addEventListener('input', calculateBeam);
    
    loadTypeSelect.addEventListener('change', () => {
        const val = loadTypeSelect.value;
        if (val === 'udl') {
            loadUnitLabel.textContent = 'kN/m';
            loadPositionGroup.style.display = 'none';
        } else if (val === 'point-center') {
            loadUnitLabel.textContent = 'kN';
            loadPositionGroup.style.display = 'none';
        } else if (val === 'point-arbitrary') {
            loadUnitLabel.textContent = 'kN';
            loadPositionGroup.style.display = 'flex';
        }
        calculateBeam();
    });
    
    loadMagnitudeInput.addEventListener('input', calculateBeam);
    loadPositionInput.addEventListener('input', calculateBeam);
    
    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentActiveView = btn.getAttribute('data-view');
            drawCanvas();
        });
    });

    // Save Preset Functionality
    btnSavePreset.addEventListener('click', () => {
        if (!lastCalculation) return;
        const presetName = prompt('Enter preset name:', `Beam span ${lastCalculation.L}m (${lastCalculation.support})`);
        if (!presetName) return;
        
        savedPresets.push({
            name: presetName,
            support: lastCalculation.support,
            span: lastCalculation.L,
            deflection: lastCalculation.deflectionMm.toFixed(2),
            stress: lastCalculation.maxStressMPa.toFixed(2)
        });
        
        renderPresets();
    });

    function renderPresets() {
        if (savedPresets.length === 0) {
            presetsContainer.innerHTML = '<p class="empty-presets">No saved presets yet. Configure a beam and click \'Save Preset\'.</p>';
            return;
        }
        
        presetsContainer.innerHTML = '';
        savedPresets.forEach((p, idx) => {
            const chip = document.createElement('div');
            chip.className = 'preset-chip';
            chip.innerHTML = `
                <span class="preset-title">${p.name}</span>
                <span class="preset-desc">Span: ${p.span}m | Defl: ${p.deflection}mm</span>
            `;
            presetsContainer.appendChild(chip);
        });
    }

    // Initial setup
    renderProfileInputs();
    calculateBeam();
});
