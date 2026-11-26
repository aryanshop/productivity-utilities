/* AuraChord: Chord Progression & Voice Leading Workbench */

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
const NOTE_NAMES_FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'];

// Scale Definitions (intervals from root)
const SCALES = {
  major: { name: 'Major (Ionian)', intervals: [0, 2, 4, 5, 7, 9, 11], romans: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'], types: ['maj', 'min', 'min', 'maj', 'maj', 'min', 'dim'] },
  natural_minor: { name: 'Natural Minor (Aeolian)', intervals: [0, 2, 3, 5, 7, 8, 10], romans: ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'], types: ['min', 'dim', 'maj', 'min', 'min', 'maj', 'maj'] },
  harmonic_minor: { name: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11], romans: ['i', 'ii°', 'III+', 'iv', 'V', 'VI', 'vii°'], types: ['min', 'dim', 'aug', 'min', 'maj', 'maj', 'dim'] },
  melodic_minor: { name: 'Melodic Minor', intervals: [0, 2, 3, 5, 7, 9, 11], romans: ['i', 'ii', 'III+', 'IV', 'V', 'vi°', 'vii°'], types: ['min', 'min', 'aug', 'maj', 'maj', 'dim', 'dim'] },
  dorian: { name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10], romans: ['i', 'ii', 'III', 'IV', 'v', 'vi°', 'VII'], types: ['min', 'min', 'maj', 'maj', 'min', 'dim', 'maj'] },
  mixolydian: { name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10], romans: ['I', 'ii', 'iii°', 'IV', 'v', 'vi', 'VII'], types: ['maj', 'min', 'dim', 'maj', 'min', 'min', 'maj'] },
  pentatonic_major: { name: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9], romans: ['I', 'ii', 'iii', 'V', 'vi'], types: ['maj', 'min', 'min', 'maj', 'min'] },
  pentatonic_minor: { name: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10], romans: ['i', 'III', 'iv', 'v', 'VII'], types: ['min', 'maj', 'min', 'min', 'maj'] }
};

// Chord Quality Semitones from Root
const CHORD_INTERVALS = {
  'maj': [0, 4, 7],
  'min': [0, 3, 7],
  'dim': [0, 3, 6],
  'aug': [0, 4, 8],
  'maj7': [0, 4, 7, 11],
  'min7': [0, 3, 7, 10],
  '7': [0, 4, 7, 10],
  'dim7': [0, 3, 6, 9],
  'm7b5': [0, 3, 6, 10]
};

// Application State
let state = {
  root: 7, // G
  scale: 'major',
  synthWave: 'triangle',
  tempo: 100,
  progression: [], // Array of chord objects
  activeVoicingIndex: null,
  isPlayingAll: false,
  playbackTimer: null,
  currentPlayStep: -1,
  presets: [
    {
      name: 'Pop Classic (I-V-vi-IV)',
      root: 0,
      scale: 'major',
      progression: [
        { root: 0, type: 'maj', roman: 'I', name: 'C' },
        { root: 7, type: 'maj', roman: 'V', name: 'G' },
        { root: 9, type: 'min', roman: 'vi', name: 'Am' },
        { root: 5, type: 'maj', roman: 'IV', name: 'F' }
      ]
    },
    {
      name: 'Jazz ii-V-I in G',
      root: 7,
      scale: 'major',
      progression: [
        { root: 9, type: 'min7', roman: 'ii7', name: 'Am7' },
        { root: 2, type: '7', roman: 'V7', name: 'D7' },
        { root: 7, type: 'maj7', roman: 'Imaj7', name: 'Gmaj7' }
      ]
    }
  ]
};

// Web Audio API Synth Engine
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playChordNotes(midiNotes, duration = 1.0) {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    midiNotes.forEach(midi => {
      const freq = 440 * Math.pow(2, (midi - 69) / 12);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = state.synthWave;
      osc.frequency.setValueAtTime(freq, now);

      // Envelope
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.15, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    });
  } catch (e) {
    console.warn('Audio playback error:', e);
  }
}

// Helper to get MIDI notes for a chord voicing (default root in octave 4 = MIDI 60 + root)
function getChordMidiNotes(chord) {
  const baseMidi = 60 + ((chord.root - state.root + 12) % 12) + (chord.root < state.root ? 12 : 0);
  // Adjust base to around C4 / G3
  let rootMidi = 48 + chord.root;
  const intervals = CHORD_INTERVALS[chord.type] || [0, 4, 7];
  return intervals.map(interval => rootMidi + interval);
}

