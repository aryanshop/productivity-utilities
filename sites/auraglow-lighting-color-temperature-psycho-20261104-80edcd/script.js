document.addEventListener('DOMContentLoaded', () => {
  const roomTypeEl = document.getElementById('roomType');
  const activityGoalEl = document.getElementById('activityGoal');
  const roomAreaEl = document.getElementById('roomArea');
  const ceilingHeightEl = document.getElementById('ceilingHeight');
  
  const kelvinSlider = document.getElementById('kelvinSlider');
  const kelvinVal = document.getElementById('kelvinVal');
  const lumenSlider = document.getElementById('lumenSlider');
  const lumenVal = document.getElementById('lumenVal');
  const criSlider = document.getElementById('criSlider');
  const criVal = document.getElementById('criVal');
  
  const resHex = document.getElementById('resHex');
  const resQuality = document.getElementById('resQuality');
  const resCircadian = document.getElementById('resCircadian');
  
  const metricLux = document.getElementById('metricLux');
  const metricLuxStatus = document.getElementById('metricLuxStatus');
  const metricMedi = document.getElementById('metricMedi');
  const metricMediStatus = document.getElementById('metricMediStatus');
  const metricMood = document.getElementById('metricMood');
  const metricMoodDesc = document.getElementById('metricMoodDesc');
  const metricPower = document.getElementById('metricPower');
  const metricPowerDesc = document.getElementById('metricPowerDesc');
  
  const colorSwatch = document.getElementById('colorSwatch');
  const spectrumCanvas = document.getElementById('spectrumCanvas');
  const ctx = spectrumCanvas.getContext('2d');
  
  const btnSavePreset = document.getElementById('btnSavePreset');
  const btnExportJson = document.getElementById('btnExportJson');
  const presetList = document.getElementById('presetList');

  let savedPresets = JSON.parse(localStorage.getItem('auraglow_presets') || '[]');

  // Preset recommendation mapping
  const recommendations = {
    focus: { kelvin: 5000, lumens: 4500 },
    creative: { kelvin: 4000, lumens: 3500 },
    relax: { kelvin: 2400, lumens: 1500 },
    social: { kelvin: 2700, lumens: 2500 },
    precision: { kelvin: 6000, lumens: 5500 }
  };

  function kelvinToRGB(kelvin) {
    const temp = kelvin / 100;
    let red, green, blue;

    // Calculate Red
    if (temp <= 66) {
      red = 255;
    } else {
      red = temp - 60;
      red = 329.698727446 * Math.pow(red, -0.1332047592);
      if (red < 0) red = 0;
      if (red > 255) red = 255;
    }

    // Calculate Green
    if (temp <= 66) {
      green = temp;
      green = 99.4708025861 * Math.log(green) - 161.1195681661;
      if (green < 0) green = 0;
      if (green > 255) green = 255;
    } else {
      green = temp - 60;
      green = 288.1221695283 * Math.pow(green, -0.0755148492);
      if (green < 0) green = 0;
      if (green > 255) green = 255;
    }

    // Calculate Blue
    if (temp >= 66) {
      blue = 255;
    } else if (temp <= 19) {
      blue = 0;
    } else {
      blue = temp - 10;
      blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
      if (blue < 0) blue = 0;
      if (blue > 255) blue = 255;
    }

    return {
      r: Math.round(red),
      g: Math.round(green),
      b: Math.round(blue)
    };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  function updateCalculations() {
    const kelvin = parseInt(kelvinSlider.value);
    const lumens = parseInt(lumenSlider.value);
    const cri = parseInt(criSlider.value);
    const area = parseFloat(roomAreaEl.value) || 150;
    const height = parseFloat(ceilingHeightEl.value) || 9;

    kelvinVal.textContent = `${kelvin}K`;
    lumenVal.textContent = `${lumens} lm`;
    criVal.textContent = `${cri} Ra`;

    // RGB calculation
    const rgb = kelvinToRGB(kelvin);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    resHex.textContent = hex;

    // Quality assessment
    if (cri >= 90) {
      resQuality.textContent = 'High Fidelity (Museum Grade)';
    } else if (cri >= 80) {
      resQuality.textContent = 'Standard Residential';
    } else {
      resQuality.textContent = 'Low Fidelity (Color Distorted)';
    }

    // Circadian impact
    let circadianText = 'Melatonin Neutral';
    if (kelvin >= 5000) {
      circadianText = 'High Alertness & Suppression';
    } else if (kelvin >= 3800) {
      circadianText = 'Moderate Daytime Support';
    } else if (kelvin < 3000) {
      circadianText = 'Relaxation & Wind-Down';
    }
    resCircadian.textContent = circadianText;

    // Lux calculation (Lumens / Area in sq meters approx, or simplified sq ft)
    // Average foot-candles = lumens / area, then convert to lux (1 fc = 10.764 lux)
    const sqMeters = area * 0.092903;
    const lux = Math.round(lumens / sqMeters);
    metricLux.textContent = `${lux} lx`;
    
    if (lux < 100) {
      metricLuxStatus.textContent = 'Dim ambient / Mood lighting';
    } else if (lux <= 300) {
      metricLuxStatus.textContent = 'Comfortable living room level';
    } else if (lux <= 750) {
      metricLuxStatus.textContent = 'Optimal office work level';
    } else {
      metricLuxStatus.textContent = 'High precision industrial level';
    }

    // Melanopic EDI estimation (simplified proxy based on kelvin and lumens)
    const mediFactor = (kelvin / 6500) * 0.9 + 0.1;
    const medi = Math.round(lux * mediFactor * 0.8);
    metricMedi.textContent = `${medi} mEDI`;
    
    if (medi > 250) {
      metricMediStatus.textContent = 'Strong biological stimulus';
    } else if (medi > 100) {
      metricMediStatus.textContent = 'Moderate circadian stimulus';
    } else {
      metricMediStatus.textContent = 'Minimal circadian disruption';
    }

    // Psychological Mood Index
    let moodTitle = 'Balanced & Calm';
    let moodDesc = 'Encourages focused serenity';
    if (kelvin > 5000 && lumens > 3000) {
      moodTitle = 'Vibrant & Energetic';
      moodDesc = 'Boosts reaction speed and alertness';
    } else if (kelvin < 3000 && lumens < 2500) {
      moodTitle = 'Cozy & Intimate';
      moodDesc = 'Fosters safety, warmth, and relaxation';
    } else if (kelvin >= 3500 && kelvin <= 4500) {
      moodTitle = 'Clear & Neutral';
      moodDesc = 'Supports sustained attention without fatigue';
    } else if (kelvin < 3000 && lumens >= 3000) {
      moodTitle = 'Warm & Stimulating';
      moodDesc = 'Bright social warmth without harsh blue light';
    }
    metricMood.textContent = moodTitle;
    metricMoodDesc.textContent = moodDesc;

    // Estimated Power Load (Assuming ~110 lumens per watt for modern LED fixtures)
    const wattage = (lumens / 110).toFixed(1);
    metricPower.textContent = `${wattage} W`;
    metricPowerDesc.textContent = `Estimated @ 110 lm/W LED efficacy`;

    // Update Canvas Visualizer
    drawSpectrumCanvas(rgb, kelvin, lumens);
    colorSwatch.style.backgroundColor = hex;
  }

  function drawSpectrumCanvas(rgb, kelvin, lumens) {
    const width = spectrumCanvas.width;
    const height = spectrumCanvas.height;

    ctx.clearRect(0, 0, width, height);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, 0);
    bgGrad.addColorStop(0, '#1e293b');
    bgGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Draw spectrum curve representation
    ctx.beginPath();
    ctx.moveTo(0, height - 30);

    const peakX = width * ((kelvin - 1800) / (6500 - 1800));
    
    for (let x = 0; x < width; x += 2) {
      // Distance from peak determines bell curve height
      const dist = Math.abs(x - peakX);
      const curveHeight = Math.max(15, height - 40 - (Math.exp(-(dist * dist) / (2 * 60 * 60)) * (height - 60)));
      ctx.lineTo(x, curveHeight);
    }

    ctx.lineTo(width, height - 30);
    ctx.closePath();

    const fillGrad = ctx.createLinearGradient(0, 0, width, 0);
    fillGrad.addColorStop(0, 'rgba(255, 140, 0, 0.4)');
    fillGrad.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`);
    fillGrad.addColorStop(1, 'rgba(100, 200, 255, 0.4)');
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // Stroke spectrum curve
    ctx.beginPath();
    for (let x = 0; x < width; x += 2) {
      const dist = Math.abs(x - peakX);
      const curveHeight = Math.max(15, height - 40 - (Math.exp(-(dist * dist) / (2 * 60 * 60)) * (height - 60)));
      if (x === 0) ctx.moveTo(x, curveHeight);
      else ctx.lineTo(x, curveHeight);
    }
    ctx.strokeStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Axis labels

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText('1800K (Warm)', 15, height - 10);
    ctx.fillText('4000K', width / 2 - 20, height - 10);
    ctx.fillText('6500K (Cool)', width - 90, height - 10);
  }

  activityGoalEl.addEventListener('change', () => {
    const goal = activityGoalEl.value;
    if (recommendations[goal]) {
      kelvinSlider.value = recommendations[goal].kelvin;
      lumenSlider.value = recommendations[goal].lumens;
      updateCalculations();
    }
  });

  kelvinSlider.addEventListener('input', updateCalculations);
  lumenSlider.addEventListener('input', updateCalculations);
  criSlider.addEventListener('input', updateCalculations);
  roomAreaEl.addEventListener('input', updateCalculations);
  ceilingHeightEl.addEventListener('input', updateCalculations);
  roomTypeEl.addEventListener('change', updateCalculations);

  // Preset Management
  function renderPresets() {
    if (savedPresets.length === 0) {
      presetList.innerHTML = '<p class="empty-msg">No saved configurations yet. Configure your ideal lighting and click "Save Lighting Setup".</p>';
      return;
    }

    presetList.innerHTML = '';
    savedPresets.forEach((p, index) => {
      const item = document.createElement('div');
      item.className = 'preset-item';
      item.innerHTML = `
        <div class="preset-info">
          <span class="preset-title">${p.roomName} &mdash; ${p.activityName}</span>
          <span class="preset-details">${p.kelvin}K | ${p.lumens} lm | ${p.cri} Ra (${p.hex})</span>
        </div>
        <div class="preset-actions">
          <button class="btn-sm" data-action="load" data-index="${index}">Load</button>
          <button class="btn-sm btn-danger" data-action="delete" data-index="${index}">Del</button>
        </div>
      `;
      presetList.appendChild(item);
    });
  }

  btnSavePreset.addEventListener('click', () => {
    const newPreset = {
      roomType: roomTypeEl.value,
      roomName: roomTypeEl.options[roomTypeEl.selectedIndex].text,
      activityGoal: activityGoalEl.value,
      activityName: activityGoalEl.options[activityGoalEl.selectedIndex].text,
      kelvin: parseInt(kelvinSlider.value),
      lumens: parseInt(lumenSlider.value),
      cri: parseInt(criSlider.value),
      area: roomAreaEl.value,
      height: ceilingHeightEl.value,
      hex: resHex.textContent,
      timestamp: new Date().toLocaleDateString()
    };

    savedPresets.unshift(newPreset);
    if (savedPresets.length > 10) savedPresets.pop();
    localStorage.setItem('auraglow_presets', JSON.stringify(savedPresets));
    renderPresets();
  });

  presetList.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const index = parseInt(btn.getAttribute('data-index'));
    const action = btn.getAttribute('data-action');

    if (action === 'load') {
      const p = savedPresets[index];
      if (p) {
        roomTypeEl.value = p.roomType;
        activityGoalEl.value = p.activityGoal;
        kelvinSlider.value = p.kelvin;
        lumenSlider.value = p.lumens;
        criSlider.value = p.cri;
        roomAreaEl.value = p.area;
        ceilingHeightEl.value = p.height;
        updateCalculations();
      }
    } else if (action === 'delete') {
      savedPresets.splice(index, 1);
      localStorage.setItem('auraglow_presets', JSON.stringify(savedPresets));
      renderPresets();
    }
  });

  btnExportJson.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8,"+ encodeURIComponent(JSON.stringify(savedPresets, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "auraglow_lighting_presets.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  // Initial calculation
  updateCalculations();
  renderPresets();
});
