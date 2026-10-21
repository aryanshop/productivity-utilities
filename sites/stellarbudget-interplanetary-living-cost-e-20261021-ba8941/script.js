document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const destSelect = document.getElementById('destSelect');
    const incomeInput = document.getElementById('incomeInput');
    const housingExp = document.getElementById('housingExp');
    const utilityExp = document.getElementById('utilityExp');
    const foodExp = document.getElementById('foodExp');
    const transportExp = document.getElementById('transportExp');
    const taxExp = document.getElementById('taxExp');
    const miscExp = document.getElementById('miscExp');
    const savingsRate = document.getElementById('savingsRate');
    const savingsRateVal = document.getElementById('savingsRateVal');
    
    const totalExpVal = document.getElementById('totalExpVal');
    const netSavingsVal = document.getElementById('netSavingsVal');
    const gravMultVal = document.getElementById('gravMultVal');
    const horizonVal = document.getElementById('horizonVal');
    const breakdownBars = document.getElementById('breakdownBars');
    const advisorTip = document.getElementById('advisorTip');
    
    const yearsHorizon = document.getElementById('yearsHorizon');
    const yearsVal = document.getElementById('yearsVal');
    const projectionCanvas = document.getElementById('projectionCanvas');
    const stressBtn = document.getElementById('stressBtn');
    const stressResult = document.getElementById('stressResult');

    // Colony Profiles with multipliers and baseline traits
    const colonyProfiles = {
        earth: { name: 'Earth Standard', mult: 1.0, taxRate: 1.0, tip: 'Earth costs are stable, but taxation remains high due to legacy planetary bureaucracy.' },
        lunar: { name: 'Artemis Lunar Base', mult: 1.25, taxRate: 0.8, tip: 'Low gravity reduces transport wear, but high life support import tariffs elevate utility expenses.' },
        mars: { name: 'Olympus Mons Colony', mult: 0.9, taxRate: 0.7, tip: 'Balanced ecosystem. Affordable dome rent makes Mars an excellent sector for rapid capital accumulation.' },
        titan: { name: 'Titan Outpost', mult: 1.4, taxRate: 0.5, tip: 'Methane harvesting grants tax breaks, but heavy atmospheric shielding increases baseline housing costs.' },
        orbital: { name: 'Lagrange Habitat', mult: 1.6, taxRate: 0.9, tip: 'Zero-g living is luxurious yet expensive. Maintenance costs for rotation modules impact your monthly ledger.' }
    };

    let currentShockActive = false;

    function formatCredits(amount) {
        return '₢' + Math.round(amount).toLocaleString();
    }

    function calculateBudget() {
        const selectedColonyKey = destSelect.value;
        const profile = colonyProfiles[selectedColonyKey];

        const income = parseFloat(incomeInput.value) || 0;
        
        // Apply gravity multiplier to expenses
        const housing = (parseFloat(housingExp.value) || 0) * profile.mult;
        const utility = (parseFloat(utilityExp.value) || 0) * profile.mult;
        const food = (parseFloat(foodExp.value) || 0) * profile.mult;
        const transport = (parseFloat(transportExp.value) || 0) * profile.mult;
        const tax = (parseFloat(taxExp.value) || 0) * profile.taxRate;
        const misc = (parseFloat(miscExp.value) || 0);

        const shockPenalty = currentShockActive ? 2500 : 0;
        const totalExpenses = housing + utility + food + transport + tax + misc + shockPenalty;
        
        const savingsRatePercentage = parseInt(savingsRate.value) / 100;
        const targetSavings = income * savingsRatePercentage;
        
        const netRemaining = income - totalExpenses - targetSavings;

        // Update UI Metrics
        totalExpVal.textContent = formatCredits(totalExpenses);
        netSavingsVal.textContent = formatCredits(targetSavings);
        if (netRemaining < 0) {
            netSavingsVal.textContent = '-' + formatCredits(Math.abs(netRemaining)) + ' (Deficit)';
            netSavingsVal.className = 'metric-value highlight';
        } else {
            netSavingsVal.className = 'metric-value positive';
        }

        gravMultVal.textContent = profile.mult.toFixed(1) + 'x';

        // Retirement Horizon calculation (assuming 50,000 Credits baseline target)
        const annualSavings = targetSavings * 12;
        if (annualSavings > 0) {
            const yearsToIndependence = (500000 / annualSavings).toFixed(1);
            horizonVal.textContent = yearsToIndependence + ' Years';
        } else {
            horizonVal.textContent = 'Infinite';
        }

        savingsRateVal.textContent = savingsRate.value;

        // Render breakdown bars
        renderBreakdownBars({
            'Habitat Rent': housing,
            'Life Support': utility,
            'Ration Synthesizer': food,
            'Rover Transit': transport,
            'Colony Tax': tax,
            'Recreation': misc,
            ...(currentShockActive ? {'Solar Flare Shock': shockPenalty} : {})
        }, income);

        // Update Advisor tip
        updateAdvisorTip(profile, totalExpenses, income, netRemaining);

        // Draw Projections
        drawProjectionChart(annualSavings);
    }

    function renderBreakdownBars(expenses, totalIncome) {
        breakdownBars.innerHTML = '';
        const maxVal = Math.max(totalIncome, Object.values(expenses).reduce((a, b) => a + b, 1));

        const colors = {
            'Habitat Rent': '#38bdf8',
            'Life Support': '#22d3ee',
            'Ration Synthesizer': '#34d399',
            'Rover Transit': '#c084fc',
            'Colony Tax': '#fb923c',
            'Recreation': '#e879f9',
            'Solar Flare Shock': '#f87171'
        };

        for (const [category, amount] of Object.entries(expenses)) {
            const percentage = maxVal > 0 ? (amount / maxVal) * 100 : 0;
            const shareOfIncome = totalIncome > 0 ? ((amount / totalIncome) * 100).toFixed(1) : 0;

            const row = document.createElement('div');
            row.className = 'breakdown-row';

            row.innerHTML = `
                <div class="breakdown-info">
                    <span>${category}</span>
                    <span>${formatCredits(amount)} (${shareOfIncome}%)</span>
                </div>
                <div class="breakdown-bar-bg">
                    <div class="breakdown-bar-fill" style="width: ${Math.min(percentage, 100)}%; background-color: ${colors[category] || '#38bdf8'};"></div>
                </div>
            `;
            breakdownBars.appendChild(row);
        }
    }

    function updateAdvisorTip(profile, totalExpenses, income, netRemaining) {
        if (currentShockActive) {
            advisorTip.textContent = 'WARNING: Solar Flare emergency active! Your financial buffers are depleted. Reduce recreational spending immediately.';
            return;
        }
        if (netRemaining < 0) {
            advisorTip.textContent = `CRITICAL ALERT: Your expenses exceed income in the ${profile.name}. Lower your savings rate or decrease dome rent to avoid bankruptcy.`;
        } else if (totalExpenses > income * 0.7) {
            advisorTip.textContent = `${profile.tip} Your expense-to-income ratio is high. Consider trimming life support overhead or relocating.`;
        } else {
            advisorTip.textContent = `${profile.tip} Your fiscal trajectory is robust in this sector. You are well on your way to intergalactic financial independence.`;
        }
    }

    function drawProjectionChart(annualSavings) {
        yearsVal.textContent = yearsHorizon.value;
        const years = parseInt(yearsHorizon.value);
        
        const ctx = projectionCanvas.getContext('2d');
        const width = projectionCanvas.width;
        const height = projectionCanvas.height;

        ctx.clearRect(0, 0, width, height);

        // Draw grid lines
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
            let y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Calculate projection curve with 6% APR compound interest
        const pointsSavings = [];
        const pointsCompound = [];
        let currentPrincipal = 0;
        let currentCompound = 0;
        const apr = 0.06;

        const maxYears = Math.max(years, 1);
        for (let y = 0; y <= maxYears; y++) {
            pointsSavings.push(currentPrincipal);
            pointsCompound.push(currentCompound);

            currentPrincipal += annualSavings;
            currentCompound = (currentCompound + annualSavings) * (1 + apr);
        }

        const maxVal = Math.max(...pointsCompound, 10000);

        function getCoordinates(val, index) {
            const x = (index / maxYears) * (width - 20) + 10;
            const y = height - 10 - (val / maxVal) * (height - 20);
            return { x, y };
        }

        // Draw standard savings line
        ctx.strokeStyle = '#22d3ee';
        ctx.lineWidth = 2;
        ctx.beginPath();
        pointsSavings.forEach((val, i) => {
            const { x, y } = getCoordinates(val, i);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Draw compound interest line
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        pointsCompound.forEach((val, i) => {
            const { x, y } = getCoordinates(val, i);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
    }

    // Event Listeners
    const interactiveInputs = [
        destSelect, incomeInput, housingExp, utilityExp, 
        foodExp, transportExp, taxExp, miscExp, savingsRate, yearsHorizon
    ];

    interactiveInputs.forEach(input => {
        input.addEventListener('input', () => {
            calculateBudget();
        });
    });

    stressBtn.addEventListener('click', () => {
        currentShockActive = !currentShockActive;
        if (currentShockActive) {
            stressBtn.textContent = 'Resolve Solar Flare Emergency';
            stressBtn.style.background = 'rgba(52, 211, 153, 0.2)';
            stressBtn.style.color = '#34d399';
            stressResult.textContent = 'Emergency Alert: Solar Flare storm impacted sector! -₢2,500 emergency repair fee applied to ledger.';
            stressResult.classList.remove('hidden');
        } else {
            stressBtn.textContent = 'Trigger Solar Flare Shock (-₢2,500)';
            stressBtn.style.background = '';
            stressBtn.style.color = '';
            stressResult.classList.add('hidden');
        }
        calculateBudget();
    });

    // Initial calculation
    calculateBudget();
});