// DOM Elements
const selectRoot = document.getElementById('select-root');
const selectScale = document.getElementById('select-scale');
const selectSynthWave = document.getElementById('select-synth-wave');
const rangeTempo = document.getElementById('range-tempo');
const valTempo = document.getElementById('val-tempo');
const lblCurrentKey = document.getElementById('lbl-current-key');
const diatonicChordGrid = document.getElementById('diatonic-chord-grid');
const borrowedChordGrid = document.getElementById('borrowed-chord-grid');
const progressionSlots = document.getElementById('progression-slots');
const lblChordCount = document.getElementById('lbl-chord-count');
const btnPlayAll = document.getElementById('btn-play-all');
const btnStopAll = document.getElementById('btn-stop-all');
const btnClearProgression = document.getElementById('btn-clear-progression');
const voicingCanvas = document.getElementById('voicing-canvas');
const lblActiveChordName = document.getElementById('lbl-active-chord-name');
const metricSmoothness = document.getElementById('metric-smoothness');
const metricSmoothnessSub = document.getElementById('metric-smoothness-sub');
const metricFlow = document.getElementById('metric-flow');
const metricStability = document.getElementById('metric-stability');

// Modal Elements
const modalPresets = document.getElementById('modal-presets');
const btnPresetModal = document.getElementById('btn-preset-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const inputPresetName = document.getElementById('input-preset-name');
const btnSavePreset = document.getElementById('btn-save-preset');
const presetList = document.getElementById('preset-list');
const btnExportJson = document.getElementById('btn-export-json');
const fileImport = document.getElementById('file-import');

// Event Listeners
selectRoot.addEventListener('change', (e) => {
  state.root = parseInt(e.target.value);
  updateUI();
});

selectScale.addEventListener('change', (e) => {
  state.scale = e.target.value;
  updateUI();
});

selectSynthWave.addEventListener('change', (e) => {
  state.synthWave = e.target.value;
});

rangeTempo.addEventListener('input', (e) => {
  state.tempo = parseInt(e.target.value);
  valTempo.textContent = state.tempo;
});

btnClearProgression.addEventListener('click', () => {
  stopPlayback();
  state.progression = [];
  state.activeVoicingIndex = null;
  updateProgressionUI();
});

btnPlayAll.addEventListener('click', () => {
  if (state.progression.length === 0) return;
  startPlaybackAll();
});

btnStopAll.addEventListener('click', () => {
  stopPlayback();
});

// Modal Toggles
btnPresetModal.addEventListener('click', () => {
  renderPresetList();
  modalPresets.classList.remove('hidden');
});

btnCloseModal.addEventListener('click', () => {
  modalPresets.classList.add('hidden');
});

modalPresets.addEventListener('click', (e) => {
  if (e.target === modalPresets) {
    modalPresets.classList.add('hidden');
  }
});

btnSavePreset.addEventListener('click', () => {
  const name = inputPresetName.value.trim();
  if (!name || state.progression.length === 0) return;
  state.presets.push({
    name,
    root: state.root,
    scale: state.scale,
    progression: JSON.parse(JSON.stringify(state.progression))
  });
  inputPresetName.value = '';
  renderPresetList();
});

// Export / Import JSON
btnExportJson.addEventListener('click', () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "aurachord_workspace.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
});

fileImport.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (typeof imported.root === 'number' && imported.scale && Array.isArray(imported.progression)) {
        state.root = imported.root;
        state.scale = imported.scale;
        state.progression = imported.progression;
        if (Array.isArray(imported.presets)) {
          state.presets = imported.presets;
        }
        selectRoot.value = state.root;
        selectScale.value = state.scale;
        updateUI();
        alert('Workspace successfully imported!');
      } else {
        alert('Invalid JSON structure.');
      }
    } catch (err) {
      alert('Failed to parse JSON file.');
    }
  };
  reader.readAsText(file);
  fileImport.value = '';
});

// Core Logic & Rendering
function updateUI() {
  const scaleObj = SCALES[state.scale];
  const rootName = NOTE_NAMES[state.root];
  lblCurrentKey.textContent = `${rootName} ${scaleObj.name}`;

  renderDiatonicPalette();
  renderBorrowedPalette();
  updateProgressionUI();
}

