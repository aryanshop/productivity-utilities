document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const wheelSizeSelect = document.getElementById('wheelSize');
    const chainringsInput = document.getElementById('chainrings');
    const cogsInput = document.getElementById('cogs');
    const cadenceSlider = document.getElementById('cadence');
    const cadenceVal = document.getElementById('cadenceVal');
    const unitBtns = document.querySelectorAll('.unit-btn');
    const resetBtn = document.getElementById('resetDefaults');
    const exportBtn = document.getElementById('exportData');
    
    const lowGearEl = document.getElementById('lowGear');
    const lowGearRatioEl = document.getElementById('lowGearRatio');
    const highGearEl = document.getElementById('highGear');
    const highGearRatioEl = document.getElementById('highGearRatio');
    const gearRangeEl = document.getElementById('gearRange');
    const targetSpeedAvgEl = document.getElementById('targetSpeedAvg');
    const speedUnitLabel = document.getElementById('speedUnitLabel');
    const activeCadenceBadge = document.getElementById('activeCadenceBadge');
    
    const gearTable = document.getElementById('gearTable');
    const speedChart = document.getElementById('speedChart');
    
    let currentUnit = 'kmh'; // 'kmh' or 'mph'

    // Parse input values safely into numeric arrays
    function parseToothInput(str) {
        return str
            .split(',')
            .map(s => parseInt(s.trim(), 10))
            .filter(n => !isNaN(n) && n > 0)
            .sort((a, b) => a - b);
    }

    function calculateData() {
        const wheelFactor = parseFloat(wheelSizeSelect.value) || 2.125;
        const chainrings = parseToothInput(chainringsInput.value);
        const cogs = parseToothInput(cogsInput.value);
        const cadence = parseInt(cadenceSlider.value, 10) || 90;

        if (chainrings.length === 0 || cogs.length === 0) {
            return null;
        }

        // Calculations
        // Gear Inches = (Chainring / Cog) * WheelDiameterInches
        // Wheel diameter in inchesapprox = wheelFactor (meters) * 39.3701 / pi ? Actually wheelFactor in select is approximate ISO circumference / 1000 or tire multiplier.
        // Let's standardize: wheelFactor value represents wheel circumference in meters (e.g. 2.136m for 700x28c).
        // Diameter in inches = Circumference (meters) * 39.3701 / Math.PI
        const wheelCircumferenceMeters = wheelFactor;
        const wheelDiameterInches = (wheelCircumferenceMeters * 39.3701) / Math.PI;

        let allCombinations = [];
        let minRatio = Infinity;
        let maxRatio = 0;
        let lowestGearObj = null;
        let highestGearObj = null;

        chainrings.forEach(ring => {
            cogs.forEach(cog => {
                const ratio = ring / cog;
                const gearInches = ratio * wheelDiameterInches;
                
                // Speed calculation
                // Speed (km/h) = (Cadence * Circumference * 60) / (Cog / Ring -> wait)
                // Distance per pedal revolution = (ring / cog) * circumference (meters)
                // Speed (m/min) = cadence * (ring / cog) * circumference
                // Speed (km/h) = (cadence * (ring / cog) * circumference * 60) / 1000
                const speedKmh = (cadence * ratio * wheelCircumferenceMeters * 60) / 1000;
                const speedMph = speedKmh * 0.621371;

                const combo = {
                    ring,
                    cog,
                    ratio,
                    gearInches,
                    speedKmh,
                    speedMph
                };

                allCombinations.push(combo);

                if (ratio < minRatio) {
                    minRatio = ratio;
                    lowestGearObj = combo;
                }
                if (ratio > maxRatio) {
                    maxRatio = ratio;
                    highestGearObj = combo;
                }
            });
        });

        const gearRange = ((maxRatio / minRatio) * 100).toFixed(1) + '%';
        
        // Average target speed across all combinations or specific ones
        const avgSpeedKmh = allCombinations.reduce((acc, curr) => acc + curr.speedKmh, 0) / allCombinations.length;
        const avgSpeedMph = avgSpeedKmh * 0.621371;

        return {
            chainrings,
            cogs,
            cadence,
            wheelDiameterInches,
            wheelCircumferenceMeters,
            allCombinations,
            lowestGearObj,
            highestGearObj,
            gearRange,
            avgSpeed: currentUnit === 'kmh' ? avgSpeedKmh : avgSpeedMph,
            minRatio,
            maxRatio
        };
    }

    function renderUI() {
        const data = calculateData();
        if (!data) return;

        cadenceVal.textContent = `${data.cadence} RPM`;
        activeCadenceBadge.textContent = `${data.cadence} RPM Reference`;
        speedUnitLabel.textContent = `${currentUnit.toUpperCase()} average`;

        // Render Summary Cards
        lowGearEl.textContent = `${data.lowestGearObj.ring}x${data.lowestGearObj.cog}`;
        lowGearRatioEl.textContent = `Gear Inches: ${data.lowestGearObj.gearInches.toFixed(1)}in`;

        highGearEl.textContent = `${data.highestGearObj.ring}x${data.highestGearObj.cog}`;
        highGearRatioEl.textContent = `Gear Inches: ${data.highestGearObj.gearInches.toFixed(1)}in`;

        gearRangeEl.textContent = data.gearRange;
        targetSpeedAvgEl.textContent = data.avgSpeed.toFixed(1);

        // Render Matrix Table
        renderTable(data);

        // Render Canvas Chart
        renderChart(data);
    }

    function renderTable(data) {
        const thead = gearTable.querySelector('thead tr');
        const tbody = gearTable.querySelector('tbody');

        // Build header (Cogs)
        let headerHtml = '<th>Chainring \\ Cog</th>';
        data.cogs.forEach(cog => {
            headerHtml += `<th>${cog}T</th>`;
        });
        thead.innerHTML = headerHtml;

        // Build body (Chainrings)
        let bodyHtml = '';
        data.chainrings.forEach(ring => {
            bodyHtml += `<tr><td>${ring}T</td>`;
            data.cogs.forEach(cog => {
                const combo = data.allCombinations.find(c => c.ring === ring && c.cog === cog);
                if (combo) {
                    const speedVal = currentUnit === 'kmh' ? combo.speedKmh.toFixed(1) : combo.speedMph.toFixed(1);
                    bodyHtml += `
                        <td>
                            <span class="gear-speed">${speedVal} ${currentUnit}</span>
                            <span class="gear-inches">${combo.gearInches.toFixed(0)} in</span>
                        </td>
                    `;
                } else {
                    bodyHtml += `<td>-</td>`;
                }
            });
            bodyHtml += `</tr>`;
        });
        tbody.innerHTML = bodyHtml;
    }

    function renderChart(data) {
        const canvas = speedChart;
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions for high DPI sharpness
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = 240 * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = 240;

        ctx.clearRect(0, 0, width, height);

        // Draw background grid
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px system-ui, sans-serif';

        // Speed vs Cadence curves for Highest and Lowest gears
        const cadences = [60, 70, 80, 90, 100, 110, 120];
        
        const getMaxSpeed = () => {
            let maxS = 0;
            data.allCombinations.forEach(c => {
                const s = currentUnit === 'kmh' ? (120 * c.ratio * data.wheelCircumferenceMeters * 60) / 1000 : ((120 * c.ratio * data.wheelCircumferenceMeters * 60) / 1000) * 0.621371;
                if (s > maxS) maxS = s;
            });
            return Math.ceil(maxS / 10) * 10;
        };

        const maxSpeedLimit = getMaxSpeed() || 60;
        const padding = 40;
        const graphWidth = width - padding * 2;
        const graphHeight = height - padding * 2;

        // Draw axes
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        ctx.lineTo(width - padding, height - padding);
        ctx.moveTo(padding, height - padding);
        ctx.lineTo(padding, padding);
        ctx.stroke();

        // Draw Y-Axis labels (Speed)
        for (let i = 0; i <= 4; i++) {
            const speedVal = (maxSpeedLimit / 4) * i;
            const y = (height - padding) - (graphHeight / 4) * i;
            ctx.fillText(`${speedVal.toFixed(0)}`, padding - 30, y + 4);
            
            ctx.beginPath();
            ctx.strokeStyle = '#1e293b';
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }

        // Draw X-Axis labels (Cadence)
        cadences.forEach((cad, idx) => {
            const x = padding + (graphWidth / (cadences.length - 1)) * idx;
            ctx.fillText(`${cad}`, x - 10, height - padding + 20);
        });

        // Plot Lowest and Highest gear lines
        const drawCurve = (combo, color, label) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;

            cadences.forEach((cad, idx) => {
                const speed = currentUnit === 'kmh' 
                    ? (cad * combo.ratio * data.wheelCircumferenceMeters * 60) / 1000
                    : ((cad * combo.ratio * data.wheelCircumferenceMeters * 60) / 1000) * 0.621371;
                
                const x = padding + (graphWidth / (cadences.length - 1)) * idx;
                const y = (height - padding) - (speed / maxSpeedLimit) * graphHeight;

                if (idx === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
        };

        if (data.lowestGearObj && data.highestGearObj) {
            drawCurve(data.lowestGearObj, '#34d399', 'Low Gear');
            drawCurve(data.highestGearObj, '#38bdf8', 'High Gear');
        }
    }

    // Event Listeners
    [wheelSizeSelect, chainringsInput, cogsInput, cadenceSlider].forEach(element => {
        element.addEventListener('input', renderUI);
    });

    unitBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            unitBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentUnit = btn.getAttribute('data-unit');
            renderUI();
        });
    });

    resetBtn.addEventListener('click', () => {
        wheelSizeSelect.value = '2.125';
        chainringsInput.value = '50, 34';
        cogsInput.value = '11, 12, 13, 15, 17, 19, 21, 24, 28, 32, 36';
        cadenceSlider.value = 90;
        currentUnit = 'kmh';
        unitBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-unit') === 'kmh'));
        renderUI();
    });

    exportBtn.addEventListener('click', () => {
        const data = calculateData();
        if (!data) return;

        let csv = 'Chainring,Cog,GearInches,Ratio,SpeedKmh,SpeedMph\n';
        data.allCombinations.forEach(c => {
            csv += `${c.ring},${c.cog},${c.gearInches.toFixed(2)},${c.ratio.toFixed(3)},${c.speedKmh.toFixed(2)},${c.speedMph.toFixed(2)}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'auravelo_drivetrain_export.csv';
        a.click();
        URL.revokeObjectURL(url);
    });

    // Initial render
    renderUI();
});
