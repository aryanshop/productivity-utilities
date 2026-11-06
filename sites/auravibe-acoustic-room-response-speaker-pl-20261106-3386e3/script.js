document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const roomLengthInput = document.getElementById('room-length');
  const roomWidthInput = document.getElementById('room-width');
  const roomHeightInput = document.getElementById('room-height');
  const unitSystemSelect = document.getElementById('unit-system');
  const wallTypeSelect = document.getElementById('wall-type');
  const floorTypeSelect = document.getElementById('floor-type');
  const speakerToeInput = document.getElementById('speaker-toe');
  const valToe = document.getElementById('val-toe');
  const listenerDistInput = document.getElementById('listener-dist');
  const valDist = document.getElementById('val-dist');
  const chkRuleThirds = document.getElementById('chk-rule-thirds');
  
  const btnSavePreset = document.getElementById('btn-save-preset');
  const btnReset = document.getElementById('btn-reset');
  const presetListContainer = document.getElementById('preset-list');
  
  const resModeL = document.getElementById('res-mode-l');
  const resSbir = document.getElementById('res-sbir');
  const resBase = document.getElementById('res-base');
  const resRt60 = document.getElementById('res-rt60');
  const reportContent = document.getElementById('report-content');
  
  const canvas = document.getElementById('roomCanvas');
  const ctx = canvas.getContext('2d');

  // Sound speed constant ft/s or m/s
  const SPEED_OF_SOUND_FT = 1125;
  const SPEED_OF_SOUND_M = 343;

  // State variables
  let savedPresets = JSON.parse(localStorage.getItem('auravibe_presets') || '[]');

  // Event Listeners
  [roomLengthInput, roomWidthInput, roomHeightInput, unitSystemSelect, wallTypeSelect, floorTypeSelect, speakerToeInput, listenerDistInput, chkRuleThirds].forEach(el => {
    if (el) {
      el.addEventListener('input', updateAcousticsLab);
      el.addEventListener('change', updateAcousticsLab);
    }
  });

  if (speakerToeInput) {
    speakerToeInput.addEventListener('input', (e) => {
      valToe.textContent = e.target.value + '°';
    });
  }

  if (listenerDistInput) {
    listenerDistInput.addEventListener('input', (e) => {
      valDist.textContent = e.target.value + '% from front wall';
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      roomLengthInput.value = 18.0;
      roomWidthInput.value = 14.0;
      roomHeightInput.value = 8.5;
      unitSystemSelect.value = 'ft';
      wallTypeSelect.value = 'drywall';
      floorTypeSelect.value = 'carpet';
      speakerToeInput.value = 20;
      valToe.textContent = '20°';
      listenerDistInput.value = 80;
      valDist.textContent = '80% from front wall';
      chkRuleThirds.checked = true;
      updateAcousticsLab();
    });
  }

  if (btnSavePreset) {
    btnSavePreset.addEventListener('click', () => {
      const presetName = prompt('Enter a name for this room configuration:', `Room ${savedPresets.length + 1} (${roomLengthInput.value}x${roomWidthInput.value})`);
      if (!presetName) return;
      
      const newPreset = {
        id: Date.now(),
        name: presetName,
        length: roomLengthInput.value,
        width: roomWidthInput.value,
        height: roomHeightInput.value,
        unit: unitSystemSelect.value,
        wall: wallTypeSelect.value,
        floor: floorTypeSelect.value,
        toe: speakerToeInput.value,
        dist: listenerDistInput.value
      };
      
      savedPresets.push(newPreset);
      localStorage.setItem('auravibe_presets', JSON.stringify(savedPresets));
      renderPresets();
    });
  }

  function renderPresets() {
    if (!presetListContainer) return;
    if (savedPresets.length === 0) {
      presetListContainer.innerHTML = '<p class="placeholder-text">No saved presets yet.</p>';
      return;
    }

    presetListContainer.innerHTML = '';
    savedPresets.forEach((p, index) => {
      const div = document.createElement('div');
      div.className = 'preset-item';
      div.innerHTML = `
        <span class="preset-info" title="Load preset"><strong>${escapeHtml(p.name)}</strong> (${p.length}x${p.width} ${p.unit})</span>
        <button class="preset-delete" data-id="${p.id}" title="Delete preset">&times;</button>
      `;
      
      div.querySelector('.preset-info').addEventListener('click', () => {
        roomLengthInput.value = p.length;
        roomWidthInput.value = p.width;
        roomHeightInput.value = p.height;
        unitSystemSelect.value = p.unit;
        wallTypeSelect.value = p.wall;
        floorTypeSelect.value = p.floor;
        speakerToeInput.value = p.toe;
        valToe.textContent = p.toe + '°';
        listenerDistInput.value = p.dist;
        valDist.textContent = p.dist + '% from front wall';
        updateAcousticsLab();
      });

      div.querySelector('.preset-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        savedPresets = savedPresets.filter(item => item.id !== p.id);
        localStorage.setItem('auravibe_presets', JSON.stringify(savedPresets));
        renderPresets();
      });

      presetListContainer.appendChild(div);
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function updateAcousticsLab() {
    let L = parseFloat(roomLengthInput.value) || 15;
    let W = parseFloat(roomWidthInput.value) || 12;
    let H = parseFloat(roomHeightInput.value) || 8;
    const unit = unitSystemSelect.value;
    const wallType = wallTypeSelect.value;
    const floorType = floorTypeSelect.value;
    const toeAngle = parseInt(speakerToeInput.value) || 20;
    const distPct = parseInt(listenerDistInput.value) || 80;
    const useRuleThirds = chkRuleThirds.checked;

    // Convert to feet for internal standard calculations if needed
    let L_ft = unit === 'm' ? L * 3.28084 : L;
    let W_ft = unit === 'm' ? W * 3.28084 : W;
    let H_ft = unit === 'm' ? H * 3.28084 : H;

    // 1. Axial Room Mode Length (F1 = c / (2 * L))
    const modeL = SPEED_OF_SOUND_FT / (2 * L_ft);

    // 2. Speaker Boundary Interference Response (SBIR) front wall cancellation
    // Assuming speaker front baffle is approx 3 feet from front wall by default or proportional
    const speakerDistFromFrontWall = L_ft * 0.25; // 25% rule
    const sbirFreq = SPEED_OF_SOUND_FT / (4 * speakerDistFromFrontWall);

    // 3. Equilateral triangle speaker base width
    // If listener is at 'distPct' of room length from front wall:
    const listenerDistFromFront = L_ft * (distPct / 100);
    const baseWidth = listenerDistFromFront * 0.85; // Standard stereo geometry

    // 4. Approximate RT60 (Eyring/Sabine simplified)
    let wallAbs = 0.12;
    if (wallType === 'concrete') wallAbs = 0.03;
    if (wallType === 'brick') wallAbs = 0.15;
    if (wallType === 'glass') wallAbs = 0.08;
    
    let floorAbs = floorType === 'carpet' ? 0.30 : 0.05;
    const totalSurfaceArea = 2 * (L_ft * W_ft + L_ft * H_ft + W_ft * H_ft);
    const avgAbsorption = ((2 * L_ft * H_ft + 2 * W_ft * H_ft) * wallAbs + (L_ft * W_ft) * floorAbs + (L_ft * W_ft) * 0.15) / totalSurfaceArea;
    const roomVolume = L_ft * W_ft * H_ft;
    const rt60 = (0.049 * roomVolume) / (-totalSurfaceArea * Math.log(1 - Math.min(avgAbsorption, 0.99)));

    // Display Metrics
    resModeL.textContent = modeL.toFixed(1) + ' Hz';
    resSbir.textContent = sbirFreq.toFixed(1) + ' Hz';
    resBase.textContent = unit === 'm' ? (baseWidth / 3.28084).toFixed(2) + ' m' : baseWidth.toFixed(1) + ' ft';
    resRt60.textContent = isNaN(rt60) ? '0.4 s' : rt60.toFixed(2) + ' s';

    // Generate Report Recommendations
    generateReport(modeL, sbirFreq, rt60, L_ft, W_ft, H_ft, unit);

    // Render Canvas Room Map
    drawRoomMap(L, W, toeAngle, distPct, useRuleThirds, unit);
  }

  function generateReport(modeL, sbirFreq, rt60, L_ft, W_ft, H_ft, unit)
  {
    let html = '';
    
    // Room ratio evaluation (Bonello criterion rough check)
    const ratioH = H_ft;
    const ratioW = W_ft / H_ft;
    const ratioL = L_ft / H_ft;

    html += `<p><strong>Room Geometry & Proportions:</strong> Your room dimensions (${L_ft.toFixed(1)} x ${W_ft.toFixed(1)} x ${H_ft.toFixed(1)} ft) yield a volume of ${(L_ft*W_ft*H_ft).toFixed(0)} cu ft. `;
    
    if (Math.abs(ratioL - ratioW) < 0.5 && Math.abs(ratioW - ratioH) < 0.5) {
      html += `Warning: Dimensions are relatively proportional to cube shapes, which can stack room modes and cause severe bass coloration.</p>`;
    } else {
      html += `Dimensions provide reasonably well-distributed axial room modes across the lower octave.</p>`;
    }

    html += `<p><strong>Low Frequency SBIR Management:</strong> The front wall cancellation dip occurs around <strong>${sbirFreq.toFixed(1)} Hz</strong>. To minimize boundary interference:`;
    html += `<ul class="report-ul">`;
    html += `<li>Keep front speaker baffles either very close (&lt; 2 ft) or further (&gt; 4 ft) from the front boundary.</li>`;
    html += `<li>Place bass traps (porous absorbers &ge; 4 inches thick) in the front corners to damp axial modes.</li>`;
    html += `<li>Target the fundamental length mode (${modeL.toFixed(1)} Hz) with tuned membrane absorbers or DSP room correction.</li>`;
    html += `</ul></p>`;

    html += `<p><strong>Reverberation Control:</strong> Estimated RT60 is <strong>${rt60.toFixed(2)} s</strong>. `;
    if (rt60 > 0.5) {
      html += `This is slightly live for critical mixing or rigorous listening. Consider adding absorption panels at early reflection points (sidewalls and ceiling).</p>`;
    } else {
      html += `This is well-suited for high-resolution stereo listening and home theater environments.</p>`;
    }

    reportContent.innerHTML = html;
  }

  function drawRoomMap(roomL, roomW, toeAngle, distPct, useRuleThirds, unit)
  {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const padding = 50;
    const drawW = canvas.width - (padding * 2);
    const drawH = canvas.height - (padding * 2);

    // Scale room to fit canvas while preserving aspect ratio
    let scaleX = drawW / roomW;
    let scaleY = drawH / roomL;
    let scale = Math.min(scaleX, scaleY);

    let roomPxW = roomW * scale;
    let roomPxL = roomL * scale;

    let originX = (canvas.width - roomPxW) / 2;
    let originY = padding;

    // Draw Room Floor Grid Background
    ctx.fillStyle = '#0f141c';
    ctx.fillRect(originX, originY, roomPxW, roomPxL);

    // Draw Wall Boundaries
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 4;
    ctx.strokeRect(originX, originY, roomPxW, roomPxL);

    // Draw Grid lines (1-unit increments or 1-meter/foot marks)
    ctx.strokeStyle = '#1b222d';
    ctx.lineWidth = 1;
    for (let x = 1; x < roomW; x++) {
      ctx.beginPath();
      ctx.moveTo(originX + (x * scale), originY);
      ctx.lineTo(originX + (x * scale), originY + roomPxL);
      ctx.stroke();
    }
    for (let y = 1; y < roomL; y++) {
      ctx.beginPath();
      ctx.moveTo(originX, originY + (y * scale));
      ctx.lineTo(originX + roomPxW, originY + (y * scale));
      ctx.stroke();
    }

    // Rule of thirds / 38% rule guidelines
    if (useRuleThirds) {
      ctx.strokeStyle = 'rgba(88, 166, 255, 0.2)';
      ctx.setLineDash([4, 4]);
      // 38% line from front wall
      let line38Y = originY + (roomPxL * 0.38);
      ctx.beginPath();
      ctx.moveTo(originX, line38Y);
      ctx.lineTo(originX + roomPxW, line38Y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Calculate speaker positions
    // Speakers positioned 20% in from side walls, and 25% in from front wall
    let speakerDistFromSide = roomW * 0.22;
    let speakerDistFromFront = roomL * 0.18;

    let leftSpeakerX = originX + (speakerDistFromSide * scale);
    let leftSpeakerY = originY + (speakerDistFromFront * scale);

    let rightSpeakerX = originX + roomPxW - (speakerDistFromSide * scale);
    let rightSpeakerY = originY + (speakerDistFromFront * scale);

    // Listener position based on distPct
    let listenerX = originX + (roomPxW / 2);
    let listenerY = originY + (roomPxL * (distPct / 100));

    // Draw Equilateral Triangle Sweet Spot
    ctx.fillStyle = 'rgba(63, 185, 80, 0.08)';
    ctx.strokeStyle = 'rgba(63, 185, 80, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(leftSpeakerX, leftSpeakerY);
    ctx.lineTo(rightSpeakerX, rightSpeakerY);
    ctx.lineTo(listenerX, listenerY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw SBIR boundary distance lines (front wall to speakers)
    ctx.strokeStyle = 'rgba(248, 81, 73, 0.3)';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(leftSpeakerX, originY);
    ctx.lineTo(leftSpeakerX, leftSpeakerY);
    ctx.moveTo(rightSpeakerX, originY);
    ctx.lineTo(rightSpeakerX, rightSpeakerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Left Speaker
    drawSpeaker(leftSpeakerX, leftSpeakerY, toeAngle, 'L');

    // Draw Right Speaker
    drawSpeaker(rightSpeakerX, rightSpeakerY, -toeAngle, 'R');

    // Draw Listener Head
    ctx.fillStyle = '#3fb950';
    ctx.beginPath();
    ctx.arc(listenerX, listenerY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Listener nose direction (facing front wall)
    ctx.strokeStyle = '#3fb950';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(listenerX, listenerY - 9);
    ctx.lineTo(listenerX, listenerY - 18);
    ctx.stroke();

    // Dimensions text overlays
    ctx.fillStyle = '#8b949e';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Width: ${roomW} ${unit}`, originX + (roomPxW / 2), originY - 15);
    ctx.textAlign = 'right';
    ctx.fillText(`Length: ${roomL} ${unit}`, originX - 15, originY + (roomPxL / 2));
  }

  function drawSpeaker(x, y, angleDeg, label)
  {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((angleDeg * Math.PI) / 180);

    // Speaker Cabinet Box
    ctx.fillStyle = '#21262d';
    ctx.strokeStyle = '#58a6ff';
    ctx.lineWidth = 2;
    ctx.fillRect(-12, -10, 24, 20);
    ctx.strokeRect(-12, -10, 24, 20);

    // Woofer / Tweeter dots
    ctx.fillStyle = '#58a6ff';
    ctx.beginPath();
    ctx.arc(0, -3, 4, 0, Math.PI * 2);
    ctx.arc(0, 4, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - 16);
  }

  // Initial render on load
  renderPresets();
  updateAcousticsLab();
});