function renderDiatonicPalette() {
  diatonicChordGrid.innerHTML = '';
  const scaleObj = SCALES[state.scale];

  scaleObj.intervals.forEach((interval, idx) => {
    const chordRoot = (state.root + interval) % 12;
    const chordType = scaleObj.types[idx];
    const roman = scaleObj.romans[idx];
    const chordName = NOTE_NAMES[chordRoot] + (chordType === 'min' ? 'm' : chordType === 'dim' ? 'dim' : chordType === 'aug' ? 'aug' : '');

    const btn = document.createElement('button');
    btn.className = 'chord-btn';
    btn.innerHTML = `
      <span class="chord-name">${chordName}</span>
      <span class="chord-roman">${roman}</span>
    `;
    btn.addEventListener('click', () => {
      addChordToProgression({
        root: chordRoot,
        type: chordType,
        roman: roman,
        name: chordName
      });
    });
    diatonicChordGrid.appendChild(btn);
  });
}

function renderBorrowedPalette() {
  borrowedChordGrid.innerHTML = '';
  // Common borrowed / tension chords relative to root
  const borrowedTemplates = [
    { interval: 3, type: 'maj', roman: '♭III', name: NOTE_NAMES[(state.root + 3) % 12] },
    { interval: 8, type: 'maj', roman: '♭VI', name: NOTE_NAMES[(state.root + 8) % 12] },
    { interval: 10, type: 'maj', roman: '♭VII', name: NOTE_NAMES[(state.root + 10) % 12] },
    { interval: 5, type: 'min', roman: 'iv', name: NOTE_NAMES[(state.root + 5) % 12] + 'm' },
    { interval: 2, type: '7', roman: 'V7/V', name: NOTE_NAMES[(state.root + 2) % 12] + '7' },
    { interval: 7, type: 'maj7', roman: 'Imaj7', name: NOTE_NAMES[(state.root + 7) % 12] + 'maj7' }
  ];

  borrowedTemplates.forEach(t => {
    const chordRoot = (state.root + t.interval) % 12;
    const chordName = t.name;

    const btn = document.createElement('button');
    btn.className = 'chord-btn';
    btn.innerHTML = `
      <span class="chord-name">${chordName}</span>
      <span class="chord-roman">${t.roman}</span>
    `;
    btn.addEventListener('click', () => {
      addChordToProgression({
        root: chordRoot,
        type: t.type,
        roman: t.roman,
        name: chordName
      });
    });
    borrowedChordGrid.appendChild(btn);
  });
}

function addChordToProgression(chord) {
  state.progression.push(chord);
  state.activeVoicingIndex = state.progression.length - 1;
  updateProgressionUI();
  playChordNotes(getChordMidiNotes(chord), 0.8);
}

function updateProgressionUI() {
  lblChordCount.textContent = state.progression.length;
  progressionSlots.innerHTML = '';

  if (state.progression.length === 0) {
    progressionSlots.innerHTML = `
      <div class="empty-progression-state">
        <p>Your progression is empty. Select chords from the left palette to build your sequence.</p>
      </div>
    `;
    lblActiveChordName.textContent = 'Select a chord slot to inspect voicing';
    clearCanvas();
    updateAnalytics();
    return;
  }

  state.progression.forEach((chord, idx) => {
    const card = document.createElement('div');
    card.className = `progression-slot-card ${state.activeVoicingIndex === idx ? 'active-step' : ''}`;
    if (state.currentPlayStep === idx) {
      card.classList.add('active-step');
    }

    card.innerHTML = `
      <div class="slot-header">
        <span class="slot-num">#${idx + 1}</span>
        <button class="slot-remove" title="Remove chord">&times;</button>
      </div>
      <div class="slot-body">
        <span class="slot-chord-name">${chord.name}</span>
        <span class="slot-roman">${chord.roman}</span>
      </div>
      <div class="slot-controls">
        <button class="btn-slot-action btn-play-single">▶</button>
      </div>
    `;

    // Click card body to inspect voicing
    card.querySelector('.slot-body').addEventListener('click', () => {
      state.activeVoicingIndex = idx;
      updateProgressionUI();
      playChordNotes(getChordMidiNotes(chord), 0.8);
    });

    // Play single chord
    card.querySelector('.btn-play-single').addEventListener('click', (e) => {
      e.stopPropagation();
      state.activeVoicingIndex = idx;
      updateProgressionUI();
      playChordNotes(getChordMidiNotes(chord), 0.8);
    });

    // Remove chord
    card.querySelector('.slot-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      state.progression.splice(idx, 1);
      if (state.activeVoicingIndex >= state.progression.length) {
        state.activeVoicingIndex = state.progression.length - 1;
      }
      updateProgressionUI();
    });

    progressionSlots.appendChild(card);
  });

  if (state.activeVoicingIndex !== null && state.progression[state.activeVoicingIndex]) {
    const activeChord = state.progression[state.activeVoicingIndex];
    lblActiveChordName.textContent = `Voicing Inspector: ${activeChord.name} (${activeChord.roman})`;
    drawVoicingCanvas(activeChord);
  } else {
    clearCanvas();
  }

  updateAnalytics();
}

