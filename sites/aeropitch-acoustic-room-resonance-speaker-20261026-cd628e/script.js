document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const roomLengthInput = document.getElementById('roomLength');
    const roomWidthInput = document.getElementById('roomWidth');
    const roomHeightInput = document.getElementById('roomHeight');
    const listenerXInput = document.getElementById('listenerX');
    const listenerYInput = document.getElementById('listenerY');
    const tempCInput = document.getElementById('tempC');

    const btnCalculate = document.getElementById('btnCalculate');
    const btnPresetStudio = document.getElementById('btnPresetStudio');
    const btnPrintReport = document.getElementById('btnPrintReport');

    const schroederVal = document.getElementById('schroederVal');
    const volumeVal = document.getElementById('volumeVal');

    const modeCanvas = document.getElementById('modeCanvas');
    const roomMapCanvas = document.getElementById('roomMapCanvas');
    const modeTableBody = document.querySelector('#modeTable tbody');

    const sbirFrontVal = document.getElementById('sbirFrontVal');
    const sbirSideVal = document.getElementById('sbirSideVal');
    const sbirFloorVal = document.getElementById('sbirFloorVal');
    const reportContent = document.getElementById('reportContent');

    // Tabs logic
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active');

            // Redraw canvases when switching tabs
            if (targetId === 'tab-modes') drawModesCanvas();
            if (targetId === 'tab-map') drawRoomMap();
        });
    });

    // Preset studio button
    btnPresetStudio.addEventListener('click', () => {
        roomLengthInput.value = '5.8';
        roomWidthInput.value = '4.2';
        roomHeightInput.value = '2.7';
        listenerXInput.value = '50';
        listenerYInput.value = '62';
        tempCInput.value = '21';
        runCalculations();
    });

    btnCalculate.addEventListener('click', runCalculations);
    [roomLengthInput, roomWidthInput, roomHeightInput, listenerXInput, listenerYInput, tempCInput].forEach(inp => {
        inp.addEventListener('input', runCalculations);
    });

    let currentModes = [];
    let currentSchroeder = 0;

    function runCalculations() {
        const L = parseFloat(roomLengthInput.value) || 5.0;
        const W = parseFloat(roomWidthInput.value) || 4.0;
        const H = parseFloat(roomHeightInput.value) || 2.5;
        const temp = parseFloat(tempCInput.value) || 20;

        // Sound speed calculation based on temperature: c = 331.3 * sqrt(1 + T / 273.15)
        const c = 331.3 * Math.sqrt(1 + temp / 273.15);

        // Room Volume
        const volume = L * W * H;
        volumeVal.textContent = volume.toFixed(1) + ' m³';

        // Schroeder Frequency: F_s = 2000 * sqrt(RT60 / V)
        // Assuming standard untreated room RT60 approx 0.5s for estimation
        const rt60 = 0.5;
        const fS = 2000 * Math.sqrt(rt60 / volume);
        currentSchroeder = fS;
        schroederVal.textContent = fS.toFixed(1) + ' Hz';

        // Compute Axial Modes up to 300Hz
        currentModes = [];
        const maxFreq = 300;

        for (let n = 1; n <= 10; n++) {
            const fL = (n * c) / (2 * L);
            if (fL <= maxFreq) currentModes.push({ freq: fL, type: 'Length', order: n, axis: 'L' });

            const fW = (n * c) / (2 * W);
            if (fW <= maxFreq) currentModes.push({ freq: fW, type: 'Width', order: n, axis: 'W' });

            const fH = (n * c) / (2 * H);
            if (fH <= maxFreq) currentModes.push({ freq: fH, type: 'Height', order: n, axis: 'H' });
        }

        currentModes.sort((a, b) => a.freq - b.freq);

        populateModeTable();
        drawModesCanvas();
        drawRoomMap();
        calculateSBIR(c, L, W);
        generateReport(L, W, H, fS, volume);
    }

    function populateModeTable() {
        modeTableBody.innerHTML = '';
        // Group by harmonic order n=1..4
        for (let n = 1; n <= 4; n++) {
            const lFreq = currentModes.find(m => m.axis === 'L' && m.order === n)?.freq.toFixed(1) || '-';
            const wFreq = currentModes.find(m => m.axis === 'W' && m.order === n)?.freq.toFixed(1) || '-';
            const hFreq = currentModes.find(m => m.axis === 'H' && m.order === n)?.freq.toFixed(1) || '-';
            
            let category = 'Axial Fundamental';
            if (n === 2) category = '2nd Harmonic';
            if (n === 3) category = '3rd Harmonic';
            if (n === 4) category = '4th Harmonic';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>n = ${n}</td>
                <td>${lFreq} Hz</td>
                <td>${wFreq} Hz</td>
                <td>${hFreq} Hz</td>
                <td>${category}</td>
            `;
            modeTableBody.appendChild(tr);
        }
    }

    function drawModesCanvas() {
        if (!modeCanvas.getContext) return;
        const ctx = modeCanvas.getContext('2d');
        const width = modeCanvas.width;
        const height = modeCanvas.height;

        ctx.clearRect(0, 0, width, height);

        // Background grid
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x < width; x += 50) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let y = 0; y < height; y += 40) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();

        // Draw Schroeder Frequency Line
        const maxFreqDisplay = 300;
        const schroederX = (currentSchroeder / maxFreqDisplay) * width;
        if (schroederX <= width) {
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(schroederX, 0);
            ctx.lineTo(schroederX, height);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#fbbf24';
            ctx.font = '11px sans-serif';
            ctx.fillText(`Schroeder (${currentSchroeder.toFixed(0)} Hz)`, schroederX + 6, 20);
        }

        // Draw Mode Spikes
        currentModes.forEach(m => {
            const x = (m.freq / maxFreqDisplay) * width;
            if (x <= width) {
                let color = '#38bdf8';
                if (m.axis === 'W') color = '#34d399';
                if (m.axis === 'H') color = '#f87171';

                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x, height - 20);
                ctx.lineTo(x, height - 70);
                ctx.stroke();

                // Dot
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(x, height - 70, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Axis labels
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px sans-serif';
        ctx.fillText('0 Hz', 10, height - 5);
        ctx.fillText('150 Hz', width / 2 - 15, height - 5);
        ctx.fillText('300 Hz', width - 45, height - 5);
    }

    function drawRoomMap() {
        if (!roomMapCanvas.getContext) return;
        const ctx = roomMapCanvas.getContext('2d');
        const canvasW = roomMapCanvas.width;
        const canvasH = roomMapCanvas.height;

        ctx.clearRect(0, 0, canvasW, canvasH);

        const L = parseFloat(roomLengthInput.value) || 5.0;
        const W = parseFloat(roomWidthInput.value) || 4.0;
        const lX = parseFloat(listenerXInput.value) / 100;
        const lY = parseFloat(listenerYInput.value) / 100;

        // Scale room to fit canvas with margin
        const margin = 40;
        const drawW = canvasW - margin * 2;
        const drawH = canvasH - margin * 2;

        const roomAspectRatio = W / L; // Width / Length
        let boxW = drawW;
        let boxH = drawW * roomAspectRatio;

        if (boxH > drawH) {
            boxH = drawH;
            boxW = drawH / roomAspectRatio;
        }

        const originX = (canvasW - boxW) / 2;
        const originY = (canvasH - boxH) / 2;

        // Draw Room Boundary
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(originX, originY, boxW, boxH);
        ctx.strokeRect(originX, originY, boxW, boxH);

        // Draw Grid Lines in Room
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(originX + boxW / 2, originY);
        ctx.lineTo(originX + boxW / 2, originY + boxH);
        ctx.moveTo(originX, originY + boxH * 0.38); // 38% rule line
        ctx.lineTo(originX + boxW, originY + boxH * 0.38);
        ctx.stroke();

        // Listener Position (Sweet spot)
        const listenerPxX = originX + boxW * lX;
        const listenerPxY = originY + boxH * lY;

        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.arc(listenerPxX, listenerPxY, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = '11px sans-serif';
        ctx.fillText('Listener (Ear)', listenerPxX + 12, listenerPxY + 4);

        // Speakers Position (Equilateral Triangle pointing to listener)
        // Standard setup: speakers at 30 deg toe-in
        const speakerDist = boxW * 0.35;
        const speakerY = originY + boxH * 0.25;

        const leftSpeakerX = originX + boxW / 2 - speakerDist / 2;
        const rightSpeakerX = originX + boxW / 2 + speakerDist / 2;

        // Draw Speakers
        [leftSpeakerX, rightSpeakerX].forEach(sX => {
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(sX - 10, speakerY - 10, 20, 20);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(sX - 10, speakerY - 10, 20, 20);
        });

        // Draw Triangle Lines to Listener
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(leftSpeakerX, speakerY);
        ctx.lineTo(listenerPxX, listenerPxY);
        ctx.lineTo(rightSpeakerX, speakerY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#fbbf24';
        ctx.fillText('Left Monitor', leftSpeakerX - 45, speakerY - 15);
        ctx.fillText('Right Monitor', rightSpeakerX + 15, speakerY - 15);
    }

    function calculateSBIR(c, L, W) {
        // Assumed distances
        const dFront = 0.8; // meters from front wall
        const dSide = 1.0;  // meters from side wall
        const dFloor = 1.2; // tweeter height

        // SBIR cancellation frequency formula: f = c / (4 * distance)
        const fFront = c / (4 * dFront);
        const fSide = c / (4 * dSide);
        const fFloor = c / (4 * dFloor);

        sbirFrontVal.textContent = fFront.toFixed(1) + ' Hz';
        sbirSideVal.textContent = fSide.toFixed(1) + ' Hz';
        sbirFloorVal.textContent = fFloor.toFixed(1) + ' Hz';
    }

    function generateReport(L, W, H, fS, volume) {
        let ratioMsg = '';
        const ratioLW = L / W;
        const ratioHW = H / W;

        if (ratioLW > 1.2 && ratioLW < 1.6) {
            ratioMsg += ' [OPTIMAL] Length-to-Width ratio follows standard Bonello/Bolt good acoustic proportions.\n';
        } else {
            ratioMsg += ' [WARNING] Room dimensions approach square or integer multiples, which may cluster room modes.\n';
        }

        reportContent.textContent = `=========================================
 AEROPITCH ACOUSTIC ROOM ANALYSIS REPORT
=========================================

1. ROOM SPECIFICATIONS:
   - Dimensions: ${L}m (L) x ${W}m (W) x ${H}m (H)
   - Total Volume: ${volume.toFixed(2)} m³
   - Schroeder Frequency (Fs): ${fS.toFixed(1)} Hz
     (Frequencies below Fs require bass trapping & modal treatment).

2. PROPORTIONAL ASSESSMENT:
${ratioMsg}
3. TREATMENT RECOMMENDATIONS:
   - Bass Traps: Place thick porous absorbers (rockwool/fiberglass >= 15cm depth) in all vertical and horizontal corners to damp axial standing waves below ${fS.toFixed(0)} Hz.
   - First Reflection Points: Install 10cm absorption panels on left and right side walls at tweeter height aligned with the 30° speaker triangle.
   - Speaker Boundary Management: Keep front monitors at least 0.8m away from front walls to push SBIR notch frequencies safely below active crossover regions or into manageable sub bass territory.

=========================================`;
    }

    btnPrintReport.addEventListener('click', () => {
        window.print();
    });

    // Initial run
    runCalculations();
});
