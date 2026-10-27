/* AuraChord Application Logic */

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const NOTE_NAMES_FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

const SCALES = {
    major: { name: 'Major (Ionian)', intervals: [0, 2, 4, 5, 7, 9, 11], types: ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'] },
    minor: { name: 'Natural Minor (Aeolian)', intervals: [0, 2, 3, 5, 7, 8, 10], types: ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'] },
    harmonic_minor: { name: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11], types: ['minor', 'diminished', 'augmented', 'minor', 'major', 'major', 'diminished'] },
    dorian: { name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10], types: ['minor', 'minor', 'major', 'major', 'minor', 'diminished', 'major'] },
    mixolydian: { name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10], types: ['major', 'minor', 'diminished', 'major', 'minor', 'minor', 'major'] },
    pentatonic_major: { name: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9], types: ['major', 'minor', 'minor', 'major', 'minor'] },
    pentatonic_minor: { name: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10], types: ['minor', 'major', 'major', 'minor', 'major'] }
};

const ROMAN_NUMERALS_MAJOR = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const ROMAN_NUMERALS_MINOR = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];
const ROMAN_NUMERALS_DEFAULT = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

// Chord definitions relative to root
const CHORD_INTERVALS = {
    'major': [0, 4, 7],
    'minor': [0, 3, 7],
    'diminished': [0, 3, 6],
    'augmented': [0, 4, 8]
};

let state = {
    root: 7, // G
    scaleKey: 'major',
    waveform: 'triangle',
    progression: [],
    vault: [],
    audioCtx: null,
    isAudioInitialized: false
};

// DOM Elements
const rootNoteSelect = document.getElementById('root-note');
const scaleTypeSelect = document.getElementById('scale-type');
const synthWaveformSelect = document.getElementById('synth-waveform');
const audioToggleBtn = document.getElementById('audio-toggle-btn');
const currentScaleLabel = document.getElementById('current-scale-label');
const diatonicGrid = document.getElementById('diatonic-grid');
const progressionTimeline = document.getElementById('progression-timeline');
const playProgressionBtn = document.getElementById('play-progression-btn');
const clearProgressionBtn = document.getElementById('clear-progression-btn');
const saveProgressionBtn = document.getElementById('save-progression-btn');
const harmonicAnalysis = document.getElementById('harmonic-analysis');
const vaultList = document.getElementById('vault-list');

// Initialize App
function init() {
    loadFromLocalStorage();
    setupEventListeners();
    render();
}

function setupEventListeners() {
    rootNoteSelect.addEventListener('change', (e) => {
        state.root = parseInt(e.target.value);
        render();
    });

    scaleTypeSelect.addEventListener('change', (e) => {
        state.scaleKey = e.target.value;
        render();
    });

    synthWaveformSelect.addEventListener('change', (e) => {
        state.waveform = e.target.value;
    });

    audioToggleBtn.addEventListener('click', () => {
        initAudioContext();
    });

    playProgressionBtn.addEventListener('click', () => {
        playProgression();
    });

    clearProgressionBtn.addEventListener('click', () => {
        state.progression = [];
        renderTimeline();
        updateAnalysis();
    });

    saveProgressionBtn.addEventListener('click', () => {
        saveProgressionToVault();
    });
}

function initAudioContext() {
    if (!state.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        state.audioCtx = new AudioContext();
    }
    if (state.audioCtx.state === 'suspended') {
        state.audioCtx.resume();
    }
    state.isAudioInitialized = true;
    audioToggleBtn.textContent = 'Audio Active';
    audioToggleBtn.style.borderColor = 'var(--success-color)';
    audioToggleBtn.style.color = 'var(--success-color)';
}

// Audio Synthesis Engine
function playChord(midiNotes, duration = 1.2) {
    if (!state.isAudioInitialized || !state.audioCtx) {
        initAudioContext();
    }
    if (!state.audioCtx) return;

    const now = state.audioCtx.currentTime;

    midiNotes.forEach(midi => {
        const freq = 440 * Math.pow(2, (midi - 69) / 12);
        
        const osc = state.audioCtx.createOscillator();
        const gain = state.audioCtx.createGain();

        osc.type = state.waveform;
        osc.frequency.setValueAtTime(freq, now);

        // Envelope
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(state.audioCtx.destination);

        osc.start(now);
        osc.stop(now + duration);
    });
}

