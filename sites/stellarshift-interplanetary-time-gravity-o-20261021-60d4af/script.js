document.addEventListener('DOMContentLoaded', () => {
  // Habitat astrophysical parameters
  const habitats = {
    moon: {
      name: 'Lunar Base (Alpha Station)',
      gravity: 1.62, // m/s^2
      mass: 7.342e22, // kg
      radius: 1737400, // meters
      dayLength: 29.5 * 24, // Earth hours in a lunar synodic day approx
      timeOffsetHours: 0
    },
    mars: {
      name: 'Mars Colony (Olympus Mons Hub)',
      gravity: 3.72,
      mass: 6.4171e23,
      radius: 3389500,
      dayLength: 24.6597, // 1 sol in Earth hours
      timeOffsetHours: 3
    },
    europa: {
      name: 'Europa Subsurface Outpost',
      gravity: 1.315,
      mass: 4.800e22,
      radius: 1560800,
      dayLength: 85.2 * 24, // tidally locked
      timeOffsetHours: 7
    },
    titan: {
      name: 'Titan Atmospheric Haven',
      gravity: 1.352,
      mass: 1.345e23,
      radius: 2574700,
      dayLength: 15.9 * 24,
      timeOffsetHours: 11
    },
    ship: {
      name: 'Relativistic Starship',
      gravity: 9.81, // artificial centrifugal
      mass: 0,
      radius: 0,
      dayLength: 24,
      timeOffsetHours: 0
    }
  };

  // Elements
  const earthDateInput = document.getElementById('earth-date');
  const destSelect = document.getElementById('destination-select');
  const velocityGroup = document.getElementById('velocity-group');
  const shipSpeedRange = document.getElementById('ship-speed');
  const speedValSpan = document.getElementById('speed-val');
  const missionDurationInput = document.getElementById('mission-duration');
  const calculateBtn = document.getElementById('calculate-btn');
  const resetBtn = document.getElementById('reset-btn');
  const exportBtn = document.getElementById('export-btn');

  const resDestTime = document.getElementById('res-dest-time');
  const resDestDay = document.getElementById('res-dest-day');
  const resProperTime = document.getElementById('res-proper-time');
  const resTimeDiff = document.getElementById('res-time-diff');
  const resGravShift = document.getElementById('res-grav-shift');
  const resGamma = document.getElementById('res-gamma');
  const resVelocityDesc = document.getElementById('res-velocity-desc');
  const reportText = document.getElementById('report-text');
  const timelineMatrix = document.getElementById('timeline-matrix');
  const utcClock = document.getElementById('utc-clock');

  // Initialize UTC Live Clock
  setInterval(() => {
    const now = new Date();
    utcClock.textContent = now.toUTCString().slice(17, 25) + ' UTC';
  }, 1000);

  // Set default datetime to now
  const nowLocal = new Date();
  nowLocal.setMinutes(nowLocal.getMinutes() - nowLocal.getTimezoneOffset());
  earthDateInput.value = nowLocal.toISOString().slice(0, 16);

  // Toggle speed slider visibility
  destSelect.addEventListener('change', () => {
    if (destSelect.value === 'ship') {
      velocityGroup.style.display = 'flex';
    } else {
      velocityGroup.style.display = 'none';
    }
  });

  shipSpeedRange.addEventListener('input', () => {
    speedValSpan.textContent = shipSpeedRange.value + '% c';
  });

  // Calculation Logic
  function performCalculation() {
    const selectedHabKey = destSelect.value;
    const hab = habitats[selectedHabKey];
    const baseDate = new Date(earthDateInput.value || Date.now());
    const durationDays = parseFloat(missionDurationInput.value) || 365;

    // Constants
    const G = 6.67430e-11;
    const c = 299792458;

    let gravShiftPerYearSeconds = 0;
    let gamma = 1.0;

    if (selectedHabKey === 'ship') {
      const beta = parseInt(shipSpeedRange.value, 10) / 100;
      gamma = 1 / Math.sqrt(1 - (beta * beta));
      resGamma.textContent = gamma.toFixed(4);
      resVelocityDesc.textContent = `Lorentz Factor (v = ${Math.round(beta*100)}% c)`;
      resGravShift.textContent = 'N/A (Kinematic)';
    } else {
      // General Relativity gravitational time dilation approximation
      // delta t / t = GM / (r * c^2)
      const earthGM = 3.986004418e14;
      const habGM = G * hab.mass;
      const habR = hab.radius;

      const earthPotential = earthGM / (6371000 * c * c);
      const habPotential = habGM / (habR * c * c);

      // Seconds per earth year (31536000)
      const secondsPerYear = 31536000;
      gravShiftPerYearSeconds = (habPotential - earthPotential) * secondsPerYear;

      resGravShift.textContent = (gravShiftPerYearSeconds > 0 ? '+' : '') + gravShiftPerYearSeconds.toFixed(4);
      resGamma.textContent = '1.0000 (GR Only)';
      resVelocityDesc.textContent = 'Gravitational Potential Shift';
    }

    // Calculate proper time for mission duration
    let properDays = durationDays;
    if (selectedHabKey === 'ship') {
      properDays = durationDays / gamma;
    } else {
      // Apply gravitational time dilation fraction per day
      const fractionPerDay = (gravShiftPerYearSeconds / 31536000);
      properDays = durationDays + (durationDays * fractionPerDay);
    }

    const timeDiffDays = properDays - durationDays;

    // Destination local clock estimation
    const timeOffsetHours = hab.timeOffsetHours;
    const destDate = new Date(baseDate.getTime() + (timeOffsetHours * 3600 * 1000));
    
    // Calculate Sols or day number for destination
    const hoursIntoMission = durationDays * 24;
    const destDayNumber = Math.floor(hoursIntoMission / hab.dayLength) + 1;

    // Render metrics
    resDestTime.textContent = destDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    resDestDay.textContent = `${hab.name.split(' ')[0]} - Sol ${destDayNumber}`;
    
    resProperTime.textContent = `${properDays.toFixed(2)} Days`;
    resTimeDiff.textContent = `Delta: ${timeDiffDays >= 0 ? '+' : ''}${timeDiffDays.toFixed(3)} Days`;

    // Generate Timeline Synchronization Matrix
    renderTimelineMatrix(hab);

    // Generate Briefing Report Text
    let reportString = `Mission Profile: ${hab.name}. Baseline Earth duration: ${durationDays} days. `;
    if (selectedHabKey === 'ship') {
      reportString += `Operating at ${shipSpeedRange.value}% speed of light induces significant kinematic time dilation, resulting in the crew aging ${(durationDays - properDays).toFixed(1)} days slower than observers on Earth.`;
    } else {
      reportString += `Due to surface gravity of ${hab.gravity} m/s² and gravitational potential differences, clocks on ${hab.name} drift by approximately ${gravShiftPerYearSeconds.toFixed(2)} seconds per Earth year compared to terrestrial standard time.`;
    }
    reportText.textContent = reportString;
  }

  function renderTimelineMatrix(hab) {
    timelineMatrix.innerHTML = '';

    // 24 hours breakdown
    const hours = Array.from({length: 24}, (_, i) => i);

    // Earth standard work row (9 to 17)
    const earthRow = document.createElement('div');
    earthRow.className = 'timeline-row';
    earthRow.innerHTML = `<span class="timeline-label">Earth Std (UTC)</span>` +
      `<div class="timeline-blocks">` +
      hours.map(h => `<div class="t-block ${h >= 9 && h < 17 ? 'work' : 'sleep'}" title="Hour ${h}:00"></div>`).join('') +
      `</div>`;
    timelineMatrix.appendChild(earthRow);

    // Destination synchronized row
    const destRow = document.createElement('div');
    destRow.className = 'timeline-row';
    
    // Shift work hours based on destination offset
    const shift = hab.timeOffsetHours % 24;
    const destHoursHtml = hours.map(h => {
      const localHour = (h + shift + 24) % 24;
      const isWork = localHour >= 9 && localHour < 17;
      return `<div class="t-block ${isWork ? 'dest-work' : 'sleep'}" title="Local Hour ${localHour}:00"></div>`;
    }).join('');

    destRow.innerHTML = `<span class="timeline-label">${hab.name.split(' ')[0]} Local</span>` +
      `<div class="timeline-blocks">` + destHoursHtml + `</div>`;
    timelineMatrix.appendChild(destRow);
  }

  // Export Briefing to TXT
  exportBtn.addEventListener('click', () => {
    const content = `=== STELLARSHIFT MISSION BRIEFING ===\n` +
      `Generated: ${new Date().toUTCString()}\n` +
      `Destination: ${destSelect.options[destSelect.selectedIndex].text}\n` +
      `Mission Duration: ${missionDurationInput.value} Earth Days\n\n` +
      `Telemetry Details:\n` +
      `- Destination Time: ${resDestTime.textContent}\n` +
      `- Proper Time: ${resProperTime.textContent}\n` +
      `- Time Deviation: ${resTimeDiff.textContent}\n` +
      `- Gravitational Shift: ${resGravShift.textContent}\n` +
      `- Lorentz Factor: ${resGamma.textContent}\n\n` +
      `Notes:\n${reportText.textContent}\n` +
      `=====================================`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stellar-mission-briefing.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Reset Button
  resetBtn.addEventListener('click', () => {
    destSelect.value = 'mars';
    velocityGroup.style.display = 'none';
    shipSpeedRange.value = 50;
    speedValSpan.textContent = '50% c';
    missionDurationInput.value = 365;
    const freshNow = new Date();
    freshNow.setMinutes(freshNow.getMinutes() - freshNow.getTimezoneOffset());
    earthDateInput.value = freshNow.toISOString().slice(0, 16);
    performCalculation();
  });

  // Initial calculation on load
  calculateBtn.addEventListener('click', performCalculation);
  performCalculation();
});
