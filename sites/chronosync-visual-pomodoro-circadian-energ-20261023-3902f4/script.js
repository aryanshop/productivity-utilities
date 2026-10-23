// ChronoSync Application Logic

document.addEventListener('DOMContentLoaded', () => {
    // Timer Configuration
    const MODES = {
        pomodoro: { name: 'Deep Focus', duration: 25 * 60 },
        shortBreak: { name: 'Short Break', duration: 5 * 60 },
        longBreak: { name: 'Restoration', duration: 15 * 60 }
    };

    let currentMode = 'pomodoro';
    let timeLeft = MODES[currentMode].duration;
    let timerId = null;
    let isRunning = false;
    let completedSessions = 0;
    let totalFocusSeconds = 0;

    // DOM Elements
    const modeButtons = document.querySelectorAll('.mode-btn');
    const timeDisplay = document.getElementById('time-display');
    const sessionLabel = document.getElementById('session-label');
    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');
    const progressRing = document.querySelector('.progress-ring__circle');
    const completedCountEl = document.getElementById('completed-count');
    const totalFocusTimeEl = document.getElementById('total-focus-time');
    
    // Circadian & Logger Elements
    const chronotypeSelect = document.getElementById('chronotype');
    const circadianCanvas = document.getElementById('circadian-canvas');
    const tipText = document.getElementById('tip-text');
    const sessionLogForm = document.getElementById('session-log-form');
    const historyTbody = document.getElementById('history-tbody');
    const clearHistoryBtn = document.getElementById('clear-history');

    const CIRCUMFERENCE = 2 * Math.PI * 106;
    progressRing.style.strokeDasharray = CIRCUMFERENCE;

    // Initialize Local Storage History
    let sessionHistory = JSON.parse(localStorage.getItem('chronosync_history')) || [];
    renderHistory();
    updateStatsSummary();

    // Mode Switching
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isRunning) {
                if (!confirm('Switching modes will reset the current timer. Continue?')) return;
                pauseTimer();
            }
            modeButtons.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-selected', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-selected', 'true');
            
            currentMode = btn.dataset.mode;
            timeLeft = MODES[currentMode].duration;
            sessionLabel.textContent = MODES[currentMode].name;
            updateDisplay();
        });
    });

    // Timer Actions
    startBtn.addEventListener('click', () => {
        if (isRunning) {
            pauseTimer();
        } else {
            startTimer();
        }
    });

    resetBtn.addEventListener('click', () => {
        pauseTimer();
        timeLeft = MODES[currentMode].duration;
        updateDisplay();
    });

    function startTimer() {
        isRunning = true;
        startBtn.textContent = 'Pause Session';
        startBtn.style.background = 'var(--bg-hover)';
        
        const startTime = Date.now();
        const initialDuration = timeLeft;

        timerId = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateDisplay();
            } else {
                clearInterval(timerId);
                isRunning = false;
                startBtn.textContent = 'Start Session';
                startBtn.style.background = 'var(--accent-gradient)';
                
                if (currentMode === 'pomodoro') {
                    completedSessions++;
                    totalFocusSeconds += MODES.pomodoro.duration;
                    updateStatsSummary();
                    alert('Focus session complete! Take a moment to log your session reflection below.');
                } else {
                    alert('Break time finished! Ready for the next deep focus block?');
                }
                
                timeLeft = MODES[currentMode].duration;
                updateDisplay();
            }
        }, 1000);
    }

    function pauseTimer() {
        clearInterval(timerId);
        isRunning = false;
        startBtn.textContent = 'Start Session';
        startBtn.style.background = 'var(--accent-gradient)';
    }

    function updateDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timeDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        document.title = `(${timeDisplay.textContent}) ChronoSync`;

        // Update Progress Ring
        const totalDuration = MODES[currentMode].duration;
        const offset = CIRCUMFERENCE - (timeLeft / totalDuration) * CIRCUMFERENCE;
        progressRing.style.strokeDashoffset = offset;
    }

    function updateStatsSummary() {
        completedCountEl.textContent = completedSessions;
        const totalMinutes = Math.floor(totalFocusSeconds / 60);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        totalFocusTimeEl.textContent = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }

    // Circadian Curve Canvas Rendering
    function drawCircadianCurve() {
        if (!circadianCanvas) return;
        const ctx = circadianCanvas.getContext('2d');
        const width = circadianCanvas.width;
        const height = circadianCanvas.height;
        
        ctx.clearRect(0, 0, width, height);

        const chronotype = chronotypeSelect.value;
        
        // Background Grid Lines
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Generate curve based on chronotype
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 3;
        ctx.beginPath();

        for (let x = 0; x <= width; x += 2) {
            const hour = (x / width) * 24;
            let yFactor = 0;

            if (chronotype === 'lion') {
                // Peak around 9 AM - 12 PM
                yFactor = Math.sin(((hour - 4) / 24) * Math.PI * 2) * 0.7 + Math.sin(((hour - 9) / 12) * Math.PI) * 0.3;
            } else if (chronotype === 'wolf') {
                // Peak in evening ~ 5 PM - 9 PM
                yFactor = Math.sin(((hour - 10) / 24) * Math.PI * 2) * 0.7 + Math.sin(((hour - 18) / 12) * Math.PI) * 0.4;
            } else if (chronotype === 'dolphin') {
                // Fluctuating, multiple smaller peaks
                yFactor = Math.sin((hour / 24) * Math.PI * 4) * 0.5;
            } else {
                // Bear (Standard peak late morning & early afternoon)
                yFactor = Math.sin(((hour - 6) / 24) * Math.PI * 2);
            }

            // Normalize yFactor (-1 to 1) to canvas height (padding 20px)
            const y = (height / 2) - (yFactor * (height * 0.35));

            if (x === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // Highlight Current Time Indicator on Curve
        const now = new Date();
        const currentHourFraction = now.getHours() + now.getMinutes() / 60;
        const currentX = (currentHourFraction / 24) * width;
        
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(currentX, height / 2, 6, 0, Math.PI * 2);
        ctx.fill();

        updateCircadianTip(currentHourFraction, chronotype);
    }

    function updateCircadianTip(hour, chronotype) {
        let tip = '';
        if (hour >= 8 && hour <= 11) {
            tip = 'High cognitive alertness window. Ideal for analytical deep work and complex problem solving.';
        } else if (hour > 11 && hour <= 14) {
            tip = 'Post-lunch dip phase. Recommended for lighter administrative tasks, organization, or a short break.';
        } else if (hour > 14 && hour <= 18) {
            tip = 'Secondary focus peak or collaborative brainstorming window. Good for creative design and writing.';
        } else if (hour > 18 && (chronotype === 'wolf' || chronotype === 'dolphin')) {
            tip = 'Evening flow state active for your chronotype. Great for individual uninterrupted sprints.';
        } else {
            tip = 'Wind-down and restoration phase. Prioritize rest, reading, or stepping away from screens.';
        }
        tipText.textContent = tip;
    }

    chronotypeSelect.addEventListener('change', drawCircadianCurve);
    drawCircadianCurve();

    // Session Logger & History
    sessionLogForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const task = document.getElementById('session-task').value.trim();
        const energy = document.getElementById('energy-rating').value;
        const distractions = document.getElementById('distraction-count').value;
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        if (!task) return;

        const newRecord = {
            time: timeStr,
            task,
            energy,
            distractions,
            duration: '25m'
        };

        sessionHistory.unshift(newRecord);
        localStorage.setItem('chronosync_history', JSON.stringify(sessionHistory));
        
        renderHistory();
        sessionLogForm.reset();
    });

    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Clear today session ledger?')) {
            sessionHistory = [];
            localStorage.removeItem('chronosync_history');
            renderHistory();
        }
    });

    function renderHistory() {
        if (sessionHistory.length === 0) {
            historyTbody.innerHTML = `<tr class="empty-row"><td colspan="5">No sessions completed yet today. Start the timer to log your first focus block.</td></tr>`;
            return;
        }

        historyTbody.innerHTML = sessionHistory.map(item => `
            <tr>
                <td>${item.time}</td>
                <td>${escapeHtml(item.task)}</td>
                <td><span class="badge-${item.energy}">${formatEnergyLabel(item.energy)}</span></td>
                <td>${item.distractions}</td>
                <td>${item.duration}</td>
            </tr>
        `).join('');
    }

    function formatEnergyLabel(val) {
        if (val === 'high') return '⚡ High';
        if (val === 'moderate') return '☕ Steady';
        return '🔋 Low';
    }

    function escapeHtml(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }

    updateDisplay();
});
