document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const memberTypeSelect = document.getElementById('member-type');
  const rebarSizeSelect = document.getElementById('rebar-size');
  const concreteFcSelect = document.getElementById('concrete-fc');
  const exposureCondSelect = document.getElementById('exposure-cond');
  const barSpacingSelect = document.getElementById('bar-spacing');
  const barCountInput = document.getElementById('bar-count');
  const barLengthInput = document.getElementById('bar-length');
  const unitRadios = document.querySelectorAll('input[name="units"]');

  const resDevLength = document.getElementById('res-dev-length');
  const resDevLengthAlt = document.getElementById('res-dev-length-alt');
  const resSpliceLength = document.getElementById('res-splice-length');
  const resSpliceLengthAlt = document.getElementById('res-splice-length-alt');
  const resClearCover = document.getElementById('res-clear-cover');
  const resCoverNote = document.getElementById('res-cover-note');
  const resTotalWeight = document.getElementById('res-total-weight');
  const resWeightSub = document.getElementById('res-weight-sub');

  const canvas = document.getElementById('structure-canvas');
  const ctx = canvas.getContext('2d');
  const canvasStatusBadge = document.getElementById('canvas-status-badge');
  const cutListTbody = document.getElementById('cut-list-tbody');

  const btnSaveSession = document.getElementById('btn-save-session');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnReset = document.getElementById('btn-reset');

  // Rebar properties table (diameters in inches and mm, weights in lbs/ft and kg/m)
  const rebarData = {
    "3":  { name: "#3", diaIn: 0.375, diaMm: 9.5,   wtLbsFt: 0.376, wtKgM: 0.560 },
    "4":  { name: "#4", diaIn: 0.500, diaMm: 12.7,  wtLbsFt: 0.668, wtKgM: 0.994 },
    "5":  { name: "#5", diaIn: 0.625, diaMm: 15.9,  wtLbsFt: 1.043, wtKgM: 1.552 },
    "6":  { name: "#6", diaIn: 0.750, diaMm: 19.1,  wtLbsFt: 1.502, wtKgM: 2.235 },
    "7":  { name: "#7", diaIn: 0.875, diaMm: 22.2,  wtLbsFt: 2.044, wtKgM: 3.042 },
    "8":  { name: "#8", diaIn: 1.000, diaMm: 25.4,  wtLbsFt: 2.670, wtKgM: 3.973 },
    "9":  { name: "#9", diaIn: 1.128, diaMm: 28.7,  wtLbsFt: 3.400, wtKgM: 5.060 },
    "10": { name: "#10", diaIn: 1.270, diaMm: 32.3, wtLbsFt: 4.303, wtKgM: 6.404 },
    "11": { name: "#11", diaIn: 1.410, diaMm: 35.8, wtLbsFt: 5.313, wtKgM: 7.907 },
    "14": { name: "#14", diaIn: 1.693, diaMm: 43.0, wtLbsFt: 7.650, wtKgM: 11.38 },
    "18": { name: "#18", diaIn: 2.257, diaMm: 57.3, wtLbsFt: 13.60, wtKgM: 20.24 }
  };

  // Load saved session if exists
  function loadSession() {
    try {
      const saved = localStorage.getItem('auraspan_session');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.memberType) memberTypeSelect.value = data.memberType;
        if (data.rebarSize) rebarSizeSelect.value = data.rebarSize;
        if (data.concreteFc) concreteFcSelect.value = data.concreteFc;
        if (data.exposureCond) exposureCondSelect.value = data.exposureCond;
        if (data.barSpacing) barSpacingSelect.value = data.barSpacing;
        if (data.barCount) barCountInput.value = data.barCount;
        if (data.barLength) barLengthInput.value = data.barLength;
        if (data.units) {
          unitRadios.forEach(r => {
            r.checked = (r.value === data.units);
          });
        }
      }
    } catch (e) {
      console.error('Failed to load local session', e);
    }
  }

  // Save session
  btnSaveSession.addEventListener('click', () => {
    const units = document.querySelector('input[name="units"]:checked').value;
    const sessionData = {
      memberType: memberTypeSelect.value,
      rebarSize: rebarSizeSelect.value,
      concreteFc: concreteFcSelect.value,
      exposureCond: exposureCondSelect.value,
      barSpacing: barSpacingSelect.value,
      barCount: barCountInput.value,
      barLength: barLengthInput.value,
      units
    };
    localStorage.setItem('auraspan_session', JSON.stringify(sessionData));
    
    const originalText = btnSaveSession.textContent;
    btnSaveSession.textContent = '✅ Saved!';
    setTimeout(() => {
      btnSaveSession.textContent = originalText;
    }, 1500);
  });

  // Reset defaults
  btnReset.addEventListener('click', () => {
    memberTypeSelect.value = 'beam';
    rebarSizeSelect.value = '5';
    concreteFcSelect.value = '4000';
    exposureCondSelect.value = 'interior';
    barSpacingSelect.value = 'normal';
    barCountInput.value = '12';
    barLengthInput.value = '20';
    unitRadios[0].checked = true;
    localStorage.removeItem('auraspan_session');
    calculateAndRender();
  });

  // Export JSON
  btnExportJson.addEventListener('click', () => {
    const results = getCalculationResults();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(results, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `auraspan_rebar_report_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  // Core Calculation Function
  function getCalculationResults() {
    const member = memberTypeSelect.value;
    const rebarKey = rebarSizeSelect.value;
    const fc = parseFloat(concreteFcSelect.value);
    const exposure = exposureCondSelect.value;
    const spacing = barSpacingSelect.value;
    const count = parseInt(barCountInput.value) || 1;
    const stockLenFt = parseFloat(barLengthInput.value) || 20;
    const units = document.querySelector('input[name="units"]:checked').value;

    const bar = rebarData[rebarKey];

    // ACI 318 Minimum Clear Cover guidelines (in inches)
    let coverInches = 1.5; // default interior beam/column
    let coverNote = "ACI 318 Interior Member";

    if (member === 'footing' || exposure === 'earth') {
      coverInches = 3.0;
      coverNote = "Cast against / permanently in earth";
    } else if (exposure === 'corrosive' || exposure === 'weathered') {
      coverInches = (bar.diaIn >= 1.0) ? 2.0 : 1.5;
      if (exposure === 'corrosive') coverInches = 2.5;
      coverNote = exposure === 'corrosive' ? "Marine / Corrosive Exposure" : "Weather exposed (";
    } else if (member === 'slab') {
      coverInches = (bar.diaIn <= 0.5) ? 0.75 : 1.0;
      coverNote = "Slab / Wall unexposed";
    } else if (member === 'column') {
      coverInches = 1.5;
      coverNote = "Column tied reinforcement";
    }

    // Approximate Development Length (ld) formula simplified from ACI 318 expression
    // ld = ( (fy * psi_t * psi_e * psi_s) / (lambda * sqrt(fc)) ) * db
    // Assuming Grade 60 rebar (fy = 60,000 psi)
    const fy = 60000;
    const psi_t = 1.0; // top bar factor
    const psi_e = (exposure === 'corrosive') ? 1.2 : 1.0; // epoxy/coating factor
    const psi_s = (bar.diaIn <= 0.5) ? 0.8 : 1.0; // size factor
    const lambda = 1.0; // normal weight concrete

    // spacing factor modification
    let confinementFactor = (spacing === 'tight') ? 1.5 : 1.0;

    let ldInches = ((fy * psi_t * psi_e * psi_s) / (45 * Math.sqrt(fc))) * bar.diaIn * confinementFactor;
    if (ldInches < 12) ldInches = 12; // ACI minimum 12 inches

    // Class B Splice is typically 1.3 * ld
    let spliceInches = ldInches * 1.3;

    // Total weight computation
    const stockLenM = stockLenFt * 0.3048;
    const totalBarsNeeded = count;
    let totalWeightLbs = totalBarsNeeded * stockLenFt * bar.wtLbsFt;
    let totalWeightKg = totalBarsNeeded * stockLenM * bar.wtKgM;

    // Add 10% splice waste factor if bars exceed stock length
    if (stockLenFt < (ldInches / 12 * 2)) {
      totalWeightLbs *= 1.15;
      totalWeightKg *= 1.15;
    }

    return {
      member,
      rebar: bar,
      fc,
      exposure,
      spacing,
      count,
      stockLenFt,
      units,
      coverInches,
      coverNote,
      ldInches,
      spliceInches,
      totalWeightLbs,
      totalWeightKg
    };
  }

  function calculateAndRender() {
    const res = getCalculationResults();

    const units = res.units;

    if (units === 'imperial') {
      resDevLength.textContent = `${res.ldInches.toFixed(1)} in`;
      resDevLengthAlt.textContent = `= ${(res.ldInches / 12).toFixed(2)} feet (${(res.ldInches * 25.4).toFixed(0)} mm)`;

      resSpliceLength.textContent = `${res.spliceInches.toFixed(1)} in`;
      resSpliceLengthAlt.textContent = `= ${(res.spliceInches / 12).toFixed(2)} feet (${(res.spliceInches * 25.4).toFixed(0)} mm)`;

      resClearCover.textContent = `${res.coverInches.toFixed(2)} inches`;
      resCoverNote.textContent = res.coverNote;

      resTotalWeight.textContent = `${res.totalWeightLbs.toFixed(1)} lbs`;
      resWeightSub.textContent = `For ${res.count} bars @ ${res.stockLenFt} ft stock length`;
    } else {
      const ldMm = res.ldInches * 25.4;
      const spliceMm = res.spliceInches * 25.4;
      const coverMm = res.coverInches * 25.4;

      resDevLength.textContent = `${ldMm.toFixed(0)} mm`;
      resDevLengthAlt.textContent = `= ${(ldMm / 1000).toFixed(3)} meters`;

      resSpliceLength.textContent = `${spliceMm.toFixed(0)} mm`;
      resSpliceLengthAlt.textContent = `= ${(spliceMm / 1000).toFixed(3)} meters`;

      resClearCover.textContent = `${coverMm.toFixed(1)} mm`;
      resCoverNote.textContent = res.coverNote;

      resTotalWeight.textContent = `${res.totalWeightKg.toFixed(1)} kg`;
      resWeightSub.textContent = `For ${res.count} bars @ ${(res.stockLenFt * 0.3048).toFixed(1)} m stock length`;
    }

    // Render Cut List Table
    cutListTbody.innerHTML = '';
    for (let i = 1; i <= Math.min(res.count, 25); i++) {
      const tr = document.createElement('tr');
      const spliceAllowStr = units === 'imperial' ? `${(res.spliceInches / 12).toFixed(2)} ft` : `${(res.spliceInches * 25.4).toFixed(0)} mm`;
      const stockStr = units === 'imperial' ? `${res.stockLenFt} ft` : `${(res.stockLenFt * 0.3048).toFixed(1)} m`;
      const effSpanStr = units === 'imperial' ? `${(res.stockLenFt - res.spliceInches/12).toFixed(1)} ft` : `${((res.stockLenFt * 0.3048) - (res.spliceInches * 25.4 / 1000)).toFixed(2)} m`;

      tr.innerHTML = `
        <td>#MK-${i < 10 ? '0' + i : i}</td>
        <td>${res.rebar.name}</td>
        <td>${stockStr}</td>
        <td>${spliceAllowStr}</td>
        <td>${effSpanStr}</td>
        <td>1 pc</td>
      `;
      cutListTbody.appendChild(tr);
    }

    if (res.count > 25) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="6" style="text-align: center; color: var(--text-muted);">... and ${res.count - 25} more bars in schedule</td>`;
      cutListTbody.appendChild(tr);
    }

    drawCrossSection(res);
  }

  // Draw interactive structural cross section on canvas
  function drawCrossSection(res) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;

    // Concrete member boundary box
    const boxW = 420;
    const boxH = 200;
    const startX = (width - boxW) / 2;
    const startY = (height - boxH) / 2;

    // Draw concrete background texture / fill
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(startX, startY, boxW, boxH);

    // Concrete hatch border
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 4;
    ctx.strokeRect(startX, startY, boxW, boxH);

    // Draw stirrup / tie confinement boundary
    const coverScale = res.coverInches * 10; // visual scaling
    const tieX = startX + 15 + coverScale;
    const tieY = startY + 15 + coverScale;
    const tieW = boxW - 30 - (coverScale * 2);
    const tieH = boxH - 30 - (coverScale * 2);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(tieX, tieY, tieW, tieH);
    ctx.setLineDash([]);

    // Draw longitudinal rebar circles
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;

    const barRadius = Math.max(4, Math.min(12, res.rebar.diaIn * 6));
    const barsPerSide = Math.max(2, Math.ceil(res.count / 4));

    // Top and bottom row bars
    for (let i = 0; i < barsPerSide; i++) {
      const xPos = tieX + (tieW / (barsPerSide - 1 || 1)) * i;
      
      // Top bar
      ctx.beginPath();
      ctx.arc(xPos, tieY, barRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Bottom bar
      ctx.beginPath();
      ctx.arc(xPos, tieY + tieH, barRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Dimension lines & labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';

    // Cover dimension indicator
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(tieX, startY);
    ctx.stroke();

    ctx.fillText(`Cover: ${res.coverInches.toFixed(1)}"`, startX + (tieX - startX) / 2, startY - 8);

    // Canvas status badge update
    canvasStatusBadge.textContent = `${res.rebar.name} | $f'_c$ ${res.fc} psi`;
  }

  // Event Listeners for live recalculation
  [memberTypeSelect, rebarSizeSelect, concreteFcSelect, exposureCondSelect, barSpacingSelect, barCountInput, barLengthInput].forEach(elem => {
    elem.addEventListener('input', calculateAndRender);
    elem.addEventListener('change', calculateAndRender);
  });

  unitRadios.forEach(radio => {
    radio.addEventListener('change', calculateAndRender);
  });

  // Initial load
  loadSession();
  calculateAndRender();
});