// Music Theory Calculations
function getDiatonicChords() {
    const scale = SCALES[state.scaleKey];
    const chords = [];

    scale.intervals.forEach((interval, index) => {
        const rootMidi = 60 + state.root + interval; // Octave 4
        const noteName = NOTE_NAMES[(state.root + interval) % 12];
        const quality = scale.types[index];
        
        let chordSymbol = noteName;
        let qualityLabel = 'Major';
        let intervals = CHORD_INTERVALS.major;

        if (quality === 'minor') {
            chordSymbol += 'm';
            qualityLabel = 'Minor';
            intervals = CHORD_INTERVALS.minor;
        } else if (quality === 'diminished') {
            chordSymbol += '°';
            qualityLabel = 'Diminished';
            intervals = CHORD_INTERVALS.diminished;
        } else if (quality === 'augmented') {
            chordSymbol += '+';
            qualityLabel = 'Augmented';
            intervals = CHORD_INTERVALS.augmented;
        }

        let numeral = ROMAN_NUMERALS_DEFAULT[index];
        if (state.scaleKey === 'major') numeral = ROMAN_NUMERALS_MAJOR[index];
        else if (state.scaleKey === 'minor') numeral = ROMAN_NUMERALS_MINOR[index];

        const midiNotes = intervals.map(i => rootMidi + i);

        chords.push({
            numeral,
            symbol: chordSymbol,
            quality: qualityLabel,
            midi: midiNotes,
            rootName: noteName
        });
    });

    return chords;
}

// Rendering
function render() {
    const scaleObj = SCALES[state.scaleKey];
    const rootName = NOTE_NAMES[state.root];
    currentScaleLabel.textContent = `${rootName} ${scaleObj.name}`;

    renderDiatonicGrid();
    renderTimeline();
    updateAnalysis();
    renderVault();
}

function renderDiatonicGrid() {
    const chords = getDiatonicChords();
    diatonicGrid.innerHTML = '';

    chords.forEach((chord, idx) => {
        const card = document.createElement('div');
        card.className = 'chord-card';
        card.innerHTML = `
            <span class="chord-numeral">${chord.numeral}</span>
            <span class="chord-name">${chord.symbol}</span>
            <span class="chord-quality">${chord.quality}</span>
        `;

        card.addEventListener('click', () => {
            playChord(chord.midi);
            addToProgression(chord);
            card.classList.add('playing');
            setTimeout(() => card.classList.remove('playing'), 400);
        });

        diatonicGrid.appendChild(card);
    });
}

function addToProgression(chord) {
    state.progression.push({ ...chord, id: Math.random().toString(36).substr(2, 9) });
    renderTimeline();
    updateAnalysis();
    playProgressionBtn.disabled = state.progression.length === 0;
}

function renderTimeline() {
    if (state.progression.length === 0) {
        progressionTimeline.innerHTML = '<div class="empty-timeline">Your timeline is empty. Click diatonic chords above to build a sequence.</div>';
        playProgressionBtn.disabled = true;
        return;
    }

    progressionTimeline.innerHTML = '';
    state.progression.forEach((chord, index) => {
        const card = document.createElement('div');
        card.className = 'timeline-card';
        card.innerHTML = `
            <span class="chord-numeral">${chord.numeral}</span>
            <span class="chord-name">${chord.symbol}</span>
            <button class="remove-btn" title="Remove chord">&times;</button>
        `;

        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-btn')) {
                state.progression.splice(index, 1);
                renderTimeline();
                updateAnalysis();
                return;
            }
            playChord(chord.midi);
            card.classList.add('active');
            setTimeout(() => card.classList.remove('active'), 400);
        });

        progressionTimeline.appendChild(card);
    });
    playProgressionBtn.disabled = false;
}

