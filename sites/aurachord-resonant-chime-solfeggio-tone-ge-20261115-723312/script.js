document.addEventListener('DOMContentLoaded', () => {
    // State variables
    let audioCtx = null;
    let leftOsc = null;
    let rightOsc = null;
    let overtoneOsc = null;
    let masterGain = null;
    let analyser = null;
    let isPlaying = false;
    let isMuted = false;

    // Timer variables
    let timerInterval = null;
    let timerTotalSeconds = 25 * 60;
    let timerRemainingSeconds = 25 * 60;
    let isTimerRunning = false;

    // Canvas & Animation
    const canvas = document.getElementById('waveCanvas');
    const canvasCtx = canvas.getContext('2d');
    let animationId = null;

    // DOM Elements
    const presetSelect = document.getElementById('presetSelect');
    const baseFreqInput = document.getElementById('baseFreq');
    const baseFreqVal = document.getElementById('baseFreqVal');
    const binauralOffsetInput = document.getElementById('binauralOffset');
    const binauralOffsetVal = document.getElementById('binauralOffsetVal');
    const volumeControl = document.getElementById('volumeControl');
    const volumeVal = document.getElementById('volumeVal');
    const waveformSelect = document.getElementById('waveformSelect');
    const harmonicOvertones = document.getElementById('harmonicOvertones');
    
    const playToggleBtn = document.getElementById('playToggleBtn');
    const playBtnText = document.getElementById('playBtnText');
    const muteToggleBtn = document.getElementById('muteToggleBtn');
    const statusBadge = document.getElementById('statusBadge');

    const leftEarVal = document.getElementById('leftEarVal');
    const rightEarVal = document.getElementById('rightEarVal');
    const stateVal = document.getElementById('stateVal');

    const timerMinutes = document.getElementById('timerMinutes');
    const timerSeconds = document.getElementById('timerSeconds');
    const timerToggleBtn = document.getElementById('timerToggleBtn');
    const timerResetBtn = document.getElementById('timerResetBtn');
    const timerPresets = document.querySelectorAll('.timer-preset');

    const savePresetBtn = document.getElementById('savePresetBtn');
    const clearLogBtn = document.getElementById('clearLogBtn');
    const presetTableBody = document.getElementById('presetTableBody');

    // Default presets dictionary
    const presets = {
        '432': { name: '432 Hz - Earth Tone', freq: 432, offset: 4, wave: 'sine', overtone: '1' },
        '528': { name: '528 Hz - DNA Repair', freq: 528, offset: 6, wave: 'sine', overtone: '1.5' },
        '396': { name: '396 Hz - Liberation', freq: 396, offset: 3, wave: 'triangle', overtone: '1' },
        '639': { name: '639 Hz - Connection', freq: 639, offset: 7.83, wave: 'sine', overtone: '2' },
        '741': { name: '741 Hz - Intuition', freq: 741, offset: 10, wave: 'triangle', overtone: '1.5' },
        '852': { name: '852 Hz - Spiritual Order', freq: 852, offset: 4, wave: 'sine', overtone: '2' }
    };

    // Load saved presets from localStorage or default list
    let savedPresets = JSON.parse(localStorage.getItem('aurachord_presets')) || [
        { name: 'Deep Delta Sleep', freq: 216, offset: 2, wave: 'sine', overtone: '1' },
        { name: 'Theta Flow State', freq: 528, offset: 6, wave: 'sine', overtone: '1.5' },
        { name: 'Alpha Focus Calm', freq: 432, offset: 10, wave: 'triangle', overtone: '1' }
    ];

    function updateReadouts() {
        const base = parseFloat(baseFreqInput.value);
        const offset = parseFloat(binauralOffsetInput.value);
        const leftFreq = (base - (offset / 2)).toFixed(1);
        const rightFreq = (base + (offset / 2)).toFixed(1);

        baseFreqVal.textContent = base.toFixed(1) + ' Hz';
        binauralOffsetVal.textContent = offset.toFixed(1) + ' Hz (' + getBrainwaveState(offset) + ')';
        leftEarVal.textContent = leftFreq + ' Hz';
        rightEarVal.textContent = rightFreq + ' Hz';
        stateVal.textContent = getBrainwaveCategory(offset);

        if (isPlaying && leftOsc && rightOsc && masterGain) {
            const now = audioCtx.currentTime;
            leftOsc.frequency.setTargetAtTime(parseFloat(leftFreq), now, 0.05);
            rightOsc.frequency.setTargetAtTime(parseFloat(rightFreq), now, 0.05);
            if (overtoneOsc) {
                const ratio = parseFloat(harmonicOvertones.value);
                overtoneOsc.frequency.setTargetAtTime(base * ratio, now, 0.05);
            }
        }
    }

    function getBrainwaveState(offset) {
        if (offset < 4) return 'Delta - Deep Sleep';
        if (offset < 8) return 'Theta - Deep Meditation';
        if (offset < 13) return 'Alpha - Relaxed Focus';
        if (offset < 30) return 'Beta - Active Cognition';
        return 'Gamma - High Perception';
    }

    function getBrainwaveCategory(offset) {
        if (offset < 4) return 'Delta (1-4Hz)';
        if (offset < 8) return 'Theta (4-8Hz)';
        if (offset < 13) return 'Alpha (8-13Hz)';
        if (offset < 30) return 'Beta (13-30Hz)';
        return 'Gamma (30Hz+)';
    }

    // Event Listeners for controls
    baseFreqInput.addEventListener('input', () => {
        presetSelect.value = 'custom';
        updateReadouts();
    });

    binauralOffsetInput.addEventListener('input', () => {
        updateReadouts();
    });

    volumeControl.addEventListener('input', () => {
        const vol = parseInt(volumeControl.value);
        volumeVal.textContent = vol + '%';
        if (masterGain && audioCtx) {
            const gainVal = isMuted ? 0 : (vol / 100) * 0.15;
            masterGain.gain.setTargetAtTime(gainVal, audioCtx.currentTime, 0.05);
        }
    });

    waveformSelect.addEventListener('change', () => {
        const wave = waveformSelect.value;
        if (leftOsc && rightOsc) {
            leftOsc.type = wave;
            rightOsc.type = wave;
        }
    });

    harmonicOvertones.addEventListener('change', () => {
        updateReadouts();
    });

    presetSelect.addEventListener('change', () => {
        const val = presetSelect.value;
        if (presets[val]) {
            const p = presets[val];
            baseFreqInput.value = p.freq;
            binauralOffsetInput.value = p.offset;
            waveformSelect.value = p.wave;
            harmonicOvertones.value = p.overtone;
            updateReadouts();
        }
    });

    // Audio Engine Initialization
    function startAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const base = parseFloat(baseFreqInput.value);
        const offset = parseFloat(binauralOffsetInput.value);
        const leftFreq = base - (offset / 2);
        const rightFreq = base + (offset / 2);
        const wave = waveformSelect.value;
        const overtoneRatio = parseFloat(harmonicOvertones.value);
        const vol = parseInt(volumeControl.value);
        const gainVal = isMuted ? 0 : (vol / 100) * 0.15;

        // Master Gain & Analyser
        masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(gainVal, audioCtx.currentTime);

        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;

        // Stereo Panner Setup
        const merger = audioCtx.createChannelMerger(2);

        // Left Oscillator
        leftOsc = audioCtx.createOscillator();
        leftOsc.type = wave;
        leftOsc.frequency.setValueAtTime(leftFreq, audioCtx.currentTime);
        const leftGain = audioCtx.createGain();
        leftGain.gain.setValueAtTime(0.8, audioCtx.currentTime);
        leftOsc.connect(leftGain);
        leftGain.connect(merger, 0, 0); // Connect to Left channel

        // Right Oscillator
        rightOsc = audioCtx.createOscillator();
        rightOsc.type = wave;
        rightOsc.frequency.setValueAtTime(rightFreq, audioCtx.currentTime);
        const rightGain = audioCtx.createGain();
        rightGain.gain.setValueAtTime(0.8, audioCtx.currentTime);
        rightOsc.connect(rightGain);
        rightGain.connect(merger, 0, 1); // Connect to Right channel

        // Overtone Oscillator
        if (overtoneRatio > 1) {
            overtoneOsc = audioCtx.createOscillator();
            overtoneOsc.type = 'sine';
            overtoneOsc.frequency.setValueAtTime(base * overtoneRatio, audioCtx.currentTime);
            const overtoneGain = audioCtx.createGain();
            overtoneGain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            overtoneOsc.connect(overtoneGain);
            overtoneGain.connect(merger, 0, 0);
            overtoneGain.connect(merger, 0, 1);
            overtoneOsc.start();
        }

        merger.connect(masterGain);
        masterGain.connect(analyser);
        analyser.connect(audioCtx.destination);

        leftOsc.start();
        rightOsc.start();

        isPlaying = true;
        playToggleBtn.classList.add('active');
        playBtnText.textContent = 'Stop Sound Generation';
        statusBadge.textContent = 'Active';
        statusBadge.className = 'badge active';

        drawVisualizer();
    }

    function stopAudio() {
        if (leftOsc) { leftOsc.stop(); leftOsc.disconnect(); leftOsc = null; }
        if (rightOsc) { rightOsc.stop(); rightOsc.disconnect(); rightOsc = null; }
        if (overtoneOsc) { overtoneOsc.stop(); overtoneOsc.disconnect(); overtoneOsc = null; }
        if (masterGain) { masterGain.disconnect(); masterGain = null; }

        isPlaying = false;
        playToggleBtn.classList.remove('active');
        playBtnText.textContent = 'Start Sound Generation';
        statusBadge.textContent = 'Standby';
        statusBadge.className = 'badge standby';

        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    }

    playToggleBtn.addEventListener('click', () => {
        if (isPlaying) {
            stopAudio();
        } else {
            startAudio();
        }
    });

    muteToggleBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        if (isMuted) {
            muteToggleBtn.classList.add('active');
            muteToggleBtn.textContent = 'Unmute';
        } else {
            muteToggleBtn.classList.remove('active');
            muteToggleBtn.textContent = 'Mute';
        }
        if (masterGain && audioCtx) {
            const vol = parseInt(volumeControl.value);
            const gainVal = isMuted ? 0 : (vol / 100) * 0.15;
            masterGain.gain.setTargetAtTime(gainVal, audioCtx.currentTime, 0.05);
        }
    });

    // Canvas Visualizer (Oscilloscope & Lissajous pattern vibe)
    function drawVisualizer() {
        if (!isPlaying) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        canvasCtx.fillStyle = '#0f1117';
        canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

        canvasCtx.lineWidth = 2;
        canvasCtx.strokeStyle = '#38bdf8';
        canvasCtx.shadowBlur = 10;
        canvasCtx.shadowColor = 'rgba(56, 189, 248, 0.5)';

        canvasCtx.beginPath();
        const sliceWidth = canvas.width * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * canvas.height / 2;

            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }
            x += sliceWidth;
        }

        canvasCtx.lineTo(canvas.width, canvas.height / 2);
        canvasCtx.stroke();
        canvasCtx.shadowBlur = 0; // reset shadow

        animationId = requestAnimationFrame(drawVisualizer);
    }

    // Focus Timer Logic
    function updateTimerDisplay() {
        const mins = Math.floor(timerRemainingSeconds / 60);
        const secs = timerRemainingSeconds % 60;
        timerMinutes.textContent = String(mins).padStart(2, '0');
        timerSeconds.textContent = String(secs).padStart(2, '0');
    }

    timerPresets.forEach(btn => {
        btn.addEventListener('click', (e) => {
            timerPresets.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const mins = parseInt(e.target.getAttribute('data-mins'));
            timerTotalSeconds = mins * 60;
            timerRemainingSeconds = timerTotalSeconds;
            updateTimerDisplay();
            if (isTimerRunning) {
                stopTimer();
                timerToggleBtn.textContent = 'Start Timer';
            }
        });
    });

    function startTimer() {
        isTimerRunning = true;
        timerToggleBtn.textContent = 'Pause Timer';
        timerToggleBtn.classList.add('active');

        timerInterval = setInterval(() => {
            if (timerRemainingSeconds > 0) {
                timerRemainingSeconds--;
                updateTimerDisplay();
            } else {
                stopTimer();
                timerToggleBtn.textContent = 'Start Timer';
                timerToggleBtn.classList.remove('active');
                if (isPlaying) {
                    stopAudio();
                }
                alert('Focus session completed! Take a moment to breathe.');
            }
        }, 1000);
    }

    function stopTimer() {
        isTimerRunning = false;
        clearInterval(timerInterval);
        timerToggleBtn.classList.remove('active');
    }

    timerToggleBtn.addEventListener('click', () => {
        if (isTimerRunning) {
            stopTimer();
            timerToggleBtn.textContent = 'Start Timer';
        } else {
            startTimer();
        }
    });

    timerResetBtn.addEventListener('click', () => {
        stopTimer();
        timerRemainingSeconds = timerTotalSeconds;
        updateTimerDisplay();
        timerToggleBtn.textContent = 'Start Timer';
    });

    // Saved Presets Table Logic
    function renderPresetTable() {
        presetTableBody.innerHTML = '';
        savedPresets.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${item.name}</strong></td>
                <td>${item.freq} Hz</td>
                <td>${item.offset} Hz</td>
                <td style="text-transform: capitalize;">${item.wave}</td>
                <td>
                    <button class="btn btn-sm btn-subtle load-preset" data-index="${index}">Load</button>
                    <button class="btn btn-sm btn-subtle delete-preset" data-index="${index}">Delete</button>
                </td>
            `;
            presetTableBody.appendChild(tr);
        });

        // Bind actions
        document.querySelectorAll('.load-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                const p = savedPresets[idx];
                baseFreqInput.value = p.freq;
                binauralOffsetInput.value = p.offset;
                waveformSelect.value = p.wave;
                harmonicOvertones.value = p.overtone;
                presetSelect.value = 'custom';
                updateReadouts();
            });
        });

        document.querySelectorAll('.delete-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                savedPresets.splice(idx, 1);
                localStorage.setItem('aurachord_presets', JSON.stringify(savedPresets));
                renderPresetTable();
            });
        });
    }

    savePresetBtn.addEventListener('click', () => {
        const namePrompt = prompt('Enter a name for this sonic preset:', 'Custom Solfeggio Flow');
        if (namePrompt && namePrompt.trim() !== '') {
            const newPreset = {
                name: namePrompt.trim(),
                freq: parseFloat(baseFreqInput.value),
                offset: parseFloat(binauralOffsetInput.value),
                wave: waveformSelect.value,
                overtone: harmonicOvertones.value
            };
            savedPresets.push(newPreset);
            localStorage.setItem('aurachord_presets', JSON.stringify(savedPresets));
            renderPresetTable();
        }
    });

    clearLogBtn.addEventListener('click', () => {
        if (confirm('Clear all saved custom presets?')) {
            savedPresets = [];
            localStorage.removeItem('aurachord_presets');
            renderPresetTable();
        }
    });

    // Initial setup
    updateReadouts();
    updateTimerDisplay();
    renderPresetTable();
});
