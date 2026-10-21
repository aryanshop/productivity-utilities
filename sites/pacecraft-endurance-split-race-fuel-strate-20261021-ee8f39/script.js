document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const raceDistanceSelect = document.getElementById('raceDistance');
  const customDistanceGroup = document.getElementById('customDistanceGroup');
  const customKmInput = document.getElementById('customKm');
  const targetHoursInput = document.getElementById('targetHours');
  const targetMinutesInput = document.getElementById('targetMinutes');
  const targetSecondsInput = document.getElementById('targetSeconds');
  const unitRadios = document.querySelectorAll('input[name="units"]');
  const pacingStrategySelect = document.getElementById('pacingStrategy');
  const runnerWeightInput = document.getElementById('runnerWeight');
  const carbTargetSelect = document.getElementById('carbTarget');
  const gelCarbsInput = document.getElementById('gelCarbs');
  const fluidTargetSelect = document.getElementById('fluidTarget');

  const avgPaceDisplay = document.getElementById('avgPaceDisplay');
  const avgPaceUnit = document.getElementById('avgPaceUnit');
  const totalDistDisplay = document.getElementById('totalDistDisplay');
  const totalCaloriesDisplay = document.getElementById('totalCaloriesDisplay');
  const totalGelsDisplay = document.getElementById('totalGelsDisplay');
  const splitTableBody = document.getElementById('splitTableBody');
  const tableSummaryCount = document.getElementById('tableSummaryCount');
  const btnPrint = document.getElementById('btnPrint');
  const pacingCanvas = document.getElementById('pacingCanvas');

  // Presets configuration
  const distancePresets = {
    "5": 5,
    "10": 10,
    "21.1": 21.125,
    "42.2": 42.195
  };

  function getSelectedDistanceKm() {
    const val = raceDistanceSelect.value;
    if (val === 'custom') {
      return Math.max(0.5, parseFloat(customKmInput.value) || 10);
    }
    return distancePresets[val] || 42.195;
  }

  function getSelectedUnits() {
    for (const r of unitRadios) {
      if (r.checked) return r.value;
    }
    return 'km';
  }

  function formatTime(totalSeconds) {
    if (isNaN(totalSeconds) || totalSeconds < 0) return "0:00";
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);

    const pad = (n) => String(n).padStart(2, '0');

    if (hrs > 0) {
      return `${hrs}:${pad(mins)}:${pad(secs)}`;
    }
    return `${mins}:${pad(secs)}`;
  }

  function formatPace(secondsPerKm, units) {
    if (isNaN(secondsPerKm) || secondsPerKm <= 0) return "--:--";
    const targetSecs = units === 'mi' ? secondsPerKm * 1.60934 : secondsPerKm;
    const mins = Math.floor(targetSecs / 60);
    const secs = Math.round(targetSecs % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  function calculatePlan() {
    const distKm = getSelectedDistanceKm();
    const units = getSelectedUnits();
    
    // Target time in seconds
    const hrs = parseInt(targetHoursInput.value) || 0;
    const mins = parseInt(targetMinutesInput.value) || 0;
    const secs = parseInt(targetSecondsInput.value) || 0;
    const totalTargetSeconds = (hrs * 3600) + (mins * 60) + secs;

    if (totalTargetSeconds <= 0 || distKm <= 0) return;

    // Average pace in seconds per km
    const avgSecsPerKm = totalTargetSeconds / distKm;

    // Update summary metrics
    const displayDist = units === 'mi' ? distKm / 1.60934 : distKm;
    totalDistDisplay.textContent = `${displayDist.toFixed(1)} ${units}`;
    avgPaceDisplay.textContent = formatPace(avgSecsPerKm, units);
    avgPaceUnit.textContent = `min/${units}`;

    // Calories estimation: ~1 kcal per kg per km
    const weightKg = parseFloat(runnerWeightInput.value) || 70;
    const totalCalories = Math.round(weightKg * distKm * 1.02);
    totalCaloriesDisplay.textContent = totalCalories.toLocaleString();

    // Nutrition planning
    const carbRate = parseInt(carbTargetSelect.value) || 60;
    const gelGrams = parseInt(gelCarbsInput.value) || 25;
    const fluidRate = parseInt(fluidTargetSelect.value) || 600;

    const totalHours = totalTargetSeconds / 3600;
    const totalCarbsNeeded = carbRate * totalHours;
    const totalGels = Math.ceil(totalCarbsNeeded / gelGrams);
    totalGelsDisplay.textContent = totalGels;

    // Generate Splits (by km or miles depending on unit selection)
    const stepUnitKm = units === 'mi' ? 1.60934 : 1.0;
    const numSplits = Math.ceil(distKm / stepUnitKm);
    
    let splitsData = [];
    let cumulativeTime = 0;
    let currentKm = 0;

    const strategy = pacingStrategySelect.value;

    for (let i = 1; i <= numSplits; i++) {
      const segmentDistKm = Math.min(stepUnitKm, distKm - currentKm);
      const segmentFraction = segmentDistKm / stepUnitKm;

      // Calculate multiplier based on strategy
      let paceMultiplier = 1.0;
      const progress = currentKm / distKm;

      if (strategy === 'negative') {
        // Start 3% slower, finish faster
        paceMultiplier = 1.03 - (0.06 * progress);
      } else if (strategy === 'positive') {
        // Start 3% faster, slow down
        paceMultiplier = 0.97 + (0.06 * progress);
      } else if (strategy === 'hills') {
        // Simulate undulating terrain
        paceMultiplier = 1.0 + Math.sin(progress * Math.PI * 4) * 0.04;
      }

      const segmentSecsPerKm = avgSecsPerKm * paceMultiplier;
      const segmentTime = segmentSecsPerKm * segmentDistKm;
      cumulativeTime += segmentTime;

      splitsData.push({
        index: i,
        distanceLabel: `${i} ${units}`,
        segmentPace: segmentSecsPerKm,
        splitTime: segmentTime,
        elapsedTime: cumulativeTime,
        elevation: Math.sin(progress * Math.PI * 6) * 25 + 20
      });

      currentKm += segmentDistKm;
    }

    // Distribute Gels and Fluid across splits
    // Frequency of gels (e.g., every 30-40 mins)
    const gelIntervalSeconds = 2400; // 40 mins
    let nextGelTime = gelIntervalSeconds;

    tableSummaryCount.textContent = `${splitsData.length} Splits`;
    splitTableBody.innerHTML = '';

    splitsData.forEach((split, idx) => {
      const tr = document.createElement('tr');

      // Check if fuel is due in this split
      let fuelAction = '-';
      if (split.elapsedTime >= nextGelTime && idx < splitsData.length - 1) {
        fuelAction = `<span class="fuel-badge">Energy Gel</span>`;
        nextGelTime += gelIntervalSeconds;
      }

      // Fluid every split or alternate
      const fluidMl = Math.round((split.splitTime / 3600) * fluidRate);
      const fluidAction = `<span class="fluid-badge">${fluidMl} ml</span>`;

      tr.innerHTML = `
        <td><strong>#${split.index}</strong></td>
        <td>${split.index} ${units}</td>
        <td>${formatPace(split.segmentPace, units)}</td>
        <td>${formatTime(split.elapsedTime)}</td>
        <td>${formatTime(split.splitTime)}</td>
        <td>${fuelAction}</td>
        <td>${fluidAction}</td>
      `;
      splitTableBody.appendChild(tr);
    });

    drawChart(splitsData, units);
  }

  function drawChart(splits, units) {
    const ctx = pacingCanvas.getContext('2d');
    const width = pacingCanvas.width;
    const height = pacingCanvas.height;

    ctx.clearRect(0, 0, width, height);

    if (!splits || splits.length === 0) return;

    const padding = 30;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;

    // Find min/max for scaling
    const paces = splits.map(s => s.segmentPace);
    const minPace = Math.min(...paces);
    const maxPace = Math.max(...paces);
    const paceRange = Math.max(1, maxPace - minPace);

    const maxElev = 60;

    // Draw elevation gradient area
    ctx.beginPath();
    splits.forEach((s, i) => {
      const x = padding + (i / (splits.length - 1 || 1)) * graphWidth;
      const y = height - padding - (s.elevation / maxElev) * (graphHeight * 0.4);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(width - padding, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    ctx.fillStyle = 'rgba(203, 213, 225, 0.3)';
    ctx.fill();

    // Draw Pace Line
    ctx.beginPath();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 3;
    splits.foreach = splits.forEach;
    splits.forEach((s, i) => {
      const x = padding + (i / (splits.length - 1 || 1)) * graphWidth;
      // Invert pace: faster pace (lower seconds) should be higher up
      const normalizedPace = 1 - ((s.segmentPace - minPace) / paceRange);
      const y = padding + (1 - normalizedPace) * (graphHeight * 0.6) + 10;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw fuel points
    splits.forEach((s, i) => {
      // Mark every 4th split or approximate gel markers
      if (i > 0 && i % 4 === 0) {
        const x = padding + (i / (splits.length - 1 || 1)) * graphWidth;
        const normalizedPace = 1 - ((s.segmentPace - minPace) / paceRange);
        const y = padding + (1 - normalizedPace) * (graphHeight * 0.6) + 10;

        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }
    });
  }

  // Event Listeners
  raceDistanceSelect.addEventListener('change', () => {
    if (raceDistanceSelect.value === 'custom') {
      customDistanceGroup.classList.remove('hidden');
    } else {
      customDistanceGroup.classList.add('hidden');
      // Auto-set reasonable default targets for presets
      const preset = raceDistanceSelect.value;
      if (preset === '5') {
        targetHoursInput.value = 0;
        targetMinutesInput.value = 24;
        targetSecondsInput.value = 0;
      } else if (preset === '10') {
        targetHoursInput.value = 0;
        targetMinutesInput.value = 50;
        targetSecondsInput.value = 0;
      } else if (preset === '21.1') {
        targetHoursInput.value = 1;
        targetMinutesInput.value = 50;
        targetSecondsInput.value = 0;
      } else if (preset === '42.2') {
        targetHoursInput.value = 3;
        targetMinutesInput.value = 45;
        targetSecondsInput.value = 0;
      }
    }
    calculatePlan();
  });

  const inputsToWatch = [
    customKmInput, targetHoursInput, targetMinutesInput, targetSecondsInput,
    pacingStrategySelect, runnerWeightInput, carbTargetSelect, gelCarbsInput, fluidTargetSelect
  ];

  inputsToWatch.forEach(input => {
    input.addEventListener('input', calculatePlan);
  });

  unitRadios.forEach(radio => {
    radio.addEventListener('change', calculatePlan);
  });

  btnPrint.addEventListener('click', () => {
    window.print();
  });

  // Initial calculation
  calculatePlan();
});
