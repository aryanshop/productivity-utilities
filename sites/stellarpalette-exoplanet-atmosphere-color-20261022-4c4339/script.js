document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const starTypeSelect = document.getElementById('star-type');
  const starTempSlider = document.getElementById('star-temp');
  const valTemp = document.getElementById('val-temp');

  const sliderN2 = document.getElementById('slider-n2');
  const sliderCo2 = document.getElementById('slider-co2');
  const sliderCh4 = document.getElementById('slider-ch4');
  const sliderH2o = document.getElementById('slider-h2o');
  const sliderSo2 = document.getElementById('slider-so2');

  const valN2 = document.getElementById('val-n2');
  const valCo2 = document.getElementById('val-co2');
  const valCh4 = document.getElementById('val-ch4');
  const valH2o = document.getElementById('val-h2o');
  const valSo2 = document.getElementById('val-so2');

  const surfacePressure = document.getElementById('surface-pressure');
  const valPressure = document.getElementById('val-pressure');

  const sunElevation = document.getElementById('sun-elevation');
  const valElevation = document.getElementById('val-elevation');

  const skyCanvas = document.getElementById('skyCanvas');
  const ctx = skyCanvas.getContext('2d');
  const sunDisk = document.getElementById('sunDisk');

  const txtZenithHex = document.getElementById('txt-zenith-hex');
  const txtHorizonHex = document.getElementById('txt-horizon-hex');
  const txtSunsetHex = document.getElementById('txt-sunset-hex');

  const swatchesGrid = document.getElementById('swatchesGrid');
  const btnCopyCss = document.getElementById('btn-copy-css');
  const btnExportJson = document.getElementById('btn-export-json');
  const copyToast = document.getElementById('copy-toast');

  const btnPresetEarth = document.getElementById('btn-preset-earth');
  const btnPresetMars = document.getElementById('btn-preset-mars');
  const btnPresetTitan = document.getElementById('btn-preset-titan');
  const btnReset = document.getElementById('btn-reset');

  const statScattering = document.getElementById('stat-scattering');
  const statOpacity = document.getElementById('stat-opacity');
  const statInsolation = document.getElementById('stat-insolation');
  const statDescription = document.getElementById('stat-description');

  // State object
  let state = {
    starType: 'G',
    starTemp: 5800,
    n2: 78,
    co2: 1,
    ch4: 1,
    h2o: 1,
    so2: 19,
    pressure: 1.0,
    elevation: 45
  };

  // Preset definitions
  const presets = {
    earth: { starType: 'G', starTemp: 5800, n2: 78, co2: 1, ch4: 0, h2o: 1, so2: 20, pressure: 1.0, elevation: 45 },
    mars:  { starType: 'G', starTemp: 5800, n2: 3,  co2: 95, ch4: 1, h2o: 0, so2: 1,  pressure: 0.01, elevation: 45 },
    titan: { starType: 'K', starTemp: 4500, n2: 95, co2: 0, ch4: 4, h2o: 0, so2: 1,  pressure: 1.5, elevation: 30 }
  };

  // Helper: Temperature to approximate RGB
  function kelvinToRGB(kelvin) {
    let temp = kelvin / 100;
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

    return { r: Math.round(red), g: Math.round(green), b: Math.round(blue) };
  }

  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = Math.max(0, Math.min(255, x)).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  // Normalize sliders so total sum is 100
  function handleSliderChange(changedKey, newValue) {
    state[changedKey] = parseInt(newValue);
    
    const keys = ['n2', 'co2', 'ch4', 'h2o', 'so2'];
    let otherKeys = keys.filter(k => k !== changedKey);
    
    let currentSum = keys.reduce((acc, k) => acc + state[k], 0);
    
    if (currentSum !== 100 && currentSum > 0) {
      let diff = 100 - state[changedKey];
      let otherSum = otherKeys.reduce((acc, k) => acc + state[k], 0);
      
      if (otherSum === 0) {
        // Distribute evenly if others are 0
        let share = Math.floor(diff / otherKeys.length);
        otherKeys.forEach((k, idx) => {
          state[k] = idx === 0 ? diff - (share * (otherKeys.length - 1)) : share;
        });
      } else {
        // Proportional adjustment
        let factor = diff / otherSum;
        let runningTotal = state[changedKey];
        otherKeys.forEach((k, idx) => {
          if (idx === otherKeys.length - 1) {
            state[k] = Math.max(0, 100 - runningTotal);
          } else {
            state[k] = Math.max(0, Math.round(state[k] * factor));
            runningTotal += state[k];
          }
        });
      }
    }
    updateUIValues();
    computeAndRender();
  }

  function updateUIValues() {
    starTypeSelect.value = state.starType;
    starTempSlider.value = state.starTemp;
    valTemp.textContent = state.starTemp;

    sliderN2.value = state.n2;
    sliderCo2.value = state.co2;
    sliderCh4.value = state.ch4;
    sliderH2o.value = state.h2o;
    sliderSo2.value = state.so2;

    valN2.textContent = state.n2 + '%';
    valCo2.textContent = state.co2 + '%';
    valCh4.textContent = state.ch4 + '%';
    valH2o.textContent = state.h2o + '%';
    valSo2.textContent = state.so2 + '%';

    surfacePressure.value = state.pressure;
    valPressure.textContent = state.pressure.toFixed(1);

    sunElevation.value = state.elevation;
    valElevation.textContent = state.elevation;
  }

  function computeAndRender() {
    // 1. Star Color
    const starRGB = kelvinToRGB(state.starTemp);
    
    // 2. Gas scattering coefficients
    // Rayleigh scattering favors blue/violet (higher weight for N2, H2O)
    // Mie/Aerosol scattering favors white/yellow/red (SO2, CO2 dust, CH4 haze)
    let rFactor = (state.co2 * 0.8 + state.so2 * 1.5 + state.ch4 * 1.2) / 100;
    let gFactor = (state.n2 * 0.5 + state.co2 * 0.7 + state.so2 * 0.9) / 100;
    let bFactor = (state.n2 * 1.8 + state.h2o * 1.2) / 100;

    let opticalDensity = state.pressure;

    // Zenith color calculation
    let zenR = Math.min(255, Math.max(10, (starRGB.r * 0.2) + (bFactor * 40 * opticalDensity * (state.elevation / 90))));
    let zenG = Math.min(255, Math.max(20, (starRGB.g * 0.4) + (gFactor * 90 * opticalDensity)));
    let zenB = Math.min(255, Math.max(40, (starRGB.b * 0.8) + (bFactor * 180 * opticalDensity)));

    // Adjust for heavy aerosols (Titan / Venus style orange/brown haze)
    if (state.so2 > 30 || state.ch4 > 30) {
      zenR = Math.min(255, zenR + 140);
      zenG = Math.max(20, zenG - 30);
      zenB = Math.max(10, zenB - 80);
    }

    // Horizon color calculation (whitened or sunset glow via Rayleigh path length)
    let airMass = Math.max(1, 1 / (Math.sin((state.elevation * Math.PI) / 180) + 0.05));
    
    let horizR = Math.min(255, zenR * (0.8 + airMass * 0.1));
    let horizG = Math.min(255, zenG * (0.7 + airMass * 0.05));
    let horizB = Math.max(10, zenB / (airMass * 0.6));

    // Sunset / Sunrise direct glow
    let sunGlowR = Math.min(255, starRGB.r * 1.2);
    let sunGlowG = Math.min(255, starRGB.g * (1 - (state.elevation / 90) * 0.5));
    let sunGlowB = Math.max(10, starRGB.b * (state.elevation / 90));

    if (state.elevation < 20) {
      let factor = (20 - state.elevation) / 20;
      horizR = Math.min(255, horizR + factor * 100);
      horizG = Math.max(20, horizG - factor * 30);
    }

    const zenithHex = rgbToHex(zenR, zenG, zenB);
    const horizonHex = rgbToHex(horizR, horizG, horizB);
    const sunsetHex = rgbToHex(sunGlowR, sunGlowG, sunGlowB);

    // Update HUD text
    txtZenithHex.textContent = zenithHex;
    txtHorizonHex.textContent = horizonHex;
    txtSunsetHex.textContent = sunsetHex;

    // Render Sky Canvas
    drawSkyDome(zenithHex, horizonHex, sunsetHex);

    // Render Swatches
    renderSwatches({
      zenith: zenithHex,
      horizon: horizonHex,
      sunset: sunsetHex,
      star: rgbToHex(starRGB.r, starRGB.g, starRGB.b),
      twilight: rgbToHex(Math.round(zenR * 0.5), Math.round(zenG * 0.4), Math.round(zenB * 0.7))
    });

    // Update Physics Panel
    updatePhysicsPanel(airMass, opticalDensity);
  }

  function drawSkyDome(zenith, horizon, sunset) {
    skyCanvas.width = skyCanvas.clientWidth || 600;
    skyCanvas.height = skyCanvas.clientHeight || 350;
    const w = skyCanvas.width;
    const h = skyCanvas.height;

    // Gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, zenith);
    grad.addColorStop(0.7, horizon);
    grad.addColorStop(1, sunset);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Position Sun Disk based on elevation and center
    const sunX = w / 2;
    const sunY = h - (state.elevation / 90) * (h * 0.8) - 20;
    
    sunDisk.style.left = `${(sunX / w) * 100}%`;
    sunDisk.style.top = `${(sunY / h) * 100}%`;
  }

  function renderSwatches(colors) {
    swatchesGrid.innerHTML = '';
    const labels = {
      zenith: 'Zenith Sky',
      horizon: 'Horizon Glow',
      sunset: 'Solar Flare',
      star: 'Host Star',
      twilight: 'Deep Twilight'
    };

    for (let key in colors) {
      const hex = colors[key];
      const box = document.createElement('div');
      box.className = 'swatch-box';
      box.innerHTML = `
        <div class="swatch-color" style="background-color: ${hex};"></div>
        <div class="swatch-info">
          <span class="swatch-name">${labels[key]}</span>
          <span class="swatch-hex">${hex}</span>
        </div>
      `;
      swatchesGrid.appendChild(box);
    }
  }

  function updatePhysicsPanel(airMass, opticalDensity) {
    let scatteringType = 'Rayleigh Scattering (Molecular)';
    if (state.so2 > 25) scatteringType = 'Mie Scattering (Aerosol / Sulfates)';
    else if (state.co2 > 50) scatteringType = 'Carbon Dioxide Absorption & Rayleigh';
    else if (state.ch4 > 20) scatteringType = 'Hydrocarbon Photochemical Haze';

    statScattering.textContent = scatteringType;
    statOpacity.textContent = `${opticalDensity.toFixed(2)} (${airMass.toFixed(1)} airmass)`;
    
    let insolation = (Math.pow(state.starTemp / 5800, 4) * (state.elevation / 90)).toFixed(2);
    statInsolation.textContent = `${insolation} Sol`;

    statDescription.textContent = `At an elevation angle of ${state.elevation}° under a ${state.starTemp}K stellar flux, light travels through ${airMass.toFixed(1)} atmospheric path lengths. The resulting refractive index produces dominant ${scatteringType.toLowerCase()} with high optical clarity at the zenith.`;
  }

  // Event Listeners
  starTypeSelect.addEventListener('change', (e) => {
    state.starType = e.target.value;
    switch(state.starType) {
      case 'M': state.starTemp = 3200; break;
      case 'K': state.starTemp = 4500; break;
      case 'G': state.starTemp = 5800; break;
      case 'F': state.starTemp = 6800; break;
      case 'A': state.starTemp = 9000; break;
    }
    updateUIValues();
    computeAndRender();
  });

  starTempSlider.addEventListener('input', (e) => {
    state.starTemp = parseInt(e.target.value);
    valTemp.textContent = state.starTemp;
    computeAndRender();
  });

  sliderN2.addEventListener('input', (e) => handleSliderChange('n2', e.target.value));
  sliderCo2.addEventListener('input', (e) => handleSliderChange('co2', e.target.value));
  sliderCh4.addEventListener('input', (e) => handleSliderChange('ch4', e.target.value));
  sliderH2o.addEventListener('input', (e) => handleSliderChange('h2o', e.target.value));
  sliderSo2.addEventListener('input', (e) => handleSliderChange('so2', e.target.value));

  surfacePressure.addEventListener('input', (e) => {
    state.pressure = parseFloat(e.target.value);
    valPressure.textContent = state.pressure.toFixed(1);
    computeAndRender();
  });

  sunElevation.addEventListener('input', (e) => {
    state.elevation = parseInt(e.target.value);
    valElevation.textContent = state.elevation;
    computeAndRender();
  });

  // Presets
  btnPresetEarth.addEventListener('click', () => {
    Object.assign(state, presets.earth);
    updateUIValues();
    computeAndRender();
  });

  btnPresetMars.addEventListener('click', () => {
    Object.assign(state, presets.mars);
    updateUIValues();
    computeAndRender();
  });

  btnPresetTitan.addEventListener('click', () => {
    Object.assign(state, presets.titan);
    updateUIValues();
    computeAndRender();
  });

  btnReset.addEventListener('click', () => {
    Object.assign(state, presets.earth);
    updateUIValues();
    computeAndRender();
  });

  // Export Actions
  btnCopyCss.addEventListener('click', () => {
    const starRGB = kelvinToRGB(state.starTemp);
    const cssVars = `:root {
  --exoplanet-star: ${rgbToHex(starRGB.r, starRGB.g, starRGB.b)};
  --exoplanet-zenith: ${txtZenithHex.textContent};
  --exoplanet-horizon: ${txtHorizonHex.textContent};
  --exoplanet-sunset: ${txtSunsetHex.textContent};
}`;
    
    navigator.clipboard.writeText(cssVars).then(() => {
      copyToast.classList.remove('hidden');
      setTimeout(() => copyToast.classList.add('hidden'), 2000);
    }).catch(() => {
      alert('Unable to copy to clipboard.');
    });
  });

  btnExportJson.addEventListener('click', () => {
    const jsonString = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exoplanet-atmosphere-blueprint.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Initial load
  updateUIValues();
  computeAndRender();
});
