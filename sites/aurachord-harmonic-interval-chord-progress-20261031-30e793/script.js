/* AuraChord Harmonic Lab Engine */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = {'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'};

// Scale intervals from root (semi-tones)
const SCALES = {
  'major': { name: 'Major (Ionian)', intervals: [0, 2, 4, 5, 7, 9, 11], qualities: ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5'] },
  'minor': { name: 'Natural Minor (Aeolian)', intervals: [0, 2, 3, 5, 7, 8, 10], qualities: ['m7', 'm7b5', 'maj7', 'm7', 'm7', 'maj7', '7'] },
  'harmonic-minor': { name: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11], qualities: ['m(maj7)', 'm7b5', 'aug7', 'm7', '7', 'maj7', 'dim7'] },
  'dorian': { name: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10], qualities: ['m7', 'm7', 'maj7', '7', 'm7', 'm7b5', 'maj7'] },
  'mixolydian': { name: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10], qualities: ['7', 'm7', 'm7b5', 'maj7', 'm7', 'm7', 'maj7'] },
  'pentatonic-major': { name: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9], qualities: ['maj', 'maj', 'm', 'm', 'maj'] },
  'pentatonic-minor': { name: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10], qualities: ['m', 'm', 'm', 'm', 'm'] }
};

const ROMAN_MAJOR = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const ROMAN_MINOR = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];

// State
let state = {
  rootNote: 'C',
  mode: 'major',
  voicing: 'seventh',
  tempo: 120,
  soundEnabled: false,
  progression: [null, null, null, null],
  savedPresets: []
};

// Audio Context
let audioCtx = null;
let isPlaying = false;
let playbackTimer = null;

// DOM Elements
const rootNoteSelect = document.getElementById('root-note-select');
const modeSelect = document.getElementById('mode-select');
const voicingSelect = document.getElementById('voicing-select');
const toggleAudioBtn = document.getElementById('toggle-audio-btn');
const diatonicChordsGrid = document.getElementById('diatonic-chords-grid');
const timelineSlots = document.getElementById('timeline-slots');
const playProgressionBtn = document.getElementById('play-progression-btn');
const clearProgressionBtn = document.getElementById('clear-progression-btn');
const saveProgressionBtn = document.getElementById('save-progression-btn');
const tempoSlider = document.getElementById('tempo-slider');
const tempoVal = document.getElementById('tempo-val');
const progressionAnalysis = document.getElementById('progression-analysis');
const savedPresetsList = document.getElementById('saved-presets-list');

// Initialize App
function initApp() {
  loadFromStorage();
  setupEventListeners();
  renderDiatonicPalette();
  renderTimeline();
  updateAnalysis();
  renderPresets();
}

function setupEventListeners() {
  rootNoteSelect.addEventListener('change', (e) => {
    state.rootNote = e.target.value;
    renderDiatonicPalette();
  });

  modeSelect.addEventListener('change', (e) => {
    state.mode = e.target.value;
    renderDiatonicPalette();
  });

  voicingSelect.addEventListener('change', (e) => {
    state.voicing = e.target.value;
    renderDiatonicPalette();
  });

  tempoSlider.addEventListener('input', (e) => {
    state.tempo = parseInt(e.target.value, 10);
    tempoVal.textContent = state.tempo;
  });

  toggleAudioBtn.addEventListener('click', () => {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    state.soundEnabled = !state.soundEnabled;
    toggleAudioBtn.setAttribute('aria-pressed', state.soundEnabled);
    if (state.soundEnabled) {
      toggleAudioBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg><span>Sound: Active</span>`;
      toggleAudioBtn.classList.add('btn-primary');
      toggleAudioBtn.classList.remove('btn-outline');
    } else {
      toggleAudioBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg><span>Sound: Muted</span>`;
      toggleAudioBtn.classList.remove('btn-primary');
      toggleAudioBtn.classList.add('btn-outline');
    }
  });

  clearProgressionBtn.addEventListener('click', () => {
    stopPlayback();
    state.progression = [null, null, null, null];
    renderTimeline();
    updateAnalysis();
  });

  playProgressionBtn.addEventListener('click', () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  });

  saveProgressionBtn.addEventListener('click', () => {
    const activeChords = state.progression.filter(Boolean);
    if (activeChords.length === 0) return;
    const presetName = `${state.rootNote} ${SCALES[state.mode].name} (${activeChords.map(c => c.name).join(' - ')})`;
    const newPreset = {
      id: Date.now(),
      name: presetName,
      progression: [...state.progression],
      root: state.rootNote,
      mode: state.mode
    };
    state.savedPresets.push(newPreset);
    saveToStorage();
    renderPresets();
  });
}

// Music Theory Calculations
function getNoteIndex(note) {
  return NOTE_NAMES.indexOf(note);
}

function getNoteName(semitoneIndex, useFlat = false) {
  const idx = ((semitoneIndex % 12) + 12) % 12;
  const baseName = NOTE_NAMES[idx];
  if (useFlat && FLAT_NAMES[baseName]) {
    return FLAT_NAMES[baseName];
  }
  return baseName;
}