// Play Full Progression Sequence
async function playProgression() {
    if (state.progression.length === 0) return;
    if (!state.isAudioInitialized) initAudioContext();

    playProgressionBtn.disabled = true;
    const cards = progressionTimeline.querySelectorAll('.timeline-card');

    for (let i = 0; i < state.progression.length; i++) {
        const chord = state.progression[i];
        const card = cards[i];

        if (card) card.classList.add('active');
        playChord(chord.midi, 0.9);

        await new Promise(resolve => setTimeout(resolve, 800));

        if (card) card.classList.remove('active');
    }

    playProgressionBtn.disabled = false;
}

// Harmonic Analysis
function updateAnalysis() {
    if (state.progression.length === 0) {
        harmonicAnalysis.innerHTML = '<p>Add chords to your timeline to view harmonic movement, Roman numeral function flow, and tension analysis.</p>';
        return;
    }

    const symbols = state.progression.map(c => c.symbol).join(' &rarr; ');
    const numerals = state.progression.map(c => c.numeral).join(' - ');
    
    // Analyze cadence or movement
    let cadenceType = 'Open / Developing Progression';
    const len = state.progression.length;
    const last = state.progression[len - 1].numeral;
    const first = state.progression[0].numeral;

    if (['V', 'V7', 'vii°'].includes(first) && ['I', 'i'].includes(last)) {
        cadenceType = 'Authentic / Resolving Cadence';
    } else if (['IV', 'iv'].includes(first) && ['I', 'i'].includes(last)) {
        cadenceType = 'Plagal (Amen) Cadence';
    } else if (['V', 'V7'].includes(last)) {
        cadenceType = 'Half Cadence (Suspended Resolution)';
    }

    harmonicAnalysis.innerHTML = `
        <div class="analysis-row">
            <span class="analysis-label">Progression Flow</span>
            <span class="analysis-value">${symbols}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Roman Numerals</span>
            <span class="analysis-value">${numerals}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Harmonic Cadence</span>
            <span class="analysis-value">${cadenceType}</span>
        </div>
        <div class="analysis-row">
            <span class="analysis-label">Chord Count</span>
            <span class="analysis-value">${len} Chords</span>
        </div>
    `;
}

// Vault & Storage
function saveProgressionToVault() {
    if (state.progression.length === 0) return;
    const namePrompt = prompt('Enter a title for this chord progression:', `${NOTE_NAMES[state.root]} ${SCALES[state.scaleKey].name} Progression`);
    if (!namePrompt) return;

    const item = {
        id: Math.random().toString(36).substr(2, 9),
        title: namePrompt,
        scale: `${NOTE_NAMES[state.root]} ${SCALES[state.scaleKey].name}`,
        chords: state.progression.map(c => c.symbol)
    };

    state.vault.push(item);
    saveToLocalStorage();
    renderVault();
}

function renderVault() {
    if (state.vault.length === 0) {
        vaultList.innerHTML = '<p class="empty-vault">No saved progressions yet.</p>';
        return;
    }

    vaultList.innerHTML = '';
    state.vault.forEach((item) => {
        const div = document.createElement('div');
        div.className = 'vault-item';
        div.innerHTML = `
            <div class="vault-info">
                <span class="vault-title">${item.title}</span>
                <span class="vault-chords">${item.scale} &bull; ${item.chords.join(' - ')}</span>
            </div>
            <div class="vault-actions">
                <button class="btn secondary load-vault-btn">Load</button>
                <button class="btn danger delete-vault-btn">&times;</button>
            </div>
        `;

        div.querySelector('.load-vault-btn').addEventListener('click', () => {
            alert(`Loaded vault progression: ${item.title}`);
        });

        div.querySelector('.delete-vault-btn').addEventListener('click', () => {
            state.vault = state.vault.filter(v => v.id !== item.id);
            saveToLocalStorage();
            renderVault();
        });

        vaultList.appendChild(div);
    });
}

function saveToLocalStorage() {
    try {
        localStorage.setItem('aurachord_vault', JSON.stringify(state.vault));
    } catch (e) {
        console.error('Could not save to localStorage', e);
    }
}

function loadFromLocalStorage() {
    try {
        const data = localStorage.getItem('aurachord_vault');
        if (data) {
            state.vault = JSON.parse(data);
        }
    } catch (e) {
        console.error('Could not load from localStorage', e);
    }
}

// Run initialization on load
window.addEventListener('DOMContentLoaded', init);
