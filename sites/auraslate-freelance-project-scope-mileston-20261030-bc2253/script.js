document.addEventListener('DOMContentLoaded', () => {
  // Default project state
  let projectState = {
    name: "E-Commerce Platform Redesign",
    pricingModel: "value",
    baseRate: 85,
    complexity: 1.0,
    contingency: 15,
    clientBudget: 12000,
    phases: [
      { id: 1, name: "Discovery & Architecture", hours: 25, team: "Lead Architect" },
      { id: 2, name: "UI/UX Prototyping & Design", hours: 40, team: "Senior Designer" },
      { id: 3, name: "Frontend & Backend Development", hours: 90, team: "Full-Stack Engineer" },
      { id: 4, name: "QA Testing & Security Audit", hours: 20, team: "QA Specialist" },
      { id: 5, name: "Deployment & Handover", hours: 10, team: "DevOps Engineer" }
    ],
    milestones: [
      { id: 1, name: "Phase 1: Project Kickoff & Discovery", pct: 30 },
      { id: 2, name: "Phase 2: Design Approval & Prototype", pct: 40 },
      { id: 3, name: "Phase 3: Final Launch & Handover", pct: 30 }
    ]
  };

  // DOM Elements
  const projectNameInput = document.getElementById('project-name');
  const pricingModelSelect = document.getElementById('pricing-model');
  const baseRateInput = document.getElementById('base-rate');
  const rateGroup = document.getElementById('rate-group');
  const complexitySelect = document.getElementById('complexity');
  const contingencyInput = document.getElementById('contingency');
  const clientBudgetInput = document.getElementById('client-budget');
  
  const phasesContainer = document.getElementById('phases-container');
  const milestonesContainer = document.getElementById('milestones-container');
  const btnAddPhase = document.getElementById('btn-add-phase');
  const btnAddMilestone = document.getElementById('btn-add-milestone');
  const btnGenerateMilestones = document.getElementById('btn-generate-milestones');
  
  const resTotalCost = document.getElementById('res-total-cost');
  const resEffectiveRate = document.getElementById('res-effective-rate');
  const resTotalHours = document.getElementById('res-total-hours');
  const resDuration = document.getElementById('res-duration');
  const resBufferCost = document.getElementById('res-buffer-cost');
  const resBufferPct = document.getElementById('res-buffer-pct');
  
  const proposalTextarea = document.getElementById('proposal-statement');
  const btnCopyProposal = document.getElementById('btn-copy-proposal');
  const copyFeedback = document.getElementById('copy-feedback');
  
  const btnReset = document.getElementById('btn-reset');
  const btnExport = document.getElementById('btn-export');
  const importFileInput = document.getElementById('import-file');
  
  const canvas = document.getElementById('chart-canvas');
  const ctx = canvas.getContext('2d');

  // Initialize UI from state
  function initUI() {
    if (projectNameInput) projectNameInput.value = projectState.name;
    if (pricingModelSelect) pricingModelSelect.value = projectState.pricingModel;
    if (baseRateInput) baseRateInput.value = projectState.baseRate;
    if (complexitySelect) complexitySelect.value = projectState.complexity;
    if (contingencyInput) contingencyInput.value = projectState.contingency;
    if (clientBudgetInput) clientBudgetInput.value = projectState.clientBudget;
    
    updatePricingModelVisibility();
    renderPhases();
    renderMilestones();
    calculateAndRender();
  }

  function updatePricingModelVisibility() {
    if (!rateGroup) return;
    if (projectState.pricingModel === 'value') {
      rateGroup.style.opacity = '0.6';
    } else {
      rateGroup.style.opacity = '1';
    }
  }

  // Render Phases
  function renderPhases() {
    if (!phasesContainer) return;
    phasesContainer.innerHTML = '';
    
    projectState.phases.forEach((phase, index) => {
      const row = document.createElement('div');
      row.className = 'phase-item';
      row.innerHTML = `
        <input type="text" value="${escapeHTML(phase.name)}" data-id="${phase.id}" data-field="name" placeholder="Phase name">
        <input type="number" value="${phase.hours}" min="0" max="1000" data-id="${phase.id}" data-field="hours" placeholder="Hours">
        <input type="text" value="${escapeHTML(phase.team)}" data-id="${phase.id}" data-field="team" placeholder="Role">
        <button class="btn-icon-danger" data-id="${phase.id}" title="Delete phase">×</button>
      `;
      phasesContainer.appendChild(row);
    });
  }

  // Render Milestones
  function renderMilestones() {
    if (!milestonesContainer) return;
    milestonesContainer.innerHTML = '';
    
    projectState.milestones.forEach((m) => {
      const row = document.createElement('div');
      row.className = 'milestone-item';
      row.innerHTML = `
        <input type="text" value="${escapeHTML(m.name)}" data-id="${m.id}" data-field="name" placeholder="Milestone title">
        <input type="number" value="${m.pct}" min="1" max="100" data-id="${m.id}" data-field="pct" placeholder="%">
        <input type="text" readonly value="$0" class="milestone-calc-val" data-id="${m.id}">
        <button class="btn-icon-danger milestone-del" data-id="${m.id}" title="Delete milestone">×</button>
      `;
      milestonesContainer.appendChild(row);
    });
  }

  // Calculations & Rendering
  function calculateAndRender() {
    const totalHours = projectState.phases.reduce((acc, p) => acc + (parseFloat(p.hours) || 0), 0);
    const baseRate = parseFloat(projectState.baseRate) || 0;
    const complexity = parseFloat(projectState.complexity) || 1.0;
    const contingencyPct = parseFloat(projectState.contingency) || 0;
    
    let rawSubtotal = totalHours * baseRate;
    let adjustedSubtotal = rawSubtotal * complexity;
    
    // If value pricing is selected and client budget is present, let's factor in benchmark or use adjusted subtotal
    let finalCost = adjustedSubtotal;
    if (projectState.pricingModel === 'value' && projectState.clientBudget > 0) {
      // Blend or use calculated value with complexity
      finalCost = Math.max(adjustedSubtotal, parseFloat(projectState.clientBudget) * 0.8);
    }
    
    const bufferCost = finalCost * (contingencyPct / 100);
    const totalCostWithBuffer = finalCost + bufferCost;
    
    const effectiveRate = totalHours > 0 ? Math.round(totalCostWithBuffer / totalHours) : 0;
    const estWeeks = (totalHours / 35).toFixed(1); // assuming 35 hrs/wk

    // Update DOM Metrics
    if (resTotalCost) resTotalCost.textContent = formatCurrency(totalCostWithBuffer);
    if (resEffectiveRate) resEffectiveRate.textContent = `Effective rate: $${effectiveRate}/hr`;
    if (resTotalHours) resTotalHours.textContent = `${totalHours} hrs`;
    if (resDuration) resDuration.textContent = `Est. Duration: ${estWeeks} wks`;
    if (resBufferCost) resBufferCost.textContent = formatCurrency(bufferCost);
    if (resBufferPct) resBufferPct.textContent = `${contingencyPct}% safety margin`;

    // Update Milestone Calculated Dollar Amounts
    let totalMilestonePct = 0;
    projectState.milestones.forEach(m => {
      totalMilestonePct += parseFloat(m.pct) || 0;
      const amount = totalCostWithBuffer * ((parseFloat(m.pct) || 0) / 100);
      const calcInput = milestonesContainer.querySelector(`input.milestone-calc-val[data-id="${m.id}"]`);
      if (calcInput) calcInput.value = formatCurrency(amount);
    });

    // Generate Proposal Statement text
    generateProposalText(totalCostWithBuffer, totalHours, estWeeks);

    // Draw Chart
    drawChart(projectState.phases, totalHours);
  }

  function generateProposalText(totalCost, totalHours, estWeeks) {
    if (!proposalTextarea) return;
    const phaseBreakdownStr = projectState.phases.map(p => ` - ${p.name}: ${p.hours} hrs (${p.team})`).join('\n');
    const milestoneStr = projectState.milestones.map(m => ` - ${m.name}: ${m.pct}% (${formatCurrency(totalCost * (m.pct / 100))})`).join('\n');
    
    const text = `PROJECT PROPOSAL: ${projectState.name}
=========================================
Estimated Duration: ${estWeeks} weeks (${totalHours} total working hours)
Total Investment: ${formatCurrency(totalCost)} (Includes ${projectState.contingency}% contingency buffer)

SCOPE OF WORK & PHASES:
${phaseBreakdownStr}

PAYMENT MILESTONES:
${milestoneStr}

TERMS:
This estimate is valid for 30 days. Work commences upon receipt of Milestone 1 deposit.`;
    
    proposalTextarea.value = text;
  }

  // Canvas Chart Rendering
  function drawChart(phases, totalHours) {
    if (!canvas || !ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    if (phases.length === 0 || totalHours === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('No phase hours recorded', width / 2, height / 2);
      return;
    }

    const colors = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#34d399', '#fbbf24'];
    
    let startX = 40;
    let startY = 80;
    let barHeight = 36;
    let maxBarWidth = width - 80;

    // Background grid lines
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1.0].forEach(ratio => {
      let x = startX + maxBarWidth * ratio;
      ctx.beginPath();
      ctx.moveTo(x, 40);
      ctx.lineTo(x, height - 20);
      ctx.stroke();
      
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(totalHours * ratio)}h`, x, 35);
    });

    // Draw phase distribution bars
    phases.forEach((p, idx) => {
      let hours = parseFloat(p.hours) || 0;
      let pct = totalHours > 0 ? hours / totalHours : 0;
      let barW = Math.max(4, maxBarWidth * pct);
      
      let y = startY + (idx * 28);
      
      // Bar fill
      ctx.fillStyle = colors[idx % colors.length];
      ctx.beginPath();
      ctx.roundRect(startX, y, barW, 20, 4);
      ctx.fill();
      
      // Phase label
      ctx.fillStyle = '#f8fafc';
      ctx.font = '11px system-ui';
      ctx.textAlign = 'left';
      let labelText = `${p.name} (${hours}h - ${Math.round(pct * 100)}%)`;
      // truncate if too long
      if (labelText.length > 35) labelText = labelText.substring(0, 33) + '...';
      ctx.fillText(labelText, startX, y - 4);
    });
  }

  // Event Listeners for inputs
  if (projectNameInput) {
    projectNameInput.addEventListener('input', (e) => {
      projectState.name = e.target.value;
      calculateAndRender();
    });
  }

  if (pricingModelSelect) {
    pricingModelSelect.addEventListener('change', (e) => {
      projectState.pricingModel = e.target.value;
      updatePricingModelVisibility();
      calculateAndRender();
    });
  }

  if (baseRateInput) {
    baseRateInput.addEventListener('input', (e) => {
      projectState.baseRate = parseFloat(e.target.value) || 0;
      calculateAndRender();
    });
  }

  if (complexitySelect) {
    complexitySelect.addEventListener('change', (e) => {
      projectState.complexity = parseFloat(e.target.value) || 1.0;
      calculateAndRender();
    });
  }

  if (contingencyInput) {
    contingencyInput.addEventListener('input', (e) => {
      projectState.contingency = parseFloat(e.target.value) || 0;
      calculateAndRender();
    });
  }

  if (clientBudgetInput) {
    clientBudgetInput.addEventListener('input', (e) => {
      projectState.clientBudget = parseFloat(e.target.value) || 0;
      calculateAndRender();
    });
  }

  // Phase inputs delegation
  if (phasesContainer) {
    phasesContainer.addEventListener('input', (e) => {
      const id = parseInt(e.target.getAttribute('data-id'));
      const field = e.target.getAttribute('data-field');
      if (!id || !field) return;
      
      const phase = projectState.phases.find(p => p.id === id);
      if (phase) {
        phase[field] = field === 'hours' ? parseFloat(e.target.value) || 0 : e.target.value;
        calculateAndRender();
      }
    });

    phasesContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('btn-icon-danger')) {
        const id = parseInt(e.target.getAttribute('data-id'));
        projectState.phases = projectState.phases.filter(p => p.id !== id);
        renderPhases();
        calculateAndRender();
      }
    });
  }

  // Add phase button
  if (btnAddPhase) {
    btnAddPhase.addEventListener('click', () => {
      const newId = projectState.phases.length > 0 ? Math.max(...projectState.phases.map(p => p.id)) + 1 : 1;
      projectState.phases.push({ id: newId, name: "New Phase", hours: 15, team: "Consultant" });
      renderPhases();
      calculateAndRender();
    });
  }

  // Milestones inputs delegation
  if (milestonesContainer) {
    milestonesContainer.addEventListener('input', (e) => {
      const id = parseInt(e.target.getAttribute('data-id'));
      const field = e.target.getAttribute('data-field');
      if (!id || !field) return;
      
      const m = projectState.milestones.find(item => item.id === id);
      if (m) {
        m[field] = field === 'pct' ? parseFloat(e.target.value) || 0 : e.target.value;
        calculateAndRender();
      }
    });

    milestonesContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('milestone-del')) {
        const id = parseInt(e.target.getAttribute('data-id'));
        projectState.milestones = projectState.milestones.filter(m => m.id !== id);
        renderMilestones();
        calculateAndRender();
      }
    });
  }

  // Add Milestone button
  if (btnAddMilestone) {
    btnAddMilestone.addEventListener('click', () => {
      const newId = projectState.milestones.length > 0 ? Math.max(...projectState.milestones.map(m => m.id)) + 1 : 1;
      projectState.milestones.push({ id: newId, name: "Additional Milestone", pct: 10 });
      renderMilestones();
      calculateAndRender();
    });
  }

  // Auto split milestones (Standard 40/40/20 or equal split)
  if (btnGenerateMilestones) {
    btnGenerateMilestones.addEventListener('click', () => {
      const count = projectState.milestones.length;
      if (count === 0) return;
      const equalPct = Math.floor(100 / count);
      const remainder = 100 - (equalPct * count);
      
      projectState.milestones.forEach((m, idx) => {
        m.pct = equalPct + (idx === 0 ? remainder : 0);
      });
      renderMilestones();
      calculateAndRender();
    });
  }

  // Copy proposal button
  if (btnCopyProposal && proposalTextarea) {
    btnCopyProposal.addEventListener('click', () => {
      proposalTextarea.select();
      navigator.clipboard.writeText(proposalTextarea.value).then(() => {
        if (copyFeedback) {
          copyFeedback.classList.add('visible');
          setTimeout(() => copyFeedback.classList.remove('visible'), 2000);
        }
      }).catch(err => {
        // Fallback for older browsers
        document.execCommand('copy');
        if (copyFeedback) {
          copyFeedback.classList.add('visible');
          setTimeout(() => copyFeedback.classList.remove('visible'), 2000);
        }
      });
    });
  }

  // Reset Button
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('Reset project to default values?')) {
        projectState = {
          name: "E-Commerce Platform Redesign",
          pricingModel: "value",
          baseRate: 85,
          complexity: 1.0,
          contingency: 15,
          clientBudget: 12000,
          phases: [
            { id: 1, name: "Discovery & Architecture", hours: 25, team: "Lead Architect" },
            { id: 2, name: "UI/UX Prototyping & Design", hours: 40, team: "Senior Designer" },
            { id: 3, name: "Frontend & Backend Development", hours: 90, team: "Full-Stack Engineer" },
            { id: 4, name: "QA Testing & Security Audit", hours: 20, team: "QA Specialist" },
            { id: 5, name: "Deployment & Handover", hours: 10, team: "DevOps Engineer" }
          ],
          milestones: [
            { id: 1, name: "Phase 1: Project Kickoff & Discovery", pct: 30 },
            { id: 2, name: "Phase 2: Design Approval & Prototype", pct: 40 },
            { id: 3, name: "Phase 3: Final Launch & Handover", pct: 30 }
          ]
        };
        initUI();
      }
    });
  }

  // Export JSON
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectState, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${projectState.name.toLowerCase().replace(/\s+/g, '-')}-scope.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    });
  }

  // Import JSON
  if (importFileInput) {
    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          const imported = JSON.parse(evt.target.result);
          if (imported && imported.name && Array.isArray(imported.phases)) {
            projectState = imported;
            initUI();
            alert('Project template successfully imported!');
          } else {
            alert('Invalid project JSON structure.');
          }
        } catch(err) {
          alert('Error parsing JSON file.');
        }
      };
      reader.readAsText(file);
    });
  }

  // Helper formatting
  function formatCurrency(val) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  }

  function escapeHTML(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Initial boot
  initUI();
});
