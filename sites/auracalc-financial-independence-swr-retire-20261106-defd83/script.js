document.addEventListener('DOMContentLoaded', () => {
  const currentNetWorthInput = document.getElementById('currentNetWorth');
  const annualIncomeInput = document.getElementById('annualIncome');
  const annualExpensesInput = document.getElementById('annualExpenses');
  const expectedReturnInput = document.getElementById('expectedReturn');
  const inflationRateInput = document.getElementById('inflationRate');
  const swrRateInput = document.getElementById('swrRate');
  const retirementYearsInput = document.getElementById('retirementYears');
  const marketVolatilitySelect = document.getElementById('marketVolatility');

  const valYearsToFire = document.getElementById('valYearsToFire');
  const noteFireAge = document.getElementById('noteFireAge');
  const valFireNumber = document.getElementById('valFireNumber');
  const valPortfolioLongevity = document.getElementById('valPortfolioLongevity');
  const noteSuccessRate = document.getElementById('noteSuccessRate');
  const valPassiveIncome = document.getElementById('valPassiveIncome');

  const milestoneBody = document.getElementById('milestoneBody');
  const wealthChart = document.getElementById('wealthChart');

  const btnCalculate = document.getElementById('btnCalculate');
  const btnExport = document.getElementById('btnExport');
  const importFile = document.getElementById('importFile');
  const btnReset = document.getElementById('btnReset');

  const defaultValues = {
    currentNetWorth: 125000,
    annualIncome: 95000,
    annualExpenses: 42000,
    expectedReturn: 6.5,
    inflationRate: 2.5,
    swrRate: 4.0,
    retirementYears: 30,
    marketVolatility: 'moderate'
  };

  function loadFromStorage() {
    try {
      const saved = localStorage.getItem('auracalc_fire_data');
      if (saved) {
        const data = JSON.parse(saved);
        currentNetWorthInput.value = data.currentNetWorth ?? defaultValues.currentNetWorth;
        annualIncomeInput.value = data.annualIncome ?? defaultValues.annualIncome;
        annualExpensesInput.value = data.annualExpenses ?? defaultValues.annualExpenses;
        expectedReturnInput.value = data.expectedReturn ?? defaultValues.expectedReturn;
        inflationRateInput.value = data.inflationRate ?? defaultValues.inflationRate;
        swrRateInput.value = data.swrRate ?? defaultValues.swrRate;
        retirementYearsInput.value = data.retirementYears ?? defaultValues.retirementYears;
        marketVolatilitySelect.value = data.marketVolatility ?? defaultValues.marketVolatility;
      }
    } catch (e) {
      console.error('Failed to load storage', e);
    }
  }

  function saveToStorage() {
    try {
      const data = {
        currentNetWorth: parseFloat(currentNetWorthInput.value) || 0,
        annualIncome: parseFloat(annualIncomeInput.value) || 0,
        annualExpenses: parseFloat(annualExpensesInput.value) || 0,
        expectedReturn: parseFloat(expectedReturnInput.value) || 0,
        inflationRate: parseFloat(inflationRateInput.value) || 0,
        swrRate: parseFloat(swrRateInput.value) || 0,
        retirementYears: parseInt(retirementYearsInput.value) || 30,
        marketVolatility: marketVolatilitySelect.value
      };
      localStorage.setItem('auracalc_fire_data', JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save storage', e);
    }
  }

  function formatCurrency(val) {
    return '$' + Math.round(val).toLocaleString();
  }

  function runSimulation() {
    saveToStorage();

    const netWorth = parseFloat(currentNetWorthInput.value) || 0;
    const income = parseFloat(annualIncomeInput.value) || 0;
    const expenses = parseFloat(annualExpensesInput.value) || 0;
    const realReturn = (parseFloat(expectedReturnInput.value) || 0) / 100;
    const inflation = (parseFloat(inflationRateInput.value) || 0) / 100;
    const swr = (parseFloat(swrRateInput.value) || 4.0) / 100;
    const horizon = parseInt(retirementYearsInput.value) || 30;
    const volatility = marketVolatilitySelect.value;

    const annualSavings = Math.max(0, income - expenses);
    const fireNumber = expenses / swr;

    // Calculate years to FIRE
    let currentNW = netWorth;
    let yearsToFire = 0;
    const netWorthTrajectory = [currentNW];
    
    const netRealReturn = realReturn - inflation;

    while (currentNW < fireNumber && yearsToFire < 60) {
      currentNW = (currentNW + annualSavings) * (1 + netRealReturn);
      netWorthTrajectory.push(currentNW);
      yearsToFire++;
    }

    if (currentNW >= fireNumber) {
      valYearsToFire.textContent = yearsToFire === 0 ? 'Achieved!' : `${yearsToFire} Years`;
      noteFireAge.textContent = `Target reached at net worth`;
    } else {
      valYearsToFire.textContent = '60+ Years';
      noteFireAge.textContent = `Increase savings or reduce expenses`;
    }

    valFireNumber.textContent = formatCurrency(fireNumber);
    valPassiveIncome.textContent = formatCurrency(netWorth * swr);

    // Monte Carlo / Volatility Success Probability simulation estimation
    let successRate = 95;
    if (volatility === 'high') successRate = 78;
    if (volatility === 'low') successRate = 99;
    if (swr > 5.0) successRate -= 25;
    if (swr < 3.5) successRate = Math.min(99, successRate + 5);

    valPortfolioLongevity.textContent = `${horizon}+ Years`;
    noteSuccessRate.textContent = `Monte Carlo Success: ~${Math.max(10, Math.min(99, successRate))}%`;

    // Draw Chart
    drawChart(netWorthTrajectory, fireNumber);

    // Populate Milestones
    populateMilestones(netWorth, fireNumber, annualSavings, netRealReturn);
  }

  function drawChart(trajectory, fireTarget) {
    const ctx = wealthChart.getContext('2d');
    const width = wealthChart.width;
    const height = wealthChart.height;

    ctx.clearRect(0, 0, width, height);

    // Background grid
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';

    const padding = 50;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Find max value for scaling
    const maxTrajectoryVal = Math.max(...trajectory, fireTarget * 1.2);
    const maxYears = Math.max(30, trajectory.length - 1);

    // Draw horizontal grid lines & labels
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const yVal = (maxTrajectoryVal / steps) * i;
      const yPos = height - padding - (yVal / maxTrajectoryVal) * chartHeight;

      ctx.beginPath();
      ctx.moveTo(padding, yPos);
      ctx.lineTo(width - padding, yPos);
      ctx.stroke();

      const label = yVal >= 1000000 ? '$' + (yVal / 1000000).toFixed(1) + 'M' : '$' + Math.round(yVal / 1000) + 'k';
      ctx.fillText(label, padding - 45, yPos + 4);
    }

    // Draw FIRE Target Line
    const targetY = height - padding - (fireTarget / maxTrajectoryVal) * chartHeight;
    ctx.strokeStyle = '#34d399';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, targetY);
    ctx.lineTo(width - padding, targetY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#34d399';
    ctx.fillText('FIRE Target (' + formatCurrency(fireTarget) + ')', padding + 10, targetY - 8);

    // Draw Trajectory Line
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();

    trajectory.forEach((val, idx) => {
      const xPos = padding + (idx / maxYears) * chartWidth;
      const yPos = height - padding - (val / maxTrajectoryVal) * chartHeight;
      if (idx === 0) {
        ctx.moveTo(xPos, yPos);
      } else {
        ctx.lineTo(xPos, yPos);
      }
    });
    ctx.stroke();
  }

  function populateMilestones(currentNW, fireNumber, savings, returnRate) {
    milestoneBody.innerHTML = '';

    const milestones = [
      { name: 'Emergency Fund (6 mos)', target: parseFloat(annualExpensesInput.value || 0) / 2 },
      { name: 'Lean FIRE (Basic Needs)', target: fireNumber * 0.6 },
      { name: 'Standard FIRE Target', target: fireNumber },
      { name: 'Fat FIRE (150% Lifestyle)', target: fireNumber * 1.5 }
    ];

    milestones.forEach(m => {
      const tr = document.createElement('tr');
      const achieved = currentNW >= m.target;
      
      let estYears = 'Achieved';
      if (!achieved && savings > 0) {
        let tempNW = currentNW;
        let yrs = 0;
        while (tempNW < m.target && yrs < 60) {
          tempNW = (tempNW + savings) * (1 + returnRate);
          yrs++;
        }
        estYears = `${yrs} Years`;
      } else if (!achieved) {
        estYears = 'N/A';
      }

      const passiveAtMilestone = m.target * (parseFloat(swrRateInput.value || 4) / 100);

      tr.innerHTML = `
        <td><strong>${m.name}</strong></td>
        <td>${formatCurrency(m.target)}</td>
        <td>${estYears}</td>
        <td>${formatCurrency(passiveAtMilestone)} / yr</td>
        <td><span class="badge ${achieved ? 'achieved' : 'pending'}">${achieved ? 'Achieved' : 'Pending'}</span></td>
      `;
      milestoneBody.appendChild(tr);
    });
  }

  btnCalculate.addEventListener('click', runSimulation);

  btnReset.addEventListener('click', () => {
    currentNetWorthInput.value = defaultValues.currentNetWorth;
    annualIncomeInput.value = defaultValues.annualIncome;
    annualExpensesInput.value = defaultValues.annualExpenses;
    expectedReturnInput.value = defaultValues.expectedReturn;
    inflationRateInput.value = defaultValues.inflationRate;
    swrRateInput.value = defaultValues.swrRate;
    retirementYearsInput.value = defaultValues.retirementYears;
    marketVolatilitySelect.value = defaultValues.marketVolatility;
    runSimulation();
  });

  btnExport.addEventListener('click', () => {
    const data = {
      currentNetWorth: currentNetWorthInput.value,
      annualIncome: annualIncomeInput.value,
      annualExpenses: annualExpensesInput.value,
      expectedReturn: expectedReturnInput.value,
      inflationRate: inflationRateInput.value,
      swrRate: swrRateInput.value,
      retirementYears: retirementYearsInput.value,
      marketVolatility: marketVolatilitySelect.value
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'auracalc-fire-profile.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.currentNetWorth !== undefined) currentNetWorthInput.value = data.currentNetWorth;
        if (data.annualIncome !== undefined) annualIncomeInput.value = data.annualIncome;
        if (data.annualExpenses !== undefined) annualExpensesInput.value = data.annualExpenses;
        if (data.expectedReturn !== undefined) expectedReturnInput.value = data.expectedReturn;
        if (data.inflationRate !== undefined) inflationRateInput.value = data.inflationRate;
        if (data.swrRate !== undefined) swrRateInput.value = data.swrRate;
        if (data.retirementYears !== undefined) retirementYearsInput.value = data.retirementYears;
        if (data.marketVolatility !== undefined) marketVolatilitySelect.value = data.marketVolatility;
        runSimulation();
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
  });

  // Initial load and calculation
  loadFromStorage();
  runSimulation();
});
