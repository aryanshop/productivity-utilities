// AuraPace: Metronome & Polyrhythm Lab

(function() {
    // DOM Elements
    const bpmRange = document.getElementById('bpmRange');
    const bpmVal = document.getElementById('bpmVal');
    const btnMinus = document.getElementById('btnMinus');
    const btnPlus = document.getElementById('btnPlus');
    const btnTap = document.getElementById('btnTap');
    const timeSigTop = document.getElementById('timeSigTop');
    const timeSigBottom = document.getElementById('timeSigBottom');
    const subdivision = document.getElementById('subdivision');
    const soundProfile = document.getElementById('soundProfile');
    const polyrhythmToggle = document.getElementById('polyrhythmToggle');
    const polyConfig = document.getElementById('polyConfig');
    const polyRatio = document.getElementById('polyRatio');
    const btnStartStop = document.getElementById('btnStartStop');
    const btnReset = document.getElementById('btnReset');
    
    const pendulumRod = document.getElementById('pendulumRod');
    const pendulumBob = document.getElementById('pendulumBob');
    const beatDotsContainer = document.getElementById('beatDotsContainer');
    
    const statTime = document.getElementById('statTime');
    const statBeats = document.getElementById('statBeats');
    const statMeasure = document.getElementById('statMeasure');

    // State Variables
    let isPlaying = false;
    let bpm = 120;
    let currentBeat = 0;
    let currentSubdivision = 0;
    let measureCount = 1;
    let totalBeatsCounted = 0;
    let timerId = null;
    let startTime = null;
    let stopwatchTimerId = null;
    let tapTimes = [];

    // Audio Context
    let audioCtx = null;

    function initAudio() {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                audioCtx = new AudioContext();
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    // Sound Synthesis via Web Audio API
    function playClick(isAccented, isPoly = false) {
        if (!audioCtx) return;
        
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        const profile = soundProfile.value;
        const now = audioCtx.currentTime;
        
        if (profile === 'wood') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(isAccented ? 1000 : 800, now);
            if (isPoly) osc.frequency.setValueAtTime(1200, now);
        } else if (profile === 'beep') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(isAccented ? 1200 : 880, now);
            if (isPoly) osc.frequency.setValueAtTime(1500, now);
        } else if (profile === 'cowbell') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(isAccented ? 580 : 440, now);
            if (isPoly) osc.frequency.setValueAtTime(700, now);
        } else {
            // soft
            osc.type = 'sine';
            osc.frequency.setValueAtTime(isAccented ? 600 : 400, now);
            if (isPoly) osc.frequency.setValueAtTime(500, now);
        }

        gain.gain.setValueAtTime(isAccented ? 0.3 : 0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
    }

    // Render Beat Indicator Dots
    function renderBeatDots() {
        beatDotsContainer.innerHTML = '';
        const beatsPerMeasure = parseInt(timeSigTop.value, 10);
        for (let i = 0; i < beatsPerMeasure; i++) {
            const dot = document.createElement('div');
            dot.className = 'beat-dot';
            if (i === 0) dot.classList.add('accent');
            beatDotsContainer.appendChild(dot);
        }
    }

    // Update Visual Pendulum & Dots
    function updateVisuals(beatIndex, isAccented) {
        const dots = beatDotsContainer.children;
        for (let i = 0; i < dots.length; i++) {
            dots[i].classList.remove('active');
            if (i === beatIndex) {
                dots[i].classList.add('active');
            }
        }

        // Animate Pendulum via SVG transform
        const direction = beatIndex % 2 === 0 ? 1 : -1;
        const angle = direction * 35;
        pendulumRod.style.transformOrigin = '150px 20px';
        pendulumBob.style.transformOrigin = '150px 20px';
        
        pendulumRod.style.transition = `transform ${60 / bpm / 2}s ease-in-out`;
        pendulumBob.style.transition = `transform ${60 / bpm / 2}s ease-in-out`;
        
        pendulumRod.style.transform = `rotate(${angle}deg)`;
        pendulumBob.style.transform = `rotate(${angle}deg)`;
    }

    // Metronome Tick Loop
    function startMetronome() {
        initAudio();
        if (isPlaying) stopMetronome();

        isPlaying = true;
        btnStartStop.textContent = '⏹ Stop Metronome';
        btnStartStop.classList.add('active');
        
        currentBeat = 0;
        currentSubdivision = 0;
        measureCount = 1;
        totalBeatsCounted = 0;
        
        startTime = Date.now();
        startStopwatch();
        
        renderBeatDots();
        tick();
    }

    function stopMetronome() {
        isPlaying = false;
        btnStartStop.textContent = '▶ Start Metronome';
        btnStartStop.classList.remove('active');
        
        if (timerId) {
            clearTimeout(timerId);
            timerId = null;
        }
        stopStopwatch();
        
        // Reset pendulum
        pendulumRod.style.transform = 'rotate(0deg)';
        pendulumBob.style.transform = 'rotate(0deg)';
    }

    function tick() {
        if (!isPlaying) return;

        const beatsPerMeasure = parseInt(timeSigTop.value, 10);
        const subCount = parseInt(subdivision.value, 10);
        
        const isAccented = (currentBeat === 0 && currentSubdivision === 0);
        
        if (currentSubdivision === 0) {
            playClick(isAccented);
            updateVisuals(currentBeat, isAccented);
            totalBeatsCounted++;
            statBeats.textContent = totalBeatsCounted;
            statMeasure.textContent = measureCount;
        }

        // Calculate interval based on BPM and subdivision
        const interval = (60000 / bpm) / subCount;
        
        currentSubdivision++;
        if (currentSubdivision >= subCount) {
            currentSubdivision = 0;
            currentBeat++;
            if (currentBeat >= beatsPerMeasure) {
                currentBeat = 0;
                measureCount++;
            }
        }

        timerId = setTimeout(tick, interval);
    }

    // Stopwatch logic
    function startStopwatch() {
        if (stopwatchTimerId) clearInterval(stopwatchTimerId);
        stopwatchTimerId = setInterval(() => {
            const diff = Math.floor((Date.now() - startTime) / 1000);
            const mins = String(Math.floor(diff / 60)).padStart(2, '0');
            const secs = String(diff % 60).padStart(2, '0');
            statTime.textContent = `${mins}:${secs}`;
        }, 1000);
    }

    function stopStopwatch() {
        if (stopwatchTimerId) {
            clearInterval(stopwatchTimerId);
            stopwatchTimerId = null;
        }
    }

    // Event Listeners
    bpmRange.addEventListener('input', (e) => {
        bpm = parseInt(e.target.value, 10);
        bpmVal.textContent = bpm;
    });

    btnMinus.addEventListener('click', () => {
        if (bpm > 40) {
            bpm--;
            bpmRange.value = bpm;
            bpmVal.textContent = bpm;
        }
    });

    btnPlus.addEventListener('click', () => {
        if (bpm < 240) {
            bpm++;
            bpmRange.value = bpm;
            bpmVal.textContent = bpm;
        }
    });

    btnTap.addEventListener('click', () => {
        const now = Date.now();
        tapTimes.push(now);
        
        // Keep only last 5 taps within 3 seconds
        tapTimes = tapTimes.filter(t => now - t < 3000);
        
        if (tapTimes.length > 1) {
            let intervals = [];
            for (let i = 1; i < tapTimes.length; i++) {
                intervals.push(tapTimes[i] - tapTimes[i-1]);
            }
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const calculatedBpm = Math.round(60000 / avgInterval);
            
            if (calculatedBpm >= 40 && calculatedBpm <= 240) {
                bpm = calculatedBpm;
                bpmRange.value = bpm;
                bpmVal.textContent = bpm;
                if (isPlaying) {
                    // restart tick to apply new bpm immediately
                    clearTimeout(timerId);
                    tick();
                }
            }
        }
    });

    timeSigTop.addEventListener('change', () => {
        renderBeatDots();
        if (isPlaying) {
            currentBeat = 0;
            currentSubdivision = 0;
        }
    });

    polyrhythmToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            polyConfig.classList.remove('disabled');
            polyRatio.removeAttribute('disabled');
        } else {
            polyConfig.classList.add('disabled');
            polyRatio.setAttribute('disabled', 'true');
        }
    });

    btnStartStop.addEventListener('click', () => {
        if (isPlaying) {
            stopMetronome();
        } else {
            startMetronome();
        }
    });

    btnReset.addEventListener('click', () => {
        stopMetronome();
        bpm = 120;
        bpmRange.value = 120;
        bpmVal.textContent = 120;
        timeSigTop.value = '4';
        timeSigBottom.value = '4';
        subdivision.value = '1';
        soundProfile.value = 'beep';
        polyrhythmToggle.checked = false;
        polyConfig.classList.add('disabled');
        polyRatio.setAttribute('disabled', 'true');
        statTime.textContent = '00:00';
        statBeats.textContent = '0';
        statMeasure.textContent = '1';
        renderBeatDots();
    });

    // Initial setup
    renderBeatDots();
})();
