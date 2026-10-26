document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const methodSelect = document.getElementById('brew-method');
    const coffeeDoseInput = document.getElementById('coffee-dose');
    const brewRatioInput = document.getElementById('brew-ratio');
    const waterTempInput = document.getElementById('water-temp');
    const grindSizeSelect = document.getElementById('grind-size');

    const resWater = document.getElementById('res-water');
    const resExtraction = document.getElementById('res-extraction');
    const resTds = document.getElementById('res-tds');

    const timerClock = document.getElementById('timer-clock');
    const timerStage = document.getElementById('timer-stage');
    const timerProgressRing = document.getElementById('timer-progress-ring');
    const btnStartTimer = document.getElementById('btn-start-timer');
    const btnPauseTimer = document.getElementById('btn-pause-timer');
    const btnResetTimer = document.getElementById('btn-reset-timer');
    const scheduleList = document.getElementById('schedule-list');

    const beanForm = document.getElementById('bean-form');
    const beanNameInput = document.getElementById('bean-name');
    const beanProcessInput = document.getElementById('bean-process');
    const beanRatingSelect = document.getElementById('bean-rating');
    const beanTbody = document.getElementById('bean-tbody');

    const btnExport = document.getElementById('btn-export');
    const btnImport = document.getElementById('btn-import');
    const fileInput = document.getElementById('file-input');

    // State
    let timerInterval = null;
    let totalSeconds = 0;
    let isRunning = false;
    let currentSteps = [];

    const defaultBeans = [
        { id: 1, name: 'Ethiopia Yirgacheffe Aricha', process: 'Washed • Floral & Bergamot', rating: '5' },
        { id: 2, name: 'Colombia Huila San Agustin', process: 'Honey • Dark Chocolate & Cherry', rating: '4' }
    ];

    let beanStash = JSON.parse(localStorage.getItem('aurabrew_stash')) || defaultBeans;

    // Method defaults configuration
    const methodDefaults = {
        v60: { ratio: 16, grind: 'Medium-Fine' },
        chemex: { ratio: 16.5, grind: 'Medium-Coarse' },
        frenchpress: { ratio: 15, grind: 'Coarse' },
        aeropress: { ratio: 14, grind: 'Medium' },
        espresso: { ratio: 2, grind: 'Fine' },
        coldbrew: { ratio: 8, grind: 'Coarse' }
    };

    // Audio context for gentle beep simulation via Web Audio API
    function playTone(freq = 440, duration = 0.15) {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            // Audio not allowed or unsupported without interaction
        }
    }

    // Calculations
    function calculateBrew() {
        const dose = parseFloat(coffeeDoseInput.value) || 0;
        const ratio = parseFloat(brewRatioInput.value) || 16;
        const totalWater = Math.round(dose * ratio);

        resWater.textContent = `${totalWater} g`;

        // Extraction & TDS estimations based on parameters
        let baseExt = 19.5;
        if (grindSizeSelect.value === 'Fine') baseExt = 21.5;
        if (grindSizeSelect.value === 'Coarse') baseExt = 18.0;
        resExtraction.textContent = `${baseExt.toFixed(1)}%`;

        let baseTds = 1.30;
        if (ratio < 12) baseTds = 1.60;
        else if (ratio > 17) baseTds = 1.20;
        resTds.textContent = `${baseTds.toFixed(2)}%`;

        generateSchedule(totalWater, methodSelect.value);
    }

    function generateSchedule(totalWater, method) {
        scheduleList.innerHTML = '';
        currentSteps = [];

        if (method === 'v60' || method === 'chemex') {
            const bloomWater = Math.min(totalWater * 0.25, 60);
            currentSteps = [
                { time: 0, text: `Pour ${Math.round(bloomWater)}g water (Bloom)`, duration: 30 },
                { time: 30, text: `Pour up to ${Math.round(totalWater * 0.6)}g`, duration: 60 },
                { time: 90, text: `Pour remaining up to ${totalWater}g`, duration: 60 },
                { time: 150, text: 'Drawdown complete & swirl', duration: 30 }
            ];
        } else if (method === 'frenchpress') {
            currentSteps = [
                { time: 0, text: `Pour all ${totalWater}g water rapidly`, duration: 240 },
                { time: 240, text: 'Break crust & plunge gently', duration: 30 }
            ];
        } else if (method === 'aeropress') {
            currentSteps = [
                { time: 0, text: `Pour water to ${totalWater}g & stir 10x`, duration: 60 },
                { time: 60, text: 'Attach cap, flip & press gently', duration: 60 }
            ];
        } else {
            currentSteps = [
                { time: 0, text: `Start extraction (${totalWater}g yield)`, duration: 30 }
            ];
        }

        currentSteps.forEach((step, idx) => {
            const li = document.createElement('li');
            li.className = 'schedule-item';
            li.dataset.time = step.time;
            li.innerHTML = `
                <span>${step.text}</span>
                <span class="schedule-time">${formatTime(step.time)}</span>
            `;
            scheduleList.appendChild(li);
        });
    }

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    // Timer control
    function updateTimerDisplay() {
        timerClock.textContent = formatTime(totalSeconds);

        // Ring progress (max 3 minutes or 180s visual loop)
        const maxTime = 180;
        const offset = 502 - (Math.min(totalSeconds, maxTime) / maxTime) * 502;
        timerProgressRing.style.strokeDashoffset = offset;

        // Update active schedule step
        const items = scheduleList.querySelectorAll('.schedule-item');
        let activeIndex = -1;

        currentSteps.forEach((step, idx) => {
            if (totalSeconds >= step.time) {
                activeIndex = idx;
            }
        });

        items.forEach((item, idx) => {
            if (idx === activeIndex) {
                item.classList.add('active');
                timerStage.textContent = currentSteps[idx].text;
            } else {
                item.classList.remove('active');
            }
        });
    }

    function startTimer() {
        if (isRunning) return;
        isRunning = true;
        btnStartTimer.textContent = 'Running...';
        btnStartTimer.disabled = true;
        btnPauseTimer.disabled = false;

        timerInterval = setInterval(() => {
            totalSeconds++;
            updateTimerDisplay();
            if (totalSeconds % 30 === 0) {
                playTone(587.33, 0.2); // D5 chime note on intervals
            }
        }, 1000);
    }

    function pauseTimer() {
        if (!isRunning) return;
        isRunning = false;
        clearInterval(timerInterval);
        btnStartTimer.textContent = 'Resume';
        btnStartTimer.disabled = false;
        btnPauseTimer.disabled = true;
    }

    function resetTimer() {
        pauseTimer();
        totalSeconds = 0;
        btnStartTimer.textContent = 'Start Brew';
        updateTimerDisplay();
    }

    // Bean Stash Management
    function renderStash() {
        beanTbody.innerHTML = '';
        beanStash.forEach((bean) => {
            const tr = document.createElement('tr');
            const stars = '★'.repeat(parseInt(bean.rating)) + '☆'.repeat(5 - parseInt(bean.rating));
            tr.innerHTML = `
                <td><strong>${escapeHtml(bean.name)}</strong></td>
                <td>${escapeHtml(bean.process || '-')}</td>
                <td style="color: var(--accent-color);">${stars}</td>
                <td><button class="btn-danger" data-id="${bean.id}">Remove</button></td>
            `;
            beanTbody.appendChild(tr);
        });
        localStorage.setItem('aurabrew_stash', JSON.stringify(beanStash));
    }

    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, tag => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[tag] || tag));
    }

    beanForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = beanNameInput.value.trim();
        const process = beanProcessInput.value.trim();
        const rating = beanRatingSelect.value;

        if (!name) return;

        const newBean = {
            id: Date.now(),
            name,
            process,
            rating
        };

        beanStash.unshift(newBean);
        renderStash();
        beanForm.reset();
    });

    beanTbody.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-danger')) {
            const id = Number(e.target.dataset.id);
            beanStash = beanStash.filter(b => b.id !== id);
            renderStash();
        }
    });

    // Export / Import JSON
    btnExport.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(beanStash, null, 2));
        const dlAnchor = document.createElement('a');
        dlAnchor.setAttribute("href", dataStr);
        dlAnchor.setAttribute("download", "aurabrew_stash_backup.json");
        document.body.appendChild(dlAnchor);
        dlAnchor.click();
        dlAnchor.remove();
    });

    btnImport.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                if (Array.isArray(parsed)) {
                    beanStash = parsed;
                    renderStash();
                }
            } catch (err) {
                alert('Invalid JSON backup file.');
            }
        };
        reader.readAsText(file);
    });

    // Event Listeners for parameters
    methodSelect.addEventListener('change', () => {
        const method = methodSelect.value;
        if (methodDefaults[method]) {
            brewRatioInput.value = methodDefaults[method].ratio;
            grindSizeSelect.value = methodDefaults[method].grind;
        }
        calculateBrew();
    });

    [coffeeDoseInput, brewRatioInput, waterTempInput, grindSizeSelect].forEach(el => {
        el.addEventListener('input', calculateBrew);
        el.addEventListener('change', calculateBrew);
    });

    btnStartTimer.addEventListener('click', startTimer);
    btnPauseTimer.addEventListener('click', pauseTimer);
    btnResetTimer.addEventListener('click', resetTimer);

    // Initial setup
    calculateBrew();
    renderStash();
    updateTimerDisplay();
});
