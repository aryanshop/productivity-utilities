document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const bikeTypeSelect = document.getElementById('bike-type');
    const chainringsInput = document.getElementById('chainrings');
    const cassetteInput = document.getElementById('cassette');
    const wheelSizeSelect = document.getElementById('wheel-size');
    const wheelCircInput = document.getElementById('wheel-circ');
    const cadenceInput = document.getElementById('cadence');
    const speedUnitSelect = document.getElementById('speed-unit');
    
    const btnRecalculate = document.getElementById('btn-recalculate');
    const btnReset = document.getElementById('btn-reset');

    const statTotalCombos = document.getElementById('stat-total-combos');
    const statGearRange = document.getElementById('stat-gear-range');
    const statMinSpeed = document.getElementById('stat-min-speed');
    const statMaxSpeed = document.getElementById('stat-max-speed');
    
    const speedHeader = document.getElementById('speed-header');
    const gearTableBody = document.getElementById('gear-table-body');
    const canvas = document.getElementById('gearCanvas');
    const ctx = canvas.getContext('2d');

    // Presets
    const presets = {
        road: { chainrings: '50, 34', cassette: '11, 12, 13, 14, 15, 17, 19, 22, 25, 28, 32', circ: 2170 },
        gravel: { chainrings: '46, 30', cassette: '11, 13, 15, 17, 19, 22, 25, 28, 32, 36, 42', circ: 2224 },
        mtb: { chainrings: '32', cassette: '10, 12, 14, 16, 18, 21, 24, 28, 33, 39, 51', circ: 2288 },
        commuter: { chainrings: '44', cassette: '11, 13, 15, 18, 21, 24, 28, 32, 36', circ: 2170 }
    };

    // Handle bike type change
    bikeTypeSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (presets[val]) {
            chainringsInput.value = presets[val].chainrings;
            cassetteInput.value = presets[val].cassette;
            wheelCircInput.value = presets[val].circ;
            wheelSizeSelect.value = presets[val].circ;
            calculate();
        }
    });

    wheelSizeSelect.addEventListener('change', (e) => {
        wheelCircInput.value = e.target.value;
        calculate();
    });

    btnRecalculate.addEventListener('click', calculate);
    btnReset.addEventListener('click', () => {
        bikeTypeSelect.value = 'road';
        chainringsInput.value = presets.road.chainrings;
        cassetteInput.value = presets.road.cassette;
        wheelCircInput.value = presets.road.circ;
        wheelSizeSelect.value = presets.road.circ;
        cadenceInput.value = 90;
        speedUnitSelect.value = 'kmh';
        calculate();
    });

    // Helper to parse number arrays
    function parseList(str) {
        return str.split(',')
            .map(s => parseInt(s.trim(), 10))
            .filter(n => !isNaN(n) && n > 0)
            .sort((a, b) => a - b);
    }

    function calculate() {
        const chainrings = parseList(chainringsInput.value);
        const cassette = parseList(cassetteInput.value);
        const wheelCircMm = parseFloat(wheelCircInput.value) || 2100;
        const cadence = parseFloat(cadenceInput.value) || 90;
        const unit = speedUnitSelect.value;

        if (chainrings.length === 0 || cassette.length === 0) {
            alert('Please enter valid tooth numbers for chainrings and cassette.');
            return;
        }

        speedHeader.textContent = `Speed (${unit})`;

        // Wheel diameter in inches (Circumference in mm / pi / 25.4)
        const wheelDiameterInches = wheelCircMm / Math.PI / 25.4;

        let allCombinations = [];

        chainrings.forEach((ring, ringIdx) => {
            cassette.forEach(cog => {
                const ratio = ring / cog;
                const gearInches = ratio * wheelDiameterInches;
                // Development: meters per pedal revolution = (Circumference in mm * ratio) / 1000
                const developmentMeters = (wheelCircMm * ratio) / 1000;
                
                // Speed calculation
                // Development (m) * Cadence (rpm) * 60 min / 1000 = km/h
                let speed = (developmentMeters * cadence * 60) / 1000;
                if (unit === 'mph') {
                    speed = speed * 0.621371;
                }

                allCombinations.push({
                    ring,
                    ringIdx,
                    cog,
                    ratio,
                    gearInches,
                    developmentMeters,
                    speed
                });
            });
        });

        // Sort combinations by gear inches
        allCombinations.sort((a, b) => a.gearInches - b.gearInches);

        // Update stats
        const minGear = allCombinations[0].gearInches;
        const maxGear = allCombinations[allCombinations.length - 1].gearInches;
        const gearRangePct = ((maxGear / minGear) * 100).toFixed(0);
        
        statTotalCombos.textContent = allCombinations.length;
        statGearRange.textContent = `${gearRangePct}%`;
        
        const minSpeedVal = allCombinations[0].speed;
        const maxSpeedVal = allCombinations[allCombinations.length - 1].speed;
        statMinSpeed.textContent = `${minSpeedVal.toFixed(1)} ${unit}`;
        statMaxSpeed.textContent = `${maxSpeedVal.toFixed(1)} ${unit}`;

        // Populate Table
        gearTableBody.innerHTML = '';
        allCombinations.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${item.ring}T</strong></td>
                <td>${item.cog}T</td>
                <td>${item.ratio.toFixed(2)}</td>
                <td>${item.gearInches.toFixed(1)}&Prime;</td>
                <td>${item.developmentMeters.toFixed(2)} m</td>
                <td><strong>${item.speed.toFixed(1)}</strong></td>
            `;
            gearTableBody.appendChild(tr);
        });

        drawChart(allCombinations, chainrings);
    }

    function drawChart(data, chainrings) {
        // Resize canvas correctly for high DPI screens
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;

        ctx.clearRect(0, 0, width, height);

        if (data.length === 0) return;

        const padding = { top: 30, right: 30, bottom: 40, left: 50 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        const maxGear = Math.max(...data.map(d => d.gearInches)) * 1.05;

        // Draw axes
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;

        // Y Axis grid lines & labels
        const yTicks = 5;
        for (let i = 0; i <= yTicks; i++) {
            const val = (maxGear / yTicks) * i;
            const y = padding.top + chartHeight - (chartHeight / yTicks) * i;
            
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.strokeStyle = '#334155';
            ctx.stroke();

            ctx.fillStyle = '#94a3b8';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(val.toFixed(0) + '"', padding.left - 8, y + 4);
        }

        // Group data by chainring
        const ringColors = ['#38bdf8', '#f43f5e', '#10b981'];

        chainrings.forEach((ring, ringIdx) => {
            const ringData = data.filter(d => d.ring === ring);
            if (ringData.length === 0) return;

            ctx.strokeStyle = ringColors[ringIdx % ringColors.length];
            ctx.fillStyle = ringColors[ringIdx % ringColors.length];
            ctx.lineWidth = 2.5;

            ctx.beginPath();
            ringData.forEach((item, index) => {
                // X position based on global index or cog index
                const xRatio = index / (ringData.length > 1 ? ringData.length - 1 : 1);
                const x = padding.left + (chartWidth * 0.1) + (xRatio * (chartWidth * 0.8));
                const y = padding.top + chartHeight - (item.gearInches / maxGear) * chartHeight;

                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();

            // Draw points
            ringData.forEach((item, index) => {
                const xRatio = index / (ringData.length > 1 ? ringData.length - 1 : 1);
                const x = padding.left + (chartWidth * 0.1) + (xRatio * (chartWidth * 0.8));
                const y = padding.top + chartHeight - (item.gearInches / maxGear) * chartHeight;

                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#1e293b';
                ctx.fill();
                ctx.strokeStyle = ringColors[ringIdx % ringColors.length];
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        });

        // X axis title
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Cassette Cogs Progression (Smallest to Largest Cog)', padding.left + chartWidth / 2, height - 10);
    }

    // Initial calculation on load
    calculate();

    // Handle window resize for canvas
    window.addEventListener('resize', () => {
        calculate();
    });
});
