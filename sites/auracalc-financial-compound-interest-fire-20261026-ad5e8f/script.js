document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const currentAgeInput = document.getElementById('currentAge');
  const retireAgeInput = document.getElementById('retireAge');
  const currentNetWorthInput = document.getElementById('currentNetWorth');
  const annualSalaryInput = document.getElementById('annualSalary');
  const savingsRateInput = document.getElementById('savingsRate');
  const savingsRateSlider = document.getElementById('savingsRateSlider');
  const annualReturnInput = document.getElementById('annualReturn');
  const annualReturnSlider = document.getElementById('annualReturnSlider');
  const inflationRateInput = document.getElementById('inflationRate');
  const inflationRateSlider = document.getElementById('inflationRateSlider');
  const annualSpendInput = document.getElementById('annualSpend');
  
  const resetBtn = document.getElementById('resetBtn');
  const exportBtn = document.getElementById('exportBtn');
  
  // Metric elements
  const fireTargetEl = document.getElementById('fireTarget');
  const fireRuleSubEl = document.getElementById('fireRuleSub');
  const projectedAgeEl = document.getElementById('projectedAge');
  const yearsToFireSubEl = document.getElementById('yearsToFireSub');
  const finalPortfolioEl = document.getElementById('finalPortfolio');
  const inflationAdjustedSubEl = document.getElementById('inflationAdjustedSub');
  const totalContributionsEl = document.getElementById('totalContributions');
  const interestEarnedSubEl = document.getElementById('interestEarnedSub');
  
  const tableBody = document.getElementById('tableBody');
  const canvas = document.getElementById('growthCanvas');
  const ctx = canvas.getContext('2d');

  // Default values
  const defaults = {
    currentAge: 30,
    retireAge: 55,
    currentNetWorth: 50000,
    annualSalary: 85000,
    savingsRate: 40,
    annualReturn: 7.0,
    inflationRate: 2.5,
    annualSpend: 40000
  };

  // Sync Range and Number inputs
  function bindSync(numInput, sliderInput, isFloat = false) {
    if (!numInput || !sliderInput) return;
    numInput.addEventListener('input', () => {
      sliderInput.value = numInput.value;
      calculateAndRender();
    });
    sliderInput.addEventListener('input', () => {
      numInput.value = sliderInput.value;
      calculateAndRender();
    });
  }

  bindSync(savingsRateInput, savingsRateSlider);
  bindSync(annualReturnInput, annualReturnSlider, true);
  bindSync(inflationRateInput, inflationRateSlider, true);

  // Direct input listeners
  [currentAgeInput, retireAgeInput, currentNetWorthInput, annualSalaryInput, annualSpendInput].forEach(el => {
    if (el) el.addEventListener('input', calculateAndRender);
  });

  resetBtn.addEventListener('click', () => {
    currentAgeInput.value = defaults.currentAge;
    retireAgeInput.value = defaults.retireAge;
    currentNetWorthInput.value = defaults.currentNetWorth;
    annualSalaryInput.value = defaults.annualSalary;
    savingsRateInput.value = defaults.savingsRate;
    savingsRateSlider.value = defaults.savingsRate;
    annualReturnInput.value = defaults.annualReturn;
    annualReturnSlider.value = defaults.annualReturn;
    inflationRateInput.value = defaults.inflationRate;
    inflationRateSlider.value = defaults.inflationRate;
    annualSpendInput.value = defaults.annualSpend;
    calculateAndRender();
  });

  function formatCurrency(amount) {
    return '$' + Math.round(amount).toLocaleString();
  }

  let lastSimulationData = [];

  function calculateAndRender() {
    // Parse inputs safely
    const currentAge = parseInt(currentAgeInput.value) || 30;
    const retireAge = Math.max(currentAge + 1, parseInt(retireAgeInput.value) || 55);
    let currentNW = parseFloat(currentNetWorthInput.value) || 0;
    const salary = parseFloat(annualSalaryInput.value) || 0;
    const savingsRate = (parseFloat(savingsRateInput.value) || 0) / 100;
    const annualReturn = (parseFloat(annualReturnInput.value) || 0) / 100;
    const inflationRate = (parseFloat(inflationRateInput.value) || 0) / 100;
    const annualSpend = parseFloat(annualSpendInput.value) || 0;

    // 4% Safe Withdrawal Rule Corpus Target based on desired annual spend
    const fireCorpusTarget = annualSpend > 0 ? annualSpend * 25 : 1000000;
    fireTargetEl.textContent = formatCurrency(fireCorpusTarget);
    fireRuleSubEl.textContent = `Based on 4% SWR (${formatCurrency(annualSpend)}/yr spend)`;

    // Run Year-by-Year Simulation up to max(retireAge + 10, currentAge + 40)
    const maxYears = Math.max(40, retireAge - currentAge + 15);
    const simulationData = [];
    
    let portfolio = currentNW;
    let totalContributed = currentNW;
    let fireAgeFound = null;
    let portfolioAtRetireAge = 0;

    for (let i = 0; i <= maxYears; i++) {
      const age = currentAge + i;
      const annualContribution = salary * savingsRate;

      if (i > 0) {
        // Apply investment growth on beginning balance + contributions
        portfolio = (portfolio + annualContribution) * (1 + annualReturn);
        totalContributed += annualContribution;
      }

      if (age === retireAge) {
        portfolioAtRetireAge = portfolio;
      }

      if (portfolio >= fireCorpusTarget && fireAgeFound === null) {
        fireAgeFound = age;
      }

      simulationData.push({
        yearIndex: i,
        age,
        startBalance: i === 0 ? currentNW : simulationData[i-1].endBalance,
        contributions: i === 0 ? 0 : annualContribution,
        returnAmount: i === 0 ? 0 : (portfolio - (simulationData[i-1].endBalance + annualContribution)),
        endBalance: portfolio,
        totalContributed,
        isFire: portfolio >= fireCorpusTarget
      });

      // Stop simulation if age reaches 100
      if (age >= 100) break;
    }

    lastSimulationData = simulationData;

    // Update Projected FIRE Age Metric
    if (fireAgeFound !== null) {
      projectedAgeEl.textContent = `Age ${fireAgeFound}`;
      const yearsDiff = fireAgeFound - currentAge;
      yearsToFireSubEl.textContent = yearsDiff <= 0 ? `Already achieved!` : `${yearsDiff} years from now`;
      projectedAgeEl.style.color = 'var(--accent-green)';
    } else {
      projectedAgeEl.textContent = `100+ yrs`;
      yearsToFireSubEl.textContent = `Increase savings rate`;
      projectedAgeEl.style.color = 'var(--danger)';
    }

    // Update Final Portfolio at Target Age
    const targetAgeData = simulationData.find(d => d.age === retireAge);
    const finalVal = targetAgeData ? targetAgeData.endBalance : portfolio;
    finalPortfolioEl.textContent = formatCurrency(finalVal);
    
    // Inflation adjusted value
    const yearsToTarget = retireAge - currentAge;
    const realVal = finalVal / Math.pow(1 + inflationRate, Math.max(0, yearsToTarget));
    inflationAdjustedSubEl.textContent = `~${formatCurrency(realVal)} in today's dollars`;

    // Total Contributions & Interest
    const finalContributed = targetAgeData ? targetAgeData.totalContributed : totalContributed;
    totalContributionsEl.textContent = formatCurrency(finalContributed);
    const interestEarned = Math.max(0, finalVal - finalContributed);
    interestEarnedSubEl.textContent = `+ ${formatCurrency(interestEarned)} compound interest`;

    // Render Table
    renderTable(simulationData, retireAge);

    // Render Canvas Chart
    renderChart(simulationData, fireCorpusTarget);
  }

  function renderTable(data, targetRetireAge) {
    tableBody.innerHTML = '';
    data.forEach(row => {
      const tr = document.createElement('tr');
      if (row.age === targetRetireAge) {
        tr.style.backgroundColor = 'rgba(88, 166, 255, 0.08)';
      }
      
      const statusBadge = row.isFire 
        ? '<span class="badge fire">FIRE Goal Met</span>' 
        : '<span class="badge accumulate">Accumulating</span>';

      tr.innerHTML = `
        <td>Yr ${row.yearIndex}</td>
        <td><strong>Age ${row.age}</strong> ${row.age === targetRetireAge ? '(Target)' : ''}</td>
        <td>${formatCurrency(row.startBalance)}</td>
        <td>+${formatCurrency(row.contributions)}</td>
        <td>+${formatCurrency(row.returnAmount)}</td>
        <td><strong>${formatCurrency(row.endBalance)}</strong></td>
        <td>${statusBadge}</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  function renderChart(data, targetLine) {
    // Resize canvas correctly for high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    if (data.length === 0) return;

    const padding = { top: 20, right: 20, bottom: 35, left: 65 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Find max value for Y axis scaling
    const maxBalance = Math.max(...data.map(d => d.endBalance), targetLine * 1.1);
    const minBalance = 0;

    function getX(index) {
      return padding.left + (index / (data.length - 1)) * chartWidth;
    }

    function getY(value) {
      return height - padding.bottom - ((value - minBalance) / (maxBalance - minBalance)) * chartHeight;
    }

    // Draw Grid Lines & Y Axis Labels
    ctx.strokeStyle = '#30363d';
    ctx.fillStyle = '#8b949e';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.lineWidth = 1;

    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
      const val = minBalance + (maxBalance - minBalance) * (i / yTicks);
      const y = getY(val);
      
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      const label = val >= 1000000 ? '$' + (val / 1000000).toFixed(1) + 'M' : '$' + Math.round(val / 1000) + 'k';
      ctx.fillText(label, padding.left - 55, y + 4);
    }

    // Draw FIRE Target Horizontal Line
    const targetY = getY(targetLine);
    if (targetY >= padding.top && targetY <= height - padding.bottom) {
      ctx.strokeStyle = '#d29922';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, targetY);
      ctx.lineTo(width - padding.right, targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#d29922';
      ctx.fillText('FIRE Target', width - padding.right - 70, targetY - 6);
    }

    // Draw Contributions Area/Line
    ctx.beginPath();
    ctx.strokeStyle = '#bc8cff';
    ctx.lineWidth = 2;
    data.forEach((d, i) => {
      const x = getX(i);
      const y = getY(d.totalContributed);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Net Worth Gradient Fill & Line
    ctx.beginPath();
    data.forEach((d, i) => {
      const x = getX(i);
      const y = getY(d.endBalance);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#58a6ff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Fill area under Net Worth curve
    ctx.lineTo(getX(data.length - 1), height - padding.bottom);
    ctx.lineTo(getX(0), height - padding.bottom);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, 'rgba(88, 166, 255, 0.25)');
    gradient.addColorStop(1, 'rgba(88, 166, 255, 0.0)');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw X Axis Age Labels
    ctx.fillStyle = '#8b949e';
    const xLabelStep = Math.max(1, Math.floor(data.length / 6));
    data.forEach((d, i) => {
      if (i % xLabelStep === 0 || i === data.length - 1) {
        const x = getX(i);
        ctx.fillText(`Age ${d.age}`, x - 14, height - 12);
      }
    });
  }

  // CSV Export utility
  exportBtn.addEventListener('click', () => {
    if (!lastSimulationData || lastSimulationData.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'YearIndex,Age,StartBalance,Contributions,InvestmentReturn,EndBalance,TotalContributed,FIRE_Achieved\r\n';

    lastSimulationData.forEach(row => {
      csvContent += `${row.yearIndex},${row.age},${row.startBalance.toFixed(2)},${row.contributions.toFixed(2)},${row.returnAmount.toFixed(2)},${row.endBalance.toFixed(2)},${row.totalContributed.toFixed(2)},${row.isFire}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'auracalc_fire_projection.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  // Initial calculation on load
  calculateAndRender();

  // Responsive canvas redraw on window resize
  window.addEventListener('resize', () => {
    calculateAndRender();
  });
});