function getChordNotes(rootSemi, quality) {
  let intervals = [0, 4, 7]; // Default triad
  if (quality.includes('7') && !quality.includes('m7b5') && !quality.includes('m(maj7)')) {
    if (quality === 'maj7') intervals = [0, 4, 7, 11];
    else if (quality === 'm7') intervals = [0, 3, 7, 10];
    else if (quality === '7') intervals = [0, 4, 7, 10];
    else if (quality === 'm7b5') intervals = [0, 3, 6, 10];
    else if (quality === 'm(maj7)') intervals = [0, 3, 7, 11];
    else if (quality === 'aug7') intervals = [0, 4, 8, 10];
    else if (quality === 'dim7') intervals = [0, 3, 6, 9];
  } else if (quality === 'sus2') {
    intervals = [0, 2, 7];
  } else if (quality === 'sus4') {
    intervals = [0, 5, 7];
  } else if (quality === 'add9') {
    intervals = [0, 4, 7, 14];
  } else if (quality === 'm') {
    intervals = [0, 3, 7];
  }

  return intervals.map(interval => rootSemi + interval);
}

function getHarmonicFunction(degreeIndex, scaleMode) {
  // 0-indexed degree
  if (scaleMode === 'major') {
    if ([0, 2, 5].includes(degreeIndex)) return 'tonic';
    if ([1, 3].includes(degreeIndex)) return 'subdominant';
    if ([4, 6].includes(degreeIndex)) return 'dominant';
  } else if (scaleMode === 'minor') {
    if ([0, 2, 5].includes(degreeIndex)) return 'tonic';
    if ([3, 5].includes(degreeIndex)) return 'subdominant';
    if ([4, 6, 1].includes(degreeIndex)) return 'dominant';
  }
  return 'other';
}

function renderDiatonicPalette() {
  diatonicChordsGrid.innerHTML = '';
  const scale = SCALES[state.mode];
  const rootIdx = getNoteIndex(state.rootNote);
  const useFlat = state.rootNote.includes('b') || ['F', 'Bb', 'Eb', 'Ab'].includes(state.rootNote);

  scale.intervals.forEach((interval, i) => {
    const noteSemi = rootIdx + interval;
    const noteName = getNoteName(noteSemi, useFlat);
    let quality = scale.qualities[i] || 'triad';
    
    // Override quality if user picked a simpler default voicing for triads/sevenths
    if (state.voicing === 'triad') {
      if (quality.includes('7')) quality = quality.includes('m') ? 'm' : '';
      else if (quality.includes('b5')) quality = 'dim';
    } else if (state.voicing === 'sus2') {
      quality = 'sus2';
    } else if (state.voicing === 'sus4') {
      quality = 'sus4';
    } else if (state.voicing === 'add9') {
      quality = 'add9';
    }

    const chordName = `${noteName}${quality}`;
    const harmonicFn = getHarmonicFunction(i, state.mode);
    const romanArr = state.mode === 'minor' ? ROMAN_MINOR : ROMAN_MAJOR;
    const roman = romanArr[i] || `${i+1}`;

    const rawSemis = getChordNotes(noteSemi + 48, quality); // Octave 4
    const noteNamesDisplay = rawSemis.map(s => getNoteName(s, useFlat)).join(', ');

    const card = document.createElement('div');
    card.className = `chord-card ${harmonicFn}`;
    card.innerHTML = `
      <div class="chord-name">${chordName}</div>
      <div class="roman-numeral">${roman}</div>
      <div class="chord-notes">${noteNamesDisplay}</div>
    `;

    card.addEventListener('click', () => {
      playChord(rawSemis);
      addChordToProgression({ name: chordName, roman: roman, function: harmonicFn, semis: rawSemis });
    });

    diatonicChordsGrid.appendChild(card);
  });
}

function addChordToProgression(chordObj) {
  const emptyIndex = state.progression.findIndex(slot => slot === null);
  if (emptyIndex !== -1) {
    state.progression[emptyIndex] = chordObj;
  } else {
    // Replace or shift if full
    state.progression.shift();
    state.progression.push(chordObj);
  }
  renderTimeline();
  updateAnalysis();
}

function renderTimeline() {
  timelineSlots.innerHTML = '';
  state.progression.forEach((chord, idx) => {
    const slot = document.createElement('div');
    slot.className = `timeline-slot ${chord ? 'filled' : ''}`;
    slot.dataset.index = idx;

    if (chord) {
      slot.innerHTML = `
        <button class="remove-slot" title="Remove chord">&times;</button>
        <div class="slot-content">
          <div class="chord-name" style="font-size: 1.1rem;">${chord.name}</div>
          <div class="roman-numeral">${chord.roman}</div>
        </div>
      `;

      slot.querySelector('.remove-slot').addEventListener('click', (e) => {
        e.stopPropagation();
        state.progression[idx] = null;
        renderTimeline();
        updateAnalysis();
      });

      slot.addEventListener('click', () => {
        playChord(chord.semis);
      });
    } else {
      slot.innerHTML = `<span class="slot-empty-text">Slot ${idx + 1}<br>Click chord above</span>`;
    }

    timelineSlots.appendChild(slot);
  });
}

