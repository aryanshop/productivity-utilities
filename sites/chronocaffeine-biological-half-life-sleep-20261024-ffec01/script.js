document.addEventListener('DOMContentLoaded', () => {
  // State Management
  let state = {
    wakeTime: '07:00',
    sleepTime: '23:00',
    halfLife: 5.0,
    intakes: [
      { id: '1', time: '08:00', mg: 150, label: 'Morning Drip Coffee' },
      { id: '2', time: '13:30', mg: 95, label: 'Post-Lunch Espresso' }
    ]
  };

  // Load saved state
  const savedState = localStorage.getItem('chrono_caffeine_state');
  if (savedState) {
    try {
      const parsed = JSON.parse(savedState);
      state = { ...state, ...parsed };
    } catch (e) {
      console.error('Failed to parse local storage state');
    }
  }

  // DOM Elements
  const wakeTimeInput = document.getElementById('wake-time');
  const sleepTimeInput = document.getElementById('sleep-time');
  const halfLifeSlider = document.getElementById('half-life-slider');
  const halfLifeValSpan = document.getElementById('half-life-val');
  const intakeForm = document.getElementById('custom-intake-form');
  const intakeTimeInput = document.getElementById('intake-time');
  const intakeMgInput = document.getElementById('intake-mg');
  const intakeLabelInput = document.getElementById('intake-label');
  const intakeList = document.getElementById('intake-list');
  const clearLogBtn = document.getElementById('clear-log');
  const presetBtns = document.querySelectorAll('.preset-btn');

  // Metrics Elements
  const metricTotal = document.getElementById('metric-total');
  const metricResidual = document.getElementById('metric-residual');
  const metricCurfew = document.getElementById('metric-curfew');
  const metricScore = document.getElementById('metric-score');
  const advisoryBanner = document.getElementById('advisory-banner');
  const advisoryTitle = document.getElementById('advisory-title');
  const advisoryDesc = document.getElementById('advisory-desc');

  // Canvas Element
  const canvas = document.getElementById('plasma-canvas');
  const ctx = canvas.getContext('2d');

  // Initialize Inputs
  wakeTimeInput.value = state.wakeTime;
  sleepTimeInput.value = state.sleepTime;
  halfLifeSlider.value = state.halfLife;
  halfLifeValSpan.textContent = Number(state.halfLife).toFixed(1);

  // Event Listeners
  wakeTimeInput.addEventListener('change', (e) => {
    state.wakeTime = e.target.value;
    saveAndRender();
  });

  sleepTimeInput.addEventListener('change', (e) => {
    state.sleepTime = e.target.value;
    saveAndRender();
  });

  halfLifeSlider.addEventListener('input', (e) => {
    state.halfLife = parseFloat(e.target.value);
    halfLifeValSpan.textContent = state.halfLife.toFixed(1);
    saveAndRender();
  });

  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mg = parseInt(btn.getAttribute('data-mg'));
      const name = btn.getAttribute('data-name');
      addIntake(getCurrentTimeString(), mg, name);
    });
  });

  intakeForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const time = intakeTimeInput.value;
    const mg = parseInt(intakeMgInput.value);
    const label = intakeLabelInput.value.trim() || 'Custom Beverage';
    if (time && !isNaN(mg)) {
      addIntake(time, mg, label);
      intakeMgInput.value = '100';
      intakeLabelInput.value = '';
    }
  });

  clearLogBtn.addEventListener('click', () => {
    state.intakes = [];
    saveAndRender();
  });

  function getCurrentTimeString() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  }

  function addIntake(time, mg, label) {
    const newEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
      time,
      mg,
      label
    };
    state.intakes.push(newEntry);
    state.intakes.sort((a, b) => a.time.localeCompare(b.time));
    saveAndRender();
  }

  window.deleteIntake = function(id) {
    state.intakes = state.intakes.filter(item => item.id !== id);
    saveAndRender();
  };

  function saveAndRender() {
    localStorage.setItem('chrono_caffeine_state', JSON.stringify(state));
    renderIntakeList();
    calculateAndRenderMetrics();
    drawGraph();
  }

  function renderIntakeList() {
    if (!intakeList) return;
    if (state.intakes.length === 0) {
      intakeList.innerHTML = '<li class="intake-item" style="justify-content: center; color: var(--text-muted);">No caffeine doses logged for today.</li>';
      return;
    }

    intakeList.innerHTML = state.intakes.map(item => `
      <li class="intake-item">
        <div class="intake-info">
          <span class="intake-time">${item.time}</span>
          <span>${escapeHtml(item.label)}</span>
          <span class="intake-mg-badge">+${item.mg} mg</span>
        </div>
        <button class="delete-btn" onclick="deleteIntake('${item.id}')" title="Remove dose">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </li>
    `).join('');
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function timeToHours(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h + m / 60;
  }

  function hoursToTimeStr(decimalHours) {
    let normalized = (decimalHours + 24) % 24;
    const h = Math.floor(normalized);
    const m = Math.round((normalized - h) * 60);
    const hh = String(h % 24).padStart(2, '0');
    const mm = String(m === 60 ? 0 : m).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  // Compute Pharmacokinetics at specific hours (0 to 24)
  function getPlasmaAtHour(hour) {
    let total = 0;
    state.intakes.forEach(item => {
      const doseHour = timeToHours(item.time);
      // Account for absorption lag (~30 mins peak) but simplified to exponential elimination from intake time
      let diff = hour - doseHour;
      if (diff < 0) diff += 24; // wrap around day
      if (diff >= 0 && diff < 24) {
        // C = C0 * (0.5)^(t / halfLife)
        const conc = item.mg * Math.pow(0.5, diff / state.halfLife);
        total += conc;
      }
    });
    return total;
  }

  function calculateAndRenderMetrics() {
    const totalMg = state.intakes.reduce((sum, item) => sum + item.mg, 0);
    const sleepHour = timeToHours(state.sleepTime);
    const residualMg = getPlasmaAtHour(sleepHour);

    metricTotal.innerHTML = `${Math.round(totalMg)} <small>mg</small>`;
    metricResidual.innerHTML = `${Math.round(residualMg)} <small>mg</small>`;

    // Find recommended curfew (latest time where residual at bedtime is < 25mg)
    let curfewHour = null;
    for (let h = 4; h <= 22; h += 0.25) {
      // Test if taking 100mg at hour h results in < 25mg at bedtime
      const testMg = 100;
      let diff = sleepHour - h;
      if (diff < 0) diff += 24;
      const res = testMg * Math.pow(0.5, diff / state.halfLife);
      if (res <= 25) {
        curfewHour = h;
        break;
      }
    }

    if (curfewHour !== null) {
      metricCurfew.textContent = hoursToTimeStr(curfewHour);
    } else {
      metricCurfew.textContent = '14:00';
    }

    // Calculate Sleep Quality Score (100% max, drops as residual exceeds 25mg)
    let score = 100;
    if (residualMg > 25) {
      score = Math.max(20, Math.round(100 - (residualMg - 25) * 1.2));
    }
    metricScore.innerHTML = `${score}<small>%</small>`;

    // Advisory updates
    advisoryBanner.className = 'advisory-banner';
    if (residualMg <= 25) {
      advisoryBanner.classList.add('good');
      advisoryTitle.textContent = 'Optimal Sleep Hygiene Protected';
      advisoryDesc.textContent = `Your bedtime residual is ${Math.round(residualMg)}mg (&lt;25mg target). Expect deep restorative slow-wave sleep.`;
    } else if (residualMg <= 50) {
      advisoryBanner.classList.add('warning');
      advisoryTitle.textContent = 'Moderate Sleep Disruption Risk';
      advisoryDesc.textContent = `Bedtime residual is ${Math.round(residualMg)}mg. You may experience lighter REM sleep and delayed sleep latency.`;
    } else {
      advisoryBanner.classList.add('danger');
      advisoryTitle.textContent = 'High Sleep Disruption Alert';
      advisoryDesc.textContent = `Bedtime residual is ${Math.round(residualMg)}mg. Significant suppression of slow-wave sleep expected. Consider an earlier caffeine cutoff.`;
    }
  }

  function drawGraph() {
    if (!canvas || !ctx) return;

    // High-DPI Canvas scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    const padding = { top: 30, right: 30, bottom: 40, left: 50 };
    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Find max concentration across 24 hours to scale Y-axis
    let maxConc = 150;
    for (let h = 0; h <= 24; h += 0.25) {
      const c = getPlasmaAtHour(h);
      if (c > maxConc) maxConc = c;
    }
    maxConc = Math.ceil(maxConc / 50) * 50; // round up to nearest 50
    if (maxConc < 200) maxConc = 200;

    // Draw Sleep Window shading
    const sleepH = timeToHours(state.sleepTime);
    const wakeH = timeToHours(state.wakeTime);

    function hourToX(h) {
      return padding.left + (h / 24) * graphWidth;
    }

    function mgToY(mg) {
      return padding.top + graphHeight - (mg / maxConc) * graphHeight;
    }

    // Sleep window shading (from sleepTime to wakeTime next day)
    ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
    let sleepX1 = hourToX(sleepH);
    let sleepX2 = hourToX(wakeH);
    if (sleepH > wakeH) {
      // spans midnight
      ctx.fillRect(sleepX1, padding.top, graphWidth - (sleepX1 - padding.left), graphHeight);
      ctx.fillRect(padding.left, padding.top, sleepX2 - padding.left, graphHeight);
    } else {
      ctx.fillRect(sleepX1, padding.top, sleepX2 - sleepX1, graphHeight);
    }

    // Draw Grid lines
    ctx.strokeStyle = '#1e2942';
    ctx.lineWidth = 1;

    // Y-Axis grid lines & labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'right';
    for (let mg = 0; mg <= maxConc; mg += maxConc / 4) {
      const y = mgToY(mg);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(`${Math.round(mg)}mg`, padding.left - 8, y + 4);
    }

    // X-Axis time labels (Every 3 hours)
    ctx.textAlign = 'center';
    for (let h = 0; h <= 24; h += 3) {
      const x = hourToX(h);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, height - padding.bottom);
      ctx.stroke();
      const timeLabel = `${String(h % 24).padStart(2, '0')}:00`;
      ctx.fillText(timeLabel, x, height - padding.bottom + 16);
    }

    // Draw 50mg threshold warning line
    const thresholdY = mgToY(50);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, thresholdY);
    ctx.lineTo(width - padding.right, thresholdY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Plasma Concentration Curve
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();

    let points = [];
    for (let h = 0; h <= 24; h += 0.1) {
      const x = hourToX(h);
      const mg = getPlasmaAtHour(h);
      const y = mgToY(mg);
      points.push({ x, y });
    }

    points.forEach((pt, index) => {
      if (index === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    // Gradient fill under curve
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
    gradient.addColorStop(1, 'rgba(245, 158, 11, 0.0)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw Intake Markers on Graph
    state.intakes.forEach(item => {
      const h = timeToHours(item.time);
      const x = hourToX(h);
      const mg = getPlasmaAtHour(h);
      const y = mgToY(mg);

      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  // Initial Render
  saveAndRender();

  // Handle Window Resize for Canvas
  window.addEventListener('resize', () => {
    drawGraph();
  });
});