// Analytics Calculation
function updateAnalytics() {
  if (state.progression.length < 2) {
    metricSmoothness.textContent = '--';
    metricSmoothnessSub.textContent = 'Add 2+ chords to analyze';
    metricFlow.textContent = '--';
    metricStability.textContent = '--';
    return;
  }

  // 1. Voice Leading Smoothness (sum of min semitone distance between consecutive voice notes)
  let totalSemitoneMotion = 0;
  for (let i = 0; i < state.progression.length - 1; i++) {
    const notesA = getChordMidiNotes(state.progression[i]);
    const notesB = getChordMidiNotes(state.progression[i+1]);
    // For each note in A, find closest note in B
    notesA.forEach(mA => {
      let minDiff = 12
      notesB.forEach(mB => {
        const diff = Math.abs(mA - mB);
        if (diff < minDiff) minDiff = diff;
      });
      totalSemitoneMotion += minDiff;
    });
  }

  metricSmoothness.textContent = `${totalSemitoneMotion} st`;
  metricSmoothnessSub.textContent = totalSemitoneMotion < 10 ? 'Exceptionally smooth!' : totalSemitoneMotion < 18 ? 'Moderate voice movement' : 'Wide leaps / active motion';

  // 2. Harmonic Function Flow (e.g., Tonic -> Predominant -> Dominant -> Tonic)
  const romans = state.progression.map(c => c.roman.toLowerCase());
  let cadencesDetected = 0;
  for (let i = 0; i < romans.length - 1; i++) {
    if ((romans[i].includes('v') || romans[i].includes('vii')) && (romans[i+1].includes('i') || romans[i+1].includes('i'))) {
      cadencesDetected++;
    }
  }
  metricFlow.textContent = cadencesDetected > 0 ? `${cadencesDetected} Cadence(s)` : 'Progressive Flow';

  // 3. Tonal Stability Index (% of diatonic roman numerals)
  const scaleObj = SCALES[state.scale];
  const diatonicRomans = scaleObj.romans.map(r => r.toLowerCase().replace(/[^a-z°]/g, ''));
  let diatonicCount = 0;
  state.progression.forEach(c => {
    const cleanRoman = c.roman.toLowerCase().replace(/[^a-z°]/g, '');
    if (diatonicRomans.includes(cleanRoman)) {
      diatonicCount++;
    }
  });
  const stabilityPct = Math.round((diatonicCount / state.progression.length) * 100);
  metricStability.textContent = `${stabilityPct}% Diatonic`;
}

// Canvas Keyboard Voicing Diagram
function clearCanvas() {
  const ctx = voicingCanvas.getContext('2d');
  ctx.fillStyle = '#090a0f';
  ctx.fillRect(0, 0, voicingCanvas.width, voicingCanvas.height);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('Select a chord to render keyboard voicing', voicingCanvas.width / 2, voicingCanvas.height / 2);
}

