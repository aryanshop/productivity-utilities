document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const brewMethodSelect = document.getElementById('brew-method');
    const calcModeSelect = document.getElementById('calc-mode');
    const coffeeDoseInput = document.getElementById('coffee-dose');
    const brewYieldInput = document.getElementById('brew-yield');
    const ratioOverrideInput = document.getElementById('ratio-override');
    const waterTempInput = document.getElementById('water-temp');
    const roastLevelSelect = document.getElementById('roast-level');
    
    const inputGroupDose = document.getElementById('input-group-dose');
    const inputGroupYield = document.getElementById('input-group-yield');
    
    const resDose = document.getElementById('res-dose');
    const resWater = document.getElementById('res-water');
    const resRatio = document.getElementById('res-ratio');
    const resExtraction = document.getElementById('res-extraction');
    const resGrind = document.getElementById('res-grind');
    const resBloom = document.getElementById('res-bloom');
    const pourScheduleList = document.getElementById('pour-schedule-list');
    
    const canvas = document.getElementById('extraction-canvas');
    const ctx = canvas.getContext('2d');
    const measuredTdsInput = document.getElementById('measured-tds');
    const measuredYieldInput = document.getElementById('measured-yield');
    
    const timerClock = document.getElementById('timer-clock');
    const timerStatus = document.getElementById('timer-status');
    const btnStartTimer = document.getElementById('btn-start-timer');
    const btnPauseTimer = document.getElementById('btn-pause-timer');
    const btnResetTimer = document.getElementById('btn-reset-timer');
    const audioCuesCheckbox = document.getElementById('audio-cues');
    
    const btnSaveLog = document.getElementById('btn-save-log');
    const btnClearLogs = document.getElementById('btn-clear-logs');
    const logTableBody = document.getElementById('log-table-body');

    // Preset Default Ratios
    const methodPresets = {
        v60: { ratio: 16.0, grind: 'Medium-Fine (table salt)', temp: 93 },
        chemex: { ratio: 16.5, grind: 'Medium-Coarse (rough sand)', temp: 94 },
        aeropress: { ratio: 14.0, grind: 'Fine to Medium-Fine', temp: 88 },
        frenchpress: { ratio: 15.0, grind: 'Coarse (sea salt crystals)', temp: 95 },
        espresso: { ratio: 2.0, grind: 'Very Fine (powder)', temp: 92 },
        coldbrew: { ratio: 8.0, grind: 'Coarse', temp: 20 }
    };

    // Audio Context for Chimes
    let audioCtx = null;
    function playChime(freq = 587.33, duration = 0.15) {
        if (!audioCuesCheckbox.checked) return;
        try {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) {
            // Audio context failed or blocked
        }
    }

    // Calculations
    function calculateBrew() {
        const method = brewMethodSelect.value;
        const mode = calcModeSelect.value;
        let ratio = parseFloat(ratioOverrideInput.value) || 16;
        
        let dose = 0;
        let water = 0;

        if (mode === 'dose') {
            dose = parseFloat(coffeeDoseInput.value) || 20;
            water = dose * ratio;
            brewYieldInput.value = water.toFixed(1);
        } else {
            water = parseFloat(brewYieldInput.value) || 320;
            dose = water / ratio;
            coffeeDoseInput.value = dose.toFixed(1);
        }

        // UI Updates
        resDose.textContent = `${dose.toFixed(1)}g`;
        resWater.textContent = `${water.toFixed(1)}g`;
        resRatio.textContent = `1 : ${ratio.toFixed(1)}`;

        // Extraction estimate based on parameters
        let estExt = 19.5;
        if (ratio > 17) estExt -= 1.2;
        if (ratio < 14 && method !== 'espresso') estExt += 1.5;
        if (roastLevelSelect.value === 'light') estExt -= 0.8;
        if (roastLevelSelect.value === 'dark') estExt += 1.0;
        resExtraction.textContent = `${estExt.toFixed(1)}%`;

        // Grind & Bloom details
        const preset = methodPresets[method] || methodPresets.v60;
        resGrind.textContent = preset.grind;

        if (method === 'espresso' || method === 'coldbrew') {
            resBloom.textContent = method === 'espresso' ? 'Pre-infusion enabled (5s)' : 'Steep 12-24 hours in cold water';
        } else {
            const bloomWater = (dose * 2).toFixed(0);
            resBloom.textContent = `${bloomWater}g water (Wait 30-45s for degassing)`;
        }

        generatePourSchedule(method, water);
        drawExtractionCanvas();
    }

    function generatePourSchedule(method, totalWater) {
        pourScheduleList.innerHTML = '';
        let schedule = [];

        if (method === 'v60' || method === 'chemex') {
            const bloom = Math.round(parseFloat(coffeeDoseInput.value) * 2);
            const p1 = Math.round(totalWater * 0.4);
            const p2 = Math.round(totalWater);
            schedule = [
                { time: '0:00', label: `Bloom: Pour ${bloom}g water. Swirl gently.` },
                { time: '0:45', label: `1st Pour: Up to ${p1}g in concentric circles.` },
                { time: '1:30', label: `Final Pour: Up to ${p2}g. Gentle swirl at finish.` },
                { time: '3:00', label: 'Drawdown complete.' }
            ];
        } else if (method === 'aeropress') {
            schedule = [
                { time: '0:00', label: `Pour water to 220g. Stir 10 times.` },
                { time: '1:00', label: `Attach filter cap, flip, and press gently for 30s.` },
                { time: '1:30', label: 'Extraction finished.' }
            ];
        } else if (method === 'frenchpress') {
            schedule = [
                { time: '0:00', label: `Pour all ${totalWater}g water saturating coffee grounds.` },
                { time: '4:00', label: 'Break crust, scoop floating foam, insert plunger.' },
                { time: '5:00', label: 'Decant immediately into carafe.' }
            ];
        } else {
            schedule = [
                { time: '0:00', label: `Start shot extraction (${totalWater}g yield target).` },
                { time: '0:28', label: 'Target extraction window reached.' }
            ];
        }

        schedule.forEach(item => {
            const li = document.createElement('li');
            li.className = 'schedule-item';
            li.innerHTML = `<span><strong>${item.time}</strong></span> <span>${item.label}</span>`;
            pourScheduleList.appendChild(li);
        });
    }

    // Canvas Extraction Matrix Renderer
    function drawExtractionCanvas() {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Background Grid
        ctx.fillStyle = '#181412';
        ctx.fillRect(0, 0, w, h);

        // Draw Ideal Extraction Box (18-22% Ext, 1.15-1.45 TDS for filter)
        // Map range: Ext 14% to 26%, TDS 0.6 to 2.2
        const mapX = (ext) => ((ext - 14) / 12) * w;
        const mapY = (tds) => h - ((tds - 0.6) / 1.6) * h;

        // Ideal Zone Rect
        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
        const x1 = mapX(18);
        const y1 = mapY(1.45);
        const x2 = mapX(22);
        const y2 = mapY(1.15);
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1);

        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        // Grid lines
        ctx.strokeStyle = '#2d2520';
        ctx.lineWidth = 1;
        for (let e = 15; e < 26; e += 2) {
            const cx = mapX(e);
            ctx.beginPath();
            ctx.moveTo(cx, 0);
            ctx.lineTo(cx, h);
            ctx.stroke();
        }
        for (let t = 0.8; t < 2.2; t += 0.3) {
            const cy = mapY(t);
            ctx.beginPath();
            ctx.moveTo(0, cy);
            ctx.lineTo(w, cy);
            ctx.stroke();
        }

        // Labels
        ctx.fillStyle = '#8a7d6b';
        ctx.font = '10px sans-serif';
        ctx.fillText('Under-extracted', 15, 25);
        ctx.fillText('Over-extracted', w - 95, h - 15);
        ctx.fillText('Ideal Zone', x1 + 10, y1 + 18);

        // Plot User Point
        const userTds = parseFloat(measuredTdsInput.value) || 1.35;
        const userExt = parseFloat(measuredYieldInput.value) || 20.2;
        const px = mapX(userExt);
        const py = mapY(userTds);

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Brew Timer Logic
    let timerInterval = null;
    let totalSeconds = 0;
    let timerRunning = false;

    function formatTime(sec) {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    function updateTimerDisplay() {
        timerClock.textContent = formatTime(totalSeconds);
        if (totalSeconds === 0) {
            timerStatus.textContent = 'Ready';
            timerStatus.style.color = 'var(--text-muted)';
        } else if (timerRunning) {
            timerStatus.textContent = 'Brewing in progress...';
            timerStatus.style.color = 'var(--accent-gold)';
        } else {
            timerStatus.textContent = 'Paused';
            timerStatus.style.color = 'var(--danger-color)';
        }

        // Audio cue triggers
        if (totalSeconds === 0) playChime(440, 0.1);
        if (totalSeconds === 45) playChime(587.33, 0.2); // Bloom finish / 1st pour
        if (totalSeconds === 90) playChime(659.25, 0.2); // 2nd pour
    }

    btnStartTimer.addEventListener('click', () => {
        if (!timerRunning) {
            timerRunning = true;
            btnStartTimer.textContent = 'Resume';
            btnPauseTimer.disabled = false;
            playChime(523.25, 0.15);
            timerInterval = setInterval(() => {
                totalSeconds++;
                updateTimerDisplay();
            }, 1000);
        }
    });

    btnPauseTimer.addEventListener('click', () => {
        if (timerRunning) {
            timerRunning = false;
            clearInterval(timerInterval);
            updateTimerDisplay();
        }
    });

    btnResetTimer.addEventListener('click', () => {
        timerRunning = false;
        clearInterval(timerInterval);
        totalSeconds = 0;
        btnStartTimer.textContent = 'Start Brew Timer';
        btnPauseTimer.disabled = true;
        updateTimerDisplay();
    });

    // Event Listeners for Configuration changes
    brewMethodSelect.addEventListener('change', () => {
        const method = brewMethodSelect.value;
        if (methodPresets[method]) {
            ratioOverrideInput.value = methodPresets[method].ratio;
            waterTempInput.value = methodPresets[method].temp;
        }
        calculateBrew();
    });

    calcModeSelect.addEventListener('change', () => {
        if (calcModeSelect.value === 'dose') {
            inputGroupDose.style.display = 'flex';
            inputGroupYield.style.display = 'none';
        } else {
            inputGroupDose.style.display = 'none';
            inputGroupYield.style.display = 'flex';
        }
        calculateBrew();
    });

    [coffeeDoseInput, brewYieldInput, ratioOverrideInput, waterTempInput, roastLevelSelect, measuredTdsInput, measuredYieldInput].forEach(el => {
        el.addEventListener('input', calculateBrew);
    });

    // Local Storage Brew Log Archive
    const LOCAL_STORAGE_KEY = 'aurabrew_logs_v1';

    function loadBrewLogs() {
        try {
            const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }

    function saveBrewLogs(logs) {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(logs));
        } catch (e) {}
    }

    function renderBrewLogs() {
        const logs = loadBrewLogs();
        logTableBody.innerHTML = '';
        if (logs.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="7" class="empty-row">No saved brews recorded yet.</td>';
            logTableBody.appendChild(tr);
            return;
        }

        logs.forEach((log, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${log.timeStr}</td>
                <td>${log.method}</td>
                <td>${log.dose}g</td>
                <td>${log.water}g</td>
                <td>1:${log.ratio}</td>
                <td>${log.temp}°C</td>
                <td><button class="btn btn-small btn-danger" data-index="${index}">Delete</button></td>
            `;
            logTableBody.appendChild(tr);
        });

        // Attach delete listeners
        logTableBody.querySelectorAll('button[data-index]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'), 10);
                const logs = loadBrewLogs();
                logs.splice(idx, 1);
                saveBrewLogs(logs);
                renderBrewLogs();
            });
        });
    }

    btnSaveLog.addEventListener('click', () => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newLog = {
            timeStr,
            method: brewMethodSelect.options[brewMethodSelect.selectedIndex].text.split(' ')[0],
            dose: coffeeDoseInput.value,
            water: brewYieldInput.value,
            ratio: ratioOverrideInput.value,
            temp: waterTempInput.value
        };
        const logs = loadBrewLogs();
        logs.unshift(newLog);
        saveBrewLogs(logs);
        renderBrewLogs();
        btnSaveLog.textContent = 'Saved!';
        setTimeout(() => { btnSaveLog.textContent = 'Save Brew to Local Log'; }, 1500);
    });

    btnClearLogs.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear your saved brew archive?')) {
            saveBrewLogs([]);
            renderBrewLogs();
        }
    });

    // Initial setup
    calculateBrew();
    renderBrewLogs();
});
