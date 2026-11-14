document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const brewMethodSelect = document.getElementById('brew-method');
    const calcModeBtns = document.querySelectorAll('.seg-btn');
    const inputGroupDose = document.getElementById('input-group-dose');
    const inputGroupYield = document.getElementById('input-group-yield');
    const coffeeDoseInput = document.getElementById('coffee-dose');
    const targetYieldInput = document.getElementById('target-yield');
    const customRatioSlider = document.getElementById('custom-ratio');
    const ratioValSpan = document.getElementById('ratio-val');
    const roastLevelSelect = document.getElementById('roast-level');
    const waterTempSlider = document.getElementById('water-temp');
    const tempDisplay = document.getElementById('temp-display');
    
    const outWater = document.getElementById('out-water');
    const outExtraction = document.getElementById('out-extraction');
    const outTds = document.getElementById('out-tds');
    const outGrind = document.getElementById('out-grind');
    
    const timelineContainer = document.getElementById('timeline-container');
    const coolingCanvas = document.getElementById('coolingCanvas');
    const btnSaveRecipe = document.getElementById('btn-save-recipe');
    const btnReset = document.getElementById('btn-reset');
    const recipeList = document.getElementById('recipe-list');

    let calcMode = 'dose'; // 'dose' or 'yield'

    // Preset defaults for brew methods
    const methodPresets = {
        v60: { ratio: 16, temp: 93, tds: 1.35, grind: 'Medium-Fine' },
        chemex: { ratio: 16.5, temp: 94, tds: 1.20, grind: 'Medium-Coarse' },
        frenchpress: { ratio: 15, temp: 95, tds: 1.45, grind: 'Coarse' },
        aeropress: { ratio: 13, temp: 88, tds: 1.60, grind: 'Fine' },
        espresso: { ratio: 2, temp: 92, tds: 9.50, grind: 'Ultra-Fine' },
        coldbrew: { ratio: 8, temp: 4, tds: 4.50, grind: 'Extra Coarse' }
    };

    // Switch calculation mode
    calcModeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            calcModeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            calcMode = btn.getAttribute('data-mode');
            
            if (calcMode === 'dose') {
                inputGroupDose.classList.remove('hidden');
                inputGroupYield.classList.add('hidden');
            } else {
                inputGroupDose.classList.add('hidden');
                inputGroupYield.classList.remove('hidden');
            }
            calculateBrew();
        });
    });

    // Brew Method change handler
    brewMethodSelect.addEventListener('change', () => {
        const method = brewMethodSelect.value;
        const preset = methodPresets[method];
        if (preset) {
            customRatioSlider.value = preset.ratio;
            ratioValSpan.textContent = preset.ratio;
            waterTempSlider.value = preset.temp;
            tempDisplay.textContent = preset.temp + (method === 'coldbrew' ? '°C (Cold)' : '°C');
        }
        calculateBrew();
    });

    // Ratio slider handler
    customRatioSlider.addEventListener('input', () => {
        ratioValSpan.textContent = customRatioSlider.value;
        calculateBrew();
    });

    // Water temp slider handler
    waterTempSlider.addEventListener('input', () => {
        const method = brewMethodSelect.value;
        const val = waterTempSlider.value;
        tempDisplay.textContent = val + (method === 'coldbrew' ? '°C (Cold)' : '°C');
        calculateBrew();
    });

    coffeeDoseInput.addEventListener('input', calculateBrew);
    targetYieldInput.addEventListener('input', calculateBrew);
    roastLevelSelect.addEventListener('change', calculateBrew);

    function calculateBrew() {
        const method = brewMethodSelect.value;
        const ratio = parseFloat(customRatioSlider.value);
        const temp = parseInt(waterTempSlider.value);
        const roast = roastLevelSelect.value;

        let dose = 0;
        let water = 0;

        if (calcMode === 'dose') {
            dose = parseFloat(coffeeDoseInput.value) || 0;
            water = dose * ratio;
            targetYieldInput.value = Math.round(water);
        } else {
            water = parseFloat(targetYieldInput.value) || 0;
            dose = water / ratio;
            coffeeDoseInput.value = dose.toFixed(1);
        }

        // Extraction efficiency adjustment based on roast and temp
        let baseExt = 20.0;
        if (roast === 'light') baseExt -= 1.2;
        if (roast === 'dark') baseExt += 1.5;
        if (temp > 94) baseExt += 0.8;
        if (temp < 88) baseExt -= 1.0;

        // Clamp extraction between 16% and 23%
        const extraction = Math.min(Math.max(baseExt, 16.0), 23.0);

        // TDS estimation
        let baseTds = methodPresets[method].tds;
        if (method === 'espresso') {
            baseTds = 9.5 + (ratio < 2 ? 0.5 : -0.5);
        } else if (method === 'coldbrew') {
            baseTds = 4.5 + (ratio < 8 ? 0.5 : -0.5);
        } else {
            baseTds = (extraction * (dose / water)) * 0.85;
        }

        // Output metrics
        outWater.textContent = water.toFixed(0);
        outExtraction.textContent = extraction.toFixed(1);
        outTds.textContent = baseTds.toFixed(2);
        outGrind.textContent = methodPresets[method].grind;

        renderTimeline(method, dose, water);
        renderCoolingCurve(temp);
    }

    function renderTimeline(method, dose, totalWater) {
        timelineContainer.innerHTML = '';
        let steps = [];

        if (method === 'v60' || method === 'chemex') {
            const bloomWater = (dose * 2).toFixed(0);
            const firstPour = Math.round((totalWater - bloomWater) * 0.5);
            const secondPour = totalWater - bloomWater - firstPour;
            
            steps = [
                { time: '0:00', desc: 'Bloom Phase (Pour evenly, swirl gently)', water: `${bloomWater} g` },
                { time: '0:45', desc: 'First Main Pour (Spiral to outer edge)', water: `${firstPour} g` },
                { time: '1:30', desc: 'Final Pour (Center steady stream)', water: `${secondPour} g` },
                { time: '3:00', desc: 'Drawdown complete & flat bed check', water: `${totalWater.toFixed(0)} g Total` }
            ];
        } else if (method === 'frenchpress') {
            steps = [
                { time: '0:00', desc: 'Add all hot water rapidly, saturate all grounds', water: `${totalWater.toFixed(0)} g` },
                { time: '1:00', desc: 'Break crust, stir gently 3 times, skim foam', water: 'Crust Stir' },
                { time: '4:00', desc: 'Place lid on top (do not plunge yet)', water: 'Steep' },
                { time: '6:00', desc: 'Slow, steady press to bottom and serve', water: 'Complete' }
            ];
        } else if (method === 'aeropress') {
            steps = [
                { time: '0:00', desc: 'Inverted method: Add coffee and 50% water', water: `${(totalWater*0.5).toFixed(0)} g` },
                { time: '0:30', desc: 'Stir vigorously 10 times, add remaining water', water: `${(totalWater*0.5).toFixed(0)} g` },
                { time: '1:15', desc: 'Attach cap with filter, flip onto vessel', water: 'Flip' },
                { time: '1:30', desc: 'Gentle steady press until hiss sound', water: 'Complete' }
            ];
        } else if (method === 'espresso') {
            steps = [
                { time: '0:00', desc: 'Portafilter inserted, pump activated (9 bar)', water: 'Pre-infusion' },
                { time: '0:06', desc: 'First drops appear on naked portafilter', water: 'First Drip' },
                { time: '0:28', desc: 'Target extraction yield reached, cut shot', water: `${totalWater.toFixed(0)} ml` }
            ];
        } else {
            steps = [
                { time: '0:00', desc: 'Combine coarse grounds and cold filtered water', water: `${totalWater.toFixed(0)} g` },
                { time: '12h', desc: 'Refrigerate steep with airtight seal', water: 'Steeping' },
                { time: '24h', desc: 'Filter through paper or fine mesh cloth', water: 'Concentrate' }
            ];
        }

        steps.forEach(step => {
            const div = document.createElement('div');
            div.className = 'timeline-step';
            div.innerHTML = `
                <div class="step-info">
                    <span class="step-time">${step.time}</span>
                    <span class="step-desc">${step.desc}</span>
                </div>
                <span class="step-water">${step.water}</span>
            `;
            timelineContainer.appendChild(div);
        });
    }

    function renderCoolingCurve(initialTemp) {
        if (!coolingCanvas) return;
        const ctx = coolingCanvas.getContext('2d');
        const w = coolingCanvas.width;
        const h = coolingCanvas.height;

        ctx.clearRect(0, 0, w, h);

        // Background grid
        ctx.strokeStyle = '#26211d';
        ctx.lineWidth = 1;
        for (let x = 0; x < w; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 0; y < h; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Cooling simulation curve (exponential decay over 5 minutes)
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 3;
        ctx.beginPath();

        const roomTemp = 22;
        const maxTime = 300; // 5 minutes in seconds

        for (let px = 0; px < w; px++) {
            const t = (px / w) * maxTime;
            // Newton's law of cooling approximation
            const temp = roomTemp + (initialTemp - roomTemp) * Math.exp(-t / 600);
            // Map temp (20 to 100) to canvas height (h-20 to 20)
            const py = h - ((temp - 20) / 80) * (h - 40) - 20;

            if (px === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // Axis labels
        ctx.fillStyle = '#a8a29e';
        ctx.font = '11px sans-serif';
        ctx.fillText('0s', 10, h - 8);
        ctx.fillText('150s', w / 2 - 15, h - 8);
        ctx.fillText('300s', w - 35, h - 8);
        ctx.fillText(`${initialTemp}°C`, 10, 20);
    }

    // Save Recipe LocalStorage
    btnSaveRecipe.addEventListener('click', () => {
        const method = brewMethodSelect.value;
        const dose = coffeeDoseInput.value;
        const water = calcMode === 'dose' ? (dose * customRatioSlider.value).toFixed(0) : targetYieldInput.value;
        const ratio = customRatioSlider.value;
        const temp = waterTempSlider.value;
        const roast = roastLevelSelect.value;

        const recipe = {
            id: Date.now(),
            method: brewMethodSelect.options[brewMethodSelect.selectedIndex].text,
            dose,
            water,
            ratio,
            temp,
            roast,
            date: new Date().toLocaleDateString()
        };

        let saved = JSON.parse(localStorage.getItem('aurabrew_recipes') || '[]');
        saved.unshift(recipe);
        if (saved.max > 20) saved = saved.slice(0, 20);
        localStorage.setItem('aurabrew_recipes', JSON.stringify(saved));
        loadRecipes();
    });

    function loadRecipes() {
        const saved = JSON.parse(localStorage.getItem('aurabrew_recipes') || '[]');
        recipeList.innerHTML = '';

        if (saved.length === 0) {
            recipeList.innerHTML = '<p class="empty-state">No saved recipes yet. Configure your brew and click Save Recipe!</p>';
            return;
        }


        saved.forEach(rec => {
            const div = document.createElement('div');
            div.className = 'recipe-card';
            div.innerHTML = `
                <div class="recipe-details">
                    <h4>${rec.method} &bull; ${rec.dose}g dose / ${rec.water}g water</h4>
                    <p>Ratio 1:${rec.ratio} &bull; ${rec.temp}°C &bull; ${rec.roast} roast &bull; ${rec.date}</p>
                </div>
                <button class="btn-delete" data-id="${rec.id}" title="Delete recipe">✕</button>
            `;
            recipeList.appendChild(div);
        });

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                let saved = JSON.parse(localStorage.getItem('aurabrew_recipes') || '[]');
                saved = saved.filter(r => r.id !== id);
                localStorage.setItem('aurabrew_recipes', JSON.stringify(saved));
                loadRecipes();
            });
        });
    }

    // Reset defaults
    btnReset.addEventListener('click', () => {
        brewMethodSelect.value = 'v60';
        brewMethodSelect.dispatchEvent(new Event('change'));
        coffeeDoseInput.value = 20;
        targetYieldInput.value = 320;
        roastLevelSelect.value = 'medium';
        calculateBrew();
    });

    // Initial run
    calculateBrew();
    loadRecipes();
});
