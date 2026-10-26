document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const heightInput = document.getElementById('runnerHeight');
    const weightInput = document.getElementById('runnerWeight');
    const cadenceInput = document.getElementById('targetCadence');
    const speedInput = document.getElementById('runSpeed');

    const metricStrideLength = document.getElementById('metricStrideLength');
    const metricGCT = document.getElementById('metricGCT');
    const metricOscillation = document.getElementById('metricOscillation');
    const metricCalories = document.getElementById('metricCalories');

    const toggleMetronomeBtn = document.getElementById('toggleMetronomeBtn');
    const metronomeStatusBadge = document.getElementById('metronomeStatusBadge');
    const currentBeatDisplay = document.getElementById('currentBeatDisplay');

    const saveSessionBtn = document.getElementById('saveSessionBtn');
    const sessionsBody = document.getElementById('sessionsBody');
    const canvas = document.getElementById('strideCanvas');
    const ctx = canvas.getContext('2d');

    // Audio State
    let audioCtx = null;
    let isMetronomeRunning = false;
    let metronomeTimer = null;
    let beatCount = 0;

    // Sessions Storage
    let sessions = JSON.parse(localStorage.getItem('aurastride_sessions')) || [];

    function calculateMetrics() {
        const height = parseFloat(heightInput.value) || 178;
        const weight = parseFloat(weightInput.value) || 70;
        const cadence = parseFloat(cadenceInput.value) || 180;
        const speed = parseFloat(speedInput.value) || 5.0; // min/km

        // Speed in meters per minute
        // pace 5.0 min/km = 1000m / 5 min = 200 m/min
        const speedMetersPerMin = 1000 / speed;
        
        // Stride Length (meters) = Speed (m/min) / Cadence (steps/min)
        const strideLength = speedMetersPerMin / cadence;

        // Estimated Ground Contact Time (ms) - heuristic based on cadence & speed
        const gct = Math.max(160, Math.round(260 - (cadence - 160) * 0.8));

        // Vertical Oscillation (cm) - heuristic based on height & stride length
        const oscillation = ((height * 0.045) + (strideLength * 15)).toFixed(1);

        // Calorie burn heuristic (approx kcal/hr = weight * speed_kmh * 1.036)
        const speedKmh = 60 / speed;
        const calories = Math.round(weight * speedKmh * 1.036);

        // Update UI
        metricStrideLength.textContent = strideLength.toFixed(2) + ' m';
        metricGCT.textContent = gct + ' ms';
        metricOscillation.textContent = oscillation + ' cm';
        metricCalories.textContent = calories + ' kcal/hr';

        return {
            cadence,
            speed: speed.toFixed(1) + ' min/km',
            strideLength: strideLength.toFixed(2) + ' m',
            gct: gct + ' ms'
        };
    }

    // Canvas Animation Loop
    let animOffset = 0;
    function drawAnimation() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background grid lines
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo((x - animOffset) % canvas.width, 0);
            ctx.lineTo((x - animOffset) % canvas.width, canvas.height);
            ctx.stroke();
        }

        // Draw runner waveform / sine wave representing stride bounce
        const cadence = parseFloat(cadenceInput.value) || 180;
        animOffset += (cadence / 60) * 1.5;

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        for (let x = 0; x < canvas.width; x++) {
            const frequency = 0.02 * (cadence / 180);
            const amplitude = 25;
            const y = (canvas.height / 2) + Math.sin((x + animOffset) * frequency) * amplitude;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Draw baseline
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height - 20);
        ctx.lineTo(canvas.width, canvas.height - 20);
        ctx.stroke();

        requestAnimationFrame(drawAnimation);
    }

    // Metronome Sound Engine using Web Audio API
    function playBeat(isAccent) {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = isAccent ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(isAccent ? 880 : 440, audioCtx.currentTime);
        
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.09);
    }

    function startMetronome() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const cadence = parseFloat(cadenceInput.value) || 180;
        const intervalMs = (60 / cadence) * 1000;

        beatCount = 0;
        isMetronomeRunning = true;
        metronomeStatusBadge.textContent = 'Running';
        metronomeStatusBadge.className = 'badge running';
        toggleMetronomeBtn.textContent = 'Stop Metronome Audio';
        toggleMetronomeBtn.style.backgroundColor = 'var(--danger)';

        metronomeTimer = setInterval(() => {
            beatCount++;
            const isAccent = (beatCount % 4 === 1);
            currentBeatDisplay.textContent = `Beat: ${beatCount} ${isAccent ? '(Accent)' : ''}`;
            playBeat(isAccent);
        }, intervalMs);
    }

    function stopMetronome() {
        clearInterval(metronomeTimer);
        isMetronomeRunning = false;
        metronomeStatusBadge.textContent = 'Stopped';
        metronomeStatusBadge.className = 'badge stopped';
        toggleMetronomeBtn.textContent = 'Start Metronome Audio';
        toggleMetronomeBtn.style.backgroundColor = 'var(--primary)';
        currentBeatDisplay.textContent = 'Beat: --';
    }

    toggleMetronomeBtn.addEventListener('click', () => {
        if (isMetronomeRunning) {
            stopMetronome();
        } else {
            startMetronome();
        }
    });

    // Session Management
    function renderSessions() {
        sessionsBody.innerHTML = '';
        if (sessions.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="6" style="text-align: center; color: var(--text-muted);">No saved configurations yet.</td>`;
            sessionsBody.appendChild(tr);
            return;
        }

        sessions.forEach((s, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.date}</td>
                <td>${s.cadence} SPM</td>
                <td>${s.speed}</td>
                <td>${s.strideLength}</td>
                <td>${s.gct}</td>
                <td><button onclick="window.deleteSession(${idx})">Delete</button></td>
            `;
            sessionsBody.appendChild(tr);
        });
    }

    window.deleteSession = function(index) {
        sessions.splice(index, 1);
        localStorage.setItem('aurastride_sessions', JSON.stringify(sessions));
        renderSessions();
    };

    saveSessionBtn.addEventListener('click', () => {
        const metrics = calculateMetrics();
        const newSession = {
            date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            cadence: cadenceInput.value,
            speed: metrics.speed,
            strideLength: metrics.strideLength,
            gct: metrics.gct
        };
        sessions.unshift(newSession);
        if (sessions.length > 10) sessions.pop();
        localStorage.setItem('aurastride_sessions', JSON.stringify(sessions));
        renderSessions();
    });

    // Event Listeners for inputs
    [heightInput, weightInput, cadenceInput, speedInput].forEach(input => {
        input.addEventListener('input', calculateMetrics);
    });

    // Initial setup
    calculateMetrics();
    renderSessions();
    requestAnimationFrame(drawAnimation);
});
