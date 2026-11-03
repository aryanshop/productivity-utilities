document.addEventListener('DOMContentLoaded', () => {
    const surfaceTypeEl = document.getElementById('surfaceType');
    const areaWidthEl = document.getElementById('areaWidth');
    const areaHeightEl = document.getElementById('areaHeight');
    const coatingConditionEl = document.getElementById('coatingCondition');
    const mediaTypeEl = document.getElementById('mediaType');
    const nozzleSizeEl = document.getElementById('nozzleSize');
    const targetPsiEl = document.getElementById('targetPsi');

    const resAreaEl = document.getElementById('resArea');
    const resAbrasiveWeightEl = document.getElementById('resAbrasiveWeight');
    const resBlastTimeEl = document.getElementById('resBlastTime');
    const resCfmEl = document.getElementById('resCfm');

    const detailDensityEl = document.getElementById('detailDensity');
    const detailRecycleEl = document.getElementById('detailRecycle');
    const detailVelocityEl = document.getElementById('detailVelocity');
    const detailHoseEl = document.getElementById('detailHose');
    const detailTankEl = document.getElementById('detailTank');

    const btnCalculate = document.getElementById('btnCalculate');
    const btnReset = document.getElementById('btnReset');
    const btnPrint = document.getElementById('btnPrint');
    const canvas = document.getElementById('abrasiveChart');

    function calculateSpecs() {
        const width = parseFloat(areaWidthEl.value) || 0;
        const height = parseFloat(areaHeightEl.value) || 0;
        const area = width * height;

        const surfaceOption = surfaceTypeEl.options[surfaceTypeEl.selectedIndex];
        const surfaceHardness = parseFloat(surfaceOption.getAttribute('data-hardness')) || 5;

        const coatingFactor = parseFloat(coatingConditionEl.value) || 1.0;

        const mediaOption = mediaTypeEl.options[mediaTypeEl.selectedIndex];
        const mediaDensity = parseFloat(mediaOption.getAttribute('data-density')) || 100;
        const mediaRecycle = parseInt(mediaOption.getAttribute('data-recycle'), 10) || 3;
        const mediaAggression = parseFloat(mediaOption.getAttribute('data-aggression')) || 3;

        const nozzleOption = nozzleSizeEl.options[nozzleSizeEl.selectedIndex];
        const baseCfm = parseFloat(nozzleOption.getAttribute('data-cfm')) || 85;
        const psi = parseFloat(targetPsiEl.value) || 90;

        // Calculations
        // Base abrasive consumption per sq ft (lbs) varies by media density and surface factor
        // Reference baseline: ~3 lbs/sq ft for garnet on standard steel
        const baseConsumptionRate = (mediaDensity / 140) * 2.8;
        const totalAbrasiveLbs = Math.round(area * baseConsumptionRate * coatingFactor * (6 / mediaAggression));
        
        // Blast time estimate based on nozzle removal rate (sq ft per minute)
        const sqFtPerMin = (12 / (coatingFactor * surfaceHardness)) * (baseCfm / 85);
        const totalMinutes = Math.max(1, Math.round(area / sqFtPerMin));

        // CFM adjusted by working pressure ratio
        const adjustedCfm = Math.round(baseCfm * Math.sqrt(psi / 90));

        // Velocity estimate
        const velocity = Math.round(650 * Math.sqrt(psi / 90));

        // Recommended hose and tank sizing
        const hoseSize = baseCfm > 150 ? '1 inch' : (baseCfm > 100 ? '7/8 inch' : '3/4 inch');
        const tankSize = baseCfm > 200 ? '240 Gallons' : (baseCfm > 100 ? '160 Gallons' : '120 Gallons');

        // Update UI Metrics
        resAreaEl.textContent = `${area.toFixed(1)} sq ft`;
        resAbrasiveWeightEl.textContent = `${totalAbrasiveLbs} lbs`;
        
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        resBlastTimeEl.textContent = hours > 0 ? `${hours}h ${mins}m` : `${mins} mins`;
        resCfmEl.textContent = `${adjustedCfm} CFM`;

        detailDensityEl.textContent = `${mediaDensity} lbs/cu ft`;
        detailRecycleEl.textContent = `Up to ${mediaRecycle} cycles`;
        detailVelocityEl.textContent = `~${velocity} ft/s`;
        detailHoseEl.textContent = hoseSize;
        detailTankEl.textContent = tankSize;

        drawChart(totalAbrasiveLbs, mediaRecycle, area);
    }

    function drawChart(abrasiveLbs, recycleCount, area) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        // Simple horizontal proportion bar chart
        const freshMedia = Math.round(abrasiveLbs / Math.max(1, recycleCount));
        const recycledMedia = abrasiveLbs - freshMedia;

        const maxVal = Math.max(abrasiveLbs, 10);
        const barHeight = 24;
        const yPos = 45;

        // Draw background track
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(20, yPos, width - 40, barHeight);

        // Draw fresh media segment
        const freshWidth = (freshMedia / maxVal) * (width - 40);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(20, yPos, freshWidth, barHeight);

        // Draw recycled media segment
        const recycledWidth = (recycledMedia / maxVal) * (width - 40);
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(20 + freshWidth, yPos, recycledWidth, barHeight);

        // Labels
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px system-ui';
        ctx.fillText(`Fresh Make-up: ${freshMedia} lbs`, 20, 25);
        ctx.fillText(`Recovered/Recycled: ${recycledMedia} lbs`, width - 180, 25);

        // Legend / summary subtext
        ctx.fillStyle = '#f8fafc';
        ctx.font = '12px system-ui';
        ctx.fillText(`Total Media Throughput: ${abrasiveLbs} lbs across ${area.toFixed(0)} sq ft surface area`, 20, height - 15);
    }

    function resetDefaults() {
        surfaceTypeEl.selectedIndex = 0;
        areaWidthEl.value = '10';
        areaHeightEl.value = '6';
        coatingConditionEl.selectedIndex = 0;
        mediaTypeEl.selectedIndex = 0;
        nozzleSizeEl.selectedIndex = 1;
        targetPsiEl.value = '90';
        calculateSpecs();
    }

    btnCalculate.addEventListener('click', calculateSpecs);
    btnReset.addEventListener('click', resetDefaults);
    btnPrint.addEventListener('click', () => {
        window.print();
    });

    // Initial calculation on load
    calculateSpecs();
});
