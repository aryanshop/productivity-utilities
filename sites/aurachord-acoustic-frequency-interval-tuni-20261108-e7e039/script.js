/* AuraChord: Acoustic Frequency & Tuning Temperament Laboratory */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const baseNoteSelect = document.getElementById('baseNote');
  const baseFreqInput = document.getElementById('baseFreq');
  const temperamentSelect = document.getElementById('temperament');
  const octaveInput = document.getElementById('octave');
  const btnCalculate = document.getElementById('btnCalculate');
  const btnSavePreset = document.getElementById('btnSavePreset');
  const intervalTableBody = document.querySelector('#intervalTable tbody');
  const deviationCanvas = document.getElementById('deviationCanvas');
  const presetsContainer = document.getElementById('presetsContainer');

  // Audio control elements
  const btnPlayRoot = document.getElementById('btnPlayRoot');
  const btnPlayInterval = document.getElementById('btnPlayInterval');
  const btnPlayBoth = document.getElementById('btnPlayBoth');
  const btnStopAudio = document.getElementById('btnStopAudio');

  // State variables
  let computedIntervals = [];
  let selectedIntervalIndex = 0;
  let audioCtx = null;
  let activeOscillators = [];
  let activeGainNode = null;

  // Musical Intervals Definition with Ratios and Cent values (12-TET)
  const intervalDefinitions = [
    { name: "Unison", short: "P1", semitones: 0, justRatio: { num: 1, den: 1 }, pythRatio: { num: 1, den: 1 }, meantoneRatio: { num: 1, den: 1 } },
    { name: "Minor Second", short: "m2", semitones: 1, justRatio: { num: 16, den: 15 }, pythRatio: { num: 256, den: 243 }, meantoneRatio: { num: 25, den: 24 } },
    { name: "Major Second", short: "M2", semitones: 2, justRatio: { num: 9, den: 8 }, pythRatio: { num: 9, den: 8 }, meantoneRatio: { num: 95, den: 89 } },
    { name: "Minor Third", short: "m3", semitones: 3, justRatio: { num: 6, den: 5 }, pythRatio: { num: 32, den: 27 }, meantoneRatio: { num: 6, den: 5 } },
    { name: "Major Third", short: "M3", semitones: 4, justRatio: { num: 5, den: 4 }, pythRatio: { num: 81, den: 64 }, meantoneRatio: { num: 5, den: 4 } },
    { name: "Perfect Fourth", short: "P4", semitones: 5, justRatio: { num: 4, den: 3 }, pythRatio: { num: 4, den: 3 }, meantoneRatio: { num: 4, den: 3 } },
    { name: "Tritone / Dim 5", short: "TT", semitones: 6, justRatio: { num: 45, den: 32 }, pythRatio: { num: 729, den: 512 }, meantoneRatio: { num: 45, den: 32 } },
    { name: "Perfect Fifth", short: "P5", semitones: 7, justRatio: { num: 3, den: 2 }, pythRatio: { num: 3, den: 2 }, meantoneRatio: { num: 5, den: 4 } }, // approximation for meantone
    { name: "Minor Sixth", short: "m6", semitones: 8, justRatio: { num: 8, den: 5 }, pythRatio: { num: 128, den: 81 }, meantoneRatio: { num: 8, den: 5 } },
    { name: "Major Sixth", short: "M6", semitones: 9, justRatio: { num: 5, den: 3 }, pythRatio: { num: 27, den: 16 }, meantoneRatio: { num: 5, den: 3 } },
    { name: "Minor Seventh", short: "m7", semitones: 10, justRatio: { num: 9, den: 5 }, pythRatio: { num: 16, den: 9 }, meantoneRatio: { num: 9, den: 5 } },
    { name: "Major Seventh", short: "M7", semitones: 11, justRatio: { num: 15, den: 8 }, pythRatio: { num: 243, den: 128 }, meantoneRatio: { num: 15, den: 8 } },
    { name: "Octave", short: "P8", semitones: 12, justRatio: { num: 2, den: 1 }, pythRatio: { num: 2, den: 1 }, meantoneRatio: { num: 2, den: 1 } }
  ];

  // Base frequency offsets relative to A4 (semitones from A4)
  const noteOffsets = {
    'C': -9,
    'C#': -8,
    'D': -7,
    'D#': -6,
    'E': -5,
    'F': -4,
    'F#': -3,
    'G': -2,
    'G#': -1,
    'A': 0,
    'A#': 1,
    'B': 2
  };

  function calculateAcoustics() {
    const noteName = baseNoteSelect.value;
    const baseFreq = parseFloat(baseFreqInput.value) || 440;
    const temperament = temperamentSelect.value;
    const targetOctave = parseInt(octaveInput.value) || 4;

    // Calculate root frequency adjusted for octave (A4 is octave 4)
    const semitoneOffset = noteOffsets[noteName] + (targetOctave - 4) * 12;
    const rootFreq = baseFreq * Math.pow(2, semitoneOffset / 12);

    computedIntervals = intervalDefinitions.map((item, idx) => {
      let freq = 0;
      let ratioStr = "";
      let tetFreq = rootFreq * Math.pow(2, item.semitones / 12);

      if (temperament === 'equal') {
        freq = tetFreq;
        const exactRatio = Math.pow(2, item.semitones / 12);
        ratioStr = `1 : ${exactRatio.toFixed(4)}`;
      } else if (temperament === 'just') {
        const r = item.justRatio;
        freq = rootFreq * (r.num / r.den);
        ratioStr = `${r.num} : ${r.den}`;
      } else if (temperament === 'pythagorean') {
        const r = item.pythRatio;
        freq = rootFreq * (r.num / r.den);
        ratioStr = `${r.num} : ${r.den}`;
      } else if (temperament === 'meantone') {
        // 1/4 comma meantone approximation
        const r = item.justRatio; // fallback simplification for demo robustness
        freq = rootFreq * Math.pow(2, item.semitones / 12) * (item.semitones === 4 ? 0.9965 : 1);
        ratioStr = `Meantone (${item.short})`;
      }

      // Cent deviation relative to 12-TET
      const centDeviation = 1200 * Math.log2(freq / tetFreq);

      return {
        index: idx,
        name: item.name,
        short: item.short,
        semitones: item.semitones,
        ratioStr,
        freq,
        tetFreq,
        centDeviation
      };
    });

    renderTable();
    renderDeviationCanvas();
  }

  function renderTable() {
    if (!intervalTableBody) return;
    intervalTableBody.innerHTML = '';

    computedIntervals.forEach((interval, idx) => {
      const tr = document.createElement('tr');
      
      let badgeClass = 'badge-zero';
      let badgeText = '0.0¢';
      if (interval.centDeviation > 0.1) {
        badgeClass = 'badge-pos';
        badgeText = `+${interval.centDeviation.toFixed(1)}¢`;
      } else if (interval.centDeviation < -0.1) {
        badgeClass = 'badge-neg';
        badgeText = `${interval.centDeviation.toFixed(1)}¢`;
      }

      tr.innerHTML = `
        <td><strong>${interval.name}</strong> (${interval.short})</td>
        <td>${intervalNameLookup(interval.semitones)}</td>
        <td><code>${interval.ratioStr}</code></td>
        <td><strong>${interval.freq.toFixed(2)} Hz</strong></td>
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        <td><button class="btn btn-secondary btn-sm" data-index="${idx}">Select & Play</button></td>
      `;

      tr.querySelector('button').addEventListener('click', () => {
        selectedIntervalIndex = idx;
        highlightSelectedRow();
        playHarmonicDyad();
      });

      intervalTableBody.appendChild(tr);
    });
    highlightSelectedRow();
  }

  function intervalNameLookup(semitones) {
    const names = ["Unison", "Semitone", "Tone", "Minor Third", "Major Third", "Fourth", "Tritone", "Fifth", "Minor Sixth", "Major Sixth", "Minor Seventh", "Major Seventh", "Octave"];
    return names[semitones] || "Interval";
  }

  function highlightSelectedRow() {
    const rows = intervalTableBody.querySelectorAll('tr');
    rows.forEach((row, i) => {
      if (i === selectedIntervalIndex) {
        row.style.backgroundColor = 'rgba(56, 189, 248, 0.1)';
      } else {
        row.style.backgroundColor = '';
      }
    });
  }

  function renderDeviationCanvas() {
    if (!deviationCanvas) return;
    const ctx = deviationCanvas.getContext('2d');
    const width = deviationCanvas.width;
    const height = deviationCanvas.height;

    ctx.clearRect(0, 0, width, height);

    // Background grid
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Draw vertical center line (0 cents)
    ctx.strokeStyle = '#475569';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Plot points
    const barWidth = width / computedIntervals.length;
    computedIntervals.forEach((interval, i) => {
      const x = i * barWidth + barWidth / 2;
      const deviation = interval.centDeviation;
      // Map deviation (-25 to +25 cents) to canvas height
      const maxCentRange = 25;
      const normalizedDev = Math.max(-maxCentRange, Math.min(maxCentRange, deviation));
      const y = (height / 2) - (normalizedDev / maxCentRange) * (height / 2.5);

      // Draw stem
      ctx.strokeStyle = deviation >= 0 ? '#10b981' : '#f43f5e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, height / 2);
      ctx.lineTo(x, y);
      ctx.stroke();

      // Draw node circle
      ctx.fillStyle = interval.index === selectedIntervalIndex ? '#38bdf8' : (deviation >= 0 ? '#10b981' : '#f43f5e');
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Labels on canvas
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui';
    ctx.fillText('+25¢', 10, 15);
    ctx.fillText('0¢ (TET)', 10, height / 2 - 5);
    ctx.fillText('-25¢', 10, height - 5);
  }

  // Web Audio API Sound Generation
  function initAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function stopAudio() {
    if (activeOscillators.length > 0) {
      activeOscillators.forEach(osc => {
        try {
          osc.stop();
          osc.disconnect();
        } catch (e) {}
      });
      activeOscillators = [];
    }
    if (activeGainNode) {
      try {
        activeGainNode.disconnect();
      } catch (e) {}
      activeGainNode = null;
    }
    if (btnStopAudio) btnStopAudio.disabled = true;
  }

  function playFrequencies(frequencies) {
    initAudioContext();
    stopAudio();

    const waveType = document.querySelector('input[name="waveType"]:checked').value;
    
    activeGainNode = audioCtx.createGain();
    activeGainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
    // Soft envelope to avoid clicks
    activeGainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 4.0);

    activeGainNode.connect(audioCtx.destination);

    frequencies.forEach(freq => {
      const osc = audioCtx.createOscillator();
      osc.type = waveType;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      osc.connect(activeGainNode);
      osc.start();
      activeOscillators.push(osc);
    });

    if (btnStopAudio) btnStopAudio.disabled = false;

    // Auto stop after 4 seconds
    setTimeout(() => {
      stopAudio();
    }, 4000);
  }

  if (btnPlayRoot) {
    btnPlayRoot.addEventListener('click', () => {
      const rootFreq = computedIntervals[0] ? computedIntervals[0].freq : 440;
      playFrequencies([rootFreq]);
    });
  }

  if (btnPlayInterval) {
    btnPlayInterval.addEventListener('click', () => {
      const interval = computedIntervals[selectedIntervalIndex];
      if (interval) {
        playFrequencies([interval.freq]);
      }
    });
  }

  if (btnPlayBoth) {
    btnPlayBoth.addEventListener('click', () => {
      playHarmonicDyad();
    });
  }

  function playHarmonicDyad() {
    const rootFreq = computedIntervals[0] ? computedIntervals[0].freq : 440;
    const interval = computedIntervals[selectedIntervalIndex];
    if (interval) {
      playFrequencies([rootFreq, interval.freq]);
    }
  }

  if (btnStopAudio) {
    btnStopAudio.addEventListener('click', () => {
      stopAudio();
    });
  }

  // Local Presets Management
  function savePreset() {
    const preset = {
      id: Date.now(),
      title: `${baseNoteSelect.value} (${temperamentSelect.value.toUpperCase()}) @ ${baseFreqInput.value}Hz`,
      baseNote: baseNoteSelect.value,
      baseFreq: baseFreqInput.value,
      temperament: temperamentSelect.value,
      octave: octaveInput.value,
      date: new Date().toLocaleDateString()
    };

    let presets = JSON.parse(localStorage.getItem('aurachord_presets') || '[]');
    presets.unshift(preset);
    if (presets.max > 10) presets = presets.slice(0, 10);
    localStorage.setItem('aurachord_presets', JSON.stringify(presets));
    loadPresets();
  }

  function loadPresets() {
    if (!presetsContainer) return;
    const presets = JSON.parse(localStorage.getItem('aurachord_presets') || '[]');
    
    if (presets.length === 0) {
      presetsContainer.innerHTML = '<p class="empty-notice">No saved tuning presets yet. Configure settings and click \'Save to Local Presets\'.</p>';
      return;
    }

    presetsContainer.innerHTML = '';
    presets.forEach(p => {
      const card = document.createElement('div');
      card.className = 'preset-card';
      card.innerHTML = `
        <div class="preset-title">${p.title}</div>
        <div class="preset-detail">Octave: ${p.octave} | Saved: ${p.date}</div>
        <div class="preset-actions">
          <button class="btn btn-secondary btn-sm btn-load">Load</button>
          <button class="btn btn-danger btn-sm btn-del">Delete</button>
        </div>
      `;

      card.querySelector('.btn-load').addEventListener('click', () => {
        baseNoteSelect.value = p.baseNote;
        baseFreqInput.value = p.baseFreq;
        temperamentSelect.value = p.temperament;
        octaveInput.value = p.octave;
        calculateAcoustics();
      });

      card.querySelector('.btn-del').addEventListener('click', () => {
        let allPresets = JSON.parse(localStorage.getItem('aurachord_presets') || '[]');
        allPresets = allPresets.filter(item => item.id !== p.id);
        localStorage.setItem('aurachord_presets', JSON.stringify(allPresets));
        loadPresets();
      });

      presetsContainer.appendChild(card);
    });
  }

  // Event Listeners
  if (btnCalculate) {
    btnCalculate.addEventListener('click', calculateAcoustics);
  }

  if (btnSavePreset) {
    btnSavePreset.addEventListener('click', savePreset);
  }

  // Initial Calculation & Load
  calculateAcoustics();
  loadPresets();
});
