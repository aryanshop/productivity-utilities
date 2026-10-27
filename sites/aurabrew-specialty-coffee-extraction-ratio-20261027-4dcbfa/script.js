document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const methodSelect = document.getElementById('brewMethod');
  const doseInput = document.getElementById('coffeeDose');
  const ratioInput = document.getElementById('brewRatio');
  const tempInput = document.getElementById('waterTemp');
  const grindSelect = document.getElementById('grindSize');
  const roastSelect = document.getElementById('beanRoast');

  const outWater = document.getElementById('outWater');
  const outTds = document.getElementById('outTds');
  const outExtraction = document.getElementById('outExtraction');
  const outGrindRec = document.getElementById('outGrindRec');
  const adviceText = document.getElementById('adviceText');

  const timerClock = document.getElementById('timerClock');
  const timerStage = document.getElementById('timerStage');
  const targetWaterCue = document.getElementById('targetWaterCue');
  const startTimerBtn = document.getElementById('startTimerBtn');
  const pauseTimerBtn = document.getElementById('pauseTimerBtn');
  const resetTimerBtn = document.getElementById('resetTimerBtn');
  const scheduleList = document.getElementById('scheduleList');

  const saveBrewBtn = document.getElementById('saveBrewBtn');
  const coffeeNameInput = document.getElementById('coffeeName');
  const brewRatingInput = document.getElementById('brewRating');
  const journalList = document.getElementById('journalList');

  // Method default ratios and instructions
  const methodPresets = {
    v60: {
      ratio: 16,
      grind: 'medium-fine',
      advice: 'For Hario V60, pour in 4 pulses after bloom. Maintain a steady stream and gentle circle motion.',
      schedule: [
        { time: 0, label: 'Bloom (Pour 2x coffee weight in water)', targetWaterFactor: 2 },
        { time: 45, label: '1st Pour (Up to 50% of total water)', targetWaterFactor: 0.5 },
        { time: 75, label: '2nd Pour (Up to 80% of total water)', targetWaterFactor: 0.8 },
        { time: 105, label: 'Final Pour (Up to 100% water)', targetWaterFactor: 1.0 },
        { time: 180, label: 'Brew complete & drawdown finished', targetWaterFactor: 1.0 }
      ]
    },
    chemex: {
      ratio: 16.5,
      grind: 'medium',
      advice: 'Chemex uses thicker filters resulting in a clean cup. Ensure an even 45s bloom and steady center pours.',
      schedule: [
        { time: 0, label: 'Bloom (Pour 3x coffee weight)', targetWaterFactor: 3 },
        { time: 45, label: 'First major pour to 60%', targetWaterFactor: 0.6 },
        { time: 90, label: 'Second pour to 100%', targetWaterFactor: 1.0 },
        { time: 210, label: 'Drawdown complete', targetWaterFactor: 1.0 }
      ]
    },
    frenchpress: {
      ratio: 15,
      grind: 'coarse',
      advice: 'Immersion brewing. Stir gently at 1 minute, break crust at 4 minutes, and press slowly.',
      schedule: [
        { time: 0, label: 'Add all hot water rapidly and stir', targetWaterFactor: 1.0 },
        { time: 60, label: 'Gentle top stir', targetWaterFactor: 1.0 },
        { time: 240, label: 'Break crust and scoop foam', targetWaterFactor: 1.0 },
        { time: 300, label: 'Press plunger gently and serve', targetWaterFactor: 1.0 }
      ]
    },
    aeropress: {
      ratio: 14,
      grind: 'medium-fine',
      advice: 'Inverted method recommended. Stir 10 seconds, flip at 1:15, and press gently for 30 seconds.',
      schedule: [
        { time: 0, label: 'Add all water and stir 10s', targetWaterFactor: 1.0 },
        { time: 75, label: 'Flip Aeropress onto server', targetWaterFactor: 1.0 },
        { time: 90, label: 'Gentle steady press until hiss', targetWaterFactor: 1.0 }
      ]
    },
    espresso: {
      ratio: 2,
      grind: 'fine',
      advice: 'Precision espresso ratio (1:2). Target 28-32 seconds extraction time for balanced body & acidity.',
      schedule: [
        { time: 0, label: 'Pre-infusion / Pump start', targetWaterFactor: 0.2 },
        { time: 30, label: 'Shot complete', targetWaterFactor: 1.0 }
      ]
    },
    coldbrew: {
      ratio: 8,
      grind: 'coarse',
      advice: 'Steep in cold filtered water for 16-24 hours in refrigerator. Dilute concentrate to taste before serving.',
      schedule: [
        { time: 0, label: 'Combine coffee and cold water, stir well', targetWaterFactor: 1.0 },
        { time: 86400, label: 'Strain through paper or mesh filter', targetWaterFactor: 1.0 }
      ]
    }
  };

  let timerInterval = null;
  let totalSeconds = 0;
  let isRunning = false;
  let currentSchedule = [];
  let totalWaterVal = 0;

  function updateCalculations() {
    const method = methodSelect.value;
    const dose = parseFloat(doseInput.value) || 0;
    const ratio = parseFloat(ratioInput.value) || 16;

    const water = dose * ratio;
    totalWaterVal = water;

    // Estimated TDS and Extraction calculations based on standards
    let baseTds = (1.2 + (dose / water) * 2.5).toFixed(2);
    let baseExtraction = (18 + (1 / ratio) * 15).toFixed(1);

    outWater.textContent = `${water.toFixed(1)} g`;
    outTds.textContent = `${baseTds}%`;
    outExtraction.textContent = `${baseExtraction}%`;

    const preset = methodPresets[method];
    if (preset) {
      adviceText.textContent = preset.advice;
      outGrindRec.textContent = formatGrindName(preset.grind);
      currentSchedule = preset.schedule;
      renderSchedule();
    }
  }

  function formatGrindName(g) {
    const map = {
      'fine': 'Fine',
      'medium-fine': 'Medium-Fine',
      'medium': 'Medium',
      'medium-coarse': 'Medium-Coarse',
      'coarse': 'Coarse'
    };
    return map[g] || g;
  }

  function renderSchedule() {
    scheduleList.innerHTML = '';
    const dose = parseFloat(doseInput.value) || 0;
    const ratio = parseFloat(ratioInput.value) || 16;
    const totalWater = dose * ratio;

    currentSchedule.forEach((step, index) => {
      const li = document.createElement('li');
      li.id = `schedule-step-${index}`;
      
      let targetWaterForStep = 0;
      if (step.targetWaterFactor <= 1 && step.targetWaterFactor > 0 && step.targetWaterFactor !== 2 && step.targetWaterFactor !== 3) {
        targetWaterForStep = Math.round(totalWater * step.targetWaterFactor);
      } else {
        targetWaterForStep = Math.round(dose * step.targetWaterFactor);
      }

      const min = Math.floor(step.time / 60);
      const sec = step.time % 60;
      const timeStr = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;

      li.innerHTML = `<span><strong>${timeStr}</strong> - ${step.label}</span> <span>${targetWaterForStep}g</span>`;
      scheduleList.appendChild(li);
    });
  }

  // Method change updates default ratio
  methodSelect.addEventListener('change', () => {
    const method = methodSelect.value;
    const preset = methodPresets[method];
    if (preset) {
      ratioInput.value = preset.ratio;
      grindSelect.value = preset.grind;
    }
    updateCalculations();
    resetTimer();
  });

  [doseInput, ratioInput, tempInput, grindSelect, roastSelect].forEach(el => {
    el.addEventListener('input', updateCalculations);
  });

  // Timer Logic
  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function updateTimerDisplay() {
    timerClock.textContent = formatTime(totalSeconds);

    // Find active schedule step
    let activeIndex = 0;
    for (let i = 0; i < currentSchedule.length; i++) {
      if (totalSeconds >= currentSchedule[i].time) {
        activeIndex = i;
      }
    }

    // Highlight schedule item
    const items = scheduleList.querySelectorAll('li');
    items.forEach((item, idx) => {
      if (idx === activeIndex) {
        item.classList.add('active-step');
        timerStage.textContent = currentSchedule[idx].label;
        
        const dose = parseFloat(doseInput.value) || 0;
        const ratio = parseFloat(ratioInput.value) || 16;
        const totalWater = dose * ratio;
        let stepFactor = currentSchedule[idx].targetWaterFactor;
        let targetW = stepFactor <= 1 && stepFactor > 0 ? Math.round(totalWater * stepFactor) : Math.round(dose * stepFactor);
        targetWaterCue.textContent = `Target Water: ${targetW}g`;
      } else {
        item.classList.remove('active-step');
      }
    });
  }

  startTimerBtn.addEventListener('click', () => {
    if (!isRunning) {
      isRunning = true;
      startTimerBtn.disabled = true;
      pauseTimerBtn.disabled = false;
      timerInterval = setInterval(() => {
        totalSeconds++;
        updateTimerDisplay();
      }, 1000);
    }
  });

  pauseTimerBtn.addEventListener('click', () => {
    if (isRunning) {
      isRunning = false;
      clearInterval(timerInterval);
      startTimerBtn.disabled = false;
      pauseTimerBtn.disabled = true;
      timerStage.textContent = 'Paused';
    }
  });

  function resetTimer() {
    isRunning = false;
    clearInterval(timerInterval);
    totalSeconds = 0;
    startTimerBtn.disabled = false;
    pauseTimerBtn.disabled = true;
    timerClock.textContent = '00:00';
    timerStage.textContent = 'Ready to brew';
    targetWaterCue.textContent = 'Target Water: 0g';
    updateTimerDisplay();
  }

  resetTimerBtn.addEventListener('click', resetTimer);

  // Journal Local Storage
  function loadJournal() {
    const saved = localStorage.getItem('aurabrew_journal');
    if (!saved) return;
    try {
      const items = JSON.parse(saved);
      journalList.innerHTML = '';
      if (items.length === 0) {
        journalList.innerHTML = '<p class="empty-msg">No saved brews yet. Craft your recipe and save it to your local vault!</p>';
        return;
      }
      items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'journal-item';
        div.innerHTML = `
          <div class="journal-info">
            <h4>${escapeHtml(item.name)} (${item.method.toUpperCase()} - ${item.dose}g coffee)</h4>
            <p>${escapeHtml(item.rating)} • Ratio 1:${item.ratio} • Temp: ${item.temp}°C</p>
          </div>
          <button class="delete-journal" data-index="${index}">Delete</button>
        `;
        journalList.appendChild(div);
      });

      document.querySelectorAll('.delete-journal').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.target.getAttribute('data-index'));
          deleteJournalItem(idx);
        });
      });
    } catch (e) {
      console.error(e);
    }
  }

  function saveJournalItem() {
    const name = coffeeNameInput.value.trim() || 'Untitled Brew';
    const rating = brewRatingInput.value.trim() || 'Great cup';
    const method = methodSelect.value;
    const dose = doseInput.value;
    const ratio = ratioInput.value;
    const temp = tempInput.value;

    const newItem = { name, rating, method, dose, ratio, temp, date: new Date().toLocaleDateString() };
    
    let items = [];
    const saved = localStorage.getItem('aurabrew_journal');
    if (saved) {
      try { items = JSON.parse(saved); } catch (e) {}
    }
    items.unshift(newItem);
    localStorage.setItem('aurabrew_journal', JSON.stringify(items));
    coffeeNameInput.value = '';
    brewRatingInput.value = '';
    loadJournal();
  }

  function deleteJournalItem(index) {
    const saved = localStorage.getItem('aurabrew_journal');
    if (!saved) return;
    try {
      let items = JSON.parse(saved);
      items.splice(index, 1);
      localStorage.setItem('aurabrew_journal', JSON.stringify(items));
      loadJournal();
    } catch (e) {}
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  saveBrewBtn.addEventListener('click', saveJournalItem);

  // Initial boot
  updateCalculations();
  loadJournal();
});
