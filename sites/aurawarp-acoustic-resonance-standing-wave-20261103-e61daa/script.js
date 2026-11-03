document.addEventListener('DOMContentLoaded', () => {
  const unitSystemSelect = document.getElementById('unitSystem');
  const roomLengthInput = document.getElementById('roomLength');
  const roomWidthInput = document.getElementById('roomWidth');
  const roomHeightInput = document.getElementById('roomHeight');
  const wallMaterialSelect = document.getElementById('wallMaterial');
  const tempCelsiusInput = document.getElementById('tempCelsius');
  const calcBtn = document.getElementById('calcBtn');
  const resetBtn = document.getElementById('resetBtn');
  const exportBtn = document.getElementById('exportBtn');
  const modeCanvas = document.getElementById('modeCanvas');
  const modeCountBadge = document.getElementById('modeCountBadge');
  const recList = document.getElementById('recList');
  const modesTableBody = document.getElementById('modesTableBody');
  const filterBtns = document.querySelectorAll('.filter-btn');

  let currentFilter = 'all';
  let computedModes = [];

  // Convert feet to meters if needed
  function getDimensionsInMeters() {
    let L = parseFloat(roomLengthInput.value) || 16.5;
    let W = parseFloat(roomWidthInput.value) || 12.0;
    let H = parseFloat(roomHeightInput.value) || 8.5;
    const isFeet = unitSystemSelect.value === 'ft';
    
    if (isFeet) {
      L *= 0.3048;
      W *= 0.3048;
      H *= 0.3048;
    }
    return { L, W, H };
  }

  function calculateModes() {
    const { L, W, H } = getDimensionsInMeters();
    const temp = parseFloat(tempCelsiusInput.value) || 21;
    // Speed of sound in air: c = 331.3 * sqrt(1 + temp / 273.15)
    const c = 331.3 * Math.sqrt(1 + temp / 273.15);

    const modes = [];
    const maxFreq = 300; // calculate modes up to 300 Hz

    // Generate eigenmodes up to nx=5, ny=5, nz=5
    for (let nx = 0; nx <= 5; nx++) {
      for (let ny = 0; ny <= 5; ny++) {
        for (let nz = 0; nz <= 5; nz++) {
          if (nx === 0 && ny === 0 && nz === 0) continue;

          // Frequency formula: f = (c / 2) * sqrt((nx/L)^2 + (ny/W)^2 + (nz/H)^2)
          const freq = (c / 2) * Math.sqrt(
            Math.pow(nx / L, 2) +
            Math.pow(ny / W, 2) +
            Math.pow(nz / H, 2)
          );

          if (freq <= maxFreq) {
            let type = 'oblique';
            let orderCount = (nx > 0 ? 1 : 0) + (ny > 0 ? 1 : 0) + (nz > 0 ? 1 : 0);
            if (orderCount === 1) type = 'axial';
            else if (orderCount === 2) type = 'tangential';

            const wavelength = c / freq;

            modes.push({
              type,
              nx,
              ny,
              nz,
              freq: Math.round(freq * 10) / 10,
              wavelength: Math.round(wavelength * 100) / 100,
              label: `(${nx}, ${ny}, ${nz})`
            });
          }
        }
      }
    }

    // Sort by frequency ascending
    modes.sort((a, b) => a.freq - b.freq);
    computedModes = modes;

    renderResults(L, W, H, c);
  }

  function renderResults(L, W, H, c) {
    modeCountBadge.textContent = `${computedModes.length} Modes (< 300Hz)`;
    renderTable();
    renderCanvas();
    renderRecommendations(L, W, H);
  }

  function renderTable() {
    if (!modesTableBody) return;
    modesTableBody.innerHTML = '';

    const filtered = computedModes.filter(m => {
      if (currentFilter === 'all') return true;
      return m.type === currentFilter;
    });

    if (filtered.length === 0) {
      modesTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">No modes found for this filter.</td></tr>`;
      return;
    }

    filtered.forEach(m => {
      const tr = document.createElement('tr');
      
      let impact = 'Moderate';
      if (m.type === 'axial') impact = 'High (Primary Resonance)';
      else if (m.type === 'tangential') impact = 'Medium (Flutter / Ringing)';
      else impact = 'Low (Diffuse)';

      tr.innerHTML = `
        <td><span class="badge" style="background: ${m.type === 'axial' ? 'rgba(56, 189, 248, 0.15)' : m.type === 'tangential' ? 'rgba(192, 132, 252, 0.15)' : 'rgba(148, 163, 184, 0.15)'}; color: ${m.type === 'axial' ? 'var(--accent-cyan)' : m.type === 'tangential' ? 'var(--accent-purple)' : 'var(--text-secondary)'}">${m.type.toUpperCase()}</span></td>
        <td><strong>${m.label}</strong></td>
        <td>${m.freq} Hz</td>
        <td>${m.wavelength} m</td>
        <td>${impact}</td>
      `;
      modesTableBody.appendChild(tr);
    });
  }

  function renderCanvas() {
    if (!modeCanvas) return;
    const ctx = modeCanvas.getContext('2d');
    const width = modeCanvas.width;
    const height = modeCanvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw background grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 50; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height - 30);
      ctx.stroke();
    }

    // Draw axis
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(40, height - 30);
    ctx.lineTo(width - 20, height - 30);
    ctx.stroke();

    // Frequency range 20Hz to 300Hz
    const minF = 20;
    const maxF = 300;

    // Draw frequency labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    for (let f = 50; f <= maxF; f += 50) {
      const xPos = 40 + ((f - minF) / (maxF - minF)) * (width - 60);
      ctx.fillText(`${f}Hz`, xPos - 12, height - 12);
    }

    // Draw spectral distribution bars / lines
    computedModes.forEach(m => {
      if (m.freq < minF || m.freq > maxF) return;
      const xPos = 40 + ((m.freq - minF) / (maxF - minF)) * (width - 60);

      let color = 'rgba(148, 163, 184, 0.4)';
      let barHeight = 40;
      if (m.type === 'axial') {
        color = '#38bdf8';
        barHeight = 110;
      } else if (m.type === 'tangential') {
        color = '#c084fc';
        barHeight = 75;
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = m.type === 'axial' ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.moveTo(xPos, height - 30);
      ctx.lineTo(xPos, height - 30 - barHeight);
      ctx.stroke();
    });
  }

  function renderRecommendations(L, W, H) {
    if (!recList) return;
    recList.innerHTML = '';

    // Calculate volume & proportions
    const volumeM3 = L * W * H;
    const ratioHL = H / L;
    const ratioWL = W / L;

    // Bonzai check (near integer ratios are bad)
    let ratioStatus = 'Good room proportions (Bonzai risk low)';
    let ratioDesc = 'Your dimensional ratios help distribute room modes evenly across the frequency spectrum.';
    
    // Check for cube or near integer multiples
    if (Math.abs(L - W) < 0.5 || Math.abs(W - H) < 0.5 || Math.abs(L - H) < 0.5) {
      ratioStatus = 'High Mode Clustering Risk (Near Cube)';
      ratioDesc = 'Equal or integer multiple dimensions cause overlapping modes, resulting in severe peaks and nulls.';
    }

    // Sweet spot (38% rule)
    const isFeet = unitSystemSelect.value === 'ft';
    const rawL = parseFloat(roomLengthInput.value) || 16.5;
    const sweetSpot = (rawL * 0.382).toFixed(1);
    const unitLabel = isFeet ? 'ft' : 'm';

    const items = [
      {
        title: 'Room Volume & Ratio',
        desc: `Volume: ~${volumeM3.toFixed(1)} m³. Ratio H:W:L is ${(H/Math.max(L,W)).toFixed(2)} : ${(W/L).toFixed(2)} : 1. ${ratioDesc}`
      },
      {
        title: 'Recommended Listening Position (38% Rule)',
        desc: `Place your ear position approximately ${sweetSpot} ${unitLabel} from the front wall for optimal stereo imaging and minimal modal cancellation.`
      },
      {
        title: 'Acoustic Treatment Priority',
        desc: 'Focus first on broadband porous absorbers (rockwool/fiberglass) on the front/side reflection points, and thick porous/membrane bass traps in all tri-corners for axial mode decay control.'
      }
    ];

    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'rec-item';
      div.innerHTML = `
        <span class="rec-title">◈ ${item.title}</span>
        <span class="rec-desc">${item.desc}</span>
      `;
      recList.appendChild(div);
    });
  }

  // Event Listeners
  calcBtn.addEventListener('click', calculateModes);

  resetBtn.addEventListener('click', () => {
    unitSystemSelect.value = 'ft';
    roomLengthInput.value = '16.5';
    roomWidthInput.value = '12.0';
    roomHeightInput.value = '8.5';
    wallMaterialSelect.value = '0.15';
    tempCelsiusInput.value = '21';
    currentFilter = 'all';
    filterBtns.forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
    calculateModes();
  });

  exportBtn.addEventListener('click', () => {
    const data = {
      unit: unitSystemSelect.value,
      length: roomLengthInput.value,
      width: roomWidthInput.value,
      height: roomHeightInput.value,
      wallMaterial: wallMaterialSelect.value,
      temperature: tempCelsiusInput.value,
      modes: computedModes
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aurawarp-room-acoustics.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      renderTable();
    });
  });

  // Initial Calculation
  calculateModes();
});