function drawVoicingCanvas(chord) {
  const ctx = voicingCanvas.getContext('2d');
  const w = voicingCanvas.width;
  const h = voicingCanvas.height;

  ctx.fillStyle = '#090a0f';
  ctx.fillRect(0, 0, w, h);

  const midiNotes = getChordMidiNotes(chord);

  // Draw a 2-octave piano keyboard starting from C3 (MIDI 48) to C5 (MIDI 72)
  const startMidi = 48;
  const endMidi = 72;
  const whiteKeysCount = 15; // C3 to C5 white keys approx
  const keyWidth = w / whiteKeysCount;
  const keyHeight = h - 20;

  let whiteKeyIndex = 0;
  const keyCoords = {};

  // Draw White Keys
  for (let m = startMidi; m <= endMidi; m++) {
    const noteInOctave = m % 12;
    const isBlack = [1, 3, 6, 8, 10].includes(noteInOctave);

    if (!isBlack) {
      const x = whiteKeyIndex * keyWidth;
      keyCoords[m] = { x, y: 10, w: keyWidth - 1, h: keyHeight, isBlack: false };

      ctx.fillStyle = midiNotes.includes(m) ? '#6366f1' : '#e2e8f0';
      ctx.fillRect(x, 10, keyWidth - 1, keyHeight);

      whiteKeyIndex++;
    }
  }

  // Draw Black Keys
  whiteKeyIndex = 0;
  for (let m = startMidi; m <= endMidi; m++) {
    const noteInOctave = m % 12;
    const isBlack = [1, 3, 6, 8, 10].includes(noteInOctave);

    if (!isBlack) {
      whiteKeyIndex++;
    } else {
      const prevWhiteX = (whiteKeyIndex - 1) * keyWidth;
      const x = prevWhiteX + (keyWidth * 0.65);
      const bw = keyWidth * 0.7;
      const bh = keyHeight * 0.6;

      keyCoords[m] = { x, y: 10, w: bw, h: bh, isBlack: true };

      ctx.fillStyle = midiNotes.includes(m) ? '#4338ca' : '#1e293b';
      ctx.fillRect(x, 10, bw, bh);
    }
  }

  // Draw active notes highlight text or markers on keys
  midiNotes.forEach(m => {
    if (keyCoords[m]) {
      const k = keyCoords[m];
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(NOTE_NAMES[m % 12], k.x + (k.w / 2), k.y + (k.isBlack ? k.h - 10 : k.h - 15));
    }
  });
}

// Playback Sequencer
function startPlaybackAll() {
  if (state.progression.length === 0) return;
  stopPlayback();

  state.isPlayingAll = true;
  btnPlayAll.disabled = true;
  btnStopAll.disabled = false;

  let step = 0;
  const intervalMs = (60 / state.tempo) * 1000;

  const runStep = () => {
    if (!state.isPlayingAll) return;
    if (step >= state.progression.length) {
      step = 0; // Loop progression
    }

    state.currentPlayStep = step;
    state.activeVoicingIndex = step;
    updateProgressionUI();

    const chord = state.progression[step];
    playChordNotes(getChordMidiNotes(chord), (intervalMs / 1000) * 0.9);

    step++;
    state.playbackTimer = setTimeout(runStep, intervalMs);
  };

  runStep();
}

function stopPlayback() {
  state.isPlayingAll = false;
  state.currentPlayStep = -1;
  if (state.playbackTimer) {
    clearTimeout(state.playbackTimer);
    state.playbackTimer = null;
  }
  btnPlayAll.disabled = false;
  btnStopAll.disabled = true;
  updateProgressionUI();
}

// Render Preset List
function renderPresetList() {
  presetList.innerHTML = '';
  if (state.presets.length === 0) {
    presetList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 1rem;">No saved presets yet.</p>';
    return;
  }

  state.presets.forEach((preset, idx) => {
    const item = document.createElement('div');
    item.className = 'preset-item';
    item.innerHTML = `
      <div class="preset-info">
        <span class="preset-title">${preset.name}</span>
        <span class="preset-details">${NOTE_NAMES[preset.root]} ${preset.scale} &bull; ${preset.progression.length} Chords</span>
      </div>
      <div class="preset-actions">
        <button class="btn btn-primary btn-sm" data-action="load">Load</button>
        <button class="btn btn-danger btn-sm" data-action="delete">&times;</button>
      </div>
    `;

    item.querySelector('[data-action="load"]').addEventListener('click', () => {
      state.root = preset.root;
      state.scale = preset.scale;
      state.progression = JSON.parse(JSON.stringify(preset.progression));
      state.activeVoicingIndex = 0;
      selectRoot.value = state.root;
      selectScale.value = state.scale;
      updateUI();
      modalPresets.classList.add('hidden');
    });

    item.querySelector('[data-action="delete"]').addEventListener('click', () => {
      state.presets.splice(idx, 1);
      renderPresetList();
    });

    presetList.appendChild(item);
  });
}

// Initial boot
updateUI();
