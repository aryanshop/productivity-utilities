document.addEventListener('DOMContentLoaded', () => {
  const roomLengthInput = document.getElementById('room-length');
  const roomWidthInput = document.getElementById('room-width');
  const roomHeightInput = document.getElementById('room-height');
  const occupantCountInput = document.getElementById('occupant-count');
  const spaceTypeSelect = document.getElementById('space-type');
  const unitSystemSelect = document.getElementById('unit-system');
  const roomNameInput = document.getElementById('room-name');

  const resVolume = document.getElementById('res-volume');
  const resCfm = document.getElementById('res-cfm');
  const resAch = document.getElementById('res-ach');
  const resCadr = document.getElementById('res-cadr');
  
  const unitVolume = document.getElementById('unit-volume');
  const unitAirflow = document.getElementById('unit-airflow');
  const unitCadr = document.getElementById('unit-cadr');
  const unitLabels = document.querySelectorAll('.unit-label');

  const recommendationsList = document.getElementById('recommendations-list');
  const calcBtn = document.getElementById('calc-btn');
  const resetBtn = document.getElementById('reset-btn');
  const toggleSimBtn = document.getElementById('toggle-sim-btn');

  const canvas = document.getElementById('airflow-canvas');
  const ctx = canvas.getContext('2d');

  let isSimRunning = true;
  let particles = [];
  const numParticles = 60;

  const achProfiles = {
    office: { ach: 6, name: 'Home Office / Study', note: 'Requires steady fresh air exchange to mitigate CO2 buildup from extended computer work.' },
    living: { ach: 4, name: 'Living Room / Bedroom', note: 'Standard residential standard ensuring comfortable indoor air quality without excessive drafts.' },
    kitchen: { ach: 15, name: 'Kitchen / Cooking Space', note: 'High turnover required to rapidly clear cooking fumes, excess humidity, and grease particulates.' },
    workshop: { ach: 10, name: 'Workshop / Hobby Garage', note: 'Designed to vent particulate dust, vapors, and odors effectively.' },
    bathroom: { ach: 8, name: 'Bathroom / Restroom', note: 'Rapid exhaust ventilation essential for moisture control and preventing mold growth.' },
    gym: { ach: 12, name: 'Home Gym / Fitness', note: 'High airflow volume required during intense workouts to regulate body heat and heavy respiration.' }
  };

  function initParticles() {
    particles = [];
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: 1 + Math.random() * 2,
        size: 1.5 + Math.random() * 2,
        alpha: 0.2 + Math.random() * 0.7
      });
    }
  }

  function updateCalculations() {
    let length = parseFloat(roomLengthInput.value) || 0;
    let width = parseFloat(roomWidthInput.value) || 0;
    let height = parseFloat(roomHeightInput.value) || 0;
    let occupants = parseInt(occupantCountInput.value) || 0;
    let spaceKey = spaceTypeSelect.value;
    let isMetric = unitSystemSelect.value === 'metric';

    let profile = achProfiles[spaceKey] || achProfiles.office;
    let targetACH = profile.ach;

    // Update unit labels visually
    unitLabels.forEach(el => {
      el.textContent = isMetric ? 'm' : 'ft';
    });

    let volume, cfm, cadr;

    if (isMetric) {
      // Convert meters to feet for internal ASHRAE calculations or compute directly
      // 1 m3 = 35.3147 cu ft
      let volumeM3 = length * width * height;
      volume = volumeM3 * 35.3147;
      // CFM formula: (Volume * ACH) / 60
      cfm = (volume * targetACH) / 60;
      // CADR approx metric to cubic meters / hour then back or direct
      cadr = cfm * 1.699;

      resVolume.textContent = volumeM3.toLocaleString(undefined, { maximumFractionDigits: 1 });
      unitVolume.textContent = 'cubic meters (m³)';

      let m3h = (volumeM3 * targetACH);
      resCfm.textContent = m3h.toLocaleString(undefined, { maximumFractionDigits: 0 });
      unitAirflow.textContent = 'm³/h (Cubic Meters / Hour)';

      resCadr.textContent = (cadr * 0.6).toLocaleString(undefined, { maximumFractionDigits: 0 });
      unitCadr.textContent = 'm³/h Air Purifier CADR';
    } else {
      volume = length * width * height;
      cfm = (volume * targetACH) / 60;
      // Additional CFM per person ASHRAE standard (~15 CFM / person)
      let personCfm = occupants * 15;
      let totalCfm = Math.max(cfm, personCfm);
      
      resVolume.textContent = volume.toLocaleString(undefined, { maximumFractionDigits: 0 });
      unitVolume.textContent = 'cubic feet (cu ft)';

      resCfm.textContent = totalCfm.toLocaleString(undefined, { maximumFractionDigits: 0 });
      unitAirflow.textContent = 'CFM (Cubic Feet / Min)';

      // Air purifier CADR is typically recommended at ~2/3 of CFM for smoke/dust or equal to room CFM
      cadr = totalCfm * 1.5;
      resCadr.textContent = Math.round(cadr).toLocaleString();
      unitCadr.textContent = 'Clean Air Delivery Rate (CADR)';
    }

    resAch.textContent = targetACH.toFixed(1);

    // Update Recommendations
    updateRecommendations(profile, occupants, cfm);
  }

  function updateRecommendations(profile, occupants, cfm) {
    recommendationsList.innerHTML = '';
    
    const items = [
      profile.note,
      `Based on "${profile.name}", target ventilation is set to ${profile.ach} Air Changes per Hour (ACH).`,
      occupants > 0 ? `Adjusted for ${occupants} occupant(s) to maintain healthy oxygen and CO2 levels.` : 'No occupants specified; baseline volume turnover is utilized.',
      `To achieve optimal filtration, ensure ductwork or air purifier placement encourages cross-room circulation without dead zones.`
    ];

    items.forEach(text => {
      const li = document.createElement('li');
      li.textContent = text;
      recommendationsList.appendChild(li);
    });
  }

  function drawSimulation() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background grid lines
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

    // Draw supply vent (top left)
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(20, 20, 60, 16);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '10px sans-serif';
    ctx.fillText('SUPPLY', 28, 32);

    // Draw return vent (bottom right)
    ctx.fillStyle = '#64748b';
    ctx.fillRect(canvas.width - 80, canvas.height - 36, 60, 16);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText('RETURN', canvas.width - 72, canvas.height - 24);

    // Update & draw particles
    particles.forEach(p => {
      if (isSimRunning) {
        p.x += p.speed;
        // Curve slightly towards bottom right
        p.y += (Math.sin(p.x * 0.02) * 0.5);

        if (p.x > canvas.width) {
          p.x = 20;
          p.y = 20 + Math.random() * 40;
        }
        if (p.y > canvas.height) p.y = 20;
        if (p.y < 0) p.y = canvas.height - 20;
      }

      ctx.fillStyle = `rgba(56, 189, 248, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(drawSimulation);
  }

  // Event Listeners
  [roomLengthInput, roomWidthInput, roomHeightInput, occupantCountInput, spaceTypeSelect, unitSystemSelect].forEach(element => {
    element.addEventListener('input', updateCalculations);
    element.addEventListener('change', updateCalculations);
  });

  calcBtn.addEventListener('click', () => {
    updateCalculations();
    // Smooth flash effect
    calcBtn.style.transform = 'scale(0.98)';
    setTimeout(() => calcBtn.style.transform = 'none', 150);
  });

  resetBtn.addEventListener('click', () => {
    roomNameInput.value = 'Master Home Office';
    roomLengthInput.value = 15;
    roomWidthInput.value = 12;
    roomHeightInput.value = 9;
    occupantCountInput.value = 2;
    spaceTypeSelect.value = 'office';
    unitSystemSelect.value = 'imperial';
    updateCalculations();
  });

  toggleSimBtn.addEventListener('click', () => {
    isSimRunning = !isSimRunning;
    toggleSimBtn.textContent = isSimRunning ? 'Pause Simulation' : 'Resume Simulation';
  });

  // Initial boot
  initParticles();
  updateCalculations();
  requestAnimationFrame(drawSimulation);
});
