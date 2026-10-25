document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('room-form');
    const lengthInput = document.getElementById('room-length');
    const widthInput = document.getElementById('room-width');
    const heightInput = document.getElementById('room-height');
    const wallTypeSelect = document.getElementById('wall-type');
    const speakerDistInput = document.getElementById('speaker-dist');
    const canvas = document.getElementById('room-canvas');
    const ctx = canvas.getContext('2d');

    const schroederVal = document.getElementById('schroeder-val');
    const schroederDesc = document.getElementById('schroeder-desc');
    const sweetspotVal = document.getElementById('sweetspot-val');
    const sbirVal = document.getElementById('sbir-val');
    const modesTbody = document.getElementById('modes-tbody');
    const presetBtns = document.querySelectorAll('.preset-btn');

    const SPEED_OF_SOUND = 343; // m/s at 20°C

    function calculateAcoustics() {
        const L = parseFloat(lengthInput.value) || 5;
        const W = parseFloat(widthInput.value) || 3;
        const H = parseFloat(heightInput.value) || 2.5;
        const alpha = parseFloat(wallTypeSelect.value) || 0.15;
        const speakerDistCm = parseFloat(speakerDistInput.value) || 80;
        const d_spk = speakerDistCm / 100;

        // Room Volume and Surface Area
        const V = L * W * H;
        const S = 2 * (L * W + L * H + W * H);

        // Sabine Reverberation Time approx (RT60 = 0.161 * V / (S * alpha))
        const rt60 = (0.161 * V) / Math.max(S * alpha, 1.0);

        // Schroeder Frequency: f_s = 2000 * sqrt(RT60 / V)
        const f_s = 2000 * Math.sqrt(rt60 / Math.max(V, 0.1));
        schroederVal.textContent = `${Math.round(f_s)} Hz`;
        schroederDesc.textContent = rt60 < 0.3 ? 'Slightly damped room (RT60: ' + rt60.toFixed(2) + 's)' : 'Live room acoustic (RT60: ' + rt60.toFixed(2) + 's)';

        // Optimal Sweet Spot (38% rule from front wall)
        const sweetSpotDist = L * 0.38;
        sweetspotVal.textContent = `${sweetSpotDist.toFixed(2)} m`;

        // SBIR Primary Null Frequency: f = c / (4 * d)
        const f_sbir = SPEED_OF_SOUND / (4 * Math.max(d_spk, 0.05));
        sbirVal.textContent = `${Math.round(f_sbir)} Hz`;

        // Calculate Axial Room Modes up to ~300Hz
        const modes = [];
        const maxFreq = 300;

        // Length modes
        for (let n = 1; (n * SPEED_OF_SOUND / (2 * L)) <= maxFreq; n++) {
            const f = (n * SPEED_OF_SOUND) / (2 * L);
            modes.push({ freq: f, axis: 'Length (L)', harmonic: `${n},0,0`, impact: n <= 2 ? 'Severe boom / Null risk' : 'Moderate modal density' });
        }

        // Width modes
        for (let n = 1; (n * SPEED_OF_SOUND / (2 * W)) <= maxFreq; n++) {
            const f = (n * SPEED_OF_SOUND) / (2 * W);
            modes.push({ freq: f, axis: 'Width (W)', harmonic: `0,${n},0`, impact: n <= 2 ? 'Lateral asymmetry risk' : 'Moderate modal density' });
        }

        // Height modes
        for (let n = 1; (n * SPEED_OF_SOUND / (2 * H)) <= maxFreq; n++) {
            const f = (n * SPEED_OF_SOUND) / (2 * H);
            modes.push({ freq: f, axis: 'Height (H)', harmonic: `0,0,${n}`, impact: n <= 2 ? 'Floor-ceiling flutter echo' : 'Moderate modal density' });
        }

        // Sort modes by frequency
        modes.sort((a, b) => a.freq - b.freq);

        // Populate Table
        modesTbody.innerHTML = '';
        if (modes.length === 0) {
            modesTbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No modes calculated in range.</td></tr>';
        } else {
            modes.forEach(m => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${m.freq.toFixed(1)} Hz</strong></td>
                    <td>${m.axis}</td>
                    <td>${m.harmonic}</td>
                    <td>${m.impact}</td>
                `;
                modesTbody.appendChild(tr);
            });
        }

        // Render Canvas Visualization
        renderCanvas(L, W, d_spk, sweetSpotDist);
    }

    function renderCanvas(L, W, d_spk, sweetSpotDist) {
        const cw = canvas.width;
        const ch = canvas.height;

        ctx.clearRect(0, 0, cw, ch);

        // Padding for drawing room inside canvas
        const padding = 50;
        const drawWidth = cw - padding * 2;
        const drawHeight = ch - padding * 2;

        // Scale factor (meters to pixels)
        // Fit room maintaining aspect ratio
        const scaleX = drawWidth / W;
        const scaleY = drawHeight / L;
        const scale = Math.min(scaleX, scaleY);

        const roomPxW = W * scale;
        const roomPxL = L * scale;

        const originX = (cw - roomPxW) / 2;
        const originY = padding;

        // Draw Room Floor Grid / Background
        ctx.fillStyle = '#18202c';
        ctx.fillRect(originX, originY, roomPxW, roomPxL);

        // Draw Room Walls
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.strokeRect(originX, originY, roomPxW, roomPxL);

        // Draw 38% Axis Line
        const axisY = originY + (sweetSpotDist * scale);
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(originX, axisY);
        ctx.lineTo(originX + roomPxW, axisY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Speaker Placement
        // Speakers spaced symmetrically, e.g. 70% of room width apart
        const spkSpacing = W * 0.7;
        const leftSpkX = originX + ((W - spkSpacing) / 2) * scale;
        const rightSpkX = originX + (W - (W - spkSpacing) / 2) * scale;
        const spkY = originY + (d_spk * scale);

        // Speaker Boxes
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(leftSpkX - 10, spkY - 8, 20, 16);
        ctx.fillRect(rightSpkX - 10, spkY - 8, 20, 16);

        // Sweet Spot Position (Equilateral Triangle Vertex)
        // Triangle apex is at (W/2, sweetSpotDist + spkSpacing * sin(60°))
        const sweetX = originX + (W / 2) * scale;
        const sweetY = axisY;

        // Draw Equilateral Triangle Lines
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(leftSpkX, spkY);
        ctx.lineTo(sweetX, sweetY);
        ctx.lineTo(rightSpkX, spkY);
        ctx.closePath();
        ctx.stroke();

        // Sweet Spot Marker
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(sweetX, sweetY, 7, 0, Math.PI * 2);
        ctx.fill();

        // Dimensions labels
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(`Width: ${W}m`, originX + roomPxW / 2, originY - 10);
        ctx.textAlign = 'right';
        ctx.fillText(`Length: ${L}m`, originX - 10, originY + roomPxL / 2);
    }

    // Event Listeners
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calculateAcoustics();
    });

    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            lengthInput.value = btn.dataset.l;
            widthInput.value = btn.dataset.w;
            heightInput.value = btn.dataset.h;
            calculateAcoustics();
        });
    });

    // Initial calculation on load
    calculateAcoustics();
});