function updateAnalysis() {
  const activeChords = state.progression.filter(Boolean);
  if (activeChords.length === 0) {
    progressionAnalysis.innerHTML = `<p class="placeholder-text">Add chords above to analyze harmonic cadence & Roman numeral progression.</p>`;
    return;
  }

  const romans = activeChords.map(c => c.roman).join(' - ');
  const functions = activeChords.map(c => c.function);

  // Basic cadence detector
  let cadenceType = "Progressive Harmonic Flow";
  const lastTwo = functions.slice(-2);
  if (lastTwo.length === 2) {
    if (lastTwo[0] === 'dominant' && lastTwo[1] === 'tonic') {
      cadenceType = "Authentic Cadence (V -> I) — Strong resolution";
    } else if (lastTwo[0] === 'subdominant' && lastTwo[1] === 'tonic') {
      cadenceType = "Plagal Cadence (IV -> I) — 'Amen' soothing resolution";
    } else if (lastTwo[0] === 'subdominant' && lastTwo[1] === 'dominant') {
      cadenceType = "Half Cadence (? -> V) — Suspended tension";
    }
  }

  progressionAnalysis.innerHTML = `
    <div class="analysis-result">
      <div class="analysis-row">
        <span class="analysis-label">Roman Numerals:</span>
        <span>${romans}</span>
      </div>
      <div class="analysis-row">
        <span class="analysis-label">Cadence Quality:</span>
        <span>${cadenceType}</span>
      </div>
      <div class="analysis-row">
        <span class="analysis-label">Harmonic Arc:</span>
        <span>${functions.map(f => f.toUpperCase()).join(' &rarr; ')}</span>
      </div>
    </div>
  `;
}

// Web Audio Synthesizer
function playChord(semitoneArray) {
  if (!state.soundEnabled || !audioCtx) return;
  
  const now = audioCtx.currentTime;
  semitoneArray.forEach((semi, idx) => {
    const freq = 440 * Math.pow(2, (semi - 69) / 12);
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start(now);
    osc.stop(now + 2.0);
  });
}

function startPlayback() {
  const activeChords = state.progression.filter(Boolean);
  if (activeChords.length === 0) return;

  isPlaying = true;
  playProgressionBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg> Stop`;
  
  let currentIndex = 0;
  const beatIntervalMs = (60 / state.tempo) * 1000 * 2; // 2 beats per chord slot

  function step() {
    if (!isPlaying) return;
    
    // Highlight current slot
    const slots = timelineSlots.querySelectorAll('.timeline-slot');
    slots.forEach((s, i) => {
      if (i === currentIndex && state.progression[i]) {
        s.classList.add('active-playback');
        playChord(state.progression[i].semis);
      } else {
        s.classList.remove('active-playback');
      }
    });

    currentIndex = (currentIndex + 1) % state.progression.length;
    playbackTimer = setTimeout(step, beatIntervalMs);
  }

  step();
}

function stopPlayback() {
  isPlaying = false;
  clearTimeout(playbackTimer);
  playProgressionBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Play All`;
  
  const slots = timelineSlots.querySelectorAll('.timeline-slot');
  slots.forEach(s => s.classList.remove('active-playback'));
}

// Local Storage Presets
function saveToStorage() {
  try {
    localStorage.setItem('aurachord_presets', JSON.stringify(state.savedPresets));
  } catch (e) {
    console.error('Could not save presets', e);
  }
}

function loadFromStorage() {
  try {
    const saved = localStorage.getItem('aurachord_presets');
    if (saved) {
      state.savedPresets = JSON.parse(saved);
    }
  } catch (e) {
    console.error('Could not load presets', e);
  }
}

function renderPresets() {
  if (state.savedPresets.length === 0) {
    savedPresetsList.innerHTML = `<p class="placeholder-text">No saved presets yet. Build a progression and click Save Preset.</p>`;
    return;
  }

  savedPresetsList.innerHTML = '';
  state.savedPresets.forEach((preset) => {
    const item = document.createElement('div');
    item.className = 'preset-item';
    item.innerHTML = `
      <div class="preset-info">
        <h4>${preset.name}</h4>
        <p>Key: ${preset.root} ${preset.mode}</p>
      </div>
      <div class="preset-actions">
        <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">Load</button>
        <button class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; color: #ef4444; border-color: #ef4444;">Delete</button>
      </div>
    `;

    const [loadBtn, deleteBtn] = item.querySelectorAll('button');
    
    loadBtn.addEventListener('click', () => {
      state.rootNote = preset.root;
      state.mode = preset.mode;
      rootNoteSelect.value = preset.root;
      modeSelect.value = preset.mode;
      state.progression = [...preset.progression];
      renderDiatonicPalette();
      renderTimeline();
      updateAnalysis();
    });

    deleteBtn.addEventListener('click', () => {
      state.savedPresets = state.savedPresets.filter(p => p.id !== preset.id);
      saveToStorage();
      renderPresets();
    });

    savedPresetsList.appendChild(item);
  });
}

// Initialize on load
window.addEventListener('DOMContentLoaded', initApp);
